# Deploy môi trường staging lên Render

Môi trường staging chạy độc lập với bản deploy hiện có (`render.yaml`): database riêng, backend riêng, frontend riêng, domain riêng. Cấu hình nằm ở `render.staging.yaml`, mặc định deploy nhánh `develop`.

| Thành phần | Tên service | URL dự kiến |
|---|---|---|
| Database | `vju-onestop-staging-db` | Không public |
| Backend | `vju-onestop-staging` | `https://vju-onestop-staging.onrender.com` |
| Frontend | `vju-portal-staging` | `https://vju-portal-staging.onrender.com` |

Nếu tên đã có người dùng, Render tự thêm hậu tố vào URL (ví dụ `vju-portal-staging-a1b2.onrender.com`). Luôn dùng URL thật hiển thị trên dashboard ở các bước sau.

## 0. Chuẩn bị

- Code cần deploy đã được push lên nhánh `develop` trên GitHub.
- Tài khoản Render đọc được repo. Repo thuộc tài khoản khác thì chủ repo thêm bạn làm collaborator, sau đó trên Render vào **Account Settings > GitHub** và cấp quyền cho repo đó.
- Gói free của Render chỉ cho **1 database Postgres free trên mỗi workspace**. Nếu workspace đã có database free của bản deploy kia, hãy tạo staging ở workspace khác (hoặc tài khoản Render khác).

## 1. Tạo Blueprint

1. Render Dashboard > **New** > **Blueprint**.
2. Chọn repo `VJU-Student-Request-Portal`, branch `develop`.
3. **Blueprint Path**: `render.staging.yaml`.
4. Render hỏi giá trị các biến `sync: false`. Lúc này chưa biết URL nên điền tạm như bảng dưới, bước 3 sẽ sửa lại.

| Service | Biến | Giá trị lúc tạo |
|---|---|---|
| Backend | `GOOGLE_CLIENT_ID` | Để trống nếu chưa có (bước 2) |
| Backend | `BOOTSTRAP_ADMIN_EMAIL` | Email admin, ví dụ `admin.staging@vju.ac.vn` |
| Backend | `BOOTSTRAP_ADMIN_PASSWORD` | Ít nhất 12 ký tự. Không ghi vào repo |
| Backend | `DEMO_PASSWORD` | Ít nhất 12 ký tự, mật khẩu chung cho tài khoản cán bộ demo |
| Backend | `CORS_ALLOWED_ORIGINS` | `https://vju-portal-staging.onrender.com` |
| Backend | `VERIFY_BASE_URL` | `https://vju-portal-staging.onrender.com/verify/` |
| Frontend | `REACT_APP_API_BASE_URL` | `https://vju-onestop-staging.onrender.com/api` |
| Frontend | `REACT_APP_GOOGLE_CLIENT_ID` | Để trống nếu chưa có (bước 2) |

5. Bấm **Apply**. Render tạo database, build backend (`build.sh` chạy migrate, nạp danh mục thủ tục, tạo tài khoản demo) và build frontend.

`DEMO_STUDENT_EMAILS` đã đặt sẵn trong `render.staging.yaml`. Muốn thêm người đăng nhập vai trò sinh viên, sửa biến này trên dashboard rồi deploy lại backend. Chi tiết dữ liệu demo xem `docs/demo-deploy.md`.

## 2. Tạo Google OAuth Client (để sinh viên đăng nhập)

Staging chạy với `DEBUG=False`, nên backend chỉ nhận Google ID token thật. Không có bước này thì cán bộ vẫn đăng nhập bằng mật khẩu được, còn sinh viên thì không.

