from datetime import datetime, timedelta
import json
from math import ceil

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import transaction
from django.db.models import Q
from django.http import JsonResponse
from django.http.multipartparser import MultiPartParser
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import (
    AccessLog, Attachment, Notification, RejectionReason, Request, Result, StateAuditLog, User,
)
from .notification_views import DEFAULT_LIMIT, MAX_LIMIT, _format_datetime, _parse_positive_int
from .request_views import CLOSED_REQUEST_STATUSES, _is_demo_cross_dept_staff
from .services import (
    AcademicMSService, ExternalServiceError, build_qr_code_data,
    compute_sla_metrics, generate_decision_pdf, generate_result_pdf, generate_verification_code,
)
from .views import _get_authenticated_user, _json_error, _read_json_object

INBOX_TERMINAL_STATUSES = {"Đã xử lý", "Từ chối", "Đã hủy", "Chờ thanh toán"}
# Đơn đã kết thúc, cán bộ xem lại qua scope=closed. "Chờ thanh toán" chưa tới tay cán bộ nên không thuộc nhóm nào
INBOX_CLOSED_STATUSES = {"Đã xử lý", "Từ chối", "Đã hủy"}
INBOX_SCOPES = ("open", "closed", "all")


def _active_department_id(req: Request):
    return req.transferred_to_dept_id or req.procedure_type.department_id


def _parse_iso_datetime(value: str):
    if not value or not isinstance(value, str):
        return None
    dt = parse_datetime(value.strip())
    if dt is None:
        d = parse_date(value.strip())
        if d is not None:
            dt = datetime(d.year, d.month, d.day, 9, 0, 0)
    if dt is None:
        return None
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt, timezone.get_current_timezone())
    return dt


@require_http_methods(["GET"])
def staff_inbox_view(request):
    """
    API 1.5: GET /api/staff/inbox — TP / CV xem hộp thư đơn cần xử lý
    scope=open (mặc định): đơn đang xử lý; scope=closed: đơn đã kết thúc; scope=all: cả hai.
    summary luôn tính trên đơn đang xử lý.
    """
    user = _get_authenticated_user(request)
    if not user:
        return _json_error("UNAUTHORIZED", "Chưa đăng nhập.", status=401)
    if user.role not in ("dept_head", "staff") or not user.department_id:
        return _json_error("FORBIDDEN", "Bạn không có quyền truy cập hộp thư cán bộ.", status=403)

    page = _parse_positive_int(request.GET.get("page"), default=1)
    limit = _parse_positive_int(request.GET.get("limit"), default=DEFAULT_LIMIT)
    if page is None or limit is None:
        return _json_error("INVALID_PARAM", "page và limit phải là số nguyên dương.", status=400)
    limit = min(limit, MAX_LIMIT)

    scope = request.GET.get("scope", "open").strip() or "open"
    if scope not in INBOX_SCOPES:
        return _json_error("INVALID_PARAM", "scope phải là open, closed hoặc all.", status=400)

    dept_filter = Q(transferred_to_dept_id=user.department_id) | Q(
        transferred_to_dept__isnull=True,
        procedure_type__department_id=user.department_id,
    )

    if _is_demo_cross_dept_staff(user):
        scoped_qs = (
            Request.objects.filter(is_draft=False)
            .select_related("procedure_type", "user", "user__student_registry", "assigned_staff")
        )
    else:
        scoped_qs = (
            Request.objects.filter(dept_filter, is_draft=False)
            .select_related("procedure_type", "user", "user__student_registry", "assigned_staff")
        )
    if user.role == "staff":
        scoped_qs = scoped_qs.filter(assigned_staff=user)

    base_qs = scoped_qs.exclude(status__in=INBOX_TERMINAL_STATUSES)

    now = timezone.now()

    # Tính summary trên toàn bộ tập đơn đang chờ xử lý trong inbox của user
    all_inbox_items = list(base_qs)
    overdue_count = 0
    due_today_count = 0
    for item in all_inbox_items:
        _, is_overdue, is_due_today = compute_sla_metrics(item, now=now)
        if is_overdue:
            overdue_count += 1
        elif is_due_today:
            due_today_count += 1

    if scope == "closed":
        filtered_qs = scoped_qs.filter(status__in=INBOX_CLOSED_STATUSES)
    elif scope == "all":
        filtered_qs = scoped_qs.exclude(status="Chờ thanh toán")
    else:
        filtered_qs = base_qs
    internal_status_param = request.GET.get("internal_status", "").strip()
    if internal_status_param:
        filtered_qs = filtered_qs.filter(internal_status=internal_status_param)

    type_id_param = request.GET.get("type_id", "").strip()
    if type_id_param:
        try:
            filtered_qs = filtered_qs.filter(procedure_type_id=int(type_id_param))
        except ValueError:
            return _json_error("INVALID_PARAM", "type_id phải là số nguyên.", status=400)

    filtered_qs = filtered_qs.order_by("-created_at", "-request_id")
    total = filtered_qs.count()
    offset = (page - 1) * limit
    page_items = filtered_qs[offset:offset + limit] if offset < total else []

    data = []
    for r in page_items:
        reg = r.user.student_registry
        is_closed = r.status in INBOX_CLOSED_STATUSES
        # Đơn đã kết thúc không còn tính SLA
        rem_hours, is_overdue, _ = (None, False, False) if is_closed else compute_sla_metrics(r, now=now)
        data.append({
            "request_id": r.request_id,
            "request_code": r.request_code,
            "type_name": r.procedure_type.name,
            "student_name": reg.full_name if reg else r.user.full_name,
            "mssv": reg.mssv if reg else (r.form_data or {}).get("mssv"),
            "status": r.status,
            "internal_status": r.internal_status,
            "is_closed": is_closed,
            "assigned_staff": {
                "user_id": r.assigned_staff.user_id,
                "full_name": r.assigned_staff.full_name,
            } if r.assigned_staff else None,
            "sla_deadline": _format_datetime(r.sla_deadline),
            "sla_remaining_hours": rem_hours,
            "is_overdue": is_overdue,
            "created_at": _format_datetime(r.created_at),
        })

    return JsonResponse({
        "success": True,
        "data": data,
        "summary": {
            "total_pending": len(all_inbox_items),
            "overdue": overdue_count,
            "due_today": due_today_count,
        },
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": ceil(total / limit) if total > 0 else 0,
        },
    })


