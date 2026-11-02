import os

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from accounts.management.commands.seed_module0 import (
    ATTACHMENT_CONFIGS, FORM_FIELDS, FORMATS, PROCEDURES,
)
from accounts.models import AttachmentConfig, Department, FormField, ProcedureType, RejectionReason, User

# Tai khoan mau cua seed_data: mat khau da cong khai trong repo
SAMPLE_CREDENTIALS = {
    'admin@vju.ac.vn': 'admin123',
    'vanbinh@vju.ac.vn': 'principal123',
    'thuha@vju.ac.vn': 'head123',
    'tp.ctsv@vju.ac.vn': 'head123',
    'tranthi.b@vju.ac.vn': 'staff123',
    'hoangnam@vju.ac.vn': 'staff123',
}
ADMIN_PASSWORD_MIN_LENGTH = 12
LIVE_TYPE_IDS = {1, 2, 3, 4, 5, 6}  # type_id 7, 8 chi dung de test
REJECTION_REASONS = [
    'Hồ sơ không đầy đủ theo yêu cầu',
    'Giấy tờ minh chứng không hợp lệ hoặc đã hết hiệu lực',
    'Không thuộc đối tượng theo quy định',
    'Quá thời hạn quy định',
    'Thông tin kê khai không chính xác',
    'Sinh viên đã bị buộc thôi học',
    'Sinh viên không đang theo học',
    'Học phần không có trong chương trình đào tạo',
    'Không đạt điều kiện học tập theo quy định',
    'Trùng với yêu cầu đã được xử lý',
]


class Command(BaseCommand):
    help = 'Chuan bi du lieu production: vo hieu mat khau mau, tao admin, nap danh muc thu tuc'

    def handle(self, *args, **options):
        with transaction.atomic():
            disabled = self._disable_sample_passwords()
            admin_created = self._ensure_admin()
            created = self._seed_catalog()
            for reason_text in REJECTION_REASONS:
                RejectionReason.objects.get_or_create(reason_text=reason_text)
        self.stdout.write(self.style.SUCCESS(
            f'Da vo hieu {disabled} mat khau mau, '
            f'{"tao" if admin_created else "giu nguyen"} tai khoan admin, '
            f'them {created} thu tuc.'
        ))

    def _disable_sample_passwords(self):
        disabled = 0
        for user in User.objects.filter(email__in=SAMPLE_CREDENTIALS):
            if user.check_password(SAMPLE_CREDENTIALS[user.email]):
                user.password = ''
                user.save(update_fields=['password'])
                disabled += 1
        return disabled

    def _ensure_admin(self):
        email = os.getenv('BOOTSTRAP_ADMIN_EMAIL', '').strip().lower()
        password = os.getenv('BOOTSTRAP_ADMIN_PASSWORD', '')
        if not email or not password:
            return False
        if len(password) < ADMIN_PASSWORD_MIN_LENGTH or password in SAMPLE_CREDENTIALS.values():
            raise CommandError(f'BOOTSTRAP_ADMIN_PASSWORD phai co it nhat {ADMIN_PASSWORD_MIN_LENGTH} ky tu.')

        user, created = User.objects.get_or_create(
            email=email,
            defaults={'full_name': 'Quản trị viên', 'role': 'admin', 'account_status': 'active'},
        )
        # Chi dat mat khau lan dau, khong ghi de mat khau admin da doi o cac lan deploy sau
        if not user.password:
            user.set_password(password)
            user.save(update_fields=['password'])
        return created

    def _seed_catalog(self):
        created_count = 0
        for type_id, dept_code, name, desc, sla, levels, fee_required, fee, active in PROCEDURES:
            if type_id not in LIVE_TYPE_IDS:
                continue
            # Thu tuc da co thi giu nguyen de khong ghi de cau hinh da chinh tren he thong
            procedure, created = ProcedureType.objects.get_or_create(
                name=name,
                defaults={
                    'description': desc,
                    'department': Department.objects.get(code=dept_code),
                    'sla_total_days': sla,
                    'approval_levels': levels,
                    'result_type': 'PDF',
                    'is_fee_required': fee_required,
                    'fee_amount': fee if fee_required else 0,
                    'is_active': active,
                },
            )
            if not created:
                continue
            created_count += 1
            for _, field_type, field_name, key, data_type, required, placeholder, auto_fill, opts, order in FORM_FIELDS:
                if field_type == type_id:
                    FormField.objects.create(
                        procedure_type=procedure, field_name=field_name, field_key=key, data_type=data_type,
                        is_required=required, placeholder=placeholder, auto_fill_field=auto_fill,
                        dropdown_options=opts, display_order=order,
                    )
            for _, config_type, item_name, required, order in ATTACHMENT_CONFIGS:
                if config_type == type_id:
                    AttachmentConfig.objects.create(
                        procedure_type=procedure, item_name=item_name, is_required=required,
                        allowed_formats=FORMATS, max_size_mb=5, display_order=order,
                    )
        return created_count
