import logging
import time
from datetime import datetime, timedelta
from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from payos import PayOS
from payos.types import CreatePaymentLinkRequest, ItemData
from payos._core.exceptions import PayOSError

from .models import Payment, Request, StateAuditLog, Notification, User
from .services import calculate_sla_deadline

logger = logging.getLogger(__name__)

QR_EXPIRATION_SECONDS = 900  # 15 phút hiệu lực cho mỗi phiên mã QR VietQR


class PaymentError(Exception):
    """Lỗi chung trong quá trình xử lý thanh toán."""
    pass


class PaymentLockedError(PaymentError):
    """Lỗi khi thanh toán bị khóa do thất bại quá 3 lần (BR-29)."""
    pass


class InvalidStateError(PaymentError):
    """Lỗi khi trạng thái đơn không hợp lệ để thanh toán."""
    pass


def get_payos_client() -> PayOS:
    """Khởi tạo PayOS client từ cấu hình settings."""
    client_id = getattr(settings, "PAYOS_CLIENT_ID", "")
    api_key = getattr(settings, "PAYOS_API_KEY", "")
    checksum_key = getattr(settings, "PAYOS_CHECKSUM_KEY", "")

    if not client_id or not api_key or not checksum_key:
        raise PaymentError("Cổng thanh toán PayOS chưa được cấu hình khóa API.")

    return PayOS(
        client_id=client_id,
        api_key=api_key,
        checksum_key=checksum_key,
    )


def generate_order_code(request_obj: Request) -> int:
    """
    Sinh mã đơn hàng duy nhất cho PayOS (số nguyên dương <= 9007199254740991).
    Công thức: {request_id}{timestamp_mod_100000}
    Ví dụ: request_id = 3, timestamp % 100000 = 45678 -> 345678
    """
    suffix = int(time.time()) % 100000
    return int(f"{request_obj.request_id}{suffix:05d}")


