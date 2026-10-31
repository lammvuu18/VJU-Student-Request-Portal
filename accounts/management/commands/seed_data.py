from django.core.management.base import BaseCommand
from accounts.models import Department, StudentRegistry, User

class Command(BaseCommand):
    help = 'Khoi tao du lieu mau cho phong ban, sinh vien va tai khoan nguoi dung'

    def handle(self, *args, **options):
        self.stdout.write("Khoi tao du lieu phong ban...")
        pctsv, _ = Department.objects.get_or_create(
            code='PCTSV',
            defaults={
                'name': 'Phòng Công tác Sinh viên',
                'description': 'Tiếp nhận các thủ tục xác nhận sinh viên, giấy giới thiệu thực tập, miễn giảm học phí...',
                'is_active': True
            }
        )
        pdt, _ = Department.objects.get_or_create(
            code='PĐT',
            defaults={
                'name': 'Phòng Đào tạo',
                'description': 'Tiếp nhận các thủ tục học vụ, bảng điểm, bảo lưu, phúc khảo điểm thi...',
                'is_active': True
            }
        )
        pkhtc, _ = Department.objects.get_or_create(
            code='PKHTC',
            defaults={
                'name': 'Phòng Kế hoạch Tài chính',
                'description': 'Tiếp nhận hoàn trả học phí, thẩm định đối tượng miễn giảm học phí...',
                'is_active': True
            }
        )

        self.stdout.write("Khoi tao danh muc sinh vien (StudentRegistry)...")
        students_data = [
            {
                'email': 'minhanh@st.vju.ac.vn',
                'mssv': '21CS001',
                'full_name': 'Nguyễn Minh Anh',
                'class_name': 'CS2021A',
                'cohort': 'K2021',
                'major': 'Khoa học Máy tính',
                'academic_status': 'active',
            },
            {
                'email': 'quocanh@st.vju.ac.vn',
                'mssv': '21CS002',
                'full_name': 'Nguyễn Quốc Anh',
                'class_name': 'CS2021A',
                'cohort': 'K2021',
                'major': 'Khoa học Máy tính',
                'academic_status': 'active',
            },
            {
                'email': 'xuanhau@st.vju.ac.vn',
                'mssv': '21CS003',
                'full_name': 'Đỗ Xuân Hậu',
                'class_name': 'CS2021A',
                'cohort': 'K2021',
                'major': 'Khoa học Máy tính',
                'academic_status': 'active',
            },
            {
                'email': 'suspended@st.vju.ac.vn',
                'mssv': '21CS004',
                'full_name': 'Trần Bảo Lưu',
                'class_name': 'CS2021B',
                'cohort': 'K2021',
                'major': 'Khoa học Máy tính',
                'academic_status': 'suspended',
            },
            {
                'email': 'graduated@st.vju.ac.vn',
                'mssv': '20CS001',
                'full_name': 'Lê Tốt Nghiệp',
                'class_name': 'CS2020A',
                'cohort': 'K2020',
                'major': 'Khoa học Máy tính',
                'academic_status': 'graduated',
            },
            {
                'email': 'dismissed@st.vju.ac.vn',
                'mssv': '19CS001',
                'full_name': 'Phạm Thôi Học',
                'class_name': 'CS2019A',
                'cohort': 'K2019',
                'major': 'Khoa học Máy tính',
                'academic_status': 'dismissed',
            },
        ]

        for s in students_data:
            StudentRegistry.objects.update_or_create(
                email=s['email'],
                defaults=s
            )

        self.stdout.write("Khoi tao tai khoan phan quyen (User)...")
        # 1. Admin
        admin_user, _ = User.objects.get_or_create(
            email='admin@vju.ac.vn',
            defaults={
                'full_name': 'Quản trị viên Hệ thống',
                'role': 'admin',
                'account_status': 'active',
                'phone': '024 7306 6001',
            }
        )
        admin_user.set_password('admin123')
        admin_user.save()

        # 2. Hiệu trưởng (Principal - Cấp 3)
        principal_user, _ = User.objects.get_or_create(
            email='vanbinh@vju.ac.vn',
            defaults={
                'full_name': 'PGS.TS Nguyễn Văn Bình',
                'role': 'principal',
                'authority_level': 3,
                'account_status': 'active',
                'phone': '0901234567',
            }
        )
        principal_user.set_password('principal123')
        principal_user.save()

        # 3. Trưởng phòng Đào tạo (Dept Head - Cấp 2)
        head_pdt, _ = User.objects.get_or_create(
            email='thuha@vju.ac.vn',
            defaults={
                'full_name': 'Trần Thu Hà',
                'role': 'dept_head',
                'authority_level': 2,
                'department': pdt,
                'account_status': 'active',
                'phone': '0988123456',
            }
        )
        head_pdt.set_password('head123')
        head_pdt.save()

        # 4. Trưởng phòng Công tác Sinh viên (Dept Head - Cấp 2)
        head_ctsv, _ = User.objects.get_or_create(
            email='tp.ctsv@vju.ac.vn',
            defaults={
                'full_name': 'Nguyễn Thị Lan',
                'role': 'dept_head',
                'authority_level': 2,
                'department': pctsv,
                'account_status': 'active',
                'phone': '0989345678',
            }
        )
        head_ctsv.set_password('head123')
        head_ctsv.save()

        # 5. Chuyên viên / Giảng viên Phòng Đào tạo (Staff - Cấp 1)
        staff_pdt, _ = User.objects.get_or_create(
            email='tranthi.b@vju.ac.vn',
            defaults={
                'full_name': 'Trần Thị B',
                'role': 'staff',
                'authority_level': 1,
                'department': pdt,
                'account_status': 'active',
                'phone': '0977234567',
            }
        )
        staff_pdt.set_password('staff123')
        staff_pdt.save()

        # 6. Chuyên viên PCTSV (Staff - Cấp 1)
        staff_ctsv, _ = User.objects.get_or_create(
            email='hoangnam@vju.ac.vn',
            defaults={
                'full_name': 'Lê Hoàng Nam',
                'role': 'staff',
                'authority_level': 1,
                'department': pctsv,
                'account_status': 'active',
                'phone': '0978999888',
            }
        )
        staff_ctsv.set_password('staff123')
        staff_ctsv.save()

        # 7. Sinh viên mẫu đã có tài khoản (Student - không dùng password)
        reg_minhanh = StudentRegistry.objects.get(email='minhanh@st.vju.ac.vn')
        student_user, _ = User.objects.get_or_create(
            email='minhanh@st.vju.ac.vn',
            defaults={
                'full_name': 'Nguyễn Minh Anh',
                'role': 'student',
                'student_registry': reg_minhanh,
                'account_status': 'active',
                'phone': '0912345678',
            }
        )
        student_user.save()

        self.stdout.write("Hoan tat nap du lieu mau thanh cong!")
