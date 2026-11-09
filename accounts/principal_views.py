from django.db import transaction
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import Notification, Request, Result, StateAuditLog, User
from .notification_views import _format_datetime
from .services import (
    AcademicMSService, MockSmartCAService, build_qr_code_data,
    generate_decision_pdf, generate_verification_code,
)
from .views import _get_authenticated_user, _json_error, _read_json_object


@require_http_methods(["GET"])
def principal_pending_signatures_view(request):
    """
    API 4.3: GET /api/principal/pending-signatures — HT xem danh sách QĐ chờ ký (BR-22)
    """
    user = _get_authenticated_user(request)
    if not user:
        return _json_error("UNAUTHORIZED", "Chưa đăng nhập.", status=401)

    if user.role != "principal":
        return _json_error("FORBIDDEN", "Chỉ Hiệu trưởng mới có quyền truy cập.", status=403)

    qs = (
        Request.objects.filter(
            internal_status="Chờ HT ký số",
            procedure_type__approval_levels=3,
            is_draft=False,
        )
        .select_related(
            "procedure_type",
            "procedure_type__department",
            "user",
            "user__student_registry",
            "assigned_staff",
        )
        .order_by("-updated_at", "-request_id")
    )

    data = []
    for r in qs:
        reg = getattr(r.user, "student_registry", None)
        student_name = reg.full_name if reg else (r.user.full_name or "Sinh viên VJU")
        mssv = reg.mssv if reg else (r.form_data or {}).get("mssv", "")

        # Tìm người trình ký từ StateAuditLog
        log = (
            StateAuditLog.objects.filter(request=r, action="submit_for_signature")
            .select_related("performed_by")
            .order_by("-log_id")
            .first()
        )
        if log and log.performed_by:
            dept_name = r.procedure_type.department.name if r.procedure_type.department else "PĐT"
            submitted_by = f"{log.performed_by.full_name} (TP {dept_name})"
            submitted_at = _format_datetime(log.created_at)
        else:
            submitted_by = "Trưởng phòng Đào tạo"
            submitted_at = _format_datetime(r.updated_at)

        sub_sla_deadline = _format_datetime(r.sla_deadline)

        # Result preview url
        result_obj = Result.objects.filter(request=r).first()
        preview_id = result_obj.result_id if result_obj else r.request_id
        pdf_preview_url = f"/api/results/{preview_id}/preview"

        data.append({
            "request_id": r.request_id,
            "request_code": r.request_code,
            "type_name": r.procedure_type.name,
            "student_name": student_name,
            "mssv": mssv,
            "submitted_by": submitted_by,
            "submitted_at": submitted_at,
            "sub_sla_deadline": sub_sla_deadline,
            "pdf_preview_url": pdf_preview_url,
            "status": r.status,
            "internal_status": r.internal_status,
            "created_at": _format_datetime(r.created_at),
        })

    return JsonResponse({"success": True, "data": data})