@require_http_methods(["GET"])
def staff_department_members_view(request):
    """
    API 1.6: GET /api/staff/department-members — DS chuyên viên trong phòng ban
    """
    user = _get_authenticated_user(request)
    if not user:
        return _json_error("UNAUTHORIZED", "Chưa đăng nhập.", status=401)
    if user.role != "dept_head" or not user.department_id:
        return _json_error("FORBIDDEN", "Chỉ Trưởng phòng mới có quyền xem danh sách chuyên viên.", status=403)

    members = (
        User.objects.filter(
            department_id=user.department_id,
            role="staff",
            account_status="active",
        )
        .exclude(user_id=user.user_id)
        .order_by("user_id")
    )

    data = []
    for member in members:
        workload = (
            Request.objects.filter(assigned_staff=member, is_draft=False)
            .exclude(status__in=CLOSED_REQUEST_STATUSES)
            .count()
        )
        data.append({
            "user_id": member.user_id,
            "full_name": member.full_name,
            "email": member.email,
            "current_workload": workload,
        })

    return JsonResponse({"success": True, "data": data})


@csrf_exempt
@require_http_methods(["PUT"])
def staff_assign_request_view(request, request_id):
    """
    API 1.7: PUT /api/staff/requests/:id/assign — TP phân công CV (BR-20)
    """
    user = _get_authenticated_user(request)
    if not user:
        return _json_error("UNAUTHORIZED", "Chưa đăng nhập.", status=401)
    if user.role != "dept_head":
        return _json_error("FORBIDDEN", "Chỉ Trưởng phòng mới có quyền phân công.", status=403)

    try:
        req = Request.objects.select_related("procedure_type", "user").get(request_id=request_id)
    except Request.DoesNotExist:
        return _json_error("NOT_FOUND", "Không tìm thấy yêu cầu.", status=404)

    active_dept_id = _active_department_id(req)
    if user.department_id != active_dept_id and not _is_demo_cross_dept_staff(user):
        return _json_error("FORBIDDEN", "Bạn không có quyền phân công yêu cầu của phòng ban khác.", status=403)

    is_waiting_assign = (
        req.internal_status == "Chờ phân công"
        or (req.internal_status and req.internal_status.endswith("chờ phân công"))
    )
    if not is_waiting_assign or req.assigned_staff_id is not None:
        return _json_error("INVALID_STATE", "Yêu cầu không ở trạng thái chờ phân công.", status=422)

    body = _read_json_object(request)
    if body is None or "assigned_staff_id" not in body:
        return _json_error("INVALID_STAFF", "Thiếu thông tin chuyên viên được phân công.", status=422)

    try:
        staff_id = int(body.get("assigned_staff_id"))
    except (ValueError, TypeError):
        return _json_error("INVALID_STAFF", "Chuyên viên không hợp lệ.", status=422)

    staff = User.objects.filter(user_id=staff_id).first()
    if not staff or staff.role != "staff" or staff.account_status != "active":
        return _json_error("INVALID_STAFF", "Chuyên viên không tồn tại hoặc đã bị khóa.", status=422)

    if staff.department_id != active_dept_id and not _is_demo_cross_dept_staff(staff):
        return _json_error("INVALID_STAFF", "Chuyên viên không thuộc phòng ban phụ trách.", status=422)

    now = timezone.now()
    with transaction.atomic():
        status_before = req.internal_status
        req.assigned_staff = staff
        req.assigned_by = user
        req.assigned_at = now
        req.status = "Đang xử lý"
        req.internal_status = "CV đang thẩm định"
        req.save(update_fields=[
            "assigned_staff", "assigned_by", "assigned_at",
            "status", "internal_status", "updated_at",
        ])

        StateAuditLog.objects.create(
            request=req,
            performed_by=user,
            action="assign",
            note=f"Phân công CV {staff.full_name}",
            status_before=status_before,
            status_after="CV đang thẩm định",
        )

        Notification.objects.create(
            user=staff,
            request=req,
            title="Được phân công xử lý yêu cầu mới",
            message=f"Bạn được phân công xử lý yêu cầu {req.request_code}.",
        )
        Notification.objects.create(
            user=req.user,
            request=req,
            title="Đơn đang được xử lý",
            message=f"Đơn đang được xử lý ({req.request_code}).",
        )

    return JsonResponse({
        "success": True,
        "data": {
            "internal_status": req.internal_status,
            "assigned_staff": {
                "user_id": staff.user_id,
                "full_name": staff.full_name,
            },
        },
        "message": f"Đã phân công CV {staff.full_name}.",
    })


