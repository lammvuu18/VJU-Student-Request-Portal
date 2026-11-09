from datetime import date, datetime, timedelta
import json
from math import ceil
import re

from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.db import transaction
from django.db.models import Q
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import (
    AccessLog, Attachment, AttachmentConfig, Feedback, Notification, ProcedureType,
    Request, Result, StateAuditLog, User,
)
from .notification_views import DEFAULT_LIMIT, MAX_LIMIT, _format_datetime, _parse_positive_int
from .services import AcademicMSService, calculate_sla_deadline, validate_uploaded_file
from .views import _get_authenticated_user, _json_error, _read_json_object

CLOSED_REQUEST_STATUSES = {"Đã duyệt", "Đã xử lý", "Từ chối", "Đã hủy"}
ATTACHMENT_KEY_RE = re.compile(r"^attachments\[(\d+)\]\[(config_id|file)\]$")


def _can_staff_view_request(user: User, req: Request) -> bool:
    if user.role not in ("staff", "dept_head") or not user.department_id:
        return False
    allowed_dept_ids = {req.procedure_type.department_id}
    if req.transferred_to_dept_id:
        allowed_dept_ids.add(req.transferred_to_dept_id)
    return user.department_id in allowed_dept_ids


def _extract_attachments_from_request(http_request):
    """
    Trích xuất danh sách (config_id_raw, uploaded_file) từ multipart/form-data:
      attachments[0][config_id], attachments[0][file]
    """
    indices = set()
    config_by_idx = {}
    file_by_idx = {}

    for key, val in http_request.POST.items():
        m = ATTACHMENT_KEY_RE.match(key)
        if m:
            idx = int(m.group(1))
            indices.add(idx)
            if m.group(2) == "config_id":
                config_by_idx[idx] = val

    for key, f in http_request.FILES.items():
        m = ATTACHMENT_KEY_RE.match(key)
        if m:
            idx = int(m.group(1))
            indices.add(idx)
            if m.group(2) == "file":
                file_by_idx[idx] = f

    if not indices and ("config_id" in http_request.POST or "file" in http_request.FILES):
        indices.add(0)
        if "config_id" in http_request.POST:
            config_by_idx[0] = http_request.POST.get("config_id")
        if "file" in http_request.FILES:
            file_by_idx[0] = http_request.FILES.get("file")

    items = []
    for idx in sorted(indices):
        items.append((config_by_idx.get(idx), file_by_idx.get(idx)))
    return items


def _resolve_auto_fill_value(auto_fill_key: str, user: User, form_data: dict):
    reg = user.student_registry
    mssv = reg.mssv if reg else ""
    mapping = {
        "student.full_name": reg.full_name if reg else user.full_name,
        "student.mssv": mssv,
        "student.class_name": reg.class_name if reg else "",
        "student.cohort": reg.cohort if reg else "",
        "student.major": reg.major if reg else "",
        "student.email": user.email,
    }
    if auto_fill_key in mapping:
        return mapping[auto_fill_key]
    if auto_fill_key == "academic_ms.grade":
        course_code = str(form_data.get("course_code") or form_data.get("subject") or "")
        return AcademicMSService.get_grade(mssv, course_code).get("grade")
    if auto_fill_key == "academic_ms.gpa":
        return AcademicMSService.get_student_gpa(mssv)
    return None


def _is_conditionally_required(field, form_data: dict, procedure: ProcedureType) -> bool:
    req_if = field.required_if
    if isinstance(req_if, dict) and req_if:
        if "field_key" in req_if and "value" in req_if:
            return form_data.get(req_if["field_key"]) == req_if["value"]
        return all(form_data.get(k) == v for k, v in req_if.items())

    if procedure.type_id == 1 and field.field_key in ("ho_khau", "noi_dk_nvqs"):
        return form_data.get("purpose") == "Tạm hoãn NVQS"
    return False


def _generate_request_code(now: datetime) -> str:
    date_str = timezone.localtime(now).strftime("%Y%m%d")
    prefix = f"REQ-{date_str}-"
    existing_codes = Request.objects.filter(request_code__startswith=prefix).values_list(
        "request_code", flat=True
    )
    max_seq = 0
    for code in existing_codes:
        suffix = code[len(prefix):]
        if suffix.isdigit():
            max_seq = max(max_seq, int(suffix))
    return f"{prefix}{max_seq + 1:03d}"


@csrf_exempt
@require_http_methods(["GET", "POST"])
def requests_collection_view(request):
    if request.method == "GET":
        return _student_request_list(request)
    return _student_create_request(request)


