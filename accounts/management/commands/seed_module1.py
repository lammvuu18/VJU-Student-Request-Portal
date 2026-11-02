from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.core.management.color import no_style
from django.db import connection, transaction

from accounts.management.commands.bootstrap_production import REJECTION_REASONS
from accounts.models import Department, RejectionReason, StudentRegistry, User


class Command(BaseCommand):
    help = 'Dat lai du lieu test Module 1-2 (quy trinh 1 cap). Xoa toan bo don, thu tuc va thong bao'

    def add_arguments(self, parser):
        parser.add_argument('--allow-non-sqlite', action='store_true',
                            help='Cho phep chay tren database khac SQLite')

    def handle(self, *args, **options):
        # seed_module0 da chan chay ngoai moi truong dev
        call_command('seed_module0', allow_non_sqlite=options['allow_non_sqlite'], stdout=self.stdout)

        with transaction.atomic():
            self._seed_rejection_reasons()
            self._seed_actors()

        self.stdout.write(self.style.SUCCESS(
            f'Da seed {RejectionReason.objects.count()} ly do tu choi va tai khoan test Module 1-2.'
        ))

    def _seed_rejection_reasons(self):
        RejectionReason.objects.all().delete()
        for reason_id, reason_text in enumerate(REJECTION_REASONS, start=1):
            RejectionReason.objects.create(reason_id=reason_id, reason_text=reason_text)
        with connection.cursor() as cursor:
            for statement in connection.ops.sequence_reset_sql(no_style(), [RejectionReason]):
                cursor.execute(statement)

    def _seed_actors(self):
        # SV tot nghiep va SV bao luu phai dang nhap duoc de gui don
        for email in ('graduated@st.vju.ac.vn', 'suspended@st.vju.ac.vn'):
            registry = StudentRegistry.objects.get(email=email)
            User.objects.update_or_create(
                email=email,
                defaults={
                    'full_name': registry.full_name, 'role': 'student',
                    'student_registry': registry, 'account_status': 'active',
                },
            )

        second_staff, _ = User.objects.update_or_create(
            email='cv2.pctsv@vju.ac.vn',
            defaults={
                'full_name': 'Phạm Thanh Hằng', 'role': 'staff', 'authority_level': 1,
                'department': Department.objects.get(code='PCTSV'), 'account_status': 'active',
            },
        )
        second_staff.set_password('staff123')
        second_staff.save(update_fields=['password'])
