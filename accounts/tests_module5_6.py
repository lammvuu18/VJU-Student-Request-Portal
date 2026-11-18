"""
Module 5: Miễn giảm học phí (PCTSV xác minh → chuyển PKHTC thẩm định → TP KHTC trình → HT ký)
Module 6: Hoàn trả học phí (PKHTC thẩm định → TP KHTC trình → HT ký → Finance MS → Internet Banking → webhook)
"""
from io import StringIO
import json
import shutil
import tempfile
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import TestCase, override_settings

from accounts.jwt_utils import generate_jwt_token
from accounts.models import (
    AttachmentConfig, Notification, ProcedureType, RefundPayout, Request, StateAuditLog, StudentRegistry, User,
)
from accounts.services import InternetBankingService

STUDENT_EMAIL = "sv.hocphi@gmail.com"
SECRET = "test-bank-secret"


def pdf(name):
    return SimpleUploadedFile(name, b"%PDF-1.4\n%%EOF\n", content_type="application/pdf")


@override_settings(DEBUG=True, BANKING_WEBHOOK_SECRET=SECRET, BANKING_SANDBOX_ENABLED=True)
class TuitionWorkflowTestCase(TestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls._temp_media = tempfile.mkdtemp(prefix="vju_test_media_m56_")
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
        with patch.dict("os.environ", {
            "SEED_DEMO": "True",
            "DEMO_PASSWORD": "demo-password-123",
            "DEMO_STUDENT_EMAILS": STUDENT_EMAIL,
        }):
            call_command("seed_demo", stdout=StringIO())
        # Hồ sơ mẫu tạo trong ngày sẽ chạm giới hạn 5 đơn/ngày, test chỉ dùng hồ sơ tự nộp
        Request.objects.filter(request_code__startswith="DEMO-").delete()

        users = {u.email: u for u in User.objects.filter(email__startswith="demo.")}
        cls.tp_ctsv = users["demo.truongphong.ctsv@vju.ac.vn"]
        cls.cv_ctsv = users["demo.chuyenvien.ctsv@vju.ac.vn"]
        cls.tp_khtc = users["demo.truongphong.khtc@vju.ac.vn"]
        cls.cv_khtc = users["demo.chuyenvien.khtc@vju.ac.vn"]
        cls.tp_pdt = users["demo.truongphong@vju.ac.vn"]
        cls.cv_pdt = users["demo.chuyenvien@vju.ac.vn"]
        cls.principal = users["demo.hieutruong@vju.ac.vn"]
        cls.student = User.objects.get(email=STUDENT_EMAIL)
        cls.exemption = ProcedureType.objects.get(name="Miễn giảm học phí")
        cls.refund = ProcedureType.objects.get(name="Hoàn trả học phí")

    # ---------- helpers ----------
    def auth(self, user):
        token = generate_jwt_token({"user_id": user.user_id, "role": user.role})
        return {"HTTP_AUTHORIZATION": f"Bearer {token}"}

    def put(self, url, body, user):
        return self.client.put(url, data=json.dumps(body), content_type="application/json", **self.auth(user))

    def post(self, url, body, user):
        return self.client.post(url, data=json.dumps(body), content_type="application/json", **self.auth(user))

    def inbox(self, user):
        res = self.client.get("/api/staff/inbox?scope=all&limit=100", **self.auth(user))
        self.assertEqual(res.status_code, 200, res.content)
        return {item["request_id"]: item for item in res.json()["data"]}

    def detail(self, req_id, user):
        return self.client.get(f"/api/requests/{req_id}", **self.auth(user))

    def submit_exemption(self):
        data = {
            "type_id": str(self.exemption.type_id),
            "form_data": json.dumps({
                "beneficiary_type": "Sinh viên thuộc hộ nghèo",
                "exemption_semester": "HK1 2026-2027",
                "discount_level": "Miễn 100% học phí",
            }, ensure_ascii=False),
        }
        required = AttachmentConfig.objects.filter(procedure_type=self.exemption, is_required=True)
        for idx, config in enumerate(required):
            data[f"attachments[{idx}][config_id]"] = str(config.config_id)
            data[f"attachments[{idx}][file]"] = pdf(f"minh_chung_{idx}.pdf")
        res = self.client.post("/api/requests", data=data, **self.auth(self.student))
        self.assertEqual(res.status_code, 201, res.content)
        return res.json()["data"]["request_id"]

    def refund_form(self, **overrides):
        form = {
            "refund_semester": "HK1 2026-2027",
            "refund_reason": "Đóng thừa học phí",
            "amount": 3500000,
            "bank_name": "Vietcombank",
            "bank_account_no": "0011004123456",
            "account_holder": "SINH VIEN DEMO",
        }
        form.update(overrides)
        return form

    def submit_refund(self, **overrides):
        res = self.post("/api/requests", {"type_id": self.refund.type_id, "form_data": self.refund_form(**overrides)}, self.student)
        return res

    def bring_refund_to_principal(self):
        res = self.submit_refund()
        self.assertEqual(res.status_code, 201, res.content)
        req_id = res.json()["data"]["request_id"]
        self.assertEqual(self.put(f"/api/staff/requests/{req_id}/assign", {"assigned_staff_id": self.cv_khtc.user_id}, self.tp_khtc).status_code, 200)
        self.assertEqual(self.put(f"/api/staff/requests/{req_id}/submit-to-head", {"note": "Đối chiếu Finance MS khớp"}, self.cv_khtc).status_code, 200)
        self.assertEqual(self.put(f"/api/staff/requests/{req_id}/submit-to-principal", {}, self.tp_khtc).status_code, 200)
        return req_id

    def bank_webhook(self, payload, signature=None):
        raw = json.dumps(payload).encode("utf-8")
        sig = signature if signature is not None else InternetBankingService.sign_payload(raw)
        return self.client.post("/api/webhooks/banking", data=raw, content_type="application/json", HTTP_X_BANK_SIGNATURE=sig)

    # ---------- Miễn giảm học phí ----------
    def test_exemption_full_workflow_with_department_visibility(self):
        req_id = self.submit_exemption()
        req = Request.objects.get(request_id=req_id)
        self.assertEqual(req.internal_status, "Chờ phân công")
        # Chỉ TP CTSV được báo đơn mới
        self.assertTrue(Notification.objects.filter(user=self.tp_ctsv, request=req).exists())
        self.assertFalse(Notification.objects.filter(user__in=[self.tp_khtc, self.tp_pdt], request=req).exists())

        # Ban đầu chỉ PCTSV thấy đơn
        self.assertIn(req_id, self.inbox(self.tp_ctsv))
        self.assertNotIn(req_id, self.inbox(self.tp_khtc))
        self.assertNotIn(req_id, self.inbox(self.tp_pdt))
        self.assertEqual(self.detail(req_id, self.tp_pdt).status_code, 403)
        self.assertEqual(self.detail(req_id, self.tp_khtc).status_code, 403)

        # TP CTSV phân công CV CTSV; CV chưa chuyển thì không được trình TP
        self.assertEqual(self.put(f"/api/staff/requests/{req_id}/assign", {"assigned_staff_id": self.cv_ctsv.user_id}, self.tp_ctsv).status_code, 200)
        res = self.put(f"/api/staff/requests/{req_id}/submit-to-head", {}, self.cv_ctsv)
        self.assertEqual(res.status_code, 422)
        self.assertEqual(res.json()["error"]["code"], "TRANSFER_REQUIRED")
        detail = self.detail(req_id, self.cv_ctsv).json()["data"]
        self.assertEqual(detail["transfer_target"]["name"], "Phòng Kế hoạch Tài chính")
        self.assertTrue(detail["viewer_can_act"])

        # Ghi chú chuyển là bắt buộc
        self.assertEqual(self.put(f"/api/staff/requests/{req_id}/transfer", {"note": "  "}, self.cv_ctsv).status_code, 400)
        res = self.put(f"/api/staff/requests/{req_id}/transfer", {"note": "Đã đối chiếu sổ hộ nghèo, đúng đối tượng."}, self.cv_ctsv)
        self.assertEqual(res.status_code, 200, res.content)
        req.refresh_from_db()
        self.assertEqual(req.internal_status, "Đã chuyển PKHTC — chờ phân công")
        self.assertIsNone(req.assigned_staff_id)
        self.assertTrue(Notification.objects.filter(user=self.tp_khtc, request=req).exists())

        # Sau khi chuyển: KHTC xử lý, CTSV vẫn thấy nhưng chỉ xem, PĐT không thấy
        khtc_item = self.inbox(self.tp_khtc)[req_id]
        self.assertFalse(khtc_item["is_read_only"])
        ctsv_item = self.inbox(self.tp_ctsv)[req_id]
        self.assertTrue(ctsv_item["is_read_only"])
        self.assertEqual(ctsv_item["transferred_to_dept_name"], "Phòng Kế hoạch Tài chính")
        self.assertTrue(self.inbox(self.cv_ctsv)[req_id]["is_read_only"])
        self.assertNotIn(req_id, self.inbox(self.tp_pdt))
        self.assertNotIn(req_id, self.inbox(self.cv_pdt))
        self.assertFalse(self.detail(req_id, self.tp_ctsv).json()["data"]["viewer_can_act"])
        self.assertEqual(
            self.put(f"/api/staff/requests/{req_id}/assign", {"assigned_staff_id": self.cv_ctsv.user_id}, self.tp_ctsv).status_code, 403,
        )
        # TP KHTC không giao được cho CV phòng khác
        self.assertEqual(
            self.put(f"/api/staff/requests/{req_id}/assign", {"assigned_staff_id": self.cv_ctsv.user_id}, self.tp_khtc).status_code, 422,
        )

        # KHTC thẩm định → TP KHTC trình HT
        self.assertEqual(self.put(f"/api/staff/requests/{req_id}/assign", {"assigned_staff_id": self.cv_khtc.user_id}, self.tp_khtc).status_code, 200)
        self.assertEqual(self.put(f"/api/staff/requests/{req_id}/submit-to-head", {"note": "Đủ điều kiện miễn 100%"}, self.cv_khtc).status_code, 200)
        self.assertEqual(self.put(f"/api/staff/requests/{req_id}/submit-to-principal", {}, self.tp_khtc).status_code, 200)
        req.refresh_from_db()
        self.assertEqual(req.internal_status, "Chờ HT ký số")

        # Bản thảo quyết định chưa ký: sinh viên không xem được
        student_detail = self.detail(req_id, self.student).json()["data"]
        self.assertIsNone(student_detail["result"])
        self.assertEqual(student_detail["department_name"], "Phòng Kế hoạch Tài chính")
        result_id = req.result.result_id
        self.assertEqual(self.client.get(f"/api/results/{result_id}/download", **self.auth(self.student)).status_code, 404)

        # Hiệu trưởng thấy phòng trình là KHTC, thông tin trình ký lấy từ nhật ký
        pending = self.client.get("/api/principal/pending-signatures", **self.auth(self.principal)).json()["data"]
        item = next(p for p in pending if p["request_id"] == req_id)
        self.assertEqual(item["department_name"], "Phòng Kế hoạch Tài chính")
        principal_detail = self.client.get(f"/api/principal/requests/{req_id}", **self.auth(self.principal)).json()["data"]
        self.assertEqual(principal_detail["submission"]["reviewed_by"], self.cv_khtc.full_name)
        self.assertEqual(principal_detail["submission"]["submitted_by"], self.tp_khtc.full_name)

        res = self.post(f"/api/principal/requests/{req_id}/sign", {}, self.principal)
        self.assertEqual(res.status_code, 200, res.content)
        self.assertIsNone(res.json()["data"]["academic_status"])
        req.refresh_from_db()
        self.assertEqual((req.status, req.internal_status), ("Đã xử lý", "Đã xử lý"))
        # Ký miễn giảm không được đổi trạng thái học vụ (chỉ bảo lưu mới chuyển suspended)
        self.assertEqual(StudentRegistry.objects.get(email=STUDENT_EMAIL).academic_status, "active")
        self.assertIsNotNone(self.detail(req_id, self.student).json()["data"]["result"])
        self.assertEqual(self.client.get(f"/api/results/{result_id}/download", **self.auth(self.student)).status_code, 200)

    def test_exemption_transfer_only_by_assigned_ctsv_staff(self):
        req_id = self.submit_exemption()
        self.put(f"/api/staff/requests/{req_id}/assign", {"assigned_staff_id": self.cv_ctsv.user_id}, self.tp_ctsv)
        note = {"note": "Đã xác minh"}
        url = f"/api/staff/requests/{req_id}/transfer"
        self.assertEqual(self.put(url, note, self.tp_ctsv).status_code, 403)
        self.assertEqual(self.put(url, note, self.cv_khtc).status_code, 403)
        # Chỉ được chuyển sang Phòng KHTC
        res = self.put(url, {**note, "to_department_id": self.tp_pdt.department_id}, self.cv_ctsv)
        self.assertEqual(res.json()["error"]["code"], "INVALID_DEPARTMENT")
        res = self.put(url, {**note, "to_department_id": self.tp_khtc.department_id}, self.cv_ctsv)
        self.assertEqual(res.status_code, 200, res.content)
        # Không chuyển lần hai (api-contract 9.8)
        res = self.put(url, note, self.cv_ctsv)
        self.assertEqual(res.status_code, 422)
        self.assertEqual(res.json()["error"]["code"], "ALREADY_TRANSFERRED")

    # ---------- Hoàn trả học phí ----------
    def test_refund_form_validation(self):
        res = self.submit_refund(bank_account_no="12ab34")
        self.assertEqual(res.status_code, 400)
        self.assertIn("Số tài khoản", res.json()["error"]["message"])
        self.assertEqual(self.submit_refund(amount=-5).status_code, 400)
        self.assertEqual(self.submit_refund(amount=1500.5).status_code, 400)
        self.assertEqual(self.submit_refund(refund_reason="Lý do lạ").status_code, 400)

    def test_refund_only_visible_to_finance_department(self):
        res = self.submit_refund(bank_account_no="0011 0041 23456")
        self.assertEqual(res.status_code, 201, res.content)
        req_id = res.json()["data"]["request_id"]
        self.assertEqual(Request.objects.get(request_id=req_id).form_data["bank_account_no"], "0011004123456")
        self.assertIn(req_id, self.inbox(self.tp_khtc))
        for user in (self.tp_ctsv, self.cv_ctsv, self.tp_pdt, self.cv_pdt):
            self.assertNotIn(req_id, self.inbox(user))
            self.assertEqual(self.detail(req_id, user).status_code, 403)

    def test_refund_full_workflow_finance_banking_webhook(self):
        req_id = self.bring_refund_to_principal()
        finance_check = self.detail(req_id, self.cv_khtc).json()["data"]["finance_check"]
        self.assertTrue(finance_check["is_amount_valid"])

        res = self.post(f"/api/principal/requests/{req_id}/sign", {}, self.principal)
        self.assertEqual(res.status_code, 200, res.content)
        req = Request.objects.get(request_id=req_id)
        self.assertEqual(req.internal_status, "Chờ ngân hàng xác nhận")
        self.assertEqual(req.status, "Đang xử lý")
        payout = RefundPayout.objects.get(request=req)
        self.assertEqual(payout.status, "pending_bank")
        self.assertTrue(payout.finance_ref.startswith("FMS-RF-"))
        self.assertTrue(payout.payout_order_id.startswith("IB-"))
        actions = list(StateAuditLog.objects.filter(request=req).values_list("action", flat=True))
        self.assertIn("finance_record_refund", actions)
        self.assertIn("create_payout_order", actions)
        self.assertEqual(self.detail(req_id, self.student).json()["data"]["refund"]["status"], "pending_bank")

        payload = InternetBankingService.build_webhook_payload(payout, succeeded=True)
        # Sai chữ ký hoặc sai số tiền thì không ghi nhận
        self.assertEqual(self.bank_webhook(payload, signature="deadbeef").status_code, 401)
        self.assertEqual(self.bank_webhook({**payload, "amount": 1}).status_code, 422)
        self.assertEqual(self.bank_webhook({**payload, "order_id": "IB-KHONG-TON-TAI"}).status_code, 404)

        res = self.bank_webhook(payload)
        self.assertEqual(res.status_code, 200, res.content)
        req.refresh_from_db()
        self.assertEqual((req.status, req.internal_status), ("Đã xử lý", "Đã xử lý"))
        payout.refresh_from_db()
        self.assertEqual(payout.status, "succeeded")
        self.assertTrue(payout.bank_txn_id.startswith("FT"))
        self.assertTrue(Notification.objects.filter(user=self.student, request=req, title="Đã hoàn trả học phí").exists())

        # Ngân hàng gửi lại webhook: không ghi trùng
        log_count = StateAuditLog.objects.filter(request=req).count()
        res = self.bank_webhook(payload)
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["data"]["duplicate"])
        self.assertEqual(StateAuditLog.objects.filter(request=req).count(), log_count)

    def test_refund_payout_failure_then_retry_via_sandbox(self):
        req_id = self.bring_refund_to_principal()
        self.post(f"/api/principal/requests/{req_id}/sign", {}, self.principal)
        url = f"/api/staff/requests/{req_id}/refund/simulate-bank"

        # Phòng khác không giả lập được
        self.assertEqual(self.post(url, {"outcome": "success"}, self.cv_ctsv).status_code, 403)

        res = self.post(url, {"outcome": "failed", "reason": "Sai tên chủ tài khoản"}, self.cv_khtc)
        self.assertEqual(res.status_code, 200, res.content)
        req = Request.objects.get(request_id=req_id)
        self.assertEqual(req.internal_status, "Chi hoàn trả thất bại")
        first_order = req.refund_payout.payout_order_id
        self.assertEqual(req.refund_payout.failure_reason, "Sai tên chủ tài khoản")

        # Chưa lập lại lệnh chi thì không giả lập tiếp được
        self.assertEqual(self.post(url, {"outcome": "success"}, self.cv_khtc).status_code, 422)

        res = self.put(f"/api/staff/requests/{req_id}/refund/retry", {}, self.tp_khtc)
        self.assertEqual(res.status_code, 200, res.content)
        req.refresh_from_db()
        self.assertEqual(req.internal_status, "Chờ ngân hàng xác nhận")
        self.assertNotEqual(req.refund_payout.payout_order_id, first_order)
        self.assertEqual(req.refund_payout.attempt_count, 2)
        # Finance MS chỉ ghi nhận một lần
        self.assertEqual(StateAuditLog.objects.filter(request=req, action="finance_record_refund").count(), 1)

        res = self.post(url, {"outcome": "success"}, self.cv_khtc)
        self.assertEqual(res.status_code, 200, res.content)
        req.refresh_from_db()
        self.assertEqual(req.internal_status, "Đã xử lý")

    def test_signed_decision_pdf_regenerated_when_file_lost(self):
        """Render gói free xóa file khi deploy lại: tải PDF quyết định đã ký vẫn phải được (tạo lại từ dữ liệu)."""
        from django.core.files.storage import default_storage
        from django.utils import timezone

        req_id = self.bring_refund_to_principal()
        self.post(f"/api/principal/requests/{req_id}/sign", {}, self.principal)
        result = Request.objects.get(request_id=req_id).result
        signed_day = timezone.localtime(result.signed_at).strftime("%d")
        default_storage.delete(result.pdf_file_path)
        self.assertFalse(default_storage.exists(result.pdf_file_path))

        for url in (f"/api/results/{result.result_id}/preview", f"/api/results/{result.result_id}/download"):
            res = self.client.get(url, **self.auth(self.student))
            self.assertEqual(res.status_code, 200, url)
            self.assertTrue(res.content.startswith(b"%PDF"))
        result.refresh_from_db()
        self.assertTrue(default_storage.exists(result.pdf_file_path))
        self.assertEqual(timezone.localtime(result.signed_at).strftime("%d"), signed_day)

    @override_settings(BANKING_SANDBOX_ENABLED=False)
    def test_refund_sandbox_disabled(self):
        req_id = self.bring_refund_to_principal()
        self.post(f"/api/principal/requests/{req_id}/sign", {}, self.principal)
        res = self.post(f"/api/staff/requests/{req_id}/refund/simulate-bank", {"outcome": "success"}, self.cv_khtc)
        self.assertEqual(res.status_code, 403)
