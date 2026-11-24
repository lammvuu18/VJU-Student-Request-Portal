# Cấu hình Gunicorn tự động nạp khi chạy `gunicorn core.wsgi:application` trên Render
workers = 2
threads = 4
worker_class = "gthread"
timeout = 120
graceful_timeout = 30
keepalive = 5
max_requests = 1000
max_requests_jitter = 100
