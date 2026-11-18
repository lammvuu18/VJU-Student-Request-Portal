"""
Quy trình chi hoàn trả học phí sau khi Hiệu trưởng ký quyết định:

1. Finance MS ghi nhận khoản hoàn trả (sinh mã FMS-RF-...)
2. Internet Banking lập lệnh chi (sinh mã IB-...) → đơn chờ ngân hàng xác nhận
3. Ngân hàng gọi webhook /api/webhooks/banking (ký HMAC) báo thành công hoặc thất bại
   - Thành công: đơn "Đã xử lý", sinh viên nhận thông báo đã chuyển khoản
   - Thất bại: đơn "Chi hoàn trả thất bại", Phòng KHTC lập lại lệnh chi
"""
import json
from decimal import Decimal, InvalidOperation

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import Notification, RefundPayout, Request, StateAuditLog, User
from .services import ExternalServiceError, FinanceMSService, InternetBankingService, format_vnd

STATUS_WAITING_BANK = "Chờ ngân hàng xác nhận"
STATUS_PAYOUT_FAILED = "Chi hoàn trả thất bại"


def _parse_amount(value) -> Decimal:
    try:
        amount = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return Decimal(0)
    return amount.quantize(Decimal(1))


def payout_to_dict(payout: RefundPayout) -> dict:
    from .notification_views import _format_datetime

    return {
        "amount": int(payout.amount),
        "amount_text": format_vnd(payout.amount),
        "bank_name": payout.bank_name,
        "bank_account_no": payout.bank_account_no,
        "account_holder": payout.account_holder,
        "status": payout.status,
        "finance_ref": payout.finance_ref,
        "finance_recorded_at": _format_datetime(payout.finance_recorded_at),
        "payout_order_id": payout.payout_order_id,
        "payout_created_at": _format_datetime(payout.payout_created_at),
        "source_account": InternetBankingService.SOURCE_ACCOUNT,
        "bank_txn_id": payout.bank_txn_id,
        "bank_confirmed_at": _format_datetime(payout.bank_confirmed_at),
        "failure_reason": payout.failure_reason,
        "attempt_count": payout.attempt_count,
        "sandbox_enabled": bool(getattr(settings, "BANKING_SANDBOX_ENABLED", False)),
    }


def _notify(users, req, title, message):
    for user in users:
        if user:
            Notification.objects.create(user=user, request=req, title=title, message=message)


def _finance_staff(req):
    """CV đang phụ trách và Trưởng phòng KHTC (phòng đang xử lý đơn hoàn trả)."""
    dept_id = req.transferred_to_dept_id or req.procedure_type.department_id
    heads = list(User.objects.filter(department_id=dept_id, role="dept_head", account_status="active"))
    return [req.assigned_staff, *heads]


def _mark_failed(req, payout, reason, performed_by=None):
    status_before = req.internal_status
    payout.status = "failed"
    payout.failure_reason = reason
    payout.save(update_fields=["status", "failure_reason", "updated_at"])
    req.status = "Đang xử lý"
    req.internal_status = STATUS_PAYOUT_FAILED
    req.save(update_fields=["status", "internal_status", "updated_at"])
    StateAuditLog.objects.create(
        request=req,
        performed_by=performed_by,
        action="payout_failed",
        note=f"Chi hoàn trả chưa thành công: {reason}",
        status_before=status_before,
        status_after=STATUS_PAYOUT_FAILED,
    )
    _notify(
        _finance_staff(req), req, "Chi hoàn trả thất bại",
        f"Lệnh chi hoàn trả hồ sơ {req.request_code} chưa thành công: {reason}. Vui lòng kiểm tra và lập lại lệnh chi.",
    )
    _notify(
        [req.user], req, "Chuyển khoản hoàn trả chưa thành công",
        f"Khoản hoàn trả của hồ sơ {req.request_code} chưa chuyển được ({reason}). Phòng Kế hoạch Tài chính sẽ xử lý lại.",
    )


