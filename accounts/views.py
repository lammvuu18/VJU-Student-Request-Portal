import json
from datetime import datetime, timezone as dt_timezone
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import urlopen

from django.conf import settings
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt

from .models import RevokedToken, User, StudentRegistry
from .jwt_utils import generate_jwt_token, decode_jwt_token

GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo'


def _json_error(code: str, message: str, status: int = 400):
    return JsonResponse({
        "success": False,
        "error": {
            "code": code,
            "message": message
        }
    }, status=status)

def _read_json_object(request):
    """
    Đọc body JSON dạng object. Trả về None nếu body không hợp lệ.
    """
    try:
        body = json.loads(request.body.decode('utf-8'))
    except (UnicodeDecodeError, ValueError):
        return None
    return body if isinstance(body, dict) else None

def _get_token_payload(request):
    """
    Trích xuất payload từ header Authorization: Bearer <token>
    Token đã bị thu hồi khi đăng xuất được xem là không hợp lệ.
    """
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None
    token = auth_header.split(' ', 1)[1].strip()
    payload = decode_jwt_token(token)
    if not payload:
        return None
    if RevokedToken.objects.filter(jti=payload.get('jti')).exists():
        return None
    return payload

def _get_authenticated_user(request):
    """
    Trích xuất và xác thực user từ header Authorization: Bearer <token>
    """
    payload = _get_token_payload(request)
    if not payload:
        return None
    user_id = payload.get('user_id')
    if not user_id:
        return None
    try:
        user = User.objects.select_related('department', 'student_registry').get(user_id=user_id)
        if user.account_status == 'locked':
            return None
        return user
    except User.DoesNotExist:
        return None

def _verify_google_token(token: str):
    """
    Xác thực Google ID token với Google và trả về email đã được xác minh.
    Trả về None nếu token không hợp lệ.
    """
    # Chỉ bật ở môi trường dev: google_token là email để thử luồng đăng nhập
    if settings.GOOGLE_AUTH_DEV_BYPASS and '@' in token:
        return token.strip().lower()

    if not settings.GOOGLE_CLIENT_ID:
        return None

    try:
        with urlopen(f"{GOOGLE_TOKENINFO_URL}?{urlencode({'id_token': token})}", timeout=5) as response:
            info = json.load(response)
    except (URLError, TimeoutError, ValueError):
        return None

    if info.get('aud') != settings.GOOGLE_CLIENT_ID or str(info.get('email_verified')).lower() != 'true':
        return None
    return str(info.get('email', '')).strip().lower() or None


def api_not_found_view(request):
    """
    Trả lỗi 404 theo format JSON chung cho các đường dẫn /api/ không tồn tại
    """
    return _json_error("NOT_FOUND", "Không tìm thấy đường dẫn.", status=404)


@csrf_exempt
@require_http_methods(["POST"])
def google_auth_view(request):
    """
    POST /api/auth/google
    Đăng nhập bằng Google Workspace OAuth:
    - Sinh viên: mail @st.vju.ac.vn (phải có trong danh mục StudentRegistry do Admin import - BR-01)
    - Giảng viên/Cán bộ/Hiệu trưởng/Admin: mail @vju.ac.vn (phải có tài khoản trong hệ thống)
    """
    body = _read_json_object(request) or {}
    google_token = body.get('google_token') or body.get('id_token')
    email = _verify_google_token(google_token) if isinstance(google_token, str) else None

    if not email:
        return _json_error("INVALID_TOKEN", "Không tìm thấy thông tin email từ Google OAuth token.", status=400)

    # 1. Trường hợp 1: Tài khoản Sinh viên (@st.vju.ac.vn hoặc tồn tại trong StudentRegistry)
    student_reg = StudentRegistry.objects.filter(email=email).first()
    if not student_reg and email.endswith('@st.vju.ac.vn'):
        return _json_error(
            "EMAIL_NOT_REGISTERED",
            "Email không có trong danh sách sinh viên/cán bộ được phép đăng nhập.",
            status=403
        )

    if student_reg:
        # Kiểm tra trạng thái học tập
        if student_reg.academic_status == 'dismissed':
            return _json_error(
                "ACCOUNT_DISMISSED",
                "Tài khoản sinh viên đã bị đình chỉ/buộc thôi học. Vui lòng liên hệ Phòng Đào tạo.",
                status=403
            )

        # Tìm hoặc tạo User cho sinh viên
        user, _ = User.objects.get_or_create(
            email=email,
            defaults={
                'full_name': student_reg.full_name,
                'role': 'student',
                'student_registry': student_reg,
                'account_status': 'active',
            }
        )
        if not user.student_registry:
            user.student_registry = student_reg
            user.save(update_fields=['student_registry'])

        if user.account_status == 'locked':
            return _json_error("ACCOUNT_LOCKED", "Tài khoản sinh viên đã bị khóa. Vui lòng liên hệ quản trị viên.", status=403)

        token = generate_jwt_token({
            "user_id": user.user_id,
            "email": user.email,
            "role": user.role,
        })

        return JsonResponse({
            "success": True,
            "data": {
                "access_token": token,
                "expires_in": 86400,
                "user": user.to_dict()
            },
            "message": "Đăng nhập Google thành công."
        })

    # 2. Trường hợp 2: Tài khoản Cán bộ, Giảng viên, Hiệu trưởng, Admin (@vju.ac.vn)
    user = User.objects.filter(email=email).first()
    if not user:
        return _json_error(
            "EMAIL_NOT_REGISTERED",
            "Email không có trong danh sách sinh viên/cán bộ được phép đăng nhập.",
            status=403
        )

    if user.account_status == 'locked':
        return _json_error("ACCOUNT_LOCKED", "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.", status=403)

    token = generate_jwt_token({
        "user_id": user.user_id,
        "email": user.email,
        "role": user.role,
    })

    return JsonResponse({
        "success": True,
        "data": {
            "access_token": token,
            "expires_in": 86400,
            "user": user.to_dict()
        },
        "message": "Đăng nhập Google thành công."
    })


