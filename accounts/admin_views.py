import csv
import io
import re
import xml.etree.ElementTree as ET
import zipfile
from datetime import date, datetime

from django.db import connection, transaction
from django.db.models import Avg, Q
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import (
    AttachmentConfig,
    Department,
    Feedback,
    FormField,
    Holiday,
    PermissionAuditLog,
    ProcedureType,
    RejectionReason,
    Request,
    StudentRegistry,
    User,
)
from .notification_views import _format_datetime
from .views import _get_authenticated_user, _json_error, _read_json_object

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

COMPLETED_STATUSES = {
    "Đã xử lý",
    "Đã duyệt",
    "Đã duyệt — Đang chuẩn bị kết quả",
    "Đã duyệt — Có kết quả",
    "Đã hoàn trả",
}
PENDING_INTERNAL_STATUSES = {
    "Chờ phân công",
    "Chờ thanh toán",
}


def _require_admin(request):
    user = _get_authenticated_user(request)
    if not user:
        return None, _json_error("UNAUTHORIZED", "Chưa đăng nhập.", status=401)
    if user.role != "admin":
        return None, _json_error("FORBIDDEN", "Chỉ Admin mới có quyền truy cập.", status=403)
    return user, None


def _serialize_procedure_admin(proc: ProcedureType, include_details=True):
    dept = proc.department
    fee_val = None
    if proc.is_fee_required and proc.fee_amount is not None:
        fee_val = int(proc.fee_amount) if proc.fee_amount == int(proc.fee_amount) else float(proc.fee_amount)

    item = {
        "type_id": proc.type_id,
        "id": proc.type_id,
        "name": proc.name,
        "description": proc.description or "",
        "department_id": dept.dept_id if dept else None,
        "department_name": dept.name if dept else None,
        "department_code": dept.code if dept else None,
        "sla_total_days": proc.sla_total_days,
        "approval_levels": proc.approval_levels,
        "sub_sla_l1_days": proc.sub_sla_l1_days,
        "sub_sla_l2_days": proc.sub_sla_l2_days,
        "sub_sla_l3_days": proc.sub_sla_l3_days,
        "result_type": proc.result_type,
        "template_file_path": proc.template_file_path,
        "is_fee_required": proc.is_fee_required,
        "fee_amount": fee_val,
        "is_active": proc.is_active,
        "created_at": _format_datetime(proc.created_at),
        "updated_at": _format_datetime(proc.updated_at),
    }

    if include_details:
        fields = proc.form_fields.all().order_by("display_order", "field_id")
        item["form_fields"] = [
            {
                "field_id": f.field_id,
                "field_name": f.field_name,
                "field_key": f.field_key,
                "data_type": f.data_type,
                "is_required": f.is_required,
                "placeholder": f.placeholder,
                "auto_fill_field": f.auto_fill_field,
                "dropdown_options": f.dropdown_options,
                "required_if": f.required_if,
                "display_order": f.display_order,
            }
            for f in fields
        ]
        configs = proc.attachment_configs.all().order_by("display_order", "config_id")
        item["attachment_configs"] = [
            {
                "config_id": c.config_id,
                "item_name": c.item_name,
                "is_required": c.is_required,
                "allowed_formats": (
                    [fmt.strip() for fmt in c.allowed_formats.split(",") if fmt.strip()]
                    if c.allowed_formats
                    else []
                ),
                "max_size_mb": c.max_size_mb,
                "display_order": c.display_order,
            }
            for c in configs
        ]
    return item


def _next_pk(model_cls, pk_field):
    row = model_cls.objects.order_by(f"-{pk_field}").values_list(pk_field, flat=True).first()
    return (row or 0) + 1


def _save_form_fields_and_attachments(proc, form_fields, attachment_configs, replace=False):
    if form_fields is not None:
        if replace:
            FormField.objects.filter(procedure_type=proc).delete()
        next_fid = _next_pk(FormField, "field_id")
        for idx, ff in enumerate(form_fields, start=1):
            if not isinstance(ff, dict):
                continue
            field_name = (ff.get("field_name") or ff.get("name") or "").strip()
            field_key = (ff.get("field_key") or ff.get("key") or "").strip()
            if not field_name or not field_key:
                continue
            data_type = (ff.get("data_type") or ff.get("type") or "text").strip().lower()
            FormField.objects.create(
                field_id=next_fid,
                procedure_type=proc,
                field_name=field_name,
                field_key=field_key,
                data_type=data_type,
                is_required=bool(ff.get("is_required", ff.get("required", False))),
                placeholder=ff.get("placeholder"),
                auto_fill_field=ff.get("auto_fill_field"),
                dropdown_options=ff.get("dropdown_options", ff.get("values")),
                required_if=ff.get("required_if"),
                display_order=int(ff.get("display_order", idx)),
            )
            next_fid += 1

    if attachment_configs is not None:
        if replace:
            AttachmentConfig.objects.filter(procedure_type=proc).delete()
        next_cid = _next_pk(AttachmentConfig, "config_id")
        for idx, ac in enumerate(attachment_configs, start=1):
            if not isinstance(ac, dict):
                continue
            item_name = (ac.get("item_name") or ac.get("name") or "").strip()
            if not item_name:
                continue
            allowed_formats = ac.get("allowed_formats", "PDF,JPG,PNG")
            if isinstance(allowed_formats, list):
                allowed_formats = ",".join(str(x).strip() for x in allowed_formats if str(x).strip())
            AttachmentConfig.objects.create(
                config_id=next_cid,
                procedure_type=proc,
                item_name=item_name,
                is_required=bool(ac.get("is_required", False)),
                allowed_formats=allowed_formats or "PDF,JPG,PNG",
                max_size_mb=int(ac.get("max_size_mb", 5)),
                display_order=int(ac.get("display_order", idx)),
            )
            next_cid += 1


