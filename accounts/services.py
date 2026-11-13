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

    @classmethod
    def updateStudentStatus(cls, mssv: str, status: str) -> dict:
        if not mssv:
            return {"success": False, "error": "MISSING_MSSV"}
        updated = StudentRegistry.objects.filter(mssv=mssv).update(academic_status=status)
        return {"success": True, "mssv": mssv, "status": status, "updated_count": updated}

    @classmethod
    def update_student_status(cls, mssv: str, status: str) -> dict:
        return cls.updateStudentStatus(mssv, status)

    @classmethod
    def updateGrade(cls, mssv: str, course_code: str, new_grade: float) -> dict:
        if not mssv:
            return {"success": False, "error": "MISSING_MSSV"}
        return {
            "success": True,
            "mssv": mssv,
            "course_code": course_code or "",
            "new_grade": float(new_grade),
        }

    @classmethod
    def update_grade(cls, mssv: str, course_code: str, new_grade: float) -> dict:
        return cls.updateGrade(mssv, course_code, new_grade)


class MockSmartCAService:
    """Mock Service cho dịch vụ ký số từ xa SmartCA (VNPT SmartCA / Viettel SmartCA)."""

    @classmethod
    def requestSignature(cls, request_obj, signer_user=None, timeout: bool = False) -> dict:
        if timeout:
            return {
                "success": False,
                "error": "SMARTCA_TIMEOUT",
                "message": "SmartCA không phản hồi trong 5 phút. Vui lòng thử lại."
            }
        now = timezone.now()
        timestamp = int(now.timestamp())
        transaction_id = f"MOCK-SMARTCA-{timestamp}"
        req_id = getattr(request_obj, "request_id", request_obj)
        confirm_url = f"/mock-smartca/confirm?txn={transaction_id}&request_id={req_id}"
        return {
            "success": True,
            "status": "pending",
            "transaction_id": transaction_id,
            "confirm_url": confirm_url,
            "message": "Yêu cầu ký số đã được gửi tới ứng dụng SmartCA."
        }

    @classmethod
    def request_signature(cls, request_obj, signer_user=None, timeout: bool = False) -> dict:
        return cls.requestSignature(request_obj, signer_user=signer_user, timeout=timeout)

    @classmethod
    def sign_decision(cls, request_obj, signer_user=None, timeout: bool = False) -> dict:
        if timeout:
            return {
                "success": False,
                "error": "SMARTCA_TIMEOUT",
                "message": "SmartCA không phản hồi trong 5 phút. Vui lòng thử lại."
            }
        now = timezone.now()
        timestamp = int(now.timestamp())
        transaction_id = f"MOCK-SMARTCA-{timestamp}"
        signer_name = signer_user.full_name if signer_user else "GS.TS. Furuta Motoo"
        return {
            "success": True,
            "smartca_transaction_id": transaction_id,
            "signed_at": now,
            "signer_name": signer_name,
            "signer_title": "Hiệu trưởng Trường Đại học Việt Nhật",
            "ca_provider": "VNPT SmartCA",
            "cert_serial": "5402 1890 9982 7716 3302",
        }


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
            label_map = {
                "company_name": "Đơn vị tiếp nhận thực tập",
                "company_address": "Địa chỉ đơn vị thực tập",
                "internship_from": "Thực tập từ ngày",
                "internship_to": "Thực tập đến ngày",
                "course_name": "Học phần thực tập",
                "result_preference": "Hình thức nhận kết quả",
                "ho_khau": "Hộ khẩu thường trú",
                "noi_dk_nvqs": "Nơi đăng ký NVQS",
                "thoi_gian_dao_tao": "Thời gian đào tạo dự kiến",
            }
            lines.append(f"{label_map.get(key, key)}: {val}")
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


def update_student_status(mssv: str, status: str) -> dict:
    return AcademicMSService.update_student_status(mssv, status)