@csrf_exempt
@require_http_methods(["POST"])
def password_login_view(request):
    """
    POST /api/auth/login
    Đăng nhập bằng Email + Mật khẩu:
    - Giảng viên/Cán bộ/Trưởng phòng, Admin, Hiệu trưởng: ĐƯỢC PHÉP đăng nhập bằng email + mật khẩu.
    - Sinh viên: KHÔNG ĐƯỢC PHÉP đăng nhập bằng mật khẩu (chỉ đăng nhập bằng mail VJU/Google).
    """
    body = _read_json_object(request)
    if body is None:
        return _json_error("INVALID_JSON", "Dữ liệu gửi lên không đúng định dạng JSON.", status=400)

    email = body.get('email')
    password = body.get('password')
    if not isinstance(email, str) or not isinstance(password, str):
        return _json_error("MISSING_CREDENTIALS", "Vui lòng nhập đầy đủ email và mật khẩu.", status=400)

    email = email.strip().lower()
    if not email or not password:
        return _json_error("MISSING_CREDENTIALS", "Vui lòng nhập đầy đủ email và mật khẩu.", status=400)

    user = User.objects.filter(email=email).first()
    if not user:
        # Kiểm tra xem có phải là email của sinh viên trong StudentRegistry hay không
        is_student_in_reg = StudentRegistry.objects.filter(email=email).exists()
        if is_student_in_reg or email.endswith('@st.vju.ac.vn'):
            return _json_error(
                "STUDENT_PASSWORD_LOGIN_DENIED",
                "Sinh viên chỉ có thể đăng nhập bằng tài khoản Google VJU (@st.vju.ac.vn), không được dùng mật khẩu.",
                status=403
            )
        return _json_error("INVALID_CREDENTIALS", "Email hoặc mật khẩu không chính xác.", status=401)

    # Sinh viên đã có tài khoản User trong hệ thống cũng không được đăng nhập mật khẩu
    if user.role == 'student':
        return _json_error(
            "STUDENT_PASSWORD_LOGIN_DENIED",
            "Sinh viên chỉ có thể đăng nhập bằng tài khoản Google VJU (@st.vju.ac.vn), không được dùng mật khẩu.",
            status=403
        )

    if user.account_status == 'locked':
        return _json_error("ACCOUNT_LOCKED", "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.", status=403)

    if not user.check_password(password):
        return _json_error("INVALID_CREDENTIALS", "Email hoặc mật khẩu không chính xác.", status=401)

    token = generate_jwt_token({
        "user_id": user.user_id,
        "email": user.email,
        "role": user.role,
    })

    return JsonResponse({
        "success": True,
        "data": {
            "access_token": token,
            "expires_in": 86400,
            "user": user.to_dict()
        },
        "message": "Đăng nhập thành công."
    })


@require_http_methods(["GET"])
def me_view(request):
    """
    GET /api/auth/me
    Lấy thông tin người dùng đang đăng nhập qua header Authorization: Bearer <token>
    """
    user = _get_authenticated_user(request)
    if not user:
        return _json_error("UNAUTHORIZED", "Chưa đăng nhập hoặc phiên làm việc đã hết hạn.", status=401)

    return JsonResponse({
        "success": True,
        "data": user.to_dict()
    })


@csrf_exempt
@require_http_methods(["POST"])
def logout_view(request):
    """
    POST /api/auth/logout
    Đăng xuất tài khoản: vô hiệu hóa access token hiện tại
    """
    payload = _get_token_payload(request)
    if payload and payload.get('jti'):
        RevokedToken.objects.get_or_create(
            jti=payload['jti'],
            defaults={'expires_at': datetime.fromtimestamp(payload['exp'], tz=dt_timezone.utc)}
        )
    # Token đã hết hạn thì không dùng lại được nữa, không cần lưu
    RevokedToken.objects.filter(expires_at__lt=timezone.now()).delete()

    return JsonResponse({
        "success": True,
        "message": "Đăng xuất thành công."
    })

