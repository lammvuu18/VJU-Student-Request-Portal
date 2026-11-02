import json
from datetime import timedelta
from io import BytesIO, StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings
from django.utils import timezone

from accounts.jwt_utils import generate_jwt_token
from accounts.models import (
    FormField, LoginAttempt, Notification, ProcedureType, RejectionReason, StudentRegistry, User,
)


@override_settings(DEBUG=True, GOOGLE_AUTH_DEV_BYPASS=False, GOOGLE_CLIENT_ID='')
class Module0TestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command('seed_module0', allow_non_sqlite=True, stdout=StringIO())
        cls.student_a = User.objects.get(email='student01@st.vju.ac.vn')
        cls.student_b = User.objects.get(email='quocanh@st.vju.ac.vn')
        cls.paging = User.objects.get(email='minhanh@st.vju.ac.vn')
        cls.staff = User.objects.get(email='hoangnam@vju.ac.vn')

    def auth(self, user):
        token = generate_jwt_token({'user_id': user.user_id})
        return {'HTTP_AUTHORIZATION': f'Bearer {token}'}


class BootstrapProductionTests(TestCase):
    def setUp(self):
        with override_settings(DEBUG=True):
            call_command('seed_data', stdout=StringIO())

    def bootstrap(self, **env):
        with patch.dict('os.environ', env):
            call_command('bootstrap_production', stdout=StringIO())

    def test_disables_sample_passwords(self):
        self.bootstrap()
        res = self.client.post(
            '/api/auth/login', data=json.dumps({'email': 'admin@vju.ac.vn', 'password': 'admin123'}),
            content_type='application/json',
        )
        self.assertEqual(res.status_code, 401)

    def test_creates_admin_once_without_overwriting_password(self):
        env = {'BOOTSTRAP_ADMIN_EMAIL': 'root@vju.ac.vn', 'BOOTSTRAP_ADMIN_PASSWORD': 'a-long-secret-pass'}
        self.bootstrap(**env)
        admin = User.objects.get(email='root@vju.ac.vn')
        self.assertEqual(admin.role, 'admin')
        admin.set_password('changed-after-deploy')
        admin.save()

        self.bootstrap(**env)
        self.assertTrue(User.objects.get(email='root@vju.ac.vn').check_password('changed-after-deploy'))

    def test_rejects_weak_admin_password(self):
        with self.assertRaises(CommandError):
            self.bootstrap(BOOTSTRAP_ADMIN_EMAIL='root@vju.ac.vn', BOOTSTRAP_ADMIN_PASSWORD='short')

    def test_seeds_catalog_once_without_test_procedures(self):
        self.bootstrap()
        self.bootstrap()
        names = list(ProcedureType.objects.values_list('name', flat=True))
        self.assertEqual(len(names), len(set(names)))
        self.assertIn('Giấy xác nhận sinh viên', names)
        self.assertNotIn('Thủ tục đã ẩn (soft delete)', names)
        self.assertEqual(FormField.objects.filter(procedure_type__name='Giấy xác nhận sinh viên').count(), 11)

    @override_settings(DEBUG=False)
    def test_seed_data_refuses_to_run_in_production(self):
        with self.assertRaises(CommandError):
            call_command('seed_data', stdout=StringIO())