def generate_decision_pdf(req, verification_code: str, smartca_data: dict = None) -> str:
    """
    Tạo file PDF Quyết định bảo lưu kết quả học tập (A4, layout chính thức VJU).
    - Nếu smartca_data is None: Bản thảo trình ký (có khung watermark "[BẢN THẢO TRÌNH KÝ]").
    - Nếu smartca_data được truyền: Đóng dấu mộc chữ ký số điện tử của Hiệu trưởng.
    """
    reg = req.user.student_registry if hasattr(req.user, "student_registry") else None
    form_data = req.form_data or {}
    student_name = reg.full_name if reg else (req.user.full_name or "Sinh viên VJU")
    mssv = reg.mssv if reg else form_data.get("mssv", "")
    class_name = reg.class_name if reg else form_data.get("class_name", "")
    cohort = reg.cohort if reg else form_data.get("cohort", "")
    major = reg.major if reg else form_data.get("major", "")

    suspend_from = form_data.get("suspend_from") or form_data.get("semester") or "Học kỳ 2, năm học 2026-2027"
    suspend_to = form_data.get("suspend_to") or "Hết năm học 2026-2027"
    return_semester = form_data.get("return_semester") or "HK1 2027-2028"
    reason = form_data.get("reason") or "Lý do cá nhân / sức khỏe"
    gpa = form_data.get("gpa") or "3.2"

    qr_url = build_qr_code_data(verification_code)
    qr_img = qrcode.make(qr_url)
    qr_buffer = BytesIO()
    qr_img.save(qr_buffer, format="PNG")
    qr_buffer.seek(0)

    pdf_buffer = BytesIO()
    font_name = _get_vietnamese_font_name()
    c = canvas.Canvas(pdf_buffer, pagesize=A4)
    width, height = A4

    now_local = timezone.localtime(timezone.now())
    decision_num = f"{req.request_id:03d}"
    year = now_local.year

    # Quốc hiệu & Tiêu ngữ
    c.setFont(font_name, 10)
    c.drawString(50, height - 50, "ĐẠI HỌC QUỐC GIA HÀ NỘI")
    c.drawString(45, height - 65, "TRƯỜNG ĐẠI HỌC VIỆT NHẬT")
    c.drawString(60, height - 80, f"Số: {decision_num}/QĐ-ĐHVN")

    c.drawRightString(width - 50, height - 50, "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM")
    c.drawRightString(width - 95, height - 65, "Độc lập - Tự do - Hạnh phúc")
    c.drawRightString(width - 50, height - 80, f"Hà Nội, ngày {now_local.day:02d} tháng {now_local.month:02d} năm {year}")

    # Đường kẻ dưới
    c.setLineWidth(0.6)
    c.line(65, height - 68, 145, height - 68)
    c.line(width - 200, height - 68, width - 110, height - 68)

    # Tiêu đề Quyết định
    c.setFont(font_name, 13)
    c.drawCentredString(width / 2, height - 120, "QUYẾT ĐỊNH")
    c.setFont(font_name, 11)
    c.drawCentredString(width / 2, height - 138, "Về việc cho phép sinh viên tạm dừng và bảo lưu kết quả học tập")

    # Căn cứ
    c.setFont(font_name, 10)
    y = height - 175
    c.drawCentredString(width / 2, y, "HIỆU TRƯỞNG TRƯỜNG ĐẠI HỌC VIỆT NHẬT")
    y -= 20
    c.setFont(font_name, 9)
    intro_lines = [
        "- Căn cứ Quyết định thành lập Trường Đại học Việt Nhật thuộc Đại học Quốc gia Hà Nội;",
        "- Căn cứ Quy chế đào tạo đại học hiện hành của Đại học Quốc gia Hà Nội;",
        f"- Xét Đơn xin bảo lưu kết quả học tập của sinh viên {student_name} (Điểm GPA: {gpa});",
        "- Theo đề nghị của Trưởng phòng Đào tạo và Quản trị người học,",
    ]
    for line in intro_lines:
        c.drawString(50, y, line)
        y -= 16

    y -= 5
    c.setFont(font_name, 11)
    c.drawCentredString(width / 2, y, "QUYẾT ĐỊNH:")
    y -= 22

    c.setFont(font_name, 9.5)
    body_lines = [
        f"Điều 1. Cho phép sinh viên {student_name.upper()} được tạm dừng và bảo lưu kết quả học tập.",
        f"   • Mã số sinh viên: {mssv}            Lớp: {class_name}        Khóa: {cohort}",
        f"   • Ngành đào tạo: {major}",
        f"   • Thời gian bảo lưu: Từ {suspend_from} đến {suspend_to}",
        f"   • Thời điểm quay trở lại học tập: {return_semester}",
        f"   • Lý do: {reason}",
        "Điều 2. Trong thời gian bảo lưu, sinh viên phải thực hiện đúng các quy định hiện hành.",
        "Điều 3. Trưởng phòng Đào tạo, các đơn vị liên quan và sinh viên chịu trách nhiệm thi hành.",
    ]
    for line in body_lines:
        c.drawString(50, y, line)
        y -= 20

    # Chữ ký & Con dấu
    sig_y = y - 25
    c.setFont(font_name, 9)
    c.drawString(50, sig_y, "Nơi nhận:")
    c.drawString(50, sig_y - 14, "- Như Điều 3;")
    c.drawString(50, sig_y - 28, "- Lưu: VT, ĐT.")

    c.setFont(font_name, 10)
    c.drawCentredString(width - 150, sig_y, "HIỆU TRƯỞNG")

    if not smartca_data:
        # Bản thảo trình ký
        c.setFont(font_name, 9)
        c.setFillColorRGB(0.45, 0.45, 0.45)
        c.setDash(3, 3)
        c.rect(width - 235, sig_y - 95, 170, 70, fill=0, stroke=1)
        c.drawCentredString(width - 150, sig_y - 50, "[BẢN THẢO TRÌNH KÝ]")
        c.drawCentredString(width - 150, sig_y - 65, "Chưa có hiệu lực pháp lý")
        c.setDash()  # reset dash
        c.setFillColorRGB(0, 0, 0)
    else:
        # Chữ ký số SmartCA chính thức
        signer_name = smartca_data.get("signer_name", "GS.TS. Furuta Motoo")
        ca_provider = smartca_data.get("ca_provider", "VNPT SmartCA")
        serial = smartca_data.get("cert_serial", "5402 1890 9982 7716 3302")
        signed_at_dt = smartca_data.get("signed_at") or now_local
        if hasattr(signed_at_dt, "strftime"):
            signed_at_str = signed_at_dt.strftime("%Y-%m-%d %H:%M:%S")
        else:
            signed_at_str = str(signed_at_dt)

        stamp_x = width - 245
        stamp_y = sig_y - 95
        stamp_w = 190
        stamp_h = 75

        # Khung viền đỏ chữ ký điện tử
        c.setStrokeColorRGB(0.8, 0.1, 0.1)
        c.setLineWidth(1.2)
        c.rect(stamp_x, stamp_y, stamp_w, stamp_h, fill=0, stroke=1)

        c.setFillColorRGB(0.75, 0.1, 0.1)
        c.setFont(font_name, 8.5)
        c.drawString(stamp_x + 8, stamp_y + stamp_h - 14, "✓ KÝ BỞI: " + str(signer_name).upper())
        c.setFont(font_name, 7.5)
        c.drawString(stamp_x + 8, stamp_y + stamp_h - 28, "Hiệu trưởng Trường Đại học Việt Nhật")
        c.drawString(stamp_x + 8, stamp_y + stamp_h - 42, f"Thời gian: {signed_at_str}")
        c.drawString(stamp_x + 8, stamp_y + stamp_h - 56, f"Chứng thư số: {ca_provider}")
        c.drawString(stamp_x + 8, stamp_y + stamp_h - 68, f"Serial: {serial}")

        c.setFillColorRGB(0, 0, 0)
        c.setStrokeColorRGB(0, 0, 0)

    # QR Code góc dưới trái
    c.drawImage(ImageReader(qr_buffer), 50, 45, width=70, height=70)
    c.setFont(font_name, 7.5)
    c.drawString(130, 80, f"Mã xác minh văn bản: {verification_code}")
    c.drawString(130, 68, "Quét mã QR để tra cứu và xác thực quyết định điện tử.")
    c.drawString(130, 56, f"Tra cứu trực tuyến tại: {qr_url}")

    c.showPage()
    c.save()

    pdf_bytes = pdf_buffer.getvalue()
    storage_rel_path = f"results/{verification_code}.pdf"
    if default_storage.exists(storage_rel_path):
        default_storage.delete(storage_rel_path)
    saved_path = default_storage.save(storage_rel_path, ContentFile(pdf_bytes))
    return saved_path