def _student_request_list(request):
    """
    API 1.2: GET /api/requests — SV xem danh sách đơn của mình
    """
    user = _get_authenticated_user(request)
    if not user:
        return _json_error("UNAUTHORIZED", "Chưa đăng nhập.", status=401)
    if user.role != "student":
        return _json_error("FORBIDDEN", "Chỉ sinh viên mới có thể truy cập danh sách này.", status=403)

    page = _parse_positive_int(request.GET.get("page"), default=1)
    limit = _parse_positive_int(request.GET.get("limit"), default=DEFAULT_LIMIT)
    if page is None or limit is None:
        return _json_error("INVALID_PARAM", "page và limit phải là số nguyên dương.", status=400)
    limit = min(limit, MAX_LIMIT)

    qs = (
        Request.objects.filter(user=user, is_draft=False)
        .select_related("procedure_type", "procedure_type__department")
    )

    status_param = request.GET.get("status", "").strip()
    if status_param:
        qs = qs.filter(status=status_param)

    type_id_param = request.GET.get("type_id", "").strip()
    if type_id_param:
        try:
            qs = qs.filter(procedure_type_id=int(type_id_param))
        except ValueError:
            return _json_error("INVALID_PARAM", "type_id phải là số nguyên.", status=400)

    qs = qs.order_by("-created_at", "-request_id")
    total = qs.count()
    offset = (page - 1) * limit
    items = qs[offset:offset + limit] if offset < total else []

    data = [
        {
            "request_id": r.request_id,
            "request_code": r.request_code,
            "type_name": r.procedure_type.name,
            "department_name": r.procedure_type.department.name if r.procedure_type.department else None,
            "status": r.status,
            "internal_status": r.internal_status,
            "created_at": _format_datetime(r.created_at),
            "sla_deadline": _format_datetime(r.sla_deadline),
            "is_fee_required": r.procedure_type.is_fee_required,
        }
        for r in items
    ]

    return JsonResponse({
        "success": True,
        "data": data,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": ceil(total / limit) if total > 0 else 0,
        },
    })


