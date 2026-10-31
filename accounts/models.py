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

# -------------------- 14 MODELS BỔ SUNG --------------------

class ProcedureType(models.Model):
    type_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=200, verbose_name="Tên thủ tục")
    description = models.TextField(blank=True, null=True, verbose_name="Mô tả")
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, related_name='procedure_types')
    sla_total_days = models.IntegerField(verbose_name="Tổng SLA cam kết")
    approval_levels = models.IntegerField(choices=[(1, '1'), (2, '2'), (3, '3')], verbose_name="Số cấp duyệt")
    sub_sla_l1_days = models.IntegerField(null=True, blank=True, verbose_name="Sub-SLA cấp CV")
    sub_sla_l2_days = models.IntegerField(null=True, blank=True, verbose_name="Sub-SLA cấp TP")
    sub_sla_l3_days = models.IntegerField(null=True, blank=True, verbose_name="Sub-SLA cấp HT")
    result_type = models.CharField(max_length=50, verbose_name="Loại kết quả")
    template_file_path = models.CharField(max_length=500, blank=True, null=True, verbose_name="Đường dẫn template PDF")
    is_fee_required = models.BooleanField(default=False, verbose_name="Yêu cầu lệ phí")
    fee_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Số tiền lệ phí")
    is_active = models.BooleanField(default=True, verbose_name="Đang hoạt động")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'procedure_type'

class FormField(models.Model):
    field_id = models.AutoField(primary_key=True)
    procedure_type = models.ForeignKey(ProcedureType, on_delete=models.CASCADE, related_name='form_fields')
    field_name = models.CharField(max_length=200, verbose_name="Label hiển thị")
    field_key = models.CharField(max_length=100, verbose_name="Key kỹ thuật")
    data_type = models.CharField(max_length=50, verbose_name="Loại dữ liệu")
    is_required = models.BooleanField(default=False, verbose_name="Bắt buộc")
    placeholder = models.CharField(max_length=200, blank=True, null=True)
    auto_fill_field = models.CharField(max_length=100, blank=True, null=True)
    dropdown_options = models.JSONField(blank=True, null=True, verbose_name="Danh sách option")
    display_order = models.IntegerField(default=0, verbose_name="Thứ tự hiển thị")

    class Meta:
        db_table = 'form_field'

class AttachmentConfig(models.Model):
    config_id = models.AutoField(primary_key=True)
    procedure_type = models.ForeignKey(ProcedureType, on_delete=models.CASCADE, related_name='attachment_configs')
    item_name = models.CharField(max_length=200, verbose_name="Tên đầu mục")
    is_required = models.BooleanField(default=False, verbose_name="Bắt buộc")
    allowed_formats = models.CharField(max_length=100, blank=True, null=True, verbose_name="Định dạng cho phép")
    max_size_mb = models.IntegerField(default=5, verbose_name="Dung lượng tối đa (MB)")
    display_order = models.IntegerField(default=0, verbose_name="Thứ tự hiển thị")

    class Meta:
        db_table = 'attachment_config'

class Request(models.Model):
    request_id = models.AutoField(primary_key=True)
    request_code = models.CharField(max_length=30, unique=True, verbose_name="Mã đơn")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='submitted_requests', verbose_name="SV gửi đơn")
    procedure_type = models.ForeignKey(ProcedureType, on_delete=models.RESTRICT, related_name='requests')
    status = models.CharField(max_length=50, verbose_name="Trạng thái hiển thị SV")
    internal_status = models.CharField(max_length=50, blank=True, null=True, verbose_name="Trạng thái nội bộ")
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_out_requests')
    assigned_staff = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='handling_requests')
    assigned_at = models.DateTimeField(null=True, blank=True)
    form_data = models.JSONField(blank=True, null=True, verbose_name="Dữ liệu e-form")
    purpose = models.CharField(max_length=200, blank=True, null=True, verbose_name="Mục đích")
    result_preference = models.CharField(max_length=50, blank=True, null=True, verbose_name="Hình thức nhận kết quả")
    hardcopy_qty = models.IntegerField(default=0, verbose_name="Số bản cứng")
    supplement_count = models.IntegerField(default=0, verbose_name="Số lần bổ sung")
    sla_deadline = models.DateTimeField(null=True, blank=True)
    sla_paused_at = models.DateTimeField(null=True, blank=True)
    supplement_deadline = models.DateTimeField(null=True, blank=True)
    transferred_to_dept = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='transferred_requests')
    transferred_at = models.DateTimeField(null=True, blank=True)
    is_draft = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'request'

