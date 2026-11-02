import json
from datetime import datetime, timedelta

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.core.management.color import no_style
from django.db import connection, transaction
from django.utils import timezone

from accounts.jwt_utils import generate_jwt_token
from accounts.models import (
    AttachmentConfig, Department, FormField, Notification, ProcedureType,
    Request, StudentRegistry, User,
)

FORMATS = 'PDF,JPG,PNG'
PURPOSES = ['Vay vốn', 'Visa', 'Tạm hoãn NVQS', 'Xin việc', 'Khác']
RESULT_OPTIONS = ['Bản điện tử', 'Bản cứng', 'Cả hai']

# type_id, ma phong ban, ten, mo ta, SLA, so cap duyet, co phi, phi, dang hoat dong
PROCEDURES = [
    (1, 'PCTSV', 'Giấy xác nhận sinh viên',
     'Xin cấp giấy xác nhận đang là sinh viên VJU. Mục đích: vay vốn, visa, tạm hoãn NVQS, xin việc.',
     1, 1, False, 0, True),
    (2, 'PCTSV', 'Giấy giới thiệu thực tập',
     'Xin cấp giấy giới thiệu đến doanh nghiệp thực tập. Bản cứng bắt buộc (DN yêu cầu dấu đỏ gốc).',
     2, 1, False, 0, True),
    (3, 'PDT', 'Phúc khảo điểm thi',
     'Xin chấm lại bài thi cuối kỳ. Có lệ phí. 2 GV chấm độc lập, TP duyệt kết quả.',
     7, 2, True, 50000, True),
    (4, 'PDT', 'Bảo lưu kết quả học tập',
     'Xin bảo lưu KQHT. Yêu cầu GPA ≥ 2.0, tổng bảo lưu ≤ 4 kỳ. HT ký QĐ bằng SmartCA.',
     5, 3, False, 0, True),
    (5, 'PCTSV', 'Miễn giảm học phí',
     'SV diện chính sách xin miễn giảm HP theo NĐ 81/2021. PCTSV kiểm tra đối tượng → Transfer PKHTC thẩm định.',
     10, 3, False, 0, True),
    # fee_amount > 0 nhung is_fee_required = False: API van phai tra fee_amount = null
    (6, 'PKHTC', 'Hoàn trả học phí',
     'SV đã đóng HP xin hoàn trả. Tích hợp Internet Banking API chuyển khoản.',
     7, 3, False, 100, True),
    (7, 'PDT', 'Thủ tục đã ẩn (soft delete)', 'Thủ tục dùng để test is_active = false.',
     3, 1, False, 0, False),
    # Thu tuc dang bat nhung thuoc phong ban da ngung hoat dong
    (8, 'TEST-OFF', 'Thủ tục của phòng ngừng hoạt động', 'Thủ tục dùng để test phòng ban bị tắt.',
     3, 1, False, 0, True),
]