@csrf_exempt
@require_http_methods(["PUT"])
def staff_approve_request_view(request, request_id):
    """
    API 1.8: PUT /api/staff/requests/:id/approve — CV duyệt (thủ tục 1 cấp)
    """
    user = _get_authenticated_user(request)
    if not user:
        return _json_error("UNAUTHORIZED", "Chưa đăng nhập.", status=401)

    try:
        req = Request.objects.select_related(
            "procedure_type", "user", "user__student_registry"
        ).get(request_id=request_id)
    except Request.DoesNotExist:
        return _json_error("NOT_FOUND", "Không tìm thấy yêu cầu.", status=404)

    if user.role != "staff" or req.assigned_staff_id != user.user_id:
        return _json_error("FORBIDDEN", "Bạn không được phân công xử lý yêu cầu này.", status=403)

    if req.procedure_type.approval_levels != 1:
        return _json_error(
            "INVALID_STATE",
            "Thủ tục này yêu cầu phê duyệt nhiều cấp, không thể duyệt trực tiếp ở cấp Chuyên viên.",
            status=422,
        )

    if req.internal_status != "CV đang thẩm định":
        return _json_error("INVALID_STATE", "Yêu cầu không ở trạng thái CV đang thẩm định.", status=422)

    body = _read_json_object(request) if request.body else {}
    if body is None:
        return _json_error("INVALID_FORM_DATA", "Body JSON không hợp lệ.", status=400)
    note = (body.get("note") or "").strip() or None

    reg = req.user.student_registry
    mssv = reg.mssv if reg else (req.form_data or {}).get("mssv", "")

    # Kiểm tra qua Mock Academic MS
    try:
        status_info = AcademicMSService.get_student_status(mssv)
        if not isinstance(status_info, dict) or "status" not in status_info:
            raise ExternalServiceError("Invalid response from Academic MS")
    except Exception:
        return _json_error(
            "EXTERNAL_SERVICE_ERROR",
            "Hệ thống học vụ (Academic MS) không phản hồi.",
            status=503,
        )

    student_status = status_info.get("status")
    if req.procedure_type_id == 2:
        allowed_statuses = {"active"}
    else:
        allowed_statuses = {"active", "graduated"}

    if student_status not in allowed_statuses:
        return _json_error(
            "STUDENT_NOT_ELIGIBLE",
            "Hệ thống học vụ báo sinh viên không đủ điều kiện cấp giấy tờ.",
            status=422,
        )

    if req.procedure_type_id == 2 or "giới thiệu" in req.procedure_type.name.lower():
        try:
            curriculum = AcademicMSService.get_student_curriculum(mssv)
            if not isinstance(curriculum, list):
                raise ExternalServiceError("Invalid curriculum response")
        except Exception:
            return _json_error(
                "EXTERNAL_SERVICE_ERROR",
                "Hệ thống học vụ (Academic MS) không phản hồi.",
                status=503,
            )
        course_name = ((req.form_data or {}).get("course_name") or "").strip()
        if course_name:
            course_names = {c.get("course_name") for c in curriculum if isinstance(c, dict)}
            if course_name not in course_names and not req.attachments.filter(is_supplement=True).exists():
                return _json_error(
                    "STUDENT_NOT_ELIGIBLE",
                    "Học phần thực tập không nằm trong chương trình đào tạo.",
                    status=422,
                )

    now = timezone.now()
    try:
        with transaction.atomic():
            verification_code = generate_verification_code(req.procedure_type, now=now)
            qr_code_data = build_qr_code_data(verification_code)
            pdf_file_path = generate_result_pdf(req, verification_code, qr_code_data)

            result, _ = Result.objects.update_or_create(
                request=req,
                defaults={
                    "pdf_file_path": pdf_file_path,
                    "verification_code": verification_code,
                    "qr_code_data": qr_code_data,
                    "signed_by": user,
                    "signed_at": now,
                    "cold_storage_at": None,
                },
            )

            status_before = req.internal_status
            req.status = "Đã duyệt"
            req.internal_status = "Đã duyệt — Đang chuẩn bị kết quả"
            req.save(update_fields=["status", "internal_status", "updated_at"])

            StateAuditLog.objects.create(
                request=req,
                performed_by=user,
                action="approve",
                note=note,
                status_before=status_before,
                status_after="Đã duyệt — Đang chuẩn bị kết quả",
            )

            Notification.objects.create(
                user=req.user,
                request=req,
                title="Đơn đã được duyệt",
                message=f"Đơn đã được duyệt ({req.request_code}).",
            )
    except Exception:
        return _json_error(
            "PDF_GENERATION_FAILED",
            "Lỗi hệ thống khi tạo file PDF kết quả.",
            status=500,
        )

    return JsonResponse({
        "success": True,
        "data": {
            "internal_status": req.internal_status,
            "result": {
                "result_id": result.result_id,
                "pdf_download_url": f"/api/results/{result.result_id}/download",
                "verification_code": result.verification_code,
            },
        },
        "message": "Đã duyệt. PDF kết quả đã được tạo.",
    })


@csrf_exempt
@require_http_methods(["PUT"])
def staff_reject_request_view(request, request_id):
    """
    API 1.9: PUT /api/staff/requests/:id/reject — CV/TP từ chối yêu cầu (BR-12)
    """
    user = _get_authenticated_user(request)
    if not user:
        return _json_error("UNAUTHORIZED", "Chưa đăng nhập.", status=401)

    try:
        req = Request.objects.select_related("procedure_type", "user").get(request_id=request_id)
    except Request.DoesNotExist:
        return _json_error("NOT_FOUND", "Không tìm thấy yêu cầu.", status=404)

    if user.role == "staff":
        if req.assigned_staff_id != user.user_id:
            return _json_error("FORBIDDEN", "Bạn không được phân công xử lý yêu cầu này.", status=403)
        if req.internal_status != "CV đang thẩm định":
            return _json_error("INVALID_STATE", "Yêu cầu không ở trạng thái CV đang thẩm định.", status=422)
    elif user.role == "dept_head":
        if user.department_id != _active_department_id(req) and not _is_demo_cross_dept_staff(user):
            return _json_error("FORBIDDEN", "Bạn không có quyền xử lý yêu cầu của phòng ban khác.", status=403)
        if req.internal_status not in ("Chờ TP phê duyệt", "CV đang thẩm định"):
            return _json_error("INVALID_STATE", "Trạng thái yêu cầu không hợp lệ để từ chối.", status=422)
    else:
        return _json_error("FORBIDDEN", "Bạn không có quyền từ chối yêu cầu này.", status=403)

    body = _read_json_object(request)
    if body is None:
        return _json_error("INVALID_REASON", "Dữ liệu gửi lên không hợp lệ.", status=400)

    reason_id = body.get("reason_id")
    note_raw = body.get("note")
    note_str = note_raw.strip() if isinstance(note_raw, str) else ""

    if reason_id is not None:
        if isinstance(reason_id, bool):
            return _json_error("INVALID_REASON", "Lý do từ chối không hợp lệ.", status=400)
        try:
            rid = int(reason_id)
        except (ValueError, TypeError):
            return _json_error("INVALID_REASON", "Lý do từ chối không hợp lệ.", status=400)

        reason_obj = RejectionReason.objects.filter(reason_id=rid, is_active=True).first()
        if not reason_obj:
            return _json_error("INVALID_REASON", "Lý do từ chối không hợp lệ hoặc đã ngừng sử dụng.", status=400)

        if note_str:
            final_note = f"{reason_obj.reason_text} — {note_str}"
        else:
            final_note = reason_obj.reason_text
    else:
        if len(note_str) < 20:
            return _json_error(
                "REASON_TOO_SHORT",
                "Lý do từ chối phải có ít nhất 20 ký tự.",
                status=422,
            )
        final_note = note_str

    with transaction.atomic():
        status_before = req.internal_status
        req.status = "Từ chối"
        req.internal_status = "Từ chối"
        req.save(update_fields=["status", "internal_status", "updated_at"])

        StateAuditLog.objects.create(
            request=req,
            performed_by=user,
            action="reject",
            note=final_note,
            status_before=status_before,
            status_after="Từ chối",
        )

        Notification.objects.create(
            user=req.user,
            request=req,
            title="Yêu cầu đã bị từ chối",
            message=f"Yêu cầu {req.request_code} đã bị từ chối. Lý do: {final_note}",
        )

    return JsonResponse({
        "success": True,
        "data": {
            "status": req.status,
            "internal_status": req.internal_status,
        },
        "message": "Đã từ chối yêu cầu.",
    })