@override_settings(DEBUG=False, GOOGLE_AUTH_DEV_BYPASS=True)
class SeedDemoTests(TestCase):
    ENV = {
        'SEED_DEMO': 'True',
        'DEMO_PASSWORD': 'demo-password-123',
        'DEMO_STUDENT_EMAILS': ' Demo.One@gmail.com, demo.two@gmail.com ,',
    }

    def seed(self, **overrides):
        with patch.dict('os.environ', {**self.ENV, **overrides}):
            call_command('seed_demo', stdout=StringIO())

    def login(self, email, password):
        return self.client.post(
            '/api/auth/login', data=json.dumps({'email': email, 'password': password}),
            content_type='application/json',
        )

    def test_does_nothing_without_flag(self):
        users_before = User.objects.count()
        self.seed(SEED_DEMO='False')
        self.assertEqual(User.objects.count(), users_before)

    def test_rejects_short_password(self):
        with self.assertRaises(CommandError):
            self.seed(DEMO_PASSWORD='short')

    def test_creates_demo_accounts_that_can_log_in(self):
        self.seed()
        res = self.login('demo.truongphong@vju.ac.vn', 'demo-password-123')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['data']['user']['redirect_url'], '/dept-head')

        student = User.objects.get(email='demo.one@gmail.com')
        self.assertEqual(student.role, 'student')
        self.assertEqual(student.student_registry.mssv, 'DEMO001')
        res = self.client.post(
            '/api/auth/google', data=json.dumps({'google_token': 'demo.two@gmail.com'}),
            content_type='application/json',
        )
        self.assertEqual(res.json()['data']['user']['role'], 'student')
        self.assertEqual(Notification.objects.filter(user=student, is_read=False).count(), 2)

    def test_rerun_keeps_demo_changes_and_updates_password(self):
        self.seed()
        Notification.objects.filter(user__email='demo.one@gmail.com').update(is_read=True)
        counts = (User.objects.count(), StudentRegistry.objects.count(), Notification.objects.count())

        self.seed(DEMO_PASSWORD='new-demo-password')
        self.assertEqual((User.objects.count(), StudentRegistry.objects.count(), Notification.objects.count()), counts)
        self.assertFalse(Notification.objects.filter(user__email='demo.one@gmail.com', is_read=False).exists())
        self.assertEqual(self.login('demo.chuyenvien@vju.ac.vn', 'new-demo-password').status_code, 200)

    def test_new_student_email_is_added_on_next_deploy(self):
        self.seed()
        self.seed(DEMO_STUDENT_EMAILS='demo.one@gmail.com,demo.three@gmail.com')
        self.assertEqual(StudentRegistry.objects.get(email='demo.three@gmail.com').mssv, 'DEMO003')

    def test_skips_email_that_is_already_staff(self):
        User.objects.create(email='staff.person@gmail.com', full_name='Can bo', role='staff')
        self.seed(DEMO_STUDENT_EMAILS='staff.person@gmail.com')
        self.assertEqual(User.objects.get(email='staff.person@gmail.com').role, 'staff')
        self.assertFalse(StudentRegistry.objects.filter(email='staff.person@gmail.com').exists())


@override_settings(DEBUG=True)
class SeedModule1Tests(TestCase):
    def test_seeds_actors_and_rejection_reasons_repeatedly(self):
        call_command('seed_module1', allow_non_sqlite=True, stdout=StringIO())
        call_command('seed_module1', allow_non_sqlite=True, stdout=StringIO())

        self.assertEqual(RejectionReason.objects.count(), 10)
        self.assertEqual(RejectionReason.objects.get(pk=6).reason_text, 'Sinh viên đã bị buộc thôi học')
        self.assertEqual(FormField.objects.filter(procedure_type_id=2).count(), 5)
        self.assertEqual(User.objects.get(email='suspended@st.vju.ac.vn').account_status, 'active')
        self.assertEqual(User.objects.get(email='graduated@st.vju.ac.vn').role, 'student')
        self.assertEqual(User.objects.get(email='cv2.pctsv@vju.ac.vn').department.code, 'PCTSV')

    @override_settings(DEBUG=False)
    def test_refuses_to_run_in_production(self):
        with self.assertRaises(CommandError):
            call_command('seed_module1', stdout=StringIO())