@csrf_exempt
@require_http_methods(["POST"])
def principal_sign_request_view(request, request_id):
    """
    API 4.4: POST /api/principal/requests/:id/sign — HT ký số SmartCA
    """
    user = _get_authenticated_user(request)
    if not user:
        return _json_error("UNAUTHORIZED", "Chưa đăng nhập.", status=401)

    if user.role != "principal":
        return _json_error("FORBIDDEN", "Chỉ Hiệu trưởng mới có quyền ký số.", status=403)

    try:
        req = Request.objects.select_related(
            "procedure_type", "user", "user__student_registry", "assigned_staff"
        ).get(request_id=request_id)
    except Request.DoesNotExist:
        return _json_error("NOT_FOUND", "Không tìm thấy yêu cầu.", status=404)

    if req.internal_status != "Chờ HT ký số":
        return _json_error("INVALID_STATE", "Hồ sơ không ở trạng thái Chờ HT ký số.", status=422)

    body = _read_json_object(request) if request.body else {}
    simulate_timeout = False
    if isinstance(body, dict):
        simulate_timeout = bool(body.get("simulate_timeout"))
    if request.GET.get("timeout") in ("1", "true", "True"):
        simulate_timeout = True

    # Test 4.4.2: Timeout SmartCA
    if simulate_timeout:
        return _json_error(
            "SMARTCA_TIMEOUT",
            "SmartCA không phản hồi trong 5 phút. Vui lòng thử lại.",
            status=504,
        )

    # Test 4.4.1: Ký thành công
    sign_data = MockSmartCAService.sign_decision(req, signer_user=user)

    with transaction.atomic():
        result, _ = Result.objects.get_or_create(request=req)
        verification_code = result.verification_code or generate_verification_code(req.procedure_type)
        qr_code_data = result.qr_code_data or build_qr_code_data(verification_code)
        pdf_file_path = generate_decision_pdf(req, verification_code, smartca_data=sign_data)

        result.verification_code = verification_code
        result.qr_code_data = qr_code_data
        result.pdf_file_path = pdf_file_path
        result.smartca_transaction_id = sign_data["smartca_transaction_id"]
        result.signed_by = user
        result.signed_at = sign_data["signed_at"]
        result.save()

        status_before = req.internal_status
        req.status = "Đã duyệt"
        req.internal_status = "Đã duyệt — Có kết quả"
        req.save(update_fields=["status", "internal_status", "updated_at"])

        # Cập nhật Academic MS: trạng thái học vụ sang suspended
        reg = getattr(req.user, "student_registry", None)
        mssv = reg.mssv if reg else (req.form_data or {}).get("mssv", "")
        if mssv:
            AcademicMSService.updateStudentStatus(mssv, "suspended")

        # StateAuditLog
        StateAuditLog.objects.create(
            request=req,
            performed_by=user,
            action="sign_smartca",
            note=f"Ký số SmartCA thành công (Mã GD: {sign_data['smartca_transaction_id']})",
            status_before=status_before,
            status_after="Đã duyệt — Có kết quả",
        )

        # Notification cho sinh viên
        Notification.objects.create(
            user=req.user,
            request=req,
            title="Quyết định đã được ký duyệt",
            message="QĐ bảo lưu đã được HT ký số.",
        )

        # Notification cho chuyên viên phụ trách
        if req.assigned_staff:
            Notification.objects.create(
                user=req.assigned_staff,
                request=req,
                title="Hồ sơ đã được ký số",
                message=f"Hồ sơ {req.request_code} đã được Hiệu trưởng ký số thành công.",
            )

    return JsonResponse({
        "success": True,
        "data": {
            "smartca_transaction_id": sign_data["smartca_transaction_id"],
            "internal_status": "Đã duyệt — Có kết quả",
            "signed_at": _format_datetime(sign_data["signed_at"]),
        },
        "message": "Ký số thành công.",
    })


@csrf_exempt
@require_http_methods(["POST", "PUT"])
def principal_return_to_head_view(request, request_id):
    """
    API: POST/PUT /api/principal/requests/:id/return-to-head — HT trả lại hồ sơ cho Trưởng phòng
    """
    user = _get_authenticated_user(request)
    if not user:
        return _json_error("UNAUTHORIZED", "Chưa đăng nhập.", status=401)

    if user.role != "principal":
        return _json_error("FORBIDDEN", "Chỉ Hiệu trưởng mới có quyền trả lại hồ sơ.", status=403)

    try:
        req = Request.objects.select_related("procedure_type", "user", "procedure_type__department").get(request_id=request_id)
    except Request.DoesNotExist:
        return _json_error("NOT_FOUND", "Không tìm thấy yêu cầu.", status=404)

    if req.internal_status != "Chờ HT ký số":
        return _json_error("INVALID_STATE", "Hồ sơ không ở trạng thái Chờ HT ký số.", status=422)

    body = _read_json_object(request) if request.body else {}
    note = (body.get("note") or "").strip() if isinstance(body, dict) and isinstance(body.get("note"), str) else ""

    with transaction.atomic():
        status_before = req.internal_status
        req.internal_status = "Chờ TP phê duyệt"
        req.save(update_fields=["internal_status", "updated_at"])

        StateAuditLog.objects.create(
            request=req,
            performed_by=user,
            action="return_to_head",
            note=note or "Hiệu trưởng trả lại hồ sơ cho Trưởng phòng.",
            status_before=status_before,
            status_after="Chờ TP phê duyệt",
        )

        dept_id = req.procedure_type.department_id
        dept_heads = User.objects.filter(role="dept_head", department_id=dept_id, account_status="active")
        for dh in dept_heads:
            Notification.objects.create(
                user=dh,
                request=req,
                title="Hồ sơ bị trả lại từ Hiệu trưởng",
                message=f"Hiệu trưởng đã trả lại hồ sơ {req.request_code} để Trưởng phòng xem xét lại. Ghi chú: {note}",
            )

    return JsonResponse({
        "success": True,
        "data": {"internal_status": req.internal_status},
        "message": "Đã trả lại hồ sơ cho Trưởng phòng.",
    })


