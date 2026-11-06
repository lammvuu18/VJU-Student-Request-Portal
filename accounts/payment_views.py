from datetime import timedelta
import json
import logging

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import Payment, Request, User
from .notification_views import _format_datetime
from .payment_service import (
    create_payment_link,
    verify_and_process_webhook,
    sync_payment_status_from_payos,
    PaymentError,
    PaymentLockedError,
    InvalidStateError,
)
from .request_views import _can_staff_view_request
from .views import _get_authenticated_user, _json_error, _read_json_object

logger = logging.getLogger(__name__)


@csrf_exempt
@require_http_methods(["POST", "GET"])
def request_payments_dispatch_view(request, request_id):
    """
    Dispatcher cho /api/requests/:request_id/payments:
    - POST: Tạo giao dịch thanh toán PayOS (API 4.1 / API 3.2)
    - GET: Xem trạng thái thanh toán và tự động đồng bộ (API 4.2 / API 3.4)
    """
    if request.method == "POST":
        return _payment_create(request, request_id)
    return _payment_status(request, request_id)


def _payment_create(request, request_id: int):
    """
    POST /api/requests/:request_id/payments — Sinh viên tạo giao dịch thanh toán
    """
    user = _get_authenticated_user(request)
    if not user:
        return _json_error("UNAUTHORIZED", "Vui lòng đăng nhập để tiếp tục.", status=401)

    req = Request.objects.select_related("procedure_type", "user").filter(request_id=request_id).first()
    if not req:
        return _json_error("REQUEST_NOT_FOUND", "Yêu cầu không tồn tại.", status=404)

    # Chỉ chính chủ đơn mới có thể thanh toán
    if req.user_id != user.user_id:
        return _json_error("FORBIDDEN", "Bạn không có quyền thực hiện thanh toán cho yêu cầu này.", status=403)

    body = _read_json_object(request)
    if body is None and request.body:
        return _json_error("INVALID_JSON", "Dữ liệu JSON không hợp lệ.", status=400)
    body = body or {}

    payment_method = body.get("payment_method", "payos")
    return_url = body.get("return_url")
    cancel_url = body.get("cancel_url")

    try:
        payment_data = create_payment_link(
            req,
            payment_method=payment_method,
            return_url=return_url,
            cancel_url=cancel_url,
        )
    except InvalidStateError as e:
        return _json_error("INVALID_STATE", str(e), status=422)
    except PaymentLockedError as e:
        return _json_error("PAYMENT_LOCKED", str(e), status=422)
    except PaymentError as e:
        return _json_error("PAYMENT_FAILED", str(e), status=400)
    except Exception as e:
        logger.exception("Unexpected error in _payment_create")
        return _json_error("INTERNAL_SERVER_ERROR", f"Lỗi hệ thống khi tạo thanh toán: {str(e)}", status=500)

    return JsonResponse({
        "success": True,
        "data": payment_data,
        "message": "Vui lòng hoàn tất thanh toán.",
    }, status=201)


def _payment_status(request, request_id: int):
    """
    GET /api/requests/:request_id/payments — Kiểm tra trạng thái thanh toán
    Tự động đồng bộ trạng thái trực tiếp từ PayOS (Sync-on-GET).
    """
    user = _get_authenticated_user(request)
    if not user:
        return _json_error("UNAUTHORIZED", "Vui lòng đăng nhập để tiếp tục.", status=401)

    req = Request.objects.select_related("procedure_type", "user").filter(request_id=request_id).first()
    if not req:
        return _json_error("REQUEST_NOT_FOUND", "Yêu cầu không tồn tại.", status=404)

    # Sinh viên chủ đơn hoặc cán bộ phòng ban xử lý
    is_owner = (req.user_id == user.user_id)
    is_staff = _can_staff_view_request(user, req)
    if not is_owner and not is_staff:
        return _json_error("FORBIDDEN", "Bạn không có quyền xem thông tin thanh toán của yêu cầu này.", status=403)

    latest_payment = req.payments.order_by("-created_at", "-payment_id").first()

    # Nếu đang ở pending, kiểm tra trực tiếp PayOS để đồng bộ (tiện ích cho localhost hoặc khi webhook trễ)
    if latest_payment and latest_payment.status == "pending":
        is_completed = sync_payment_status_from_payos(latest_payment)
        latest_payment.refresh_from_db()
        if is_completed:
            req.refresh_from_db()

    fee_amount = int(req.procedure_type.fee_amount or 0)
    payment_deadline = req.created_at + timedelta(hours=24)

    latest_data = None
    if latest_payment:
        cb = latest_payment.callback_data or {}
        latest_data = {
            "payment_id": latest_payment.payment_id,
            "status": latest_payment.status,
            "amount": int(latest_payment.amount),
            "payment_method": latest_payment.payment_method,
            "payment_url": latest_payment.payment_url,
            "qr_code": cb.get("qr_code"),
            "account_number": cb.get("account_number"),
            "account_name": cb.get("account_name"),
            "bin": cb.get("bin"),
            "completed_at": _format_datetime(latest_payment.completed_at) if latest_payment.completed_at else None,
        }

    return JsonResponse({
        "success": True,
        "data": {
            "is_required": req.procedure_type.is_fee_required,
            "fee_amount": fee_amount,
            "request_status": req.status,
            "request_internal_status": req.internal_status,
            "latest_payment": latest_data,
            "retry_count": latest_payment.retry_count if latest_payment else 0,
            "max_retries": 3,
            "payment_deadline": _format_datetime(payment_deadline),
        }
    })


@csrf_exempt
@require_http_methods(["POST"])
def payos_webhook_view(request):
    """
    POST /api/webhooks/payos — Nhận webhook từ PayOS (BR-32 xác thực HMAC signature)
    """
    try:
        body_unicode = request.body.decode("utf-8")
        payload = json.loads(body_unicode) if body_unicode else {}
    except Exception as e:
        return _json_error("INVALID_JSON", f"Dữ liệu JSON không hợp lệ: {e}", status=400)

    try:
        result = verify_and_process_webhook(payload)
    except PaymentError as e:
        return _json_error("INVALID_SIGNATURE", str(e), status=400)
    except Exception as e:
        logger.exception("Error processing PayOS webhook")
        return _json_error("WEBHOOK_ERROR", f"Lỗi xử lý webhook: {str(e)}", status=500)

    return JsonResponse({
        "success": True,
        "message": result.get("message", "Confirm Success")
    })
