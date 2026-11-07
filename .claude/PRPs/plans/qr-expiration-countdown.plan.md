# Plan: Thời gian hiệu lực mã QR và đếm ngược phiên thanh toán PayOS (QR Expiration & Countdown)

## Summary
Bổ sung cơ chế quản lý thời gian hiệu lực cho mã VietQR thanh toán PayOS:
1. Phía Backend tích hợp trường `expired_at` (15 phút) vào PayOS API, tự động quản lý vòng đời phiên QR, cho phép làm mới mã khi hết hạn (tuân thủ giới hạn 3 lần thử theo BR-29 và hạn chót 24h theo BR-28).
2. Phía Frontend thay thế dòng trạng thái tĩnh bằng đồng hồ đếm ngược thời gian thực (`mm:ss`), đổi màu cảnh báo khi sắp hết hạn, hiển thị lớp phủ mờ (overlay) thông báo "Mã QR đã hết hạn" kèm nút "Làm mới mã QR" khi đồng hồ về `00:00`.

## User Story
Là một **Sinh viên**,
Tôi muốn **thấy rõ thời gian mã VietQR còn hiệu lực (đếm ngược từng giây) và có thể tạo lại mã mới nếu lỡ để quá hạn**,
Để **tôi kịp thời mở ứng dụng ngân hàng quét mã, không bị chuyển khoản nhầm vào một phiên giao dịch đã hết hạn, và chủ động làm mới mã khi cần**.

## Problem → Solution
- **Hiện trạng:** Dưới mã QR chỉ hiển thị dòng trạng thái tĩnh: `"● Đang chờ bạn quét mã thanh toán..."`. Sinh viên không biết mã này có hiệu lực trong bao lâu, khi nào hết hạn, và nếu để lâu thì mã bị treo hoặc giao dịch ngân hàng bị từ chối mà không có hướng dẫn làm mới.
- **Giải pháp:** 
  - Backend truyền `expired_at` (15 phút từ lúc tạo) sang PayOS SDK và trả về `expires_at` chuẩn ISO 8601 cùng `remaining_seconds`.
  - Frontend tính toán đếm ngược từng giây (`mm:ss`) với hiệu ứng trực quan (xanh lá > cam > đỏ).
  - Khi hết 15 phút: Mã QR mờ đi, xuất hiện overlay báo hết hạn và nút **"Làm mới mã QR"** gọi API tạo phiên thanh toán mới (tối đa 3 lần theo BR-29).

---

## Metadata
- **Complexity**: Small-to-Medium (1 backend service file, 2 frontend component files, 1 test file)
- **Source PRD**: `docs/testing/expected-results-all-modules.md` (Module 3: Thanh toán lệ phí, BR-28, BR-29)
- **Estimated Files**: 4 files
  - `accounts/payment_service.py`
  - `vju-portal-admin/src/components/student/RequestForm.js`
  - `vju-portal-admin/src/components/student/RequestDetail.js`
  - `accounts/tests_payment.py`

---

## UX Design

### Before (Hiện tại)
```
┌──────────────────────────────────────────────┐
│                  [Mã VietQR]                 │
│                                              │
│      ● Đang chờ bạn quét mã thanh toán...    │  <-- Không biết bao giờ hết hạn!
│                                              │
│  Số tiền: 50.000 VNĐ                         │
│  Số tài khoản: V3CAS8830145080               │
│  [Mở cổng thanh toán PayOS →]               │
└──────────────────────────────────────────────┘
```

### After (Đề xuất)
```
┌──────────────────────────────────────────────┐
│                  [Mã VietQR]                 │
│                                              │
│   ⏱ Mã QR có hiệu lực trong: 14:32 (đếm lùi)  │  <-- Màu xanh lá (xanh -> cam -> đỏ)
│                                              │
│  Số tiền: 50.000 VNĐ                         │
│  Số tài khoản: V3CAS8830145080               │
│  [Mở cổng thanh toán PayOS →]               │
└──────────────────────────────────────────────┘

Khi hết hạn (00:00):
┌──────────────────────────────────────────────┐
│  ┌────────────────────────────────────────┐  │
│  │         [Mã VietQR bị làm mờ]          │  │
│  │   ⚠️ Mã QR đã hết thời gian hiệu lực    │  │
│  │         [Làm mới mã QR 🔄]             │  │
│  └────────────────────────────────────────┘  │
│                                              │
│   ❌ Phiên thanh toán đã hết hạn (Lần 1/3)   │
└──────────────────────────────────────────────┘
```

### Interaction Changes
| Touchpoint | Before | After | Ghi chú |
|---|---|---|---|
| Dưới mã QR | Dòng chữ tĩnh `Đang chờ bạn quét mã...` | Huy hiệu đếm ngược: `Mã QR có hiệu lực trong: 14:59` | Chuyển màu vàng/cam khi còn dưới 3 phút |
| Khi hết 15 phút | QR vẫn hiện bình thường nhưng ngân hàng sẽ từ chối | QR mờ đi, hiện nút "Làm mới mã QR" | Dừng polling ngầm để tiết kiệm tài nguyên |
| Bấm "Làm mới mã QR" | Không có nút | Gửi request tạo phiên QR mới, đếm ngược lại 15:00 | Kiểm tra BR-29 (tối đa 3 lần thử) |
| Modal thanh toán ở Chi tiết đơn | Không có đếm ngược | Đồng bộ giao diện đếm ngược tương tự | Đảm bảo tính nhất quán |

---

## Technical Architecture & Constraints