@require_http_methods(["GET"])
def rejection_reasons_view(request):
    """
    API 1.10: GET /api/rejection-reasons — Lấy danh mục lý do từ chối
    """
    user = _get_authenticated_user(request)
    if not user:
        return _json_error("UNAUTHORIZED", "Chưa đăng nhập.", status=401)
    if user.role not in ("staff", "dept_head", "admin"):
        return _json_error("FORBIDDEN", "Bạn không có quyền truy cập danh mục này.", status=403)

    reasons = RejectionReason.objects.filter(is_active=True).order_by("reason_id")
    data = [
        {"reason_id": r.reason_id, "reason_text": r.reason_text}
        for r in reasons
    ]
    return JsonResponse({"success": True, "data": data})


@csrf_exempt
@require_http_methods(["PUT"])
def staff_request_supplement_view(request, request_id):
    """
    API 1.11: PUT /api/staff/requests/:id/request-supplement — CV yêu cầu bổ sung (BR-09, BR-11)
    """
    user = _get_authenticated_user(request)
    if not user:
        return _json_error("UNAUTHORIZED", "Chưa đăng nhập.", status=401)

    try:
        req = Request.objects.select_related("user").get(request_id=request_id)
    except Request.DoesNotExist:
        return _json_error("NOT_FOUND", "Không tìm thấy yêu cầu.", status=404)

    if user.role != "staff" or req.assigned_staff_id != user.user_id:
        return _json_error("FORBIDDEN", "Bạn không được phân công xử lý yêu cầu này.", status=403)

    if req.internal_status != "CV đang thẩm định":
        return _json_error("INVALID_STATE", "Yêu cầu không ở trạng thái CV đang thẩm định.", status=422)

    if req.supplement_count >= 2:
        return _json_error(
            "MAX_SUPPLEMENTS_REACHED",
            "Đã yêu cầu bổ sung 2 lần. Phải từ chối yêu cầu.",
            status=422,
        )

    body = _read_json_object(request)
    if body is None:
        return _json_error("INVALID_FORM_DATA", "Dữ liệu gửi lên không hợp lệ.", status=400)
    note = (body.get("note") or "").strip() if isinstance(body.get("note"), str) else ""
    if not note:
        return _json_error("INVALID_FORM_DATA", "Vui lòng nhập nội dung yêu cầu bổ sung.", status=400)

    now = timezone.now()
    supplement_deadline = now + timedelta(days=5)

    with transaction.atomic():
        status_before = req.internal_status
        req.supplement_count += 1
        req.sla_paused_at = now
        req.supplement_deadline = supplement_deadline
        req.status = "Cần bổ sung"
        req.internal_status = "Cần bổ sung"
        req.save(update_fields=[
            "supplement_count", "sla_paused_at", "supplement_deadline",
            "status", "internal_status", "updated_at",
        ])

        StateAuditLog.objects.create(
            request=req,
            performed_by=user,
            action="request_supplement",
            note=note,
            status_before=status_before,
            status_after="Cần bổ sung",
        )

        Notification.objects.create(
            user=req.user,
            request=req,
            title="Yêu cầu bổ sung hồ sơ",
            message=f"Yêu cầu {req.request_code} cần bổ sung: {note}",
        )

    return JsonResponse({
        "success": True,
        "data": {
            "internal_status": req.internal_status,
            "supplement_count": req.supplement_count,
            "supplement_deadline": _format_datetime(req.supplement_deadline),
            "sla_paused_at": _format_datetime(req.sla_paused_at),
        },
        "message": "Đã gửi yêu cầu bổ sung cho SV. SLA tạm dừng.",
    })


@csrf_exempt
@require_http_methods(["PUT"])
def staff_assign_pickup_view(request, request_id):
    """
    API 1.14: PUT /api/staff/requests/:id/assign-pickup — Chỉ định lịch nhận bản cứng
    """
    user = _get_authenticated_user(request)
    if not user:
        return _json_error("UNAUTHORIZED", "Chưa đăng nhập.", status=401)

    try:
        req = Request.objects.select_related("procedure_type", "user").get(request_id=request_id)
    except Request.DoesNotExist:
        return _json_error("NOT_FOUND", "Không tìm thấy yêu cầu.", status=404)

    if user.role == "staff":
        if req.assigned_staff_id != user.user_id:
            return _json_error("FORBIDDEN", "Bạn không được phân công xử lý yêu cầu này.", status=403)
    elif user.role == "dept_head":
        if user.department_id != _active_department_id(req) and not _is_demo_cross_dept_staff(user):
            return _json_error("FORBIDDEN", "Bạn không có quyền xử lý yêu cầu của phòng ban khác.", status=403)
    else:
        return _json_error("FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.", status=403)

    if req.internal_status != "Đã duyệt — Đang chuẩn bị kết quả":
        return _json_error("INVALID_STATE", "Yêu cầu chưa ở trạng thái chuẩn bị kết quả.", status=422)

    pref = req.result_preference or (req.form_data or {}).get("result_preference")
    if pref not in ("Bản cứng", "Cả hai"):
        return _json_error(
            "INVALID_STATE",
            "Yêu cầu chỉ nhận bản điện tử, không thể hẹn lịch nhận bản cứng.",
            status=422,
        )

    result = Result.objects.filter(request=req).first()
    if not result:
        return _json_error("INVALID_STATE", "Chưa có kết quả được khởi tạo.", status=422)

    body = _read_json_object(request)
    if body is None:
        return _json_error("INVALID_FORM_DATA", "Dữ liệu gửi lên không hợp lệ.", status=400)

    pickup_date = _parse_iso_datetime(body.get("pickup_date"))
    pickup_location = (body.get("pickup_location") or "").strip() if isinstance(body.get("pickup_location"), str) else ""
    pickup_note = (body.get("pickup_note") or "").strip() if isinstance(body.get("pickup_note"), str) else ""

    if not pickup_date or not pickup_location:
        return _json_error("INVALID_FORM_DATA", "Vui lòng cung cấp ngày hẹn và địa điểm nhận bản cứng.", status=400)

    now = timezone.now()
    with transaction.atomic():
        result.pickup_date = pickup_date
        result.pickup_location = pickup_location
        result.pickup_note = pickup_note or None
        result.pickup_assigned_by = user
        result.pickup_assigned_at = now
        result.hardcopy_ready_at = now
        result.save(update_fields=[
            "pickup_date", "pickup_location", "pickup_note",
            "pickup_assigned_by", "pickup_assigned_at", "hardcopy_ready_at",
        ])

        StateAuditLog.objects.create(
            request=req,
            performed_by=user,
            action="assign_pickup",
            note=f"Hẹn nhận bản cứng tại {pickup_location} lúc {_format_datetime(pickup_date)}",
            status_before=req.internal_status,
            status_after=req.internal_status,
        )

        Notification.objects.create(
            user=req.user,
            request=req,
            title="Thông báo lịch nhận bản cứng",
            message=f"Vui lòng nhận bản cứng cho yêu cầu {req.request_code} tại {pickup_location} vào {_format_datetime(pickup_date)}.",
        )

    return JsonResponse({
        "success": True,
        "message": "Đã chỉ định lịch nhận bản cứng. SV sẽ được thông báo.",
    })


