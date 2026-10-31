import json
from django.test import TestCase, Client
from accounts.models import Department, StudentRegistry, User

class AuthRoleTestCase(TestCase):
    def setUp(self):
        self.client = Client()

        # Tạo phòng ban
        self.dept_pdt = Department.objects.create(name='Phòng Đào tạo', code='PĐT')
        self.dept_ctsv = Department.objects.create(name='Phòng Công tác Sinh viên', code='PCTSV')

        # Tạo danh mục sinh viên
        self.reg_student = StudentRegistry.objects.create(
            email='sinhvien@st.vju.ac.vn',
            mssv='21CS999',
            full_name='Sinh Viên Test',
            class_name='CS2021A',
            cohort='K2021',
            major='Khoa học Máy tính',
            academic_status='active'
        )

        self.reg_dismissed = StudentRegistry.objects.create(
            email='dismissed@st.vju.ac.vn',
            mssv='21CS888',
            full_name='Sinh Viên Thôi Học',
            class_name='CS2021A',
            cohort='K2021',
            major='Khoa học Máy tính',
            academic_status='dismissed'
        )

        # Tạo tài khoản người dùng
        # Admin
        self.admin = User.objects.create(
            email='admin@vju.ac.vn',
            full_name='Admin VJU',
            role='admin',
            account_status='active'
        )
        self.admin.set_password('admin123')
        self.admin.save()

        # Hiệu trưởng
        self.principal = User.objects.create(
            email='principal@vju.ac.vn',
            full_name='PGS.TS Hiệu Trưởng',
            role='principal',
            authority_level=3,
            account_status='active'
        )
        self.principal.set_password('principal123')
        self.principal.save()

        # Trưởng phòng
        self.head = User.objects.create(
            email='truongphong@vju.ac.vn',
            full_name='Trưởng Phòng Đào Tạo',
            role='dept_head',
            authority_level=2,
            department=self.dept_pdt,
            account_status='active'
        )
        self.head.set_password('head123')
        self.head.save()

        # Chuyên viên / Giảng viên
        self.staff = User.objects.create(
            email='chuyenvien@vju.ac.vn',
            full_name='Chuyên Viên PĐT',
            role='staff',
            authority_level=1,
            department=self.dept_pdt,
            account_status='active'
        )
        self.staff.set_password('staff123')
        self.staff.save()

    def test_student_google_login_success(self):
        """Sinh viên có thể đăng nhập bằng mail VJU (@st.vju.ac.vn) và điều hướng sang /student"""
        res = self.client.post(
            '/api/auth/google',
            data=json.dumps({'google_token': 'sinhvien@st.vju.ac.vn'}),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data['success'])
        self.assertIn('access_token', data['data'])
        self.assertEqual(data['data']['user']['role'], 'student')
        self.assertEqual(data['data']['user']['redirect_url'], '/student')
        self.assertEqual(data['data']['user']['mssv'], '21CS999')

    def test_student_not_in_registry_denied(self):
        """Mail sinh viên không có trong StudentRegistry bị từ chối với mã EMAIL_NOT_REGISTERED"""
        res = self.client.post(
            '/api/auth/google',
            data=json.dumps({'google_token': 'unknown@st.vju.ac.vn'}),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 403)
        data = res.json()
        self.assertFalse(data['success'])
        self.assertEqual(data['error']['code'], 'EMAIL_NOT_REGISTERED')

    def test_student_dismissed_denied(self):
        """Sinh viên bị thôi học không được phép đăng nhập"""
        res = self.client.post(
            '/api/auth/google',
            data=json.dumps({'google_token': 'dismissed@st.vju.ac.vn'}),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 403)
        data = res.json()
        self.assertFalse(data['success'])
        self.assertEqual(data['error']['code'], 'ACCOUNT_DISMISSED')

    def test_student_cannot_login_with_password(self):
        """Sinh viên KHÔNG ĐƯỢC PHÉP đăng nhập bằng mật khẩu"""
        res = self.client.post(
            '/api/auth/login',
            data=json.dumps({'email': 'sinhvien@st.vju.ac.vn', 'password': 'somepassword'}),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 403)
        data = res.json()
        self.assertFalse(data['success'])
        self.assertEqual(data['error']['code'], 'STUDENT_PASSWORD_LOGIN_DENIED')

    def test_staff_password_login_and_redirect(self):
        """Chuyên viên/Giảng viên đăng nhập bằng mật khẩu và điều hướng về /staff"""
        res = self.client.post(
            '/api/auth/login',
            data=json.dumps({'email': 'chuyenvien@vju.ac.vn', 'password': 'staff123'}),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['data']['user']['role'], 'staff')
        self.assertEqual(data['data']['user']['redirect_url'], '/staff')

    def test_dept_head_password_login_and_redirect(self):
        """Trưởng phòng đăng nhập bằng mật khẩu và điều hướng về /dept-head"""
        res = self.client.post(
            '/api/auth/login',
            data=json.dumps({'email': 'truongphong@vju.ac.vn', 'password': 'head123'}),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['data']['user']['role'], 'dept_head')
        self.assertEqual(data['data']['user']['redirect_url'], '/dept-head')

    def test_principal_password_login_and_redirect(self):
        """Hiệu trưởng đăng nhập bằng mật khẩu và điều hướng về /principal"""
        res = self.client.post(
            '/api/auth/login',
            data=json.dumps({'email': 'principal@vju.ac.vn', 'password': 'principal123'}),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['data']['user']['role'], 'principal')
        self.assertEqual(data['data']['user']['redirect_url'], '/principal')

    def test_admin_password_login_and_redirect(self):
        """Admin đăng nhập bằng mật khẩu và điều hướng về /admin"""
        res = self.client.post(
            '/api/auth/login',
            data=json.dumps({'email': 'admin@vju.ac.vn', 'password': 'admin123'}),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['data']['user']['role'], 'admin')
        self.assertEqual(data['data']['user']['redirect_url'], '/admin')

    def test_staff_can_also_login_with_google(self):
        """Cán bộ / Trưởng phòng / Hiệu trưởng / Admin cũng có thể đăng nhập bằng mail VJU (Google)"""
        res = self.client.post(
            '/api/auth/google',
            data=json.dumps({'google_token': 'truongphong@vju.ac.vn'}),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data['success'])
        self.assertEqual(data['data']['user']['role'], 'dept_head')
        self.assertEqual(data['data']['user']['redirect_url'], '/dept-head')

    def test_password_login_wrong_password(self):
        """Đăng nhập sai mật khẩu trả về 401 INVALID_CREDENTIALS"""
        res = self.client.post(
            '/api/auth/login',
            data=json.dumps({'email': 'admin@vju.ac.vn', 'password': 'wrongpassword'}),
            content_type='application/json'
        )
        self.assertEqual(res.status_code, 401)
        data = res.json()
        self.assertFalse(data['success'])
        self.assertEqual(data['error']['code'], 'INVALID_CREDENTIALS')

    def test_auth_me_and_logout(self):
        """GET /api/auth/me trả về đúng thông tin user từ JWT token và POST /api/auth/logout thành công"""
        # Login lấy token
        login_res = self.client.post(
            '/api/auth/login',
            data=json.dumps({'email': 'truongphong@vju.ac.vn', 'password': 'head123'}),
            content_type='application/json'
        )
        token = login_res.json()['data']['access_token']

        # Gọi GET /api/auth/me với token
        me_res = self.client.get('/api/auth/me', HTTP_AUTHORIZATION=f'Bearer {token}')
        self.assertEqual(me_res.status_code, 200)
        me_data = me_res.json()
        self.assertTrue(me_data['success'])
        self.assertEqual(me_data['data']['email'], 'truongphong@vju.ac.vn')
        self.assertEqual(me_data['data']['role'], 'dept_head')
        self.assertEqual(me_data['data']['redirect_url'], '/dept-head')

        # Gọi logout
        logout_res = self.client.post('/api/auth/logout')
        self.assertEqual(logout_res.status_code, 200)
        self.assertTrue(logout_res.json()['success'])
