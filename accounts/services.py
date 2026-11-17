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
        signer_name = signer_user.full_name if signer_user else "PGS.TS. Nguyễn Văn Bình"
        return {
            "success": True,
            "smartca_transaction_id": transaction_id,
            "signed_at": now,
            "signer_name": signer_name,
            "signer_title": "Hiệu trưởng Trường Đại học Việt Nhật",
            "ca_provider": "VJU Digital CA (Demo eSign / SmartCA)",
            "cert_serial": "5402-1890-9982-7716-VJU",
        }


class FinanceMSService:
    """
    Mock Service cho hệ thống tài chính (Finance MS): tra cứu học phí đã đóng và ghi nhận khoản hoàn trả.
    Môi trường thật sẽ gọi API của phần mềm kế toán; ở đây trả dữ liệu cố định để demo.
    """

    TUITION_PER_SEMESTER = 15_750_000
    REFUND_LEDGER_ACCOUNT = "3388 - Phải trả người học"

    @classmethod
    def get_tuition_paid(cls, mssv: str, semester: str = "") -> dict:
        if not mssv:
            raise ExternalServiceError("Thiếu MSSV khi tra cứu Finance MS")
        return {
            "mssv": mssv,
            "semester": semester or "",
            "tuition_due": cls.TUITION_PER_SEMESTER,
            "amount_paid": cls.TUITION_PER_SEMESTER,
            "receipt_no": f"BL-{mssv}-{(semester or 'HK').replace(' ', '')}",
        }

    @classmethod
    def record_refund(cls, request_obj, amount) -> dict:
        reg = getattr(request_obj.user, "student_registry", None)
        mssv = reg.mssv if reg else (request_obj.form_data or {}).get("mssv")
        if not mssv:
            raise ExternalServiceError("Finance MS từ chối ghi nhận: thiếu MSSV")
        now = timezone.now()
        return {
            "refund_ref": f"FMS-RF-{timezone.localtime(now).strftime('%Y%m%d')}-{request_obj.request_id:05d}",
            "recorded_at": now,
            "ledger_account": cls.REFUND_LEDGER_ACCOUNT,
            "amount": int(amount),
        }


class InternetBankingService:
    """
    Mock Service cho Internet Banking doanh nghiệp: lập lệnh chi và ký/kiểm tra chữ ký webhook.
    Ngân hàng gửi kết quả chuyển khoản về /api/webhooks/banking kèm header X-Bank-Signature
    = HMAC-SHA256(BANKING_WEBHOOK_SECRET, raw body).
    """

    SOURCE_ACCOUNT = "0011 0040 12345 — Trường ĐH Việt Nhật (Vietcombank)"

    @classmethod
    def create_payout_order(cls, payout) -> dict:
        now = timezone.now()
        stamp = timezone.localtime(now).strftime("%Y%m%d%H%M%S")
        return {
            "order_id": f"IB-{stamp}-{payout.payout_id}-{payout.attempt_count}",
            "status": "pending",
            "source_account": cls.SOURCE_ACCOUNT,
            "created_at": now,
        }

    @classmethod
    def sign_payload(cls, raw_body: bytes) -> str:
        import hashlib
        import hmac
        secret = (getattr(settings, "BANKING_WEBHOOK_SECRET", "") or "").encode("utf-8")
        return hmac.new(secret, raw_body, hashlib.sha256).hexdigest()

    @classmethod
    def verify_signature(cls, raw_body: bytes, signature: str) -> bool:
        import hmac
        if not signature:
            return False
        return hmac.compare_digest(cls.sign_payload(raw_body), signature.strip())

    @classmethod
    def build_webhook_payload(cls, payout, succeeded: bool, failure_reason: str = "") -> dict:
        now = timezone.now()
        payload = {
            "event": "payout.succeeded" if succeeded else "payout.failed",
            "order_id": payout.payout_order_id,
            "amount": int(payout.amount),
            "beneficiary_account": payout.bank_account_no,
            "beneficiary_bank": payout.bank_name,
            "occurred_at": now.isoformat(),
        }
        if succeeded:
            payload["bank_txn_id"] = f"FT{timezone.localtime(now).strftime('%y%m%d%H%M%S')}{payout.payout_id:04d}"
        else:
            payload["failure_reason"] = failure_reason or "Tài khoản thụ hưởng không hợp lệ"
        return payload


