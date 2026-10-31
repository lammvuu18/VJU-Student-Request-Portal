from django.db import migrations


def seed_initial_data(apps, schema_editor):
    Department = apps.get_model("accounts", "Department")
    StudentRegistry = apps.get_model("accounts", "StudentRegistry")
    User = apps.get_model("accounts", "User")

    # 1. Seed phòng ban trước vì User có thể tham chiếu Department.
    pctsv, _ = Department.objects.get_or_create(
        code="PCTSV",
        defaults={
            "name": "Phòng Công tác Sinh viên",
            "description": "Quản lý công tác sinh viên",
            "is_active": True,
        },
    )
    pdt, _ = Department.objects.get_or_create(
        code="PDT",
        defaults={
            "name": "Phòng Đào tạo",
            "description": "Quản lý đào tạo",
            "is_active": True,
        },
    )
    pkhtc, _ = Department.objects.get_or_create(
        code="PKHTC",
        defaults={
            "name": "Phòng Kế hoạch Tài chính",
            "description": "Quản lý kế hoạch và tài chính",
            "is_active": True,
        },
    )

    # 2. Seed hồ sơ sinh viên.
    student1, _ = StudentRegistry.objects.get_or_create(
        email="student01@st.vju.ac.vn",
        defaults={
            "mssv": "SEED0001",
            "full_name": "Sinh viên mẫu 01",
            "class_name": "BCSE-K2021",
            "cohort": "K2021",
            "major": "Computer Science",
            "academic_status": "active",
        },
    )
    student2, _ = StudentRegistry.objects.get_or_create(
        email="student02@st.vju.ac.vn",
        defaults={
            "mssv": "SEED0002",
            "full_name": "Sinh viên mẫu 02",
            "class_name": "BCSE-K2021",
            "cohort": "K2021",
            "major": "Computer Science",
            "academic_status": "active",
        },
    )

    # 3. Seed tài khoản; liên kết sinh viên với hồ sơ tương ứng.
    User.objects.get_or_create(
        email="student01@st.vju.ac.vn",
        defaults={
            "full_name": "Sinh viên mẫu 01",
            "role": "student",
            "department": pctsv,
            "student_registry": student1,
        },
    )
    User.objects.get_or_create(
        email="staff.seed@vju.ac.vn",
        defaults={
            "full_name": "Chuyên viên mẫu",
            "role": "staff",
            "department": pctsv,
            "authority_level": 1,
        },
    )
    User.objects.get_or_create(
        email="head.seed@vju.ac.vn",
        defaults={
            "full_name": "Trưởng phòng mẫu",
            "role": "dept_head",
            "department": pdt,
            "authority_level": 2,
        },
    )


def unseed_initial_data(apps, schema_editor):
    Department = apps.get_model("accounts", "Department")
    StudentRegistry = apps.get_model("accounts", "StudentRegistry")
    User = apps.get_model("accounts", "User")

    # Xóa riêng các tài khoản và dữ liệu mẫu do migration tạo.
    User.objects.filter(
        email__in=[
            "student01@st.vju.ac.vn",
            "staff.seed@vju.ac.vn",
            "head.seed@vju.ac.vn",
        ]
    ).delete()

    StudentRegistry.objects.filter(
        email__in=[
            "student01@st.vju.ac.vn",
            "student02@st.vju.ac.vn",
        ]
    ).delete()

    Department.objects.filter(
        code__in=["PCTSV", "PDT", "PKHTC"]
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_initial_data, unseed_initial_data),
    ]