class ProcedureTests(Module0TestCase):
    def test_catalog_groups_active_procedures_by_department(self):
        res = self.client.get('/api/procedures', **self.auth(self.student_a))
        self.assertEqual(res.status_code, 200)
        groups = [[p['type_id'] for p in g['procedures']] for g in res.json()['data']]
        self.assertEqual(groups, [[1, 2, 5], [3, 4], [6]])

    def test_invalid_department_id_returns_400(self):
        res = self.client.get('/api/procedures?department_id=abc', **self.auth(self.student_a))
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.json()['error']['code'], 'INVALID_PARAM')

    def test_staff_cannot_view_procedures(self):
        for url in ('/api/procedures', '/api/procedures/1'):
            res = self.client.get(url, **self.auth(self.staff))
            self.assertEqual(res.status_code, 403)
            self.assertEqual(res.json()['error']['code'], 'FORBIDDEN')

    def test_form_fields_follow_display_order(self):
        res = self.client.get('/api/procedures/4', **self.auth(self.student_a))
        self.assertEqual([f['field_id'] for f in res.json()['data']['form_fields']], [403, 401, 402])

    def test_inactive_procedure_returns_404(self):
        for type_id in (7, 8):
            res = self.client.get(f'/api/procedures/{type_id}', **self.auth(self.student_a))
            self.assertEqual(res.status_code, 404)
            self.assertEqual(res.json()['error']['code'], 'PROCEDURE_INACTIVE')

    def test_unknown_api_path_returns_json_404(self):
        res = self.client.get('/api/procedures/abc', **self.auth(self.student_a))
        self.assertEqual(res.status_code, 404)
        self.assertEqual(res.json()['error']['code'], 'NOT_FOUND')


class NotificationTests(Module0TestCase):
    def test_only_own_notifications_newest_first(self):
        res = self.client.get('/api/notifications', **self.auth(self.student_a)).json()
        self.assertEqual([n['notification_id'] for n in res['data']], [4, 1])
        self.assertEqual(res['unread_count'], 1)

    def test_datetime_uses_local_time(self):
        res = self.client.get('/api/notifications', **self.auth(self.student_a)).json()
        self.assertEqual(res['data'][0]['sent_at'], '2026-10-30T09:00:00')

    def test_default_pagination(self):
        res = self.client.get('/api/notifications', **self.auth(self.paging)).json()
        self.assertEqual(len(res['data']), 20)
        self.assertEqual(res['pagination'], {'page': 1, 'limit': 20, 'total': 25, 'total_pages': 2})

    def test_pagination_with_filter_and_page_out_of_range(self):
        filtered = self.client.get('/api/notifications?is_read=false&limit=5', **self.auth(self.paging)).json()
        self.assertEqual(filtered['pagination']['total'], 20)
        beyond = self.client.get('/api/notifications?page=99999999999999999999', **self.auth(self.paging))
        self.assertEqual(beyond.status_code, 200)
        self.assertEqual(beyond.json()['data'], [])

    def test_invalid_query_params_return_400(self):
        for query in ('is_read=abc', 'page=abc', 'page=0', 'limit=abc', 'limit=0'):
            res = self.client.get(f'/api/notifications?{query}', **self.auth(self.student_a))
            self.assertEqual(res.status_code, 400, query)

    def test_mark_read_rejects_other_users_notification(self):
        res = self.client.put('/api/notifications/2/read', **self.auth(self.student_a))
        self.assertEqual(res.status_code, 403)
        self.assertFalse(Notification.objects.get(pk=2).is_read)

    def test_read_all_only_touches_own_unread_notifications(self):
        read_at = Notification.objects.get(pk=6).read_at
        res = self.client.put('/api/notifications/read-all', **self.auth(self.student_b))
        self.assertEqual(res.status_code, 200)
        self.assertFalse(Notification.objects.filter(user=self.student_b, is_read=False).exists())
        self.assertEqual(Notification.objects.get(pk=6).read_at, read_at)
        self.assertFalse(Notification.objects.get(pk=3).is_read)


