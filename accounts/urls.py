from django.urls import path
from . import views
from . import procedure_views
from . import notification_views

urlpatterns = [
    # Authentication endpoints
    path('auth/google', views.google_auth_view, name='auth_google'),
    path('auth/login', views.password_login_view, name='auth_login'),
    path('auth/me', views.me_view, name='auth_me'),
    path('auth/logout', views.logout_view, name='auth_logout'),

    # Student - Procedure Catalog (API 1 & API 2)
    path('procedures', procedure_views.procedure_catalog_view, name='procedure_catalog'),
    path('procedures/<int:type_id>', procedure_views.procedure_detail_view, name='procedure_detail'),

    # Notifications (API 3, API 4 & API 5)
    path('notifications', notification_views.notification_list_view, name='notification_list'),
    path('notifications/read-all', notification_views.notification_read_all_view, name='notification_read_all'),
    path('notifications/<int:notification_id>/read', notification_views.notification_mark_read_view, name='notification_mark_read'),
]