@require_http_methods(["GET"])
def principal_decision_detail_view(request, request_id):
    """
    API: GET /api/principal/requests/:id — HT xem chi tiết hồ sơ & bản thảo quyết định
    """
    user = _get_authenticated_user(request)
    if not user:
        return _json_error("UNAUTHORIZED", "Chưa đăng nhập.", status=401)

    if user.role != "principal":
        return _json_error("FORBIDDEN", "Chỉ Hiệu trưởng mới có quyền truy cập.", status=403)

    try:
        req = (
            Request.objects.select_related(
                "procedure_type", "procedure_type__department", "user", "user__student_registry", "assigned_staff"
            )
            .prefetch_related("attachments")
            .get(request_id=request_id)
        )
    except Request.DoesNotExist:
        return _json_error("NOT_FOUND", "Không tìm thấy yêu cầu.", status=404)

    reg = getattr(req.user, "student_registry", None)
    student_name = reg.full_name if reg else req.user.full_name
    mssv = reg.mssv if reg else (req.form_data or {}).get("mssv", "")

    result_obj = Result.objects.filter(request=req).first()
    preview_id = result_obj.result_id if result_obj else req.request_id

    audit_logs = [
        {
            "action": log.action,
            "performed_by": log.performed_by.full_name if log.performed_by else None,
            "status_before": log.status_before,
            "status_after": log.status_after,
            "note": log.note,
            "created_at": _format_datetime(log.created_at),
        }
        for log in StateAuditLog.objects.filter(request=req).select_related("performed_by").order_by("log_id")
    ]

    data = {
        "request_id": req.request_id,
        "request_code": req.request_code,
        "type_id": req.procedure_type_id,
        "type_name": req.procedure_type.name,
        "department_name": req.procedure_type.department.name if req.procedure_type.department else "",
        "status": req.status,
        "internal_status": req.internal_status,
        "student": {
            "name": student_name,
            "mssv": mssv,
            "email": req.user.email,
            "class_name": reg.class_name if reg else "",
            "cohort": reg.cohort if reg else "",
            "major": reg.major if reg else "",
            "academic_status": reg.academic_status if reg else "active",
        },
        "form_data": req.form_data or {},
        "pdf_preview_url": f"/api/results/{preview_id}/preview",
        "result": {
            "result_id": result_obj.result_id if result_obj else None,
            "verification_code": result_obj.verification_code if result_obj else None,
            "smartca_transaction_id": result_obj.smartca_transaction_id if result_obj else None,
            "signed_at": _format_datetime(result_obj.signed_at) if result_obj and result_obj.signed_at else None,
        } if result_obj else None,
        "audit_logs": audit_logs,
        "created_at": _format_datetime(req.created_at),
        "updated_at": _format_datetime(req.updated_at),
        "sla_deadline": _format_datetime(req.sla_deadline),
    }

    return JsonResponse({"success": True, "data": data})
