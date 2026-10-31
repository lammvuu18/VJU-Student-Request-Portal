import json
import base64
import hmac
import hashlib
import time
from django.conf import settings

def _base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode('utf-8').rstrip('=')

def _base64url_decode(data_str: str) -> bytes:
    padding = '=' * (4 - (len(data_str) % 4))
    return base64.urlsafe_b64decode(data_str + padding)

def generate_jwt_token(payload: dict, expires_in: int = 86400) -> str:
    """
    Tạo JSON Web Token (JWT) theo chuẩn HMAC-SHA256 (HS256)
    """
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    full_payload = {
        **payload,
        "iat": now,
        "exp": now + expires_in
    }

    header_bytes = json.dumps(header, separators=(',', ':')).encode('utf-8')
    payload_bytes = json.dumps(full_payload, separators=(',', ':')).encode('utf-8')

    encoded_header = _base64url_encode(header_bytes)
    encoded_payload = _base64url_encode(payload_bytes)

    signing_input = f"{encoded_header}.{encoded_payload}".encode('utf-8')
    signature = hmac.new(
        settings.SECRET_KEY.encode('utf-8'),
        signing_input,
        hashlib.sha256
    ).digest()

    encoded_signature = _base64url_encode(signature)
    return f"{encoded_header}.{encoded_payload}.{encoded_signature}"

def decode_jwt_token(token: str) -> dict:
    """
    Giải mã và xác thực chữ ký JWT token
    Trả về payload nếu hợp lệ, None nếu không hợp lệ hoặc đã hết hạn
    """
    if not token or not isinstance(token, str):
        return None

    parts = token.split('.')
    if len(parts) != 3:
        return None

    encoded_header, encoded_payload, encoded_signature = parts

    # Kiểm tra chữ ký
    signing_input = f"{encoded_header}.{encoded_payload}".encode('utf-8')
    expected_sig = hmac.new(
        settings.SECRET_KEY.encode('utf-8'),
        signing_input,
        hashlib.sha256
    ).digest()

    try:
        actual_sig = _base64url_decode(encoded_signature)
    except Exception:
        return None

    if not hmac.compare_digest(expected_sig, actual_sig):
        return None

    try:
        payload_bytes = _base64url_decode(encoded_payload)
        payload = json.loads(payload_bytes.decode('utf-8'))
    except Exception:
        return None

    # Kiểm tra hạn sử dụng
    exp = payload.get('exp')
    if exp and int(time.time()) > exp:
        return None

    return payload