def create_payment_link(request_obj: Request, payment_method: str = "payos", return_url: str = None, cancel_url: str = None) -> dict:
    """
    Tạo link thanh toán PayOS cho Request (API 3.2, BR-27, BR-28, BR-29).
    """
    # 1. Kiểm tra trạng thái yêu cầu
    if request_obj.internal_status != "Chờ thanh toán":
        raise InvalidStateError(f"Đơn đang ở trạng thái '{request_obj.status}', không thể tạo giao dịch thanh toán.")

    now = timezone.now()
    overall_deadline = request_obj.created_at + timedelta(hours=24)
    if now >= overall_deadline:
        raise PaymentError("Đơn đã quá hạn thanh toán (24 giờ).")

    # 2. Kiểm tra BR-29: Quá 3 lần thất bại -> Khóa thanh toán
    failed_count = Payment.objects.filter(request=request_obj, status="failed").count()
    if failed_count >= 3:
        raise PaymentLockedError("Đã thất bại 3 lần. Vui lòng liên hệ PKHTC.")

    # 3. Lấy số tiền từ thủ tục
    fee_amount = int(request_obj.procedure_type.fee_amount or 0)
    if fee_amount <= 0:
        raise PaymentError("Thủ tục này không yêu cầu đóng phí.")

    # 3.1 Kiểm tra giao dịch pending đang mở (nếu có)
    existing_pending = Payment.objects.filter(request=request_obj, status="pending").order_by("-created_at").first()
    if existing_pending and existing_pending.payment_url and existing_pending.callback_data:
        qr = existing_pending.callback_data.get("qr_code")
        raw_exp = existing_pending.callback_data.get("expires_at")
        exp_dt = None
        if raw_exp:
            try:
                exp_dt = datetime.fromisoformat(raw_exp)
                if timezone.is_naive(exp_dt):
                    exp_dt = timezone.make_aware(exp_dt)
            except Exception:
                exp_dt = None
        if not exp_dt:
            exp_dt = existing_pending.created_at + timedelta(seconds=QR_EXPIRATION_SECONDS)

        # Còn hạn ít nhất 15 giây thì tái sử dụng để phản hồi tức thì
        if qr and now < (exp_dt - timedelta(seconds=15)):
            rem_sec = max(0, int((exp_dt - now).total_seconds()))
            return {
                "payment_id": existing_pending.payment_id,
                "txn_id": existing_pending.txn_id,
                "amount": int(existing_pending.amount),
                "payment_method": existing_pending.payment_method,
                "payment_url": existing_pending.payment_url,
                "qr_code": qr,
                "account_number": existing_pending.callback_data.get("account_number"),
                "account_name": existing_pending.callback_data.get("account_name"),
                "bin": existing_pending.callback_data.get("bin"),
                "expires_at": exp_dt.isoformat(),
                "remaining_seconds": rem_sec,
                "retry_count": existing_pending.retry_count,
            }
        else:
            # Giao dịch pending cũ đã hết hạn -> đánh dấu failed
            existing_pending.status = "failed"
            existing_pending.save(update_fields=["status"])
            failed_count = Payment.objects.filter(request=request_obj, status="failed").count()
            if failed_count >= 3:
                raise PaymentLockedError("Đã thất bại 3 lần. Vui lòng liên hệ PKHTC.")

    # 4. Chuẩn bị tham số gọi PayOS
    client = get_payos_client()
    order_code = generate_order_code(request_obj)

    # PayOS giới hạn description tối đa 25 ký tự, không dấu
    description = f"REQ{request_obj.request_id} VJU"

    base_return = getattr(settings, "PAYOS_RETURN_URL", "http://localhost:3000/student/requests")
    base_cancel = getattr(settings, "PAYOS_CANCEL_URL", "http://localhost:3000/student/requests")
    
    actual_return_url = return_url or f"{base_return}/{request_obj.request_id}?payment_status=success"
    actual_cancel_url = cancel_url or f"{base_cancel}/{request_obj.request_id}?payment_status=cancelled"

    procedure_name = request_obj.procedure_type.name or "Lệ phí thủ tục"
    # Cắt ngắn tên item nếu dài quá
    safe_item_name = procedure_name[:50]

    # Tính mốc hết hạn cho phiên QR mới (15 phút hoặc hạn chót 24h, tùy mốc nào đến trước)
    session_deadline = min(now + timedelta(seconds=QR_EXPIRATION_SECONDS), overall_deadline)
    expired_at_timestamp = int(session_deadline.timestamp())

    try:
        req_data = CreatePaymentLinkRequest(
            order_code=order_code,
            amount=fee_amount,
            description=description,
            cancel_url=actual_cancel_url,
            return_url=actual_return_url,
            items=[
                ItemData(
                    name=safe_item_name,
                    quantity=1,
                    price=fee_amount,
                )
            ],
            expired_at=expired_at_timestamp,
        )
        res = client.payment_requests.create(req_data)
    except PayOSError as e:
        logger.error(f"PayOS createPaymentLink error: {e}")
        raise PaymentError(f"Không thể tạo link thanh toán PayOS: {e}")
    except Exception as e:
        logger.error(f"Unexpected error creating PayOS link: {e}")
        raise PaymentError(f"Lỗi khi kết nối cổng thanh toán: {str(e)}")

    # 5. Lưu bản ghi Payment
    payment = Payment.objects.create(
        request=request_obj,
        txn_id=str(res.order_code),
        amount=fee_amount,
        payment_method=payment_method,
        status="pending",
        payment_url=res.checkout_url,
        callback_data={
            "qr_code": res.qr_code,
            "account_number": res.account_number,
            "account_name": res.account_name,
            "bin": res.bin,
            "expires_at": session_deadline.isoformat(),
        },
        retry_count=failed_count + 1,
    )

    return {
        "payment_id": payment.payment_id,
        "txn_id": payment.txn_id,
        "amount": fee_amount,
        "payment_method": payment_method,
        "payment_url": payment.payment_url,
        "qr_code": res.qr_code,
        "account_number": res.account_number,
        "account_name": res.account_name,
        "bin": res.bin,
        "expires_at": session_deadline.isoformat(),
        "remaining_seconds": max(0, int((session_deadline - now).total_seconds())),
        "retry_count": payment.retry_count,
    }