### 1. Thời gian hiệu lực (Expiration Hierarchy)
1. **Hạn chót toàn đơn (BR-28):** `payment_deadline = Request.created_at + 24h`. Nếu quá 24h, toàn bộ đơn bị hủy tự động.
2. **Hiệu lực phiên QR (PayOS Session):** Mỗi mã VietQR có thời gian hiệu lực là **15 phút** (`QR_EXPIRATION_SECONDS = 900`).
   - `expires_at = min(now + 15 phút, payment_deadline)`.
   - `expired_at` (Unix timestamp) được gửi trực tiếp vào PayOS API qua `CreatePaymentLinkRequest(expired_at=...)`.
   - PayOS sẽ tự động đóng link thanh toán và chặn chuyển khoản khi quá timestamp này.

### 2. Quản lý tái sử dụng & Làm mới (Cache & Retry Logic)
- **Tái sử dụng phiên hợp lệ:** Nếu có giao dịch `pending` mà thời gian hiện tại còn cách `expires_at` ít nhất 30 giây $\rightarrow$ tiếp tục sử dụng, trả về thời gian hết hạn gốc.
- **Xử lý khi phiên hết hạn:** Nếu giao dịch `pending` cũ đã quá `expires_at` $\rightarrow$ đánh dấu `status = 'failed'` (hết hạn), tăng `retry_count += 1`.
- **Ràng buộc BR-29:** Nếu `retry_count >= 3`, ném lỗi `PAYMENT_LOCKED: "Đã thất bại 3 lần. Vui lòng liên hệ PKHTC."` và vô hiệu hóa nút làm mới.

---

## Detailed Implementation Steps

### Phase 1: Backend (`accounts/payment_service.py` & `payment_views.py`)
1. Khai báo hằng số `QR_EXPIRATION_SECONDS = 900` (15 phút).
2. Trong hàm `create_payment_link`:
   - Tính toán `session_deadline = min(timezone.now() + timedelta(seconds=QR_EXPIRATION_SECONDS), request_obj.created_at + timedelta(hours=24))`.
   - Kiểm tra `existing_pending`:
     - Nếu `existing_pending.callback_data` có `expires_at` và `now < expires_at - 30s` $\rightarrow$ Tái sử dụng, trả về kèm `expires_at`.
     - Nếu đã hết hạn $\rightarrow$ Cập nhật `existing_pending.status = 'failed'`, ghi audit log.
   - Truyền `expired_at = int(session_deadline.timestamp())` vào `CreatePaymentLinkRequest`.
   - Lưu `expires_at` vào `callback_data` của bản ghi `Payment`.
   - Trả về payload chứa `expires_at` (ISO format) và `remaining_seconds`.
3. Trong `sync_payment_status_from_payos`:
   - Nếu quá hạn mà chưa thanh toán $\rightarrow$ đồng bộ trạng thái `failed` tương ứng.

### Phase 2: Frontend Component (`RequestForm.js` & `RequestDetail.js`)
1. Tạo helper hook hoặc state tính toán countdown:
   - `const [timeLeft, setTimeLeft] = useState(0)`
   - Cập nhật mỗi giây: `Math.max(0, Math.floor((new Date(paymentData.expires_at) - Date.now()) / 1000))`
   - Format: `const minutes = String(Math.floor(timeLeft / 60)).padStart(2, '0')`, `const seconds = String(timeLeft % 60).padStart(2, '0')`.
2. Tạo giao diện hiển thị:
   - Khi `timeLeft > 180` (trên 3 phút): Badge xanh lá `Mã QR có hiệu lực trong: mm:ss`.
   - Khi `0 < timeLeft <= 180` (dưới 3 phút): Badge cam/vàng cảnh báo sắp hết hạn.
   - Khi `timeLeft === 0` (hết hạn):
     - Hiển thị QR bị mờ (opacity: 0.2, filter: blur(3px)).
     - Lớp phủ overlay với icon cảnh báo `⚠️ Mã QR đã hết hạn`.
     - Nút `"Làm mới mã QR"` (Disabled nếu đã hết 3 lần thử).
     - Tạm dừng interval polling `api.payments.getStatus`.
3. Áp dụng đồng bộ cho Modal thanh toán trong `RequestDetail.js`.

### Phase 3: Automated Verification (`accounts/tests_payment.py`)
1. Viết test `test_payment_link_has_15min_expiration`: Xác nhận API trả về `expires_at` đúng trong khoảng 15 phút.
2. Viết test `test_expired_payment_increments_retry_count`: Khi phiên QR cũ hết hạn, gọi lại API sẽ tăng `retry_count` và không tái sử dụng mã cũ.
3. Viết test `test_payment_locked_after_three_expired_retries`: Sau 3 lần thử hết hạn, hệ thống trả về mã lỗi `PAYMENT_LOCKED`.
4. Chạy toàn bộ test suite `python manage.py test accounts.tests_payment` (đảm bảo 100% PASS).
5. Build frontend `npm run build` xác nhận không có lỗi cú pháp.

---

## Acceptance Criteria
- [ ] Dưới mã QR ở màn hình tạo đơn và modal chi tiết đơn hiển thị đồng hồ đếm ngược `mm:ss` chuẩn xác theo thời gian thực.
- [ ] Thời gian hiệu lực mặc định là 15 phút và khớp chuẩn xác với tham số `expired_at` gửi sang cổng PayOS.
- [ ] Khi còn dưới 3 phút, giao diện cảnh báo bằng màu cam nổi bật.
- [ ] Khi hết 15 phút, mã QR được che mờ và hiện nút "Làm mới mã QR".
- [ ] Bấm "Làm mới mã QR" sinh ra mã VietQR mới và bắt đầu đếm lùi lại 15 phút.
- [ ] Giới hạn tối đa 3 lần thử theo BR-29 được bảo toàn nghiêm ngặt; sau 3 lần thì khóa thanh toán kèm hướng dẫn liên hệ phòng KHTC.
- [ ] Toàn bộ test tự động backend và frontend build đều xanh (Pass).

