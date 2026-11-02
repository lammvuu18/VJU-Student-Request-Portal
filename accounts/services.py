from datetime import date, datetime, timedelta
from io import BytesIO
import os

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.utils import timezone
import qrcode
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

from .models import Holiday, Result, StudentRegistry


class ExternalServiceError(Exception):
    """Lỗi khi hệ thống bên ngoài (Academic MS, Finance MS, SmartCA...) không phản hồi."""


DEFAULT_CURRICULUM = [
    {"course_id": "CS101", "course_name": "Nhập môn Lập trình"},
    {"course_id": "CS201", "course_name": "Cấu trúc dữ liệu"},
    {"course_id": "CS202", "course_name": "Cơ sở dữ liệu"},
    {"course_id": "CS301", "course_name": "Thực tập doanh nghiệp"},
    {"course_id": "CS401", "course_name": "Khóa luận tốt nghiệp"},
]


class AcademicMSService:
    """Mock Service cho hệ thống quản lý học vụ (Academic MS)."""

    @classmethod
    def getStudentStatus(cls, mssv: str) -> dict:
        if not mssv:
            return {"status": "unknown"}
        reg = StudentRegistry.objects.filter(mssv=mssv).first()
        if not reg:
            return {"status": "active"}
        return {"status": reg.academic_status}

    @classmethod
    def get_student_status(cls, mssv: str) -> dict:
        return cls.getStudentStatus(mssv)

    @classmethod
    def getStudentCurriculum(cls, mssv: str) -> list:
        if not mssv:
            return []
        return list(DEFAULT_CURRICULUM)

    @classmethod
    def get_student_curriculum(cls, mssv: str) -> list:
        return cls.getStudentCurriculum(mssv)

    @classmethod
    def getGrade(cls, mssv: str, course_code: str = "") -> dict:
        return {"grade": 6.0}

    @classmethod
    def get_grade(cls, mssv: str, course_code: str = "") -> dict:
        return cls.getGrade(mssv, course_code)

    @classmethod
    def getStudentGPA(cls, mssv: str) -> float:
        return 3.2

    @classmethod
    def get_student_gpa(cls, mssv: str) -> float:
        return cls.getStudentGPA(mssv)


def getStudentStatus(mssv: str) -> dict:
    return AcademicMSService.get_student_status(mssv)


def get_student_status(mssv: str) -> dict:
    return AcademicMSService.get_student_status(mssv)


def getStudentCurriculum(mssv: str) -> list:
    return AcademicMSService.get_student_curriculum(mssv)


def get_student_curriculum(mssv: str) -> list:
    return AcademicMSService.get_student_curriculum(mssv)


def is_working_day(target_date: date, holidays: set) -> bool:
    return target_date.weekday() < 5 and target_date not in holidays


def calculate_sla_deadline(submitted_at: datetime, sla_days: int) -> datetime:
    """
    Tính hạn SLA theo ngày làm việc (Thứ Hai - Thứ Sáu, trừ Holiday):
    - Nếu gửi vào ngày làm việc: cộng N ngày làm việc, giữ nguyên giờ.
    - Nếu gửi vào ngày nghỉ (T7, CN, Holiday): bắt đầu tính từ 08:00 ngày làm việc kế tiếp,
      sau đó cộng N ngày làm việc.
    """
    local_dt = timezone.localtime(submitted_at)
    holidays = set(Holiday.objects.values_list("holiday_date", flat=True))

    cur_date = local_dt.date()
    if not is_working_day(cur_date, holidays):
        while not is_working_day(cur_date, holidays):
            cur_date += timedelta(days=1)
        local_dt = local_dt.replace(
            year=cur_date.year,
            month=cur_date.month,
            day=cur_date.day,
            hour=8,
            minute=0,
            second=0,
            microsecond=0,
        )

    days_to_add = max(0, int(sla_days or 0))
    for _ in range(days_to_add):
        cur_date += timedelta(days=1)
        while not is_working_day(cur_date, holidays):
            cur_date += timedelta(days=1)

    return local_dt.replace(year=cur_date.year, month=cur_date.month, day=cur_date.day)