def format_vnd(amount) -> str:
    try:
        value = int(round(float(amount)))
    except (TypeError, ValueError):
        return str(amount)
    return f"{value:,}".replace(",", ".") + " đ"


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


def _draw_viet_nhat_seal(c, cx: float, cy: float, radius: float = 36, font_name: str = "Helvetica"):
    """
    Vẽ con dấu tròn đỏ tổ chức của Trường Đại học Việt Nhật - ĐHQGHN
    chuẩn quy cách con dấu hành chính (Điều 22 Nghị định 30/2020/NĐ-CP).
    """
    c.saveState()
    seal_red = (0.78, 0.12, 0.12)
    c.setStrokeColorRGB(*seal_red)
    c.setFillColorRGB(*seal_red)

    # Vành tròn ngoài (đậm)
    c.setLineWidth(1.5)
    c.circle(cx, cy, radius, stroke=1, fill=0)

    # Vành tròn trong (mảnh)
    c.setLineWidth(0.6)
    c.circle(cx, cy, radius - 3.2, stroke=1, fill=0)

    # Dòng chữ cơ quan chủ quản (nửa trên)
    c.setFont(font_name, 5.2)
    c.drawCentredString(cx, cy + radius - 10, "ĐẠI HỌC QUỐC GIA HÀ NỘI")

    # Dòng chữ đơn vị trực thuộc (giữa)
    c.setFont(font_name, 5.8)
    c.drawCentredString(cx, cy + 7, "TRƯỜNG ĐẠI HỌC")
    c.drawCentredString(cx, cy - 1, "VIỆT NHẬT")

    # Ngôi sao trung tâm
    c.setFont(font_name, 7.0)
    c.drawCentredString(cx, cy - 10, "★")

    # Chức danh thủ trưởng đơn vị (nửa dưới)
    c.setFont(font_name, 6.2)
    c.drawCentredString(cx, cy - radius + 6.5, "HIỆU TRƯỞNG")

    c.restoreState()


def _draw_cursive_signature(c, x: float, y: float):
    """
    Vẽ nét chữ ký tay uốn lượn màu xanh mực bút máy (#002B7F)
    của Hiệu trưởng bằng ReportLab bezier path.
    """
    c.saveState()
    pen_blue = (0.0, 0.18, 0.50)
    c.setStrokeColorRGB(*pen_blue)
    c.setLineWidth(1.6)
    c.setLineCap(1)  # Round cap
    c.setLineJoin(1)  # Round join

    # Nét vẽ chữ ký chính
    p = c.beginPath()
    p.moveTo(x, y - 5)
    p.curveTo(x + 5, y + 18, x + 12, y + 22, x + 16, y + 5)
    p.curveTo(x + 19, y - 10, x + 23, y + 15, x + 28, y + 12)
    p.curveTo(x + 35, y + 8, x + 40, y + 25, x + 48, y + 18)
    p.curveTo(x + 54, y + 12, x + 44, y - 2, x + 58, y + 4)
    p.curveTo(x + 68, y + 10, x + 75, y + 24, x + 82, y + 15)
    p.curveTo(x + 88, y + 6, x + 92, y - 6, x + 98, y - 2)
    c.drawPath(p, stroke=1, fill=0)

    # Nét gạch chân bay bổng dưới chữ ký (flourish underline)
    p2 = c.beginPath()
    c.setLineWidth(1.2)
    p2.moveTo(x + 8, y - 10)
    p2.curveTo(x + 40, y - 16, x + 75, y - 14, x + 105, y - 8)
    c.drawPath(p2, stroke=1, fill=0)

    # Dấu chấm kết thúc chữ ký
    c.setFillColorRGB(*pen_blue)
    c.circle(x + 109, y - 7, 1.2, stroke=0, fill=1)

    c.restoreState()


