from math import ceil

from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from .models import Notification
from .views import _get_authenticated_user, _json_error

DEFAULT_LIMIT = 20
MAX_LIMIT = 100


def _parse_positive_int(value, default):
    """
    Trả về default nếu không truyền, None nếu giá trị không phải số nguyên dương
    """
    if value is None:
        return default
    try:
        parsed = int(value)
    except ValueError:
        return None
    return parsed if parsed >= 1 else None


def _format_datetime(value):
    # DB lưu UTC, API trả về giờ địa phương theo TIME_ZONE
    return timezone.localtime(value).strftime("%Y-%m-%dT%H:%M:%S") if value else None


@require_http_methods(["GET"])
def notification_list_view(request):
    """
    API 3: GET /api/notifications
    Query params:
      - is_read: 'true' hoặc 'false' (optional)
    """
    # Test 3.6: Kiểm tra đăng nhập
    user = _get_authenticated_user(request)
    if not user:
        return _json_error("UNAUTHORIZED", "Chưa đăng nhập.", status=401)

    page = _parse_positive_int(request.GET.get("page"), default=1)
    limit = _parse_positive_int(request.GET.get("limit"), default=DEFAULT_LIMIT)
    if page is None or limit is None:
        return _json_error("INVALID_PARAM", "page và limit phải là số nguyên dương.", status=400)
    limit = min(limit, MAX_LIMIT)

    # Lấy toàn bộ thông báo của chính user này
    user_notifications = Notification.objects.filter(user=user).select_related('request')

    # Tính unread_count trên tổng số thông báo chưa đọc của user (không bị ảnh hưởng bởi query filter)
    unread_count = user_notifications.filter(is_read=False).count()

    # Lọc theo is_read nếu có (Test 3.2, 3.3)
    is_read_param = request.GET.get("is_read", "").strip().lower()
    if is_read_param == "true":
        notifications_qs = user_notifications.filter(is_read=True)
    elif is_read_param == "false":
        notifications_qs = user_notifications.filter(is_read=False)
    elif is_read_param:
        return _json_error("INVALID_PARAM", "is_read phải là true hoặc false.", status=400)
    else:
        notifications_qs = user_notifications

    # Sắp xếp mới nhất trước
    notifications_qs = notifications_qs.order_by("-sent_at", "-notification_id")

    total = notifications_qs.count()
    offset = (page - 1) * limit
    page_items = notifications_qs[offset:offset + limit] if offset < total else []

    data = [
        {
            "notification_id": n.notification_id,
            "request_id": n.request.request_id if n.request else None,
            "request_code": n.request.request_code if n.request else None,
            "title": n.title,
            "message": n.message,
            "is_read": n.is_read,
            "sent_at": _format_datetime(n.sent_at),
            "read_at": _format_datetime(n.read_at),
        }
        for n in page_items
    ]

    return JsonResponse({
        "success": True,
        "data": data,
        "unread_count": unread_count,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": ceil(total / limit)
        }
    })


@csrf_exempt
@require_http_methods(["PUT"])
def notification_mark_read_view(request, notification_id):
    """
    API 4: PUT /api/notifications/:notification_id/read
    Đánh dấu 1 thông báo là đã đọc
    """
    # Kiểm tra đăng nhập
    user = _get_authenticated_user(request)
    if not user:
        return _json_error("UNAUTHORIZED", "Chưa đăng nhập.", status=401)

    # Test 4.3: Thông báo không tồn tại trong hệ thống
    try:
        notification = Notification.objects.get(notification_id=notification_id)
    except Notification.DoesNotExist:
        return _json_error("NOT_FOUND", "Không tìm thấy thông báo.", status=404)

    # Test 4.2: Thông báo thuộc quyền sở hữu của user khác
    if notification.user_id != user.user_id:
        return _json_error("FORBIDDEN", "Bạn không có quyền thao tác thông báo này.", status=403)

    # Test 4.1 & 4.4: Đánh dấu đã đọc (idempotent nếu đã đọc rồi)
    if not notification.is_read:
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save(update_fields=["is_read", "read_at"])
    elif not notification.read_at:
        notification.read_at = timezone.now()
        notification.save(update_fields=["read_at"])

    return JsonResponse({
        "success": True,
        "message": "Đã đánh dấu đọc."
    })


@csrf_exempt
@require_http_methods(["PUT"])
def notification_read_all_view(request):
    """
    API 5: PUT /api/notifications/read-all
    Đánh dấu tất cả thông báo của user hiện tại là đã đọc
    """
    # Kiểm tra đăng nhập
    user = _get_authenticated_user(request)
    if not user:
        return _json_error("UNAUTHORIZED", "Chưa đăng nhập.", status=401)

    # Test 5.1 & 5.2: Cập nhật tất cả thông báo chưa đọc của user này
    now = timezone.now()
    Notification.objects.filter(user=user, is_read=False).update(
        is_read=True,
        read_at=now
    )

    return JsonResponse({
        "success": True,
        "message": "Đã đánh dấu tất cả đã đọc."
    })
