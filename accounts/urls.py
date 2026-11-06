from django.urls import path
from . import views
from . import procedure_views
from . import notification_views
from . import request_views
from . import staff_views
from . import payment_views

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

    # Module 1-2: Student Requests & Results & Verification
    path('requests', request_views.requests_collection_view, name='requests_collection'),
    path('requests/<int:request_id>', request_views.request_detail_view, name='request_detail'),
    path('requests/<int:request_id>/payments', payment_views.request_payments_dispatch_view, name='request_payments'),
    path('requests/<int:request_id>/cancel', request_views.request_cancel_view, name='request_cancel'),
    path('requests/<int:request_id>/supplements', request_views.request_supplements_view, name='request_supplements'),
    path('requests/<int:request_id>/timeline', request_views.request_timeline_view, name='request_timeline'),
    path('requests/<int:request_id>/feedback', request_views.request_feedback_view, name='request_feedback'),
    path('results/<int:result_id>/download', request_views.result_download_view, name='result_download'),
    path('attachments/<int:attachment_id>/download', request_views.attachment_download_view, name='attachment_download'),
    path('verify/<str:verification_code>', request_views.verify_document_view, name='verify_document'),

    # Payment Gateway Webhook
    path('webhooks/payos', payment_views.payos_webhook_view, name='payos_webhook'),

    # Module 1-2: Staff & Department Head workflow
    path('staff/inbox', staff_views.staff_inbox_view, name='staff_inbox'),
    path('staff/department-members', staff_views.staff_department_members_view, name='staff_department_members'),
    path('staff/requests/<int:request_id>/assign', staff_views.staff_assign_request_view, name='staff_assign_request'),
    path('staff/requests/<int:request_id>/approve', staff_views.staff_approve_request_view, name='staff_approve_request'),
    path('staff/requests/<int:request_id>/reject', staff_views.staff_reject_request_view, name='staff_reject_request'),
    path('staff/requests/<int:request_id>/request-supplement', staff_views.staff_request_supplement_view, name='staff_request_supplement'),
    path('staff/requests/<int:request_id>/assign-pickup', staff_views.staff_assign_pickup_view, name='staff_assign_pickup'),
    path('staff/requests/<int:request_id>/confirm-handover', staff_views.staff_confirm_handover_view, name='staff_confirm_handover'),
    path('staff/requests/<int:request_id>/revoke', staff_views.staff_revoke_approval_view, name='staff_revoke_approval'),
    path('rejection-reasons', staff_views.rejection_reasons_view, name='rejection_reasons'),
]
