from datetime import date, datetime, timedelta
from io import BytesIO, StringIO
import json
from xml.sax.saxutils import escape
import zipfile

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone

from accounts.jwt_utils import generate_jwt_token
from accounts.models import (
    Department,
    Feedback,
    FormField,
    Holiday,
    ProcedureType,
    RejectionReason,
    Request,
    StudentRegistry,
    User,
)
from accounts.services import calculate_sla_deadline


def local_dt(year, month, day, hour=10, minute=0, second=0):
    return timezone.make_aware(datetime(year, month, day, hour, minute, second))


def build_xlsx_bytes(rows):
    """
    Tạo file .xlsx hợp lệ (OpenXML ZIP) từ list[list[str]] để test import Excel.
    """
    buf = BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(
            "[Content_Types].xml",
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '<Override PartName="/xl/workbook.xml" '
            'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            '<Override PartName="/xl/worksheets/sheet1.xml" '
            'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            "</Types>",
        )
        zf.writestr(
            "_rels/.rels",
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" '
            'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
            'Target="xl/workbook.xml"/>'
            "</Relationships>",
        )
        zf.writestr(
            "xl/workbook.xml",
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            '<sheets><sheet name="Students" sheetId="1" r:id="rId1"/></sheets>'
            "</workbook>",
        )
        zf.writestr(
            "xl/_rels/workbook.xml.rels",
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" '
            'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" '
            'Target="worksheets/sheet1.xml"/>'
            "</Relationships>",
        )

        row_xml_parts = []
        for r_idx, row in enumerate(rows, start=1):
            cell_parts = []
            for c_idx, val in enumerate(row):
                col_letter = chr(ord("A") + c_idx)
                ref = f"{col_letter}{r_idx}"
                escaped = escape(str(val if val is not None else ""))
                cell_parts.append(f'<c r="{ref}" t="inlineStr"><is><t>{escaped}</t></is></c>')
            row_xml_parts.append(f'<row r="{r_idx}">{"".join(cell_parts)}</row>')

        sheet_xml = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            f'<sheetData>{"".join(row_xml_parts)}</sheetData>'
            "</worksheet>"
        )
        zf.writestr("xl/worksheets/sheet1.xml", sheet_xml)

    return buf.getvalue()


