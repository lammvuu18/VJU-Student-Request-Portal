# Kịch bản test backend Module 0: Danh mục thủ tục và Thông báo

Phạm vi: 5 API `GET /procedures`, `GET /procedures/:type_id`, `GET /notifications`, `PUT /notifications/:id/read`, `PUT /notifications/read-all`.

Tổng cộng **88 ca test**. Lần chạy gần nhất trên nhánh `feature/account` (commit `d4646ee` cùng các bản sửa lỗi chưa commit): **88 đạt, 0 không đạt**. Cột "Hiện tại" ghi kết quả của lần chạy đó.

## 1. Nguyên tắc viết kịch bản

Khi các nguồn khác nhau, kịch bản ưu tiên theo thứ tự:

1. `api-contract.md`: quy ước chung, các mục 2 và 8, bảng Actor.
2. `expected-results-module0.md` (cột Nguồn ghi "Spec"): dùng cho những gì contract chưa quy định, như mã `PROCEDURE_INACTIVE`, `NOT_FOUND`, `FORBIDDEN`.
3. Quy ước HTTP: dùng cho các ca sai method.

Kết quả mong đợi lấy theo tài liệu, không theo code hiện tại.

## 2. Chuẩn bị

Chạy tại thư mục gốc của repo.

```powershell
.\venv\Scripts\python.exe manage.py migrate
.\venv\Scripts\python.exe manage.py seed_module0 --postman-env docs\testing\module0.postman_environment.json
.\venv\Scripts\python.exe manage.py runserver 8080
```

`seed_module0` đưa dữ liệu về trạng thái cố định, và có thể chạy lại bao nhiêu lần cũng được.

> **Lưu ý:** lệnh này **xóa toàn bộ** đơn, thủ tục và thông báo trong database rồi tạo lại. Lệnh chỉ chạy khi `DEBUG=True` và database là SQLite, trừ khi thêm `--allow-non-sqlite`.

Trong Postman:

1. Bấm **Import**, chọn hai file `module0.postman_collection.json` và `module0.postman_environment.json` trong `docs/testing/`.
2. Ở góc trên bên phải, chọn environment **VJU Module 0**.
3. Bấm vào collection, chọn **Run**, giữ nguyên thứ tự và bấm **Run**.

Mỗi request đã có sẵn phần tự kiểm tra, xem kết quả ở tab **Test Results**.

Hai điều cần nhớ khi chạy:

- **Chạy lại từ đầu phải seed lại.** Nhóm 5 và 6 làm thay đổi dữ liệu, các ca sau phụ thuộc ca trước. Sau khi seed lại, import lại file environment nếu token đã hơn 24 giờ.
- **Không đổi thứ tự.** Phải chạy lần lượt: thủ tục, danh sách thông báo, xác thực, đánh dấu đã đọc, đánh dấu tất cả.

## 3. Dữ liệu test

| Tài khoản | Email | Dữ liệu thông báo |
|---|---|---|
| SV A | `student01@st.vju.ac.vn` | Id 1 chưa đọc, id 4 đã đọc |
| SV B | `quocanh@st.vju.ac.vn` | Id 2 và 5 chưa đọc (id 5 gắn đơn), id 6 đã đọc |
| SV C | `xuanhau@st.vju.ac.vn` | Id 3 chưa đọc |
| SV Paging | `minhanh@st.vju.ac.vn` | Id 101-125, tổng 25 thông báo, 20 chưa đọc |
| Chuyên viên | `hoangnam@vju.ac.vn` | Id 7 chưa đọc |
| Trưởng phòng | `tp.ctsv@vju.ac.vn` | Không có |
| Admin | `admin@vju.ac.vn` | Không có |
| Tài khoản khóa | `suspended@st.vju.ac.vn` | Không có, `account_status = locked` |

| type_id | Thủ tục | Phòng ban | Ghi chú |
|---|---|---|---|
| 1 | Giấy xác nhận sinh viên | PCTSV | 11 trường form, 1 đính kèm |
| 2 | Giấy giới thiệu thực tập | PCTSV | Đính kèm cố ý lệch thứ tự |
| 3 | Phúc khảo điểm thi | PĐT | Phí 50.000, không đính kèm |
| 4 | Bảo lưu kết quả học tập | PĐT | Trường form cố ý lệch thứ tự |
| 5 | Miễn giảm học phí | PCTSV | 4 đính kèm |
| 6 | Hoàn trả học phí | PKHTC | Không có trường form. `fee_amount = 100` nhưng không thu phí |
| 7 | Thủ tục đã ẩn | PĐT | `is_active = false` |
| 8 | Thủ tục của phòng ngừng hoạt động | Phòng test | Phòng ban có `is_active = false` |

