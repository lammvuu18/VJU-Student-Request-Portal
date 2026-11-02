from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from accounts.models import Notification, Request, Result, StateAuditLog


class Command(BaseCommand):
    help = "Xu ly tu dong cac don qua han bo sung (5 ngay) va chuyen ket qua qua 30 ngay sang cold storage"

    def handle(self, *args, **options):
        now = timezone.now()
        expired_count = self._process_expired_supplements(now)
        cold_count = self._process_cold_storage(now)
        self.stdout.write(
            self.style.SUCCESS(
                f"Da xu ly {expired_count} don qua han bo sung va {cold_count} ket qua chuyen cold storage."
            )
        )

    def _process_expired_supplements(self, now):
        expired_requests = list(
            Request.objects.filter(
                internal_status="Cần bổ sung",
                supplement_deadline__isnull=False,
                supplement_deadline__lt=now,
            ).select_related("user")
        )
        count = 0
        for req in expired_requests:
            with transaction.atomic():
                status_before = req.internal_status
                req.status = "Từ chối"
                req.internal_status = "Từ chối"
                req.save(update_fields=["status", "internal_status", "updated_at"])

                StateAuditLog.objects.create(
                    request=req,
                    performed_by=None,
                    action="supplement_expired",
                    note="Quá thời hạn bổ sung hồ sơ (5 ngày)",
                    status_before=status_before,
                    status_after="Từ chối",
                )

                Notification.objects.create(
                    user=req.user,
                    request=req,
                    title="Yêu cầu bị từ chối do quá hạn bổ sung",
                    message=f"Yêu cầu {req.request_code} đã bị từ chối do quá thời hạn bổ sung hồ sơ.",
                )
                count += 1
        return count

    def _process_cold_storage(self, now):
        cutoff = now - timedelta(days=30)
        results = Result.objects.filter(
            cold_storage_at__isnull=True,
        ).filter(
            Q(signed_at__lte=cutoff) | Q(signed_at__isnull=True, created_at__lte=cutoff)
        )
        return results.update(cold_storage_at=now)
