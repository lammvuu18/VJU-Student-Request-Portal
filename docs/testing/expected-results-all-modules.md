# Kết quả mong đợi — Module 1 đến Module 7

> **Quy ước:** Mỗi module chỉ viết test cho **endpoint mới** hoặc **logic mới**. Endpoint kế thừa từ module trước không viết lại.
>
> **Lưu ý Mock Service:** Các bước gọi API hệ thống ngoài (Academic MS, Finance MS, SmartCA, Payment Gateway, Internet Banking) đều dùng Mock Service khi dev. File `solutions-external-systems.md` mô tả chi tiết cách mock từng hệ thống.

---

# QUY TẮC CHUNG MODULE 1-2

> Các quyết định dưới đây áp dụng cho Module 1 và 2. Mục đánh dấu **[cần xác nhận]** là đề xuất chưa có trong tài liệu gốc.

## Tài khoản test

Chạy `python manage.py seed_module1`. Trong các test, `user_id` là mã nhân vật, không phải ID thật trong database:

| Mã trong test | Nhân vật | Email | Ghi chú |
|---|---|---|---|
| 1 | SV A | minhanh@st.vju.ac.vn | Nguyễn Minh Anh, 21CS001, active |
| 2 | SV B | quocanh@st.vju.ac.vn | 21CS002, active |
| 3 | SV C | xuanhau@st.vju.ac.vn | 21CS003, active |
| 4 | SV tốt nghiệp | graduated@st.vju.ac.vn | 20CS001 |
| 5 | SV bảo lưu | suspended@st.vju.ac.vn | 21CS004 |
| 10 | TP PCTSV | tp.ctsv@vju.ac.vn | |
| 11 | CV1 PCTSV | hoangnam@vju.ac.vn | |
| 12 | CV2 PCTSV | cv2.pctsv@vju.ac.vn | |
| 20 | TP PĐT | thuha@vju.ac.vn | |
| 21 | CV PĐT | tranthi.b@vju.ac.vn | |

## Bảng trạng thái

Mọi hành động sai trạng thái trả 422 `INVALID_STATE`.

| Hành động | Từ internal_status | Sang internal_status | status SV thấy |
|---|---|---|---|
| Gửi đơn | (mới) | Chờ phân công | Đã gửi |
| Hủy | Chờ phân công | Đã hủy | Đã hủy |
| Phân công | Chờ phân công | CV đang thẩm định | Đang xử lý |
| Yêu cầu bổ sung | CV đang thẩm định | Cần bổ sung | Cần bổ sung |
| Nộp bổ sung | Cần bổ sung | CV đang thẩm định | Đang xử lý |
| Quá hạn bổ sung **[cần xác nhận]** | Cần bổ sung | Từ chối | Từ chối |
| Duyệt | CV đang thẩm định | Đã duyệt — Đang chuẩn bị kết quả | Đã duyệt |
| Từ chối | CV đang thẩm định | Từ chối | Từ chối |
| Thu hồi duyệt | Đã duyệt — Đang chuẩn bị kết quả | CV đang thẩm định | Đang xử lý |
| SV tải PDF lần đầu (đơn "Bản điện tử") **[cần xác nhận]** | Đã duyệt — Đang chuẩn bị kết quả | Đã xử lý | Đã xử lý |
| Xác nhận giao bản cứng (đơn "Bản cứng", "Cả hai") | Đã duyệt — Đang chuẩn bị kết quả | Đã xử lý | Đã xử lý |

Đánh giá chỉ được gửi khi đơn ở "Đã xử lý".

## Quy tắc nghiệp vụ

| Nội dung | Quyết định |
|---|---|
| SLA | Ngày làm việc là thứ Hai đến thứ Sáu, trừ Holiday. Hạn = thời điểm gửi cộng N ngày làm việc, giữ nguyên giờ. Gửi vào ngày nghỉ thì tính từ 08:00 ngày làm việc kế tiếp **[cần xác nhận]** |
| Tiếp tục SLA | Khi SV nộp bổ sung, sla_deadline cộng thêm đúng thời gian đã tạm dừng **[cần xác nhận]** |
| Hạn bổ sung | 5 ngày lịch, theo ví dụ trong API contract |
| Chống trùng (BR-04) | Chặn khi có đơn cùng thủ tục chưa ở "Đã duyệt", "Đã xử lý", "Từ chối", "Đã hủy". Thông báo dùng tên thủ tục |
| Giới hạn 5 đơn/ngày (BR-05) | Tính theo ngày Việt Nam, gồm cả đơn đã hủy **[cần xác nhận]** |
| Thứ tự kiểm tra khi gửi đơn | Token → vai trò → thủ tục → dữ liệu form → file → chống trùng → giới hạn 5 đơn |
| Trường tự điền | Backend tự điền `student.*` và `academic_ms.*`, bỏ qua giá trị client gửi |
| `result_preference` | Lưu ở cả cột riêng và `form_data`. Thủ tục giấy giới thiệu luôn là "Bản cứng" |
| Trường theo điều kiện | Thêm `required_if` vào FormField. `ho_khau`, `noi_dk_nvqs` bắt buộc khi `purpose` = "Tạm hoãn NVQS" |
| Thu hồi duyệt | Trong 30 phút, khi SV chưa tải PDF và chưa bàn giao. Thu hồi sẽ xóa Result và PDF |
| SV bảo lưu | Vẫn gửi được đơn, CV quyết định khi thẩm định |
| Xem chi tiết đơn | Chủ đơn và cán bộ thuộc phòng ban xử lý |

## Quyết định kỹ thuật

| Nội dung | Quyết định |
|---|---|
| Tạo PDF | `reportlab` kèm font tiếng Việt, tạo mã QR bằng `qrcode` |
| Lưu file | Dùng Django storage: máy dev lưu ở `media/`. Trên Render chưa chốt **[cần xác nhận]**, ổ đĩa web service không giữ file qua các lần deploy |
| Tác vụ định kỳ | Lệnh `process_deadlines` xử lý quá hạn bổ sung và cold storage, chạy lại an toàn. Lịch chạy trên Render chưa chốt **[cần xác nhận]** |
| Link QR | Biến môi trường `VERIFY_BASE_URL`, mặc định trang `/verify` của Portal |

## Mã lỗi bổ sung

| HTTP | error.code | Khi nào |
|---|---|---|
| 400 | INVALID_FORM_DATA | Dữ liệu form hoặc đánh giá không hợp lệ |
| 400 | INVALID_FILE_FORMAT | Sai định dạng file |
| 400 | FILE_TOO_LARGE | File quá dung lượng |
| 400 | MISSING_ATTACHMENT | Thiếu đính kèm bắt buộc |
| 400 | INVALID_ATTACHMENT | `config_id` không thuộc thủ tục |
| 400 | INVALID_REASON | Lý do từ chối không hợp lệ |
| 422 | INVALID_STATE | Hành động không hợp lệ với trạng thái hiện tại |
| 422 | INVALID_STAFF | Chuyên viên không hợp lệ |
| 422 | STUDENT_NOT_ELIGIBLE | Hệ thống học vụ báo SV không đủ điều kiện |
| 503 | EXTERNAL_SERVICE_ERROR | Hệ thống ngoài không phản hồi |

---

# MODULE 1 — Giấy xác nhận sinh viên (1 cấp)

Luồng: SV gửi → TP phân công → CV duyệt → render PDF + QR → SV nhận → SV đánh giá

## API 1.1: POST /api/requests — SV gửi yêu cầu

### Test 1.1.1 — Gửi đơn thành công

**Gọi:** `POST http://localhost:8080/api/requests`
**Token:** SV user_id = 1 (Nguyễn Minh Anh)

**Request (multipart/form-data):**
```
type_id: 1
form_data: {"purpose": "Vay vốn", "result_preference": "Bản điện tử"}
```

**Kết quả:**
```json
{
  "success": true,
  "data": {
    "request_id": 1,
    "request_code": "REQ-20261030-001",
    "status": "Đã gửi",
    "internal_status": "Chờ phân công",
    "sla_deadline": "2026-11-02T...",
    "created_at": "2026-10-30T..."
  },
  "message": "Gửi yêu cầu thành công."
}
```

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Status code = 201 | |
| 2 | request_code có format REQ-YYYYMMDD-XXX | |
| 3 | status = "Đã gửi", internal_status = "Chờ phân công" | |
| 4 | sla_deadline = thứ Hai 02/11/2026 cùng giờ gửi (gửi thứ Sáu 30/10, cộng 1 ngày làm việc, bỏ qua thứ Bảy, Chủ nhật và Holiday) | |
| 5 | Bảng StateAuditLog có 1 bản ghi: action = "submit" | |
| 6 | Bảng Notification có thông báo cho SV: "Đơn đã được tiếp nhận" | |
| 7 | Bảng Notification có thông báo cho TP PCTSV (user_id = 10): "Có đơn mới chờ phân công" | |