class AuthSecurityTests(Module0TestCase):
    def post_json(self, url, body):
        return self.client.post(url, data=json.dumps(body), content_type='application/json')

    def test_google_login_rejects_plain_email_without_bypass(self):
        res = self.post_json('/api/auth/google', {'email': 'admin@vju.ac.vn'})
        self.assertEqual(res.status_code, 400)
        res = self.post_json('/api/auth/google', {'google_token': 'admin@vju.ac.vn'})
        self.assertEqual(res.status_code, 400)

    @override_settings(GOOGLE_CLIENT_ID='client-id')
    def test_google_login_rejects_token_for_other_audience(self):
        info = BytesIO(json.dumps({
            'aud': 'other', 'email': 'admin@vju.ac.vn', 'email_verified': 'true',
        }).encode())
        with patch('accounts.views.urlopen', return_value=info):
            res = self.post_json('/api/auth/google', {'google_token': 'eyJhbGciOi.forged.token'})
        self.assertEqual(res.status_code, 400)

    @override_settings(GOOGLE_CLIENT_ID='client-id')
    def test_google_login_accepts_verified_token(self):
        info = BytesIO(json.dumps({
            'aud': 'client-id', 'email': 'student01@st.vju.ac.vn', 'email_verified': 'true',
        }).encode())
        with patch('accounts.views.urlopen', return_value=info):
            res = self.post_json('/api/auth/google', {'google_token': 'valid-google-token'})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()['data']['user']['email'], 'student01@st.vju.ac.vn')

    def test_invalid_login_payloads_return_400(self):
        self.assertEqual(self.post_json('/api/auth/login', {'email': None, 'password': 'x'}).status_code, 400)
        self.assertEqual(self.post_json('/api/auth/login', ['a']).status_code, 400)
        self.assertEqual(self.post_json('/api/auth/google', {'google_token': None, 'email': None}).status_code, 400)

    def test_logout_revokes_token(self):
        headers = self.auth(self.student_a)
        self.assertEqual(self.client.get('/api/auth/me', **headers).status_code, 200)
        self.assertEqual(self.client.post('/api/auth/logout', **headers).status_code, 200)
        self.assertEqual(self.client.get('/api/auth/me', **headers).status_code, 401)

    @override_settings(GOOGLE_AUTH_DEV_BYPASS=True)
    def test_suspended_and_graduated_students_can_login(self):
        for email in ('suspended@st.vju.ac.vn', 'graduated@st.vju.ac.vn'):
            User.objects.filter(email=email).update(account_status='active')
            res = self.post_json('/api/auth/google', {'google_token': email})
            self.assertEqual(res.status_code, 200, email)

    def test_login_locks_after_repeated_failures(self):
        credentials = {'email': 'admin@vju.ac.vn', 'password': 'wrong-password'}
        for _ in range(5):
            self.assertEqual(self.post_json('/api/auth/login', credentials).status_code, 401)

        res = self.post_json('/api/auth/login', {'email': 'admin@vju.ac.vn', 'password': 'admin123'})
        self.assertEqual(res.status_code, 409)
        self.assertEqual(res.json()['error']['code'], 'RATE_LIMIT_EXCEEDED')
        other = self.post_json('/api/auth/login', {'email': 'hoangnam@vju.ac.vn', 'password': 'staff123'})
        self.assertEqual(other.status_code, 200)

    def test_login_lock_expires_and_success_clears_failures(self):
        credentials = {'email': 'admin@vju.ac.vn', 'password': 'wrong-password'}
        for _ in range(5):
            self.post_json('/api/auth/login', credentials)
        LoginAttempt.objects.update(locked_until=timezone.now() - timedelta(seconds=1))

        res = self.post_json('/api/auth/login', {'email': 'admin@vju.ac.vn', 'password': 'admin123'})
        self.assertEqual(res.status_code, 200)
        self.assertFalse(LoginAttempt.objects.exists())

    def test_login_with_oversized_email_does_not_crash(self):
        res = self.post_json('/api/auth/login', {'email': 'a' * 300 + '@vju.ac.vn', 'password': 'x'})
        self.assertEqual(res.status_code, 401)

    def test_cors_only_allows_configured_origins(self):
        allowed = self.client.get('/api/auth/me', HTTP_ORIGIN='http://localhost:3000')
        self.assertEqual(allowed['Access-Control-Allow-Origin'], 'http://localhost:3000')
        blocked = self.client.get('/api/auth/me', HTTP_ORIGIN='http://evil.example')
        self.assertNotIn('Access-Control-Allow-Origin', blocked)