def _draw_misa_esign_box(
    c, x: float, y: float, w: float, h: float,
    signer_name: str, ca_provider: str, serial: str, signed_at_str: str,
    font_name: str = "Helvetica"
):
    """
    Vẽ khung thông tin chứng thực chữ ký số điện tử theo chuẩn MISA eSign.
    """
    c.saveState()
    border_red = (0.78, 0.12, 0.12)
    bg_tint = (0.99, 0.96, 0.96)
    c.setStrokeColorRGB(*border_red)
    c.setFillColorRGB(*bg_tint)
    c.setLineWidth(0.9)

    # Khung bo góc
    c.roundRect(x, y, w, h, radius=4, stroke=1, fill=1)

    # Header dải banner
    c.setFillColorRGB(0.78, 0.12, 0.12)
    c.rect(x, y + h - 14, w, 14, stroke=0, fill=1)
    c.setFillColorRGB(1.0, 1.0, 1.0)
    c.setFont(font_name, 6.8)
    c.drawString(x + 8, y + h - 10, "✓ CHỨNG NHẬN KÝ SỐ ĐIỆN TỬ (MISA eSign Standard)")

    # Nội dung chi tiết
    c.setFillColorRGB(0.12, 0.12, 0.12)
    c.setFont(font_name, 7.2)
    c.drawString(x + 8, y + h - 25, f"Ký bởi: {str(signer_name).upper()}")
    c.setFont(font_name, 6.5)
    c.drawString(x + 8, y + h - 36, "Chức vụ: Hiệu trưởng — Trường Đại học Việt Nhật")
    c.drawString(x + 8, y + h - 47, f"Thời gian ký: {signed_at_str} (GMT+07:00)")
    c.drawString(x + 8, y + h - 58, f"Chứng thư: {ca_provider} | Serial: {serial}")
    c.setFont(font_name, 6.2)
    c.setFillColorRGB(0.08, 0.52, 0.22)
    c.drawString(x + 8, y + h - 68, "● Trạng thái: Chữ ký số hợp lệ — Văn bản gốc toàn vẹn")

    c.restoreState()


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


def procedure_kind(proc) -> str:
    """Phân loại thủ tục theo tên (type_id trên Render có thể lệch so với seed dev)."""
    name = (getattr(proc, "name", "") or "").strip().lower()
    if "miễn giảm" in name or "miễn, giảm" in name:
        return "exemption"
    if "hoàn trả" in name:
        return "refund"
    if "bảo lưu" in name:
        return "preservation"
    if "phúc khảo" in name:
        return "appeal"
    return "other"


