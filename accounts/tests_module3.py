import json
import shutil
import tempfile
from io import StringIO
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import Client, TestCase, override_settings

from .jwt_utils import generate_jwt_token
from .models import (
    Notification,
    Payment,
    ProcedureType,
    Request,
    StateAuditLog,
    User,
)
from .payment_service import process_payment_success
from .services import AcademicMSService


@override_settings(DEBUG=True)
class Module3AppealWorkflowTests(TestCase):
    """
    Kiểm thử toàn diện luồng nộp và xử lý đơn Phúc khảo điểm thi (Module 3 — PĐT 2 cấp):
    SV nộp đơn -> Thanh toán -> TP thấy đơn & phân công -> CV thẩm định ở màn D4 (nhập điểm GV1, GV2,
    điểm cuối, biên bản phúc khảo, ý kiến) & trình TP -> TP xem thông tin thẩm định & phê duyệt trực tiếp
    (không qua Hiệu trưởng ký số).
    """

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._temp_media = tempfile.mkdtemp(prefix="vju_test_media_m3_")
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
        with patch.dict(
            "os.environ",
            {
                "SEED_DEMO": "True",
                "DEMO_PASSWORD": "demo-password-123",
                "DEMO_STUDENT_EMAILS": "guenkokuain020411@gmail.com",
            },
        ):
            call_command("seed_demo", stdout=StringIO())

    def setUp(self):
        self.client = Client()
        self.student = User.objects.get(email="minhanh@st.vju.ac.vn")
        self.head_pdt = User.objects.get(email="thuha@vju.ac.vn")
        self.staff_pdt = User.objects.get(email="tranthi.b@vju.ac.vn")

        self.demo_student = User.objects.get(email="guenkokuain020411@gmail.com")
        self.demo_head = User.objects.get(email="demo.truongphong@vju.ac.vn")
        self.demo_staff = User.objects.get(email="demo.chuyenvien@vju.ac.vn")

        self.proc_appeal = ProcedureType.objects.get(type_id=3)

    def _auth(self, user):
        token = generate_jwt_token(user.to_dict())
        return {"HTTP_AUTHORIZATION": f"Bearer {token}"}

    def _create_paid_appeal_request(self, student=None):
        student = student or self.student
        res = self.client.post(
            "/api/requests",
            data=json.dumps({
                "type_id": 3,
                "form_data": {
                    "subject": "Cấu trúc dữ liệu",
                    "semester": "HK1 2026-2027",
                },
            }),
            content_type="application/json",
            **self._auth(student),
        )
        self.assertEqual(res.status_code, 201, res.content)
        req_id = res.json()["data"]["request_id"]
        req = Request.objects.get(request_id=req_id)
        self.assertEqual(req.internal_status, "Chờ thanh toán")
        self.assertEqual(float(req.form_data.get("current_grade")), 6.0)

        payment = Payment.objects.create(
            request=req,
            txn_id=f"TXN-{req_id}",
            amount=50000,
            payment_method="VietQR",
            status="pending",
        )
        process_payment_success(payment)
        req.refresh_from_db()
        self.assertEqual(req.status, "Đã gửi")
        self.assertEqual(req.internal_status, "Chờ phân công")
        return req

    def test_3_5_1_and_3_6_1_full_appeal_workflow_json_and_multipart(self):
        """
        Luồng đầy đủ:
        1. SV nộp đơn & thanh toán -> đơn trong danh sách Trưởng phòng (Chờ phân công)
        2. TP phân công -> đơn trong danh sách Chuyên viên (CV đang thẩm định)
        3. CV thẩm định ở màn D4 (nhập điểm GV1=7.5, GV2=7.0, điểm cuối=7.25, file biên bản, ý kiến) -> trình TP
        4. TP xem chi tiết đơn -> thấy toàn bộ thông tin thẩm định của CV
        5. TP ấn Phê duyệt (approve-head, không trình Hiệu trưởng) -> cập nhật điểm AcademicMS, đơn Đã xử lý
        """
        req = self._create_paid_appeal_request(self.demo_student)

        # 1. Trưởng phòng thấy đơn trong danh sách yêu cầu
        inbox_head = self.client.get("/api/staff/inbox", **self._auth(self.demo_head))
        self.assertEqual(inbox_head.status_code, 200)
        head_ids = [item["request_id"] for item in inbox_head.json()["data"]]
        self.assertIn(req.request_id, head_ids)

        # 2. Trưởng phòng phân công cho Chuyên viên
        assign_res = self.client.put(
            f"/api/staff/requests/{req.request_id}/assign",
            data=json.dumps({"assigned_staff_id": self.demo_staff.user_id}),
            content_type="application/json",
            **self._auth(self.demo_head),
        )
        self.assertEqual(assign_res.status_code, 200)
        self.assertEqual(assign_res.json()["data"]["internal_status"], "CV đang thẩm định")

        # Đơn hiển thị trong danh sách yêu cầu của Chuyên viên
        inbox_staff = self.client.get("/api/staff/inbox", **self._auth(self.demo_staff))
        self.assertEqual(inbox_staff.status_code, 200)
        staff_ids = [item["request_id"] for item in inbox_staff.json()["data"]]
        self.assertIn(req.request_id, staff_ids)

        # 3. Chuyên viên nhập điểm tại màn D4 kèm file Biên bản phúc khảo và trình Trưởng phòng
        review_pdf = SimpleUploadedFile(
            "bien_ban_phuc_khao.pdf",
            b"%PDF-1.4 mock review report",
            content_type="application/pdf",
        )
        submit_res = self.client.post(
            f"/api/staff/requests/{req.request_id}/submit-to-head",
            data={
                "review_data": json.dumps({
                    "grade_reviewer_1": 7.5,
                    "grade_reviewer_2": 7.0,
                    "final_grade": 7.25,
                    "note": "Đã nhận kết quả chấm lại từ Khoa. Điểm tăng từ 6.0 lên 7.25.",
                }),
                "note": "Đã nhận kết quả chấm lại từ Khoa. Điểm tăng từ 6.0 lên 7.25.",
                "review_file": review_pdf,
            },
            **self._auth(self.demo_staff),
        )
        self.assertEqual(submit_res.status_code, 200, submit_res.content)
        submit_data = submit_res.json()["data"]
        self.assertEqual(submit_data["internal_status"], "Chờ TP phê duyệt")
        self.assertEqual(submit_data["review_data"]["grade_reviewer_1"], 7.5)
        self.assertEqual(submit_data["review_data"]["grade_reviewer_2"], 7.0)
        self.assertEqual(submit_data["review_data"]["final_grade"], 7.25)
        self.assertEqual(submit_data["review_data"]["file_name"], "bien_ban_phuc_khao.pdf")

        # 4. Trưởng phòng xem chi tiết đơn -> thấy đầy đủ thông tin Chuyên viên vừa nộp
        detail_res = self.client.get(
            f"/api/requests/{req.request_id}",
            **self._auth(self.demo_head),
        )
        self.assertEqual(detail_res.status_code, 200)
        detail_data = detail_res.json()["data"]
        self.assertEqual(detail_data["internal_status"], "Chờ TP phê duyệt")
        review_info = detail_data["form_data"]["review_data"]
        self.assertEqual(review_info["grade_reviewer_1"], 7.5)
        self.assertEqual(review_info["grade_reviewer_2"], 7.0)
        self.assertEqual(review_info["final_grade"], 7.25)
        self.assertEqual(review_info["file_name"], "bien_ban_phuc_khao.pdf")
        self.assertIn("Điểm tăng từ 6.0 lên 7.25", review_info["note"])
        self.assertTrue(review_info["download_url"].startswith("/api/attachments/"))

        # Không được trình Hiệu trưởng ký số đối với đơn phúc khảo điểm (2 cấp)
        principal_res = self.client.put(
            f"/api/staff/requests/{req.request_id}/submit-to-principal",
            data=json.dumps({"note": "Thử trình HT"}),
            content_type="application/json",
            **self._auth(self.demo_head),
        )
        self.assertEqual(principal_res.status_code, 422)

        # 5. Trưởng phòng phê duyệt trực tiếp (approve-head)
        with patch.object(AcademicMSService, "updateGrade", wraps=AcademicMSService.updateGrade) as mock_update:
            approve_res = self.client.put(
                f"/api/staff/requests/{req.request_id}/approve-head",
                data=json.dumps({"note": "Duyệt kết quả phúc khảo. Điểm cập nhật từ 6.0 → 7.25."}),
                content_type="application/json",
                **self._auth(self.demo_head),
            )
            self.assertEqual(approve_res.status_code, 200, approve_res.content)
            mock_update.assert_called_once()

        req.refresh_from_db()
        self.assertEqual(req.status, "Đã xử lý")
        self.assertEqual(req.internal_status, "Đã xử lý")
        self.assertEqual(req.form_data["final_grade"], 7.25)

        # Kiểm tra StateAuditLog và Notification cho sinh viên
        self.assertTrue(
            StateAuditLog.objects.filter(request=req, action="approve_head", status_after="Đã xử lý").exists()
        )
        notif = Notification.objects.filter(user=self.demo_student, request=req, title="Kết quả phúc khảo điểm thi").first()
        self.assertIsNotNone(notif)
        self.assertIn("Điểm cũ 6.0 → Mới 7.25", notif.message)

    def test_3_6_2_and_3_7_1_return_to_staff_and_lower_grade_approval(self):
        """
        Kiểm thử:
        - Test 3.7.1: TP trả lại đơn cho CV thẩm định lại (return-to-staff)
        - Test 3.6.2: TP duyệt kết quả phúc khảo khi điểm giảm (6.0 -> 4.5)
        """
        req = self._create_paid_appeal_request(self.student)

        # Phân công cho CV PĐT
        self.client.put(
            f"/api/staff/requests/{req.request_id}/assign",
            data=json.dumps({"assigned_staff_id": self.staff_pdt.user_id}),
            content_type="application/json",
            **self._auth(self.head_pdt),
        )

        # CV trình lần 1 (JSON payload theo đúng cấu trúc API 3.5)
        res_submit1 = self.client.put(
            f"/api/staff/requests/{req.request_id}/submit-to-head",
            data=json.dumps({
                "review_data": {
                    "grade_reviewer_1": 5.0,
                    "grade_reviewer_2": 4.0,
                    "final_grade": 4.5,
                },
                "note": "Trình kết quả lần 1.",
            }),
            content_type="application/json",
            **self._auth(self.staff_pdt),
        )
        self.assertEqual(res_submit1.status_code, 200)

        # TP trả lại cho CV kiểm tra lại (API 3.7)
        res_return = self.client.put(
            f"/api/staff/requests/{req.request_id}/return-to-staff",
            data=json.dumps({"note": "Đề nghị kiểm tra lại biên bản chấm của GV2, thiếu chữ ký."}),
            content_type="application/json",
            **self._auth(self.head_pdt),
        )
        self.assertEqual(res_return.status_code, 200)
        self.assertEqual(res_return.json()["data"]["internal_status"], "CV đang thẩm định")

        # CV trình lại lần 2
        res_submit2 = self.client.put(
            f"/api/staff/requests/{req.request_id}/submit-to-head",
            data=json.dumps({
                "review_data": {
                    "grade_reviewer_1": 5.0,
                    "grade_reviewer_2": 4.0,
                    "final_grade": 4.5,
                },
                "note": "Đã bổ sung biên bản có đủ chữ ký của GV2.",
            }),
            content_type="application/json",
            **self._auth(self.staff_pdt),
        )
        self.assertEqual(res_submit2.status_code, 200)

        # TP phê duyệt (điểm giảm 6.0 -> 4.5)
        res_approve = self.client.put(
            f"/api/staff/requests/{req.request_id}/approve-head",
            data=json.dumps({"note": "Duyệt kết quả phúc khảo. Điểm cập nhật từ 6.0 → 4.5 theo quy chế."}),
            content_type="application/json",
            **self._auth(self.head_pdt),
        )
        self.assertEqual(res_approve.status_code, 200)
        self.assertEqual(res_approve.json()["data"]["final_grade"], 4.5)

        notif = Notification.objects.filter(user=self.student, request=req, title="Kết quả phúc khảo điểm thi").first()
        self.assertIsNotNone(notif)
        self.assertIn("Điểm cũ 6.0 → Mới 4.5", notif.message)
        self.assertIn("quy chế", notif.message.lower())