---

### Test 1.1.2 — Gửi đơn với mục đích "Tạm hoãn NVQS" + đính kèm CCCD

**Request (multipart/form-data):**
```
type_id: 1
form_data: {"purpose": "Tạm hoãn NVQS", "result_preference": "Bản cứng", "ho_khau": "Hà Nội", "noi_dk_nvqs": "Quận Cầu Giấy"}
attachments[0][config_id]: 1
attachments[0][file]: cccd.jpg
```

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Status code = 201 | |
| 2 | form_data lưu đầy đủ ho_khau, noi_dk_nvqs | |
| 3 | Bảng Attachment có 1 bản ghi: config_id = 1, file_name = "cccd.jpg" | |
| 4 | result_preference = "Bản cứng" | |

---

### Test 1.1.3 — Vi phạm chống trùng (BR-04)

**Điều kiện:** SV user_id = 1 đã có 1 đơn "Giấy XN SV" đang mở (status không thuộc "Đã duyệt", "Đã xử lý", "Từ chối", "Đã hủy")

**Gọi:** POST /api/requests với type_id = 1 lần nữa

**Kết quả:**
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_REQUEST",
    "message": "Bạn đã có yêu cầu Giấy xác nhận sinh viên đang xử lý."
  }
}
```

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Status code = 409 | |
| 2 | Không tạo Request mới trong database | |

---

### Test 1.1.4 — Vi phạm rate limit (BR-05)

**Điều kiện:** SV user_id = 1 đã gửi 5 đơn trong ngày hôm nay (bất kỳ loại thủ tục nào)

**Kết quả:**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Đã đạt giới hạn 5 yêu cầu/ngày."
  }
}
```

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Status code = 409 | |

---

### Test 1.1.5 — File đính kèm sai format (BR-03)

**Request:** attachments[0][file] = document.docx (không phải PDF/JPG/PNG)

**Kết quả:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_FILE_FORMAT",
    "message": "Chỉ chấp nhận file PDF, JPG, PNG."
  }
}
```

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Status code = 400 | |
| 2 | Kiểm tra cả nội dung file, không chỉ đuôi file | |

---

### Test 1.1.6 — File đính kèm quá 5MB (BR-03)

**Request:** attachments[0][file] = big_file.pdf (6MB)

**Kết quả:**
```json
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "File không được vượt quá 5MB."
  }
}
```

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Status code = 400 | |

---

### Test 1.1.7 — SV tốt nghiệp gửi đơn XN SV (BR-02)

**Token:** SV user_id = 4 (Lê Tốt Nghiệp, academic_status = "graduated")

**Kết quả:**
```json
{
  "success": true,
  "data": {
    "request_id": 2,
    "request_code": "REQ-20261030-002",
    "status": "Đã gửi",
    "internal_status": "Chờ phân công"
  }
}
```

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Status code = 201 — SV tốt nghiệp vẫn gửi được XN SV | |

---

### Bổ sung API 1.1 — Các ca lỗi

| Test | Trường hợp | Kết quả |
|---|---|---|
| Test 1.1.8 | `type_id` không tồn tại | 404 `NOT_FOUND` |
| Test 1.1.9 | Thủ tục đã ẩn hoặc phòng ban ngừng hoạt động | 404 `PROCEDURE_INACTIVE` |
| Test 1.1.10 | Thiếu trường bắt buộc do SV nhập (`purpose`) | 400 `INVALID_FORM_DATA` |
| Test 1.1.11 | `purpose` ngoài danh sách dropdown | 400 `INVALID_FORM_DATA` |
| Test 1.1.12 | Chọn "Tạm hoãn NVQS" nhưng thiếu `ho_khau` hoặc `noi_dk_nvqs` | 400 `INVALID_FORM_DATA` |
| Test 1.1.13 | Thiếu đính kèm bắt buộc (type_id = 5, không gửi config_id = 5) | 400 `MISSING_ATTACHMENT` |
| Test 1.1.14 | `config_id` thuộc thủ tục khác | 400 `INVALID_ATTACHMENT` |
| Test 1.1.15 | File `.pdf` nhưng nội dung không phải PDF | 400 `INVALID_FILE_FORMAT` |
| Test 1.1.16 | Cán bộ gửi đơn | 403 `FORBIDDEN` |
| Test 1.1.17 | Không có token | 401 `UNAUTHORIZED` |
| Test 1.1.18 | Gửi `full_name` khác hồ sơ | 201, `form_data.full_name` lấy từ hồ sơ SV, không lấy giá trị gửi lên |
| Test 1.1.19 | Vừa trùng đơn vừa đủ 5 đơn trong ngày | 409 `DUPLICATE_REQUEST` (kiểm tra chống trùng trước) |
| Test 1.1.20 | Có ngày nghỉ: thứ Hai 02/11 nằm trong Holiday, gửi thứ Sáu 30/10 | `sla_deadline` = thứ Ba 03/11 cùng giờ |
| Test 1.1.21 | Gửi thứ Bảy 31/10 lúc 10:00 | `sla_deadline` = thứ Ba 03/11 lúc 08:00 (bắt đầu tính từ 08:00 thứ Hai) |

---

## API 1.2: GET /api/requests — SV xem danh sách đơn

### Test 1.2.1 — SV có đơn

**Gọi:** `GET http://localhost:8080/api/requests`
**Token:** SV user_id = 1

**Kết quả:**
```json
{
  "success": true,
  "data": [
    {
      "request_id": 1,
      "request_code": "REQ-20261030-001",
      "type_name": "Giấy xác nhận sinh viên",
      "department_name": "Phòng Công tác Sinh viên",
      "status": "Đã gửi",
      "internal_status": "Chờ phân công",
      "created_at": "2026-10-30T...",
      "sla_deadline": "2026-11-02T...",
      "is_fee_required": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Chỉ trả đơn của user_id = 1, không trả đơn của SV khác | |
| 2 | Có đủ type_name, department_name (JOIN từ ProcedureType + Department) | |
| 3 | Sắp xếp mới nhất trước | |

---

### Test 1.2.2 — SV chưa có đơn nào

**Token:** SV user_id = 3 (Đỗ Xuân Hậu, chưa gửi đơn nào)

**Kết quả:**
```json
{
  "success": true,
  "data": [],
  "pagination": { "page": 1, "limit": 20, "total": 0, "total_pages": 0 }
}
```

---

### Test 1.2.3 — Lọc theo trạng thái

**Gọi:** `GET http://localhost:8080/api/requests?status=Đã duyệt`

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Chỉ trả đơn có status = "Đã duyệt" | |

---

## API 1.3: GET /api/requests/:id — Chi tiết đơn

### Test 1.3.1 — SV xem đơn của mình

**Gọi:** `GET http://localhost:8080/api/requests/1`
**Token:** SV user_id = 1

**Kết quả:**
```json
{
  "success": true,
  "data": {
    "request_id": 1,
    "request_code": "REQ-20261030-001",
    "type_id": 1,
    "type_name": "Giấy xác nhận sinh viên",
    "department_name": "Phòng Công tác Sinh viên",
    "status": "Đã gửi",
    "internal_status": "Chờ phân công",
    "form_data": {
      "purpose": "Vay vốn",
      "result_preference": "Bản điện tử"
    },
    "student": {
      "full_name": "Nguyễn Minh Anh",
      "mssv": "21CS001",
      "class_name": "CS2021A",
      "cohort": "K2021",
      "major": "Khoa học Máy tính",
      "email": "minhanh@st.vju.ac.vn"
    },
    "assigned_staff": null,
    "assigned_by": null,
    "attachments": [],
    "payment": { "is_required": false },
    "result": null,
    "supplement_count": 0,
    "sla_deadline": "2026-11-02T...",
    "transferred_to_dept": null,
    "is_draft": false,
    "created_at": "2026-10-30T...",
    "updated_at": "2026-10-30T..."
  }
}
```

---

### Test 1.3.2 — SV xem đơn của người khác

**Gọi:** `GET http://localhost:8080/api/requests/1`
**Token:** SV user_id = 2 (không phải chủ đơn)