def _decision_content(req, kind: str, student_name: str, mssv: str, class_name: str, cohort: str, major: str) -> dict:
    """Nội dung riêng của từng loại quyết định trình Hiệu trưởng ký."""
    form_data = req.form_data or {}
    student_line = f"   • Mã số sinh viên: {mssv}            Lớp: {class_name}        Khóa: {cohort}"

    if kind == "exemption":
        semester = form_data.get("exemption_semester") or form_data.get("semester") or "học kỳ hiện tại"
        level = form_data.get("discount_level") or "Miễn giảm theo quy định"
        beneficiary = form_data.get("beneficiary_type") or "Đối tượng chính sách"
        return {
            "subject": "Về việc miễn, giảm học phí cho sinh viên",
            "considers": [
                "- Căn cứ Quyết định thành lập Trường Đại học Việt Nhật thuộc Đại học Quốc gia Hà Nội;",
                "- Căn cứ Nghị định số 81/2021/NĐ-CP quy định về cơ chế thu, quản lý học phí và chính sách miễn, giảm học phí;",
                f"- Xét đơn đề nghị miễn, giảm học phí của sinh viên {student_name} và kết quả xác minh của Phòng Công tác Sinh viên;",
                "- Theo đề nghị của Trưởng phòng Kế hoạch Tài chính,",
            ],
            "articles": [
                f"Điều 1. {level} {semester} cho sinh viên {student_name.upper()}.",
                student_line,
                f"   • Ngành đào tạo: {major}",
                f"   • Đối tượng được hưởng: {beneficiary}",
                "Điều 2. Phòng Kế hoạch Tài chính điều chỉnh khoản phải thu học phí của sinh viên theo mức được miễn, giảm tại Điều 1.",
                "Điều 3. Trưởng phòng Công tác Sinh viên, Trưởng phòng Kế hoạch Tài chính và sinh viên có tên tại Điều 1 chịu trách nhiệm thi hành.",
            ],
            "archive": "- Lưu: VT, CTSV, KHTC.",
        }

    if kind == "refund":
        semester = form_data.get("refund_semester") or form_data.get("semester") or "học kỳ hiện tại"
        reason = form_data.get("refund_reason") or form_data.get("reason") or "Theo đề nghị của sinh viên"
        bank_line = (
            f"   • Hình thức: chuyển khoản tới tài khoản số {form_data.get('bank_account_no', '')} "
            f"tại {form_data.get('bank_name', '')}, chủ tài khoản {form_data.get('account_holder', '')}"
        )
        return {
            "subject": "Về việc hoàn trả học phí cho sinh viên",
            "considers": [
                "- Căn cứ Quyết định thành lập Trường Đại học Việt Nhật thuộc Đại học Quốc gia Hà Nội;",
                "- Căn cứ Quy chế chi tiêu nội bộ và quy định thu, hoàn trả học phí hiện hành của Trường;",
                f"- Xét đơn đề nghị hoàn trả học phí của sinh viên {student_name} và chứng từ đóng học phí kèm theo;",
                "- Theo đề nghị của Trưởng phòng Kế hoạch Tài chính,",
            ],
            "articles": [
                f"Điều 1. Hoàn trả cho sinh viên {student_name.upper()} số tiền {format_vnd(form_data.get('amount', 0))} học phí {semester}.",
                student_line,
                f"   • Lý do hoàn trả: {reason}",
                bank_line,
                "Điều 2. Phòng Kế hoạch Tài chính ghi nhận khoản hoàn trả và thực hiện chi qua hệ thống Internet Banking của Trường.",
                "Điều 3. Trưởng phòng Kế hoạch Tài chính, các đơn vị liên quan và sinh viên có tên tại Điều 1 chịu trách nhiệm thi hành.",
            ],
            "archive": "- Lưu: VT, KHTC.",
        }

    suspend_from = form_data.get("suspend_from") or form_data.get("semester") or "Học kỳ 2, năm học 2026-2027"
    suspend_to = form_data.get("suspend_to") or "Hết năm học 2026-2027"
    return_semester = form_data.get("return_semester") or "HK1 2027-2028"
    reason = form_data.get("reason") or "Lý do cá nhân / sức khỏe"
    gpa = form_data.get("gpa") or "3.2"
    return {
        "subject": "Về việc cho phép sinh viên tạm dừng và bảo lưu kết quả học tập",
        "considers": [
            "- Căn cứ Quyết định thành lập Trường Đại học Việt Nhật thuộc Đại học Quốc gia Hà Nội;",
            "- Căn cứ Quy chế đào tạo đại học hiện hành của Đại học Quốc gia Hà Nội;",
            f"- Xét Đơn xin bảo lưu kết quả học tập của sinh viên {student_name} (Điểm GPA: {gpa});",
            "- Theo đề nghị của Trưởng phòng Đào tạo và Quản trị người học,",
        ],
        "articles": [
            f"Điều 1. Cho phép sinh viên {student_name.upper()} được tạm dừng và bảo lưu kết quả học tập.",
            student_line,
            f"   • Ngành đào tạo: {major}",
            f"   • Thời gian bảo lưu: Từ {suspend_from} đến {suspend_to}",
            f"   • Thời điểm quay trở lại học tập: {return_semester}",
            f"   • Lý do: {reason}",
            "Điều 2. Trong thời gian bảo lưu, sinh viên phải thực hiện đúng các quy định hiện hành.",
            "Điều 3. Trưởng phòng Đào tạo, các đơn vị liên quan và sinh viên chịu trách nhiệm thi hành.",
        ],
        "archive": "- Lưu: VT, ĐT.",
    }


def _wrap_text(text: str, font_name: str, font_size: float, max_width: float) -> list:
    """Ngắt dòng theo độ rộng thực của font để câu dài không tràn khỏi trang A4."""
    indent = text[: len(text) - len(text.lstrip())]
    words = text.split()
    lines, current = [], ""
    for word in words:
        candidate = f"{current} {word}".strip()
        prefix = indent if not lines else indent + "    "
        if current and pdfmetrics.stringWidth(prefix + candidate, font_name, font_size) > max_width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return [(indent if i == 0 else indent + "    ") + line for i, line in enumerate(lines)] or [text]


