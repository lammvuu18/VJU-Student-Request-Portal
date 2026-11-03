from datetime import date, datetime, timedelta
from io import BytesIO, StringIO
import json
import shutil
import tempfile
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone
from PIL import Image

from accounts.jwt_utils import generate_jwt_token
from accounts.models import (
    AccessLog, Attachment, Feedback, Holiday, Notification,
    ProcedureType, RejectionReason, Request, Result, StateAuditLog, User,
)
from accounts.services import AcademicMSService, ExternalServiceError


def local_dt(year, month, day, hour=10, minute=0, second=0):
    return timezone.make_aware(datetime(year, month, day, hour, minute, second))


def make_jpeg_file(name="cccd.jpg", size_bytes=None):
    buf = BytesIO()
    img = Image.new("RGB", (20, 20), color=(255, 0, 0))
    img.save(buf, format="JPEG")
    content = buf.getvalue()
    if size_bytes and size_bytes > len(content):
        content = content + (b"\x00" * (size_bytes - len(content)))
    return SimpleUploadedFile(name, content, content_type="image/jpeg")


def make_pdf_file(name="doc.pdf", size_bytes=None):
    content = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n"
    if size_bytes and size_bytes > len(content):
        content = content + (b"0" * (size_bytes - len(content)))
    return SimpleUploadedFile(name, content, content_type="application/pdf")