**Kết quả:**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Bạn không có quyền xem yêu cầu này."
  }
}
```

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Status code = 403 | |

---

### Test 1.3.3 — Cán bộ cùng phòng ban xem được

**Gọi:** `GET http://localhost:8080/api/requests/1`
**Token:** CV PCTSV user_id = 11

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Status code = 200 — cán bộ cùng PB được xem | |
| 2 | Bảng AccessLog có 1 bản ghi cho cán bộ này, xem lại không tạo thêm | |

---

### Bổ sung API 1.3 — Các ca lỗi

| Test | Trường hợp | Kết quả |
|---|---|---|
| Test 1.3.4 | Cán bộ khác phòng ban xem đơn | 403 `FORBIDDEN` |
| Test 1.3.5 | Hiệu trưởng hoặc Admin xem đơn Module 1 | 403 `FORBIDDEN` (theo Actor SV/Staff) |
| Test 1.3.6 | Đơn không tồn tại | 404 `NOT_FOUND` |

---

## API 1.4: PUT /api/requests/:id/cancel — SV hủy đơn

### Test 1.4.1 — Hủy thành công (đơn chưa phân công)

**Điều kiện:** Request.internal_status = "Chờ phân công"
**Gọi:** `PUT http://localhost:8080/api/requests/1/cancel`

**Kết quả:**
```json
{
  "success": true,
  "message": "Đã hủy yêu cầu."
}
```

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Request.status và internal_status → "Đã hủy" | |
| 2 | StateAuditLog có action = "cancel" | |
| 3 | Đơn đã hủy không còn tính chống trùng, nhưng vẫn tính vào giới hạn 5 đơn/ngày | |

---

### Test 1.4.2 — Hủy thất bại (đã phân công — BR-06)

**Điều kiện:** Request.internal_status = "CV đang thẩm định" (đã được TP phân công)

**Kết quả:**
```json
{
  "success": false,
  "error": {
    "code": "CANNOT_CANCEL",
    "message": "Không thể hủy — yêu cầu đã được phân công xử lý."
  }
}
```

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Status code = 422 | |
| 2 | Request.status KHÔNG thay đổi | |

---

### Bổ sung API 1.4 — Các ca lỗi

| Test | Trường hợp | Kết quả |
|---|---|---|
| Test 1.4.3 | SV khác hủy đơn | 403 `FORBIDDEN` |
| Test 1.4.4 | Hủy đơn đã hủy | 422 `CANNOT_CANCEL` |
| Test 1.4.5 | Gửi lại đơn cùng loại sau khi hủy | 201 |

---

## API 1.5: GET /api/staff/inbox — TP xem inbox

### Test 1.5.1 — TP PCTSV thấy đơn mới

**Gọi:** `GET http://localhost:8080/api/staff/inbox`
**Token:** TP PCTSV user_id = 10
**Thời điểm test (cố định):** đơn gửi 30/10/2026 10:00, gọi API lúc 14:00 cùng ngày

**Kết quả:**
```json
{
  "success": true,
  "data": [
    {
      "request_id": 1,
      "request_code": "REQ-20261030-001",
      "type_name": "Giấy xác nhận sinh viên",
      "student_name": "Nguyễn Minh Anh",
      "mssv": "21CS001",
      "internal_status": "Chờ phân công",
      "sla_deadline": "2026-11-02T...",
      "sla_remaining_hours": 68,
      "is_overdue": false,
      "created_at": "2026-10-30T..."
    }
  ],
  "summary": {
    "total_pending": 1,
    "overdue": 0,
    "due_today": 0
  },
  "pagination": { "page": 1, "limit": 20, "total": 1, "total_pages": 1 }
}
```

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Chỉ trả đơn thuộc department_id = 1 (PCTSV) | |
| 2 | KHÔNG trả đơn thuộc PĐT hoặc PKHTC | |
| 3 | sla_remaining_hours tính đúng | |
| 4 | summary đếm đúng số lượng | |

---

### Test 1.5.2 — TP PĐT không thấy đơn PCTSV

**Token:** TP PĐT user_id = 20

**Kết quả:**
```json
{
  "success": true,
  "data": [],
  "summary": { "total_pending": 0, "overdue": 0, "due_today": 0 },
  "pagination": { "page": 1, "limit": 20, "total": 0, "total_pages": 0 }
}
```

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Cán bộ chỉ thấy thủ tục thuộc đúng phòng ban (BR-19) | |

---

### Test 1.5.3 — CV thấy đơn được phân công cho mình

**Điều kiện:** TP đã phân công request_id = 1 cho CV user_id = 11
**Token:** CV user_id = 11

**Kết quả:** Chỉ trả request_id = 1 với internal_status = "CV đang thẩm định"

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | CV chỉ thấy đơn assigned_staff_id = 11 | |
| 2 | KHÔNG thấy đơn chưa phân công hoặc phân công cho CV khác | |

---

### Bổ sung API 1.5

| Test | Trường hợp | Kết quả |
|---|---|---|
| Test 1.5.4 | Đơn quá hạn SLA | `is_overdue = true`, `sla_remaining_hours` âm, `summary.overdue` tăng 1 |
| Test 1.5.5 | Đơn đang tạm dừng SLA | `sla_remaining_hours` giữ nguyên tại thời điểm dừng, `is_overdue = false` |
| Test 1.5.6 | Lọc `internal_status`, `type_id`, phân trang | Chỉ trả đúng đơn, `pagination` đúng |
| Test 1.5.7 | SV gọi inbox | 403 `FORBIDDEN` |

---

## API 1.6: GET /api/staff/department-members — DS chuyên viên trong phòng

### Test 1.6.1 — TP PCTSV xem danh sách CV

**Token:** TP PCTSV user_id = 10

**Kết quả:**
```json
{
  "success": true,
  "data": [
    {
      "user_id": 11,
      "full_name": "Lê Hoàng Nam (CV1 PCTSV)",
      "email": "hoangnam@vju.ac.vn",
      "current_workload": 0
    },
    {
      "user_id": 12,
      "full_name": "Phạm Thanh Hằng (CV2 PCTSV)",
      "email": "cv2.pctsv@vju.ac.vn",
      "current_workload": 0
    }
  ]
}
```

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Chỉ trả CV trong cùng phòng ban (department_id = 1) | |
| 2 | KHÔNG trả TP chính mình | |
| 3 | current_workload = số đơn đang xử lý (assigned_staff_id = user_id AND status đang mở) | |

---

## API 1.7: PUT /api/staff/requests/:id/assign — TP phân công CV

### Test 1.7.1 — Phân công thành công

**Token:** TP PCTSV user_id = 10

**Request:**
```json
{ "assigned_staff_id": 11 }
```

**Kết quả:**
```json
{
  "success": true,
  "data": {
    "internal_status": "CV đang thẩm định",
    "assigned_staff": {
      "user_id": 11,
      "full_name": "Lê Hoàng Nam (CV1 PCTSV)"
    }
  },
  "message": "Đã phân công CV Lê Hoàng Nam."
}
```

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Request.assigned_staff_id = 11 | |
| 2 | Request.assigned_by_id = 10 (TP) | |
| 3 | Request.assigned_at có giá trị | |
| 4 | StateAuditLog: action = "assign", status_after = "CV đang thẩm định" | |
| 5 | Notification gửi cho CV user_id = 11 | |
| 6 | Notification gửi cho SV: "Đơn đang được xử lý" | |

---

### Test 1.7.2 — CV phân công → bị từ chối (BR-20: chỉ TP)

**Token:** CV user_id = 11 (không phải TP)

**Kết quả:**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Chỉ Trưởng phòng mới có quyền phân công."
  }
}
```

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Status code = 403 | |

---

### Test 1.7.3 — Phân công CV khác phòng ban

**Request:** `{ "assigned_staff_id": 21 }` (CV PĐT, không phải PCTSV)

**Kết quả:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_STAFF",
    "message": "Chuyên viên không thuộc phòng ban phụ trách."
  }
}
```

---

### Bổ sung API 1.7 — Các ca lỗi

| Test | Trường hợp | Kết quả |
|---|---|---|
| Test 1.7.4 | Phân công đơn đã có CV | 422 `INVALID_STATE` |
| Test 1.7.5 | TP phòng khác phân công | 403 `FORBIDDEN` |
| Test 1.7.6 | `assigned_staff_id` không tồn tại hoặc tài khoản bị khóa | 422 `INVALID_STAFF` |

---

## API 1.8: PUT /api/staff/requests/:id/approve — CV duyệt (1 cấp)

### Test 1.8.1 — Duyệt thành công

**Điều kiện:** Request đã được phân công cho CV user_id = 11, internal_status = "CV đang thẩm định"
**Token:** CV user_id = 11