def generate_decision_pdf(req, verification_code: str, smartca_data: dict = None) -> str:
    """
    Tạo file PDF Quyết định trình Hiệu trưởng ký (A4, layout chính thức VJU).
    Nội dung theo loại thủ tục: bảo lưu KQHT, miễn giảm học phí, hoàn trả học phí.
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

    content = _decision_content(
        req, procedure_kind(req.procedure_type), student_name, mssv, class_name, cohort, major,
    )

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
    c.drawCentredString(width / 2, height - 138, content["subject"])

    text_width = width - 100

    # Căn cứ
    c.setFont(font_name, 10)
    y = height - 175
    c.drawCentredString(width / 2, y, "HIỆU TRƯỞNG TRƯỜNG ĐẠI HỌC VIỆT NHẬT")
    y -= 20
    c.setFont(font_name, 9)
    for line in content["considers"]:
        for part in _wrap_text(line, font_name, 9, text_width):
            c.drawString(50, y, part)
            y -= 14
        y -= 2

    y -= 5
    c.setFont(font_name, 11)
    c.drawCentredString(width / 2, y, "QUYẾT ĐỊNH:")
    y -= 22

    c.setFont(font_name, 9.5)
    for line in content["articles"]:
        for part in _wrap_text(line, font_name, 9.5, text_width):
            c.drawString(50, y, part)
            y -= 15
        y -= 5

    # Chữ ký & Con dấu
    sig_y = y - 25
    c.setFont(font_name, 9)
    c.drawString(50, sig_y, "Nơi nhận:")
    c.drawString(50, sig_y - 14, "- Như Điều 3;")
    c.drawString(50, sig_y - 28, content["archive"])

    c.setFont(font_name, 10)
    c.drawCentredString(width - 150, sig_y, "HIỆU TRƯỞNG")

    if not smartca_data:
        # Bản thảo trình ký (chưa ký số)
        c.setFont(font_name, 9)
        c.setFillColorRGB(0.45, 0.45, 0.45)
        c.setDash(3, 3)
        c.rect(width - 235, sig_y - 95, 170, 70, fill=0, stroke=1)
        c.drawCentredString(width - 150, sig_y - 50, "[BẢN THẢO TRÌNH KÝ]")
        c.drawCentredString(width - 150, sig_y - 65, "Chưa có hiệu lực pháp lý")
        c.setDash()  # reset dash
        c.setFillColorRGB(0, 0, 0)
    else:
        # Chữ ký số chính thức (Mô phỏng MISA eSign theo Nghị định 30/2020/NĐ-CP)
        signer_name = smartca_data.get("signer_name", "PGS.TS. Nguyễn Văn Bình")
        ca_provider = smartca_data.get("ca_provider", "VJU Digital CA (Demo eSign)")
        serial = smartca_data.get("cert_serial", "5402-1890-9982-7716-VJU")
        signed_at_dt = smartca_data.get("signed_at") or now_local
        if hasattr(signed_at_dt, "strftime"):
            signed_at_str = signed_at_dt.strftime("%Y-%m-%d %H:%M:%S")
        else:
            signed_at_str = str(signed_at_dt)

        # 1. Vẽ nét chữ ký tay mực xanh bút máy của Hiệu trưởng
        _draw_cursive_signature(c, width - 190, sig_y - 40)

        # 2. Vẽ con dấu tròn đỏ tổ chức ĐH Việt Nhật đè 1/3 lên chữ ký tay về bên trái
        _draw_viet_nhat_seal(c, width - 195, sig_y - 36, radius=35, font_name=font_name)

        # 3. Họ tên Hiệu trưởng dưới chữ ký
        c.setFillColorRGB(0.08, 0.08, 0.08)
        c.setFont(font_name, 9.5)
        c.drawCentredString(width - 145, sig_y - 62, signer_name)

        # 4. Khung chứng nhận chữ ký số điện tử MISA eSign
        _draw_misa_esign_box(
            c, width - 250, sig_y - 148, 205, 76,
            signer_name=signer_name,
            ca_provider=ca_provider,
            serial=serial,
            signed_at_str=signed_at_str,
            font_name=font_name,
        )

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