def _resolve_department(body):
    dept_id = body.get("department_id")
    if dept_id is not None and str(dept_id).strip() != "":
        try:
            return Department.objects.filter(dept_id=int(dept_id)).first()
        except (ValueError, TypeError):
            return None
    dept_val = body.get("department")
    if isinstance(dept_val, int):
        return Department.objects.filter(dept_id=dept_val).first()
    if isinstance(dept_val, str) and dept_val.strip():
        raw = dept_val.strip()
        code_map = {
            "Phòng Đào tạo": "PDT",
            "PĐT": "PDT",
            "PDT": "PDT",
            "Phòng Công tác Sinh viên": "PCTSV",
            "Phòng CTSV": "PCTSV",
            "PCTSV": "PCTSV",
            "Phòng Kế hoạch Tài chính": "PKHTC",
            "Phòng KHTC": "PKHTC",
            "PKHTC": "PKHTC",
        }
        mapped_code = code_map.get(raw, raw)
        return (
            Department.objects.filter(Q(code__iexact=mapped_code) | Q(name__icontains=raw))
            .order_by("dept_id")
            .first()
        )
    return None


@csrf_exempt
@require_http_methods(["GET", "POST"])
def admin_procedures_collection_view(request):
    """
    API 7.1:
    - GET  /api/admin/procedures — Danh sách tất cả thủ tục (kể cả inactive)
    - POST /api/admin/procedures — Tạo thủ tục mới
    """
    _, err = _require_admin(request)
    if err:
        return err

    if request.method == "GET":
        qs = (
            ProcedureType.objects.select_related("department")
            .prefetch_related("form_fields", "attachment_configs")
            .order_by("type_id")
        )
        dept_id = request.GET.get("department_id")
        if dept_id:
            try:
                qs = qs.filter(department_id=int(dept_id))
            except (ValueError, TypeError):
                return _json_error("INVALID_PARAM", "department_id phải là số nguyên.", status=400)

        is_active_param = request.GET.get("is_active")
        if is_active_param is not None and is_active_param != "":
            if is_active_param.lower() in ("true", "1"):
                qs = qs.filter(is_active=True)
            elif is_active_param.lower() in ("false", "0"):
                qs = qs.filter(is_active=False)

        keyword = (request.GET.get("keyword") or "").strip()
        if keyword:
            qs = qs.filter(Q(name__icontains=keyword) | Q(description__icontains=keyword))

        data = [_serialize_procedure_admin(p, include_details=True) for p in qs]
        return JsonResponse({"success": True, "data": data, "total": len(data)}, status=200)

    # POST /api/admin/procedures
    body = _read_json_object(request)
    if not body:
        return _json_error("INVALID_FORM_DATA", "Dữ liệu thủ tục không hợp lệ.", status=400)

    name = (body.get("name") or "").strip()
    if not name:
        return _json_error("INVALID_FORM_DATA", "Tên thủ tục (name) là bắt buộc.", status=400)

    dept = _resolve_department(body)
    if not dept:
        return _json_error("INVALID_FORM_DATA", "Phòng ban (department_id) không hợp lệ.", status=400)

    try:
        sla_total_days = int(body.get("sla_total_days", 3))
        if sla_total_days <= 0:
            raise ValueError
    except (ValueError, TypeError):
        return _json_error("INVALID_FORM_DATA", "sla_total_days phải là số nguyên dương.", status=400)

    try:
        approval_levels = int(body.get("approval_levels", 1))
        if approval_levels not in (1, 2, 3):
            raise ValueError
    except (ValueError, TypeError):
        return _json_error("INVALID_FORM_DATA", "approval_levels phải thuộc {1, 2, 3}.", status=400)

    is_fee_required = bool(body.get("is_fee_required", False))
    raw_fee = body.get("fee_amount")
    try:
        fee_amount = float(raw_fee) if (is_fee_required and raw_fee is not None) else 0
    except (ValueError, TypeError):
        return _json_error("INVALID_FORM_DATA", "fee_amount không hợp lệ.", status=400)

    form_fields = body.get("form_fields")
    if form_fields is not None and not isinstance(form_fields, list):
        return _json_error("INVALID_FORM_DATA", "form_fields phải là danh sách.", status=400)

    attachment_configs = body.get("attachment_configs")
    if attachment_configs is not None and not isinstance(attachment_configs, list):
        return _json_error("INVALID_FORM_DATA", "attachment_configs phải là danh sách.", status=400)

    with transaction.atomic():
        next_tid = _next_pk(ProcedureType, "type_id")
        proc = ProcedureType.objects.create(
            type_id=next_tid,
            name=name,
            description=body.get("description") or "",
            department=dept,
            sla_total_days=sla_total_days,
            approval_levels=approval_levels,
            sub_sla_l1_days=body.get("sub_sla_l1_days"),
            sub_sla_l2_days=body.get("sub_sla_l2_days"),
            sub_sla_l3_days=body.get("sub_sla_l3_days"),
            result_type=(body.get("result_type") or "PDF").strip(),
            template_file_path=body.get("template_file_path"),
            is_fee_required=is_fee_required,
            fee_amount=fee_amount,
            is_active=bool(body.get("is_active", True)),
        )
        _save_form_fields_and_attachments(proc, form_fields, attachment_configs, replace=False)

    return JsonResponse(
        {
            "success": True,
            "data": _serialize_procedure_admin(proc, include_details=True),
            "message": "Tạo thủ tục thành công.",
        },
        status=201,
    )