> **Mock Academic MS:** getStudentStatus("21CS001") → { status: "active" }

**Request:**
```json
{ "note": "Đã xác nhận tình trạng SV qua Academic MS — active." }
```

**Kết quả:**
```json
{
  "success": true,
  "data": {
    "internal_status": "Đã duyệt — Đang chuẩn bị kết quả",
    "result": {
      "result_id": 1,
      "pdf_download_url": "/api/results/1/download",
      "verification_code": "VJU-XN-2026-001"
    }
  },
  "message": "Đã duyệt. PDF kết quả đã được tạo."
}
```

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Bảng Result có 1 bản ghi: request_id = 1, verification_code có giá trị | |
| 2 | Result.pdf_file_path trỏ tới file PDF thật trên server | |
| 3 | Result.qr_code_data = VERIFY_BASE_URL + mã xác minh (mặc định trỏ về trang /verify của Portal) | |
| 4 | StateAuditLog: action = "approve" | |
| 5 | Notification gửi cho SV: "Đơn đã được duyệt" | |
| 6 | Mock Academic MS được gọi: getStudentStatus("21CS001") | |

---

### Test 1.8.2 — CV không phải người được phân công

**Token:** CV user_id = 12 (CV2 PCTSV, nhưng đơn phân công cho CV1 user_id = 11)

**Kết quả:**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Bạn không được phân công xử lý yêu cầu này."
  }
}
```

---

### Bổ sung API 1.8 — Các ca lỗi

| Test | Trường hợp | Kết quả |
|---|---|---|
| Test 1.8.3 | Đơn không ở "CV đang thẩm định" | 422 `INVALID_STATE` |
| Test 1.8.4 | Thủ tục 2-3 cấp (`approval_levels` khác 1) | 422 `INVALID_STATE` |
| Test 1.8.5 | Academic MS báo SV không `active`/`graduated` | 422 `STUDENT_NOT_ELIGIBLE`, đơn giữ nguyên trạng thái |
| Test 1.8.6 | Academic MS không phản hồi | 503 `EXTERNAL_SERVICE_ERROR`, đơn giữ nguyên trạng thái |
| Test 1.8.7 | Tạo PDF thất bại | 500, không tạo Result, đơn giữ nguyên trạng thái |

---

## API 1.9: PUT /api/staff/requests/:id/reject — CV từ chối

### Test 1.9.1 — Từ chối với lý do từ danh mục

**Request:**
```json
{
  "reason_id": 6,
  "note": "SV đã bị buộc thôi học."
}
```

**Kết quả:**
```json
{
  "success": true,
  "data": {
    "status": "Từ chối",
    "internal_status": "Từ chối"
  },
  "message": "Đã từ chối yêu cầu."
}
```

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | StateAuditLog: action = "reject", note chứa lý do | |
| 2 | Notification gửi cho SV kèm lý do từ chối | |

---

### Test 1.9.2 — Từ chối với lý do tự nhập < 20 ký tự (BR-12)

**Request:**
```json
{ "reason_id": null, "note": "Không hợp lệ" }
```

**Kết quả:**
```json
{
  "success": false,
  "error": {
    "code": "REASON_TOO_SHORT",
    "message": "Lý do từ chối phải có ít nhất 20 ký tự."
  }
}
```

---

### Bổ sung API 1.9 — Các ca lỗi

| Test | Trường hợp | Kết quả |
|---|---|---|
| Test 1.9.3 | `reason_id` không tồn tại hoặc đã tắt | 400 `INVALID_REASON` |
| Test 1.9.4 | CV không được phân công | 403 `FORBIDDEN` |
| Test 1.9.5 | Đơn sai trạng thái | 422 `INVALID_STATE` |

---

## API 1.10: GET /api/rejection-reasons — Lấy danh mục lý do từ chối

### Test 1.10.1 — Lấy danh sách thành công

**Kết quả:**
```json
{
  "success": true,
  "data": [
    { "reason_id": 1, "reason_text": "Hồ sơ không đầy đủ theo yêu cầu" },
    { "reason_id": 2, "reason_text": "Giấy tờ minh chứng không hợp lệ hoặc đã hết hiệu lực" },
    { "reason_id": 3, "reason_text": "Không thuộc đối tượng theo quy định" }
  ]
}
```

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Chỉ trả reason có is_active = true | |
| 2 | Có đủ 10 reason từ seed | |

---

### Bổ sung API 1.10

| Test | Trường hợp | Kết quả |
|---|---|---|
| Test 1.10.2 | SV gọi API | 403 `FORBIDDEN` (Actor CV/TP) |

---

## API 1.11: PUT /api/staff/requests/:id/request-supplement — CV yêu cầu bổ sung

### Test 1.11.1 — Yêu cầu bổ sung lần 1

**Request:**
```json
{ "note": "Vui lòng bổ sung CCCD 2 mặt rõ nét hơn." }
```

**Kết quả:**
```json
{
  "success": true,
  "data": {
    "internal_status": "Cần bổ sung",
    "supplement_count": 1,
    "supplement_deadline": "2026-11-04T...",
    "sla_paused_at": "2026-10-30T..."
  }
}
```

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | supplement_count tăng từ 0 → 1 | |
| 2 | sla_paused_at có giá trị (SLA tạm dừng — BR-09) | |
| 3 | supplement_deadline = now + 5 ngày lịch (BR-09) | |
| 4 | Request.status → "Cần bổ sung" | |
| 5 | Notification gửi cho SV kèm lý do | |

---

### Test 1.11.2 — Yêu cầu bổ sung lần 3 → bị từ chối (BR-11)

**Điều kiện:** supplement_count = 2

**Kết quả:**
```json
{
  "success": false,
  "error": {
    "code": "MAX_SUPPLEMENTS_REACHED",
    "message": "Đã yêu cầu bổ sung 2 lần. Phải từ chối yêu cầu."
  }
}
```

---

## API 1.12: POST /api/requests/:id/supplements — SV nộp bổ sung

### Test 1.12.1 — Nộp bổ sung thành công

**Token:** SV user_id = 1
**Điều kiện:** Request.internal_status = "Cần bổ sung"

**Request (multipart/form-data):**
```
attachments[0][config_id]: 1
attachments[0][file]: cccd_clear.jpg
```

**Kết quả:**
```json
{
  "success": true,
  "data": {
    "supplement_count": 1,
    "status": "Đang xử lý",
    "internal_status": "CV đang thẩm định"
  }
}
```

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Attachment mới có is_supplement = true | |
| 2 | Request.sla_paused_at reset NULL, sla_deadline cộng thêm đúng thời gian đã tạm dừng | |
| 3 | Request.supplement_deadline reset NULL | |
| 4 | Notification gửi cho CV: "SV đã nộp bổ sung" | |

---

### Bổ sung API 1.11, 1.12 — Các ca lỗi

| Test | Trường hợp | Kết quả |
|---|---|---|
| Test 1.11.3 | CV không được phân công yêu cầu bổ sung | 403 `FORBIDDEN` |
| Test 1.12.2 | Nộp khi đơn không ở "Cần bổ sung" | 422 `INVALID_STATE` |
| Test 1.12.3 | SV khác nộp | 403 `FORBIDDEN` |
| Test 1.12.4 | File sai định dạng | 400 `INVALID_FILE_FORMAT` |
| Test 1.12.5 | Quá `supplement_deadline` (lệnh `process_deadlines`) | status và internal_status → "Từ chối", StateAuditLog action = "supplement_expired", Notification cho SV |

---

## API 1.13: GET /api/requests/:id/timeline — Timeline trạng thái

### Test 1.13.1 — Xem timeline sau khi duyệt

**Điều kiện:** Đơn đã trải qua: submit → assign → approve

**Kết quả:**
```json
{
  "success": true,
  "data": [
    {
      "action": "submit",
      "note": null,
      "status_after": "Chờ phân công",
      "performed_by": "Nguyễn Minh Anh",
      "created_at": "2026-10-30T10:00:00"
    },
    {
      "action": "assign",
      "note": "Phân công CV Lê Hoàng Nam",
      "status_after": "CV đang thẩm định",
      "performed_by": "Nguyễn Thị Lan (TP PCTSV)",
      "created_at": "2026-10-30T10:30:00"
    },
    {
      "action": "approve",
      "note": "Đã xác nhận tình trạng SV qua Academic MS",
      "status_after": "Đã duyệt — Đang chuẩn bị kết quả",
      "performed_by": "Lê Hoàng Nam (CV1 PCTSV)",
      "created_at": "2026-10-30T11:00:00"
    }
  ]
}
```

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Sắp xếp theo thời gian tăng dần | |
| 2 | Mỗi entry khớp với StateAuditLog | |

---

## API 1.14: PUT /api/staff/requests/:id/assign-pickup — Chỉ định lịch nhận bản cứng

### Test 1.14.1 — Chỉ định thành công

**Điều kiện:** Đơn đã duyệt, SV chọn result_preference = "Bản cứng"

**Request:**
```json
{
  "pickup_date": "2026-11-03T09:00:00",
  "pickup_location": "Phòng PCTSV, Tầng 2, Tòa A",
  "pickup_note": "Mang theo CCCD. Nhận trong giờ hành chính."
}
```

**Kết quả:**
```json
{
  "success": true,
  "message": "Đã chỉ định lịch nhận bản cứng. SV sẽ được thông báo."
}
```

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Result.pickup_date, pickup_location, pickup_note cập nhật đúng | |
| 2 | Result.pickup_assigned_by = user_id CV/TP hiện tại | |
| 3 | Notification gửi cho SV kèm ngày/địa điểm | |

---

### Bổ sung API 1.14

| Test | Trường hợp | Kết quả |
|---|---|---|
| Test 1.14.2 | Đơn chỉ chọn "Bản điện tử" | 422 `INVALID_STATE` |

---

## API 1.15: PUT /api/staff/requests/:id/confirm-handover — Xác nhận đã giao

### Test 1.15.1 — Xác nhận thành công

**Kết quả:**
```json
{
  "success": true,
  "data": {
    "handover_confirmed_at": "2026-11-03T09:15:00"
  },
  "message": "Đã xác nhận giao bản cứng."
}
```

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Result.handover_confirmed_at có giá trị | |
| 2 | Result.confirmed_by_id = user_id CV/TP hiện tại | |
| 3 | Request.status và internal_status → "Đã xử lý" | |

---

### Bổ sung API 1.15

| Test | Trường hợp | Kết quả |
|---|---|---|
| Test 1.15.2 | Chưa có lịch hẹn | 422 `INVALID_STATE` |

---

## API 1.16: GET /api/results/:id/download — Tải PDF

### Test 1.16.1 — Tải thành công

**Kết quả:** Binary file (application/pdf)

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Content-Type = application/pdf | |
| 2 | File mở được, nội dung đúng (họ tên, MSSV, mục đích) | |
| 3 | Có mã QR nhúng trong PDF | |
| 4 | Đơn "Bản điện tử": lần tải đầu của SV chuyển status và internal_status → "Đã xử lý" | |

---

### Test 1.16.2 — Tải sau 30 ngày (BR-15)

**Điều kiện:** Result.cold_storage_at có giá trị (đã chuyển cold storage)

**Kết quả:**
```json
{
  "success": false,
  "error": {
    "code": "COLD_STORAGE",
    "message": "Tài liệu đã quá 30 ngày, đã chuyển vào lưu trữ. Vui lòng liên hệ phòng ban."
  }
}
```

---

### Bổ sung API 1.16

| Test | Trường hợp | Kết quả |
|---|---|---|
| Test 1.16.3 | SV khác tải PDF | 403 `FORBIDDEN` |
| Test 1.16.4 | `result_id` không tồn tại | 404 `NOT_FOUND` |

---

## API 1.17: POST /api/requests/:id/feedback — Đánh giá

### Test 1.17.1 — Đánh giá thành công

**Request:**
```json
{
  "star_rating": 4.5,
  "speed_score": 5.0,
  "attitude_score": 4.0,
  "convenience_score": 4.5,
  "comment_text": "Xử lý nhanh, cán bộ nhiệt tình."
}
```

**Kết quả:**
```json
{
  "success": true,
  "message": "Cảm ơn bạn đã đánh giá!"
}
```

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Bảng Feedback có 1 bản ghi: request_id, user_id, đủ 4 score | |

---

### Test 1.17.2 — Đánh giá lần 2 (đã đánh giá rồi)

**Kết quả:**
```json
{
  "success": false,
  "error": {
    "code": "ALREADY_RATED",
    "message": "Bạn đã đánh giá yêu cầu này rồi."
  }
}
```

---

### Bổ sung API 1.17

| Test | Trường hợp | Kết quả |
|---|---|---|
| Test 1.17.3 | Đơn chưa ở "Đã xử lý" | 422 `INVALID_STATE` |
| Test 1.17.4 | SV khác đánh giá | 403 `FORBIDDEN` |
| Test 1.17.5 | Điểm ngoài khoảng 1-5 | 400 `INVALID_FORM_DATA` |

---

## API 1.18: GET /api/verify/:code — Xác minh giấy tờ

### Test 1.18.1 — Mã hợp lệ

**Gọi:** `GET http://localhost:8080/api/verify/VJU-XN-2026-001` (KHÔNG cần token)