def compute_sla_metrics(req, now: datetime = None):
    """
    Trả về (sla_remaining_hours, is_overdue, is_due_today).
    Nếu đơn đang tạm dừng SLA (sla_paused_at != None), thời gian còn lại giữ nguyên tại thời điểm dừng
    và is_overdue = False.
    """
    if not req.sla_deadline:
        return None, False, False

    now = now or timezone.now()
    if req.sla_paused_at:
        remaining_seconds = (req.sla_deadline - req.sla_paused_at).total_seconds()
        return int(remaining_seconds // 3600), False, False

    remaining_seconds = (req.sla_deadline - now).total_seconds()
    remaining_hours = int(remaining_seconds // 3600)
    is_overdue = now > req.sla_deadline
    is_due_today = (
        not is_overdue
        and timezone.localtime(req.sla_deadline).date() == timezone.localtime(now).date()
    )
    return remaining_hours, is_overdue, is_due_today


MAGIC_SIGNATURES = {
    "pdf": (b"%PDF", "application/pdf"),
    "jpg": (b"\xff\xd8\xff", "image/jpeg"),
    "jpeg": (b"\xff\xd8\xff", "image/jpeg"),
    "png": (b"\x89PNG\r\n\x1a\n", "image/png"),
}


def validate_uploaded_file(uploaded_file, config=None):
    """
    Kiểm tra định dạng file (đuôi file + nội dung magic bytes) và dung lượng (<= max_size_mb).
    Trả về (error_code, error_message, mime_type). Nếu hợp lệ thì error_code = None.
    """
    if not uploaded_file or not getattr(uploaded_file, "name", ""):
        return "INVALID_FILE_FORMAT", "Chỉ chấp nhận file PDF, JPG, PNG.", None

    filename = uploaded_file.name
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    allowed_raw = (config.allowed_formats if config and config.allowed_formats else "PDF,JPG,PNG")
    allowed_tokens = {t.strip().lower() for t in allowed_raw.split(",") if t.strip()}
    if "jpg" in allowed_tokens:
        allowed_tokens.add("jpeg")

    if ext not in allowed_tokens or ext not in MAGIC_SIGNATURES:
        return "INVALID_FILE_FORMAT", "Chỉ chấp nhận file PDF, JPG, PNG.", None

    max_mb = (config.max_size_mb if config and config.max_size_mb else 5)
    max_bytes = max_mb * 1024 * 1024
    if uploaded_file.size > max_bytes:
        return "FILE_TOO_LARGE", f"File không được vượt quá {max_mb}MB.", None

    try:
        uploaded_file.seek(0)
        header = uploaded_file.read(16)
        uploaded_file.seek(0)
    except Exception:
        return "INVALID_FILE_FORMAT", "Chỉ chấp nhận file PDF, JPG, PNG.", None

    expected_magic, mime_type = MAGIC_SIGNATURES[ext]
    if not header.startswith(expected_magic):
        return "INVALID_FILE_FORMAT", "Chỉ chấp nhận file PDF, JPG, PNG.", None

    return None, None, mime_type


def _get_vietnamese_font_name() -> str:
    font_name = "VJUFont"
    if font_name in pdfmetrics.getRegisteredFontNames():
        return font_name

    candidate_paths = [
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/tahoma.ttf",
        "C:/Windows/Fonts/times.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/TTF/DejaVuSans.ttf",
    ]
    for path in candidate_paths:
        if os.path.exists(path):
            try:
                pdfmetrics.registerFont(TTFont(font_name, path))
                return font_name
            except Exception:
                continue
    return "Helvetica"


def generate_verification_code(procedure_type, now: datetime = None) -> str:
    now_local = timezone.localtime(now or timezone.now())
    year = now_local.year
    prefix = f"VJU-XN-{year}-"
    existing_codes = Result.objects.filter(verification_code__startswith=prefix).values_list(
        "verification_code", flat=True
    )
    max_seq = 0
    for code in existing_codes:
        suffix = code[len(prefix):]
        if suffix.isdigit():
            max_seq = max(max_seq, int(suffix))
    return f"{prefix}{max_seq + 1:03d}"


def build_qr_code_data(verification_code: str) -> str:
    base_url = getattr(settings, "VERIFY_BASE_URL", "") or "http://localhost:3000/verify/"
    if base_url.endswith("/"):
        return f"{base_url}{verification_code}"
    return f"{base_url}/{verification_code}"


def generate_result_pdf(req, verification_code: str, qr_code_data: str) -> str:
    """
    Tạo file PDF kết quả kèm mã QR bằng reportlab + qrcode và lưu vào Django storage.
    Trả về đường dẫn tương đối trong storage (Result.pdf_file_path).
    """
    reg = req.user.student_registry
    form_data = req.form_data or {}
    student_name = reg.full_name if reg else req.user.full_name
    mssv = reg.mssv if reg else form_data.get("mssv", "")
    class_name = reg.class_name if reg else form_data.get("class_name", "")
    cohort = reg.cohort if reg else form_data.get("cohort", "")
    major = reg.major if reg else form_data.get("major", "")
    purpose = req.purpose or form_data.get("purpose", "")

    qr_img = qrcode.make(qr_code_data)
    qr_buffer = BytesIO()
    qr_img.save(qr_buffer, format="PNG")
    qr_buffer.seek(0)

    pdf_buffer = BytesIO()
    font_name = _get_vietnamese_font_name()
    c = canvas.Canvas(pdf_buffer, pagesize=A4)
    width, height = A4

    c.setTitle(f"{req.procedure_type.name} - {mssv}")
    c.setAuthor("Trường Đại học Việt Nhật (VJU)")
    c.setSubject(f"{student_name} - {mssv} - {purpose}")

    c.setFont(font_name, 14)
    c.drawCentredString(width / 2, height - 60, "ĐẠI HỌC QUỐC GIA HÀ NỘI")
    c.drawCentredString(width / 2, height - 80, "TRƯỜNG ĐẠI HỌC VIỆT NHẬT")

    c.setFont(font_name, 16)
    c.drawCentredString(width / 2, height - 130, req.procedure_type.name.upper())

    c.setFont(font_name, 12)
    y = height - 180
    lines = [
        f"Mã hồ sơ: {req.request_code}",
        f"Họ và tên sinh viên: {student_name}",
        f"Mã số sinh viên (MSSV): {mssv}",
        f"Lớp: {class_name}    Khóa: {cohort}",
        f"Ngành đào tạo: {major}",
        f"Email: {req.user.email}",
    ]
    if purpose:
        lines.append(f"Mục đích: {purpose}")
    for key, val in form_data.items():
        if key not in ("full_name", "mssv", "class_name", "cohort", "major", "email", "purpose") and val:
            lines.append(f"{key}: {val}")
    lines.append(f"Mã xác minh: {verification_code}")
    lines.append(f"Ngày cấp: {timezone.localtime(timezone.now()).strftime('%Y-%m-%d')}")

    for line in lines:
        c.drawString(60, y, str(line))
        y -= 24

    c.drawImage(ImageReader(qr_buffer), width - 180, 60, width=110, height=110)
    c.setFont(font_name, 9)
    c.drawCentredString(width - 125, 45, verification_code)

    c.showPage()
    c.save()

    pdf_bytes = pdf_buffer.getvalue()
    storage_rel_path = f"results/{verification_code}.pdf"
    if default_storage.exists(storage_rel_path):
        default_storage.delete(storage_rel_path)
    saved_path = default_storage.save(storage_rel_path, ContentFile(pdf_bytes))
    return saved_path
