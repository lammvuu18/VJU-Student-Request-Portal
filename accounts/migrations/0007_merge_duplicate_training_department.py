from django.db import migrations


def merge_training_department(apps, schema_editor):
    """
    Migration 0002 tạo Phòng Đào tạo với mã PDT, seed_data cũ lại tạo thêm mã PĐT.
    Chuyển dữ liệu của phòng PĐT sang PDT rồi xóa phòng trùng.
    """
    Department = apps.get_model('accounts', 'Department')
    User = apps.get_model('accounts', 'User')
    ProcedureType = apps.get_model('accounts', 'ProcedureType')
    Request = apps.get_model('accounts', 'Request')

    duplicate = Department.objects.filter(code='PĐT').first()
    if not duplicate:
        return

    target = Department.objects.filter(code='PDT').first()
    if not target:
        duplicate.code = 'PDT'
        duplicate.save(update_fields=['code'])
        return

    User.objects.filter(department=duplicate).update(department=target)
    ProcedureType.objects.filter(department=duplicate).update(department=target)
    Request.objects.filter(transferred_to_dept=duplicate).update(transferred_to_dept=target)
    duplicate.delete()


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_revokedtoken'),
    ]

    operations = [
        migrations.RunPython(merge_training_department, migrations.RunPython.noop),
    ]