def _student_create_request(request):
    """
    API 1.1: POST /api/requests — SV gửi yêu cầu mới
    Thứ tự kiểm tra: Token → vai trò → thủ tục → dữ liệu form → file → chống trùng → giới hạn 5 đơn
    """
    # 1. Token
    user = _get_authenticated_user(request)
    if not user:
        return _json_error("UNAUTHORIZED", "Chưa đăng nhập.", status=401)

    # 2. Vai trò
    if user.role != "student":
        return _json_error("FORBIDDEN", "Chỉ sinh viên mới được gửi yêu cầu.", status=403)

    # Đọc dữ liệu từ multipart/form-data hoặc JSON
    content_type = request.content_type or ""
    if "application/json" in content_type:
        body = _read_json_object(request)
        if body is None:
            return _json_error("INVALID_FORM_DATA", "Dữ liệu gửi lên không hợp lệ.", status=400)
        type_id_raw = body.get("type_id")
        form_data_raw = body.get("form_data")
    else:
        type_id_raw = request.POST.get("type_id")
        form_data_raw = request.POST.get("form_data")

    # 3. Thủ tục
    if type_id_raw is None or str(type_id_raw).strip() == "":
        return _json_error("INVALID_FORM_DATA", "Thiếu thông tin thủ tục (type_id).", status=400)
    try:
        type_id = int(type_id_raw)
    except (ValueError, TypeError):
        return _json_error("NOT_FOUND", "Không tìm thấy thủ tục.", status=404)

    try:
        procedure = (
            ProcedureType.objects.select_related("department")
            .prefetch_related("form_fields", "attachment_configs")
            .get(type_id=type_id)
        )
    except ProcedureType.DoesNotExist:
        return _json_error("NOT_FOUND", "Không tìm thấy thủ tục.", status=404)

    if not procedure.is_active or not procedure.department or not procedure.department.is_active:
        return _json_error("PROCEDURE_INACTIVE", "Thủ tục không khả dụng.", status=404)

    # 4. Dữ liệu form
    if isinstance(form_data_raw, str):
        try:
            parsed_form_data = json.loads(form_data_raw)
        except ValueError:
            return _json_error("INVALID_FORM_DATA", "form_data phải là JSON hợp lệ.", status=400)
    elif isinstance(form_data_raw, dict):
        parsed_form_data = dict(form_data_raw)
    else:
        return _json_error("INVALID_FORM_DATA", "Thiếu hoặc sai định dạng form_data.", status=400)

    if not isinstance(parsed_form_data, dict):
        return _json_error("INVALID_FORM_DATA", "form_data phải là JSON object.", status=400)

    cleaned_form_data = dict(parsed_form_data)

    # Thủ tục giấy giới thiệu thực tập (type_id = 2) luôn nhận Bản cứng
    if procedure.type_id == 2 or "giới thiệu" in procedure.name.lower():
        cleaned_form_data["result_preference"] = "Bản cứng"

    # Thủ tục bảo lưu KQHT (type_id = 4): auto-fill GPA từ Academic MS nếu chưa có
    if procedure.type_id == 4 and ("gpa" not in cleaned_form_data or cleaned_form_data.get("gpa") is None):
        reg = getattr(user, "student_registry", None)
        mssv = reg.mssv if reg else ""
        cleaned_form_data["gpa"] = AcademicMSService.get_student_gpa(mssv)

    form_fields = list(procedure.form_fields.all().order_by("display_order", "field_id"))
    for field in form_fields:
        if field.auto_fill_field:
            cleaned_form_data[field.field_key] = _resolve_auto_fill_value(
                field.auto_fill_field, user, cleaned_form_data
            )
            continue

        is_req = bool(field.is_required) or _is_conditionally_required(field, cleaned_form_data, procedure)
        val = cleaned_form_data.get(field.field_key)
        is_empty = val is None or (isinstance(val, str) and not val.strip())

        if is_req and is_empty:
            return _json_error(
                "INVALID_FORM_DATA",
                f"Trường '{field.field_name}' ({field.field_key}) là bắt buộc.",
                status=400,
            )

        if not is_empty:
            if field.data_type in ("dropdown", "radio") and field.dropdown_options:
                if val not in field.dropdown_options:
                    return _json_error(
                        "INVALID_FORM_DATA",
                        f"Giá trị của '{field.field_name}' không nằm trong danh sách cho phép.",
                        status=400,
                    )
            elif field.data_type == "number":
                if isinstance(val, bool):
                    return _json_error("INVALID_FORM_DATA", f"Trường '{field.field_name}' phải là số.", status=400)
                try:
                    float(val)
                except (ValueError, TypeError):
                    return _json_error("INVALID_FORM_DATA", f"Trường '{field.field_name}' phải là số.", status=400)
            elif field.data_type == "date":
                try:
                    date.fromisoformat(str(val))
                except ValueError:
                    return _json_error(
                        "INVALID_FORM_DATA",
                        f"Trường '{field.field_name}' phải có định dạng YYYY-MM-DD.",
                        status=400,
                    )

    if procedure.type_id == 2:
        from_str = cleaned_form_data.get("internship_from")
        to_str = cleaned_form_data.get("internship_to")
        if from_str and to_str:
            if date.fromisoformat(str(to_str)) < date.fromisoformat(str(from_str)):
                return _json_error(
                    "INVALID_FORM_DATA",
                    "Ngày kết thúc thực tập phải sau hoặc bằng ngày bắt đầu thực tập.",
                    status=400,
                )

    # 5. Kiểm tra file đính kèm
    configs_by_id = {c.config_id: c for c in procedure.attachment_configs.all()}
    raw_attachments = _extract_attachments_from_request(request)
    validated_attachments = []
    uploaded_config_ids = set()

    for config_id_raw, uploaded_file in raw_attachments:
        if config_id_raw is None or str(config_id_raw).strip() == "":
            return _json_error("INVALID_ATTACHMENT", "Thiếu config_id cho file đính kèm.", status=400)
        try:
            cid = int(config_id_raw)
        except (ValueError, TypeError):
            return _json_error("INVALID_ATTACHMENT", "config_id không hợp lệ.", status=400)

        config = configs_by_id.get(cid)
        if not config:
            if (procedure.type_id if "procedure" in locals() else req.procedure_type_id) == 4 and cid == 4:
                config = AttachmentConfig.objects.filter(config_id=4).first()
            if not config:
                return _json_error("INVALID_ATTACHMENT", "config_id không thuộc thủ tục này.", status=400)

        err_code, err_msg, mime_type = validate_uploaded_file(uploaded_file, config)
        if err_code:
            return _json_error(err_code, err_msg, status=400)

        uploaded_config_ids.add(cid)
        validated_attachments.append((config, uploaded_file, mime_type))

    for config in procedure.attachment_configs.filter(is_required=True).order_by("display_order", "config_id"):
        if config.config_id not in uploaded_config_ids:
            return _json_error(
                "MISSING_ATTACHMENT",
                f"Thiếu tài liệu đính kèm bắt buộc: {config.item_name}.",
                status=400,
            )

    # 6. Chống trùng (BR-04)
    has_duplicate = (
        Request.objects.filter(user=user, procedure_type=procedure, is_draft=False)
        .exclude(status__in=CLOSED_REQUEST_STATUSES)
        .exists()
    )
    if has_duplicate:
        return _json_error(
            "DUPLICATE_REQUEST",
            f"Bạn đã có yêu cầu {procedure.name} đang xử lý.",
            status=409,
        )

    # 7. Giới hạn 5 đơn/ngày (BR-05, tính theo ngày Việt Nam, gồm cả đơn đã hủy)
    now = timezone.now()
    now_local = timezone.localtime(now)
    start_of_day = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day + timedelta(days=1)

    today_count = Request.objects.filter(
        user=user,
        is_draft=False,
        created_at__gte=start_of_day,
        created_at__lt=end_of_day,
    ).count()
    if today_count >= 5:
        return _json_error(
            "RATE_LIMIT_EXCEEDED",
            "Đã đạt giới hạn 5 yêu cầu/ngày.",
            status=409,
        )

    # 8. Lưu Request, Attachment, StateAuditLog, Notification
    with transaction.atomic():
        request_code = _generate_request_code(now)
        if procedure.is_fee_required:
            req_status = "Chờ thanh toán"
            req_internal_status = "Chờ thanh toán"
            sla_deadline = None
        else:
            req_status = "Đã gửi"
            req_internal_status = "Chờ phân công"
            sla_deadline = calculate_sla_deadline(now, procedure.sla_total_days)

        req_obj = Request.objects.create(
            request_code=request_code,
            user=user,
            procedure_type=procedure,
            status=req_status,
            internal_status=req_internal_status,
            form_data=cleaned_form_data,
            purpose=cleaned_form_data.get("purpose"),
            result_preference=cleaned_form_data.get("result_preference"),
            sla_deadline=sla_deadline,
            is_draft=False,
        )

        for config, uploaded_file, mime_type in validated_attachments:
            uploaded_file.seek(0)
            rel_path = f"attachments/req_{req_obj.request_id}/{uploaded_file.name}"
            saved_path = default_storage.save(rel_path, ContentFile(uploaded_file.read()))
            Attachment.objects.create(
                request=req_obj,
                config=config,
                file_name=uploaded_file.name,
                file_path=saved_path,
                file_size=uploaded_file.size,
                mime_type=mime_type,
                is_supplement=False,
            )

        StateAuditLog.objects.create(
            request=req_obj,
            performed_by=user,
            action="submit",
            note=None,
            status_before=None,
            status_after=req_internal_status,
        )

        Notification.objects.create(
            user=user,
            request=req_obj,
            title="Đơn đã được tiếp nhận",
            message=f"Đơn đã được tiếp nhận ({req_obj.request_code} - {procedure.name}).",
        )

        dept_heads = User.objects.filter(
            department=procedure.department,
            role="dept_head",
            account_status="active",
        )
        for head in dept_heads:
            Notification.objects.create(
                user=head,
                request=req_obj,
                title="Có đơn mới chờ phân công",
                message=f"Có đơn mới chờ phân công: {req_obj.request_code} ({procedure.name}).",
            )

    if procedure.is_fee_required:
        payment_deadline = now + timedelta(hours=24)
        return JsonResponse({
            "success": True,
            "data": {
                "request_id": req_obj.request_id,
                "request_code": req_obj.request_code,
                "status": req_obj.status,
                "internal_status": req_obj.internal_status,
                "fee_amount": int(procedure.fee_amount),
                "payment_deadline": _format_datetime(payment_deadline),
                "created_at": _format_datetime(req_obj.created_at),
            },
            "message": "Gửi yêu cầu thành công. Vui lòng thanh toán lệ phí để tiếp tục.",
        }, status=201)

    return JsonResponse({
        "success": True,
        "data": {
            "request_id": req_obj.request_id,
            "request_code": req_obj.request_code,
            "status": req_obj.status,
            "internal_status": req_obj.internal_status,
            "sla_deadline": _format_datetime(req_obj.sla_deadline),
            "created_at": _format_datetime(req_obj.created_at),
        },
        "message": "Gửi yêu cầu thành công.",
    }, status=201)


