from django.contrib import admin
from django.urls import path, include, re_path

from accounts.views import api_not_found_view

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('accounts.urls')),
    re_path(r'^api/', api_not_found_view),
]
