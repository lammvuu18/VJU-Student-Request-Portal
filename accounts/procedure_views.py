from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.db.models import Q
from .models import ProcedureType
from .views import _get_authenticated_user, _json_error


def _forbidden_error():
    # API Contract: danh mục thủ tục chỉ dành cho sinh viên (Actor = SV)
    return _json_error("FORBIDDEN", "Bạn không có quyền truy cập.", status=403)


@require_http_methods(["GET"])
def procedure_catalog_view(request):
    """
    API 1: GET /api/procedures
    Query params:
      - department_id: int (lọc theo phòng ban)
      - search hoặc q: string (tìm kiếm theo tên hoặc mô tả thủ tục)
    """
    # Test 1.4: Chưa đăng nhập
    user = _get_authenticated_user(request)
    if not user:
        return _json_error("UNAUTHORIZED", "Chưa đăng nhập.", status=401)
    if user.role != "student":
        return _forbidden_error()

    department_id_param = request.GET.get("department_id", "").strip()
    search_param = request.GET.get("search", "") or request.GET.get("q", "")
    search_param = search_param.strip()

    procedures_qs = ProcedureType.objects.filter(
        is_active=True,
        department__is_active=True
    ).select_related("department")

    # Test 1.2 & 1.3: Lọc theo department_id
    if department_id_param:
        try:
            dept_id_int = int(department_id_param)
            procedures_qs = procedures_qs.filter(department__dept_id=dept_id_int)
        except ValueError:
            return _json_error("INVALID_PARAM", "department_id phải là số nguyên.", status=400)

    # Tìm kiếm theo tên hoặc mô tả thủ tục
    if search_param:
        procedures_qs = procedures_qs.filter(
            Q(name__icontains=search_param) | Q(description__icontains=search_param)
        )

    procedures_qs = procedures_qs.order_by("department__dept_id", "type_id")

    # Nhóm danh mục thủ tục theo phòng ban
    departments_dict = {}
    for proc in procedures_qs:
        dept = proc.department
        if not dept:
            continue

        dept_id = dept.dept_id
        if dept_id not in departments_dict:
            departments_dict[dept_id] = {
                "department_id": dept_id,
                "department_name": dept.name,
                "procedures": []
            }

        fee_amount = int(proc.fee_amount) if proc.is_fee_required and proc.fee_amount else None

        departments_dict[dept_id]["procedures"].append({
            "type_id": proc.type_id,
            "name": proc.name,
            "description": proc.description,
            "sla_total_days": proc.sla_total_days,
            "approval_levels": proc.approval_levels,
            "is_fee_required": proc.is_fee_required,
            "fee_amount": fee_amount
        })

    return JsonResponse({
        "success": True,
        "data": list(departments_dict.values())
    })


@require_http_methods(["GET"])
def procedure_detail_view(request, type_id):
    """
    API 2: GET /api/procedures/:type_id
    Trả về chi tiết thủ tục, form_fields và attachment_configs
    """
    # Test 1.4: Chưa đăng nhập
    user = _get_authenticated_user(request)
    if not user:
        return _json_error("UNAUTHORIZED", "Chưa đăng nhập.", status=401)
    if user.role != "student":
        return _forbidden_error()

    # Tìm kiếm thủ tục theo type_id
    try:
        procedure = (
            ProcedureType.objects
            .select_related("department")
            .prefetch_related("form_fields", "attachment_configs")
            .get(type_id=type_id)
        )
    except ProcedureType.DoesNotExist:
        # Test 2.4: Thủ tục không tồn tại
        return _json_error("NOT_FOUND", "Không tìm thấy thủ tục.", status=404)

    # Test 2.5: Thủ tục đã bị ẩn (is_active = False)
    if not procedure.is_active or (procedure.department and not procedure.department.is_active):
        return _json_error("PROCEDURE_INACTIVE", "Thủ tục không khả dụng.", status=404)

    # Lấy danh sách form_fields và attachment_configs theo display_order
    form_fields = procedure.form_fields.all().order_by("display_order", "field_id")
    attachment_configs = procedure.attachment_configs.all().order_by("display_order", "config_id")

    fee_amount = int(procedure.fee_amount) if procedure.is_fee_required and procedure.fee_amount else None

    data = {
        "type_id": procedure.type_id,
        "name": procedure.name,
        "description": procedure.description,
        "department_name": procedure.department.name if procedure.department else None,
        "sla_total_days": procedure.sla_total_days,
        "approval_levels": procedure.approval_levels,
        "is_fee_required": procedure.is_fee_required,
        "fee_amount": fee_amount,
        "form_fields": [
            {
                "field_id": field.field_id,
                "field_name": field.field_name,
                "field_key": field.field_key,
                "data_type": field.data_type,
                "is_required": field.is_required,
                "placeholder": field.placeholder,
                "auto_fill_field": field.auto_fill_field,
                "dropdown_options": field.dropdown_options,
                "display_order": field.display_order
            }
            for field in form_fields
        ],
        "attachment_configs": [
            {
                "config_id": config.config_id,
                "item_name": config.item_name,
                "is_required": config.is_required,
                "allowed_formats": config.allowed_formats,
                "max_size_mb": config.max_size_mb,
                "display_order": config.display_order
            }
            for config in attachment_configs
        ]
    }

    return JsonResponse({
        "success": True,
        "data": data
    })