@require_http_methods(["GET"])
def request_detail_view(request, request_id):
    """
    API 1.3: GET /api/requests/:id — Chi tiết đơn
    """
    user = _get_authenticated_user(request)
    if not user:
        return _json_error("UNAUTHORIZED", "Chưa đăng nhập.", status=401)

    try:
        req = (
            Request.objects.select_related(
                "user",
                "user__student_registry",
                "procedure_type",
                "procedure_type__department",
                "assigned_staff",
                "assigned_by",
                "transferred_to_dept",
            )
            .prefetch_related("attachments__config")
            .get(request_id=request_id)
        )
    except Request.DoesNotExist:
        return _json_error("NOT_FOUND", "Không tìm thấy yêu cầu.", status=404)

    if user.role == "student":
        if req.user_id != user.user_id:
            return _json_error("FORBIDDEN", "Bạn không có quyền xem yêu cầu này.", status=403)
    elif user.role in ("staff", "dept_head"):
        if not _can_staff_view_request(user, req):
            return _json_error("FORBIDDEN", "Bạn không có quyền xem yêu cầu này.", status=403)
        AccessLog.objects.get_or_create(request=req, user=user)
    else:
        return _json_error("FORBIDDEN", "Bạn không có quyền xem yêu cầu này.", status=403)

    reg = req.user.student_registry
    student_info = {
        "full_name": reg.full_name if reg else req.user.full_name,
        "mssv": reg.mssv if reg else None,
        "class_name": reg.class_name if reg else None,
        "cohort": reg.cohort if reg else None,
        "major": reg.major if reg else None,
        "email": req.user.email,
    }

    result_obj = Result.objects.select_related("signed_by").filter(request=req).first()
    result_data = None
    if result_obj:
        result_data = {
            "result_id": result_obj.result_id,
            "pdf_download_url": f"/api/results/{result_obj.result_id}/download",
            "verification_code": result_obj.verification_code,
            "signed_by": result_obj.signed_by.full_name if result_obj.signed_by else None,
            "signed_at": _format_datetime(result_obj.signed_at),
            "pickup_date": _format_datetime(result_obj.pickup_date),
            "pickup_location": result_obj.pickup_location,
            "pickup_note": result_obj.pickup_note,
            "handover_confirmed_at": _format_datetime(result_obj.handover_confirmed_at),
        }

    attachments_data = [
        {
            "attachment_id": a.attachment_id,
            "config_id": a.config_id,
            "item_name": a.config.item_name if a.config else None,
            "file_name": a.file_name,
            "file_size": a.file_size,
            "mime_type": a.mime_type,
            "is_supplement": a.is_supplement,
            "download_url": f"/api/attachments/{a.attachment_id}/download",
            "uploaded_at": _format_datetime(a.uploaded_at),
        }
        for a in req.attachments.all().order_by("attachment_id")
    ]

    mssv = reg.mssv if reg else (req.form_data or {}).get("mssv", "")
    academic_check = None
    try:
        status_info = AcademicMSService.get_student_status(mssv) if mssv else {"status": "unknown"}
        academic_status = status_info.get("status", "unknown") if isinstance(status_info, dict) else "unknown"
        academic_check = {
            "student_status": academic_status,
            "is_status_eligible": (
                academic_status == "active"
                if req.procedure_type_id == 2
                else academic_status in ("active", "graduated")
            ),
        }
        if req.procedure_type_id == 2 or "giới thiệu" in req.procedure_type.name.lower():
            curriculum = AcademicMSService.get_student_curriculum(mssv) if mssv else []
            course_name = ((req.form_data or {}).get("course_name") or "").strip()
            matched_course = next(
                (c for c in curriculum if isinstance(c, dict) and c.get("course_name") == course_name),
                None,
            )
            academic_check["course_name"] = course_name
            academic_check["course_in_curriculum"] = matched_course is not None
            academic_check["matched_course"] = matched_course
            academic_check["curriculum"] = curriculum
    except Exception:
        academic_check = None

    data = {
        "request_id": req.request_id,
        "request_code": req.request_code,
        "type_id": req.procedure_type_id,
        "type_name": req.procedure_type.name,
        "department_name": req.procedure_type.department.name if req.procedure_type.department else None,
        "status": req.status,
        "internal_status": req.internal_status,
        "form_data": req.form_data or {},
        "result_preference": req.result_preference or (req.form_data or {}).get("result_preference"),
        "academic_check": academic_check,
        "student": student_info,
        "assigned_staff": {
            "user_id": req.assigned_staff.user_id,
            "full_name": req.assigned_staff.full_name,
        } if req.assigned_staff else None,
        "assigned_by": {
            "user_id": req.assigned_by.user_id,
            "full_name": req.assigned_by.full_name,
        } if req.assigned_by else None,
        "attachments": attachments_data,
        "payment": {"is_required": req.procedure_type.is_fee_required},
        "result": result_data,
        "supplement_count": req.supplement_count,
        "sla_deadline": _format_datetime(req.sla_deadline),
        "transferred_to_dept": {
            "dept_id": req.transferred_to_dept.dept_id,
            "name": req.transferred_to_dept.name,
        } if req.transferred_to_dept else None,
        "is_draft": req.is_draft,
        "created_at": _format_datetime(req.created_at),
        "updated_at": _format_datetime(req.updated_at),
    }

    return JsonResponse({"success": True, "data": data})


