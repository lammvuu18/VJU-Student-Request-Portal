from datetime import datetime, timedelta
from io import StringIO
import json
import shutil
import tempfile
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone

from accounts.jwt_utils import generate_jwt_token
from accounts.models import Notification, RejectionReason, Request, Result, StateAuditLog, User
from accounts.services import AcademicMSService


def local_dt(year, month, day, hour=10, minute=0, second=0):
    return timezone.make_aware(datetime(year, month, day, hour, minute, second))


def make_pdf_file(name="xac_nhan_khoa.pdf"):
    content = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n"
    return SimpleUploadedFile(name, content, content_type="application/pdf")


@override_settings(DEBUG=True)
class Module2InternshipReferralTests(TestCase):
    """
    Kiểm thử tự động toàn diện cho Module 2 — Giấy giới thiệu thực tập (1 cấp, bản cứng bắt buộc)
    theo đặc tả docs/expected-results-all-modules.md (Test 2.1 -> Test 2.4 + các ca biên).
    """

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._temp_media = tempfile.mkdtemp(prefix="vju_test_media_m2_")
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
        cls.sv_a = User.objects.get(email="minhanh@st.vju.ac.vn")             # 21CS001, active
        cls.sv_b = User.objects.get(email="quocanh@st.vju.ac.vn")             # 21CS002, active
        cls.sv_graduated = User.objects.get(email="graduated@st.vju.ac.vn")   # 20CS001, graduated
        cls.sv_suspended = User.objects.get(email="suspended@st.vju.ac.vn")   # 21CS004, suspended
        cls.tp_pctsv = User.objects.get(email="tp.ctsv@vju.ac.vn")
        cls.cv1_pctsv = User.objects.get(email="hoangnam@vju.ac.vn")

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

    def submit_internship_request(self, user=None, form_data=None, attachments=None):
        user = user or self.sv_a
        if form_data is None:
            form_data = {
                "company_name": "FPT Software",
                "company_address": "Hà Nội",
                "internship_from": "2027-01-15",
                "internship_to": "2027-04-15",
                "course_name": "Thực tập doanh nghiệp",
            }
        payload = {
            "type_id": "2",
            "form_data": json.dumps(form_data, ensure_ascii=False),
        }
        for idx, (cid, fobj) in enumerate(attachments or []):
            payload[f"attachments[{idx}][config_id]"] = str(cid)
            payload[f"attachments[{idx}][file]"] = fobj
        return self.client.post("/api/requests", data=payload, **self.auth(user))

    # ==================== Test 2.1: Gửi đơn GT thực tập ====================

    def test_2_1_submit_internship_referral(self):
        """
        Test 2.1 — Gửi đơn GT thực tập:
        1. Status = 201, internal_status = "Chờ phân công"
        2. SLA = 2 ngày làm việc (theo ProcedureType.sla_total_days cho type_id = 2)
        3. result_preference tự động = "Bản cứng" dù request không gửi
        """
        friday = local_dt(2026, 10, 30, 10, 0, 0)
        with patch("django.utils.timezone.now", return_value=friday):
            res = self.submit_internship_request(user=self.sv_a)

        self.assertEqual(res.status_code, 201)
        body = res.json()["data"]
        self.assertEqual(body["status"], "Đã gửi")
        self.assertEqual(body["internal_status"], "Chờ phân công")
        # Thứ Sáu 30/10 + 2 ngày làm việc (bỏ T7 31/10, CN 01/11) -> Thứ Ba 03/11 lúc 10:00
        self.assertEqual(body["sla_deadline"], "2026-11-03T10:00:00")

        req = Request.objects.get(pk=body["request_id"])
        self.assertEqual(req.result_preference, "Bản cứng")
        self.assertEqual(req.form_data.get("result_preference"), "Bản cứng")

    # ==================== Test 2.2: CV duyệt — kiểm tra HP trong CTĐT qua Academic MS ====================

    def test_2_2_cv_approve_checks_curriculum_via_academic_ms(self):
        """
        Test 2.2 — CV duyệt: kiểm tra HP trong CTĐT qua Academic MS:
        1. Mock Academic MS được gọi: getStudentCurriculum("21CS001")
        2. HP "Thực tập doanh nghiệp" (course_id = "CS301") tìm thấy trong danh sách -> duyệt bình thường
        3. Quy trình nhận bản cứng (assign-pickup -> confirm-handover -> Đã xử lý)
        """
        res = self.submit_internship_request(user=self.sv_a)
        req_id = res.json()["data"]["request_id"]

        # TP phân công CV1 PCTSV
        assign_res = self.put_json(
            f"/api/staff/requests/{req_id}/assign",
            {"assigned_staff_id": self.cv1_pctsv.user_id},
            self.tp_pctsv,
        )
        self.assertEqual(assign_res.status_code, 200)

        # Kiểm tra API chi tiết đơn trả về kết quả đối chiếu Academic MS
        detail_res = self.client.get(f"/api/requests/{req_id}", **self.auth(self.cv1_pctsv))
        self.assertEqual(detail_res.status_code, 200)
        ac_check = detail_res.json()["data"]["academic_check"]
        self.assertEqual(ac_check["student_status"], "active")
        self.assertTrue(ac_check["is_status_eligible"])
        self.assertTrue(ac_check["course_in_curriculum"])
        self.assertEqual(ac_check["matched_course"]["course_id"], "CS301")

        # CV1 duyệt: spy getStudentCurriculum("21CS001")
        with patch.object(
            AcademicMSService,
            "getStudentCurriculum",
            wraps=AcademicMSService.getStudentCurriculum,
        ) as mock_curriculum:
            approve_res = self.put_json(
                f"/api/staff/requests/{req_id}/approve",
                {"note": "HP Thực tập doanh nghiệp (CS301) hợp lệ trong CTĐT."},
                self.cv1_pctsv,
            )
            self.assertEqual(approve_res.status_code, 200)
            mock_curriculum.assert_called_with("21CS001")

        curriculum = AcademicMSService.getStudentCurriculum("21CS001")
        self.assertEqual(len(curriculum), 5)
        self.assertIn({"course_id": "CS301", "course_name": "Thực tập doanh nghiệp"}, curriculum)

        req = Request.objects.get(pk=req_id)
        self.assertEqual(req.status, "Đã duyệt")
        self.assertEqual(req.internal_status, "Đã duyệt — Đang chuẩn bị kết quả")
        self.assertTrue(Result.objects.filter(request_id=req_id).exists())

        # Vì là Bản cứng nên khi SV tải PDF xem trước vẫn chưa chuyển sang "Đã xử lý"
        result_id = approve_res.json()["data"]["result"]["result_id"]
        dl_res = self.client.get(f"/api/results/{result_id}/download", **self.auth(self.sv_a))
        self.assertEqual(dl_res.status_code, 200)
        self.assertEqual(Request.objects.get(pk=req_id).status, "Đã duyệt")

        # Hẹn lịch nhận bản cứng & xác nhận bàn giao -> "Đã xử lý"
        pickup_res = self.put_json(
            f"/api/staff/requests/{req_id}/assign-pickup",
            {
                "pickup_date": "2026-11-04T09:00:00",
                "pickup_location": "Phòng PCTSV, Tầng 2, Tòa A",
                "pickup_note": "Mang theo thẻ SV để nhận Giấy giới thiệu có dấu đỏ gốc.",
            },
            self.cv1_pctsv,
        )
        self.assertEqual(pickup_res.status_code, 200)

        handover_res = self.put_json(f"/api/staff/requests/{req_id}/confirm-handover", {}, self.cv1_pctsv)
        self.assertEqual(handover_res.status_code, 200)
        self.assertEqual(Request.objects.get(pk=req_id).status, "Đã xử lý")

    # ==================== Test 2.3: HP không tồn tại trong CTĐT -> yêu cầu bổ sung ====================

    def test_2_3_course_not_in_curriculum_request_supplement(self):
        """
        Test 2.3 — HP không tồn tại trong CTĐT -> yêu cầu bổ sung:
        - SV nhập course_name = "Thực tập ngoại ngữ" (không có trong mock)
        - getStudentCurriculum("21CS001") không chứa "Thực tập ngoại ngữ"
        - CV bấm "Yêu cầu bổ sung" với note: "HP không trong CTĐT, vui lòng bổ sung xác nhận từ Khoa."
        1. internal_status -> "Cần bổ sung"
        2. SLA tạm dừng, supplement_deadline = 5 ngày
        """
        res = self.submit_internship_request(
            user=self.sv_a,
            form_data={
                "company_name": "FPT Software",
                "company_address": "Hà Nội",
                "internship_from": "2027-01-15",
                "internship_to": "2027-04-15",
                "course_name": "Thực tập ngoại ngữ",
            },
        )
        self.assertEqual(res.status_code, 201)
        req_id = res.json()["data"]["request_id"]

        self.put_json(
            f"/api/staff/requests/{req_id}/assign",
            {"assigned_staff_id": self.cv1_pctsv.user_id},
            self.tp_pctsv,
        )

        # Kiểm tra academic_check báo course_in_curriculum = False
        detail_res = self.client.get(f"/api/requests/{req_id}", **self.auth(self.cv1_pctsv))
        self.assertFalse(detail_res.json()["data"]["academic_check"]["course_in_curriculum"])

        # Nếu CV cố bấm duyệt ngay khi chưa có xác nhận bổ sung -> 422 STUDENT_NOT_ELIGIBLE
        direct_approve = self.put_json(
            f"/api/staff/requests/{req_id}/approve",
            {"note": "Thử duyệt HP ngoài CTĐT"},
            self.cv1_pctsv,
        )
        self.assertEqual(direct_approve.status_code, 422)
        self.assertEqual(direct_approve.json()["error"]["code"], "STUDENT_NOT_ELIGIBLE")

        # CV bấm "Yêu cầu bổ sung"
        now_time = local_dt(2026, 10, 30, 14, 0, 0)
        note_text = "HP không trong CTĐT, vui lòng bổ sung xác nhận từ Khoa."
        with patch("django.utils.timezone.now", return_value=now_time):
            supp_res = self.put_json(
                f"/api/staff/requests/{req_id}/request-supplement",
                {"note": note_text},
                self.cv1_pctsv,
            )

        self.assertEqual(supp_res.status_code, 200)
        supp_data = supp_res.json()["data"]
        self.assertEqual(supp_data["internal_status"], "Cần bổ sung")
        self.assertEqual(supp_data["supplement_count"], 1)
        self.assertEqual(supp_data["sla_paused_at"], "2026-10-30T14:00:00")
        self.assertEqual(supp_data["supplement_deadline"], "2026-11-04T14:00:00")

        req = Request.objects.get(pk=req_id)
        self.assertEqual(req.status, "Cần bổ sung")
        self.assertEqual(req.internal_status, "Cần bổ sung")
        self.assertIsNotNone(req.sla_paused_at)
        self.assertEqual(req.supplement_deadline, now_time + timedelta(days=5))
        self.assertTrue(
            Notification.objects.filter(user=self.sv_a, request=req, message__icontains=note_text).exists()
        )

        # Sau khi SV nộp bổ sung giấy xác nhận từ Khoa, CV có thể duyệt bình thường
        sub_supp = self.client.post(
            f"/api/requests/{req_id}/supplements",
            data={
                "attachments[0][config_id]": "3",
                "attachments[0][file]": make_pdf_file("xac_nhan_khoa.pdf"),
            },
            **self.auth(self.sv_a),
        )
        self.assertEqual(sub_supp.status_code, 200)
        approve_after_supp = self.put_json(
            f"/api/staff/requests/{req_id}/approve",
            {"note": "Đã có xác nhận từ Khoa cho học phần thực tập."},
            self.cv1_pctsv,
        )
        self.assertEqual(approve_after_supp.status_code, 200)

    # ==================== Test 2.4: SV suspended -> CV từ chối ====================

    def test_2_4_suspended_student_submit_and_cv_reject(self):
        """
        Test 2.4 — SV suspended -> CV từ chối:
        - Mock Academic MS: getStudentStatus("21CS004") -> { status: "suspended" }
        - SV user_id = 5 (Trần Bảo Lưu, suspended) gửi đơn GT thực tập -> 201
        - CV từ chối với lý do "Sinh viên không đang theo học" (reason_id = 7)
        """
        self.assertEqual(AcademicMSService.getStudentStatus("21CS004"), {"status": "suspended"})

        # 1. Gửi đơn trả 201
        res = self.submit_internship_request(user=self.sv_suspended)
        self.assertEqual(res.status_code, 201)
        req_id = res.json()["data"]["request_id"]

        self.put_json(
            f"/api/staff/requests/{req_id}/assign",
            {"assigned_staff_id": self.cv1_pctsv.user_id},
            self.tp_pctsv,
        )

        # Nếu CV bấm approve thì Academic MS chặn vì status = suspended (422 STUDENT_NOT_ELIGIBLE)
        approve_attempt = self.put_json(
            f"/api/staff/requests/{req_id}/approve",
            {"note": "Thử duyệt SV bảo lưu"},
            self.cv1_pctsv,
        )
        self.assertEqual(approve_attempt.status_code, 422)
        self.assertEqual(approve_attempt.json()["error"]["code"], "STUDENT_NOT_ELIGIBLE")

        # 2. CV từ chối với lý do "Sinh viên không đang theo học" (reason_id = 7)
        reason_7 = RejectionReason.objects.get(pk=7)
        self.assertEqual(reason_7.reason_text, "Sinh viên không đang theo học")

        reject_res = self.put_json(
            f"/api/staff/requests/{req_id}/reject",
            {"reason_id": 7, "note": ""},
            self.cv1_pctsv,
        )
        self.assertEqual(reject_res.status_code, 200)
        self.assertEqual(reject_res.json()["data"]["status"], "Từ chối")
        self.assertEqual(reject_res.json()["data"]["internal_status"], "Từ chối")

        audit = StateAuditLog.objects.filter(request_id=req_id, action="reject").latest("log_id")
        self.assertEqual(audit.note, "Sinh viên không đang theo học")

    # ==================== Các ca biên bổ sung ====================

    def test_2_5_edge_cases_date_order_and_graduated_student(self):
        # Ngày kết thúc thực tập trước ngày bắt đầu -> 400 INVALID_FORM_DATA
        bad_date_res = self.submit_internship_request(
            user=self.sv_b,
            form_data={
                "company_name": "FPT Software",
                "company_address": "Hà Nội",
                "internship_from": "2027-05-01",
                "internship_to": "2027-01-15",
                "course_name": "Thực tập doanh nghiệp",
            },
        )
        self.assertEqual(bad_date_res.status_code, 400)
        self.assertEqual(bad_date_res.json()["error"]["code"], "INVALID_FORM_DATA")

        # SV đã tốt nghiệp gửi đơn GT thực tập -> 201 nhưng không đủ điều kiện duyệt (chỉ cho phép active)
        grad_res = self.submit_internship_request(user=self.sv_graduated)
        self.assertEqual(grad_res.status_code, 201)
        grad_req_id = grad_res.json()["data"]["request_id"]
        self.put_json(
            f"/api/staff/requests/{grad_req_id}/assign",
            {"assigned_staff_id": self.cv1_pctsv.user_id},
            self.tp_pctsv,
        )
        grad_approve = self.put_json(
            f"/api/staff/requests/{grad_req_id}/approve",
            {"note": "Thử duyệt SV đã tốt nghiệp"},
            self.cv1_pctsv,
        )
        self.assertEqual(grad_approve.status_code, 422)
        self.assertEqual(grad_approve.json()["error"]["code"], "STUDENT_NOT_ELIGIBLE")