Token được tạo sẵn cho từng tài khoản và có hạn 24 giờ. Kịch bản không đăng nhập qua `/auth/google`, nên vẫn chạy được sau khi API đó được sửa.

## 4. Các ca test

### 4.1 Danh sách thủ tục

| Mã | Trường hợp | Request | Tài khoản | Kết quả mong đợi | Nguồn | Hiện tại |
|---|---|---|---|---|---|---|
| TC-1.1 | Lấy toàn bộ thủ tục | `GET /procedures` | SV A (student01) | 3 nhóm (PB 1: 1,2,5; PB 2: 3,4; PB 3: 6). Không có type_id 7, 8. Chỉ type 3 có phí 50000, còn lại `fee_amount = null` | §2.1 | Đạt |
| TC-1.2 | Lọc theo phòng ban | `GET /procedures?department_id=2` | SV A (student01) | Chỉ 1 nhóm PB 2, gồm type_id 3, 4 | §2.1 | Đạt |
| TC-1.3 | department_id không tồn tại | `GET /procedures?department_id=999` | SV A (student01) | `data = []` | Spec | Đạt |
| TC-1.5 | Phòng ban đã ngừng hoạt động | `GET /procedures?department_id={{inactiveDeptId}}` | SV A (student01) | `data = []` | §2.1 | Đạt |
| TC-1.6a | department_id sai kiểu (abc) | `GET /procedures?department_id=abc` | SV A (student01) | 400, sai kiểu `int` | §2.1, mã 400 | Đạt |
| TC-1.6b | department_id sai kiểu (1.5) | `GET /procedures?department_id=1.5` | SV A (student01) | 400, sai kiểu `int` | §2.1, mã 400 | Đạt |
| TC-1.7a | Cán bộ gọi API chỉ dành cho SV (staff) | `GET /procedures` | Chuyên viên (hoangnam) | 403 | Bảng Actor dòng 1649 | Đạt |
| TC-1.7b | Cán bộ gọi API chỉ dành cho SV (head) | `GET /procedures` | Trưởng phòng (tp.ctsv) | 403 | Bảng Actor dòng 1649 | Đạt |
| TC-1.7c | Cán bộ gọi API chỉ dành cho SV (admin) | `GET /procedures` | Admin | 403 | Bảng Actor dòng 1649 | Đạt |
| TC-1.8 | Sai method | `POST /procedures` | SV A (student01) | 405 | HTTP | Đạt |

### 4.2 Chi tiết thủ tục

| Mã | Trường hợp | Request | Tài khoản | Kết quả mong đợi | Nguồn | Hiện tại |
|---|---|---|---|---|---|---|
| TC-2.1 | Chi tiết Giấy xác nhận SV | `GET /procedures/1` | SV A (student01) | 11 `form_fields` (101-111) theo `display_order`; 107 là dropdown 5 giá trị; 108 là radio 3 giá trị; 1 đính kèm "CCCD 2 mặt" | §2.2 | Đạt |
| TC-2.2 | Thủ tục nhiều đính kèm | `GET /procedures/5` | SV A (student01) | Đính kèm 5, 6, 7 bắt buộc; 8 không bắt buộc | §2.2 | Đạt |
| TC-2.3 | Thủ tục có lệ phí | `GET /procedures/3` | SV A (student01) | `fee_amount = 50000`, 2 cấp duyệt, field 305 tự điền điểm, `attachment_configs = []` | §2.2 | Đạt |
| TC-2.4 | Không tồn tại | `GET /procedures/999` | SV A (student01) | 404 `NOT_FOUND` | Spec | Đạt |
| TC-2.5 | Thủ tục bị ẩn | `GET /procedures/7` | SV A (student01) | 404 `PROCEDURE_INACTIVE`, không trả `form_fields` | Spec | Đạt |
| TC-2.6 | Thủ tục của phòng ngừng hoạt động | `GET /procedures/8` | SV A (student01) | 404 `PROCEDURE_INACTIVE` | Spec | Đạt |
| TC-2.7 | Sắp xếp form_fields theo display_order | `GET /procedures/4` | SV A (student01) | Thứ tự 403, 401, 402 (không theo `field_id`) | §2.2 | Đạt |
| TC-2.8 | Sắp xếp attachment_configs | `GET /procedures/2` | SV A (student01) | Thứ tự 4, 3 | §2.2 | Đạt |
| TC-2.9 | Không có field và đính kèm | `GET /procedures/6` | SV A (student01) | Hai mảng rỗng; `fee_amount = null` | §2.2 | Đạt |
| TC-2.10 | type_id không phải số | `GET /procedures/abc` | SV A (student01) | 404, body JSON đúng format lỗi chung | Quy ước chung | Đạt |
| TC-2.11 | Cán bộ gọi API chỉ dành cho SV | `GET /procedures/1` | Chuyên viên (hoangnam) | 403 | Bảng Actor dòng 1650 | Đạt |