@csrf_exempt
@require_http_methods(["PUT"])
def staff_confirm_handover_view(request, request_id):
    """
    API 1.15: PUT /api/staff/requests/:id/confirm-handover — Xác nhận đã giao bản cứng
    """
    user = _get_authenticated_user(request)
    if not user:
        return _json_error("UNAUTHORIZED", "Chưa đăng nhập.", status=401)

    try:
        req = Request.objects.select_related("procedure_type", "user").get(request_id=request_id)
    except Request.DoesNotExist:
        return _json_error("NOT_FOUND", "Không tìm thấy yêu cầu.", status=404)

    if user.role == "staff":
        if req.assigned_staff_id != user.user_id:
            return _json_error("FORBIDDEN", "Bạn không được phân công xử lý yêu cầu này.", status=403)
    elif user.role == "dept_head":
        if user.department_id != _active_department_id(req) and not _is_demo_cross_dept_staff(user):
            return _json_error("FORBIDDEN", "Bạn không có quyền xử lý yêu cầu của phòng ban khác.", status=403)
    else:
        return _json_error("FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.", status=403)

    if req.internal_status != "Đã duyệt — Đang chuẩn bị kết quả":
        return _json_error("INVALID_STATE", "Yêu cầu không ở trạng thái chờ bàn giao bản cứng.", status=422)

    pref = req.result_preference or (req.form_data or {}).get("result_preference")
    if pref not in ("Bản cứng", "Cả hai"):
        return _json_error("INVALID_STATE", "Yêu cầu chỉ nhận bản điện tử.", status=422)

    result = Result.objects.filter(request=req).first()
    if not result or not result.pickup_date:
        return _json_error("INVALID_STATE", "Chưa chỉ định lịch hẹn nhận bản cứng.", status=422)

    now = timezone.now()
    with transaction.atomic():
        result.handover_confirmed_at = now
        result.confirmed_by = user
        result.save(update_fields=["handover_confirmed_at", "confirmed_by"])

        status_before = req.internal_status
        req.status = "Đã xử lý"
        req.internal_status = "Đã xử lý"
        req.save(update_fields=["status", "internal_status", "updated_at"])

        StateAuditLog.objects.create(
            request=req,
            performed_by=user,
            action="confirm_handover",
            note="Đã xác nhận bàn giao bản cứng cho sinh viên",
            status_before=status_before,
            status_after="Đã xử lý",
        )

        Notification.objects.create(
            user=req.user,
            request=req,
            title="Đã giao bản cứng",
            message=f"Yêu cầu {req.request_code} đã hoàn tất bàn giao bản cứng.",
        )

    return JsonResponse({
        "success": True,
        "data": {
            "handover_confirmed_at": _format_datetime(now),
        },
        "message": "Đã xác nhận giao bản cứng.",
    })


@csrf_exempt
@require_http_methods(["PUT"])
def staff_revoke_approval_view(request, request_id):
    """
    API 1.19: PUT /api/staff/requests/:id/revoke — Thu hồi quyết định duyệt trong 30 phút (BR-13)
    """
    user = _get_authenticated_user(request)
    if not user:
        return _json_error("UNAUTHORIZED", "Chưa đăng nhập.", status=401)

    try:
        req = Request.objects.select_related("procedure_type", "user").get(request_id=request_id)
    except Request.DoesNotExist:
        return _json_error("NOT_FOUND", "Không tìm thấy yêu cầu.", status=404)

    if user.role == "staff":
        if req.assigned_staff_id != user.user_id:
            return _json_error("FORBIDDEN", "Bạn không được phân công xử lý yêu cầu này.", status=403)
    elif user.role == "dept_head":
        if user.department_id != _active_department_id(req) and not _is_demo_cross_dept_staff(user):
            return _json_error("FORBIDDEN", "Bạn không có quyền xử lý yêu cầu của phòng ban khác.", status=403)
    else:
        return _json_error("FORBIDDEN", "Bạn không có quyền thu hồi duyệt.", status=403)

    if req.internal_status not in ("Đã duyệt — Đang chuẩn bị kết quả", "Đã xử lý"):
        return _json_error("INVALID_STATE", "Yêu cầu không ở trạng thái đã duyệt.", status=422)

    result = Result.objects.filter(request=req).first()
    if not result:
        return _json_error("INVALID_STATE", "Không tìm thấy kết quả duyệt.", status=422)

    approved_at = result.signed_at or result.created_at
    sv_downloaded = (
        AccessLog.objects.filter(request=req, user=req.user).exists()
        or StateAuditLog.objects.filter(request=req, action="download_result").exists()
    )
    is_expired = (timezone.now() - approved_at) > timedelta(minutes=30)

    if (
        req.internal_status == "Đã xử lý"
        or result.handover_confirmed_at is not None
        or sv_downloaded
        or is_expired
    ):
        return _json_error(
            "REVOKE_EXPIRED",
            "Đã quá 30 phút hoặc cấp tiếp đã xử lý.",
            status=422,
        )

    body = _read_json_object(request) if request.body else {}
    note = (body.get("note") or "").strip() if isinstance(body, dict) and isinstance(body.get("note"), str) else ""

    with transaction.atomic():
        if result.pdf_file_path and default_storage.exists(result.pdf_file_path):
            default_storage.delete(result.pdf_file_path)
        result.delete()

        status_before = req.internal_status
        req.status = "Đang xử lý"
        req.internal_status = "CV đang thẩm định"
        req.save(update_fields=["status", "internal_status", "updated_at"])

        StateAuditLog.objects.create(
            request=req,
            performed_by=user,
            action="revoke",
            note=note or "Thu hồi quyết định duyệt",
            status_before=status_before,
            status_after="CV đang thẩm định",
        )

        Notification.objects.create(
            user=req.user,
            request=req,
            title="Thu hồi quyết định duyệt",
            message=f"Quyết định duyệt của yêu cầu {req.request_code} đã được thu hồi để thẩm định lại.",
        )

    return JsonResponse({
        "success": True,
        "data": {"internal_status": req.internal_status},
        "message": "Đã thu hồi duyệt.",
    })


