from django.conf import settings
from django.http import HttpResponse

class CorsMiddleware:
    """
    Middleware hỗ trợ CORS cho frontend (React) gọi API từ cổng khác (VD: 3000, 8080)
    Đồng thời miễn trừ CSRF cho các API routes (/api/)
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Miễn trừ CSRF cho API endpoints
        if request.path.startswith('/api/'):
            setattr(request, '_dont_enforce_csrf_checks', True)

        # Xử lý preflight request OPTIONS
        if request.method == 'OPTIONS':
            response = HttpResponse(status=200)
            self._add_cors_headers(response, request)
            return response

        response = self.get_response(request)
        self._add_cors_headers(response, request)
        return response

    def _add_cors_headers(self, response, request):
        response['Vary'] = 'Origin'
        origin = request.headers.get('Origin')
        if not origin:
            return
        allowed_origins = [o.strip() for o in getattr(settings, 'CORS_ALLOWED_ORIGINS', []) if o.strip()]
        if origin in allowed_origins or settings.DEBUG or '*' in allowed_origins:
            response['Access-Control-Allow-Origin'] = origin
            response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
            response['Access-Control-Allow-Headers'] = 'Authorization, Content-Type, X-CSRFToken, X-Requested-With'
            response['Access-Control-Allow-Credentials'] = 'true'