@csrf_exempt
@require_http_methods(["GET", "PUT", "DELETE"])
def admin_procedure_detail_view(request, type_id: int):
    """
    API 7.1:
    - GET    /api/admin/procedures/:type_id — Chi tiết thủ tục
    - PUT    /api/admin/procedures/:type_id — Cập nhật thủ tục
    - DELETE /api/admin/procedures/:type_id — Soft delete (is_active = false, BR-18)
    """
    _, err = _require_admin(request)
    if err:
        return err

    proc = (
        ProcedureType.objects.select_related("department")
        .prefetch_related("form_fields", "attachment_configs")
        .filter(type_id=type_id)
        .first()
    )
    if not proc:
        return _json_error("NOT_FOUND", "Không tìm thấy thủ tục.", status=404)

    if request.method == "GET":
        return JsonResponse(
            {"success": True, "data": _serialize_procedure_admin(proc, include_details=True)},
            status=200,
        )

    if request.method == "DELETE":
        proc.is_active = False
        proc.save(update_fields=["is_active", "updated_at"])
        return JsonResponse(
            {
                "success": True,
                "data": {"type_id": proc.type_id, "name": proc.name, "is_active": False},
                "message": "Đã ẩn thủ tục thành công.",
            },
            status=200,
        )

    # PUT /api/admin/procedures/:type_id
    body = _read_json_object(request)
    if not body:
        return _json_error("INVALID_FORM_DATA", "Dữ liệu cập nhật không hợp lệ.", status=400)

    with transaction.atomic():
        if "name" in body:
            name = (body.get("name") or "").strip()
            if not name:
                return _json_error("INVALID_FORM_DATA", "Tên thủ tục không được để trống.", status=400)
            proc.name = name

        if "description" in body:
            proc.description = body.get("description") or ""

        if "department_id" in body or "department" in body:
            dept = _resolve_department(body)
            if not dept:
                return _json_error("INVALID_FORM_DATA", "Phòng ban không hợp lệ.", status=400)
            proc.department = dept

        if "sla_total_days" in body:
            try:
                sla = int(body.get("sla_total_days"))
                if sla <= 0:
                    raise ValueError
                proc.sla_total_days = sla
            except (ValueError, TypeError):
                return _json_error("INVALID_FORM_DATA", "sla_total_days phải là số nguyên dương.", status=400)

        if "approval_levels" in body:
            try:
                lvl = int(body.get("approval_levels"))
                if lvl not in (1, 2, 3):
                    raise ValueError
                proc.approval_levels = lvl
            except (ValueError, TypeError):
                return _json_error("INVALID_FORM_DATA", "approval_levels phải thuộc {1, 2, 3}.", status=400)

        for sub_key in ("sub_sla_l1_days", "sub_sla_l2_days", "sub_sla_l3_days"):
            if sub_key in body:
                val = body.get(sub_key)
                setattr(proc, sub_key, int(val) if val is not None and str(val).strip() != "" else None)

        if "result_type" in body and body.get("result_type"):
            proc.result_type = str(body.get("result_type")).strip()

        if "template_file_path" in body:
            proc.template_file_path = body.get("template_file_path")

        if "is_fee_required" in body:
            proc.is_fee_required = bool(body.get("is_fee_required"))

        if "fee_amount" in body:
            raw_fee = body.get("fee_amount")
            proc.fee_amount = float(raw_fee) if (proc.is_fee_required and raw_fee is not None) else 0
        elif not proc.is_fee_required:
            proc.fee_amount = 0

        if "is_active" in body:
            proc.is_active = bool(body.get("is_active"))

        proc.save()

        form_fields = body.get("form_fields") if "form_fields" in body else None
        attachment_configs = body.get("attachment_configs") if "attachment_configs" in body else None
        _save_form_fields_and_attachments(proc, form_fields, attachment_configs, replace=True)

    proc.refresh_from_db()
    return JsonResponse(
        {
            "success": True,
            "data": _serialize_procedure_admin(proc, include_details=True),
            "message": "Cập nhật thủ tục thành công.",
        },
        status=200,
    )


def _parse_xlsx_bytes(raw_bytes: bytes):
    """
    Đọc danh sách dòng từ file .xlsx.
    Ưu tiên openpyxl nếu môi trường có cài, fallback sang trình đọc ZIP+XML thuần Python.
    Trả về list[list[str]].
    """
    try:
        import openpyxl  # type: ignore

        wb = openpyxl.load_workbook(io.BytesIO(raw_bytes), data_only=True)
        ws = wb.active
        rows = []
        for row in ws.iter_rows(values_only=True):
            str_row = [str(cell).strip() if cell is not None else "" for cell in row]
            if any(str_row):
                rows.append(str_row)
        return rows
    except ImportError:
        pass

    with zipfile.ZipFile(io.BytesIO(raw_bytes), "r") as zf:
        shared_strings = []
        if "xl/sharedStrings.xml" in zf.namelist():
            ss_root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
            for si in ss_root.iter():
                if si.tag.endswith("}si") or si.tag == "si":
                    texts = [
                        t.text or ""
                        for t in si.iter()
                        if t.tag.endswith("}t") or t.tag == "t"
                    ]
                    shared_strings.append("".join(texts))

        sheet_names = sorted(
            name for name in zf.namelist() if name.startswith("xl/worksheets/sheet") and name.endswith(".xml")
        )
        if not sheet_names:
            raise ValueError("Không tìm thấy worksheet trong file Excel.")

        sheet_root = ET.fromstring(zf.read(sheet_names[0]))
        rows = []
        for row_el in sheet_root.iter():
            if not (row_el.tag.endswith("}row") or row_el.tag == "row"):
                continue
            row_cells = {}
            max_col = -1
            next_col = 0
            for cell_el in row_el:
                if not (cell_el.tag.endswith("}c") or cell_el.tag == "c"):
                    continue
                ref = cell_el.attrib.get("r", "")
                col_letters = "".join(ch for ch in ref if ch.isalpha()).upper()
                if col_letters:
                    col_idx = 0
                    for ch in col_letters:
                        col_idx = col_idx * 26 + (ord(ch) - ord("A") + 1)
                    col_idx -= 1
                else:
                    col_idx = next_col
                next_col = col_idx + 1
                max_col = max(max_col, col_idx)

                cell_type = cell_el.attrib.get("t", "")
                val_text = ""
                if cell_type == "inlineStr":
                    texts = [
                        t.text or ""
                        for t in cell_el.iter()
                        if t.tag.endswith("}t") or t.tag == "t"
                    ]
                    val_text = "".join(texts)
                else:
                    v_el = next(
                        (child for child in cell_el if child.tag.endswith("}v") or child.tag == "v"),
                        None,
                    )
                    raw_v = (v_el.text or "") if v_el is not None else ""
                    if cell_type == "s" and raw_v.isdigit():
                        idx = int(raw_v)
                        val_text = shared_strings[idx] if 0 <= idx < len(shared_strings) else raw_v
                    else:
                        val_text = raw_v

                row_cells[col_idx] = val_text.strip()

            if max_col >= 0:
                str_row = [row_cells.get(c, "") for c in range(max_col + 1)]
                if any(str_row):
                    rows.append(str_row)
        return rows


