from django.urls import path
from . import views

urlpatterns = [
    path('auth/google', views.google_auth_view, name='auth_google'),
    path('auth/login', views.password_login_view, name='auth_login'),
    path('auth/me', views.me_view, name='auth_me'),
    path('auth/logout', views.logout_view, name='auth_logout'),
]
