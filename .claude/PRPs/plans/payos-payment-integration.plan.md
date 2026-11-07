# Plan: Tích hợp Cổng thanh toán thật PayOS (Module 3 & Thủ tục có phí)

## Summary
Kế hoạch chi tiết từng bước tích hợp cổng thanh toán trực tuyến thật qua **PayOS** cho hệ thống VJU One-Stop Portal. Chức năng phục vụ **Module 3: Phúc khảo điểm thi (2 cấp + thanh toán)** và các thủ tục có thu lệ phí (`is_fee_required = True`), cho phép sinh viên quét mã VietQR ngân hàng hoặc thanh toán qua trang checkout PayOS, hệ thống tự động nhận kết quả qua Webhook/Polling để kích hoạt quy trình thẩm định hồ sơ và tính SLA.

## User Story
Là một **Sinh viên**,
Tôi muốn **thanh toán lệ phí thủ tục trực tuyến bằng cách quét mã VietQR hoặc qua cổng PayOS**,
Để **hồ sơ của tôi được xác nhận đã đóng tiền tự động, chuyển ngay sang cán bộ xử lý mà không cần đến nộp tiền mặt tại phòng KHTC**.

Là một **Trưởng phòng / Chuyên viên**,
Tôi muốn **hệ thống chỉ tiếp nhận và phân công các hồ sơ đã hoàn tất thanh toán lệ phí hợp lệ**,
Để **đảm bảo quy trình tài chính minh bạch, đúng quy chế của nhà trường**.

## Problem → Solution
- **Hiện trạng:**
  - Frontend chỉ có giao diện Step 2 mô phỏng tĩnh, bấm "Thanh toán ngay" chỉ chuyển sang trang thông báo với ghi chú *"Cổng thanh toán trực tuyến chưa được tích hợp"*.
  - Backend tạo đơn với trạng thái `Chờ thanh toán` nhưng chưa có API tạo giao dịch thanh toán (`POST /api/requests/:id/payments`), chưa có API kiểm tra trạng thái (`GET /api/requests/:id/payments`) và chưa có Webhook nhận tiền từ cổng thanh toán.
- **Giải pháp:**
  - Tích hợp PayOS SDK chính thức (`payos==1.1.0`), sử dụng bộ khóa API do người dùng cung cấp.
  - Xây dựng luồng thanh toán VietQR thật: Backend sinh link thanh toán PayOS + QR code VietQR chuẩn NAPAS 24/7.
  - Xây dựng Webhook nhận tín hiệu thanh toán từ PayOS, xác thực chữ ký HMAC SHA-256 (`PAYOS_CHECKSUM_KEY`).
  - Hỗ trợ cơ chế kiểm tra chủ động (Sync-on-GET & Polling) tại frontend để quá trình test ở môi trường Localhost (chưa mở port public) vẫn hoạt động 100% trơn tru và tự động cập nhật trạng thái đơn sang `Chờ phân công`.