def _parse_student_rows(uploaded_file):
    filename = (uploaded_file.name or "").lower()
    raw_bytes = uploaded_file.read()
    if not raw_bytes:
        raise ValueError("File rỗng.")

    if filename.endswith(".csv"):
        text = raw_bytes.decode("utf-8-sig", errors="replace")
        reader = csv.reader(io.StringIO(text))
        rows = [[cell.strip() for cell in r] for r in reader if any(cell.strip() for cell in r)]
    elif filename.endswith(".xlsx") or raw_bytes[:2] == b"PK":
        rows = _parse_xlsx_bytes(raw_bytes)
    else:
        raise ValueError("Định dạng file không hỗ trợ. Vui lòng tải lên file Excel (.xlsx) hoặc CSV.")

    if not rows:
        return []

    header_keywords = {
        "email": {"email", "mail", "thư điện tử", "email sinh viên"},
        "mssv": {"mssv", "ma_sv", "mã sv", "mã số sinh viên", "student_id", "code"},
        "full_name": {"full_name", "ho_ten", "họ tên", "họ và tên", "name", "ten"},
        "class_name": {"class_name", "lop", "lớp", "lớp sinh hoạt", "class"},
        "cohort": {"cohort", "khoa", "khóa", "khóa học"},
        "major": {"major", "nganh", "ngành", "ngành đào tạo"},
        "academic_status": {"academic_status", "status", "trang_thai", "tình trạng", "trạng thái"},
        "gender": {"gender", "gioi_tinh", "giới tính"},
    }

    first_row_lower = [c.strip().lower() for c in rows[0]]
    col_map = {}
    for col_idx, cell_val in enumerate(first_row_lower):
        for field_key, aliases in header_keywords.items():
            if cell_val in aliases and field_key not in col_map:
                col_map[field_key] = col_idx

    has_header = "email" in col_map or "mssv" in col_map or "full_name" in col_map
    data_rows = rows[1:] if has_header else rows

    if not has_header:
        # Tự động nhận diện vị trí cột email nếu không có dòng tiêu đề
        sample = data_rows[0] if data_rows else []
        email_col = 0
        for idx, val in enumerate(sample):
            if "@" in val or "email" in val.lower():
                email_col = idx
                break
        if email_col == 0:
            col_map = {"email": 0, "mssv": 1, "full_name": 2, "class_name": 3, "cohort": 4, "major": 5, "academic_status": 6}
        elif email_col == 1:
            col_map = {"mssv": 0, "email": 1, "full_name": 2, "class_name": 3, "cohort": 4, "major": 5, "academic_status": 6}
        else:
            col_map = {"mssv": 0, "full_name": 1, "email": email_col, "class_name": 3, "cohort": 4, "major": 5, "academic_status": 6}

    parsed = []
    for row in data_rows:
        def _get(key, default=""):
            idx = col_map.get(key)
            if idx is not None and 0 <= idx < len(row):
                return row[idx].strip()
            return default

        parsed.append(
            {
                "email": _get("email"),
                "mssv": _get("mssv"),
                "full_name": _get("full_name"),
                "class_name": _get("class_name"),
                "cohort": _get("cohort"),
                "major": _get("major"),
                "academic_status": _get("academic_status"),
                "gender": _get("gender"),
            }
        )
    return parsed