**Kết quả:**
```json
{
  "success": true,
  "data": {
    "is_valid": true,
    "document_type": "Giấy xác nhận sinh viên",
    "student_name": "Nguyễn Minh Anh",
    "mssv": "21CS001",
    "issued_date": "2026-10-30",
    "issued_by": "Trường Đại học Việt Nhật"
  }
}
```

---

### Test 1.18.2 — Mã không tồn tại

**Gọi:** `GET http://localhost:8080/api/verify/INVALID-CODE`

**Kết quả:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CODE",
    "message": "Mã xác minh không hợp lệ hoặc giấy tờ không tồn tại."
  }
}
```

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Status code = 404 | |

---

## API 1.19: PUT /api/staff/requests/:id/revoke — Thu hồi duyệt (BR-13)

### Test 1.19.1 — Thu hồi trong 30 phút

**Điều kiện:** CV vừa duyệt < 30 phút trước, SV chưa tải PDF và chưa bàn giao bản cứng

**Kết quả:**
```json
{
  "success": true,
  "data": { "internal_status": "CV đang thẩm định" },
  "message": "Đã thu hồi duyệt."
}
```

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Bản ghi Result và file PDF bị xóa | |
| 2 | Mã xác minh cũ trả 404 `INVALID_CODE` | |
| 3 | Request.status → "Đang xử lý" | |
| 4 | StateAuditLog: action = "revoke" | |
| 5 | Notification gửi cho SV | |

---

### Test 1.19.2 — Thu hồi quá 30 phút

**Kết quả:**
```json
{
  "success": false,
  "error": {
    "code": "REVOKE_EXPIRED",
    "message": "Đã quá 30 phút hoặc cấp tiếp đã xử lý."
  }
}
```

---

# MODULE 2 — Giấy giới thiệu thực tập (1 cấp, bản cứng bắt buộc)

> **Endpoint mới:** Không có. Tái sử dụng toàn bộ từ Module 1. Chỉ khác logic validate backend.

## Test 2.1 — Gửi đơn GT thực tập

**Request:**
```
type_id: 2
form_data: {"company_name": "FPT Software", "company_address": "Hà Nội", "internship_from": "2027-01-15", "internship_to": "2027-04-15", "course_name": "Thực tập doanh nghiệp"}
```

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Status = 201, internal_status = "Chờ phân công" | |
| 2 | SLA = 2 ngày làm việc (theo ProcedureType.sla_total_days cho type_id = 2) | |
| 3 | result_preference tự động = "Bản cứng" dù request không gửi | |

---

## Test 2.2 — CV duyệt: kiểm tra HP trong CTĐT qua Academic MS

**Điều kiện:** CV duyệt đơn GT thực tập (thủ tục này luôn nhận "Bản cứng", backend tự đặt khi gửi đơn)

> **Mock Academic MS:** getStudentCurriculum("21CS001") → trả danh sách 5 HP, bao gồm "Thực tập doanh nghiệp" (course_id = "CS301")

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Mock Academic MS được gọi: getStudentCurriculum("21CS001") | |
| 2 | HP "Thực tập doanh nghiệp" tìm thấy trong danh sách → duyệt bình thường | |

---

## Test 2.3 — HP không tồn tại trong CTĐT → yêu cầu bổ sung

**Điều kiện:** SV nhập course_name = "Thực tập ngoại ngữ" (không có trong mock)

> **Mock Academic MS:** getStudentCurriculum("21CS001") → danh sách KHÔNG chứa "Thực tập ngoại ngữ"

**Hành vi CV:** Bấm "Yêu cầu bổ sung" với note: "HP không trong CTĐT, vui lòng bổ sung xác nhận từ Khoa."

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | internal_status → "Cần bổ sung" | |
| 2 | SLA tạm dừng, supplement_deadline = 5 ngày | |

---

## Test 2.4 — SV suspended → CV từ chối

> **Mock Academic MS:** getStudentStatus("21CS004") → { status: "suspended" }

**Token SV:** user_id = 5 (Trần Bảo Lưu, suspended), gửi đơn GT thực tập. Hệ thống vẫn cho gửi, CV quyết định khi thẩm định
**CV duyệt:** bấm reject

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Gửi đơn trả 201 | |
| 2 | CV từ chối với lý do "Sinh viên không đang theo học" (reason_id = 7) | |

---

# MODULE 3 — Phúc khảo điểm thi (2 cấp + thanh toán)

> **Endpoint mới:** POST /api/requests/:id/payments, GET /api/requests/:id/payments, POST /api/webhooks/vnpay, PUT .../submit-to-head, PUT .../approve-head, PUT .../return-to-staff

## API 3.1: POST /api/requests — Gửi đơn phúc khảo (có lệ phí)

### Test 3.1.1 — Gửi đơn → trạng thái "Chờ thanh toán"

**Request:**
```
type_id: 3
form_data: {"course_name": "Cấu trúc dữ liệu", "course_code": "CS201", "reason": "Điểm thi không phản ánh đúng năng lực"}
```

> **Mock Academic MS:** getGrade("21CS001", "CS201") → { grade: 6.0 } (auto-fill "Điểm hiện tại")

**Kết quả:**
```json
{
  "success": true,
  "data": {
    "request_id": 3,
    "request_code": "REQ-20261031-003",
    "status": "Chờ thanh toán",
    "internal_status": "Chờ thanh toán",
    "fee_amount": 50000,
    "payment_deadline": "2026-11-01T...",
    "created_at": "2026-10-31T..."
  },
  "message": "Gửi yêu cầu thành công. Vui lòng thanh toán lệ phí để tiếp tục."
}
```

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | status = "Chờ thanh toán" (KHÔNG phải "Chờ phân công" — BR-27) | |
| 2 | fee_amount = 50000 (lấy từ ProcedureType.fee_amount) | |
| 3 | payment_deadline = created_at + 24h (BR-28) | |
| 4 | SLA chưa bắt đầu tính (chờ thanh toán xong mới tính) | |

---

## API 3.2: POST /api/requests/:id/payments — Tạo giao dịch thanh toán

### Test 3.2.1 — Tạo giao dịch VNPay thành công

**Request:**
```json
{ "payment_method": "vnpay_qr" }
```

> **Mock Payment Gateway / VNPay Sandbox:** Tạo payment URL

**Kết quả:**
```json
{
  "success": true,
  "data": {
    "payment_id": 1,
    "txn_id": "VNP-20261031-001",
    "amount": 50000,
    "payment_method": "vnpay_qr",
    "payment_url": "https://sandbox.vnpayment.vn/paymentv2/...",
    "expires_at": "2026-11-01T..."
  }
}
```

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Bảng Payment có 1 bản ghi: status = "pending" | |
| 2 | payment_url trỏ tới VNPay sandbox (hoặc trang mock thanh toán) | |
| 3 | Frontend dùng payment_url để redirect SV | |

---

### Test 3.2.2 — Thất bại 3 lần → khóa (BR-29)

**Điều kiện:** Request đã có 3 Payment với status = "failed"

**Kết quả:**
```json
{
  "success": false,
  "error": {
    "code": "PAYMENT_LOCKED",
    "message": "Đã thất bại 3 lần. Vui lòng liên hệ PKHTC."
  }
}
```

---

## API 3.3: POST /api/webhooks/vnpay — Webhook thanh toán

### Test 3.3.1 — Thanh toán thành công

> **VNPay Sandbox gọi (hoặc Mock Payment gọi):**

**Request:**
```
vnp_TxnRef=REQ-20261031-003
vnp_Amount=5000000
vnp_ResponseCode=00
vnp_SecureHash=valid_hash
```

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Payment.status → "completed" | |
| 2 | Payment.signature_verified = true (BR-32) | |
| 3 | Payment.callback_data lưu nguyên bản dữ liệu webhook | |
| 4 | Request.internal_status → "Chờ phân công" | |
| 5 | SLA bắt đầu tính từ thời điểm này | |
| 6 | Notification gửi cho SV: "Thanh toán thành công" | |

---

### Test 3.3.2 — Thanh toán thất bại

**Request:** vnp_ResponseCode = "24" (SV hủy)

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Payment.status → "failed" | |
| 2 | Request.internal_status vẫn "Chờ thanh toán" | |
| 3 | Payment.retry_count tăng 1 | |

---

### Test 3.3.3 — Quá 24h chưa thanh toán → auto hủy (BR-28)

**Điều kiện:** Request.created_at > 24h trước, vẫn "Chờ thanh toán"

**Checklist (scheduler/cron job):**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Request.status → "Đã hủy (quá hạn thanh toán)" | |
| 2 | Notification gửi cho SV | |

---

## API 3.4: GET /api/requests/:id/payments — Xem trạng thái thanh toán

### Test 3.4.1 — Thanh toán đã hoàn tất

**Kết quả:**
```json
{
  "success": true,
  "data": {
    "is_required": true,
    "fee_amount": 50000,
    "latest_payment": {
      "payment_id": 1,
      "status": "completed",
      "amount": 50000,
      "payment_method": "vnpay_qr",
      "completed_at": "2026-10-31T..."
    },
    "retry_count": 1,
    "max_retries": 3,
    "payment_deadline": "2026-11-01T..."
  }
}
```

---

## API 3.5: PUT /api/staff/requests/:id/submit-to-head — CV trình TP

### Test 3.5.1 — Trình duyệt thành công

**Token:** CV PĐT user_id = 21

**Request:**
```json
{
  "note": "GV1: 7.5, GV2: 8.0. Phúc khảo: 7.75. Tăng so với 6.0.",
  "review_data": {
    "grade_reviewer_1": 7.5,
    "grade_reviewer_2": 8.0,
    "final_grade": 7.75
  }
}
```

**Kết quả:**
```json
{
  "success": true,
  "data": { "internal_status": "Chờ TP phê duyệt" },
  "message": "Đã trình duyệt Trưởng phòng."
}
```

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | StateAuditLog: action = "submit_to_head" | |
| 2 | review_data lưu vào form_data hoặc trường riêng | |
| 3 | Notification gửi cho TP PĐT user_id = 20 | |

---

## API 3.6: PUT /api/staff/requests/:id/approve-head — TP phê duyệt (2 cấp)

### Test 3.6.1 — Phê duyệt → cập nhật điểm Academic MS

**Token:** TP PĐT user_id = 20

**Request:**
```json
{ "note": "Đồng ý. Điểm phúc khảo: 7.75." }
```

> **Mock Academic MS:** updateGrade("21CS001", "CS201", 7.75) → { success: true }

**Kết quả:**
```json
{
  "success": true,
  "data": { "internal_status": "Đã xử lý" },
  "message": "Đã phê duyệt."
}
```

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Mock Academic MS được gọi: updateGrade("21CS001", "CS201", 7.75) | |
| 2 | Notification gửi cho SV: "Điểm cũ 6.0 → Mới 7.75" | |
| 3 | Lệ phí KHÔNG hoàn lại (spec quy định) | |

---

### Test 3.6.2 — Điểm phúc khảo thấp hơn → vẫn cập nhật

**Điều kiện:** review_data.final_grade = 5.5 (thấp hơn điểm cũ 6.0)

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Vẫn gọi Academic MS cập nhật điểm 5.5 (quy chế VJU) | |
| 2 | Notification cho SV kèm lưu ý quy chế | |

---

## API 3.7: PUT /api/staff/requests/:id/return-to-staff — TP trả về CV

### Test 3.7.1 — Trả về thành công

**Request:**
```json
{ "note": "Điểm GV1 và GV2 chênh > 2, cần mời GV3 chấm lại." }
```

**Kết quả:**
```json
{
  "success": true,
  "data": { "internal_status": "CV đang thẩm định" },
  "message": "Đã trả về CV xem lại."
}
```

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | internal_status quay lại "CV đang thẩm định" | |
| 2 | StateAuditLog: action = "return_to_staff" | |
| 3 | Notification gửi cho CV kèm chỉ đạo TP | |

---

### Test 3.7.2 — Hoàn tiền khi từ chối trước ký số (BR-31)

**Điều kiện:** TP từ chối đơn phúc khảo (PUT .../reject)

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Payment.refund_status → "processing" | |
| 2 | Notification cho SV: "Hoàn tiền 50,000 VNĐ trong 3-5 ngày" | |

> **Lưu ý:** Theo spec, lệ phí phúc khảo KHÔNG hoàn lại trong mọi trường hợp. Test này chỉ áp dụng nếu nhóm quyết định thay đổi quy chế. Nếu giữ nguyên quy chế → bỏ test này.

---

# MODULE 4 — Bảo lưu KQHT (3 cấp + SmartCA)

> **Endpoint mới:** PUT .../submit-to-principal, GET /api/principal/pending-signatures, POST /api/principal/requests/:id/sign

## API 4.1: POST /api/requests — Gửi đơn bảo lưu

### Test 4.1.1 — Gửi đơn với auto-fill GPA

**Request:**
```
type_id: 4
form_data: {"reason": "Lý do sức khỏe", "suspend_from": "2027-01-01", "suspend_to": "2027-06-30", "return_semester": "HK1 2027-2028", "commitment": true}
attachments[0][config_id]: 4
attachments[0][file]: giay_nhap_vien.pdf
```

> **Mock Academic MS:** getStudentGPA("21CS001") → 3.2 (auto-fill vào form)

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | form_data chứa gpa = 3.2 (auto-fill từ Mock Academic MS) | |
| 2 | SLA = 5 ngày | |
| 3 | Attachment có 1 bản ghi: config_id = 4 | |

---

## API 4.2: PUT /api/staff/requests/:id/submit-to-principal — TP trình HT

### Test 4.2.1 — Trình HT ký thành công

**Token:** TP PĐT user_id = 20
**Điều kiện:** CV đã trình TP (submit-to-head), TP đã phê duyệt chuyên môn

**Request:**
```json
{ "note": "Đã xác nhận GPA ≥ 2.0, minh chứng hợp lệ. Trình HT ký QĐ bảo lưu." }
```

**Kết quả:**
```json
{
  "success": true,
  "data": { "internal_status": "Chờ HT ký số" },
  "message": "Đã trình Hiệu trưởng. Chờ ký số SmartCA."
}
```

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Hệ thống render PDF QĐ bảo lưu từ template | |
| 2 | Result.pdf_file_path trỏ tới PDF vừa render | |
| 3 | StateAuditLog: action = "submit_for_signature" | |
| 4 | Notification gửi cho HT user_id = 50 | |

---

## API 4.3: GET /api/principal/pending-signatures — HT xem QĐ chờ ký

### Test 4.3.1 — Có QĐ chờ ký

**Token:** HT user_id = 50

**Kết quả:**
```json
{
  "success": true,
  "data": [
    {
      "request_id": 4,
      "request_code": "REQ-20261031-004",
      "type_name": "Bảo lưu kết quả học tập",
      "student_name": "Nguyễn Văn A",
      "submitted_by": "Trần Đức Minh (TP PĐT)",
      "submitted_at": "2026-10-31T16:00:00",
      "sub_sla_deadline": "2026-11-01T16:00:00",
      "pdf_preview_url": "/api/results/4/preview"
    }
  ]
}
```

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Chỉ trả request có internal_status = "Chờ HT ký số" | |
| 2 | Chỉ trả thủ tục 3 cấp (BR-22) | |

---

### Test 4.3.2 — Không phải HT → bị từ chối

**Token:** TP PĐT user_id = 20

**Kết quả:**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Chỉ Hiệu trưởng mới có quyền truy cập."
  }
}
```