## Metadata
- **Complexity**: Medium-Large
- **Source PRD**: [`docs/expected-results-all-modules.md`](file:///D:/VJU_EF/vju-portal-admin/docs/expected-results-all-modules.md) (Module 3) & [`api-contract.md`](file:///D:/VJU_EF/vju-portal-admin/api-contract.md) (Mục 4: Payment)
- **PRD Phase**: Module 3 — Phúc khảo điểm thi (2 cấp + thanh toán)
- **Estimated Files**: 8 files (Backend: 5, Frontend: 3)

---

## UX Design

### Before (Hiện tại)
```
┌────────────────────────────────────────────────────────┐
│  Thủ tục có phí (Phúc khảo điểm thi - 50.000 VNĐ)      │
│  Step 1: Điền thông tin -> Bấm Gửi & Thanh toán        │
│  Step 2: Giao diện tĩnh (3 Tab Thẻ / Chuyển khoản / Ví)│
│  Bấm "Thanh toán ngay" -> Đơn tạo "Chờ thanh toán"     │
│  [!] Thông báo: Cổng thanh toán chưa được tích hợp     │
└────────────────────────────────────────────────────────┘
```

### After (Sau khi tích hợp PayOS)
```
┌──────────────────────────────────────────────────────────────────────────┐
│  Step 2: Thanh toán lệ phí qua PayOS (VietQR)                            │
│  ┌──────────────────────────────┐  ┌───────────────────────────────────┐ │
│  │ Thông tin đơn hàng           │  │ Quét mã VietQR để thanh toán      │ │
│  │ • Mã đơn: REQ-20261106-001   │  │   [ █ █ █ █ █ █ █ █ █ █ █ █ ]     │ │
│  │ • Thủ tục: Phúc khảo điểm thi│  │   [ █   MÃ VIETQR THẬT  █ █ ]     │ │
│  │ • Số tiền: 50.000 VNĐ        │  │   [ █ █ █ █ █ █ █ █ █ █ █ █ ]     │ │
│  │ • Hạn thanh toán: 24 giờ     │  │ Mở App ngân hàng bất kỳ để quét   │ │
│  └──────────────────────────────┘  │ Hoặc [Mở trang thanh toán PayOS →]│ │
│                                    └───────────────────────────────────┘ │
│  (Hệ thống tự động lắng nghe Webhook & Polling mỗi 2s)                   │
│  >>> Khi tiền vào -> Tự động chuyển trang Thành công (RequestSuccess)   │
└──────────────────────────────────────────────────────────────────────────┘
```

### Interaction Changes
| Điểm chạm | Hiện tại | Sau khi triển khai | Ghi chú |
|---|---|---|---|
| Step 1 (Nộp đơn) | Bấm gửi tạo đơn | Tạo đơn trạng thái `Chờ thanh toán`, lưu `payment_deadline` = 24h, tự động gọi API khởi tạo PayOS Payment Link | SLA chưa tính |
| Step 2 (Thanh toán) | Form thẻ giả lập + QR giả | Hiển thị VietQR thật sinh từ PayOS, thông tin tài khoản, nội dung CK, nút mở Checkout PayOS | Có countdown & Polling |
| Sau khi chuyển khoản | Phải tự bấm tiếp và nhận thông báo chưa tích hợp | Webhook cập nhật `Payment` -> `completed`, đơn -> `Chờ phân công`. Polling phát hiện và tự động điều hướng sang `RequestSuccess` | Không cần thao tác thủ công |
| Màn hình chi tiết đơn | Không có nút thanh toán nếu đơn đang chờ | Với đơn `Chờ thanh toán`, hiển thị nút "Thanh toán ngay" để sinh lại link/QR nếu chưa hết hạn | Phục vụ SV quay lại thanh toán sau |

---

## Mandatory Reading

| Mức độ | File | Dòng | Mục đích đọc |
|---|---|---|---|
| P0 (Bắt buộc) | `accounts/request_views.py` | 360-465 | Nắm cơ chế tạo đơn, gán `is_fee_required`, `Chờ thanh toán` và tính `sla_deadline` |
| P0 (Bắt buộc) | `api-contract.md` | 690-790 | Chuẩn hóa cấu trúc request/response cho `POST`, `GET` payment và `Webhook` |
| P1 (Quan trọng) | `accounts/models.py` | 244-290 | Cấu trúc bảng `Request` và `Payment` (`txn_id`, `amount`, `payment_url`, `status`) |
| P1 (Quan trọng) | `vju-portal-admin/src/components/student/RequestForm.js` | 215-485 | Giao diện và state của Step 2 (Thanh toán lệ phí) |
| P2 (Tham khảo) | `vju-portal-admin/src/services/api.js` | 499-520 | Cấu hình `paymentApi` và `apiFetch` |

## External Documentation (PayOS)

| Chủ đề | Nguồn tài liệu | Điểm then chốt cần áp dụng |
|---|---|---|
| PayOS Python SDK | `payos==1.1.0` (GitHub / PyPI) | `PayOS(client_id, api_key, checksum_key)`<br/>Khởi tạo link: `client.payment_requests.create(CreatePaymentLinkRequest(...))` hoặc `client.createPaymentLink(...)`<br/>Verify Webhook: `client.verifyPaymentWebhookData(body)` |
| PayOS Order Code | Tài liệu tích hợp PayOS | `orderCode` bắt buộc là số nguyên dương duy nhất (`int`), không trùng lặp, tối đa 9.007.199.254.740.991 |
| PayOS Webhook | PayOS Webhook Guide | PayOS gửi POST JSON với cấu trúc `{ code, desc, data: {...}, signature }`. Cần HMAC SHA-256 kiểm tra tính toàn vẹn |
| Localhost Testing Gotcha | Kinh nghiệm tích hợp | Webhook PayOS không thể bắn trực tiếp vào `http://localhost:8000`. Cần hỗ trợ song song 2 cơ chế: (1) Endpoint Webhook thật cho Staging/Production/ngrok, (2) Cơ chế Polling Sync trạng thái trực tiếp từ PayOS API `getPaymentLinkInformation` khi chạy Localhost |

---

## Patterns to Mirror

### NAMING_CONVENTION
Backend (Python/Django):
```python
# SOURCE: accounts/request_views.py:192-200
def payment_create_view(request, request_id):
    ...
def payment_status_view(request, request_id):
    ...
@csrf_exempt
def payos_webhook_view(request):
    ...
```

Frontend (JavaScript/React):
```javascript
// SOURCE: vju-portal-admin/src/services/api.js:499-516
export const paymentApi = {
  createForRequest: (requestId, payload) => apiFetch(`/requests/${requestId}/payments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  getStatus: (requestId) => apiFetch(`/requests/${requestId}/payments`),
};
```

### ERROR_HANDLING
Backend chuẩn hóa theo format chung của dự án:
```python
# SOURCE: accounts/request_views.py:34-44
def _json_error(code, message, status=400, details=None):
    payload = {"code": code, "message": message}
    if details:
        payload["details"] = details
    return JsonResponse({"success": False, "error": payload}, status=status)