### 4.3 Danh sách thông báo

| Mã | Trường hợp | Request | Tài khoản | Kết quả mong đợi | Nguồn | Hiện tại |
|---|---|---|---|---|---|---|
| TC-3.1 | SV A có 2 thông báo | `GET /notifications` | SV A (student01) | Thứ tự 4, 1; `unread_count = 1`; `request_id = null` | §8.1 | Đạt |
| TC-3.2 | Lọc chưa đọc | `GET /notifications?is_read=false` | SV A (student01) | Chỉ id 1 | §8.1 | Đạt |
| TC-3.3 | Lọc đã đọc | `GET /notifications?is_read=true` | SV A (student01) | Chỉ id 4; `unread_count` vẫn bằng 1 | §8.1 | Đạt |
| TC-3.4 | SV chỉ có 1 thông báo | `GET /notifications` | SV C (xuanhau) | Chỉ id 3 | §8.1 | Đạt |
| TC-3.5 | Không có thông báo | `GET /notifications` | Trưởng phòng (tp.ctsv) | `data = []`, `unread_count = 0` | §8.1 | Đạt |
| TC-3.7 | Thông báo gắn với đơn | `GET /notifications` | SV B (quocanh) | Id 5 có `request_code = REQ-20261030-001`; id 2 là `null` | §8.1 | Đạt |
| TC-3.8 | Cán bộ cũng xem được | `GET /notifications` | Chuyên viên (hoangnam) | Chỉ id 7 | Bảng Actor | Đạt |
| TC-3.9 | sent_at đúng giờ Việt Nam | `GET /notifications` | SV A (student01) | Id 4 có `sent_at = 2026-10-30T09:00:00` | §8.1, Spec 3.1 | Đạt |
| TC-3.10 | Mặc định page 1, limit 20 | `GET /notifications` | SV Paging (minhanh) | 20 bản ghi, `pagination = {page:1, limit:20, total:25, total_pages:2}` | §8.1, Quy ước chung | Đạt |
| TC-3.11 | Trang 2 | `GET /notifications?page=2` | SV Paging (minhanh) | 5 bản ghi: 105 đến 101 | §8.1 | Đạt |
| TC-3.12 | limit tùy chọn | `GET /notifications?page=3&limit=10` | SV Paging (minhanh) | 5 bản ghi, `total_pages = 3` | §8.1 | Đạt |
| TC-3.13 | Trang vượt quá | `GET /notifications?page=99` | SV Paging (minhanh) | `data = []`, vẫn có `pagination` | §8.1 | Đạt |
| TC-3.14 | Phân trang kết hợp lọc | `GET /notifications?is_read=false&limit=5` | SV Paging (minhanh) | 5 bản ghi, `pagination.total = 20` | §8.1 | Đạt |
| TC-3.15a | Tham số sai (is_read=abc) | `GET /notifications?is_read=abc` | SV A (student01) | 400, `is_read` không phải boolean | §8.1, mã 400 | Đạt |
| TC-3.15b | Tham số sai (page=abc) | `GET /notifications?page=abc` | SV A (student01) | 400, `page` không phải số | §8.1, mã 400 | Đạt |
| TC-3.15c | Tham số sai (page=0) | `GET /notifications?page=0` | SV A (student01) | 400, `page` nhỏ hơn 1 | §8.1, mã 400 | Đạt |
| TC-3.15d | Tham số sai (limit=abc) | `GET /notifications?limit=abc` | SV A (student01) | 400, `limit` không phải số | §8.1, mã 400 | Đạt |
| TC-3.15e | Tham số sai (limit=0) | `GET /notifications?limit=0` | SV A (student01) | 400, `limit` nhỏ hơn 1 | §8.1, mã 400 | Đạt |

### 4.4 Xác thực

Mỗi cách gọi dưới đây được chạy trên cả 5 API, tổng cộng 35 ca. Tất cả phải trả 401 `UNAUTHORIZED` với message "Chưa đăng nhập.". Mã ca có dạng `TC-AUTH-<API><hậu tố>`, với API là P1, P2, N3, N4, N5. Kết quả hiện tại: **35/35 đạt**.