@csrf_exempt
@require_http_methods(["PUT"])
def request_cancel_view(request, request_id):
    """
    API 1.4: PUT /api/requests/:id/cancel — SV hủy đơn khi chưa phân công (BR-06)
    """
    user = _get_authenticated_user(request)
    if not user:
        return _json_error("UNAUTHORIZED", "Chưa đăng nhập.", status=401)

    try:
        req = Request.objects.get(request_id=request_id)
    except Request.DoesNotExist:
        return _json_error("NOT_FOUND", "Không tìm thấy yêu cầu.", status=404)

    if user.role != "student" or req.user_id != user.user_id:
        return _json_error("FORBIDDEN", "Bạn không có quyền hủy yêu cầu này.", status=403)

    if req.internal_status != "Chờ phân công":
        return _json_error(
            "CANNOT_CANCEL",
            "Không thể hủy — yêu cầu đã được phân công xử lý.",
            status=422,
        )

    with transaction.atomic():
        status_before = req.internal_status
        req.status = "Đã hủy"
        req.internal_status = "Đã hủy"
        req.save(update_fields=["status", "internal_status", "updated_at"])

        StateAuditLog.objects.create(
            request=req,
            performed_by=user,
            action="cancel",
            note="Sinh viên hủy yêu cầu",
            status_before=status_before,
            status_after="Đã hủy",
        )

    return JsonResponse({
        "success": True,
        "message": "Đã hủy yêu cầu.",
    })