```

### AUDIT_LOG & NOTIFICATION PATTERN
```python
# SOURCE: accounts/request_views.py:410-435
StateAuditLog.objects.create(
    request=req,
    performed_by=student_user,
    action="payment_completed",
    note=f"Thanh toán lệ phí thành công qua PayOS (Mã GD: {payment.txn_id})",
    status_before="Chờ thanh toán",
    status_after="Chờ phân công",
)

Notification.objects.create(
    user=student_user,
    request=req,
    title="Thanh toán thành công",
    message=f"Thanh toán lệ phí {int(payment.amount):,} VNĐ cho mã yêu cầu {req.request_code} đã hoàn tất.",
)
```

---

## Files to Change

| Đường dẫn file | Hành động | Mục đích |
|---|---|---|
| `.env` | CẬP NHẬT | Lưu 3 khóa PayOS (`PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`) |
| `core/settings.py` | CẬP NHẬT | Nạp các cấu hình PayOS từ biến môi trường |
| `requirements.txt` | CẬP NHẬT | Bổ sung package `payos==1.1.0` |
| `accounts/payment_service.py` | TẠO MỚI | Service đóng gói gọi PayOS SDK: tạo link thanh toán, verify webhook, sync thông tin từ PayOS |
| `accounts/payment_views.py` | TẠO MỚI | Các views: `payment_create_view`, `payment_status_view`, `payos_webhook_view` |
| `accounts/urls.py` | CẬP NHẬT | Khai báo các đường dẫn `/api/requests/<id>/payments` và `/api/webhooks/payos` |
| `vju-portal-admin/src/services/api.js` | CẬP NHẬT | Khai báo các hàm gọi API thanh toán thật |
| `vju-portal-admin/src/components/student/RequestForm.js` | CẬP NHẬT | Thay thế Step 2 tĩnh bằng giao diện VietQR PayOS động + Polling trạng thái |
| `vju-portal-admin/src/components/student/RequestDetail.js` | CẬP NHẬT | Bổ sung nút thanh toán cho các đơn đang ở trạng thái `Chờ thanh toán` |
| `accounts/tests_payment.py` | TẠO MỚI | Bộ test tự động kiểm thử toàn diện luồng thanh toán |

## NOT Building (Ngoài phạm vi)
- Tự động hoàn tiền vào tài khoản ngân hàng của sinh viên khi đơn bị từ chối (PayOS không hỗ trợ hoàn tiền tự động qua VietQR tài khoản cá nhân; hệ thống sẽ cập nhật `refund_status="pending"` để phòng KHTC xử lý thủ công theo BR-31).
- Tích hợp cổng thanh toán khác (MoMo, ZaloPay, VNPay Sandbox) — chỉ tập trung 100% cổng thanh toán thật PayOS (VietQR ngân hàng 24/7).
- Module 4 (Bảo lưu KQHT - SmartCA) hoặc Module 5-7.

---

## Step-by-Step Tasks

### Task 1: Chuẩn bị Git Branch & Đồng bộ mã nguồn
- **ACTION**: Xóa diff dòng trắng thừa ở local và checkout nhánh mới `feature/fe-be-integration-payment` dựa trên nhánh `origin/feature/fe-be-integration-module1`.
- **COMMAND**:
  ```bash
  git checkout -- .
  git checkout -b feature/fe-be-integration-payment origin/feature/fe-be-integration-module1
  ```
- **VALIDATE**: `git status` sạch, nhánh xuất phát từ commit mới nhất của `origin/feature/fe-be-integration-module1`.

### Task 2: Cấu hình Biến môi trường PayOS
- **ACTION**: Ghi các biến môi trường vào `.env` của backend (sử dụng thông tin người dùng đã cung cấp) và cập nhật `core/settings.py`.
- **IMPLEMENT**:
  - Trong `.env`:
    ```env
    PAYOS_CLIENT_ID=6eeb8915-b732-4f0c-afd4-cc9bb8da8143
    PAYOS_API_KEY=9a8a30a3-f661-4df2-80ce-ea9f86c13b50
    PAYOS_CHECKSUM_KEY=329ca198dc80218408a3c2eb17ecc0facfe53ff99590ced9ab701a3f3ed8fd45
    PAYOS_RETURN_URL=http://localhost:3000/student/requests
    PAYOS_CANCEL_URL=http://localhost:3000/student/requests
    ```
  - Trong `core/settings.py`:
    ```python
    PAYOS_CLIENT_ID = os.getenv("PAYOS_CLIENT_ID", "")
    PAYOS_API_KEY = os.getenv("PAYOS_API_KEY", "")
    PAYOS_CHECKSUM_KEY = os.getenv("PAYOS_CHECKSUM_KEY", "")
    PAYOS_RETURN_URL = os.getenv("PAYOS_RETURN_URL", "http://localhost:3000/student/requests")
    PAYOS_CANCEL_URL = os.getenv("PAYOS_CANCEL_URL", "http://localhost:3000/student/requests")
    ```
  - Cập nhật `.env.example` và `requirements.txt` (thêm `payos==1.1.0`).
- **VALIDATE**: Chạy python console nạp được các biến từ settings.

### Task 3: Xây dựng Payment Service (`accounts/payment_service.py`)
- **ACTION**: Tạo service đóng gói toàn bộ tương tác với PayOS SDK và các logic nghiệp vụ thanh toán.
- **IMPLEMENT**:
  - Hàm `get_payos_client()`: Khởi tạo instance `PayOS`.
  - Hàm `generate_order_code(request_obj)`: Sinh số nguyên duy nhất cho PayOS (ví dụ `int(f"{request_obj.request_id}{int(time.time()) % 10000:04d}")`).
  - Hàm `create_payment_link(request_obj, return_url=None, cancel_url=None)`:
    - Kiểm tra số lần thất bại (BR-29: nếu `retry_count >= 3` báo lỗi `PAYMENT_LOCKED`).
    - Gọi PayOS tạo Payment Link với tiêu đề ngắn gọn (VD: `Thanh toan REQ-xxx`).
    - Lưu / Cập nhật bản ghi `Payment` với `status="pending"`, `txn_id=order_code`, `payment_url=checkoutUrl`, `callback_data={'qr_code': qrCode}`.
    - Trả về thông tin link thanh toán & mã VietQR.
  - Hàm `process_payment_success(payment_obj, webhook_data)`:
    - Chuyển `Payment.status = "completed"`, `completed_at = now()`, `signature_verified = True`.
    - Chuyển `Request.status = "Đã gửi"`, `Request.internal_status = "Chờ phân công"`.
    - Tính `sla_deadline = calculate_sla_deadline(now(), req.procedure_type.sla_total_days)`.
    - Ghi `StateAuditLog` và tạo `Notification` cho Sinh viên và Trưởng phòng ban.
  - Hàm `verify_and_process_webhook(payload)`:
    - Dùng `payos_client.verifyPaymentWebhookData(payload)` để kiểm tra chữ ký HMAC SHA-256.
    - Tìm `Payment` theo `txn_id == payload['data']['orderCode']`.
    - Xử lý thành công hoặc thất bại tương ứng.
  - Hàm `sync_payment_status_from_payos(payment_obj)`:
    - Dùng `payos_client.getPaymentLinkInformation(payment_obj.txn_id)`.
    - Nếu PayOS báo `status == "PAID"`, tự động gọi `process_payment_success`.
- **GOTCHA**: PayOS giới hạn trường `description` tối đa 25 ký tự không dấu và không chứa ký tự đặc biệt (`Thanh toan REQ-123456`). Cần format chuỗi cẩn thận.
- **VALIDATE**: Viết script test đơn giản tạo thử link thanh toán với PayOS thật.

### Task 4: Xây dựng API Views & Endpoints (`accounts/payment_views.py` & `accounts/urls.py`)
- **ACTION**: Xây dựng 3 endpoint chuẩn theo `api-contract.md`:
  1. `POST /api/requests/<int:request_id>/payments`:
     - Yêu cầu xác thực JWT (chỉ chủ đơn `request.user == user` mới được gọi).
     - Kiểm tra trạng thái đơn: Phải là `Chờ thanh toán`.
     - Gọi `create_payment_link`.
     - Trả về `payment_id`, `txn_id`, `amount`, `payment_url`, `qr_code`, `expires_at`.
  2. `GET /api/requests/<int:request_id>/payments`:
     - Lấy trạng thái thanh toán hiện tại của đơn.
     - Tự động gọi `sync_payment_status_from_payos` nếu trạng thái đang là `pending` để cập nhật tức thì trạng thái thực từ PayOS (đặc biệt hữu ích khi chạy Localhost).
     - Trả về JSON theo đúng định dạng `API 3.4` trong `api-contract.md`.
  3. `POST /api/webhooks/payos`:
     - `@csrf_exempt`, không yêu cầu Bearer token.
     - Nhận payload từ PayOS, gọi `verify_and_process_webhook`.
     - Trả về `{"success": True}` cho PayOS.
- **VALIDATE**: Đăng ký URLs vào `accounts/urls.py`, test gọi GET và POST bằng Postman / curl.

### Task 5: Viết Bộ Test Backend (`accounts/tests_payment.py`)
- **ACTION**: Viết bộ test tự động kiểm thử toàn bộ các tình huống:
  - Test 1: Tạo giao dịch thanh toán thành công trả về `payment_url` và `txn_id`.
  - Test 2: Tạo giao dịch khi đơn không ở trạng thái "Chờ thanh toán" -> Trả 422 `INVALID_STATE`.
  - Test 3: Quá 3 lần thanh toán thất bại -> Trả 422 `PAYMENT_LOCKED` (BR-29).
  - Test 4: Webhook gửi chữ ký giả mạo -> Trả 400 và không cập nhật trạng thái đơn (BR-32).
  - Test 5: Webhook thanh toán thành công -> Đơn chuyển sang "Chờ phân công", SLA được tính, có thông báo và audit log.
  - Test 6: Sinh viên khác không thể xem hoặc tạo thanh toán cho đơn của người khác -> 403 `FORBIDDEN`.
- **VALIDATE**: Chạy `python manage.py test accounts.tests_payment` đạt 100% PASS.

### Task 6: Cập nhật API Client Frontend (`vju-portal-admin/src/services/api.js`)
- **ACTION**: Cập nhật `paymentApi`:
  ```javascript
  export const paymentApi = {
    createForRequest: (requestId, method = 'payos') =>
      apiFetch(`/requests/${requestId}/payments`, {
        method: 'POST',
        body: JSON.stringify({ payment_method: method }),
      }),
    getStatus: (requestId) =>
      apiFetch(`/requests/${requestId}/payments`),
  };
  ```
- **VALIDATE**: Frontend gọi API không bị lỗi syntax.

### Task 7: Hoàn thiện Giao diện Step 2 Thanh toán (`RequestForm.js`)
- **ACTION**:
  - Khi nộp form Step 1 thành công cho thủ tục có phí (`is_fee_required = True`), lưu `createdRequest` và tự động gọi `api.payments.createForRequest(createdRequest.request_id)` để lấy link thanh toán và mã QR VietQR từ PayOS.
  - Tại giao diện Step 2:
    - Hiển thị thông tin thanh toán: Số tiền (`50.000 VNĐ`), Mã yêu cầu, Hạn thanh toán (24h).
    - Hiển thị trực tiếp mã VietQR sinh từ PayOS (render qua component QR code hoặc thẻ `img` với URL QR của PayOS / VietQR).
    - Cung cấp nút:
      - **"Mở trang thanh toán PayOS →"**: Mở trang thanh toán chuẩn của PayOS ở tab mới hoặc chuyển hướng.
      - **"Tôi đã chuyển khoản"**: Chủ động kích hoạt kiểm tra ngay lập tức.
    - **Cơ chế Polling tự động**: Sử dụng `useEffect` gọi `api.payments.getStatus(createdRequest.request_id)` mỗi 3 giây.
    - Ngay khi nhận được `status === 'completed'`, hiển thị icon checkmark xanh thành công trong 1 giây và tự động chuyển sang trang `RequestSuccess.js`.
- **VALIDATE**: Thao tác nộp đơn trên trình duyệt, mã VietQR hiển thị rõ ràng, quét được bằng app ngân hàng.

### Task 8: Bổ sung Luồng Thanh toán tại Màn hình Chi tiết Đơn (`RequestDetail.js`)
- **ACTION**:
  - Nếu sinh viên xem đơn đang ở trạng thái `Chờ thanh toán`, hiển thị thanh thông báo màu cam cảnh báo *"Đơn đang chờ thanh toán lệ phí để được xử lý"*.
  - Bổ sung nút **"Thanh toán ngay"** mở Modal / Popup thanh toán VietQR PayOS hoặc dẫn về luồng thanh toán để sinh viên có thể hoàn tất thanh toán bất kỳ lúc nào trong vòng 24 giờ.
- **VALIDATE**: Vào xem chi tiết một đơn đang "Chờ thanh toán", bấm nút "Thanh toán ngay" hiển thị đầy đủ QR PayOS.

---

## Testing Strategy

### Unit & Integration Tests

| Test Case | Đầu vào | Kết quả mong đợi |
|---|---|---|
| Tạo thanh toán PayOS | `POST /api/requests/:id/payments` với token SV | HTTP 201, trả về `payment_url` hợp lệ của PayOS và bản ghi `Payment` status `pending` |
| Bảo vệ quyền sở hữu | `POST /api/requests/:id/payments` với token SV khác | HTTP 403 `FORBIDDEN` |
| Sai trạng thái | `POST /api/requests/:id/payments` khi đơn đã duyệt | HTTP 422 `INVALID_STATE` |
| Khóa thanh toán sau 3 lần lỗi | Đơn có `retry_count >= 3` | HTTP 422 `PAYMENT_LOCKED` |
| Webhook sai chữ ký | POST webhook với signature rác | HTTP 400, không đổi trạng thái đơn |
| Webhook chuẩn PayOS | POST webhook hợp lệ `code="00"` | HTTP 200, đơn -> `Chờ phân công`, sinh SLA, tạo notification |
| Polling đồng bộ trực tiếp | `GET /api/requests/:id/payments` | HTTP 200, tự động sync từ PayOS và cập nhật đơn nếu đã thanh toán |

---

## Validation Commands

### 1. Backend Unit Tests
```bash
d:\VJU_EF\vju-portal-admin\venv\Scripts\python manage.py test accounts.tests_payment
```
*Kỳ vọng:* Toàn bộ test thanh toán pass 100%.

### 2. Kiểm tra Seed Data & Chạy Server
```bash
d:\VJU_EF\vju-portal-admin\venv\Scripts\python manage.py migrate
d:\VJU_EF\vju-portal-admin\venv\Scripts\python manage.py seed_module0
d:\VJU_EF\vju-portal-admin\venv\Scripts\python manage.py runserver 8000
```

### 3. Khởi động Frontend
```bash
cd d:\VJU_EF\vju-portal-admin\vju-portal-admin
npm start
```

### 4. Kiểm thử thực tế (Manual E2E Testing)
- [ ] 1. Đăng nhập tài khoản Sinh viên (`minhanh@st.vju.ac.vn`).
- [ ] 2. Chọn thủ tục **Phúc khảo điểm thi** (ID 3 - Lệ phí: 50.000 VNĐ).
- [ ] 3. Điền thông tin và bấm "Gửi và thanh toán".
- [ ] 4. Màn hình Step 2 hiển thị mã VietQR thật từ PayOS.
- [ ] 5. Mở App ngân hàng quét thử VietQR hoặc bấm "Mở trang thanh toán PayOS".
- [ ] 6. Tiến hành thanh toán (hoặc dùng tài khoản test của PayOS).
- [ ] 7. Màn hình tự động nhận diện thanh toán thành công và chuyển sang trang Success.
- [ ] 8. Kiểm tra trạng thái đơn: Chuyển sang `Chờ phân công`, Trưởng phòng nhận thông báo có đơn mới.

---

## Risks & Mitigation

| Rủi ro | Mức độ | Biện pháp xử lý |
|---|---|---|
| **Localhost không nhận được Webhook từ PayOS** | Cao | Bổ sung cơ chế **Sync-on-GET**: Trong API `GET /api/requests/:id/payments`, backend tự động gọi `payos.getPaymentLinkInformation` để đồng bộ trạng thái thực từ PayOS nếu webhook chưa tới. Như vậy dev ở localhost vẫn test hoàn hảo mà không cần setup ngrok. |
| **Trùng lặp orderCode PayOS** | Trung bình | Thuật toán sinh `orderCode` kết hợp `request_id` và timestamp modulo (`int(f"{req.request_id}{int(time.time()) % 10000:04d}")`) đảm bảo số nguyên luôn duy nhất. |
| **Mô tả đơn hàng PayOS vượt quá 25 ký tự** | Trung bình | Giới hạn chuỗi description nghiêm ngặt: `f"REQ{req.request_id} VJU"` (luôn < 15 ký tự, không dấu). |

