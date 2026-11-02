from datetime import date

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.core.management.color import no_style
from django.db import connection, transaction

from accounts.management.commands.bootstrap_production import REJECTION_REASONS
from accounts.models import (
    AccessLog, Attachment, Department, Feedback, Holiday, Notification,
    Payment, RejectionReason, Request, Result, StateAuditLog, StudentRegistry, User,
)


class Command(BaseCommand):
    help = 'Dat lai du lieu test Module 1-2 (quy trinh 1 cap). Xoa toan bo don, thu tuc va thong bao'

    def add_arguments(self, parser):
        parser.add_argument('--allow-non-sqlite', action='store_true',
                            help='Cho phep chay tren database khac SQLite')

    def handle(self, *args, **options):
        # seed_module0 da chan chay ngoai moi truong dev
        call_command('seed_module0', allow_non_sqlite=options['allow_non_sqlite'], stdout=self.stdout)

        with transaction.atomic():
            self._clear_workflow_data()
            self._seed_holidays()
            self._seed_rejection_reasons()
            self._seed_actors()
            self._reset_sequences()

        self.stdout.write(self.style.SUCCESS(
            f'Da seed {RejectionReason.objects.count()} ly do tu choi va tai khoan test Module 1-2.'
        ))

    def _clear_workflow_data(self):
        Feedback.objects.all().delete()
        Result.objects.all().delete()
        Attachment.objects.all().delete()
        Payment.objects.all().delete()
        StateAuditLog.objects.all().delete()
        AccessLog.objects.all().delete()
        Notification.objects.all().delete()
        Request.objects.all().delete()
        User.objects.filter(email__in=['staff.seed@vju.ac.vn', 'head.seed@vju.ac.vn']).delete()

    def _seed_holidays(self):
        Holiday.objects.all().delete()
        Holiday.objects.create(
            holiday_date=date(2026, 9, 2),
            description='Quốc khánh',
            type='holiday',
            year=2026,
        )

    def _seed_rejection_reasons(self):
        RejectionReason.objects.all().delete()
        for reason_id, reason_text in enumerate(REJECTION_REASONS, start=1):
            RejectionReason.objects.create(reason_id=reason_id, reason_text=reason_text)

    def _reset_sequences(self):
        models = [
            RejectionReason, Request, Notification, Result,
            Attachment, Payment, StateAuditLog, AccessLog, Feedback, Holiday,
        ]
        with connection.cursor() as cursor:
            for statement in connection.ops.sequence_reset_sql(no_style(), models):
                cursor.execute(statement)
            if connection.vendor == 'sqlite':
                table_names = [m._meta.db_table for m in models if m is not RejectionReason]
                placeholders = ', '.join(['%s'] * len(table_names))
                cursor.execute(f'DELETE FROM sqlite_sequence WHERE name IN ({placeholders})', table_names)

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