def _run_payout_pipeline(req, payout, performed_by=None):
    """Bước 1 (nếu chưa ghi nhận) và bước 2. Lỗi hệ thống ngoài chuyển đơn sang trạng thái thất bại."""
    now = timezone.now()
    status_before = req.internal_status

    if not payout.finance_ref:
        try:
            fin = FinanceMSService.record_refund(req, payout.amount)
        except ExternalServiceError as exc:
            _mark_failed(req, payout, f"Finance MS không ghi nhận được khoản hoàn ({exc})", performed_by)
            return payout
        payout.finance_ref = fin["refund_ref"]
        payout.finance_recorded_at = fin["recorded_at"]
        payout.save(update_fields=["finance_ref", "finance_recorded_at", "updated_at"])
        StateAuditLog.objects.create(
            request=req,
            performed_by=None,
            action="finance_record_refund",
            note=f"Finance MS ghi nhận khoản hoàn {format_vnd(payout.amount)} (mã {fin['refund_ref']}, TK {fin['ledger_account']}).",
            status_before=status_before,
            status_after=status_before,
        )

    payout.attempt_count += 1
    payout.save(update_fields=["attempt_count", "updated_at"])
    try:
        order = InternetBankingService.create_payout_order(payout)
    except ExternalServiceError as exc:
        _mark_failed(req, payout, f"Internet Banking không lập được lệnh chi ({exc})", performed_by)
        return payout

    payout.payout_order_id = order["order_id"]
    payout.payout_created_at = order["created_at"]
    payout.status = "pending_bank"
    payout.failure_reason = None
    payout.save(update_fields=[
        "payout_order_id", "payout_created_at", "status", "failure_reason", "updated_at",
    ])

    req.status = "Đang xử lý"
    req.internal_status = STATUS_WAITING_BANK
    req.save(update_fields=["status", "internal_status", "updated_at"])
    StateAuditLog.objects.create(
        request=req,
        performed_by=None,
        action="create_payout_order",
        note=(
            f"Internet Banking lập lệnh chi {order['order_id']}: {format_vnd(payout.amount)} "
            f"tới TK {payout.bank_account_no} ({payout.bank_name}). Chờ ngân hàng xác nhận."
        ),
        status_before=status_before,
        status_after=STATUS_WAITING_BANK,
    )
    return payout


def start_refund_payout(req: Request) -> RefundPayout:
    """Gọi ngay sau khi Hiệu trưởng ký quyết định hoàn trả (trong transaction của bước ký)."""
    form_data = req.form_data or {}
    payout, _ = RefundPayout.objects.get_or_create(
        request=req,
        defaults={
            "amount": _parse_amount(form_data.get("amount")),
            "bank_name": str(form_data.get("bank_name") or ""),
            "bank_account_no": str(form_data.get("bank_account_no") or ""),
            "account_holder": str(form_data.get("account_holder") or ""),
        },
    )
    return _run_payout_pipeline(req, payout)


def retry_refund_payout(req: Request, performed_by) -> RefundPayout:
    """Phòng KHTC lập lại lệnh chi khi lần trước thất bại."""
    payout = req.refund_payout
    StateAuditLog.objects.create(
        request=req,
        performed_by=performed_by,
        action="retry_payout",
        note=f"Lập lại lệnh chi hoàn trả (lần {payout.attempt_count + 1}).",
        status_before=req.internal_status,
        status_after=req.internal_status,
    )
    return _run_payout_pipeline(req, payout, performed_by)


class WebhookError(Exception):
    def __init__(self, status, code, message):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message