# field_id, type_id, ten, key, kieu, bat buoc, placeholder, auto fill, options, thu tu
FORM_FIELDS = [
    (101, 1, 'Họ tên', 'full_name', 'text', True, None, 'student.full_name', None, 1),
    (102, 1, 'MSSV', 'mssv', 'text', True, None, 'student.mssv', None, 2),
    (103, 1, 'Lớp', 'class_name', 'text', True, None, 'student.class_name', None, 3),
    (104, 1, 'Khóa', 'cohort', 'text', True, None, 'student.cohort', None, 4),
    (105, 1, 'Ngành', 'major', 'text', True, None, 'student.major', None, 5),
    (106, 1, 'Email', 'email', 'text', True, None, 'student.email', None, 6),
    (107, 1, 'Mục đích xin cấp', 'purpose', 'dropdown', True, 'Chọn mục đích', None, PURPOSES, 7),
    (108, 1, 'Hình thức nhận kết quả', 'result_preference', 'radio', True, None, None, RESULT_OPTIONS, 8),
    (109, 1, 'Hộ khẩu thường trú', 'ho_khau', 'text', False, 'Nhập hộ khẩu thường trú', None, None, 9),
    (110, 1, 'Nơi đăng ký NVQS', 'noi_dk_nvqs', 'text', False, 'Nhập nơi đăng ký NVQS', None, None, 10),
    (111, 1, 'Thời gian đào tạo dự kiến', 'thoi_gian_dao_tao', 'text', False, None, 'student.cohort', None, 11),
    (201, 2, 'Tên doanh nghiệp', 'company_name', 'text', True, 'Nhập tên doanh nghiệp', None, None, 1),
    (202, 2, 'Địa chỉ doanh nghiệp', 'company_address', 'text', True, 'Nhập địa chỉ doanh nghiệp', None, None, 2),
    (203, 2, 'Thực tập từ ngày', 'internship_from', 'date', True, None, None, None, 3),
    (204, 2, 'Thực tập đến ngày', 'internship_to', 'date', True, None, None, None, 4),
    (205, 2, 'Học phần thực tập', 'course_name', 'text', True, 'Nhập tên học phần', None, None, 5),
    (301, 3, 'Họ tên', 'full_name', 'text', True, None, 'student.full_name', None, 1),
    (302, 3, 'MSSV', 'mssv', 'text', True, None, 'student.mssv', None, 2),
    (303, 3, 'Môn học', 'subject', 'text', True, 'Nhập môn học', None, None, 3),
    (304, 3, 'Học kỳ', 'semester', 'text', True, 'Nhập học kỳ', None, None, 4),
    (305, 3, 'Điểm hiện tại', 'current_grade', 'number', True, None, 'academic_ms.grade', None, 5),
    # field_id co y lech voi display_order de chung minh API sap xep theo display_order
    (401, 4, 'Học kỳ bảo lưu', 'semester', 'text', True, None, None, None, 2),
    (402, 4, 'Số kỳ bảo lưu', 'semester_count', 'number', True, None, None, None, 3),
    (403, 4, 'Lý do bảo lưu', 'reason', 'textarea', True, None, None, None, 1),
    (501, 5, 'Đối tượng miễn giảm', 'beneficiary_type', 'text', True, None, None, None, 1),
    (701, 7, 'Trường của thủ tục ẩn', 'hidden_field', 'text', False, None, None, None, 1),
]

# config_id, type_id, ten, bat buoc, thu tu
ATTACHMENT_CONFIGS = [
    (1, 1, 'CCCD 2 mặt', False, 1),
    (3, 2, 'Thư mời thực tập', False, 2),
    (4, 2, 'CCCD 2 mặt', True, 1),
    (5, 5, 'Giấy XN hộ nghèo / cận nghèo / người có công', True, 1),
    (6, 5, 'Giấy khai sinh', True, 2),
    (7, 5, 'CCCD', True, 3),
    (8, 5, 'Giấy XN khuyết tật (nếu áp dụng)', False, 4),
]

WELCOME_TITLE = 'Chào mừng bạn đến với VJU Portal'
WELCOME_MESSAGE = 'Hệ thống Cổng tiếp nhận và xử lý giấy tờ đã sẵn sàng. Bạn có thể bắt đầu nộp yêu cầu.'


def local_dt(year, month, day, hour=0, minute=0):
    return timezone.make_aware(datetime(year, month, day, hour, minute))