@csrf_exempt
@require_http_methods(["POST"])
def request_supplements_view(request, request_id):
    """
    API 1.12: POST /api/requests/:id/supplements — SV nộp bổ sung minh chứng
    """
    user = _get_authenticated_user(request)
    if not user:
        return _json_error("UNAUTHORIZED", "Chưa đăng nhập.", status=401)

    try:
        req = Request.objects.select_related("procedure_type", "assigned_staff").prefetch_related(
            "procedure_type__attachment_configs"
        ).get(request_id=request_id)
    except Request.DoesNotExist:
        return _json_error("NOT_FOUND", "Không tìm thấy yêu cầu.", status=404)

    if user.role != "student" or req.user_id != user.user_id:
        return _json_error("FORBIDDEN", "Bạn không có quyền nộp bổ sung cho yêu cầu này.", status=403)

    if req.internal_status != "Cần bổ sung":
        return _json_error("INVALID_STATE", "Yêu cầu không ở trạng thái cần bổ sung.", status=422)

    configs_by_id = {c.config_id: c for c in req.procedure_type.attachment_configs.all()}
    raw_attachments = _extract_attachments_from_request(request)
    if not raw_attachments:
        return _json_error("MISSING_ATTACHMENT", "Vui lòng đính kèm tài liệu bổ sung.", status=400)

    validated_attachments = []
    for config_id_raw, uploaded_file in raw_attachments:
        if config_id_raw is None or str(config_id_raw).strip() == "":
            return _json_error("INVALID_ATTACHMENT", "Thiếu config_id cho file đính kèm.", status=400)
        try:
            cid = int(config_id_raw)
        except (ValueError, TypeError):
            return _json_error("INVALID_ATTACHMENT", "config_id không hợp lệ.", status=400)

        config = configs_by_id.get(cid)
        if not config:
            if (procedure.type_id if "procedure" in locals() else req.procedure_type_id) == 4 and cid == 4:
                config = AttachmentConfig.objects.filter(config_id=4).first()
            if not config:
                return _json_error("INVALID_ATTACHMENT", "config_id không thuộc thủ tục này.", status=400)

        err_code, err_msg, mime_type = validate_uploaded_file(uploaded_file, config)
        if err_code:
            return _json_error(err_code, err_msg, status=400)

        validated_attachments.append((config, uploaded_file, mime_type))

    now = timezone.now()
    with transaction.atomic():
        for config, uploaded_file, mime_type in validated_attachments:
            uploaded_file.seek(0)
            rel_path = f"attachments/req_{req.request_id}/supp_{req.supplement_count}_{uploaded_file.name}"
            saved_path = default_storage.save(rel_path, ContentFile(uploaded_file.read()))
            Attachment.objects.create(
                request=req,
                config=config,
                file_name=uploaded_file.name,
                file_path=saved_path,
                file_size=uploaded_file.size,
                mime_type=mime_type,
                is_supplement=True,
            )

        status_before = req.internal_status
        if req.sla_paused_at and req.sla_deadline:
            paused_duration = now - req.sla_paused_at
            req.sla_deadline = req.sla_deadline + paused_duration

        req.sla_paused_at = None
        req.supplement_deadline = None
        req.status = "Đang xử lý"
        req.internal_status = "CV đang thẩm định"
        req.save(update_fields=[
            "sla_deadline", "sla_paused_at", "supplement_deadline",
            "status", "internal_status", "updated_at",
        ])

        StateAuditLog.objects.create(
            request=req,
            performed_by=user,
            action="submit_supplement",
            note="SV đã nộp bổ sung hồ sơ",
            status_before=status_before,
            status_after="CV đang thẩm định",
        )

        if req.assigned_staff:
            Notification.objects.create(
                user=req.assigned_staff,
                request=req,
                title="SV đã nộp bổ sung",
                message=f"SV đã nộp bổ sung cho yêu cầu {req.request_code}.",
            )

    return JsonResponse({
        "success": True,
        "data": {
            "supplement_count": req.supplement_count,
            "status": req.status,
            "internal_status": req.internal_status,
        },
        "message": "Nộp bổ sung thành công. SLA tiếp tục tính.",
    })


@require_http_methods(["GET"])
def request_timeline_view(request, request_id):
    """
    API 1.13: GET /api/requests/:id/timeline — Timeline trạng thái
    """
    user = _get_authenticated_user(request)
    if not user:
        return _json_error("UNAUTHORIZED", "Chưa đăng nhập.", status=401)

    try:
        req = Request.objects.select_related("procedure_type").get(request_id=request_id)
    except Request.DoesNotExist:
        return _json_error("NOT_FOUND", "Không tìm thấy yêu cầu.", status=404)

    if user.role == "student":
        if req.user_id != user.user_id:
            return _json_error("FORBIDDEN", "Bạn không có quyền xem yêu cầu này.", status=403)
    elif user.role in ("staff", "dept_head"):
        if not _can_staff_view_request(user, req):
            return _json_error("FORBIDDEN", "Bạn không có quyền xem yêu cầu này.", status=403)
    else:
        return _json_error("FORBIDDEN", "Bạn không có quyền xem yêu cầu này.", status=403)

    logs = req.audit_logs.select_related("performed_by").order_by("created_at", "log_id")
    data = [
        {
            "action": log.action,
            "note": log.note,
            "status_after": log.status_after,
            "performed_by": log.performed_by.full_name if log.performed_by else "Hệ thống",
            "created_at": _format_datetime(log.created_at),
        }
        for log in logs
    ]
    return JsonResponse({"success": True, "data": data})