@csrf_exempt
@require_http_methods(["PUT", "POST"])
def staff_submit_to_head_view(request, request_id):
    """
    API 3.5 / 4.1: PUT /api/staff/requests/:id/submit-to-head — CV trình Trưởng phòng phê duyệt
    Hỗ trợ cả JSON và multipart/form-data (đính kèm biên bản phúc khảo ở màn D4).
    """
    user = _get_authenticated_user(request)
    if not user:
        return _json_error("UNAUTHORIZED", "Chưa đăng nhập.", status=401)

    try:
        req = Request.objects.select_related("procedure_type", "user", "user__student_registry").get(request_id=request_id)
    except Request.DoesNotExist:
        return _json_error("NOT_FOUND", "Không tìm thấy yêu cầu.", status=404)

    if user.role != "staff" or req.assigned_staff_id != user.user_id:
        return _json_error("FORBIDDEN", "Bạn không được phân công xử lý yêu cầu này.", status=403)

    if req.internal_status != "CV đang thẩm định":
        return _json_error("INVALID_STATE", "Yêu cầu không ở trạng thái CV đang thẩm định.", status=422)

    # Kiểm tra điều kiện GPA nếu là thủ tục bảo lưu hoặc có trường gpa
    form_data = dict(req.form_data or {})
    gpa_val = form_data.get("gpa")
    if gpa_val is not None:
        try:
            if float(gpa_val) < 2.0:
                return _json_error("INELIGIBLE_GPA", "GPA không đạt yêu cầu tối thiểu (2.0) để bảo lưu.", status=422)
        except (ValueError, TypeError):
            pass

    content_type = request.content_type or ""
    uploaded_review_file = None
    body = {}

    if content_type.startswith("multipart/form-data"):
        if request.method == "PUT":
            try:
                post_data, files_data = MultiPartParser(request.META, request, request.upload_handlers).parse()
            except Exception:
                return _json_error("INVALID_FORM_DATA", "Dữ liệu multipart không hợp lệ.", status=400)
        else:
            post_data, files_data = request.POST, request.FILES

        uploaded_review_file = files_data.get("review_file") or files_data.get("file")
        raw_review_data = post_data.get("review_data")
        parsed_review = {}
        if raw_review_data:
            try:
                parsed_review = json.loads(raw_review_data) if isinstance(raw_review_data, str) else dict(raw_review_data)
            except ValueError:
                parsed_review = {}
        body = {
            "note": post_data.get("note") or post_data.get("review_notes") or parsed_review.get("note") or "",
            "review_data": parsed_review,
            "grade_reviewer_1": post_data.get("grade_reviewer_1") or post_data.get("score_teacher_1"),
            "grade_reviewer_2": post_data.get("grade_reviewer_2") or post_data.get("score_teacher_2"),
            "final_grade": post_data.get("final_grade") or post_data.get("final_score"),
            "file_name": post_data.get("file_name"),
        }
    else:
        body = _read_json_object(request) if request.body else {}
        if body is None:
            return _json_error("INVALID_FORM_DATA", "Body JSON không hợp lệ.", status=400)

    raw_note = body.get("note") if isinstance(body.get("note"), str) else body.get("review_notes")
    note = (raw_note or "").strip() if isinstance(raw_note, str) else ""

    raw_review = body.get("review_data") if isinstance(body.get("review_data"), dict) else {}
    g1_raw = raw_review.get("grade_reviewer_1", raw_review.get("score_teacher_1", body.get("grade_reviewer_1", body.get("score_teacher_1"))))
    g2_raw = raw_review.get("grade_reviewer_2", raw_review.get("score_teacher_2", body.get("grade_reviewer_2", body.get("score_teacher_2"))))
    final_raw = raw_review.get("final_grade", raw_review.get("final_score", body.get("final_grade", body.get("final_score"))))
    file_name_raw = raw_review.get("file_name", body.get("file_name"))
    review_note_raw = raw_review.get("review_notes", raw_review.get("note", note))

    review_data = dict(form_data.get("review_data") or {}) if isinstance(form_data.get("review_data"), dict) else {}
    has_review_input = any(v is not None and str(v).strip() != "" for v in (g1_raw, g2_raw, final_raw, file_name_raw)) or uploaded_review_file is not None

    if has_review_input or req.procedure_type_id == 3:
        g1_val = None
        g2_val = None
        final_val = None
        if g1_raw is not None and str(g1_raw).strip() != "":
            try:
                g1_val = float(g1_raw)
            except (ValueError, TypeError):
                return _json_error("INVALID_FORM_DATA", "Điểm giáo viên 1 phải là số hợp lệ.", status=400)
            if g1_val < 0 or g1_val > 10:
                return _json_error("INVALID_FORM_DATA", "Điểm giáo viên 1 phải nằm trong khoảng 0 - 10.", status=400)

        if g2_raw is not None and str(g2_raw).strip() != "":
            try:
                g2_val = float(g2_raw)
            except (ValueError, TypeError):
                return _json_error("INVALID_FORM_DATA", "Điểm giáo viên 2 phải là số hợp lệ.", status=400)
            if g2_val < 0 or g2_val > 10:
                return _json_error("INVALID_FORM_DATA", "Điểm giáo viên 2 phải nằm trong khoảng 0 - 10.", status=400)

        if final_raw is not None and str(final_raw).strip() != "":
            try:
                final_val = float(final_raw)
            except (ValueError, TypeError):
                return _json_error("INVALID_FORM_DATA", "Điểm cuối phải là số hợp lệ.", status=400)
        elif g1_val is not None and g2_val is not None:
            final_val = round((g1_val + g2_val) / 2.0, 2)

        if g1_val is not None:
            review_data["grade_reviewer_1"] = g1_val
        if g2_val is not None:
            review_data["grade_reviewer_2"] = g2_val
        if final_val is not None:
            review_data["final_grade"] = final_val
        if file_name_raw:
            review_data["file_name"] = str(file_name_raw).strip()
        if review_note_raw:
            review_data["note"] = str(review_note_raw).strip()
        review_data["reviewed_by"] = user.full_name
        review_data["reviewed_at"] = _format_datetime(timezone.now())

    with transaction.atomic():
        if uploaded_review_file is not None:
            uploaded_review_file.seek(0)
            rel_path = f"attachments/req_{req.request_id}/review_{uploaded_review_file.name}"
            saved_path = default_storage.save(rel_path, ContentFile(uploaded_review_file.read()))
            att = Attachment.objects.create(
                request=req,
                config=None,
                file_name=uploaded_review_file.name,
                file_path=saved_path,
                file_size=uploaded_review_file.size,
                mime_type=getattr(uploaded_review_file, "content_type", None) or "application/octet-stream",
                is_supplement=False,
            )
            review_data["file_name"] = uploaded_review_file.name
            review_data["attachment_id"] = att.attachment_id
            review_data["download_url"] = f"/api/attachments/{att.attachment_id}/download"

        if review_data:
            form_data["review_data"] = review_data
            req.form_data = form_data

        status_before = req.internal_status
        req.internal_status = "Chờ TP phê duyệt"
        req.save(update_fields=["form_data", "internal_status", "updated_at"])

        audit_note = note
        if not audit_note and review_data.get("final_grade") is not None:
            audit_note = (
                f"Đã nhập kết quả chấm phúc khảo: GV1 = {review_data.get('grade_reviewer_1')}, "
                f"GV2 = {review_data.get('grade_reviewer_2')}, Điểm cuối = {review_data.get('final_grade')}."
            )

        StateAuditLog.objects.create(
            request=req,
            performed_by=user,
            action="submit_to_head",
            note=audit_note or "CV đã thẩm định và trình Trưởng phòng phê duyệt.",
            status_before=status_before,
            status_after="Chờ TP phê duyệt",
        )

        dept_id = _active_department_id(req)
        dept_heads = User.objects.filter(
            Q(department_id=dept_id) | Q(email__iexact="demo.truongphong@vju.ac.vn"),
            role="dept_head",
            account_status="active",
        ).distinct()
        for dh in dept_heads:
            Notification.objects.create(
                user=dh,
                request=req,
                title="Hồ sơ trình Trưởng phòng phê duyệt",
                message=f"Chuyên viên {user.full_name} đã trình hồ sơ {req.request_code} để Trưởng phòng phê duyệt.",
            )

    return JsonResponse({
        "success": True,
        "data": {
            "internal_status": req.internal_status,
            "request_id": req.request_id,
            "request_code": req.request_code,
            "review_data": review_data or None,
        },
        "message": "Đã trình Trưởng phòng phê duyệt.",
    })


