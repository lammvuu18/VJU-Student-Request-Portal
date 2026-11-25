import os
from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from accounts.models import (
    Department, Notification, Payment, ProcedureType, Request,
    StateAuditLog, StudentRegistry, User,
)

DEMO_PASSWORD_MIN_LENGTH = 12

# email, ho ten, vai tro, cap tham quyen, ma phong ban
# Moi phong co 1 Truong phong + 1 Chuyen vien demo; can bo chi thay don cua phong minh
DEMO_STAFF = [
    ('demo.chuyenvien@vju.ac.vn', 'Chuyên viên Phòng Đào tạo (Demo)', 'staff', 1, 'PDT'),
    ('demo.truongphong@vju.ac.vn', 'Trưởng phòng Đào tạo (Demo)', 'dept_head', 2, 'PDT'),
    ('demo.chuyenvien.ctsv@vju.ac.vn', 'Chuyên viên Phòng CTSV (Demo)', 'staff', 1, 'PCTSV'),
    ('demo.truongphong.ctsv@vju.ac.vn', 'Trưởng phòng CTSV (Demo)', 'dept_head', 2, 'PCTSV'),
    ('demo.chuyenvien.khtc@vju.ac.vn', 'Chuyên viên Phòng KHTC (Demo)', 'staff', 1, 'PKHTC'),
    ('demo.truongphong.khtc@vju.ac.vn', 'Trưởng phòng KHTC (Demo)', 'dept_head', 2, 'PKHTC'),
    ('demo.hieutruong@vju.ac.vn', 'Hiệu trưởng Demo', 'principal', 3, None),
    ('demo.admin@vju.ac.vn', 'Quản trị viên Hệ thống (Demo)', 'admin', None, None),
]

# email, mssv, ho ten, academic_status (dung de test trang thai Graduated va Dismissed)
DEMO_STATUS_STUDENTS = [
    ('alumni@vju.ac.vn', '20CS901', 'Cựu sinh viên Demo (Graduated)', 'graduated'),
    ('dismissed@vju.ac.vn', '21CS902', 'Sinh viên Buộc thôi học Demo (Dismissed)', 'dismissed'),
]

# Ho so mau Mien giam / Hoan tra dang xu ly se chan sinh vien nop don moi (chong trung),
# nen cac ho so mau cua 2 thu tuc nay luon o trang thai da ket thuc
TUITION_PROCEDURE_NAMES = ('Miễn giảm học phí', 'Hoàn trả học phí')
TUITION_SAMPLE_CANCEL_REASON = 'Hồ sơ mẫu demo đã đóng để thử quy trình học phí mới.'

# tieu de, noi dung, da doc
STUDENT_NOTIFICATIONS = [
    ('Chào mừng bạn đến với VJU Portal',
     'Hệ thống Cổng tiếp nhận và xử lý giấy tờ đã sẵn sàng. Bạn có thể bắt đầu nộp yêu cầu.', True),
    ('Yêu cầu đã được duyệt',
     'Yêu cầu Giấy xác nhận sinh viên đã được duyệt. Vui lòng kiểm tra kết quả.', False),
    ('Cần bổ sung hồ sơ',
     'Yêu cầu Giấy giới thiệu thực tập cần bổ sung thư mời thực tập. Vui lòng nộp bổ sung trong 5 ngày.', False),
]
STAFF_NOTIFICATIONS = [
    ('Có yêu cầu mới', 'Có yêu cầu mới đang chờ xử lý tại phòng ban của bạn.', False),
]