class Payment(models.Model):
    payment_id = models.AutoField(primary_key=True)
    request = models.ForeignKey(Request, on_delete=models.CASCADE, related_name='payments')
    txn_id = models.CharField(max_length=100, blank=True, null=True, verbose_name="Mã giao dịch")
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Số tiền")
    payment_method = models.CharField(max_length=50, blank=True, null=True)
    status = models.CharField(max_length=30, verbose_name="Trạng thái thanh toán")
    payment_url = models.CharField(max_length=1000, blank=True, null=True)
    callback_data = models.JSONField(blank=True, null=True)
    signature_verified = models.BooleanField(default=False)
    retry_count = models.IntegerField(default=0)
    refund_status = models.CharField(max_length=30, blank=True, null=True)
    refunded_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'payment'

class Attachment(models.Model):
    attachment_id = models.AutoField(primary_key=True)
    request = models.ForeignKey(Request, on_delete=models.CASCADE, related_name='attachments')
    config = models.ForeignKey(AttachmentConfig, on_delete=models.SET_NULL, null=True, blank=True, related_name='attachments')
    file_name = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)
    file_size = models.BigIntegerField(null=True, blank=True)
    mime_type = models.CharField(max_length=50, blank=True, null=True)
    is_supplement = models.BooleanField(default=False)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'attachment'

class StateAuditLog(models.Model):
    log_id = models.AutoField(primary_key=True)
    request = models.ForeignKey(Request, on_delete=models.CASCADE, related_name='audit_logs')
    performed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='performed_actions')
    action = models.CharField(max_length=50)
    note = models.TextField(blank=True, null=True)
    status_before = models.CharField(max_length=50, blank=True, null=True)
    status_after = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'state_audit_log'

class AccessLog(models.Model):
    access_id = models.AutoField(primary_key=True)
    request = models.ForeignKey(Request, on_delete=models.CASCADE, related_name='access_logs')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='access_logs')
    first_viewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'access_log'

class Notification(models.Model):
    notification_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    request = models.ForeignKey(Request, on_delete=models.SET_NULL, null=True, blank=True, related_name='notifications')
    title = models.CharField(max_length=200)
    message = models.TextField()
    channel = models.CharField(max_length=20, default='in_app')
    is_read = models.BooleanField(default=False)
    sent_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'notification'

class Result(models.Model):
    result_id = models.AutoField(primary_key=True)
    request = models.OneToOneField(Request, on_delete=models.CASCADE, related_name='result')
    pdf_file_path = models.CharField(max_length=500, blank=True, null=True)
    verification_code = models.CharField(max_length=50, blank=True, null=True)
    qr_code_data = models.TextField(blank=True, null=True)
    smartca_transaction_id = models.CharField(max_length=100, blank=True, null=True)
    signed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='signed_results')
    signed_at = models.DateTimeField(null=True, blank=True)
    cold_storage_at = models.DateTimeField(null=True, blank=True)
    hardcopy_ready_at = models.DateTimeField(null=True, blank=True)
    pickup_date = models.DateTimeField(null=True, blank=True)
    pickup_location = models.CharField(max_length=200, blank=True, null=True)
    pickup_note = models.TextField(blank=True, null=True)
    pickup_assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_pickups')
    pickup_assigned_at = models.DateTimeField(null=True, blank=True)
    handover_confirmed_at = models.DateTimeField(null=True, blank=True)
    confirmed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='confirmed_handovers')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'result'

class Feedback(models.Model):
    feedback_id = models.AutoField(primary_key=True)
    request = models.OneToOneField(Request, on_delete=models.CASCADE, related_name='feedback')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='feedbacks')
    star_rating = models.FloatField(blank=True, null=True)
    speed_score = models.FloatField(blank=True, null=True)
    attitude_score = models.FloatField(blank=True, null=True)
    convenience_score = models.FloatField(blank=True, null=True)
    comment_text = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'feedback'

class Holiday(models.Model):
    holiday_id = models.AutoField(primary_key=True)
    holiday_date = models.DateField(unique=True)
    description = models.CharField(max_length=200, blank=True, null=True)
    type = models.CharField(max_length=20, default='holiday')
    year = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'holiday'

class RejectionReason(models.Model):
    reason_id = models.AutoField(primary_key=True)
    reason_text = models.CharField(max_length=500)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'rejection_reason'

class PermissionAuditLog(models.Model):
    log_id = models.AutoField(primary_key=True)
    admin = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='admin_action_logs')
    target_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='permission_change_logs')
    change_type = models.CharField(max_length=50)
    change_detail = models.TextField(blank=True, null=True)
    reason = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'permission_audit_log'