@csrf_exempt
@require_http_methods(["PUT"])
def staff_approve_head_view(request, request_id):
    """
    API 3.6: PUT /api/staff/requests/:id/approve-head — Trưởng phòng phê duyệt (quy trình 2 cấp, VD: Phúc khảo điểm thi)
    """
    user = _get_authenticated_user(request)
    if not user:
        return _json_error("UNAUTHORIZED", "Chưa đăng nhập.", status=401)

    if user.role != "dept_head":
        return _json_error("FORBIDDEN", "Chỉ Trưởng phòng mới có quyền phê duyệt cấp phòng ban.", status=403)

    try:
        req = Request.objects.select_related("procedure_type", "user", "user__student_registry").get(request_id=request_id)
    except Request.DoesNotExist:
        return _json_error("NOT_FOUND", "Không tìm thấy yêu cầu.", status=404)

    active_dept_id = _active_department_id(req)
    if user.department_id != active_dept_id and not _is_demo_cross_dept_staff(user):
        return _json_error("FORBIDDEN", "Bạn không có quyền xử lý yêu cầu của phòng ban khác.", status=403)

    if req.procedure_type.approval_levels == 3:
        return _json_error(
            "INVALID_APPROVAL_LEVEL",
            "Thủ tục này yêu cầu trình Hiệu trưởng ký số, không kết thúc ở cấp Trưởng phòng.",
            status=422,
        )

    if req.internal_status not in ("Chờ TP phê duyệt", "CV đang thẩm định"):
        return _json_error("INVALID_STATE", "Yêu cầu không ở trạng thái Chờ TP phê duyệt.", status=422)

    body = _read_json_object(request) if request.body else {}
    if body is None:
        return _json_error("INVALID_FORM_DATA", "Body JSON không hợp lệ.", status=400)
    note = (body.get("note") or "").strip() if isinstance(body, dict) and isinstance(body.get("note"), str) else ""

    form_data = dict(req.form_data or {})
    review_data = form_data.get("review_data") if isinstance(form_data.get("review_data"), dict) else {}

    old_grade = form_data.get("current_grade", 6.0)
    final_grade = review_data.get("final_grade", form_data.get("final_grade"))
    if final_grade is None and req.procedure_type_id == 3:
        return _json_error(
            "MISSING_REVIEW_DATA",
            "Chuyên viên chưa nhập điểm phúc khảo để Trưởng phòng phê duyệt.",
            status=422,
        )

    reg = req.user.student_registry
    mssv = reg.mssv if reg else form_data.get("mssv", "")
    course_code = form_data.get("course_code") or form_data.get("subject") or ""

    if final_grade is not None:
        try:
            AcademicMSService.updateGrade(mssv, course_code, float(final_grade))
        except ExternalServiceError as e:
            return _json_error("EXTERNAL_SERVICE_ERROR", str(e), status=503)

    with transaction.atomic():
        status_before = req.internal_status
        if final_grade is not None:
            form_data["final_grade"] = final_grade
            req.form_data = form_data
        req.status = "Đã xử lý"
        req.internal_status = "Đã xử lý"
        req.save(update_fields=["form_data", "status", "internal_status", "updated_at"])

        default_note = (
            f"Trưởng phòng phê duyệt kết quả phúc khảo: Điểm cũ {old_grade} → Mới {final_grade}."
            if final_grade is not None
            else "Trưởng phòng đã phê duyệt yêu cầu."
        )
        StateAuditLog.objects.create(
            request=req,
            performed_by=user,
            action="approve_head",
            note=note or default_note,
            status_before=status_before,
            status_after="Đã xử lý",
        )

        if final_grade is not None:
            try:
                is_lower = float(final_grade) < float(old_grade)
            except (ValueError, TypeError):
                is_lower = False

            if is_lower:
                notif_msg = (
                    f"Kết quả phúc khảo ({req.request_code}): Điểm cũ {old_grade} → Mới {final_grade} "
                    f"(Áp dụng điểm chấm lại theo quy chế đào tạo VJU)."
                )
            else:
                notif_msg = f"Kết quả phúc khảo ({req.request_code}): Điểm cũ {old_grade} → Mới {final_grade}."
            notif_title = "Kết quả phúc khảo điểm thi"
        else:
            notif_title = "Yêu cầu đã được phê duyệt"
            notif_msg = f"Yêu cầu {req.request_code} của bạn đã được Trưởng phòng phê duyệt."

        Notification.objects.create(
            user=req.user,
            request=req,
            title=notif_title,
            message=notif_msg,
        )

    return JsonResponse({
        "success": True,
        "data": {
            "internal_status": req.internal_status,
            "status": req.status,
            "old_grade": old_grade,
            "final_grade": final_grade,
        },
        "message": "Đã phê duyệt kết quả phúc khảo.",
    })