class Command(BaseCommand):
    help = 'Tao du lieu demo khi SEED_DEMO=True. Chi them hoac cap nhat, khong xoa du lieu'

    def handle(self, *args, **options):
        if os.getenv('SEED_DEMO', 'False') != 'True':
            self.stdout.write('Bo qua seed_demo: SEED_DEMO khac True.')
            return

        password = os.getenv('DEMO_PASSWORD', '')
        if len(password) < DEMO_PASSWORD_MIN_LENGTH:
            raise CommandError(f'DEMO_PASSWORD phai co it nhat {DEMO_PASSWORD_MIN_LENGTH} ky tu.')
        student_emails = [
            email.strip().lower() for email in os.getenv('DEMO_STUDENT_EMAILS', '').split(',') if email.strip()
        ]

        with transaction.atomic():
            staff = self._seed_staff(password)
            students = self._seed_students(student_emails)
            status_students = self._seed_status_students(password)
            created = self._seed_notifications(staff, STAFF_NOTIFICATIONS)
            created += self._seed_notifications(students, STUDENT_NOTIFICATIONS)
            req_created = self._seed_demo_requests(students, staff)
            self._reconcile_demo_requests(staff)

        for user in staff + students + status_students:
            self.stdout.write(f'  {user.role:<10} {user.email}')
        self.stdout.write(self.style.SUCCESS(
            f'Da chuan bi {len(staff)} can bo, {len(students)} sinh vien demo, '
            f'them {created} thong bao, {req_created} ho so mau.'
        ))

    def _seed_staff(self, password):
        staff = []
        for email, full_name, role, level, dept_code in DEMO_STAFF:
            user, _ = User.objects.update_or_create(
                email=email,
                defaults={
                    'full_name': full_name, 'role': role, 'authority_level': level,
                    'department': Department.objects.get(code=dept_code) if dept_code else None,
                    'account_status': 'active',
                },
            )
            # Dat lai theo DEMO_PASSWORD moi lan deploy de doi mat khau bang cach sua bien moi truong
            user.set_password(password)
            user.save(update_fields=['password'])
            staff.append(user)
        return staff

    def _seed_students(self, emails):
        students = []
        for email in emails:
            existing = User.objects.filter(email=email).exclude(role='student').first()
            if existing:
                # Dang nhap Google uu tien danh muc sinh vien, de ca hai se dang nhap sai vai tro
                self.stdout.write(self.style.WARNING(f'Bo qua {email}: da la tai khoan {existing.role}.'))
                continue

            registry = StudentRegistry.objects.filter(email=email).first()
            if not registry:
                registry = StudentRegistry.objects.create(
                    email=email, mssv=self._next_demo_mssv(), full_name=f'Sinh viên Demo ({email.split("@")[0]})',
                    class_name='DEMO', cohort='K2022', major='Khoa học Máy tính', academic_status='active',
                )
            user, _ = User.objects.get_or_create(
                email=email,
                defaults={
                    'full_name': registry.full_name, 'role': 'student',
                    'student_registry': registry, 'account_status': 'active',
                },
            )
            students.append(user)
        return students

    def _seed_status_students(self, password):
        status_users = []
        for email, mssv, full_name, academic_status in DEMO_STATUS_STUDENTS:
            registry, _ = StudentRegistry.objects.update_or_create(
                email=email,
                defaults={
                    'mssv': mssv,
                    'full_name': full_name,
                    'class_name': 'CS2020A',
                    'cohort': 'K2020',
                    'major': 'Khoa học Máy tính',
                    'academic_status': academic_status,
                },
            )
            user, _ = User.objects.update_or_create(
                email=email,
                defaults={
                    'full_name': full_name,
                    'role': 'student',
                    'student_registry': registry,
                    'account_status': 'active',
                },
            )
            user.set_password(password)
            user.save(update_fields=['password'])
            status_users.append(user)
        return status_users

    def _next_demo_mssv(self):
        number = 1
        while StudentRegistry.objects.filter(mssv=f'DEMO{number:03d}').exists():
            number += 1
        return f'DEMO{number:03d}'

    def _seed_notifications(self, users, notifications):
        created_count = 0
        for user in users:
            for title, message, is_read in notifications:
                # Thong bao da co thi giu nguyen, ke ca trang thai da doc trong luc demo
                _, created = Notification.objects.get_or_create(
                    user=user, title=title, defaults={'message': message, 'is_read': is_read},
                )
                created_count += created
        return created_count

    def _seed_demo_requests(self, students, staff):
        procedures = {
            p.name: p for p in ProcedureType.objects.filter(is_active=True)
        }
        if not procedures or not students:
            return 0

        fallback_proc = next(iter(procedures.values()))
        demo_team = self._demo_team_by_department(staff)
        now = timezone.now()

        # 20 ho so mau cho moi sinh vien demo, trai deu cac thu tuc va trang thai
        specs = [
            # 1-2: Cho thanh toan (de test nut Gia lap thanh toan thanh cong)
            ('Phúc khảo điểm thi', 'Chờ thanh toán', 'Chờ thanh toán', False,
             {'subject': 'Giải tích 1', 'semester': 'HK1 2025-2026', 'current_grade': 5.5, 'reason': 'Đề nghị chấm lại câu 3 phần tự luận.'}),
            ('Phúc khảo điểm thi', 'Chờ thanh toán', 'Chờ thanh toán', False,
             {'subject': 'Tiếng Nhật cơ sở 2', 'semester': 'HK1 2025-2026', 'current_grade': 6.0, 'reason': 'Kiểm tra lại điểm phần nghe và viết.'}),
            # 3-6: Cho phan cong (de Truong phong test phan cong)
            ('Phúc khảo điểm thi', 'Đã gửi', 'Chờ phân công', False,
             {'subject': 'Cấu trúc dữ liệu & Giải thuật', 'semester': 'HK1 2025-2026', 'current_grade': 6.5, 'reason': 'Xin phúc khảo bài thi cuối kỳ.'}),
            ('Phúc khảo điểm thi', 'Đã gửi', 'Chờ phân công', False,
             {'subject': 'Cơ sở dữ liệu', 'semester': 'HK1 2025-2026', 'current_grade': 5.0, 'reason': 'Điểm thực tế thấp hơn dự kiến.'}),
            ('Giấy xác nhận sinh viên', 'Đã gửi', 'Chờ phân công', False,
             {'purpose': 'Vay vốn', 'result_preference': 'Bản điện tử'}),
            ('Bảo lưu kết quả học tập', 'Đã gửi', 'Chờ phân công', False,
             {'semester': 'HK2 2025-2026', 'gpa': 2.85, 'reason': 'Bảo lưu vì lý do sức khỏe.'}),
            # 7-11: CV dang tham dinh (de Chuyen vien test man D4 & xu ly)
            ('Phúc khảo điểm thi', 'Đang xử lý', 'CV đang thẩm định', True,
             {'subject': 'Lập trình hướng đối tượng', 'semester': 'HK1 2025-2026', 'current_grade': 6.0, 'reason': 'Chấm lại bài thi vấn đáp.'}),
            ('Phúc khảo điểm thi', 'Đang xử lý', 'CV đang thẩm định', True,
             {'subject': 'Mạng máy tính', 'semester': 'HK1 2025-2026', 'current_grade': 5.5, 'reason': 'Kiểm tra lại điểm tổng kết bài thi.'}),
            ('Phúc khảo điểm thi', 'Đang xử lý', 'CV đang thẩm định', True,
             {'subject': 'Xác suất thống kê', 'semester': 'HK1 2025-2026', 'current_grade': 4.5, 'reason': 'Xin rà soát lại phần bài tập lớn.'}),
            ('Giấy giới thiệu thực tập', 'Đang xử lý', 'CV đang thẩm định', True,
             {'company_name': 'FPT Software', 'result_preference': 'Bản cứng', 'purpose': 'Xin việc'}),
            ('Miễn giảm học phí', 'Đã hủy', 'Đã hủy', False,
             {'beneficiary_type': 'Sinh viên thuộc hộ cận nghèo', 'exemption_semester': 'HK1 2025-2026',
              'cancel_reason': TUITION_SAMPLE_CANCEL_REASON}),
            # 12-15: Cho TP phe duyet (bao gom don phuc khao da nhap diem D4)
            ('Phúc khảo điểm thi', 'Đang xử lý', 'Chờ TP phê duyệt', True,
             {'subject': 'Hệ điều hành', 'semester': 'HK1 2025-2026', 'current_grade': 6.0,
              'review_data': {'grade_reviewer_1': 7.5, 'grade_reviewer_2': 7.5, 'final_grade': 7.5, 'review_notes': 'Đã chấm lại, tăng 1.5 điểm.'}}),
            ('Phúc khảo điểm thi', 'Đang xử lý', 'Chờ TP phê duyệt', True,
             {'subject': 'Trí tuệ nhân tạo', 'semester': 'HK1 2025-2026', 'current_grade': 7.0,
              'review_data': {'grade_reviewer_1': 7.0, 'grade_reviewer_2': 7.0, 'final_grade': 7.0, 'review_notes': 'Giữ nguyên điểm ban đầu.'}}),
            ('Giấy xác nhận sinh viên', 'Đang xử lý', 'Chờ TP phê duyệt', True,
             {'purpose': 'Visa', 'result_preference': 'Cả hai'}),
            ('Hoàn trả học phí', 'Đã hủy', 'Đã hủy', False,
             {'amount': 3500000, 'refund_reason': 'Đóng thừa học phí', 'refund_semester': 'HK1 2025-2026',
              'cancel_reason': TUITION_SAMPLE_CANCEL_REASON}),
            # 16: Cho HT ky so
            ('Bảo lưu kết quả học tập', 'Đang xử lý', 'Chờ HT ký số', True,
             {'semester': 'HK2 2025-2026', 'gpa': 3.1, 'reason': 'Tham gia chương trình trao đổi ngắn hạn.'}),
            # 17: Can bo sung
            ('Giấy giới thiệu thực tập', 'Cần bổ sung', 'Cần bổ sung', True,
             {'company_name': 'Viettel Digital', 'result_preference': 'Bản cứng'}),
            # 18-19: Da hoan tat
            ('Phúc khảo điểm thi', 'Đã xử lý', 'Đã xử lý', True,
             {'subject': 'Nhập môn Công nghệ phần mềm', 'semester': 'HK2 2024-2025', 'current_grade': 6.5,
              'review_data': {'grade_reviewer_1': 8.0, 'grade_reviewer_2': 8.0, 'final_grade': 8.0, 'review_notes': 'Cập nhật điểm mới: 8.0.'}}),
            ('Giấy xác nhận sinh viên', 'Đã duyệt', 'Đã duyệt — Có kết quả', True,
             {'purpose': 'Tạm hoãn NVQS', 'result_preference': 'Bản điện tử'}),
            # 20: Tu choi
            ('Miễn giảm học phí', 'Từ chối', 'Từ chối', True,
             {'beneficiary_type': 'Sinh viên thuộc hộ nghèo', 'exemption_semester': 'HK1 2025-2026'}),
        ]

        created_count = 0
        for student in students:
            mssv = student.student_registry.mssv if student.student_registry_id else f'U{student.user_id}'
            for idx, (proc_name, status, internal_status, assigned, extra_form) in enumerate(specs, start=1):
                proc = procedures.get(proc_name, fallback_proc)
                demo_cv, demo_tp = demo_team.get(proc.department_id, (None, None))
                request_code = f'DEMO-{mssv}-{idx:02d}'[:30]
                form_data = {
                    'full_name': student.full_name,
                    'mssv': mssv,
                    'email': student.email,
                    **extra_form,
                }
                req_obj, created = Request.objects.get_or_create(
                    request_code=request_code,
                    defaults={
                        'user': student,
                        'procedure_type': proc,
                        'status': status,
                        'internal_status': internal_status,
                        'assigned_by': demo_tp if assigned else None,
                        'assigned_staff': demo_cv if assigned else None,
                        'assigned_at': now - timedelta(days=1) if assigned else None,
                        'form_data': form_data,
                        'purpose': form_data.get('purpose'),
                        'result_preference': form_data.get('result_preference', 'Bản điện tử'),
                        'sla_deadline': None if internal_status == 'Chờ thanh toán' else now + timedelta(days=proc.sla_total_days),
                        'supplement_deadline': now + timedelta(days=5) if internal_status == 'Cần bổ sung' else None,
                        'is_draft': False,
                    },
                )
                if not created:
                    continue
                created_count += 1
                if proc.is_fee_required:
                    is_paid = internal_status != 'Chờ thanh toán'
                    Payment.objects.create(
                        request=req_obj,
                        txn_id=f'DEMO-TXN-{mssv}-{idx:02d}',
                        amount=proc.fee_amount,
                        payment_method='PayOS',
                        status='completed' if is_paid else 'pending',
                        completed_at=now - timedelta(days=2) if is_paid else None,
                    )
                StateAuditLog.objects.create(
                    request=req_obj,
                    performed_by=student,
                    action='SUBMIT',
                    note='Hồ sơ mẫu demo được tạo tự động.',
                    status_after=internal_status,
                )
        return created_count

    def _demo_team_by_department(self, staff):
        """dept_id -> (chuyen vien demo, truong phong demo) cua phong do."""
        team = {}
        for user in staff:
            if not user.department_id or user.role not in ('staff', 'dept_head'):
                continue
            cv, tp = team.get(user.department_id, (None, None))
            team[user.department_id] = (user, tp) if user.role == 'staff' else (cv, user)
        return team

    def _reconcile_demo_requests(self, staff):
        """
        Dong bo ho so mau DEMO-* da tao o cac lan deploy truoc voi phan quyen moi:
        - Ho so dang giao cho can bo demo khong thuoc phong dang giu don -> giao lai cho can bo demo dung phong
        - Ho so mau Mien giam / Hoan tra con dang xu ly -> dong lai de sinh vien nop don moi
        """
        demo_team = self._demo_team_by_department(staff)
        demo_ids = [u.user_id for u in staff]
        demo_requests = Request.objects.filter(request_code__startswith='DEMO-').select_related('procedure_type')

        for req in demo_requests.filter(procedure_type__name__in=TUITION_PROCEDURE_NAMES).exclude(
            status__in=('Đã xử lý', 'Từ chối', 'Đã hủy'),
        ):
            form_data = dict(req.form_data or {})
            form_data['cancel_reason'] = TUITION_SAMPLE_CANCEL_REASON
            status_before = req.internal_status
            req.form_data = form_data
            req.status = 'Đã hủy'
            req.internal_status = 'Đã hủy'
            req.save(update_fields=['form_data', 'status', 'internal_status', 'updated_at'])
            StateAuditLog.objects.create(
                request=req, performed_by=None, action='cancel', note=TUITION_SAMPLE_CANCEL_REASON,
                status_before=status_before, status_after='Đã hủy',
            )

        for req in demo_requests.filter(assigned_staff_id__in=demo_ids):
            active_dept_id = req.transferred_to_dept_id or req.procedure_type.department_id
            demo_cv, demo_tp = demo_team.get(active_dept_id, (None, None))
            if demo_cv and req.assigned_staff_id != demo_cv.user_id:
                req.assigned_staff = demo_cv
                req.assigned_by = demo_tp
                req.save(update_fields=['assigned_staff', 'assigned_by', 'updated_at'])
