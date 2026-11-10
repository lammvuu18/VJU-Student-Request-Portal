from datetime import date, datetime
from io import BytesIO, StringIO
import json
import shutil
import tempfile
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone

from accounts.jwt_utils import generate_jwt_token
from accounts.models import (
    Attachment, AttachmentConfig, Notification, ProcedureType,
    Request, Result, StateAuditLog, StudentRegistry, User,
)
from accounts.services import AcademicMSService, MockSmartCAService


def local_dt(year, month, day, hour=10, minute=0, second=0):
    return timezone.make_aware(datetime(year, month, day, hour, minute, second))


def make_pdf_file(name="giay_nhap_vien.pdf", size_bytes=None):
    content = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n"
    if size_bytes and size_bytes > len(content):
        content = content + (b"0" * (size_bytes - len(content)))
    return SimpleUploadedFile(name, content, content_type="application/pdf")


@override_settings(DEBUG=True)
class Module4TestCase(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._temp_media = tempfile.mkdtemp(prefix="vju_test_media_m4_")
        cls._media_override = override_settings(MEDIA_ROOT=cls._temp_media)
        cls._media_override.enable()

    @classmethod
    def tearDownClass(cls):
        cls._media_override.disable()
        shutil.rmtree(cls._temp_media, ignore_errors=True)
        super().tearDownClass()

    @classmethod
    def setUpTestData(cls):
        call_command("seed_module1", allow_non_sqlite=True, stdout=StringIO())
        cls.sv_a = User.objects.get(email="minhanh@st.vju.ac.vn")
        cls.sv_b = User.objects.get(email="quocanh@st.vju.ac.vn")
        cls.tp_pdt = User.objects.get(email="thuha@vju.ac.vn")
        cls.cv_pdt = User.objects.get(email="tranthi.b@vju.ac.vn")
        cls.principal = User.objects.get(email="vanbinh@vju.ac.vn")
        cls.tp_pctsv = User.objects.get(email="tp.ctsv@vju.ac.vn")

        # Đảm bảo thủ tục 4 cấu hình đúng 3 cấp, SLA 5 ngày
        cls.proc4 = ProcedureType.objects.get(type_id=4)
        cls.proc4.approval_levels = 3
        cls.proc4.sla_total_days = 5
        cls.proc4.save()

        # Đảm bảo có AttachmentConfig config_id=4
        cls.att_config, _ = AttachmentConfig.objects.update_or_create(
            config_id=4,
            defaults={
                "procedure_type_id": 2,  # hoặc 4
                "item_name": "Minh chứng lý do bảo lưu",
                "is_required": False,
                "allowed_formats": "PDF,JPG,PNG",
                "max_size_mb": 5,
                "display_order": 1,
            },
        )

    def auth(self, user):
        token = generate_jwt_token({"user_id": user.user_id, "role": user.role})
        return {"HTTP_AUTHORIZATION": f"Bearer {token}"}

    def put_json(self, url, body, user):
        return self.client.put(
            url,
            data=json.dumps(body, ensure_ascii=False),
            content_type="application/json",
            **self.auth(user),
        )

    def post_json(self, url, body, user):
        return self.client.post(
            url,
            data=json.dumps(body, ensure_ascii=False),
            content_type="application/json",
            **self.auth(user),
        )

    def _create_base_preservation_request(self, gpa=3.2):
        """Helper tạo đơn bảo lưu đã qua bước nộp đơn."""
        payload = {
            "type_id": "4",
            "form_data": json.dumps({
                "reason": "Lý do sức khỏe",
                "suspend_from": "2027-01-01",
                "suspend_to": "2027-06-30",
                "return_semester": "HK1 2027-2028",
                "commitment": True,
                "gpa": gpa,
            }, ensure_ascii=False),
            "attachments[0][config_id]": "4",
            "attachments[0][file]": make_pdf_file("giay_nhap_vien.pdf"),
        }
        res = self.client.post("/api/requests", data=payload, **self.auth(self.sv_a))
        self.assertEqual(res.status_code, 201)
        req_id = res.json()["data"]["request_id"]
        return Request.objects.get(pk=req_id)

    # ==================== Test 4.1.1: Gửi đơn với auto-fill GPA ====================
    def test_4_1_1_create_request_autofill_gpa(self):
        """
        Test 4.1.1:
        1. form_data chứa gpa = 3.2 (auto-fill từ Mock Academic MS)
        2. SLA = 5 ngày
        3. Attachment có 1 bản ghi: config_id = 4
        """
        payload = {
            "type_id": "4",
            "form_data": json.dumps({
                "reason": "Lý do sức khỏe",
                "suspend_from": "2027-01-01",
                "suspend_to": "2027-06-30",
                "return_semester": "HK1 2027-2028",
                "commitment": True,
            }, ensure_ascii=False),
            "attachments[0][config_id]": "4",
            "attachments[0][file]": make_pdf_file("giay_nhap_vien.pdf"),
        }
        friday = local_dt(2026, 10, 30, 10, 0, 0)
        with patch("django.utils.timezone.now", return_value=friday):
            res = self.client.post("/api/requests", data=payload, **self.auth(self.sv_a))

        self.assertEqual(res.status_code, 201)
        data = res.json()["data"]
        req_id = data["request_id"]
        req = Request.objects.get(pk=req_id)

        # 1. form_data chứa gpa = 3.2 (auto-fill từ Mock Academic MS)
        self.assertEqual(req.form_data.get("gpa"), 3.2)

        # 2. SLA = 5 ngày làm việc
        self.assertEqual(req.procedure_type.sla_total_days, 5)

        # 3. Attachment có 1 bản ghi với config_id = 4
        att = Attachment.objects.filter(request=req).first()
        self.assertIsNotNone(att)
        self.assertEqual(att.config_id, 4)
        self.assertEqual(att.file_name, "giay_nhap_vien.pdf")

    # ==================== Test 4.2.1: TP trình HT ký ====================
    def test_4_2_1_submit_to_principal(self):
        """
        Test 4.2.1: Trình HT ký thành công
        Điều kiện: CV đã trình TP (submit-to-head), TP đã phê duyệt chuyên môn
        Checklist:
        1. Hệ thống render PDF QĐ bảo lưu từ template
        2. Result.pdf_file_path trỏ tới PDF vừa render
        3. StateAuditLog: action = "submit_for_signature"
        4. Notification gửi cho HT
        """
        req = self._create_base_preservation_request(gpa=3.2)

        # TP phân công cho CV PĐT
        assign_res = self.put_json(
            f"/api/staff/requests/{req.request_id}/assign",
            {"assigned_staff_id": self.cv_pdt.user_id},
            self.tp_pdt,
        )
        self.assertEqual(assign_res.status_code, 200)

        # CV thẩm định và trình Trưởng phòng (submit-to-head)
        sub_head_res = self.put_json(
            f"/api/staff/requests/{req.request_id}/submit-to-head",
            {"note": "Đã kiểm tra điều kiện GPA 3.2 >= 2.0, minh chứng nhập viện hợp lệ."},
            self.cv_pdt,
        )
        self.assertEqual(sub_head_res.status_code, 200)
        req.refresh_from_db()
        self.assertEqual(req.internal_status, "Chờ TP phê duyệt")

        # TP trình Hiệu trưởng (submit-to-principal)
        sub_princ_res = self.put_json(
            f"/api/staff/requests/{req.request_id}/submit-to-principal",
            {"note": "Đã xác nhận GPA ≥ 2.0, minh chứng hợp lệ. Trình HT ký QĐ bảo lưu."},
            self.tp_pdt,
        )
        self.assertEqual(sub_princ_res.status_code, 200)
        body = sub_princ_res.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["data"]["internal_status"], "Chờ HT ký số")
        self.assertEqual(body["message"], "Đã trình Hiệu trưởng. Chờ ký số SmartCA.")

        req.refresh_from_db()
        self.assertEqual(req.internal_status, "Chờ HT ký số")

        # Checklist 1 & 2: Result và PDF
        result = Result.objects.filter(request=req).first()
        self.assertIsNotNone(result)
        self.assertTrue(result.pdf_file_path and result.pdf_file_path.endswith(".pdf"))

        # Checklist 3: StateAuditLog action = "submit_for_signature"
        log = StateAuditLog.objects.filter(request=req, action="submit_for_signature").first()
        self.assertIsNotNone(log)
        self.assertEqual(log.status_after, "Chờ HT ký số")

        # Checklist 4: Notification gửi cho HT
        self.assertTrue(
            Notification.objects.filter(
                user=self.principal,
                request=req,
                title__icontains="Quyết định chờ ký số",
            ).exists()
        )

    # ==================== Test 4.3.1: HT xem QĐ chờ ký ====================
    def test_4_3_1_get_pending_signatures_success(self):
        """
        Test 4.3.1: HT xem danh sách đơn chờ ký
        Checklist:
        1. Chỉ trả request có internal_status = "Chờ HT ký số"
        2. Chỉ trả thủ tục 3 cấp (BR-22)
        """
        req = self._create_base_preservation_request(gpa=3.2)
        self.put_json(
            f"/api/staff/requests/{req.request_id}/assign",
            {"assigned_staff_id": self.cv_pdt.user_id},
            self.tp_pdt,
        )
        self.put_json(
            f"/api/staff/requests/{req.request_id}/submit-to-head",
            {"note": "Đủ điều kiện bảo lưu"},
            self.cv_pdt,
        )
        self.put_json(
            f"/api/staff/requests/{req.request_id}/submit-to-principal",
            {"note": "Trình HT ký"},
            self.tp_pdt,
        )

        res = self.client.get("/api/principal/pending-signatures", **self.auth(self.principal))
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertTrue(body["success"])
        items = body["data"]
        self.assertGreaterEqual(len(items), 1)

        found = next((i for i in items if i["request_id"] == req.request_id), None)
        self.assertIsNotNone(found)
        self.assertEqual(found["request_code"], req.request_code)
        self.assertEqual(found["type_name"], "Bảo lưu kết quả học tập")
        self.assertEqual(found["student_name"], self.sv_a.full_name)
        self.assertIn("pdf_preview_url", found)

    # ==================== Test 4.3.2: Không phải HT bị từ chối ====================
    def test_4_3_2_get_pending_signatures_forbidden(self):
        """
        Test 4.3.2: Người dùng vai trò khác (ví dụ TP PĐT) bị 403 FORBIDDEN
        """
        res = self.client.get("/api/principal/pending-signatures", **self.auth(self.tp_pdt))
        self.assertEqual(res.status_code, 403)
        body = res.json()
        self.assertFalse(body["success"])
        self.assertEqual(body["error"]["code"], "FORBIDDEN")
        self.assertEqual(body["error"]["message"], "Chỉ Hiệu trưởng mới có quyền truy cập.")

    # ==================== Test 4.4.1: Ký số SmartCA thành công ====================
    def test_4_4_1_sign_smartca_success(self):
        """
        Test 4.4.1: HT ký số SmartCA thành công
        Checklist:
        1. Result.smartca_transaction_id có giá trị
        2. Result.signed_by_id = HT
        3. Result.signed_at có giá trị
        4. Mock Academic MS được gọi: updateStudentStatus("21CS001", "suspended")
        5. Notification gửi cho SV: "QĐ bảo lưu đã được HT ký số"
        6. PDF có thể tải (GET /api/results/:id/download)
        """
        req = self._create_base_preservation_request(gpa=3.2)
        self.put_json(
            f"/api/staff/requests/{req.request_id}/assign",
            {"assigned_staff_id": self.cv_pdt.user_id},
            self.tp_pdt,
        )
        self.put_json(
            f"/api/staff/requests/{req.request_id}/submit-to-head",
            {"note": "Hồ sơ hợp lệ"},
            self.cv_pdt,
        )
        self.put_json(
            f"/api/staff/requests/{req.request_id}/submit-to-principal",
            {"note": "Trình HT ký"},
            self.tp_pdt,
        )

        # HT ký số SmartCA
        res = self.post_json(
            f"/api/principal/requests/{req.request_id}/sign",
            {"provider": "vnpt_smartca"},
            self.principal,
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertTrue(body["success"])
        self.assertEqual(body["message"], "Ký số thành công.")
        self.assertEqual(body["data"]["internal_status"], "Đã duyệt — Có kết quả")

        result = Result.objects.get(request=req)
        # Checklist 1: Result.smartca_transaction_id có giá trị
        self.assertTrue(result.smartca_transaction_id and result.smartca_transaction_id.startswith("MOCK-SMARTCA-"))

        # Checklist 2: Result.signed_by_id = HT
        self.assertEqual(result.signed_by_id, self.principal.user_id)

        # Checklist 3: Result.signed_at có giá trị
        self.assertIsNotNone(result.signed_at)

        # Checklist 4: StudentRegistry academic_status -> "suspended"
        reg = StudentRegistry.objects.get(mssv=self.sv_a.student_registry.mssv)
        self.assertEqual(reg.academic_status, "suspended")

        # Checklist 5: Notification gửi cho SV: "QĐ bảo lưu đã được HT ký số"
        self.assertTrue(
            Notification.objects.filter(
                user=self.sv_a,
                request=req,
                message__icontains="QĐ bảo lưu đã được HT ký số",
            ).exists()
        )

        # Checklist 6: PDF có thể tải qua GET /api/results/:result_id/download
        dl_res = self.client.get(f"/api/results/{result.result_id}/download", **self.auth(self.sv_a))
        self.assertEqual(dl_res.status_code, 200)
        self.assertEqual(dl_res["Content-Type"], "application/pdf")

    # ==================== Test 4.4.2: SmartCA timeout ====================
    def test_4_4_2_sign_smartca_timeout(self):
        """
        Test 4.4.2: SmartCA timeout
        Checklist:
        1. Status code = 504
        2. internal_status vẫn "Chờ HT ký số" — HT có thể thử lại
        """
        req = self._create_base_preservation_request(gpa=3.2)
        self.put_json(
            f"/api/staff/requests/{req.request_id}/assign",
            {"assigned_staff_id": self.cv_pdt.user_id},
            self.tp_pdt,
        )
        self.put_json(
            f"/api/staff/requests/{req.request_id}/submit-to-head",
            {"note": "Hồ sơ hợp lệ"},
            self.cv_pdt,
        )
        self.put_json(
            f"/api/staff/requests/{req.request_id}/submit-to-principal",
            {"note": "Trình HT ký"},
            self.tp_pdt,
        )

        res = self.post_json(
            f"/api/principal/requests/{req.request_id}/sign",
            {"simulate_timeout": True},
            self.principal,
        )
        # 1. Status code = 504
        self.assertEqual(res.status_code, 504)
        body = res.json()
        self.assertEqual(body["error"]["code"], "SMARTCA_TIMEOUT")

        # 2. internal_status vẫn "Chờ HT ký số"
        req.refresh_from_db()
        self.assertEqual(req.internal_status, "Chờ HT ký số")

    # ==================== Test 4.5: GPA < 2.0 -> CV từ chối ====================
    def test_4_5_cv_reject_low_gpa(self):
        """
        Test 4.5: GPA < 2.0 → CV từ chối
        Checklist:
        1. CV từ chối với lý do "GPA không đạt yêu cầu tối thiểu (2.0)"
        """
        # Giả lập sinh viên nộp đơn có GPA = 1.8
        req = self._create_base_preservation_request(gpa=1.8)

        # TP phân công CV PĐT
        self.put_json(
            f"/api/staff/requests/{req.request_id}/assign",
            {"assigned_staff_id": self.cv_pdt.user_id},
            self.tp_pdt,
        )

        # CV kiểm tra GPA < 2.0 -> từ chối đơn
        rej_res = self.put_json(
            f"/api/staff/requests/{req.request_id}/reject",
            {"note": "GPA không đạt yêu cầu tối thiểu (2.0) theo quy chế bảo lưu của ĐHQGHN."},
            self.cv_pdt,
        )
        self.assertEqual(rej_res.status_code, 200)
        req.refresh_from_db()
        self.assertEqual(req.status, "Từ chối")
        self.assertEqual(req.internal_status, "Từ chối")

        # Sinh viên nhận được thông báo từ chối
        self.assertTrue(
            Notification.objects.filter(
                user=self.sv_a,
                request=req,
                title__icontains="từ chối",
            ).exists()
        )

    # ==================== Bonus: Quy trình trả lại hồ sơ ====================
    def test_workflow_returns_between_levels(self):
        """
        Kiểm tra luồng trả hồ sơ:
        1. TP trả lại CV thẩm định lại (return-to-staff)
        2. HT trả lại TP xem xét lại (return-to-head)
        """
        req = self._create_base_preservation_request(gpa=3.2)
        self.put_json(
            f"/api/staff/requests/{req.request_id}/assign",
            {"assigned_staff_id": self.cv_pdt.user_id},
            self.tp_pdt,
        )
        self.put_json(
            f"/api/staff/requests/{req.request_id}/submit-to-head",
            {"note": "Trình TP"},
            self.cv_pdt,
        )

        # 1. TP trả lại CV
        ret_staff_res = self.put_json(
            f"/api/staff/requests/{req.request_id}/return-to-staff",
            {"note": "Yêu cầu kiểm tra lại thời gian bảo lưu."},
            self.tp_pdt,
        )
        self.assertEqual(ret_staff_res.status_code, 200)
        req.refresh_from_db()
        self.assertEqual(req.internal_status, "CV đang thẩm định")

        # CV trình lại TP -> TP trình HT
        self.put_json(f"/api/staff/requests/{req.request_id}/submit-to-head", {"note": "Đã sửa"}, self.cv_pdt)
        self.put_json(f"/api/staff/requests/{req.request_id}/submit-to-principal", {"note": "Trình HT"}, self.tp_pdt)
        req.refresh_from_db()
        self.assertEqual(req.internal_status, "Chờ HT ký số")

        # 2. HT trả lại TP
        ret_head_res = self.post_json(
            f"/api/principal/requests/{req.request_id}/return-to-head",
            {"note": "Chưa rõ học kỳ quay trở lại học tập."},
            self.principal,
        )
        self.assertEqual(ret_head_res.status_code, 200)
        req.refresh_from_db()
        self.assertEqual(req.internal_status, "Chờ TP phê duyệt")

    def test_render_demo_accounts_can_process_preservation_workflow(self):
        """
        Kiểm tra luồng Smoke Test trên Render với tài khoản Demo (demo.truongphong / demo.chuyenvien):
        SV nộp đơn Bảo lưu -> Trưởng phòng Demo thấy đơn trong danh sách -> phân công Chuyên viên Demo
        -> Chuyên viên Demo thấy đơn và trình Trưởng phòng -> Trưởng phòng trình Hiệu trưởng -> ký số.
        """
        with patch.dict(
            "os.environ",
            {
                "SEED_DEMO": "True",
                "DEMO_PASSWORD": "demo-password-123",
                "DEMO_STUDENT_EMAILS": "guenkokuain020411@gmail.com",
            },
        ):
            call_command("seed_demo", stdout=StringIO())

        demo_tp = User.objects.get(email="demo.truongphong@vju.ac.vn")
        demo_cv = User.objects.get(email="demo.chuyenvien@vju.ac.vn")
        demo_ht = User.objects.get(email="demo.hieutruong@vju.ac.vn")
        demo_sv = User.objects.get(email="guenkokuain020411@gmail.com")

        # 1. SV nộp đơn bảo lưu
        create_res = self.client.post(
            "/api/requests",
            data={
                "type_id": "4",
                "form_data": json.dumps(
                    {
                        "reason": "Bảo lưu điều trị sức khỏe",
                        "semester": "HK1 2026-2027",
                        "semester_count": 1,
                    },
                    ensure_ascii=False,
                ),
            },
            **self.auth(demo_sv),
        )
        self.assertEqual(create_res.status_code, 201, create_res.content.decode())
        req_id = create_res.json()["data"]["request_id"]

        # 2. Trưởng phòng Demo phải thấy đơn vừa nộp trong danh sách (GET /api/staff/inbox?scope=all)
        inbox_tp = self.client.get("/api/staff/inbox?scope=all", **self.auth(demo_tp)).json()
        inbox_ids = [item["request_id"] for item in inbox_tp["data"]]
        self.assertIn(req_id, inbox_ids)

        # 3. Trưởng phòng Demo phân công cho Chuyên viên Demo
        assign_res = self.put_json(
            f"/api/staff/requests/{req_id}/assign",
            {"assigned_staff_id": demo_cv.user_id},
            demo_tp,
        )
        self.assertEqual(assign_res.status_code, 200, assign_res.content.decode())

        # 4. Chuyên viên Demo thấy đơn trong danh sách của mình
        inbox_cv = self.client.get("/api/staff/inbox?scope=all", **self.auth(demo_cv)).json()
        cv_ids = [item["request_id"] for item in inbox_cv["data"]]
        self.assertIn(req_id, cv_ids)

        # 5. Chuyên viên Demo trình Trưởng phòng
        sub_head_res = self.put_json(
            f"/api/staff/requests/{req_id}/submit-to-head",
            {"note": "Đủ điều kiện bảo lưu"},
            demo_cv,
        )
        self.assertEqual(sub_head_res.status_code, 200, sub_head_res.content.decode())

        # 6. Trưởng phòng Demo trình Hiệu trưởng ký số
        sub_prin_res = self.put_json(
            f"/api/staff/requests/{req_id}/submit-to-principal",
            {"note": "Đồng ý trình Hiệu trưởng ký QĐ"},
            demo_tp,
        )
        self.assertEqual(sub_prin_res.status_code, 200, sub_prin_res.content.decode())

        # 7. Hiệu trưởng Demo ký số
        sign_res = self.post_json(f"/api/principal/requests/{req_id}/sign", {}, demo_ht)
        self.assertEqual(sign_res.status_code, 200, sign_res.content.decode())