@csrf_exempt
@require_http_methods(["POST"])
def admin_import_students_view(request):
    """
    API 7.2: POST /api/admin/users/import-students — Import SV từ file Excel
    """
    _, err = _require_admin(request)
    if err:
        return err

    uploaded_file = request.FILES.get("file")
    if not uploaded_file:
        return _json_error("INVALID_FORM_DATA", "Vui lòng đính kèm file Excel (trường 'file').", status=400)

    try:
        rows = _parse_student_rows(uploaded_file)
    except Exception as exc:
        return _json_error("INVALID_FILE_FORMAT", f"Không thể đọc file Excel: {exc}", status=400)

    existing_emails = set(
        e.lower() for e in StudentRegistry.objects.values_list("email", flat=True) if e
    )
    existing_mssvs = set(
        m.upper() for m in StudentRegistry.objects.values_list("mssv", flat=True) if m
    )

    total_rows = len(rows)
    imported = 0
    skipped = 0
    errors = []

    status_map = {
        "active": "active",
        "đang học": "active",
        "studying": "active",
        "suspended": "suspended",
        "bảo lưu": "suspended",
        "reserved": "suspended",
        "graduated": "graduated",
        "đã tốt nghiệp": "graduated",
        "đã tn": "graduated",
        "dismissed": "dismissed",
        "buộc thôi học": "dismissed",
        "quit": "dismissed",
    }

    with transaction.atomic():
        for row_num, item in enumerate(rows, start=1):
            raw_email = (item.get("email") or "").strip()
            email_lower = raw_email.lower()

            if not raw_email or not EMAIL_REGEX.match(raw_email):
                skipped += 1
                errors.append({"row": row_num, "email": raw_email, "reason": "Email không hợp lệ"})
                continue

            if email_lower in existing_emails:
                skipped += 1
                errors.append({"row": row_num, "email": raw_email, "reason": "Email đã tồn tại"})
                continue

            raw_mssv = (item.get("mssv") or "").strip()
            if not raw_mssv:
                prefix = email_lower.split("@")[0].upper()[:15]
                candidate = prefix if prefix and prefix not in existing_mssvs else f"SV{row_num:05d}"
                seq = 1
                while candidate.upper() in existing_mssvs:
                    candidate = f"SV{row_num:03d}{seq:02d}"
                    seq += 1
                raw_mssv = candidate
            elif raw_mssv.upper() in existing_mssvs:
                skipped += 1
                errors.append({"row": row_num, "email": raw_email, "reason": "MSSV đã tồn tại"})
                continue

            full_name = (item.get("full_name") or "").strip() or f"Sinh viên {raw_mssv}"
            class_name = (item.get("class_name") or "").strip() or "CQ-2026"
            cohort = (item.get("cohort") or "").strip() or "K2026"
            major = (item.get("major") or "").strip() or "Khoa học Máy tính"
            raw_status = (item.get("academic_status") or "active").strip().lower()
            academic_status = status_map.get(raw_status, "active")

            StudentRegistry.objects.create(
                email=email_lower,
                mssv=raw_mssv,
                full_name=full_name,
                gender=(item.get("gender") or "").strip()[:10],
                class_name=class_name,
                cohort=cohort,
                major=major,
                academic_status=academic_status,
            )
            existing_emails.add(email_lower)
            existing_mssvs.add(raw_mssv.upper())
            imported += 1

    return JsonResponse(
        {
            "success": True,
            "data": {
                "total_rows": total_rows,
                "imported": imported,
                "skipped": skipped,
                "errors": errors,
            },
            "message": f"Đã import thành công {imported}/{total_rows} sinh viên.",
        },
        status=200,
    )


@csrf_exempt
@require_http_methods(["GET", "POST"])
def admin_users_collection_view(request):
    """
    Section 11.2:
    - GET  /api/admin/users — Danh sách users (lọc role, department, keyword)
    - POST /api/admin/users — Tạo tài khoản cán bộ
    """
    admin_user, err = _require_admin(request)
    if err:
        return err

    if request.method == "GET":
        role_param = (request.GET.get("role") or "").strip()
        dept_param = (request.GET.get("department_id") or request.GET.get("department") or "").strip()
        keyword = (request.GET.get("keyword") or "").strip()

        if role_param == "student":
            # Kết hợp cả StudentRegistry và User(role='student') để hiển thị cả SV vừa import
            reg_qs = StudentRegistry.objects.select_related("user_account").order_by("registry_id")
            if keyword:
                reg_qs = reg_qs.filter(
                    Q(full_name__icontains=keyword)
                    | Q(email__icontains=keyword)
                    | Q(mssv__icontains=keyword)
                    | Q(class_name__icontains=keyword)
                )
            data = []
            for reg in reg_qs:
                u = getattr(reg, "user_account", None)
                data.append(
                    {
                        "user_id": u.user_id if u else reg.registry_id,
                        "registry_id": reg.registry_id,
                        "full_name": reg.full_name,
                        "name": reg.full_name,
                        "email": reg.email,
                        "mssv": reg.mssv,
                        "class_name": reg.class_name,
                        "cohort": reg.cohort,
                        "major": reg.major,
                        "academic_status": reg.academic_status,
                        "role": "student",
                        "account_status": u.account_status if u else "active",
                    }
                )
            return JsonResponse({"success": True, "data": data, "total": len(data)}, status=200)

        qs = User.objects.select_related("department", "student_registry").order_by("user_id")
        if role_param:
            if role_param == "staff_all":
                qs = qs.filter(role__in=("staff", "dept_head"))
            else:
                qs = qs.filter(role=role_param)
        if dept_param:
            if dept_param.isdigit():
                qs = qs.filter(department_id=int(dept_param))
            else:
                qs = qs.filter(Q(department__code__iexact=dept_param) | Q(department__name__icontains=dept_param))
        if keyword:
            qs = qs.filter(Q(full_name__icontains=keyword) | Q(email__icontains=keyword))

        data = [u.to_dict() for u in qs]
        return JsonResponse({"success": True, "data": data, "total": len(data)}, status=200)

    # POST /api/admin/users
    body = _read_json_object(request)
    if not body:
        return _json_error("INVALID_FORM_DATA", "Dữ liệu tài khoản không hợp lệ.", status=400)

    email = (body.get("email") or "").strip().lower()
    full_name = (body.get("full_name") or body.get("name") or "").strip()
    role = (body.get("role") or "staff").strip()

    if not email or not EMAIL_REGEX.match(email):
        return _json_error("INVALID_FORM_DATA", "Email không hợp lệ.", status=400)
    if not full_name:
        return _json_error("INVALID_FORM_DATA", "Họ và tên là bắt buộc.", status=400)
    if User.objects.filter(email__iexact=email).exists():
        return _json_error("DUPLICATE_EMAIL", "Email tài khoản đã tồn tại.", status=409)

    if role not in ("staff", "dept_head", "principal", "admin", "student"):
        return _json_error("INVALID_FORM_DATA", "Vai trò không hợp lệ.", status=400)

    dept = _resolve_department(body) if ("department_id" in body or "department" in body) else None
    default_level = 2 if role == "dept_head" else (3 if role == "principal" else (1 if role == "staff" else None))
    authority_level = body.get("authority_level", default_level)

    with transaction.atomic():
        new_user = User.objects.create(
            email=email,
            full_name=full_name,
            role=role,
            department=dept,
            authority_level=int(authority_level) if authority_level is not None else None,
            phone=(body.get("phone") or "").strip(),
            account_status=body.get("account_status") or "active",
        )
        raw_password = body.get("password") or "staff123"
        new_user.set_password(raw_password)
        new_user.save(update_fields=["password"])

        PermissionAuditLog.objects.create(
            admin=admin_user,
            target_user=new_user,
            change_type="CREATE_USER",
            change_detail=f"Tạo tài khoản {new_user.email} với vai trò {new_user.role}",
            reason=body.get("reason") or "Admin tạo tài khoản mới",
        )

    return JsonResponse(
        {
            "success": True,
            "data": new_user.to_dict(),
            "message": "Tạo tài khoản cán bộ thành công.",
        },
        status=201,
    )