1. Vào [Google Cloud Console](https://console.cloud.google.com/) và tạo (hoặc chọn) một project.
2. **APIs & Services > OAuth consent screen**:
   - User type: **External**.
   - Để ở chế độ **Testing**.
   - Mục **Test users**: thêm từng email sẽ đăng nhập vai trò sinh viên (ví dụ `guenkokuain020411@gmail.com`).
3. **APIs & Services > Credentials > Create credentials > OAuth client ID**, Application type **Web application**:

| Mục | Giá trị |
|---|---|
| Authorized JavaScript origins | `https://vju-portal-staging.onrender.com` |
| Authorized redirect URIs | `https://vju-portal-staging.onrender.com/auth/callback` |

4. Copy **Client ID** (dạng `xxxx.apps.googleusercontent.com`). Không cần Client Secret.

Có thể thêm `http://localhost:3000` và `http://localhost:3000/auth/callback` vào cùng client để dùng Google thật khi chạy local.

## 3. Điền URL thật và deploy lại

Sau khi Blueprint tạo xong, mở từng service để lấy URL thật rồi cập nhật **Environment**:

| Service | Biến | Giá trị |
|---|---|---|
| Backend | `CORS_ALLOWED_ORIGINS` | URL frontend, không có `/` ở cuối |
| Backend | `VERIFY_BASE_URL` | URL frontend + `/verify/` |
| Backend | `GOOGLE_CLIENT_ID` | Client ID ở bước 2 |
| Frontend | `REACT_APP_API_BASE_URL` | URL backend + `/api` |
| Frontend | `REACT_APP_GOOGLE_CLIENT_ID` | Cùng Client ID ở bước 2 |

Sau đó chạy **Manual Deploy > Deploy latest commit** cho cả hai service. Frontend bắt buộc phải build lại, vì biến `REACT_APP_*` được nhúng vào code lúc build.

## 4. Kiểm tra

1. Mở `<URL backend>/api/procedures`. Kết quả JSON `UNAUTHORIZED` nghĩa là backend đã chạy.
2. Mở URL frontend:
   - Cán bộ: đăng nhập `demo.chuyenvien@vju.ac.vn` hoặc `demo.truongphong@vju.ac.vn` với `DEMO_PASSWORD`.
   - Sinh viên: bấm **Đăng nhập bằng Google** và chọn email nằm trong `DEMO_STUDENT_EMAILS`.
3. Chạy thử một vòng:
   1. Sinh viên nộp Giấy xác nhận sinh viên.
   2. Trưởng phòng phân công.
   3. Chuyên viên phê duyệt.
   4. Sinh viên tải PDF kết quả.
   5. Quét mã QR trên PDF, phải mở trang xác minh.

Nếu trình duyệt báo lỗi CORS, kiểm tra `CORS_ALLOWED_ORIGINS` có khớp chính xác URL frontend không (có `https://`, không có `/` ở cuối).

## Sau khi deploy

- Mỗi lần push lên nhánh `develop`, cả hai service staging tự deploy lại. Muốn staging theo nhánh khác thì sửa `branch` trong `render.staging.yaml`, hoặc đổi trong **Settings** của từng service.
- Bản deploy cũ (`render.yaml`) không bị ảnh hưởng.

## Giới hạn của gói free

| Vấn đề | Ảnh hưởng |
|---|---|
| Web service ngủ sau ~15 phút không có truy cập | Request đầu tiên mất khoảng 1 phút. Frontend chờ tối đa 60 giây |
| Ổ đĩa không lưu lâu dài | File sinh viên tải lên và PDF kết quả mất sau mỗi lần deploy hoặc restart. Đơn cũ sẽ báo "File không tồn tại". Muốn giữ lâu dài cần Render Disk (trả phí) hoặc lưu file lên dịch vụ ngoài |
| Database free có thời hạn | Render xóa database free sau một thời gian (xem chính sách hiện tại trên trang Render). Cần tạo lại database hoặc nâng gói |

## Dùng domain riêng (không bắt buộc)

Vào **Settings > Custom Domains** của frontend (và backend nếu muốn), rồi thêm bản ghi DNS theo hướng dẫn của Render. Sau khi đổi domain, cập nhật lại:
- `CORS_ALLOWED_ORIGINS`,
- `VERIFY_BASE_URL`,
- `REACT_APP_API_BASE_URL`,
- Authorized origins và Redirect URI trong Google OAuth.

Rồi deploy lại cả hai service.