---

## API 4.4: POST /api/principal/requests/:id/sign — HT ký số SmartCA

### Test 4.4.1 — Ký thành công

**Token:** HT user_id = 50

> **Mock SmartCA (Cách 2 — có giao diện điện thoại):**
> 1. Backend gọi MockSmartCAService.requestSignature() → trả status = "pending", confirm_url
> 2. Người demo mở confirm_url trên điện thoại, bấm "Xác nhận ký"
> 3. Trang mock gọi POST /api/mock-smartca/callback → backend cập nhật

**Kết quả (sau khi callback):**
```json
{
  "success": true,
  "data": {
    "smartca_transaction_id": "MOCK-SMARTCA-1730376300",
    "internal_status": "Đã duyệt — Có kết quả",
    "signed_at": "2026-10-31T16:05:00"
  },
  "message": "Ký số thành công."
}
```

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Result.smartca_transaction_id có giá trị | |
| 2 | Result.signed_by_id = 50 (HT) | |
| 3 | Result.signed_at có giá trị | |
| 4 | Mock Academic MS được gọi: updateStudentStatus("21CS001", "suspended") | |
| 5 | Notification gửi cho SV: "QĐ bảo lưu đã được HT ký số" | |
| 6 | PDF có thể tải (GET /api/results/:id/download) | |