def handle_bank_webhook(raw_body: bytes, signature: str) -> dict:
    """
    Xử lý webhook ngân hàng. Trả về dict kết quả hoặc ném WebhookError.
    Webhook có thể đến nhiều lần: lệnh chi đã kết thúc thì trả kết quả cũ, không ghi lại.
    """
    if not InternetBankingService.verify_signature(raw_body, signature):
        raise WebhookError(401, "INVALID_SIGNATURE", "Chữ ký webhook không hợp lệ.")
    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except (UnicodeDecodeError, ValueError):
        raise WebhookError(400, "INVALID_PAYLOAD", "Dữ liệu webhook không phải JSON hợp lệ.")
    if not isinstance(payload, dict):
        raise WebhookError(400, "INVALID_PAYLOAD", "Dữ liệu webhook không hợp lệ.")

    event = payload.get("event")
    if event not in ("payout.succeeded", "payout.failed"):
        raise WebhookError(400, "INVALID_EVENT", "Sự kiện webhook không được hỗ trợ.")

    with transaction.atomic():
        # Chỉ khóa dòng refund_payout: PostgreSQL không cho FOR UPDATE trên bảng ở phía có thể NULL
        # của LEFT JOIN (request.assigned_staff), khóa cả câu sẽ lỗi 500. SQLite bỏ qua FOR UPDATE nên test không bắt được
        payout = (
            RefundPayout.objects.select_for_update(of=("self",))
            .select_related("request", "request__user", "request__procedure_type", "request__assigned_staff")
            .filter(payout_order_id=payload.get("order_id"))
            .first()
        )
        if not payout:
            raise WebhookError(404, "ORDER_NOT_FOUND", "Không tìm thấy lệnh chi.")
        if payout.status in ("succeeded", "failed"):
            return {"order_id": payout.payout_order_id, "status": payout.status, "duplicate": True}
        if _parse_amount(payload.get("amount")) != payout.amount:
            raise WebhookError(422, "AMOUNT_MISMATCH", "Số tiền webhook không khớp với lệnh chi.")

        req = payout.request
        payout.webhook_payload = payload
        if event == "payout.failed":
            payout.save(update_fields=["webhook_payload", "updated_at"])
            _mark_failed(req, payout, payload.get("failure_reason") or "Ngân hàng từ chối lệnh chi")
            return {"order_id": payout.payout_order_id, "status": payout.status, "duplicate": False}

        now = timezone.now()
        payout.status = "succeeded"
        payout.bank_txn_id = payload.get("bank_txn_id") or ""
        payout.bank_confirmed_at = now
        payout.save(update_fields=["status", "bank_txn_id", "bank_confirmed_at", "webhook_payload", "updated_at"])

        status_before = req.internal_status
        req.status = "Đã xử lý"
        req.internal_status = "Đã xử lý"
        req.save(update_fields=["status", "internal_status", "updated_at"])
        StateAuditLog.objects.create(
            request=req,
            performed_by=None,
            action="bank_confirm_payout",
            note=(
                f"Ngân hàng xác nhận đã chuyển {format_vnd(payout.amount)} tới TK {payout.bank_account_no} "
                f"(mã GD {payout.bank_txn_id}, lệnh chi {payout.payout_order_id})."
            ),
            status_before=status_before,
            status_after="Đã xử lý",
        )
        _notify(
            [req.user], req, "Đã hoàn trả học phí",
            f"Trường đã chuyển {format_vnd(payout.amount)} hoàn trả học phí ({req.request_code}) "
            f"tới tài khoản {payout.bank_account_no} - {payout.bank_name}. Mã giao dịch: {payout.bank_txn_id}.",
        )
        _notify(
            _finance_staff(req), req, "Ngân hàng đã xác nhận chi hoàn trả",
            f"Lệnh chi {payout.payout_order_id} của hồ sơ {req.request_code} đã chuyển khoản thành công.",
        )
        return {"order_id": payout.payout_order_id, "status": payout.status, "duplicate": False}


def simulate_bank_callback(payout: RefundPayout, succeeded: bool, failure_reason: str = "") -> dict:
    """
    Môi trường demo chưa nối ngân hàng thật: dựng payload như ngân hàng gửi, ký HMAC rồi
    đi qua đúng hàm xử lý webhook (kể cả bước kiểm tra chữ ký).
    """
    payload = InternetBankingService.build_webhook_payload(payout, succeeded, failure_reason)
    raw_body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    signature = InternetBankingService.sign_payload(raw_body)
    return handle_bank_webhook(raw_body, signature)