@csrf_exempt
@require_http_methods(["PUT"])
def staff_submit_to_principal_view(request, request_id):
    """
    API 4.2: PUT /api/staff/requests/:id/submit-to-principal — TP trình Hiệu trưởng ký số SmartCA
    """
    user = _get_authenticated_user(request)
    if not user:
        return _json_error("UNAUTHORIZED", "Chưa đăng nhập.", status=401)

    if user.role != "dept_head":
        return _json_error("FORBIDDEN", "Chỉ Trưởng phòng mới có quyền trình Hiệu trưởng.", status=403)

    try:
        req = Request.objects.select_related("procedure_type", "user", "user__student_registry").get(request_id=request_id)
    except Request.DoesNotExist:
        return _json_error("NOT_FOUND", "Không tìm thấy yêu cầu.", status=404)

    active_dept_id = _active_department_id(req)
    if user.department_id != active_dept_id and not _is_demo_cross_dept_staff(user):
        return _json_error("FORBIDDEN", "Bạn không có quyền xử lý yêu cầu của phòng ban khác.", status=403)

    if req.procedure_type.approval_levels != 3:
        return _json_error("INVALID_APPROVAL_LEVEL", "Thủ tục này không yêu cầu phê duyệt cấp Hiệu trưởng.", status=422)

    if req.internal_status != "Chờ TP phê duyệt":
        return _json_error("INVALID_STATE", "Yêu cầu không ở trạng thái Chờ TP phê duyệt.", status=422)

    body = _read_json_object(request) if request.body else {}
    note = (body.get("note") or "").strip() if isinstance(body, dict) and isinstance(body.get("note"), str) else ""

    now = timezone.now()
    try:
        with transaction.atomic():
            # 1. Sinh bản thảo file PDF QĐ bảo lưu
            verification_code = generate_verification_code(req.procedure_type, now=now)
            pdf_path = generate_decision_pdf(req, verification_code, smartca_data=None)
            qr_code_data = build_qr_code_data(verification_code)

            # 2. Lưu Result
            result, _ = Result.objects.update_or_create(
                request=req,
                defaults={
                    "pdf_file_path": pdf_path,
                    "verification_code": verification_code,
                    "qr_code_data": qr_code_data,
                },
            )

            # 3. Chuyển internal_status
            status_before = req.internal_status
            req.internal_status = "Chờ HT ký số"
            req.save(update_fields=["internal_status", "updated_at"])

            # 4. StateAuditLog: action = "submit_for_signature"
            StateAuditLog.objects.create(
                request=req,
                performed_by=user,
                action="submit_for_signature",
                note=note or "Đã xác nhận GPA >= 2.0, minh chứng hợp lệ. Trình HT ký QĐ bảo lưu.",
                status_before=status_before,
                status_after="Chờ HT ký số",
            )

            # 5. Notification gửi cho HT (role='principal' hoặc user_id=50)
            principals = list(User.objects.filter(role="principal", account_status="active"))
            if not principals:
                p50 = User.objects.filter(user_id=50).first()
                if p50:
                    principals = [p50]
            for p_user in principals:
                Notification.objects.create(
                    user=p_user,
                    request=req,
                    title="Quyết định chờ ký số SmartCA",
                    message=f"Trưởng phòng {user.full_name} đã trình Quyết định bảo lưu ({req.request_code}) chờ ký số.",
                )
    except Exception as e:
        return _json_error("SUBMIT_FAILED", f"Lỗi khi tạo bản thảo quyết định trình ký: {str(e)}", status=500)

    return JsonResponse({
        "success": True,
        "data": {"internal_status": "Chờ HT ký số"},
        "message": "Đã trình Hiệu trưởng. Chờ ký số SmartCA.",
    })


@csrf_exempt
@require_http_methods(["PUT"])
def staff_return_to_staff_view(request, request_id):
    """
    API: PUT /api/staff/requests/:id/return-to-staff — TP trả lại hồ sơ cho CV thẩm định lại
    """
    user = _get_authenticated_user(request)
    if not user:
        return _json_error("UNAUTHORIZED", "Chưa đăng nhập.", status=401)

    if user.role != "dept_head":
        return _json_error("FORBIDDEN", "Chỉ Trưởng phòng mới có quyền trả lại hồ sơ cho chuyên viên.", status=403)

    try:
        req = Request.objects.select_related("procedure_type", "user", "assigned_staff").get(request_id=request_id)
    except Request.DoesNotExist:
        return _json_error("NOT_FOUND", "Không tìm thấy yêu cầu.", status=404)

    active_dept_id = _active_department_id(req)
    if user.department_id != active_dept_id and not _is_demo_cross_dept_staff(user):
        return _json_error("FORBIDDEN", "Bạn không có quyền xử lý yêu cầu của phòng ban khác.", status=403)

    if req.internal_status != "Chờ TP phê duyệt":
        return _json_error("INVALID_STATE", "Yêu cầu không ở trạng thái Chờ TP phê duyệt.", status=422)

    body = _read_json_object(request) if request.body else {}
    note = (body.get("note") or "").strip() if isinstance(body, dict) and isinstance(body.get("note"), str) else ""

    with transaction.atomic():
        status_before = req.internal_status
        req.internal_status = "CV đang thẩm định"
        req.save(update_fields=["internal_status", "updated_at"])

        StateAuditLog.objects.create(
            request=req,
            performed_by=user,
            action="return_to_staff",
            note=note or "Trưởng phòng trả lại yêu cầu để thẩm định lại.",
            status_before=status_before,
            status_after="CV đang thẩm định",
        )

        if req.assigned_staff:
            Notification.objects.create(
                user=req.assigned_staff,
                request=req,
                title="Hồ sơ được trả lại thẩm định",
                message=f"Trưởng phòng {user.full_name} đã trả lại hồ sơ {req.request_code} để thẩm định lại. Ghi chú: {note}",
            )

    return JsonResponse({
        "success": True,
        "data": {"internal_status": req.internal_status},
        "message": "Đã trả lại hồ sơ cho chuyên viên thẩm định.",
    })