---

### Test 4.4.2 — SmartCA timeout

> **Mock SmartCA:** Không nhận callback trong 5 phút

**Kết quả:**
```json
{
  "success": false,
  "error": {
    "code": "SMARTCA_TIMEOUT",
    "message": "SmartCA không phản hồi trong 5 phút. Vui lòng thử lại."
  }
}
```

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Status code = 504 | |
| 2 | internal_status vẫn "Chờ HT ký số" — HT có thể thử lại | |

---

## Test 4.5 — GPA < 2.0 → CV từ chối

> **Mock Academic MS:** getStudentGPA → 1.8

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | CV từ chối với lý do "GPA không đạt yêu cầu tối thiểu (2.0)" | |

---

# MODULE 5 — Miễn giảm HP (liên phòng ban + 3 cấp + SmartCA)

> **Endpoint mới:** PUT /api/staff/requests/:id/transfer

## API 5.1: PUT /api/staff/requests/:id/transfer — CV chuyển phòng ban

### Test 5.1.1 — Transfer thành công (PCTSV → PKHTC)

**Token:** CV PCTSV user_id = 11
**Điều kiện:** CV đã kiểm tra đối tượng chính sách, đơn đang "CV đang thẩm định"

**Request:**
```json
{
  "to_department_id": 3,
  "note": "Đã xác nhận đối tượng hộ nghèo. Chuyển PKHTC thẩm định mức miễn giảm."
}
```

**Kết quả:**
```json
{
  "success": true,
  "data": {
    "internal_status": "Đã chuyển PKHTC — chờ phân công",
    "transferred_to_dept": {
      "dept_id": 3,
      "name": "Phòng Kế hoạch Tài chính"
    }
  },
  "message": "Đã chuyển sang Phòng Kế hoạch Tài chính."
}
```

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Request.assigned_staff_id reset NULL (BR-25) | |
| 2 | Request.transferred_to_dept_id = 3 | |
| 3 | Request.transferred_at có giá trị | |
| 4 | StateAuditLog: action = "transfer_department", note chứa ghi chú | |
| 5 | Đơn xuất hiện trong inbox TP PKHTC (user_id = 30) | |
| 6 | Đơn KHÔNG còn trong inbox TP PCTSV | |
| 7 | Notification gửi cho TP PKHTC: "Có đơn chuyển từ PCTSV" | |

---

### Test 5.1.2 — Transfer lần 2 → bị từ chối (BR-26)

**Điều kiện:** Request.transferred_to_dept_id đã có giá trị (đã transfer 1 lần)

**Kết quả:**
```json
{
  "success": false,
  "error": {
    "code": "ALREADY_TRANSFERRED",
    "message": "Yêu cầu đã được chuyển phòng ban 1 lần (giới hạn Release 1)."
  }
}
```

---

### Test 5.1.3 — Luồng sau Transfer: TP PKHTC phân công → CV PKHTC thẩm định

**Bước 1:** TP PKHTC (user_id = 30) gọi PUT .../assign → phân công CV PKHTC (user_id = 31)

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | assigned_staff_id = 31 (CV PKHTC) | |
| 2 | assigned_by_id = 30 (TP PKHTC) | |

**Bước 2:** CV PKHTC trình TP → TP duyệt → trình HT → HT ký SmartCA

> **Mock Finance MS:** createRefund("21CS001", amount) → { success: true }

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Luồng 3 cấp hoạt động đúng sau Transfer | |
| 2 | Mock Finance MS được gọi sau khi HT ký số | |
| 3 | Notification cho SV kèm khoản miễn giảm cụ thể | |

---

## Test 5.2 — SV không thuộc đối tượng → CV PCTSV từ chối

**Hành vi:** CV PCTSV bấm reject trước khi Transfer

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Đơn bị từ chối ngay tại PCTSV, không transfer | |
| 2 | Lý do: "Không thuộc diện chính sách theo NĐ 81/2021" | |

---

# MODULE 6 — Hoàn trả HP (3 cấp + SmartCA + Banking API)

> **Endpoint mới:** Không có endpoint mới. Luồng giống Module 4, thêm logic gọi Finance MS + Internet Banking ở backend sau khi HT ký.