@override_settings(DEBUG=True)
class Module7TestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_module1", allow_non_sqlite=True, stdout=StringIO())
        cls.admin = User.objects.get(email="admin@vju.ac.vn")
        cls.cv_pctsv = User.objects.get(email="hoangnam@vju.ac.vn")
        cls.sv_a = User.objects.get(email="minhanh@st.vju.ac.vn")
        cls.sv_b = User.objects.get(email="quocanh@st.vju.ac.vn")
        cls.dept_pctsv = Department.objects.get(code="PCTSV")
        cls.dept_pdt = Department.objects.get(code="PDT")

    def auth(self, user):
        token = generate_jwt_token({"user_id": user.user_id, "role": user.role})
        return {"HTTP_AUTHORIZATION": f"Bearer {token}"}

    # =========================================================================
    # API 7.1: CRUD /api/admin/procedures — Quản lý thủ tục
    # =========================================================================
    def test_7_1_1_create_procedure_and_7_1_2_soft_delete(self):
        payload = {
            "name": "Cấp bảng điểm",
            "description": "Cấp bảng điểm toàn khóa",
            "department_id": self.dept_pdt.dept_id,
            "sla_total_days": 3,
            "approval_levels": 1,
            "sub_sla_l1_days": 3,
            "result_type": "PDF",
            "template_file_path": "/templates/bang_diem.docx",
            "is_fee_required": False,
            "form_fields": [
                {
                    "field_name": "Ngôn ngữ",
                    "field_key": "language",
                    "data_type": "dropdown",
                    "is_required": True,
                    "dropdown_options": ["Tiếng Việt", "Tiếng Anh", "Cả hai"],
                    "display_order": 1,
                }
            ],
            "attachment_configs": [],
        }

        res = self.client.post(
            "/api/admin/procedures",
            data=json.dumps(payload),
            content_type="application/json",
            **self.auth(self.admin),
        )
        self.assertEqual(res.status_code, 201)
        body = res.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["message"], "Tạo thủ tục thành công.")

        new_type_id = body["data"]["type_id"]
        self.assertEqual(body["data"]["name"], "Cấp bảng điểm")
        self.assertTrue(body["data"]["is_active"])

        # Checklist 1 & 2: ProcedureType và FormField mới trong DB
        self.assertTrue(ProcedureType.objects.filter(type_id=new_type_id, name="Cấp bảng điểm").exists())
        self.assertTrue(
            FormField.objects.filter(procedure_type_id=new_type_id, field_key="language").exists()
        )

        # Checklist 3: Hiển thị trên Portal SV (GET /api/procedures)
        catalog_res = self.client.get("/api/procedures", **self.auth(self.sv_a))
        self.assertEqual(catalog_res.status_code, 200)
        catalog_ids = [
            p["type_id"]
            for dept_group in catalog_res.json()["data"]
            for p in dept_group.get("procedures", [dept_group])
        ]
        self.assertIn(new_type_id, catalog_ids)

        # Test 7.1.2 — Soft delete thủ tục (BR-18)
        del_res = self.client.delete(
            f"/api/admin/procedures/{new_type_id}",
            **self.auth(self.admin),
        )
        self.assertEqual(del_res.status_code, 200)
        proc = ProcedureType.objects.get(type_id=new_type_id)
        self.assertFalse(proc.is_active)

        # Không còn hiển thị trên Portal SV
        catalog_after = self.client.get("/api/procedures", **self.auth(self.sv_a))
        catalog_ids_after = [
            p["type_id"]
            for dept_group in catalog_after.json()["data"]
            for p in dept_group.get("procedures", [dept_group])
        ]
        self.assertNotIn(new_type_id, catalog_ids_after)

        # Admin vẫn thấy trong GET /api/admin/procedures
        admin_list_res = self.client.get("/api/admin/procedures", **self.auth(self.admin))
        self.assertEqual(admin_list_res.status_code, 200)
        admin_ids = [p["type_id"] for p in admin_list_res.json()["data"]]
        self.assertIn(new_type_id, admin_ids)

    def test_7_1_3_non_admin_forbidden(self):
        res = self.client.get("/api/admin/procedures", **self.auth(self.cv_pctsv))
        self.assertEqual(res.status_code, 403)
        body = res.json()
        self.assertFalse(body["success"])
        self.assertEqual(body["error"]["code"], "FORBIDDEN")
        self.assertEqual(body["error"]["message"], "Chỉ Admin mới có quyền truy cập.")

    def test_7_1_4_update_and_get_procedure_detail(self):
        res = self.client.put(
            "/api/admin/procedures/1",
            data=json.dumps({"sla_total_days": 2, "description": "Mô tả cập nhật"}),
            content_type="application/json",
            **self.auth(self.admin),
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(ProcedureType.objects.get(type_id=1).sla_total_days, 2)

        detail_res = self.client.get("/api/admin/procedures/1", **self.auth(self.admin))
        self.assertEqual(detail_res.status_code, 200)
        self.assertEqual(detail_res.json()["data"]["description"], "Mô tả cập nhật")

    # =========================================================================
    # API 7.2: POST /api/admin/users/import-students — Import SV từ Excel
    # =========================================================================
    def test_7_2_1_import_students_from_excel(self):
        # Đảm bảo nguyenvana@st.vju.ac.vn đã tồn tại trong StudentRegistry để test dòng trùng 35
        StudentRegistry.objects.get_or_create(
            email="nguyenvana@st.vju.ac.vn",
            defaults={
                "mssv": "21CS099",
                "full_name": "Nguyễn Văn A",
                "class_name": "CS2021A",
                "cohort": "K2021",
                "major": "Khoa học Máy tính",
                "academic_status": "active",
            },
        )
        before_count = StudentRegistry.objects.count()

        rows = [["mssv", "full_name", "email", "class_name", "cohort", "major", "academic_status"]]
        for i in range(1, 51):
            if i == 12:
                rows.append([f"26CS{i:03d}", f"Sinh viên {i}", "invalid-email", "CS2026A", "K2026", "CNTT", "active"])
            elif i == 35:
                rows.append([f"26CS{i:03d}", f"Sinh viên {i}", "nguyenvana@st.vju.ac.vn", "CS2026A", "K2026", "CNTT", "active"])
            else:
                rows.append([f"26CS{i:03d}", f"Sinh viên {i}", f"sv_new_{i:02d}@st.vju.ac.vn", "CS2026A", "K2026", "CNTT", "active"])

        xlsx_bytes = build_xlsx_bytes(rows)
        upload = SimpleUploadedFile(
            "students_new.xlsx",
            xlsx_bytes,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )

        res = self.client.post(
            "/api/admin/users/import-students",
            data={"file": upload},
            **self.auth(self.admin),
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertTrue(body["success"])
        data = body["data"]
        self.assertEqual(data["total_rows"], 50)
        self.assertEqual(data["imported"], 48)
        self.assertEqual(data["skipped"], 2)
        self.assertEqual(
            data["errors"],
            [
                {"row": 12, "email": "invalid-email", "reason": "Email không hợp lệ"},
                {"row": 35, "email": "nguyenvana@st.vju.ac.vn", "reason": "Email đã tồn tại"},
            ],
        )
        self.assertEqual(StudentRegistry.objects.count(), before_count + 48)

    # =========================================================================
    # API 7.3: GET /api/admin/dashboard — Dashboard thống kê
    # =========================================================================
    def _seed_dashboard_requests(self):
        Request.objects.all().delete()
        Feedback.objects.all().delete()

        proc_pctsv = ProcedureType.objects.get(type_id=1)  # Giấy xác nhận sinh viên (PCTSV)
        proc_pdt = ProcedureType.objects.get(type_id=3)    # Phúc khảo điểm thi (PĐT)

        base_oct = local_dt(2026, 10, 15, 9, 0)
        base_nov = local_dt(2026, 11, 5, 9, 0)

        specs = [
            # 2 pending
            ("REQ-DASH-01", proc_pctsv, "Đã gửi", "Chờ phân công", base_oct, base_oct + timedelta(hours=1), base_oct + timedelta(days=2)),
            ("REQ-DASH-02", proc_pdt, "Chờ thanh toán", "Chờ thanh toán", base_oct, base_oct + timedelta(hours=1), None),
            # 3 processing
            ("REQ-DASH-03", proc_pctsv, "Đang xử lý", "CV đang thẩm định", base_oct, base_oct + timedelta(hours=2), base_oct + timedelta(days=2)),
            ("REQ-DASH-04", proc_pdt, "Đang xử lý", "Chờ TP phê duyệt", base_oct, base_oct + timedelta(hours=3), base_oct + timedelta(days=5)),
            ("REQ-DASH-05", proc_pdt, "Cần bổ sung", "Cần bổ sung", base_nov, base_nov + timedelta(hours=2), base_nov + timedelta(days=5)),
            # 4 completed (all on time: updated_at <= sla_deadline)
            ("REQ-DASH-06", proc_pctsv, "Đã xử lý", "Đã xử lý", base_oct, base_oct + timedelta(hours=18.5), base_oct + timedelta(days=2)),
            ("REQ-DASH-07", proc_pctsv, "Đã duyệt", "Đã duyệt — Có kết quả", base_oct, base_oct + timedelta(hours=18.5), base_oct + timedelta(days=2)),
            ("REQ-DASH-08", proc_pdt, "Đã xử lý", "Đã xử lý", base_oct, base_oct + timedelta(hours=24), base_oct + timedelta(days=5)),
            ("REQ-DASH-09", proc_pdt, "Đã xử lý", "Đã xử lý", base_nov, base_nov + timedelta(hours=24), base_nov + timedelta(days=5)),
            # 1 rejected
            ("REQ-DASH-10", proc_pctsv, "Từ chối", "Từ chối", base_nov, base_nov + timedelta(hours=4), base_nov + timedelta(days=2)),
        ]

        created_reqs = []
        for code, proc, st, ist, c_at, u_at, deadline in specs:
            r = Request.objects.create(
                request_code=code,
                user=self.sv_a,
                procedure_type=proc,
                status=st,
                internal_status=ist,
                sla_deadline=deadline,
                is_draft=False,
            )
            Request.objects.filter(pk=r.pk).update(created_at=c_at, updated_at=u_at)
            r.refresh_from_db()
            created_reqs.append(r)

        Feedback.objects.create(
            request=created_reqs[5],
            user=self.sv_a,
            star_rating=4.0,
            speed_score=4.0,
            attitude_score=4.5,
            convenience_score=4.0,
        )
        Feedback.objects.create(
            request=created_reqs[6],
            user=self.sv_a,
            star_rating=5.0,
            speed_score=5.0,
            attitude_score=4.5,
            convenience_score=5.0,
        )

    def test_7_3_1_dashboard_overview_sla_satisfaction(self):
        self._seed_dashboard_requests()
        res = self.client.get("/api/admin/dashboard", **self.auth(self.admin))
        self.assertEqual(res.status_code, 200)
        data = res.json()["data"]

        self.assertEqual(
            data["overview"],
            {
                "total_requests": 10,
                "pending": 2,
                "processing": 3,
                "completed": 4,
                "rejected": 1,
                "cancelled": 0,
            },
        )
        self.assertEqual(
            data["sla_compliance"],
            {
                "on_time": 4,
                "overdue": 0,
                "compliance_rate": 100.0,
            },
        )
        self.assertEqual(data["satisfaction"]["avg_star_rating"], 4.5)
        self.assertEqual(data["satisfaction"]["total_feedbacks"], 2)

        by_proc = {p["type_name"]: p for p in data["by_procedure"]}
        self.assertIn("Giấy xác nhận sinh viên", by_proc)
        self.assertEqual(by_proc["Giấy xác nhận sinh viên"]["total"], 5)
        self.assertEqual(by_proc["Giấy xác nhận sinh viên"]["avg_processing_hours"], 18.5)

        by_dept = {d["department_name"]: d for d in data["by_department"]}
        self.assertIn("Phòng Công tác Sinh viên", by_dept)
        self.assertEqual(by_dept["Phòng Công tác Sinh viên"]["total"], 5)
        self.assertEqual(by_dept["Phòng Công tác Sinh viên"]["on_time_rate"], 100.0)

    def test_7_3_2_dashboard_filter_by_date_range(self):
        self._seed_dashboard_requests()
        res = self.client.get(
            "/api/admin/dashboard?from_date=2026-10-01&to_date=2026-10-31",
            **self.auth(self.admin),
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()["data"]
        # 7 đơn trong tháng 10, 3 đơn trong tháng 11
        self.assertEqual(data["overview"]["total_requests"], 7)

    def test_7_3_3_dashboard_filter_by_department(self):
        self._seed_dashboard_requests()
        res = self.client.get(
            f"/api/admin/dashboard?department_id={self.dept_pctsv.dept_id}",
            **self.auth(self.admin),
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()["data"]
        self.assertEqual(data["overview"]["total_requests"], 5)
        self.assertEqual(len(data["by_department"]), 1)
        self.assertEqual(data["by_department"][0]["department_name"], "Phòng Công tác Sinh viên")

    # =========================================================================
    # API 7.4: CRUD /api/admin/holidays — Quản lý ngày nghỉ
    # =========================================================================
    def test_7_4_1_add_holiday_excludes_date_from_sla(self):
        res = self.client.post(
            "/api/admin/holidays",
            data=json.dumps(
                {
                    "holiday_date": "2026-12-25",
                    "description": "Giáng sinh",
                    "type": "holiday",
                    "year": 2026,
                }
            ),
            content_type="application/json",
            **self.auth(self.admin),
        )
        self.assertEqual(res.status_code, 201)
        self.assertTrue(Holiday.objects.filter(holiday_date=date(2026, 12, 25)).exists())

        # Thứ Năm 24/12/2026 10:00 + 1 ngày làm việc:
        # Thứ Sáu 25/12 là Holiday, T7 26/12 & CN 27/12 nghỉ -> hạn SLA phải là Thứ Hai 28/12/2026 10:00
        submitted_at = local_dt(2026, 12, 24, 10, 0)
        deadline = calculate_sla_deadline(submitted_at, 1)
        local_deadline = timezone.localtime(deadline)
        self.assertEqual(local_deadline.date(), date(2026, 12, 28))

    def test_7_4_2_add_duplicate_holiday_rejected(self):
        res = self.client.post(
            "/api/admin/holidays",
            data=json.dumps(
                {
                    "holiday_date": "2026-09-02",
                    "description": "Quốc khánh 2/9",
                    "type": "holiday",
                    "year": 2026,
                }
            ),
            content_type="application/json",
            **self.auth(self.admin),
        )
        self.assertEqual(res.status_code, 409)
        body = res.json()
        self.assertFalse(body["success"])
        self.assertEqual(body["error"]["code"], "DUPLICATE_HOLIDAY")
        self.assertEqual(body["error"]["message"], "Ngày này đã có trong danh sách.")

    def test_7_5_crud_users_and_rejection_reasons(self):
        # Tạo tài khoản cán bộ mới
        create_u = self.client.post(
            "/api/admin/users",
            data=json.dumps(
                {
                    "email": "new.staff@vju.ac.vn",
                    "full_name": "Cán bộ Mới",
                    "role": "staff",
                    "department_id": self.dept_pctsv.dept_id,
                }
            ),
            content_type="application/json",
            **self.auth(self.admin),
        )
        self.assertEqual(create_u.status_code, 201)
        uid = create_u.json()["data"]["user_id"]

        # Khóa tài khoản cán bộ
        upd_u = self.client.put(
            f"/api/admin/users/{uid}",
            data=json.dumps({"account_status": "locked"}),
            content_type="application/json",
            **self.auth(self.admin),
        )
        self.assertEqual(upd_u.status_code, 200)
        self.assertEqual(User.objects.get(user_id=uid).account_status, "locked")

        # Thêm và soft-delete lý do từ chối
        create_r = self.client.post(
            "/api/admin/rejection-reasons",
            data=json.dumps({"reason_text": "Lý do từ chối thử nghiệm Module 7"}),
            content_type="application/json",
            **self.auth(self.admin),
        )
        self.assertEqual(create_r.status_code, 201)
        rid = create_r.json()["data"]["reason_id"]

        del_r = self.client.delete(
            f"/api/admin/rejection-reasons/{rid}",
            **self.auth(self.admin),
        )
        self.assertEqual(del_r.status_code, 200)
        self.assertFalse(RejectionReason.objects.get(reason_id=rid).is_active)
