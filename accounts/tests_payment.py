from datetime import timedelta
from io import StringIO
import json
from unittest.mock import patch, MagicMock

from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone

from accounts.jwt_utils import generate_jwt_token
from accounts.models import (
    Department, Notification, Payment, ProcedureType, Request,
    StateAuditLog, User,
)
from accounts.payment_service import (
    generate_order_code,
    create_payment_link,
    process_payment_success,
    verify_and_process_webhook,
    PaymentLockedError,
    InvalidStateError,
)


@override_settings(DEBUG=True)
class PaymentTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("seed_module0", allow_non_sqlite=True, stdout=StringIO())
        cls.sv_a = User.objects.get(email="minhanh@st.vju.ac.vn")
        cls.sv_b = User.objects.get(email="quocanh@st.vju.ac.vn")
        cls.tp_pdt = User.objects.get(email="thuha@vju.ac.vn")

        cls.proc_fee = ProcedureType.objects.get(type_id=3)  # Phúc khảo điểm thi (50.000 VNĐ)

    def _auth_header(self, user):
        token = generate_jwt_token({"user_id": user.user_id, "role": user.role, "email": user.email})
        return {"HTTP_AUTHORIZATION": f"Bearer {token}"}

    def _create_fee_request(self, user=None):
        u = user or self.sv_a
        seq = Request.objects.count() + 1
        return Request.objects.create(
            request_code=f"REQ-TEST-{int(timezone.now().timestamp())}-{seq}",
            user=u,
            procedure_type=self.proc_fee,
            status="Chờ thanh toán",
            internal_status="Chờ thanh toán",
            form_data={"course_name": "Cấu trúc dữ liệu", "course_code": "CS201"},
        )

    def test_generate_order_code(self):
        req = self._create_fee_request()
        code = generate_order_code(req)
        self.assertIsInstance(code, int)
        self.assertTrue(code > 0)
        self.assertTrue(str(code).startswith(str(req.request_id)))

    @patch("accounts.payment_service.get_payos_client")
    def test_create_payment_link_success(self, mock_client_getter):
        # Mock PayOS createPaymentLink response
        mock_client = MagicMock()
        mock_res = MagicMock()
        mock_res.order_code = 123456
        mock_res.checkout_url = "https://pay.payos.vn/web/mock123"
        mock_res.qr_code = "00020101021238540010A00000072701240006970422..."
        mock_res.account_number = "123456789"
        mock_res.account_name = "TRUONG DAI HOC VIET NHAT"
        mock_res.bin = "970422"
        mock_client.payment_requests.create.return_value = mock_res
        mock_client_getter.return_value = mock_client

        req = self._create_fee_request()

        res = self.client.post(
            f"/api/requests/{req.request_id}/payments",
            data=json.dumps({"payment_method": "payos"}),
            content_type="application/json",
            **self._auth_header(self.sv_a),
        )

        self.assertEqual(res.status_code, 201)
        data = res.json()["data"]
        self.assertEqual(data["amount"], 50000)
        self.assertEqual(data["payment_url"], "https://pay.payos.vn/web/mock123")
        self.assertEqual(data["qr_code"], mock_res.qr_code)

        # Database verification
        p = Payment.objects.filter(request=req).first()
        self.assertIsNotNone(p)
        self.assertEqual(p.status, "pending")
        self.assertEqual(p.txn_id, "123456")

    def test_create_payment_wrong_user_forbidden(self):
        req = self._create_fee_request(user=self.sv_a)

        res = self.client.post(
            f"/api/requests/{req.request_id}/payments",
            data=json.dumps({"payment_method": "payos"}),
            content_type="application/json",
            **self._auth_header(self.sv_b),
        )

        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.json()["error"]["code"], "FORBIDDEN")

    def test_create_payment_invalid_state(self):
        req = self._create_fee_request()
        req.internal_status = "Chờ phân công"
        req.status = "Đã gửi"
        req.save()

        res = self.client.post(
            f"/api/requests/{req.request_id}/payments",
            data=json.dumps({"payment_method": "payos"}),
            content_type="application/json",
            **self._auth_header(self.sv_a),
        )

        self.assertEqual(res.status_code, 422)
        self.assertEqual(res.json()["error"]["code"], "INVALID_STATE")

    def test_payment_locked_after_3_failures(self):
        req = self._create_fee_request()
        # Tạo 3 bản ghi thanh toán thất bại
        for i in range(3):
            Payment.objects.create(
                request=req,
                txn_id=f"FAIL-{i}",
                amount=50000,
                status="failed",
            )

        res = self.client.post(
            f"/api/requests/{req.request_id}/payments",
            data=json.dumps({"payment_method": "payos"}),
            content_type="application/json",
            **self._auth_header(self.sv_a),
        )

        self.assertEqual(res.status_code, 422)
        self.assertEqual(res.json()["error"]["code"], "PAYMENT_LOCKED")

    def test_get_payment_status(self):
        req = self._create_fee_request()
        Payment.objects.create(
            request=req,
            txn_id="TXN-001",
            amount=50000,
            status="pending",
            payment_url="https://pay.payos.vn/test",
            callback_data={"qr_code": "MOCK-QR"},
        )

        res = self.client.get(
            f"/api/requests/{req.request_id}/payments",
            **self._auth_header(self.sv_a),
        )

        self.assertEqual(res.status_code, 200)
        data = res.json()["data"]
        self.assertTrue(data["is_required"])
        self.assertEqual(data["fee_amount"], 50000)
        self.assertEqual(data["latest_payment"]["status"], "pending")
        self.assertEqual(data["latest_payment"]["qr_code"], "MOCK-QR")

    @patch("accounts.payment_service.get_payos_client")
    def test_payos_webhook_success(self, mock_client_getter):
        req = self._create_fee_request()
        p = Payment.objects.create(
            request=req,
            txn_id="999888",
            amount=50000,
            status="pending",
        )

        mock_client = MagicMock()
        mock_webhook_data = MagicMock()
        mock_webhook_data.order_code = 999888
        mock_webhook_data.code = "00"
        mock_client.webhooks.verify.return_value = mock_webhook_data
        mock_client_getter.return_value = mock_client

        webhook_payload = {
            "code": "00",
            "desc": "success",
            "data": {
                "orderCode": 999888,
                "amount": 50000,
                "description": "REQ VJU",
                "accountNumber": "123",
                "reference": "FT123",
                "transactionDateTime": "2026-11-06 11:00:00",
                "currency": "VND",
                "paymentLinkId": "pl_123",
                "code": "00",
                "desc": "success",
            },
            "signature": "valid_signature_hash"
        }

        res = self.client.post(
            "/api/webhooks/payos",
            data=json.dumps(webhook_payload),
            content_type="application/json",
        )

        self.assertEqual(res.status_code, 200)

        # Kiểm tra trạng thái đã cập nhật
        p.refresh_from_db()
        req.refresh_from_db()

        self.assertEqual(p.status, "completed")
        self.assertTrue(p.signature_verified)
        self.assertIsNotNone(p.completed_at)

        self.assertEqual(req.status, "Đã gửi")
        self.assertEqual(req.internal_status, "Chờ phân công")
        self.assertIsNotNone(req.sla_deadline)

        # Audit log & notifications
        log = StateAuditLog.objects.filter(request=req, action="payment_completed").first()
        self.assertIsNotNone(log)

        notif_sv = Notification.objects.filter(request=req, user=self.sv_a, title="Thanh toán thành công").first()
        self.assertIsNotNone(notif_sv)

        notif_tp = Notification.objects.filter(request=req, user=self.tp_pdt, title="Có đơn mới chờ phân công").first()
        self.assertIsNotNone(notif_tp)

    @patch("accounts.payment_service.get_payos_client")
    def test_payos_webhook_invalid_signature(self, mock_client_getter):
        req = self._create_fee_request()
        Payment.objects.create(
            request=req,
            txn_id="111222",
            amount=50000,
            status="pending",
        )

        mock_client = MagicMock()
        mock_client.webhooks.verify.side_effect = Exception("Signature verification failed")
        mock_client_getter.return_value = mock_client

        res = self.client.post(
            "/api/webhooks/payos",
            data=json.dumps({"data": {"orderCode": 111222}, "signature": "bad_sig"}),
            content_type="application/json",
        )

        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()["error"]["code"], "INVALID_SIGNATURE")

        req.refresh_from_db()
        self.assertEqual(req.internal_status, "Chờ thanh toán")

    @patch("accounts.payment_service.get_payos_client")
    def test_payment_link_has_15min_expiration(self, mock_client_getter):
        mock_client = MagicMock()
        mock_res = MagicMock()
        mock_res.order_code = 555666
        mock_res.checkout_url = "https://pay.payos.vn/web/mock555"
        mock_res.qr_code = "0002010102123854..."
        mock_res.account_number = "123456789"
        mock_res.account_name = "TRUONG DAI HOC VIET NHAT"
        mock_res.bin = "970422"
        mock_client.payment_requests.create.return_value = mock_res
        mock_client_getter.return_value = mock_client

        req = self._create_fee_request()
        res = self.client.post(
            f"/api/requests/{req.request_id}/payments",
            data=json.dumps({"payment_method": "payos"}),
            content_type="application/json",
            **self._auth_header(self.sv_a),
        )
        self.assertEqual(res.status_code, 201)
        data = res.json()["data"]
        self.assertIn("expires_at", data)
        self.assertIn("remaining_seconds", data)
        self.assertTrue(data["remaining_seconds"] <= 900 and data["remaining_seconds"] > 880)

    @patch("accounts.payment_service.get_payos_client")
    def test_expired_payment_marked_failed_and_new_link_created(self, mock_client_getter):
        req = self._create_fee_request()
        # Tạo 1 payment đã hết hạn 5 phút trước
        past_time = timezone.now() - timedelta(minutes=20)
        p = Payment.objects.create(
            request=req,
            txn_id="EXP-001",
            amount=50000,
            status="pending",
            payment_url="https://pay.payos.vn/web/exp1",
            callback_data={
                "qr_code": "OLD_QR",
                "expires_at": (past_time + timedelta(minutes=15)).isoformat(),
            },
            retry_count=1,
        )

        mock_client = MagicMock()
        mock_res = MagicMock()
        mock_res.order_code = 777888
        mock_res.checkout_url = "https://pay.payos.vn/web/new777"
        mock_res.qr_code = "NEW_QR"
        mock_res.account_number = "123456789"
        mock_res.account_name = "TRUONG DAI HOC VIET NHAT"
        mock_res.bin = "970422"
        mock_client.payment_requests.create.return_value = mock_res
        mock_client_getter.return_value = mock_client

        res = self.client.post(
            f"/api/requests/{req.request_id}/payments",
            data=json.dumps({"payment_method": "payos"}),
            content_type="application/json",
            **self._auth_header(self.sv_a),
        )
        self.assertEqual(res.status_code, 201)
        data = res.json()["data"]
        self.assertEqual(data["qr_code"], "NEW_QR")
        self.assertEqual(data["retry_count"], 2)

        # Cũ đã bị failed
        p.refresh_from_db()
        self.assertEqual(p.status, "failed")

    def test_overdue_24h_request_auto_cancelled_with_reason_on_list_and_detail(self):
        req = self._create_fee_request()
        Request.objects.filter(pk=req.pk).update(created_at=timezone.now() - timedelta(hours=25))

        res = self.client.get(
            f"/api/requests/{req.request_id}",
            **self._auth_header(self.sv_a),
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()["data"]
        self.assertEqual(data["status"], "Đã hủy")
        self.assertEqual(data["internal_status"], "Đã hủy")
        self.assertEqual(data["cancel_reason"], "Quá hạn thanh toán phí")

        req.refresh_from_db()
        self.assertEqual(req.status, "Đã hủy")
        self.assertEqual(req.form_data.get("cancel_reason"), "Quá hạn thanh toán phí")

        log = StateAuditLog.objects.filter(request=req, action="cancel").first()
        self.assertIsNotNone(log)
        self.assertIn("Quá hạn thanh toán phí", log.note)

        notif = Notification.objects.filter(user=self.sv_a, request=req).order_by("-sent_at").first()
        self.assertIsNotNone(notif)
        self.assertIn("Quá hạn thanh toán phí", notif.message)

    @patch("accounts.payment_service.get_payos_client")
    def test_expired_qr_session_auto_cancels_request_with_reason_on_get_status(self, mock_client_getter):
        mock_client = MagicMock()
        mock_info = MagicMock()
        mock_info.status = "EXPIRED"
        mock_client.payment_requests.get.return_value = mock_info
        mock_client_getter.return_value = mock_client

        req = self._create_fee_request()
        past_exp = (timezone.now() - timedelta(minutes=2)).isoformat()
        p = Payment.objects.create(
            request=req,
            txn_id="999001",
            amount=50000,
            status="pending",
            payment_url="https://pay.payos.vn/web/exp999",
            callback_data={"qr_code": "EXP_QR", "expires_at": past_exp},
            retry_count=1,
        )

        res = self.client.get(
            f"/api/requests/{req.request_id}/payments",
            **self._auth_header(self.sv_a),
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()["data"]
        self.assertEqual(data["request_status"], "Đã hủy")
        self.assertEqual(data["cancel_reason"], "Quá hạn thanh toán phí")

        req.refresh_from_db()
        p.refresh_from_db()
        self.assertEqual(req.status, "Đã hủy")
        self.assertEqual(req.internal_status, "Đã hủy")
        self.assertEqual(req.form_data.get("cancel_reason"), "Quá hạn thanh toán phí")
        self.assertEqual(p.status, "failed")

    def test_overdue_payment_does_not_block_new_submission(self):
        old_req = self._create_fee_request()
        past_exp = (timezone.now() - timedelta(minutes=5)).isoformat()
        Payment.objects.create(
            request=old_req,
            txn_id="888001",
            amount=50000,
            status="pending",
            payment_url="https://pay.payos.vn/web/exp888",
            callback_data={"qr_code": "EXP_QR", "expires_at": past_exp},
            retry_count=1,
        )

        # Khi gọi danh sách đơn hoặc nộp đơn mới -> đơn cũ quá hạn tự động hủy kèm lý do "Quá hạn thanh toán phí"
        list_res = self.client.get("/api/requests", **self._auth_header(self.sv_a))
        self.assertEqual(list_res.status_code, 200)
        old_req.refresh_from_db()
        self.assertEqual(old_req.status, "Đã hủy")
        self.assertEqual(old_req.form_data.get("cancel_reason"), "Quá hạn thanh toán phí")

        new_req = self._create_fee_request()
        self.assertEqual(new_req.status, "Chờ thanh toán")

    def test_cancel_endpoint_supports_waiting_payment_with_reason(self):
        req = self._create_fee_request()
        res = self.client.put(
            f"/api/requests/{req.request_id}/cancel",
            data=json.dumps({"reason": "Quá hạn thanh toán phí"}),
            content_type="application/json",
            **self._auth_header(self.sv_a),
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["data"]["status"], "Đã hủy")
        self.assertEqual(res.json()["data"]["cancel_reason"], "Quá hạn thanh toán phí")
        req.refresh_from_db()
        self.assertEqual(req.status, "Đã hủy")
        self.assertEqual(req.form_data.get("cancel_reason"), "Quá hạn thanh toán phí")