@csrf_exempt
@require_http_methods(["POST"])
def request_feedback_view(request, request_id):
    """
    API 1.17: POST /api/requests/:id/feedback — SV đánh giá dịch vụ
    """
    user = _get_authenticated_user(request)
    if not user:
        return _json_error("UNAUTHORIZED", "Chưa đăng nhập.", status=401)

    try:
        req = Request.objects.get(request_id=request_id)
    except Request.DoesNotExist:
        return _json_error("NOT_FOUND", "Không tìm thấy yêu cầu.", status=404)

    if user.role != "student" or req.user_id != user.user_id:
        return _json_error("FORBIDDEN", "Bạn không có quyền đánh giá yêu cầu này.", status=403)

    if req.status != "Đã xử lý" and req.internal_status != "Đã xử lý":
        return _json_error("INVALID_STATE", "Chỉ có thể đánh giá khi yêu cầu đã xử lý xong.", status=422)

    if Feedback.objects.filter(request=req).exists():
        return _json_error("ALREADY_RATED", "Bạn đã đánh giá yêu cầu này rồi.", status=409)

    body = _read_json_object(request)
    if body is None:
        return _json_error("INVALID_FORM_DATA", "Dữ liệu đánh giá không hợp lệ.", status=400)

    score_keys = ("star_rating", "speed_score", "attitude_score", "convenience_score")
    scores = {}
    for k in score_keys:
        val = body.get(k)
        if val is None or isinstance(val, bool):
            return _json_error("INVALID_FORM_DATA", f"Thiếu hoặc sai kiểu dữ liệu cho {k}.", status=400)
        try:
            fval = float(val)
        except (ValueError, TypeError):
            return _json_error("INVALID_FORM_DATA", f"Điểm {k} phải là số.", status=400)
        if fval < 1.0 or fval > 5.0:
            return _json_error("INVALID_FORM_DATA", "Điểm đánh giá phải nằm trong khoảng từ 1 đến 5.", status=400)
        scores[k] = fval

    comment_text = body.get("comment_text")
    if comment_text is not None and not isinstance(comment_text, str):
        return _json_error("INVALID_FORM_DATA", "comment_text phải là chuỗi.", status=400)

    Feedback.objects.create(
        request=req,
        user=user,
        star_rating=scores["star_rating"],
        speed_score=scores["speed_score"],
        attitude_score=scores["attitude_score"],
        convenience_score=scores["convenience_score"],
        comment_text=comment_text or "",
    )

    return JsonResponse({
        "success": True,
        "message": "Cảm ơn bạn đã đánh giá!",
    }, status=201)


