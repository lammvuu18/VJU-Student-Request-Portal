import json
import base64
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt

from .models import User, StudentRegistry
from .jwt_utils import generate_jwt_token, decode_jwt_token

def _json_error(code: str, message: str, status: int = 400):
    return JsonResponse({
        "success": False,
        "error": {
            "code": code,
            "message": message
        }
    }, status=status)

def _get_authenticated_user(request):
    """
    Trích xuất và xác thực user từ header Authorization: Bearer <token>
    """
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None
    token = auth_header.split(' ', 1)[1].strip()
    payload = decode_jwt_token(token)
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


@csrf_exempt
@require_http_methods(["POST"])
def google_auth_view(request):
    """
    POST /api/auth/google
    Đăng nhập bằng Google Workspace OAuth:
    - Sinh viên: mail @st.vju.ac.vn (phải có trong danh mục StudentRegistry do Admin import - BR-01)
    - Giảng viên/Cán bộ/Hiệu trưởng/Admin: mail @vju.ac.vn (phải có tài khoản trong hệ thống)
    """
    try:
        body = json.loads(request.body.decode('utf-8'))
    except Exception:
        body = {}

    google_token = body.get('google_token') or body.get('id_token') or body.get('email')
    email = body.get('email', '').strip().lower()

    # Nếu truyền token, trích xuất email từ Google ID token (hỗ trợ JWT từ Google hoặc dev mock token)
    if google_token and not email:
        token_str = str(google_token).strip()
        if '@' in token_str and ' ' not in token_str and not token_str.startswith('eyJ'):
            # Trực tiếp truyền email dạng tiện ích dev / test
            email = token_str.lower()
        elif token_str.startswith('eyJ'):
            # Là JWT token (Google ID token)
            parts = token_str.split('.')
            if len(parts) >= 2:
                try:
                    padding = '=' * (4 - (len(parts[1]) % 4))
                    decoded = base64.urlsafe_b64decode(parts[1] + padding).decode('utf-8')
                    payload = json.loads(decoded)
                    email = payload.get('email', '').strip().lower()
                except Exception:
                    pass

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
    try:
        body = json.loads(request.body.decode('utf-8'))
    except Exception:
        return _json_error("INVALID_JSON", "Dữ liệu gửi lên không đúng định dạng JSON.", status=400)

    email = body.get('email', '').strip().lower()
    password = body.get('password', '')

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
    Đăng xuất tài khoản
    """
    return JsonResponse({
        "success": True,
        "message": "Đăng xuất thành công."
    })
