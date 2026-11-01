import json
from io import BytesIO, StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase, override_settings

from accounts.jwt_utils import generate_jwt_token
from accounts.models import Notification, User


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

    def test_cors_only_allows_configured_origins(self):
        allowed = self.client.get('/api/auth/me', HTTP_ORIGIN='http://localhost:3000')
        self.assertEqual(allowed['Access-Control-Allow-Origin'], 'http://localhost:3000')
        blocked = self.client.get('/api/auth/me', HTTP_ORIGIN='http://evil.example')
        self.assertNotIn('Access-Control-Allow-Origin', blocked)