@require_http_methods(["GET"])
def result_download_view(request, result_id):
    """
    API 1.16: GET /api/results/:id/download — Tải PDF kết quả
    """
    user = _get_authenticated_user(request)
    if not user:
        return _json_error("UNAUTHORIZED", "Chưa đăng nhập.", status=401)

    result = Result.objects.select_related(
        "request", "request__procedure_type"
    ).filter(Q(result_id=result_id) | Q(request_id=result_id)).first()
    if not result:
        return _json_error("NOT_FOUND", "Không tìm thấy kết quả.", status=404)

    req = result.request
    if user.role == "student":
        if req.user_id != user.user_id:
            return _json_error("FORBIDDEN", "Bạn không có quyền tải kết quả này.", status=403)
    elif user.role in ("staff", "dept_head"):
        if not _can_staff_view_request(user, req):
            return _json_error("FORBIDDEN", "Bạn không có quyền tải kết quả này.", status=403)
    elif user.role in ("principal", "admin"):
        pass
    else:
        return _json_error("FORBIDDEN", "Bạn không có quyền tải kết quả này.", status=403)

    if result.cold_storage_at is not None:
        return _json_error(
            "COLD_STORAGE",
            "Tài liệu đã quá 30 ngày, đã chuyển vào lưu trữ. Vui lòng liên hệ phòng ban.",
            status=403,
        )

    if not result.pdf_file_path or not default_storage.exists(result.pdf_file_path):
        return _json_error("NOT_FOUND", "File PDF không tồn tại trên hệ thống.", status=404)

    if user.role == "student" and req.user_id == user.user_id:
        with transaction.atomic():
            AccessLog.objects.get_or_create(request=req, user=user)
            pref = req.result_preference or (req.form_data or {}).get("result_preference")
            if pref == "Bản điện tử" and req.internal_status == "Đã duyệt — Đang chuẩn bị kết quả":
                status_before = req.internal_status
                req.status = "Đã xử lý"
                req.internal_status = "Đã xử lý"
                req.save(update_fields=["status", "internal_status", "updated_at"])
                StateAuditLog.objects.create(
                    request=req,
                    performed_by=user,
                    action="download_result",
                    note="Sinh viên tải PDF kết quả lần đầu",
                    status_before=status_before,
                    status_after="Đã xử lý",
                )

    with default_storage.open(result.pdf_file_path, "rb") as f:
        pdf_bytes = f.read()

    filename = f"{result.verification_code or req.request_code}.pdf"
    response = HttpResponse(pdf_bytes, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


@require_http_methods(["GET"])
def result_preview_view(request, result_id):
    """
    API: GET /api/results/:id/preview — Xem trước PDF kết quả (inline hiển thị trên trình duyệt / iframe)
    """
    user = _get_authenticated_user(request)
    if not user:
        return _json_error("UNAUTHORIZED", "Chưa đăng nhập.", status=401)

    result = Result.objects.select_related(
        "request", "request__procedure_type"
    ).filter(Q(result_id=result_id) | Q(request_id=result_id)).first()
    if not result:
        return _json_error("NOT_FOUND", "Không tìm thấy kết quả.", status=404)

    req = result.request
    if user.role == "student":
        if req.user_id != user.user_id:
            return _json_error("FORBIDDEN", "Bạn không có quyền xem trước kết quả này.", status=403)
    elif user.role in ("staff", "dept_head"):
        if not _can_staff_view_request(user, req):
            return _json_error("FORBIDDEN", "Bạn không có quyền xem trước kết quả này.", status=403)
    elif user.role in ("principal", "admin"):
        pass
    else:
        return _json_error("FORBIDDEN", "Bạn không có quyền xem trước kết quả này.", status=403)

    if not result.pdf_file_path or not default_storage.exists(result.pdf_file_path):
        return _json_error("NOT_FOUND", "File PDF không tồn tại trên hệ thống.", status=404)

    with default_storage.open(result.pdf_file_path, "rb") as f:
        pdf_bytes = f.read()

    filename = f"{result.verification_code or req.request_code}.pdf"
    response = HttpResponse(pdf_bytes, content_type="application/pdf")
    response["Content-Disposition"] = f'inline; filename="{filename}"'
    return response


@require_http_methods(["GET"])
def attachment_download_view(request, attachment_id):
    """
    GET /api/attachments/:id/download — Tải file minh chứng đính kèm
    """
    user = _get_authenticated_user(request)
    if not user:
        return _json_error("UNAUTHORIZED", "Chưa đăng nhập.", status=401)

    try:
        attachment = Attachment.objects.select_related(
            "request", "request__procedure_type"
        ).get(attachment_id=attachment_id)
    except Attachment.DoesNotExist:
        return _json_error("NOT_FOUND", "Không tìm thấy file đính kèm.", status=404)

    req = attachment.request
    if user.role == "student":
        if req.user_id != user.user_id:
            return _json_error("FORBIDDEN", "Bạn không có quyền tải file này.", status=403)
    elif user.role in ("staff", "dept_head"):
        if not _can_staff_view_request(user, req):
            return _json_error("FORBIDDEN", "Bạn không có quyền tải file này.", status=403)
    else:
        return _json_error("FORBIDDEN", "Bạn không có quyền tải file này.", status=403)

    if not attachment.file_path or not default_storage.exists(attachment.file_path):
        return _json_error("NOT_FOUND", "File không tồn tại trên hệ thống.", status=404)

    with default_storage.open(attachment.file_path, "rb") as f:
        file_bytes = f.read()

    response = HttpResponse(file_bytes, content_type=attachment.mime_type or "application/octet-stream")
    response["Content-Disposition"] = f'attachment; filename="{attachment.file_name}"'
    return response


@require_http_methods(["GET"])
def verify_document_view(request, verification_code):
    """
    API 1.18: GET /api/verify/:code — Cổng xác minh giấy tờ (Public, không cần token)
    """
    result = (
        Result.objects.select_related(
            "request",
            "request__user",
            "request__user__student_registry",
            "request__procedure_type",
        )
        .filter(verification_code=verification_code)
        .first()
    )
    if not result:
        return _json_error(
            "INVALID_CODE",
            "Mã xác minh không hợp lệ hoặc giấy tờ không tồn tại.",
            status=404,
        )

    req = result.request
    reg = req.user.student_registry
    issued_dt = result.signed_at or result.created_at
    issued_date = timezone.localtime(issued_dt).strftime("%Y-%m-%d")

    return JsonResponse({
        "success": True,
        "data": {
            "is_valid": True,
            "document_type": req.procedure_type.name,
            "student_name": reg.full_name if reg else req.user.full_name,
            "mssv": reg.mssv if reg else (req.form_data or {}).get("mssv"),
            "issued_date": issued_date,
            "issued_by": "Trường Đại học Việt Nhật",
        },
    })