@csrf_exempt
@require_http_methods(["PUT"])
def admin_user_detail_view(request, user_id: int):
    """
    Section 11.2: PUT /api/admin/users/:user_id — Cập nhật tài khoản
    """
    admin_user, err = _require_admin(request)
    if err:
        return err

    body = _read_json_object(request)
    if not body:
        return _json_error("INVALID_FORM_DATA", "Dữ liệu cập nhật không hợp lệ.", status=400)

    target_user = User.objects.select_related("department", "student_registry").filter(user_id=user_id).first()
    if not target_user:
        # Cho phép cập nhật StudentRegistry nếu chưa có bản ghi User
        reg = StudentRegistry.objects.filter(registry_id=user_id).first()
        if not reg:
            return _json_error("NOT_FOUND", "Không tìm thấy người dùng.", status=404)
        if "full_name" in body or "name" in body:
            reg.full_name = (body.get("full_name") or body.get("name") or reg.full_name).strip()
        if "class_name" in body:
            reg.class_name = (body.get("class_name") or reg.class_name).strip()
        if "academic_status" in body:
            reg.academic_status = body.get("academic_status") or reg.academic_status
        reg.save()
        return JsonResponse(
            {
                "success": True,
                "data": {
                    "user_id": reg.registry_id,
                    "full_name": reg.full_name,
                    "email": reg.email,
                    "mssv": reg.mssv,
                    "class_name": reg.class_name,
                    "academic_status": reg.academic_status,
                },
                "message": "Cập nhật thông tin sinh viên thành công.",
            },
            status=200,
        )

    changes = []
    with transaction.atomic():
        if "full_name" in body or "name" in body:
            new_name = (body.get("full_name") or body.get("name") or "").strip()
            if new_name:
                target_user.full_name = new_name
                if target_user.student_registry:
                    target_user.student_registry.full_name = new_name
                    target_user.student_registry.save(update_fields=["full_name"])

        if "role" in body and body.get("role"):
            new_role = body.get("role").strip()
            if new_role != target_user.role:
                changes.append(f"role: {target_user.role} -> {new_role}")
                target_user.role = new_role

        if "department_id" in body or "department" in body:
            dept = _resolve_department(body)
            target_user.department = dept
            changes.append(f"department -> {dept.code if dept else None}")

        if "authority_level" in body:
            lvl = body.get("authority_level")
            target_user.authority_level = int(lvl) if lvl is not None else None

        if "account_status" in body and body.get("account_status") in ("active", "locked"):
            new_status = body.get("account_status")
            if new_status != target_user.account_status:
                changes.append(f"account_status: {target_user.account_status} -> {new_status}")
                target_user.account_status = new_status

        if "phone" in body:
            target_user.phone = (body.get("phone") or "").strip()

        if "password" in body and body.get("password"):
            target_user.set_password(body.get("password"))

        target_user.save()

        if target_user.student_registry and ("academic_status" in body or "class_name" in body):
            if "academic_status" in body and body.get("academic_status"):
                target_user.student_registry.academic_status = body.get("academic_status")
            if "class_name" in body and body.get("class_name"):
                target_user.student_registry.class_name = body.get("class_name")
            target_user.student_registry.save()

        if changes:
            PermissionAuditLog.objects.create(
                admin=admin_user,
                target_user=target_user,
                change_type="UPDATE_USER",
                change_detail="; ".join(changes),
                reason=body.get("reason") or "Admin cập nhật tài khoản",
            )

    return JsonResponse(
        {
            "success": True,
            "data": target_user.to_dict(),
            "message": "Cập nhật thông tin tài khoản thành công.",
        },
        status=200,
    )


def _classify_request_bucket(req: Request) -> str:
    st = (req.status or "").strip()
    ist = (req.internal_status or "").strip()
    if st in COMPLETED_STATUSES or ist in COMPLETED_STATUSES:
        return "completed"
    if st == "Từ chối" or ist == "Từ chối":
        return "rejected"
    if "Đã hủy" in st or "Đã hủy" in ist:
        return "cancelled"
    if ist in PENDING_INTERNAL_STATUSES or (not ist and st in ("Đã gửi", "Chờ thanh toán")):
        return "pending"
    return "processing"


def _is_completed_on_time(req: Request) -> bool:
    if not req.sla_deadline:
        return True
    completed_at = req.updated_at or req.created_at
    return completed_at <= req.sla_deadline