def process_payment_success(payment_obj: Payment, webhook_data: dict = None):
    """
    Xử lý khi thanh toán thành công (Webhook hoặc Polling Sync):
    - Cập nhật Payment -> completed
    - Chuyển Request -> "Chờ phân công", status -> "Đã gửi"
    - Kích hoạt tính SLA deadline
    - Tạo StateAuditLog & Notifications
    """
    with transaction.atomic():
        payment_obj.status = "completed"
        payment_obj.completed_at = timezone.now()
        payment_obj.signature_verified = True
        if webhook_data:
            payment_obj.callback_data = webhook_data
        payment_obj.save()

        req = payment_obj.request
        if req.internal_status == "Chờ thanh toán":
            status_before = req.internal_status
            req.status = "Đã gửi"
            req.internal_status = "Chờ phân công"
            now = timezone.now()
            req.sla_deadline = calculate_sla_deadline(now, req.procedure_type.sla_total_days)
            req.save()

            # Ghi StateAuditLog
            StateAuditLog.objects.create(
                request=req,
                performed_by=req.user,
                action="payment_completed",
                note=f"Thanh toán lệ phí thành công qua PayOS (Mã GD: {payment_obj.txn_id})",
                status_before=status_before,
                status_after="Chờ phân công",
            )

            # Gửi Notification cho Sinh viên
            Notification.objects.create(
                user=req.user,
                request=req,
                title="Thanh toán thành công",
                message=f"Thanh toán lệ phí {int(payment_obj.amount):,} VNĐ cho mã yêu cầu {req.request_code} đã hoàn tất.",
            )

            # Gửi Notification cho Trưởng phòng ban tiếp nhận
            dept_heads = User.objects.filter(
                Q(department=req.procedure_type.department) | Q(email__iexact="demo.truongphong@vju.ac.vn"),
                role="dept_head",
                account_status="active",
            ).distinct()
            for head in dept_heads:
                Notification.objects.create(
                    user=head,
                    request=req,
                    title="Có đơn mới chờ phân công",
                    message=f"Có đơn mới chờ phân công: {req.request_code} ({req.procedure_type.name}).",
                )


def verify_and_process_webhook(payload: dict) -> dict:
    """
    Xác thực chữ ký số webhook PayOS (BR-32) và xử lý kết quả thanh toán.
    """
    client = get_payos_client()
    try:
        verified_data = client.webhooks.verify(payload)
    except Exception as e:
        logger.warning(f"PayOS webhook signature verification failed: {e}")
        raise PaymentError(f"Chữ ký webhook không hợp lệ: {e}")

    order_code = str(verified_data.order_code)
    payment = Payment.objects.filter(txn_id=order_code).first()
    if not payment:
        logger.warning(f"Payment with txn_id {order_code} not found.")
        return {"success": False, "message": "Giao dịch không tồn tại"}

    code = payload.get("code")
    if code == "00" or getattr(verified_data, "code", None) == "00":
        process_payment_success(payment, webhook_data=payload)
        return {"success": True, "message": "Xác nhận thanh toán thành công"}
    else:
        payment.status = "failed"
        payment.retry_count += 1
        payment.callback_data = payload
        payment.save()
        return {"success": True, "message": "Giao dịch thất bại"}


def sync_payment_status_from_payos(payment_obj: Payment) -> bool:
    """
    Hỗ trợ kiểm tra chủ động (Sync-on-GET): Truy vấn trạng thái trực tiếp từ PayOS
    nếu webhook chưa kịp tới hoặc đang chạy môi trường localhost.
    """
    if payment_obj.status == "completed":
        return True

    if not payment_obj.txn_id:
        return False

    try:
        order_code = int(payment_obj.txn_id)
    except (ValueError, TypeError):
        return False

    try:
        client = get_payos_client()
        info = client.payment_requests.get(order_code)
        if info.status == "PAID":
            process_payment_success(payment_obj, webhook_data=info.model_dump())
            return True
        elif info.status == "CANCELLED":
            if payment_obj.status != "cancelled":
                payment_obj.status = "cancelled"
                payment_obj.save(update_fields=["status"])
    except Exception as e:
        logger.warning(f"Failed to sync payment status from PayOS for {payment_obj.txn_id}: {e}")


    return payment_obj.status == "completed"