## Test 6.1 — Gửi đơn hoàn trả: auto-fill dữ liệu tài chính

**Request:**
```
type_id: 6
form_data: {"reason": "Thôi học", "semester": "HK1 2026-2027", "bank_account": "1234567890", "bank_name": "Vietcombank", "account_holder": "Nguyễn Văn A"}
attachments[0][config_id]: 9
attachments[0][file]: qd_thoi_hoc.pdf
attachments[1][config_id]: 10
attachments[1][file]: the_nh.jpg
```

> **Mock Finance MS:** getStudentTuition("21CS001") → { tuition_amount: 15000000, paid_amount: 15000000, last_paid_at: "2026-09-01" }

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | form_data chứa paid_amount = 15000000 (auto-fill từ Mock Finance MS) | |

---

## Test 6.2 — Sau HT ký số: gọi Finance MS + Internet Banking

**Điều kiện:** HT đã ký SmartCA thành công

> **Mock Finance MS:** createRefund("21CS001", 15000000) → { success: true }
> **Mock Internet Banking:** createTransfer("1234567890", 15000000) → { reference_id: "TXN-MOCK-001", status: "processing" }

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Mock Finance MS được gọi: ghi nhận hoàn trả | |
| 2 | Mock Internet Banking được gọi: lập lệnh chi | |
| 3 | Request.internal_status → "Đang chuyển khoản" | |

---

## Test 6.3 — Webhook ngân hàng xác nhận chuyển khoản

> **Mock Internet Banking:** webhook callback status = "completed"

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Request.internal_status → "Đã hoàn trả" | |
| 2 | Notification cho SV: "Đã chuyển 15,000,000 VNĐ vào TK ***7890. Mã GD: TXN-MOCK-001" | |

---

## Test 6.4 — Webhook ngân hàng trả "failed"

> **Mock Internet Banking:** webhook callback status = "failed"

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Request.internal_status → "Chuyển khoản thất bại" | |
| 2 | CV liên hệ SV xác nhận STK → có thể thử lại | |

---

## Test 6.5 — SV chưa đóng HP → CV từ chối

> **Mock Finance MS:** getStudentTuition("21CS001") → { paid_amount: 0 }

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | CV từ chối: "SV chưa có giao dịch đóng HP cho kỳ này" | |

---

# MODULE 7 — Admin

## API 7.1: CRUD /api/admin/procedures — Quản lý thủ tục

### Test 7.1.1 — Tạo thủ tục mới

**Token:** Admin user_id = 99

**Request:**
```json
{
  "name": "Cấp bảng điểm",
  "description": "Cấp bảng điểm toàn khóa",
  "department_id": 2,
  "sla_total_days": 3,
  "approval_levels": 1,
  "sub_sla_l1_days": 3,
  "result_type": "PDF",
  "template_file_path": "/templates/bang_diem.docx",
  "is_fee_required": false,
  "form_fields": [
    {
      "field_name": "Ngôn ngữ",
      "field_key": "language",
      "data_type": "dropdown",
      "is_required": true,
      "dropdown_options": ["Tiếng Việt", "Tiếng Anh", "Cả hai"],
      "display_order": 1
    }
  ],
  "attachment_configs": []
}
```

**Kết quả:**
```json
{
  "success": true,
  "data": {
    "type_id": 8,
    "name": "Cấp bảng điểm",
    "is_active": true
  },
  "message": "Tạo thủ tục thành công."
}
```

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | ProcedureType mới trong database | |
| 2 | FormField mới liên kết đúng type_id | |
| 3 | Thủ tục hiển thị trên Portal SV (GET /api/procedures) | |

---

### Test 7.1.2 — Soft delete thủ tục (BR-18)

**Gọi:** `DELETE http://localhost:8080/api/admin/procedures/8`

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | ProcedureType.is_active = false (KHÔNG xóa khỏi database) | |
| 2 | Thủ tục KHÔNG còn hiển thị trên Portal SV | |
| 3 | Admin vẫn thấy thủ tục trong GET /api/admin/procedures | |

---

### Test 7.1.3 — Không phải Admin → bị từ chối

**Token:** CV user_id = 11

**Kết quả:**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Chỉ Admin mới có quyền truy cập."
  }
}
```

---

## API 7.2: POST /api/admin/users/import-students — Import SV từ Excel

### Test 7.2.1 — Import thành công

**Request (multipart/form-data):**
```
file: students_new.xlsx
```

**Kết quả:**
```json
{
  "success": true,
  "data": {
    "total_rows": 50,
    "imported": 48,
    "skipped": 2,
    "errors": [
      { "row": 12, "email": "invalid-email", "reason": "Email không hợp lệ" },
      { "row": 35, "email": "nguyenvana@st.vju.ac.vn", "reason": "Email đã tồn tại" }
    ]
  }
}
```

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | StudentRegistry có thêm 48 bản ghi mới | |
| 2 | Email trùng bị skip, không ghi đè | |
| 3 | Email sai format bị skip | |
| 4 | Trả report chi tiết lỗi theo từng row | |

---

## API 7.3: GET /api/admin/dashboard — Dashboard thống kê

### Test 7.3.1 — Dashboard có dữ liệu

**Điều kiện:** Đã chạy luồng Module 1-6, có đơn ở nhiều trạng thái

**Kết quả:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_requests": 10,
      "pending": 2,
      "processing": 3,
      "completed": 4,
      "rejected": 1,
      "cancelled": 0
    },
    "sla_compliance": {
      "on_time": 4,
      "overdue": 0,
      "compliance_rate": 100.0
    },
    "satisfaction": {
      "avg_star_rating": 4.5,
      "total_feedbacks": 2
    },
    "by_procedure": [
      {
        "type_name": "Giấy xác nhận sinh viên",
        "total": 3,
        "avg_processing_hours": 18.5
      }
    ],
    "by_department": [
      {
        "department_name": "Phòng Công tác Sinh viên",
        "total": 5,
        "on_time_rate": 100.0
      }
    ]
  }
}
```

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | overview đếm đúng từ bảng Request theo status | |
| 2 | sla_compliance tính từ Request.sla_deadline vs thời điểm hoàn thành | |
| 3 | satisfaction tính trung bình từ bảng Feedback | |
| 4 | by_procedure group by ProcedureType | |
| 5 | by_department group by Department | |

---

### Test 7.3.2 — Dashboard lọc theo khoảng thời gian

**Gọi:** `GET /api/admin/dashboard?from_date=2026-10-01&to_date=2026-10-31`

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Chỉ tính đơn có created_at trong khoảng 01/10 - 31/10 | |

---

### Test 7.3.3 — Dashboard lọc theo phòng ban

**Gọi:** `GET /api/admin/dashboard?department_id=1`

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Chỉ tính đơn thuộc PCTSV (department_id = 1) | |

---

## API 7.4: CRUD /api/admin/holidays — Quản lý ngày nghỉ

### Test 7.4.1 — Thêm ngày nghỉ

**Request:**
```json
{
  "holiday_date": "2026-12-25",
  "description": "Giáng sinh",
  "type": "holiday",
  "year": 2026
}
```

**Checklist:**

| # | Điều kiện | Kết quả |
|---|---|---|
| 1 | Ngày 25/12 không tính SLA cho các đơn sau | |

---

### Test 7.4.2 — Thêm ngày trùng

**Request:** holiday_date = "2026-09-02" (đã có trong seed)

**Kết quả:**
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_HOLIDAY",
    "message": "Ngày này đã có trong danh sách."
  }
}
```

---

# TỔNG HỢP TẤT CẢ MODULES

| Module | Số test | Endpoint mới | Lưu ý Mock Service |
|---|---|---|---|
| Module 0 | 21 | 5 endpoint | — |
| Module 1 | 89 | 19 endpoint | Mock Academic MS (getStudentStatus) |
| Module 2 | 4 | 0 (tái sử dụng) | Mock Academic MS (getCurriculum) |
| Module 3 | 11 | 6 endpoint | Mock Payment Gateway / VNPay Sandbox + Mock Academic MS (updateGrade) |
| Module 4 | 7 | 3 endpoint | Mock SmartCA (giao diện điện thoại) + Mock Academic MS (updateStudentStatus) |
| Module 5 | 4 | 1 endpoint | Mock Finance MS (createRefund) |
| Module 6 | 5 | 0 (tái sử dụng) | Mock Finance MS + Mock Internet Banking |
| Module 7 | 9 | CRUD endpoints | — |
| **Tổng** | **150 test** | **34 endpoint + CRUD Module 7** | |