@require_http_methods(["GET"])
def admin_dashboard_view(request):
    """
    API 7.3: GET /api/admin/dashboard — Dashboard thống kê
    Query params: from_date (YYYY-MM-DD), to_date (YYYY-MM-DD), department_id (int)
    """
    _, err = _require_admin(request)
    if err:
        return err

    qs = (
        Request.objects.filter(is_draft=False)
        .select_related("procedure_type", "procedure_type__department")
        .order_by("request_id")
    )

    from_date_str = (request.GET.get("from_date") or "").strip()
    if from_date_str:
        try:
            from_d = date.fromisoformat(from_date_str)
            qs = qs.filter(created_at__date__gte=from_d)
        except ValueError:
            return _json_error("INVALID_PARAM", "from_date phải có định dạng YYYY-MM-DD.", status=400)

    to_date_str = (request.GET.get("to_date") or "").strip()
    if to_date_str:
        try:
            to_d = date.fromisoformat(to_date_str)
            qs = qs.filter(created_at__date__lte=to_d)
        except ValueError:
            return _json_error("INVALID_PARAM", "to_date phải có định dạng YYYY-MM-DD.", status=400)

    dept_id_str = (request.GET.get("department_id") or "").strip()
    if dept_id_str:
        try:
            dept_id = int(dept_id_str)
            qs = qs.filter(procedure_type__department_id=dept_id)
        except (ValueError, TypeError):
            return _json_error("INVALID_PARAM", "department_id phải là số nguyên.", status=400)

    requests_list = list(qs)

    overview = {
        "total_requests": len(requests_list),
        "pending": 0,
        "processing": 0,
        "completed": 0,
        "rejected": 0,
        "cancelled": 0,
    }
    on_time = 0
    overdue = 0

    proc_groups = {}
    dept_groups = {}

    for req in requests_list:
        bucket = _classify_request_bucket(req)
        overview[bucket] += 1

        is_completed = bucket == "completed"
        req_on_time = False
        if is_completed:
            if _is_completed_on_time(req):
                on_time += 1
                req_on_time = True
            else:
                overdue += 1

        proc = req.procedure_type
        if proc:
            p_entry = proc_groups.setdefault(
                proc.type_id,
                {"type_id": proc.type_id, "type_name": proc.name, "total": 0, "durations": []},
            )
            p_entry["total"] += 1
            if is_completed and req.created_at and req.updated_at:
                hours = max(0.0, (req.updated_at - req.created_at).total_seconds() / 3600.0)
                p_entry["durations"].append(hours)

            dept = proc.department
            if dept:
                d_entry = dept_groups.setdefault(
                    dept.dept_id,
                    {
                        "department_id": dept.dept_id,
                        "department_name": dept.name,
                        "total": 0,
                        "completed": 0,
                        "on_time": 0,
                    },
                )
                d_entry["total"] += 1
                if is_completed:
                    d_entry["completed"] += 1
                    if req_on_time:
                        d_entry["on_time"] += 1

    total_evaluated = on_time + overdue
    compliance_rate = round((on_time / total_evaluated) * 100.0, 1) if total_evaluated > 0 else 100.0

    req_ids = [r.request_id for r in requests_list]
    fb_qs = Feedback.objects.filter(request_id__in=req_ids)
    total_feedbacks = fb_qs.count()
    agg = fb_qs.aggregate(
        avg_star=Avg("star_rating"),
        avg_speed=Avg("speed_score"),
        avg_attitude=Avg("attitude_score"),
        avg_convenience=Avg("convenience_score"),
    )

    satisfaction = {
        "avg_star_rating": round(float(agg["avg_star"]), 1) if agg["avg_star"] is not None else 0.0,
        "avg_speed_score": round(float(agg["avg_speed"]), 1) if agg["avg_speed"] is not None else 0.0,
        "avg_attitude_score": round(float(agg["avg_attitude"]), 1) if agg["avg_attitude"] is not None else 0.0,
        "avg_convenience_score": round(float(agg["avg_convenience"]), 1) if agg["avg_convenience"] is not None else 0.0,
        "total_feedbacks": total_feedbacks,
    }

    by_procedure = []
    for p_id in sorted(proc_groups.keys()):
        p = proc_groups[p_id]
        durations = p["durations"]
        avg_hours = round(sum(durations) / len(durations), 1) if durations else 0.0
        by_procedure.append(
            {
                "type_id": p["type_id"],
                "type_name": p["type_name"],
                "total": p["total"],
                "avg_processing_hours": avg_hours,
            }
        )

    by_department = []
    for d_id in sorted(dept_groups.keys()):
        d = dept_groups[d_id]
        rate = round((d["on_time"] / d["completed"]) * 100.0, 1) if d["completed"] > 0 else 100.0
        by_department.append(
            {
                "department_id": d["department_id"],
                "department_name": d["department_name"],
                "total": d["total"],
                "on_time_rate": rate,
            }
        )

    return JsonResponse(
        {
            "success": True,
            "data": {
                "overview": overview,
                "sla_compliance": {
                    "on_time": on_time,
                    "overdue": overdue,
                    "compliance_rate": compliance_rate,
                },
                "satisfaction": satisfaction,
                "by_procedure": by_procedure,
                "by_department": by_department,
            },
        },
        status=200,
    )


def _serialize_holiday(h: Holiday):
    return {
        "holiday_id": h.holiday_id,
        "holiday_date": h.holiday_date.isoformat() if isinstance(h.holiday_date, date) else str(h.holiday_date),
        "description": h.description or "",
        "type": h.type,
        "year": h.year,
        "created_at": _format_datetime(h.created_at),
    }


@csrf_exempt
@require_http_methods(["GET", "POST"])
def admin_holidays_collection_view(request):
    """
    API 7.4:
    - GET  /api/admin/holidays — Danh sách ngày nghỉ
    - POST /api/admin/holidays — Thêm ngày nghỉ
    """
    _, err = _require_admin(request)
    if err:
        return err

    if request.method == "GET":
        qs = Holiday.objects.all().order_by("holiday_date")
        year_param = (request.GET.get("year") or "").strip()
        if year_param:
            try:
                qs = qs.filter(year=int(year_param))
            except (ValueError, TypeError):
                return _json_error("INVALID_PARAM", "year phải là số nguyên.", status=400)
        return JsonResponse({"success": True, "data": [_serialize_holiday(h) for h in qs]}, status=200)

    # POST /api/admin/holidays
    body = _read_json_object(request)
    if not body:
        return _json_error("INVALID_FORM_DATA", "Dữ liệu ngày nghỉ không hợp lệ.", status=400)

    raw_date = (body.get("holiday_date") or "").strip()
    if not raw_date:
        return _json_error("INVALID_FORM_DATA", "holiday_date là bắt buộc.", status=400)

    try:
        parsed_date = date.fromisoformat(raw_date)
    except ValueError:
        return _json_error("INVALID_FORM_DATA", "holiday_date phải có định dạng YYYY-MM-DD.", status=400)

    if Holiday.objects.filter(holiday_date=parsed_date).exists():
        return _json_error("DUPLICATE_HOLIDAY", "Ngày này đã có trong danh sách.", status=409)

    year_val = body.get("year")
    try:
        year_int = int(year_val) if year_val is not None else parsed_date.year
    except (ValueError, TypeError):
        return _json_error("INVALID_FORM_DATA", "year phải là số nguyên.", status=400)

    h = Holiday.objects.create(
        holiday_date=parsed_date,
        description=(body.get("description") or "").strip(),
        type=(body.get("type") or "holiday").strip(),
        year=year_int,
    )
    return JsonResponse(
        {
            "success": True,
            "data": _serialize_holiday(h),
            "message": "Thêm ngày nghỉ thành công.",
        },
        status=201,
    )


