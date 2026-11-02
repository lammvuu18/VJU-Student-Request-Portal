from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0008_loginattempt'),
    ]

    operations = [
        migrations.AddField(
            model_name='formfield',
            name='required_if',
            field=models.JSONField(blank=True, null=True, verbose_name='Điều kiện bắt buộc'),
        ),
    ]
