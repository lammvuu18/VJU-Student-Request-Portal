from django.db import migrations
import datetime

def seed_new_tables(apps, schema_editor):
    Department = apps.get_model('accounts', 'Department')
    ProcedureType = apps.get_model('accounts', 'ProcedureType')
    FormField = apps.get_model('accounts', 'FormField')
    AttachmentConfig = apps.get_model('accounts', 'AttachmentConfig')
    RejectionReason = apps.get_model('accounts', 'RejectionReason')
    Holiday = apps.get_model('accounts', 'Holiday')

    dept = Department.objects.first()
    if not dept:
        return

    proc_transcript = ProcedureType.objects.create(
        name="Đăng ký cấp bảng điểm",
        department=dept,
        sla_total_days=3,
        approval_levels=1,
        result_type="PDF",
        is_fee_required=True,
        fee_amount=50000.00
    )

    FormField.objects.create(
        procedure_type=proc_transcript,
        field_name="Lý do xin cấp",
        field_key="reason",
        data_type="textarea",
        is_required=True,
        display_order=1
    )

    AttachmentConfig.objects.create(
        procedure_type=proc_transcript,
        item_name="Căn cước công dân (Mặt trước & Mặt sau)",
        is_required=True,
        allowed_formats="pdf,png,jpg",
        max_size_mb=5,
        display_order=1
    )

    RejectionReason.objects.create(reason_text="Ảnh đính kèm mờ, không đọc được thông tin", is_active=True)
    RejectionReason.objects.create(reason_text="Sai định dạng file yêu cầu", is_active=True)

    current_year = datetime.date.today().year
    Holiday.objects.get_or_create(
        holiday_date=datetime.date(current_year, 9, 2), 
        defaults={"description": "Quốc khánh", "type": "holiday", "year": current_year}
    )

class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0004_holiday_rejectionreason_payment_amount_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_new_tables),
    ]