@csrf_exempt
@require_http_methods(["PUT", "DELETE"])
def admin_holiday_detail_view(request, holiday_id: int):
    """
    API 7.4:
    - PUT    /api/admin/holidays/:holiday_id — Sửa ngày nghỉ
    - DELETE /api/admin/holidays/:holiday_id — Xóa ngày nghỉ
    """
    _, err = _require_admin(request)
    if err:
        return err

    h = Holiday.objects.filter(holiday_id=holiday_id).first()
    if not h:
        return _json_error("NOT_FOUND", "Không tìm thấy ngày nghỉ.", status=404)

    if request.method == "DELETE":
        h.delete()
        return JsonResponse({"success": True, "message": "Đã xóa ngày nghỉ."}, status=200)

    body = _read_json_object(request)
    if not body:
        return _json_error("INVALID_FORM_DATA", "Dữ liệu cập nhật không hợp lệ.", status=400)

    if "holiday_date" in body and body.get("holiday_date"):
        try:
            new_date = date.fromisoformat(str(body.get("holiday_date")).strip())
        except ValueError:
            return _json_error("INVALID_FORM_DATA", "holiday_date phải có định dạng YYYY-MM-DD.", status=400)
        if Holiday.objects.filter(holiday_date=new_date).exclude(holiday_id=holiday_id).exists():
            return _json_error("DUPLICATE_HOLIDAY", "Ngày này đã có trong danh sách.", status=409)
        h.holiday_date = new_date

    if "description" in body:
        h.description = (body.get("description") or "").strip()
    if "type" in body and body.get("type"):
        h.type = str(body.get("type")).strip()
    if "year" in body and body.get("year") is not None:
        try:
            h.year = int(body.get("year"))
        except (ValueError, TypeError):
            return _json_error("INVALID_FORM_DATA", "year phải là số nguyên.", status=400)

    h.save()
    return JsonResponse(
        {
            "success": True,
            "data": _serialize_holiday(h),
            "message": "Cập nhật ngày nghỉ thành công.",
        },
        status=200,
    )


@csrf_exempt
@require_http_methods(["GET", "POST"])
def admin_rejection_reasons_collection_view(request):
    """
    Section 11.4:
    - GET  /api/admin/rejection-reasons — Danh sách lý do từ chối
    - POST /api/admin/rejection-reasons — Thêm lý do từ chối
    """
    _, err = _require_admin(request)
    if err:
        return err

    if request.method == "GET":
        qs = RejectionReason.objects.all().order_by("reason_id")
        data = [
            {"reason_id": r.reason_id, "reason_text": r.reason_text, "is_active": r.is_active}
            for r in qs
        ]
        return JsonResponse({"success": True, "data": data}, status=200)

    body = _read_json_object(request)
    if not body or not (body.get("reason_text") or "").strip():
        return _json_error("INVALID_FORM_DATA", "reason_text là bắt buộc.", status=400)

    next_rid = _next_pk(RejectionReason, "reason_id")
    reason = RejectionReason.objects.create(
        reason_id=next_rid,
        reason_text=body.get("reason_text").strip(),
        is_active=bool(body.get("is_active", True)),
    )
    return JsonResponse(
        {
            "success": True,
            "data": {
                "reason_id": reason.reason_id,
                "reason_text": reason.reason_text,
                "is_active": reason.is_active,
            },
            "message": "Thêm lý do từ chối thành công.",
        },
        status=201,
    )


@csrf_exempt
@require_http_methods(["PUT", "DELETE"])
def admin_rejection_reason_detail_view(request, reason_id: int):
    """
    Section 11.4:
    - PUT    /api/admin/rejection-reasons/:id — Sửa lý do từ chối
    - DELETE /api/admin/rejection-reasons/:id — Soft delete lý do từ chối
    """
    _, err = _require_admin(request)
    if err:
        return err

    reason = RejectionReason.objects.filter(reason_id=reason_id).first()
    if not reason:
        return _json_error("NOT_FOUND", "Không tìm thấy lý do từ chối.", status=404)

    if request.method == "DELETE":
        reason.is_active = False
        reason.save(update_fields=["is_active"])
        return JsonResponse(
            {
                "success": True,
                "data": {"reason_id": reason.reason_id, "is_active": False},
                "message": "Đã ẩn lý do từ chối.",
            },
            status=200,
        )

    body = _read_json_object(request)
    if not body:
        return _json_error("INVALID_FORM_DATA", "Dữ liệu cập nhật không hợp lệ.", status=400)

    if "reason_text" in body:
        txt = (body.get("reason_text") or "").strip()
        if not txt:
            return _json_error("INVALID_FORM_DATA", "reason_text không được để trống.", status=400)
        reason.reason_text = txt
    if "is_active" in body:
        reason.is_active = bool(body.get("is_active"))
    reason.save()

    return JsonResponse(
        {
            "success": True,
            "data": {
                "reason_id": reason.reason_id,
                "reason_text": reason.reason_text,
                "is_active": reason.is_active,
            },
            "message": "Cập nhật lý do từ chối thành công.",
        },
        status=200,
    )
