import os

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from accounts.models import Department, Notification, StudentRegistry, User

DEMO_PASSWORD_MIN_LENGTH = 12

# email, ho ten, vai tro, cap tham quyen, ma phong ban
DEMO_STAFF = [
    ('demo.chuyenvien@vju.ac.vn', 'Chuyên viên Demo', 'staff', 1, 'PCTSV'),
    ('demo.truongphong@vju.ac.vn', 'Trưởng phòng Demo', 'dept_head', 2, 'PCTSV'),
    ('demo.hieutruong@vju.ac.vn', 'Hiệu trưởng Demo', 'principal', 3, None),
]

# tieu de, noi dung, da doc
STUDENT_NOTIFICATIONS = [
    ('Chào mừng bạn đến với VJU Portal',
     'Hệ thống Cổng tiếp nhận và xử lý giấy tờ đã sẵn sàng. Bạn có thể bắt đầu nộp yêu cầu.', True),
    ('Yêu cầu đã được duyệt',
     'Yêu cầu Giấy xác nhận sinh viên đã được duyệt. Vui lòng kiểm tra kết quả.', False),
    ('Cần bổ sung hồ sơ',
     'Yêu cầu Giấy giới thiệu thực tập cần bổ sung thư mời thực tập. Vui lòng nộp bổ sung trong 5 ngày.', False),
]
STAFF_NOTIFICATIONS = [
    ('Có yêu cầu mới', 'Có yêu cầu mới đang chờ xử lý tại phòng ban của bạn.', False),
]


class Command(BaseCommand):
    help = 'Tao du lieu demo khi SEED_DEMO=True. Chi them hoac cap nhat, khong xoa du lieu'

    def handle(self, *args, **options):
        if os.getenv('SEED_DEMO', 'False') != 'True':
            self.stdout.write('Bo qua seed_demo: SEED_DEMO khac True.')
            return

        password = os.getenv('DEMO_PASSWORD', '')
        if len(password) < DEMO_PASSWORD_MIN_LENGTH:
            raise CommandError(f'DEMO_PASSWORD phai co it nhat {DEMO_PASSWORD_MIN_LENGTH} ky tu.')
        student_emails = [
            email.strip().lower() for email in os.getenv('DEMO_STUDENT_EMAILS', '').split(',') if email.strip()
        ]

        with transaction.atomic():
            staff = self._seed_staff(password)
            students = self._seed_students(student_emails)
            created = self._seed_notifications(staff, STAFF_NOTIFICATIONS)
            created += self._seed_notifications(students, STUDENT_NOTIFICATIONS)

        for user in staff + students:
            self.stdout.write(f'  {user.role:<10} {user.email}')
        self.stdout.write(self.style.SUCCESS(
            f'Da chuan bi {len(staff)} can bo, {len(students)} sinh vien demo, them {created} thong bao.'
        ))

    def _seed_staff(self, password):
        staff = []
        for email, full_name, role, level, dept_code in DEMO_STAFF:
            user, _ = User.objects.update_or_create(
                email=email,
                defaults={
                    'full_name': full_name, 'role': role, 'authority_level': level,
                    'department': Department.objects.get(code=dept_code) if dept_code else None,
                    'account_status': 'active',
                },
            )
            # Dat lai theo DEMO_PASSWORD moi lan deploy de doi mat khau bang cach sua bien moi truong
            user.set_password(password)
            user.save(update_fields=['password'])
            staff.append(user)
        return staff

    def _seed_students(self, emails):
        students = []
        for email in emails:
            existing = User.objects.filter(email=email).exclude(role='student').first()
            if existing:
                # Dang nhap Google uu tien danh muc sinh vien, de ca hai se dang nhap sai vai tro
                self.stdout.write(self.style.WARNING(f'Bo qua {email}: da la tai khoan {existing.role}.'))
                continue

            registry = StudentRegistry.objects.filter(email=email).first()
            if not registry:
                registry = StudentRegistry.objects.create(
                    email=email, mssv=self._next_demo_mssv(), full_name=f'Sinh viên Demo ({email.split("@")[0]})',
                    class_name='DEMO', cohort='K2022', major='Khoa học Máy tính', academic_status='active',
                )
            user, _ = User.objects.get_or_create(
                email=email,
                defaults={
                    'full_name': registry.full_name, 'role': 'student',
                    'student_registry': registry, 'account_status': 'active',
                },
            )
            students.append(user)
        return students

    def _next_demo_mssv(self):
        number = 1
        while StudentRegistry.objects.filter(mssv=f'DEMO{number:03d}').exists():
            number += 1
        return f'DEMO{number:03d}'

    def _seed_notifications(self, users, notifications):
        created_count = 0
        for user in users:
            for title, message, is_read in notifications:
                # Thong bao da co thi giu nguyen, ke ca trang thai da doc trong luc demo
                _, created = Notification.objects.get_or_create(
                    user=user, title=title, defaults={'message': message, 'is_read': is_read},
                )
                created_count += created
        return created_count
