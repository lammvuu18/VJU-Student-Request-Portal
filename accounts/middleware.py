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
        origin = request.headers.get('Origin', '*')
        response['Access-Control-Allow-Origin'] = origin if origin else '*'
        response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
        response['Access-Control-Allow-Headers'] = 'Authorization, Content-Type, X-CSRFToken, X-Requested-With'
        response['Access-Control-Allow-Credentials'] = 'true'