@override_settings(DEBUG=True)
class Module1TestCase(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._temp_media = tempfile.mkdtemp(prefix="vju_test_media_")
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
        cls.sv_c = User.objects.get(email="xuanhau@st.vju.ac.vn")
        cls.sv_graduated = User.objects.get(email="graduated@st.vju.ac.vn")
        cls.sv_suspended = User.objects.get(email="suspended@st.vju.ac.vn")
        cls.tp_pctsv = User.objects.get(email="tp.ctsv@vju.ac.vn")
        cls.cv1_pctsv = User.objects.get(email="hoangnam@vju.ac.vn")
        cls.cv2_pctsv = User.objects.get(email="cv2.pctsv@vju.ac.vn")
        cls.tp_pdt = User.objects.get(email="thuha@vju.ac.vn")
        cls.cv_pdt = User.objects.get(email="tranthi.b@vju.ac.vn")
        cls.principal = User.objects.get(email="vanbinh@vju.ac.vn")
        cls.admin = User.objects.get(email="admin@vju.ac.vn")

    def auth(self, user):
        token = generate_jwt_token({"user_id": user.user_id, "role": user.role})
        return {"HTTP_AUTHORIZATION": f"Bearer {token}"}

    def submit_request(self, user=None, type_id=1, form_data=None, attachments=None):
        user = user or self.sv_a
        if form_data is None:
            form_data = {"purpose": "Vay vốn", "result_preference": "Bản điện tử"}
        payload = {
            "type_id": str(type_id),
            "form_data": json.dumps(form_data, ensure_ascii=False),
        }
        if attachments:
            for idx, (cid, file_obj) in enumerate(attachments):
                payload[f"attachments[{idx}][config_id]"] = str(cid)
                payload[f"attachments[{idx}][file]"] = file_obj
        return self.client.post("/api/requests", data=payload, **self.auth(user))

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

    # ==================== API 1.1: POST /api/requests ====================

    def test_1_1_1_submit_request_success_and_sla_friday_to_monday(self):
        friday = local_dt(2026, 10, 30, 10, 0, 0)
        with patch("django.utils.timezone.now", return_value=friday):
            res = self.submit_request()

        self.assertEqual(res.status_code, 201)
        body = res.json()
        self.assertTrue(body["success"])
        data = body["data"]
        self.assertEqual(data["request_id"], 1)
        self.assertEqual(data["request_code"], "REQ-20261030-001")
        self.assertEqual(data["status"], "Đã gửi")
        self.assertEqual(data["internal_status"], "Chờ phân công")
        self.assertEqual(data["sla_deadline"], "2026-11-02T10:00:00")

        req_id = data["request_id"]
        self.assertTrue(StateAuditLog.objects.filter(request_id=req_id, action="submit").exists())
        self.assertTrue(
            Notification.objects.filter(
                user=self.sv_a, request_id=req_id, title__icontains="Đơn đã được tiếp nhận"
            ).exists()
        )
        self.assertTrue(
            Notification.objects.filter(
                user=self.tp_pctsv, request_id=req_id, title__icontains="Có đơn mới chờ phân công"
            ).exists()
        )

    def test_1_1_2_submit_nvqs_with_cccd_attachment(self):
        form_data = {
            "purpose": "Tạm hoãn NVQS",
            "result_preference": "Bản cứng",
            "ho_khau": "Hà Nội",
            "noi_dk_nvqs": "Quận Cầu Giấy",
        }
        res = self.submit_request(
            form_data=form_data,
            attachments=[(1, make_jpeg_file("cccd.jpg"))],
        )
        self.assertEqual(res.status_code, 201)
        req = Request.objects.get(pk=res.json()["data"]["request_id"])
        self.assertEqual(req.form_data["ho_khau"], "Hà Nội")
        self.assertEqual(req.form_data["noi_dk_nvqs"], "Quận Cầu Giấy")
        self.assertEqual(req.result_preference, "Bản cứng")
        att = Attachment.objects.get(request=req)
        self.assertEqual(att.config_id, 1)
        self.assertEqual(att.file_name, "cccd.jpg")

    def test_1_1_3_duplicate_request_blocked(self):
        self.assertEqual(self.submit_request().status_code, 201)
        res = self.submit_request()
        self.assertEqual(res.status_code, 409)
        self.assertEqual(res.json()["error"]["code"], "DUPLICATE_REQUEST")
        self.assertEqual(
            res.json()["error"]["message"],
            "Bạn đã có yêu cầu Giấy xác nhận sinh viên đang xử lý.",
        )
        self.assertEqual(Request.objects.count(), 1)

    def test_1_1_4_rate_limit_5_requests_per_day_including_cancelled(self):
        for _ in range(5):
            r = self.submit_request()
            self.assertEqual(r.status_code, 201)
            req_id = r.json()["data"]["request_id"]
            self.client.put(f"/api/requests/{req_id}/cancel", **self.auth(self.sv_a))

        res = self.submit_request()
        self.assertEqual(res.status_code, 409)
        self.assertEqual(res.json()["error"]["code"], "RATE_LIMIT_EXCEEDED")
        self.assertEqual(res.json()["error"]["message"], "Đã đạt giới hạn 5 yêu cầu/ngày.")

    def test_1_1_5_and_1_1_15_invalid_file_format_and_content(self):
        docx_file = SimpleUploadedFile("document.docx", b"PK\x03\x04fake-docx", content_type="application/octet-stream")
        res = self.submit_request(attachments=[(1, docx_file)])
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["error"]["code"], "INVALID_FILE_FORMAT")

        fake_pdf = SimpleUploadedFile("fake.pdf", b"not-a-real-pdf-content", content_type="application/pdf")
        res2 = self.submit_request(attachments=[(1, fake_pdf)])
        self.assertEqual(res2.status_code, 400)
        self.assertEqual(res2.json()["error"]["code"], "INVALID_FILE_FORMAT")

    def test_1_1_6_file_too_large(self):
        big_pdf = make_pdf_file("big_file.pdf", size_bytes=6 * 1024 * 1024)
        res = self.submit_request(attachments=[(1, big_pdf)])
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["error"]["code"], "FILE_TOO_LARGE")

    def test_1_1_7_graduated_student_can_submit_certificate_request(self):
        res = self.submit_request(user=self.sv_graduated)
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.json()["data"]["status"], "Đã gửi")

    def test_1_1_8_to_1_1_21_validation_and_sla_edge_cases(self):
        # 1.1.8: type_id không tồn tại
        res = self.submit_request(type_id=999)
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.json()["error"]["code"], "NOT_FOUND")

        # 1.1.9: Thủ tục ẩn hoặc phòng ban ngừng hoạt động
        for tid in (7, 8):
            res = self.submit_request(type_id=tid)
            self.assertEqual(res.status_code, 404)
            self.assertEqual(res.json()["error"]["code"], "PROCEDURE_INACTIVE")

        # 1.1.10: Thiếu purpose
        res = self.submit_request(form_data={"result_preference": "Bản điện tử"})
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["error"]["code"], "INVALID_FORM_DATA")

        # 1.1.11: purpose ngoài dropdown
        res = self.submit_request(form_data={"purpose": "Không có", "result_preference": "Bản điện tử"})
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["error"]["code"], "INVALID_FORM_DATA")

        # 1.1.12: Chọn Tạm hoãn NVQS nhưng thiếu ho_khau hoặc noi_dk_nvqs
        res = self.submit_request(form_data={
            "purpose": "Tạm hoãn NVQS",
            "result_preference": "Bản cứng",
            "ho_khau": "Hà Nội",
        })
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["error"]["code"], "INVALID_FORM_DATA")

        # 1.1.13: Thiếu đính kèm bắt buộc (type_id = 5)
        res = self.submit_request(type_id=5, form_data={"beneficiary_type": "Hộ nghèo"})
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["error"]["code"], "MISSING_ATTACHMENT")

        # 1.1.14: config_id thuộc thủ tục khác
        res = self.submit_request(attachments=[(5, make_pdf_file("hn.pdf"))])
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["error"]["code"], "INVALID_ATTACHMENT")

        # 1.1.16: Cán bộ gửi đơn
        res = self.submit_request(user=self.cv1_pctsv)
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.json()["error"]["code"], "FORBIDDEN")

        # 1.1.17: Không có token
        res = self.client.post("/api/requests", data={"type_id": "1"})
        self.assertEqual(res.status_code, 401)
        self.assertEqual(res.json()["error"]["code"], "UNAUTHORIZED")

        # 1.1.18: Gửi full_name khác hồ sơ -> backend tự điền đúng hồ sơ SV
        res = self.submit_request(
            user=self.sv_b,
            form_data={"full_name": "Tên Giả Mạo", "purpose": "Vay vốn", "result_preference": "Bản điện tử"},
        )
        self.assertEqual(res.status_code, 201)
        req_b = Request.objects.get(pk=res.json()["data"]["request_id"])
        self.assertEqual(req_b.form_data["full_name"], "Nguyễn Quốc Anh")

        # 1.1.19: Vừa trùng đơn vừa đủ 5 đơn trong ngày -> trả DUPLICATE_REQUEST trước
        for _ in range(4):
            r = self.submit_request(user=self.sv_c)
            self.client.put(f"/api/requests/{r.json()['data']['request_id']}/cancel", **self.auth(self.sv_c))
        self.assertEqual(self.submit_request(user=self.sv_c).status_code, 201)
        dup_res = self.submit_request(user=self.sv_c)
        self.assertEqual(dup_res.status_code, 409)
        self.assertEqual(dup_res.json()["error"]["code"], "DUPLICATE_REQUEST")

        # 1.1.20: Thứ Hai 02/11 nằm trong Holiday, gửi thứ Sáu 30/10 lúc 10:00 -> thứ Ba 03/11 lúc 10:00
        Holiday.objects.create(holiday_date=date(2026, 11, 2), description="Nghỉ bù", year=2026)
        friday = local_dt(2026, 10, 30, 10, 0, 0)
        with patch("django.utils.timezone.now", return_value=friday):
            res_hol = self.submit_request(user=self.sv_a)
        self.assertEqual(res_hol.status_code, 201)
        self.assertEqual(res_hol.json()["data"]["sla_deadline"], "2026-11-03T10:00:00")

        # 1.1.21: Gửi thứ Bảy 31/10 lúc 10:00 (không có Holiday ngày 02/11) -> thứ Ba 03/11 lúc 08:00
        Holiday.objects.filter(holiday_date=date(2026, 11, 2)).delete()
        saturday = local_dt(2026, 10, 31, 10, 0, 0)
        with patch("django.utils.timezone.now", return_value=saturday):
            res_sat = self.submit_request(user=self.sv_suspended)
        self.assertEqual(res_sat.status_code, 201)
        self.assertEqual(res_sat.json()["data"]["sla_deadline"], "2026-11-03T08:00:00")

    # ==================== API 1.2, 1.3, 1.4: GET / cancel requests ====================

    def test_1_2_and_1_3_and_1_4_student_requests_detail_and_cancel(self):
        # 1.2.2: SV C chưa có đơn nào
        empty_res = self.client.get("/api/requests", **self.auth(self.sv_c)).json()
        self.assertEqual(empty_res["data"], [])
        self.assertEqual(empty_res["pagination"]["total_pages"], 0)

        # Tạo đơn cho SV A
        req_id = self.submit_request(user=self.sv_a).json()["data"]["request_id"]

        # 1.2.1 & 1.2.3: SV A xem danh sách & lọc theo status
        list_res = self.client.get("/api/requests", **self.auth(self.sv_a)).json()
        self.assertEqual(len(list_res["data"]), 1)
        self.assertEqual(list_res["data"][0]["type_name"], "Giấy xác nhận sinh viên")
        self.assertEqual(list_res["data"][0]["department_name"], "Phòng Công tác Sinh viên")

        filtered_empty = self.client.get("/api/requests?status=Đã duyệt", **self.auth(self.sv_a)).json()
        self.assertEqual(filtered_empty["data"], [])

        # 1.3.1: SV A xem chi tiết đơn của mình
        detail_res = self.client.get(f"/api/requests/{req_id}", **self.auth(self.sv_a))
        self.assertEqual(detail_res.status_code, 200)
        self.assertEqual(detail_res.json()["data"]["student"]["mssv"], "21CS001")

        # 1.3.2: SV B xem đơn của SV A -> 403
        self.assertEqual(self.client.get(f"/api/requests/{req_id}", **self.auth(self.sv_b)).status_code, 403)

        # 1.3.3: CV PCTSV xem đơn -> 200 + tạo đúng 1 bản ghi AccessLog
        self.assertEqual(self.client.get(f"/api/requests/{req_id}", **self.auth(self.cv1_pctsv)).status_code, 200)
        self.assertEqual(self.client.get(f"/api/requests/{req_id}", **self.auth(self.cv1_pctsv)).status_code, 200)
        self.assertEqual(AccessLog.objects.filter(request_id=req_id, user=self.cv1_pctsv).count(), 1)

        # 1.3.4, 1.3.5, 1.3.6: Cán bộ khác phòng ban, HT/Admin, đơn không tồn tại
        self.assertEqual(self.client.get(f"/api/requests/{req_id}", **self.auth(self.cv_pdt)).status_code, 403)
        self.assertEqual(self.client.get(f"/api/requests/{req_id}", **self.auth(self.principal)).status_code, 403)
        self.assertEqual(self.client.get(f"/api/requests/{req_id}", **self.auth(self.admin)).status_code, 403)
        self.assertEqual(self.client.get("/api/requests/9999", **self.auth(self.sv_a)).status_code, 404)

        # 1.4.3: SV khác hủy đơn -> 403
        self.assertEqual(self.client.put(f"/api/requests/{req_id}/cancel", **self.auth(self.sv_b)).status_code, 403)

        # 1.4.1, 1.4.4, 1.4.5: SV A hủy đơn thành công, hủy lại -> 422, gửi lại -> 201
        cancel_res = self.client.put(f"/api/requests/{req_id}/cancel", **self.auth(self.sv_a))
        self.assertEqual(cancel_res.status_code, 200)
        self.assertEqual(Request.objects.get(pk=req_id).status, "Đã hủy")
        self.assertEqual(self.client.put(f"/api/requests/{req_id}/cancel", **self.auth(self.sv_a)).status_code, 422)
        self.assertEqual(self.submit_request(user=self.sv_a).status_code, 201)

    # ==================== API 1.5, 1.6, 1.7: Inbox, Members, Assign ====================

    def test_1_5_and_1_6_and_1_7_staff_inbox_members_and_assign(self):
        submit_time = local_dt(2026, 10, 30, 10, 0, 0)
        with patch("django.utils.timezone.now", return_value=submit_time):
            req_id = self.submit_request(user=self.sv_a).json()["data"]["request_id"]

        # 1.5.1: TP PCTSV gọi inbox lúc 14:00 cùng ngày -> sla_remaining_hours = 68
        inbox_time = local_dt(2026, 10, 30, 14, 0, 0)
        with patch("django.utils.timezone.now", return_value=inbox_time):
            res_tp = self.client.get("/api/staff/inbox", **self.auth(self.tp_pctsv)).json()
        self.assertEqual(len(res_tp["data"]), 1)
        self.assertEqual(res_tp["data"][0]["sla_remaining_hours"], 68)
        self.assertFalse(res_tp["data"][0]["is_overdue"])
        self.assertEqual(res_tp["summary"], {"total_pending": 1, "overdue": 0, "due_today": 0})

        # 1.5.2: TP PĐT không thấy đơn PCTSV
        res_pdt = self.client.get("/api/staff/inbox", **self.auth(self.tp_pdt)).json()
        self.assertEqual(res_pdt["data"], [])

        # 1.5.7: SV gọi inbox -> 403
        self.assertEqual(self.client.get("/api/staff/inbox", **self.auth(self.sv_a)).status_code, 403)

        # 1.6.1: TP PCTSV xem danh sách CV
        members_res = self.client.get("/api/staff/department-members", **self.auth(self.tp_pctsv)).json()
        emails = [m["email"] for m in members_res["data"]]
        self.assertEqual(emails, ["hoangnam@vju.ac.vn", "cv2.pctsv@vju.ac.vn"])
        self.assertEqual(members_res["data"][0]["current_workload"], 0)

        # 1.7.2, 1.7.3, 1.7.5, 1.7.6: Các ca lỗi phân công
        self.assertEqual(
            self.put_json(f"/api/staff/requests/{req_id}/assign", {"assigned_staff_id": self.cv1_pctsv.user_id}, self.cv1_pctsv).status_code,
            403,
        )
        res_wrong_dept = self.put_json(
            f"/api/staff/requests/{req_id}/assign", {"assigned_staff_id": self.cv_pdt.user_id}, self.tp_pctsv
        )
        self.assertEqual(res_wrong_dept.status_code, 422)
        self.assertEqual(res_wrong_dept.json()["error"]["code"], "INVALID_STAFF")

        self.assertEqual(
            self.put_json(f"/api/staff/requests/{req_id}/assign", {"assigned_staff_id": self.cv1_pctsv.user_id}, self.tp_pdt).status_code,
            403,
        )
        self.assertEqual(
            self.put_json(f"/api/staff/requests/{req_id}/assign", {"assigned_staff_id": 99999}, self.tp_pctsv).status_code,
            422,
        )

        # 1.7.1: Phân công thành công cho CV1 PCTSV
        assign_res = self.put_json(
            f"/api/staff/requests/{req_id}/assign", {"assigned_staff_id": self.cv1_pctsv.user_id}, self.tp_pctsv
        )
        self.assertEqual(assign_res.status_code, 200)
        self.assertEqual(assign_res.json()["data"]["internal_status"], "CV đang thẩm định")

        # 1.7.4: Phân công lại đơn đã có CV -> 422 INVALID_STATE
        self.assertEqual(
            self.put_json(f"/api/staff/requests/{req_id}/assign", {"assigned_staff_id": self.cv2_pctsv.user_id}, self.tp_pctsv).status_code,
            422,
        )

        # 1.4.2: SV hủy đơn sau khi đã phân công -> 422 CANNOT_CANCEL
        cancel_after = self.client.put(f"/api/requests/{req_id}/cancel", **self.auth(self.sv_a))
        self.assertEqual(cancel_after.status_code, 422)
        self.assertEqual(cancel_after.json()["error"]["code"], "CANNOT_CANCEL")

        # 1.5.3: CV1 thấy đơn, CV2 không thấy
        self.assertEqual(len(self.client.get("/api/staff/inbox", **self.auth(self.cv1_pctsv)).json()["data"]), 1)
        self.assertEqual(len(self.client.get("/api/staff/inbox", **self.auth(self.cv2_pctsv)).json()["data"]), 0)

        # 1.5.4: Quá hạn SLA
        overdue_time = local_dt(2026, 11, 5, 10, 0, 0)
        with patch("django.utils.timezone.now", return_value=overdue_time):
            overdue_inbox = self.client.get("/api/staff/inbox", **self.auth(self.cv1_pctsv)).json()
        self.assertTrue(overdue_inbox["data"][0]["is_overdue"])
        self.assertLess(overdue_inbox["data"][0]["sla_remaining_hours"], 0)
        self.assertEqual(overdue_inbox["summary"]["overdue"], 1)

    def test_1_5_inbox_scope_closed_and_all(self):
        req_id = self.submit_request(user=self.sv_a).json()["data"]["request_id"]
        self.assertEqual(self.client.put(f"/api/requests/{req_id}/cancel", **self.auth(self.sv_a)).status_code, 200)

        # Mặc định (open): đơn đã hủy không còn trong hộp thư
        res_open = self.client.get("/api/staff/inbox", **self.auth(self.tp_pctsv)).json()
        self.assertEqual(res_open["data"], [])
        self.assertEqual(res_open["summary"]["total_pending"], 0)

        # closed: thấy đơn đã hủy, không tính SLA; summary vẫn chỉ đếm đơn đang mở
        res_closed = self.client.get("/api/staff/inbox?scope=closed", **self.auth(self.tp_pctsv)).json()
        self.assertEqual([x["request_id"] for x in res_closed["data"]], [req_id])
        item = res_closed["data"][0]
        self.assertEqual(item["status"], "Đã hủy")
        self.assertTrue(item["is_closed"])
        self.assertFalse(item["is_overdue"])
        self.assertIsNone(item["sla_remaining_hours"])
        self.assertEqual(res_closed["summary"]["total_pending"], 0)

        # all: gồm cả đơn đang mở và đã kết thúc
        open_id = self.submit_request(user=self.sv_b).json()["data"]["request_id"]
        res_all = self.client.get("/api/staff/inbox?scope=all", **self.auth(self.tp_pctsv)).json()
        self.assertEqual(sorted(x["request_id"] for x in res_all["data"]), sorted([req_id, open_id]))

        # CV chưa được phân công thì không thấy đơn đã kết thúc của phòng
        res_cv = self.client.get("/api/staff/inbox?scope=closed", **self.auth(self.cv1_pctsv)).json()
        self.assertEqual(res_cv["data"], [])

        # scope sai -> 400
        bad = self.client.get("/api/staff/inbox?scope=foo", **self.auth(self.tp_pctsv))
        self.assertEqual(bad.status_code, 400)
        self.assertEqual(bad.json()["error"]["code"], "INVALID_PARAM")

    # ==================== API 1.8, 1.16, 1.17, 1.18, 1.19: Approve, Download, Feedback, Verify, Revoke ====================

    def test_1_8_and_1_13_to_1_19_approve_download_feedback_verify_and_revoke(self):
        req_id = self.submit_request(user=self.sv_a).json()["data"]["request_id"]
        self.put_json(
            f"/api/staff/requests/{req_id}/assign", {"assigned_staff_id": self.cv1_pctsv.user_id}, self.tp_pctsv
        )

        # 1.8.2: CV2 không được phân công duyệt -> 403
        self.assertEqual(
            self.put_json(f"/api/staff/requests/{req_id}/approve", {"note": "Thử duyệt"}, self.cv2_pctsv).status_code,
            403,
        )

        # 1.8.5: Academic MS báo không đủ điều kiện -> 422 STUDENT_NOT_ELIGIBLE
        with patch.object(AcademicMSService, "getStudentStatus", return_value={"status": "dismissed"}):
            res_ineligible = self.put_json(f"/api/staff/requests/{req_id}/approve", {"note": "Test"}, self.cv1_pctsv)
        self.assertEqual(res_ineligible.status_code, 422)
        self.assertEqual(res_ineligible.json()["error"]["code"], "STUDENT_NOT_ELIGIBLE")
        self.assertEqual(Request.objects.get(pk=req_id).internal_status, "CV đang thẩm định")

        # 1.8.6: Academic MS lỗi -> 503 EXTERNAL_SERVICE_ERROR
        with patch.object(AcademicMSService, "getStudentStatus", side_effect=ExternalServiceError("Down")):
            res_503 = self.put_json(f"/api/staff/requests/{req_id}/approve", {"note": "Test"}, self.cv1_pctsv)
        self.assertEqual(res_503.status_code, 503)
        self.assertEqual(res_503.json()["error"]["code"], "EXTERNAL_SERVICE_ERROR")

        # 1.8.7: Lỗi tạo PDF -> 500, không tạo Result, đơn giữ nguyên trạng thái
        with patch("accounts.staff_views.generate_result_pdf", side_effect=RuntimeError("PDF error")):
            res_500 = self.put_json(f"/api/staff/requests/{req_id}/approve", {"note": "Test"}, self.cv1_pctsv)
        self.assertEqual(res_500.status_code, 500)
        self.assertFalse(Result.objects.filter(request_id=req_id).exists())
        self.assertEqual(Request.objects.get(pk=req_id).internal_status, "CV đang thẩm định")

        # 1.8.1: Duyệt thành công
        approve_res = self.put_json(
            f"/api/staff/requests/{req_id}/approve",
            {"note": "Đã xác nhận tình trạng SV qua Academic MS — active."},
            self.cv1_pctsv,
        )
        self.assertEqual(approve_res.status_code, 200)
        result_info = approve_res.json()["data"]["result"]
        result_id = result_info["result_id"]
        vcode = result_info["verification_code"]
        self.assertTrue(vcode.startswith("VJU-XN-"))

        # 1.13.1: Xem timeline
        timeline_res = self.client.get(f"/api/requests/{req_id}/timeline", **self.auth(self.sv_a)).json()
        self.assertEqual([e["action"] for e in timeline_res["data"]], ["submit", "assign", "approve"])

        # 1.18.1 & 1.18.2: Verify mã hợp lệ và không hợp lệ
        verify_ok = self.client.get(f"/api/verify/{vcode}")
        self.assertEqual(verify_ok.status_code, 200)
        self.assertEqual(verify_ok.json()["data"]["student_name"], "Nguyễn Minh Anh")
        verify_bad = self.client.get("/api/verify/INVALID-CODE")
        self.assertEqual(verify_bad.status_code, 404)
        self.assertEqual(verify_bad.json()["error"]["code"], "INVALID_CODE")

        # 1.19.1: Thu hồi duyệt trong 30 phút (khi SV chưa tải PDF)
        revoke_res = self.put_json(f"/api/staff/requests/{req_id}/revoke", {}, self.cv1_pctsv)
        self.assertEqual(revoke_res.status_code, 200)
        self.assertEqual(revoke_res.json()["data"]["internal_status"], "CV đang thẩm định")
        self.assertFalse(Result.objects.filter(request_id=req_id).exists())
        self.assertEqual(self.client.get(f"/api/verify/{vcode}").status_code, 404)

        # Duyệt lại rồi kiểm tra quá 30 phút không thu hồi được (1.19.2)
        approve_again = self.put_json(
            f"/api/staff/requests/{req_id}/approve", {"note": "Duyệt lại"}, self.cv1_pctsv
        ).json()["data"]["result"]
        result_id = approve_again["result_id"]

        late_time = timezone.now() + timedelta(minutes=31)
        with patch("django.utils.timezone.now", return_value=late_time):
            revoke_late = self.put_json(f"/api/staff/requests/{req_id}/revoke", {}, self.cv1_pctsv)
        self.assertEqual(revoke_late.status_code, 422)
        self.assertEqual(revoke_late.json()["error"]["code"], "REVOKE_EXPIRED")

        # 1.17.3: Đánh giá khi chưa ở "Đã xử lý" -> 422 INVALID_STATE
        self.assertEqual(
            self.post_json(
                f"/api/requests/{req_id}/feedback",
                {"star_rating": 5, "speed_score": 5, "attitude_score": 5, "convenience_score": 5},
                self.sv_a,
            ).status_code,
            422,
        )

        # 1.16.3 & 1.16.4: SV khác tải PDF -> 403, result_id không tồn tại -> 404
        self.assertEqual(self.client.get(f"/api/results/{result_id}/download", **self.auth(self.sv_b)).status_code, 403)
        self.assertEqual(self.client.get("/api/results/9999/download", **self.auth(self.sv_a)).status_code, 404)

        # 1.16.1: SV A tải PDF lần đầu (đơn "Bản điện tử") -> chuyển sang "Đã xử lý"
        dl_res = self.client.get(f"/api/results/{result_id}/download", **self.auth(self.sv_a))
        self.assertEqual(dl_res.status_code, 200)
        self.assertEqual(dl_res["Content-Type"], "application/pdf")
        self.assertTrue(dl_res.content.startswith(b"%PDF"))
        self.assertEqual(Request.objects.get(pk=req_id).status, "Đã xử lý")

        # 1.17.4 & 1.17.5: SV khác đánh giá -> 403, điểm ngoài 1-5 -> 400
        self.assertEqual(
            self.post_json(
                f"/api/requests/{req_id}/feedback",
                {"star_rating": 5, "speed_score": 5, "attitude_score": 5, "convenience_score": 5},
                self.sv_b,
            ).status_code,
            403,
        )
        self.assertEqual(
            self.post_json(
                f"/api/requests/{req_id}/feedback",
                {"star_rating": 6, "speed_score": 5, "attitude_score": 5, "convenience_score": 5},
                self.sv_a,
            ).status_code,
            400,
        )

        # 1.17.1 & 1.17.2: Đánh giá thành công và chặn đánh giá lần 2
        fb_res = self.post_json(
            f"/api/requests/{req_id}/feedback",
            {
                "star_rating": 4.5,
                "speed_score": 5.0,
                "attitude_score": 4.0,
                "convenience_score": 4.5,
                "comment_text": "Xử lý nhanh, cán bộ nhiệt tình.",
            },
            self.sv_a,
        )
        self.assertIn(fb_res.status_code, (200, 201))
        self.assertEqual(Feedback.objects.filter(request_id=req_id).count(), 1)

        fb_dup = self.post_json(
            f"/api/requests/{req_id}/feedback",
            {"star_rating": 4.5, "speed_score": 5.0, "attitude_score": 4.0, "convenience_score": 4.5},
            self.sv_a,
        )
        self.assertEqual(fb_dup.status_code, 409)
        self.assertEqual(fb_dup.json()["error"]["code"], "ALREADY_RATED")

        # 1.16.2: Cold storage sau 30 ngày
        Result.objects.filter(pk=result_id).update(signed_at=timezone.now() - timedelta(days=31))
        call_command("process_deadlines", stdout=StringIO())
        cold_res = self.client.get(f"/api/results/{result_id}/download", **self.auth(self.sv_a))
        self.assertEqual(cold_res.status_code, 403)
        self.assertEqual(cold_res.json()["error"]["code"], "COLD_STORAGE")

    # ==================== API 1.9, 1.10, 1.11, 1.12, 1.14, 1.15 ====================

    def test_1_9_to_1_15_reject_supplement_and_hardcopy_handover(self):
        # 1.10.1 & 1.10.2: Danh mục lý do từ chối
        reasons_res = self.client.get("/api/rejection-reasons", **self.auth(self.cv1_pctsv))
        self.assertEqual(reasons_res.status_code, 200)
        self.assertEqual(len(reasons_res.json()["data"]), 10)
        self.assertEqual(self.client.get("/api/rejection-reasons", **self.auth(self.sv_a)).status_code, 403)

        # Tạo đơn Bản cứng cho SV A
        req_id = self.submit_request(
            user=self.sv_a,
            form_data={"purpose": "Vay vốn", "result_preference": "Bản cứng"},
        ).json()["data"]["request_id"]
        self.put_json(
            f"/api/staff/requests/{req_id}/assign", {"assigned_staff_id": self.cv1_pctsv.user_id}, self.tp_pctsv
        )

        # 1.11.1 & 1.12.1: Yêu cầu bổ sung 2 lần và nộp bổ sung
        for expected_count in (1, 2):
            supp_req = self.put_json(
                f"/api/staff/requests/{req_id}/request-supplement",
                {"note": "Vui lòng bổ sung CCCD 2 mặt rõ nét hơn."},
                self.cv1_pctsv,
            )
            self.assertEqual(supp_req.status_code, 200)
            self.assertEqual(supp_req.json()["data"]["supplement_count"], expected_count)

            # 1.5.5: Đơn đang tạm dừng SLA -> is_overdue = False
            paused_inbox = self.client.get("/api/staff/inbox", **self.auth(self.cv1_pctsv)).json()
            self.assertFalse(paused_inbox["data"][0]["is_overdue"])

            sub_supp = self.client.post(
                f"/api/requests/{req_id}/supplements",
                data={
                    "attachments[0][config_id]": "1",
                    "attachments[0][file]": make_jpeg_file("cccd_clear.jpg"),
                },
                **self.auth(self.sv_a),
            )
            self.assertEqual(sub_supp.status_code, 200)
            self.assertEqual(sub_supp.json()["data"]["internal_status"], "CV đang thẩm định")

        # 1.11.2: Yêu cầu bổ sung lần 3 -> 422 MAX_SUPPLEMENTS_REACHED
        supp_3 = self.put_json(
            f"/api/staff/requests/{req_id}/request-supplement",
            {"note": "Bổ sung lần 3"},
            self.cv1_pctsv,
        )
        self.assertEqual(supp_3.status_code, 422)
        self.assertEqual(supp_3.json()["error"]["code"], "MAX_SUPPLEMENTS_REACHED")

        # Duyệt đơn Bản cứng -> hẹn lịch nhận (1.14.1) -> xác nhận bàn giao (1.15.1)
        self.put_json(f"/api/staff/requests/{req_id}/approve", {"note": "Duyệt"}, self.cv1_pctsv)

        # 1.15.2: Xác nhận bàn giao khi chưa có lịch hẹn -> 422 INVALID_STATE
        self.assertEqual(
            self.put_json(f"/api/staff/requests/{req_id}/confirm-handover", {}, self.cv1_pctsv).status_code,
            422,
        )

        # 1.14.1: Chỉ định lịch nhận bản cứng
        pickup_res = self.put_json(
            f"/api/staff/requests/{req_id}/assign-pickup",
            {
                "pickup_date": "2026-11-03T09:00:00",
                "pickup_location": "Phòng PCTSV, Tầng 2, Tòa A",
                "pickup_note": "Mang theo CCCD.",
            },
            self.cv1_pctsv,
        )
        self.assertEqual(pickup_res.status_code, 200)

        # 1.15.1: Xác nhận đã giao bản cứng -> chuyển sang "Đã xử lý"
        handover_res = self.put_json(f"/api/staff/requests/{req_id}/confirm-handover", {}, self.cv1_pctsv)
        self.assertEqual(handover_res.status_code, 200)
        self.assertEqual(Request.objects.get(pk=req_id).status, "Đã xử lý")

        # Tạo đơn cho SV B để test từ chối (1.9.1, 1.9.2, 1.9.3) và quá hạn bổ sung (1.12.5)
        req_b_id = self.submit_request(user=self.sv_b).json()["data"]["request_id"]
        self.put_json(
            f"/api/staff/requests/{req_b_id}/assign", {"assigned_staff_id": self.cv1_pctsv.user_id}, self.tp_pctsv
        )

        # 1.9.2: Lý do tự nhập < 20 ký tự -> 422 REASON_TOO_SHORT
        short_rej = self.put_json(
            f"/api/staff/requests/{req_b_id}/reject", {"reason_id": None, "note": "Không hợp lệ"}, self.cv1_pctsv
        )
        self.assertEqual(short_rej.status_code, 422)
        self.assertEqual(short_rej.json()["error"]["code"], "REASON_TOO_SHORT")

        # 1.9.3: reason_id không tồn tại -> 400 INVALID_REASON
        bad_reason = self.put_json(
            f"/api/staff/requests/{req_b_id}/reject", {"reason_id": 999, "note": ""}, self.cv1_pctsv
        )
        self.assertEqual(bad_reason.status_code, 400)
        self.assertEqual(bad_reason.json()["error"]["code"], "INVALID_REASON")

        # 1.9.1: Từ chối với reason_id = 6
        ok_rej = self.put_json(
            f"/api/staff/requests/{req_b_id}/reject",
            {"reason_id": 6, "note": "SV đã bị buộc thôi học."},
            self.cv1_pctsv,
        )
        self.assertEqual(ok_rej.status_code, 200)
        self.assertEqual(ok_rej.json()["data"]["status"], "Từ chối")

        # 1.12.5: Quá hạn bổ sung (process_deadlines)
        req_c_id = self.submit_request(user=self.sv_c).json()["data"]["request_id"]
        self.put_json(
            f"/api/staff/requests/{req_c_id}/assign", {"assigned_staff_id": self.cv1_pctsv.user_id}, self.tp_pctsv
        )
        self.put_json(
            f"/api/staff/requests/{req_c_id}/request-supplement",
            {"note": "Cần bổ sung minh chứng"},
            self.cv1_pctsv,
        )
        Request.objects.filter(pk=req_c_id).update(supplement_deadline=timezone.now() - timedelta(hours=1))
        call_command("process_deadlines", stdout=StringIO())
        self.assertEqual(Request.objects.get(pk=req_c_id).status, "Từ chối")
        self.assertTrue(StateAuditLog.objects.filter(request_id=req_c_id, action="supplement_expired").exists())

    # ==================== MODULE 2: Giấy giới thiệu thực tập ====================

    def test_module_2_internship_referral_workflow(self):
        friday = local_dt(2026, 10, 30, 10, 0, 0)
        with patch("django.utils.timezone.now", return_value=friday):
            res = self.submit_request(
                user=self.sv_a,
                type_id=2,
                form_data={
                    "company_name": "FPT Software",
                    "company_address": "Hà Nội",
                    "internship_from": "2027-01-15",
                    "internship_to": "2027-04-15",
                    "course_name": "Thực tập doanh nghiệp",
                },
                attachments=[(4, make_jpeg_file("cccd.jpg"))],
            )
        self.assertEqual(res.status_code, 201)
        req_id = res.json()["data"]["request_id"]
        req = Request.objects.get(pk=req_id)
        # SLA = 2 ngày làm việc (thứ Sáu 30/10 -> thứ Ba 03/11)
        self.assertEqual(res.json()["data"]["sla_deadline"], "2026-11-03T10:00:00")
        self.assertEqual(req.result_preference, "Bản cứng")

        self.put_json(
            f"/api/staff/requests/{req_id}/assign", {"assigned_staff_id": self.cv1_pctsv.user_id}, self.tp_pctsv
        )
        approve_res = self.put_json(
            f"/api/staff/requests/{req_id}/approve",
            {"note": "HP Thực tập doanh nghiệp hợp lệ."},
            self.cv1_pctsv,
        )
        self.assertEqual(approve_res.status_code, 200)
