# Dữ liệu demo trên Render

Mỗi lần deploy, `build.sh` chạy `python manage.py seed_demo`. Lệnh chỉ tạo dữ liệu khi biến `SEED_DEMO=True`, chỉ thêm hoặc cập nhật, không xóa dữ liệu.

## Bật dữ liệu demo

Vào service backend trên Render, mở **Environment** và đặt:

| Biến | Giá trị |
|---|---|
| `SEED_DEMO` | `True` |
| `DEMO_PASSWORD` | Mật khẩu dùng chung cho các tài khoản cán bộ demo, ít nhất 12 ký tự. Không ghi vào repo |
| `DEMO_STUDENT_EMAILS` | Email Google của người sẽ đăng nhập vai trò sinh viên, cách nhau bằng dấu phẩy |

Sau đó bấm **Manual Deploy**. Log deploy in danh sách tài khoản đã chuẩn bị (không in mật khẩu).

Mỗi email sinh viên cũng phải có trong **Test users** trên Google Cloud nếu ứng dụng OAuth còn ở chế độ Testing.

## Tài khoản demo

| Vai trò | Đăng nhập |
|---|---|
| Chuyên viên (PCTSV) | `demo.chuyenvien@vju.ac.vn` và `DEMO_PASSWORD` |
| Trưởng phòng (PCTSV) | `demo.truongphong@vju.ac.vn` và `DEMO_PASSWORD` |
| Hiệu trưởng | `demo.hieutruong@vju.ac.vn` và `DEMO_PASSWORD` |
| Admin | `BOOTSTRAP_ADMIN_EMAIL` và `BOOTSTRAP_ADMIN_PASSWORD` |
| Sinh viên | Nút "Đăng nhập Google" với email trong `DEMO_STUDENT_EMAILS` |

Danh mục thủ tục và lý do từ chối do `bootstrap_production` tạo, không phụ thuộc `SEED_DEMO`.

## Khi deploy lại

| Dữ liệu | Kết quả |
|---|---|
| Tài khoản demo | Giữ nguyên. Mật khẩu cán bộ đặt lại theo `DEMO_PASSWORD` hiện tại |
| Thông báo mẫu | Không tạo lại. Thông báo đã đọc trong lúc demo vẫn là đã đọc |
| Email mới thêm vào `DEMO_STUDENT_EMAILS` | Được tạo thêm |
| Dữ liệu người dùng tạo khi demo | Không bị đụng tới |

## Tắt dữ liệu demo

Đổi `SEED_DEMO` thành `False`. Dữ liệu đã tạo vẫn còn trong database, chỉ là không được tạo hoặc cập nhật ở các lần deploy sau.