class Command(BaseCommand):
    help = 'Dat lai du lieu test Module 0 (danh muc thu tuc va thong bao) ve trang thai co dinh'

    def add_arguments(self, parser):
        parser.add_argument('--postman-env', help='Ghi Postman environment (token cac vai tro) ra file nay')
        parser.add_argument('--base-url', default='http://localhost:8080/api')
        parser.add_argument('--allow-non-sqlite', action='store_true',
                            help='Cho phep chay tren database khac SQLite')

    def handle(self, *args, **options):
        # Lenh nay xoa toan bo don, thu tuc va thong bao nen chi duoc chay o moi truong dev
        is_sqlite = settings.DATABASES['default']['ENGINE'].endswith('sqlite3')
        if not settings.DEBUG or not (is_sqlite or options['allow_non_sqlite']):
            raise CommandError('Tu choi chay: seed_module0 xoa du lieu, chi dung cho database dev.')

        call_command('seed_data', stdout=self.stdout)

        with transaction.atomic():
            Notification.objects.all().delete()
            Request.objects.all().delete()
            ProcedureType.objects.all().delete()
            inactive_dept = self._seed_catalog()
            users = self._seed_users()
            self._seed_notifications(users)
            self._reset_sequences()

        self.stdout.write(self.style.SUCCESS(
            f'Da seed {ProcedureType.objects.count()} thu tuc, {FormField.objects.count()} truong form, '
            f'{AttachmentConfig.objects.count()} cau hinh dinh kem, {Notification.objects.count()} thong bao.'
        ))
        if options['postman_env']:
            self._write_postman_env(options['postman_env'], options['base_url'], users, inactive_dept)

    def _reset_sequences(self):
        # Seed gan ID co dinh nen PostgreSQL can dat lai bo dem, neu khong ban ghi moi se trung ID
        models = [ProcedureType, FormField, AttachmentConfig, Notification]
        with connection.cursor() as cursor:
            for statement in connection.ops.sequence_reset_sql(no_style(), models):
                cursor.execute(statement)

    def _seed_catalog(self):
        inactive_dept, _ = Department.objects.update_or_create(
            code='TEST-OFF',
            defaults={'name': 'Phòng đã ngừng hoạt động', 'is_active': False},
        )
        departments = {
            code: Department.objects.get(code=code)
            for code in ('PCTSV', 'PDT', 'PKHTC', 'TEST-OFF')
        }
        for type_id, dept, name, desc, sla, levels, fee_required, fee, active in PROCEDURES:
            ProcedureType.objects.create(
                type_id=type_id, department=departments[dept], name=name, description=desc,
                sla_total_days=sla, approval_levels=levels, result_type='PDF',
                is_fee_required=fee_required, fee_amount=fee, is_active=active,
            )
        for field_id, type_id, name, key, data_type, required, placeholder, auto_fill, options, order in FORM_FIELDS:
            FormField.objects.create(
                field_id=field_id, procedure_type_id=type_id, field_name=name, field_key=key,
                data_type=data_type, is_required=required, placeholder=placeholder,
                auto_fill_field=auto_fill, dropdown_options=options, display_order=order,
            )
        for config_id, type_id, name, required, order in ATTACHMENT_CONFIGS:
            AttachmentConfig.objects.create(
                config_id=config_id, procedure_type_id=type_id, item_name=name, is_required=required,
                allowed_formats=FORMATS, max_size_mb=5, display_order=order,
            )
        return inactive_dept

    def _student_user(self, email, account_status='active'):
        registry = StudentRegistry.objects.get(email=email)
        user, _ = User.objects.update_or_create(
            email=email,
            defaults={
                'full_name': registry.full_name, 'role': 'student',
                'student_registry': registry, 'account_status': account_status,
            },
        )
        return user

    def _seed_users(self):
        return {
            'studentA': self._student_user('student01@st.vju.ac.vn'),
            'studentB': self._student_user('quocanh@st.vju.ac.vn'),
            'studentC': self._student_user('xuanhau@st.vju.ac.vn'),
            'studentPaging': self._student_user('minhanh@st.vju.ac.vn'),
            'locked': self._student_user('suspended@st.vju.ac.vn', account_status='locked'),
            'staff': User.objects.get(email='hoangnam@vju.ac.vn'),
            'head': User.objects.get(email='tp.ctsv@vju.ac.vn'),
            'admin': User.objects.get(email='admin@vju.ac.vn'),
        }

    def _notify(self, notification_id, user, title, message, sent_at, read_at=None, request=None):
        Notification.objects.create(
            notification_id=notification_id, user=user, request=request, title=title, message=message,
            is_read=read_at is not None, read_at=read_at,
        )
        # sent_at dung auto_now_add nen phai cap nhat sau khi tao
        Notification.objects.filter(pk=notification_id).update(sent_at=sent_at)

    def _seed_notifications(self, users):
        request = Request.objects.create(
            request_code='REQ-20261030-001', user=users['studentB'], procedure_type_id=1,
            status='Đã duyệt', internal_status='Đã duyệt',
        )
        self._notify(1, users['studentA'], WELCOME_TITLE, WELCOME_MESSAGE, local_dt(2026, 10, 29, 8))
        self._notify(2, users['studentB'], WELCOME_TITLE, WELCOME_MESSAGE, local_dt(2026, 10, 29, 8))
        self._notify(3, users['studentC'], WELCOME_TITLE, WELCOME_MESSAGE, local_dt(2026, 10, 29, 8))
        self._notify(
            4, users['studentA'], 'Thông báo bảo trì hệ thống',
            'Hệ thống sẽ bảo trì từ 22h đến 24h ngày 05/11/2026. Vui lòng hoàn tất công việc trước thời gian này.',
            local_dt(2026, 10, 30, 9), read_at=local_dt(2026, 10, 30, 10, 15),
        )
        self._notify(
            5, users['studentB'], 'Yêu cầu đã được duyệt',
            'Yêu cầu Giấy xác nhận sinh viên đã được duyệt. Vui lòng kiểm tra kết quả.',
            local_dt(2026, 10, 30, 9), request=request,
        )
        self._notify(
            6, users['studentB'], 'Thông báo đã đọc từ trước', 'Dùng để test read-all không ghi đè read_at.',
            local_dt(2026, 10, 28, 8), read_at=local_dt(2026, 10, 28, 8, 30),
        )
        self._notify(7, users['staff'], 'Có yêu cầu mới', 'Bạn được phân công một yêu cầu mới.', local_dt(2026, 10, 29, 9))
        # 25 thong bao cho test phan trang: 101 cu nhat, cu moi 5 cai co 1 cai da doc (con 20 chua doc)
        first_day = local_dt(2026, 10, 1, 8)
        for offset in range(25):
            sent_at = first_day + timedelta(days=offset)
            is_read = (offset + 1) % 5 == 0
            self._notify(
                101 + offset, users['studentPaging'], f'Thông báo phân trang {offset + 1}', 'Dùng để test phân trang.',
                sent_at, read_at=sent_at + timedelta(hours=1) if is_read else None,
            )

    def _write_postman_env(self, path, base_url, users, inactive_dept):
        def token(user_id, expires_in=86400):
            return generate_jwt_token({'user_id': user_id, 'role': 'student'}, expires_in=expires_in)

        tokens = {f'token_{name}': token(user.user_id) for name, user in users.items()}
        valid = tokens['token_studentA']
        tokens.update({
            'token_expired': token(users['studentA'].user_id, expires_in=-60),
            'token_tampered': valid[:-4] + ('AAAA' if not valid.endswith('AAAA') else 'BBBB'),
            'token_deletedUser': token(999999),
            'token_garbage': 'day-khong-phai-la-token',
        })
        variables = {'baseUrl': base_url, 'inactiveDeptId': inactive_dept.dept_id, **tokens}
        environment = {
            'name': 'VJU Module 0',
            'values': [{'key': k, 'value': str(v), 'type': 'default', 'enabled': True} for k, v in variables.items()],
            '_postman_variable_scope': 'environment',
        }
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(environment, f, ensure_ascii=False, indent=2)
        self.stdout.write(f'Da ghi Postman environment: {path} (token het han sau 24 gio)')