| Hậu tố | Cách gọi | Token trong environment |
|---|---|---|
| a | Không có header | Không gửi header |
| b | Token rác | `token_garbage` |
| c | Token hết hạn | `token_expired` |
| d | Token bị sửa chữ ký | `token_tampered` |
| e | User không còn tồn tại | `token_deletedUser` |
| f | Tài khoản bị khóa | `token_locked` |
| g | Thiếu tiền tố Bearer | `token_studentA`, gửi không có chữ Bearer |

### 4.5 Đánh dấu đã đọc

| Mã | Trường hợp | Request | Tài khoản | Kết quả mong đợi | Nguồn | Hiện tại |
|---|---|---|---|---|---|---|
| TC-4.1 | Đánh dấu đã đọc | `PUT /notifications/1/read` | SV A (student01) | 200, "Đã đánh dấu đọc." | §8.2 | Đạt |
| TC-4.1b | Kiểm tra sau khi đánh dấu | `GET /notifications` | SV A (student01) | Id 1 có `is_read = true`, `read_at` là giờ hiện tại, `unread_count = 0` | Spec 4.1 | Đạt |
| TC-4.2 | Thông báo của người khác | `PUT /notifications/2/read` | SV A (student01) | 403 `FORBIDDEN` | Spec | Đạt |
| TC-4.2b | Thông báo của người khác không đổi | `GET /notifications` | SV B (quocanh) | Id 2 vẫn `is_read = false` | Spec | Đạt |
| TC-4.3 | Không tồn tại | `PUT /notifications/999/read` | SV A (student01) | 404 `NOT_FOUND` | Spec | Đạt |
| TC-4.4 | Đánh dấu lại thông báo đã đọc | `PUT /notifications/4/read` | SV A (student01) | 200 | Spec | Đạt |
| TC-4.4b | read_at giữ nguyên | `GET /notifications` | SV A (student01) | `read_at` giữ nguyên (phút :15), `unread_count` không đổi | Spec | Đạt |
| TC-4.5 | id không phải số | `PUT /notifications/abc/read` | SV A (student01) | 404, body JSON đúng format lỗi chung | Quy ước chung | Đạt |
| TC-4.6 | Sai method | `GET /notifications/1/read` | SV A (student01) | 405 | HTTP | Đạt |

### 4.6 Đánh dấu tất cả đã đọc

| Mã | Trường hợp | Request | Tài khoản | Kết quả mong đợi | Nguồn | Hiện tại |
|---|---|---|---|---|---|---|
| TC-5.1 | Đánh dấu tất cả | `PUT /notifications/read-all` | SV B (quocanh) | 200, "Đã đánh dấu tất cả đã đọc." | §8.3 | Đạt |
| TC-5.1b | Kiểm tra sau read-all | `GET /notifications` | SV B (quocanh) | `unread_count = 0`; id 6 giữ `read_at` cũ | Spec 5.1 | Đạt |
| TC-5.1c | Người khác không bị ảnh hưởng | `GET /notifications` | SV C (xuanhau) | SV C vẫn `unread_count = 1` | Spec 5.1 | Đạt |
| TC-5.2 | Không có thông báo nào | `PUT /notifications/read-all` | Trưởng phòng (tp.ctsv) | 200 | Spec | Đạt |
| TC-5.3 | Sai method | `GET /notifications/read-all` | SV A (student01) | 405 | HTTP | Đạt |

## 5. Các ca đang không đạt

Lần chạy gần nhất không còn ca nào không đạt.

## 6. Điểm khác so với expected-results-module0.md

| Nội dung | Thay đổi |
|---|---|
| Cổng | Giữ `8080` theo contract, đổi trong biến `baseUrl` nếu cần |
| Test 1.4 và 3.6 | Gộp vào ma trận xác thực: `TC-AUTH-P1a`, `TC-AUTH-N3a` |
| `user_id` | Dùng tài khoản theo email, vì `user_id` 2, 3, 10 trong database không khớp vai trò ghi trong Spec |
| Test 5.1 | Đổi sang SV B, vì SV A đã hết thông báo chưa đọc sau TC-4.1 |
| Test 2.1 mục 7 | Không kiểm tra "chỉ hiện khi chọn NVQS": API không có dữ liệu điều kiện, nên chuyển sang test giao diện |
| `search`, `q` | Chưa có ca test, vì không có trong Spec. Contract đã bổ sung, kiểm tra bằng test tự động và thủ công |
| Lệ phí bằng 0 khi `is_fee_required = true` | Không đưa vào, vì contract chưa quy định |

## 7. Các điểm đã chốt trong contract

1. **Quyền xem thủ tục:** chỉ dành cho sinh viên, vai trò khác nhận 403.
2. **Thời gian:** trả về theo giờ Việt Nam.
3. **Bổ sung:** `read_at`, `department_name`, `search`, `q`, `INVALID_PARAM`, `limit` tối đa 100.
