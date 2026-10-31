from django.db import models
from django.contrib.auth.hashers import make_password, check_password

class Department(models.Model):
    dept_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255, verbose_name="Tên phòng ban")
    code = models.CharField(max_length=50, blank=True, default='', verbose_name="Mã phòng ban (PCTSV, PĐT, PKHTC)")
    description = models.TextField(blank=True, default='', verbose_name="Mô tả chức năng")
    is_active = models.BooleanField(default=True, verbose_name="Đang hoạt động")

    class Meta:
        db_table = 'departments'
        verbose_name = 'Phòng ban'
        verbose_name_plural = 'Phòng ban'

    def __str__(self):
        return self.name


class StudentRegistry(models.Model):
    registry_id = models.AutoField(primary_key=True)
    email = models.EmailField(unique=True, verbose_name="Email sinh viên (@st.vju.ac.vn)")
    mssv = models.CharField(max_length=20, unique=True, verbose_name="Mã số sinh viên")
    full_name = models.CharField(max_length=255, verbose_name="Họ và tên")
    dob = models.DateField(null=True, blank=True, verbose_name="Ngày sinh")
    gender = models.CharField(max_length=10, blank=True, default='', verbose_name="Giới tính")
    class_name = models.CharField(max_length=50, verbose_name="Lớp sinh hoạt")
    cohort = models.CharField(max_length=20, verbose_name="Khóa học (VD: K2021)")
    major = models.CharField(max_length=100, verbose_name="Ngành đào tạo")
    academic_status = models.CharField(
        max_length=20,
        default='active',
        choices=[
            ('active', 'Đang học'),
            ('suspended', 'Bảo lưu'),
            ('graduated', 'Đã tốt nghiệp'),
            ('dismissed', 'Buộc thôi học'),
        ],
        verbose_name="Tình trạng học tập"
    )

    class Meta:
        db_table = 'student_registry'
        verbose_name = 'Danh mục sinh viên import'
        verbose_name_plural = 'Danh mục sinh viên import'

    def __str__(self):
        return f"{self.mssv} - {self.full_name} ({self.email})"


class User(models.Model):
    ROLE_CHOICES = [
        ('student', 'Sinh viên'),
        ('staff', 'Chuyên viên / Giảng viên'),
        ('dept_head', 'Trưởng phòng'),
        ('principal', 'Hiệu trưởng / Ban giám hiệu'),
        ('admin', 'Quản trị viên'),
    ]

    STATUS_CHOICES = [
        ('active', 'Đang hoạt động'),
        ('locked', 'Đã bị khóa'),
    ]

    user_id = models.AutoField(primary_key=True)
    email = models.EmailField(unique=True, verbose_name="Email tài khoản")
    password = models.CharField(max_length=255, blank=True, default='', verbose_name="Mật khẩu mã hóa")
    full_name = models.CharField(max_length=255, verbose_name="Họ và tên")
    google_id = models.CharField(max_length=255, blank=True, null=True, verbose_name="Google Sub ID")
    avatar_url = models.TextField(blank=True, default='', verbose_name="Đường dẫn ảnh đại diện")
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, verbose_name="Vai trò")
    department = models.ForeignKey(
        Department,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='users',
        verbose_name="Phòng ban"
    )
    authority_level = models.IntegerField(
        null=True,
        blank=True,
        choices=[(1, 'Cấp 1 - Chuyên viên'), (2, 'Cấp 2 - Trưởng phòng'), (3, 'Cấp 3 - Hiệu trưởng')],
        verbose_name="Cấp thẩm quyền"
    )
    student_registry = models.OneToOneField(
        StudentRegistry,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='user_account',
        verbose_name="Liên kết hồ sơ sinh viên"
    )
    phone = models.CharField(max_length=20, blank=True, default='', verbose_name="Số điện thoại")
    account_status = models.CharField(max_length=20, default='active', choices=STATUS_CHOICES, verbose_name="Trạng thái tài khoản")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'
        verbose_name = 'Người dùng'
        verbose_name_plural = 'Người dùng'

    def __str__(self):
        return f"{self.full_name} ({self.email}) - {self.get_role_display()}"

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        if not self.password:
            return False
        return check_password(raw_password, self.password)

    def get_redirect_url(self):
        """
        Xác định URL điều hướng màn hình sau khi đăng nhập dựa trên phân quyền vai trò:
        - Sinh viên -> /student
        - Trưởng phòng -> /dept-head
        - Chuyên viên / Giảng viên -> /staff
        - Hiệu trưởng -> /principal
        - Admin -> /admin
        """
        if self.role == 'student':
            return '/student'
        elif self.role == 'dept_head' or (self.role == 'staff' and self.authority_level == 2):
            return '/dept-head'
        elif self.role == 'staff':
            return '/staff'
        elif self.role == 'principal' or self.authority_level == 3:
            return '/principal'
        elif self.role == 'admin':
            return '/admin'
        return '/login'

    def to_dict(self):
        """
        Định dạng dữ liệu trả về theo đúng API Contract (Section 1.1 & 1.2)
        """
        data = {
            "user_id": self.user_id,
            "email": self.email,
            "full_name": self.full_name,
            "name": self.full_name,
            "phone": self.phone or "",
            "avatar_url": self.avatar_url or "",
            "role": self.role,
            "authority_level": self.authority_level,
            "department_id": self.department.dept_id if self.department else None,
            "department_name": self.department.name if self.department else None,
            "account_status": self.account_status,
            "redirect_url": self.get_redirect_url(),
        }

        # Nếu là sinh viên, bổ sung thông tin từ StudentRegistry
        if self.student_registry:
            data.update({
                "mssv": self.student_registry.mssv,
                "class_name": self.student_registry.class_name,
                "lop": self.student_registry.class_name,
                "cohort": self.student_registry.cohort,
                "khoa": self.student_registry.cohort,
                "major": self.student_registry.major,
                "nganh": self.student_registry.major,
                "academic_status": self.student_registry.academic_status,
            })
        else:
            data.update({
                "mssv": None,
                "class_name": None,
                "cohort": None,
                "major": None,
                "academic_status": None,
            })

        return data
