# API Contract — Cổng tiếp nhận và xử lý giấy tờ cho sinh viên VJU

## Quy ước chung

### Base URL
```
http://localhost:8080/api
```

### Authentication
Tất cả endpoint (trừ Auth và Verify) yêu cầu header:
```
Authorization: Bearer <access_token>
```

### Response format chung
```json
// Thành công
{
  "success": true,
  "data": { ... },
  "message": "Thành công"
}

// Thành công có phân trang
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  }
}

// Lỗi
{
  "success": false,
  "error": {
    "code": "DUPLICATE_REQUEST",
    "message": "Bạn đã có yêu cầu XN SV đang xử lý."
  }
}
```

### HTTP Status Codes
| Code | Ý nghĩa |
|------|---------|
| 200  | Thành công |
| 201  | Tạo mới thành công |
| 400  | Dữ liệu gửi lên không hợp lệ |
| 401  | Chưa đăng nhập / token hết hạn |
| 403  | Không có quyền truy cập |
| 404  | Không tìm thấy |
| 409  | Xung đột (VD: đơn trùng, quá rate limit) |
| 422  | Vi phạm business rule |
| 500  | Lỗi server |

---

## 1. AUTHENTICATION — Xác thực

### 1.1 Đăng nhập bằng Google OAuth

```
POST /api/auth/google
```

Frontend gửi token nhận từ Google OAuth lên backend. Backend xác thực token, kiểm tra email có trong StudentRegistry/danh sách cán bộ, tạo hoặc lấy User, trả về access token của hệ thống.

**Request:**
```json
{
  "google_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6..."
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 86400,
    "user": {
      "user_id": 1,
      "email": "quocanh@st.vju.ac.vn",
      "full_name": "Nguyễn Quốc Anh",
      "avatar_url": "https://lh3.googleusercontent.com/...",
      "role": "student",
      "department_id": null,
      "mssv": "21CS001"
    }
  }
}
```

**Response 403:**
```json
{
  "success": false,
  "error": {
    "code": "EMAIL_NOT_REGISTERED",
    "message": "Email không có trong danh sách sinh viên/cán bộ được phép đăng nhập."
  }
}
```

### 1.2 Lấy thông tin người dùng hiện tại

```
GET /api/auth/me
```

Frontend gọi khi load trang để kiểm tra user đang đăng nhập là ai. Dùng access token trong header.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "user_id": 1,
    "email": "quocanh@st.vju.ac.vn",
    "full_name": "Nguyễn Quốc Anh",
    "phone": "0912345678",
    "avatar_url": "https://...",
    "role": "student",
    "department_id": null,
    "department_name": null,
    "mssv": "21CS001",
    "class_name": "CS2021A",
    "cohort": "K2021",
    "major": "Khoa học Máy tính",
    "academic_status": "active"
  }
}
```

### 1.3 Đăng xuất

```
POST /api/auth/logout
```

Vô hiệu hóa access token hiện tại.

**Response 200:**
```json
{
  "success": true,
  "message": "Đăng xuất thành công."
}
```

---

## 2. PROCEDURES — Danh mục thủ tục (Public)

### 2.1 Lấy danh sách thủ tục (nhóm theo phòng ban)

```
GET /api/procedures
```

SV mở trang chủ Portal, thấy danh sách thủ tục nhóm theo phòng ban. Chỉ trả thủ tục is_active = true.

**Query params:**
| Param | Kiểu | Mô tả |
|-------|------|-------|
| department_id | int (optional) | Lọc theo phòng ban |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "department_id": 1,
      "department_name": "Phòng Công tác Sinh viên",
      "procedures": [
        {
          "type_id": 1,
          "name": "Giấy xác nhận sinh viên",
          "description": "Xin cấp giấy xác nhận đang là sinh viên VJU",
          "sla_total_days": 1,
          "approval_levels": 1,
          "is_fee_required": false,
          "fee_amount": null
        },
        {
          "type_id": 2,
          "name": "Giấy giới thiệu thực tập",
          "description": "Xin cấp giấy giới thiệu đến doanh nghiệp thực tập",
          "sla_total_days": 2,
          "approval_levels": 1,
          "is_fee_required": false,
          "fee_amount": null
        }
      ]
    },
    {
      "department_id": 2,
      "department_name": "Phòng Đào tạo",
      "procedures": [
        {
          "type_id": 3,
          "name": "Phúc khảo điểm thi",
          "description": "Xin chấm lại bài thi cuối kỳ",
          "sla_total_days": 7,
          "approval_levels": 2,
          "is_fee_required": true,
          "fee_amount": 50000
        }
      ]
    }
  ]
}
```

### 2.2 Lấy chi tiết thủ tục (form fields + attachment configs)

```
GET /api/procedures/:type_id
```

SV chọn 1 thủ tục → hệ thống trả về cấu trúc e-form động (trường nào cần điền, minh chứng nào cần upload). Frontend dùng dữ liệu này để render form.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "type_id": 1,
    "name": "Giấy xác nhận sinh viên",
    "description": "Xin cấp giấy xác nhận đang là sinh viên VJU",
    "sla_total_days": 1,
    "approval_levels": 1,
    "is_fee_required": false,
    "fee_amount": null,
    "form_fields": [
      {
        "field_id": 1,
        "field_name": "Mục đích xin cấp",
        "field_key": "purpose",
        "data_type": "dropdown",
        "is_required": true,
        "placeholder": "Chọn mục đích",
        "auto_fill_field": null,
        "dropdown_options": ["Vay vốn", "Visa", "Tạm hoãn NVQS", "Xin việc", "Khác"],
        "display_order": 1
      },
      {
        "field_id": 2,
        "field_name": "Hình thức nhận kết quả",
        "field_key": "result_preference",
        "data_type": "radio",
        "is_required": true,
        "placeholder": null,
        "auto_fill_field": null,
        "dropdown_options": ["Bản điện tử", "Bản cứng", "Cả hai"],
        "display_order": 2
      }
    ],
    "attachment_configs": [
      {
        "config_id": 1,
        "item_name": "CCCD 2 mặt",
        "is_required": false,
        "allowed_formats": "PDF,JPG,PNG",
        "max_size_mb": 5,
        "display_order": 1
      }
    ]
  }
}
```

---

## 3. REQUESTS — Yêu cầu của SV

### 3.1 Lấy danh sách yêu cầu của SV

```
GET /api/requests
```

SV xem tất cả đơn mình đã gửi, lọc theo trạng thái hoặc loại thủ tục.

**Query params:**
| Param | Kiểu | Mô tả |
|-------|------|-------|
| status | string (optional) | Lọc: "Đang xử lý", "Đã duyệt", "Từ chối", "Đã hủy" |
| type_id | int (optional) | Lọc theo loại thủ tục |
| page | int (default: 1) | Trang |
| limit | int (default: 20) | Số lượng/trang |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "request_id": 1,
      "request_code": "REQ-20261030-001",
      "type_name": "Giấy xác nhận sinh viên",
      "department_name": "Phòng Công tác Sinh viên",
      "status": "Đang xử lý",
      "internal_status": "CV đang thẩm định",
      "created_at": "2026-10-28T10:00:00",
      "sla_deadline": "2026-10-29T10:00:00",
      "is_fee_required": false
    },
    {
      "request_id": 2,
      "request_code": "REQ-20261030-002",
      "type_name": "Phúc khảo điểm thi",
      "department_name": "Phòng Đào tạo",
      "status": "Chờ thanh toán",
      "internal_status": "Chờ thanh toán",
      "created_at": "2026-10-29T14:30:00",
      "sla_deadline": null,
      "is_fee_required": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "total_pages": 1
  }
}
```

### 3.2 Gửi yêu cầu mới

```
POST /api/requests
```

SV điền form và gửi đơn. Backend validate business rules (BR-04 chống trùng, BR-05 rate limit), tạo request, gửi notification.

**Request (multipart/form-data):**
```
type_id: 1
form_data: {"purpose": "Vay vốn", "result_preference": "Bản điện tử"}
attachments[0][config_id]: 1
attachments[0][file]: (binary file)
attachments[1][config_id]: 2
attachments[1][file]: (binary file)
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "request_id": 3,
    "request_code": "REQ-20261030-003",
    "status": "Đã gửi",
    "internal_status": "Chờ phân công",
    "sla_deadline": "2026-10-31T10:00:00",
    "created_at": "2026-10-30T10:00:00"
  },
  "message": "Gửi yêu cầu thành công."
}
```

**Response 201 (thủ tục có lệ phí):**
```json
{
  "success": true,
  "data": {
    "request_id": 4,
    "request_code": "REQ-20261030-004",
    "status": "Chờ thanh toán",
    "internal_status": "Chờ thanh toán",
    "fee_amount": 50000,
    "payment_deadline": "2026-10-31T10:00:00",
    "created_at": "2026-10-30T10:00:00"
  },
  "message": "Gửi yêu cầu thành công. Vui lòng thanh toán lệ phí để tiếp tục."
}
```

**Response 409:**
```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_REQUEST",
    "message": "Bạn đã có yêu cầu XN SV đang xử lý."
  }
}
```

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Đã đạt giới hạn 5 yêu cầu/ngày."
  }
}
```

### 3.3 Xem chi tiết yêu cầu

```
GET /api/requests/:request_id
```

SV hoặc cán bộ xem toàn bộ thông tin 1 đơn: dữ liệu form, file đính kèm, trạng thái, kết quả, thông tin thanh toán.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "request_id": 1,
    "request_code": "REQ-20261030-001",
    "type_id": 1,
    "type_name": "Giấy xác nhận sinh viên",
    "department_name": "Phòng Công tác Sinh viên",
    "status": "Đã duyệt",
    "internal_status": "Đã duyệt — Đang chuẩn bị kết quả",
    "form_data": {
      "purpose": "Vay vốn",
      "result_preference": "Bản điện tử"
    },
    "student": {
      "full_name": "Nguyễn Quốc Anh",
      "mssv": "21CS001",
      "class_name": "CS2021A",
      "cohort": "K2021",
      "major": "Khoa học Máy tính",
      "email": "quocanh@st.vju.ac.vn"
    },
    "assigned_staff": {
      "user_id": 10,
      "full_name": "Trần Thị B"
    },
    "assigned_by": {
      "user_id": 5,
      "full_name": "Lê Văn C"
    },
    "attachments": [
      {
        "attachment_id": 1,
        "config_id": 1,
        "item_name": "CCCD 2 mặt",
        "file_name": "cccd_truoc.jpg",
        "file_size": 1048576,
        "mime_type": "image/jpeg",
        "is_supplement": false,
        "download_url": "/api/attachments/1/download",
        "uploaded_at": "2026-10-28T10:00:00"
      }
    ],
    "payment": {
      "is_required": false
    },
    "result": {
      "result_id": 1,
      "pdf_download_url": "/api/results/1/download",
      "verification_code": "VJU-XN-2026-001",
      "signed_by": "PGS.TS Nguyễn Văn D",
      "signed_at": "2026-10-29T15:00:00",
      "pickup_date": null,
      "pickup_location": null,
      "pickup_note": null,
      "handover_confirmed_at": null
    },
    "supplement_count": 0,
    "sla_deadline": "2026-10-29T10:00:00",
    "transferred_to_dept": null,
    "is_draft": false,
    "created_at": "2026-10-28T10:00:00",
    "updated_at": "2026-10-29T15:00:00"
  }
}
```

### 3.4 Hủy yêu cầu

```
PUT /api/requests/:request_id/cancel
```

SV hủy đơn khi đơn đang ở trạng thái "Chờ phân công" — chưa được TP phân công (BR-06).

**Response 200:**
```json
{
  "success": true,
  "message": "Đã hủy yêu cầu."
}
```

**Response 422:**
```json
{
  "success": false,
  "error": {
    "code": "CANNOT_CANCEL",
    "message": "Không thể hủy — yêu cầu đã được phân công xử lý."
  }
}
```

### 3.5 Nộp bổ sung minh chứng

```
POST /api/requests/:request_id/supplements
```

SV upload file bổ sung sau khi CV yêu cầu bổ sung (BR-09). SLA tiếp tục chạy sau khi bổ sung.

**Request (multipart/form-data):**
```
attachments[0][config_id]: 1
attachments[0][file]: (binary file)
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "supplement_count": 1,
    "status": "Đang xử lý",
    "internal_status": "CV đang thẩm định"
  },
  "message": "Nộp bổ sung thành công. SLA tiếp tục tính."
}
```

### 3.6 Xem timeline trạng thái

```
GET /api/requests/:request_id/timeline
```

SV xem lịch sử xử lý đơn theo thời gian. Lấy từ bảng StateAuditLog.

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "action": "submit",
      "note": null,
      "status_after": "Chờ phân công",
      "performed_by": "Nguyễn Quốc Anh",
      "created_at": "2026-10-28T10:00:00"
    },
    {
      "action": "assign",
      "note": "Phân công CV Trần Thị B",
      "status_after": "CV đang thẩm định",
      "performed_by": "Lê Văn C",
      "created_at": "2026-10-28T14:00:00"
    },
    {
      "action": "approve",
      "note": "Đã xác nhận tình trạng SV qua Academic MS",
      "status_after": "Đã duyệt",
      "performed_by": "Trần Thị B",
      "created_at": "2026-10-29T09:00:00"
    }
  ]
}
```

---

## 4. PAYMENT — Thanh toán lệ phí

### 4.1 Tạo giao dịch thanh toán

```
POST /api/requests/:request_id/payments
```

SV chọn phương thức thanh toán. Backend gọi API Payment Gateway, nhận URL thanh toán, trả về cho frontend để redirect SV.

**Request:**
```json
{
  "payment_method": "vnpay_qr"
}
```

Giá trị payment_method: `vnpay_qr`, `momo`, `atm_domestic`, `international_card`

**Response 201:**
```json
{
  "success": true,
  "data": {
    "payment_id": 1,
    "txn_id": "VNP-20261030-001",
    "amount": 50000,
    "payment_method": "vnpay_qr",
    "payment_url": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=5000000&...",
    "expires_at": "2026-10-31T10:00:00"
  },
  "message": "Vui lòng hoàn tất thanh toán."
}
```

**Response 422:**
```json
{
  "success": false,
  "error": {
    "code": "PAYMENT_LOCKED",
    "message": "Đã thất bại 3 lần. Vui lòng liên hệ PKHTC."
  }
}
```

### 4.2 Xem trạng thái thanh toán

```
GET /api/requests/:request_id/payments
```

SV kiểm tra xem thanh toán đã thành công chưa (sau khi redirect về từ cổng thanh toán).

**Response 200:**
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
      "completed_at": "2026-10-30T10:05:00"
    },
    "retry_count": 1,
    "max_retries": 3,
    "payment_deadline": "2026-10-31T10:00:00"
  }
}
```

### 4.3 Webhook từ Payment Gateway

```
POST /api/webhooks/vnpay
POST /api/webhooks/momo
```

Payment Gateway gọi khi SV thanh toán xong. Backend xác thực HMAC signature (BR-32), cập nhật Payment.status, chuyển Request sang "Chờ phân công".

Đây là endpoint do Payment Gateway gọi, không phải frontend. Không cần auth header.

**VNPay gọi (ví dụ):**
```
vnp_TxnRef=REQ-20261030-004
vnp_Amount=5000000
vnp_ResponseCode=00
vnp_SecureHash=abc123...
```

**Response 200 (trả cho VNPay):**
```json
{
  "RspCode": "00",
  "Message": "Confirm Success"
}
```

---

## 5. RESULTS — Kết quả

### 5.1 Tải PDF kết quả

```
GET /api/results/:result_id/download
```

SV tải file PDF giấy tờ đã được render (có thể đã ký số SmartCA + QR code xác thực).

**Response:** Binary file (application/pdf)

**Response 403:**
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

## 6. FEEDBACK — Đánh giá dịch vụ

### 6.1 Gửi đánh giá

```
POST /api/requests/:request_id/feedback
```

SV đánh giá sau khi nhận kết quả. Mỗi đơn chỉ đánh giá 1 lần.

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

**Response 201:**
```json
{
  "success": true,
  "message": "Cảm ơn bạn đã đánh giá!"
}
```

**Response 409:**
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

## 7. VERIFICATION — Cổng xác minh (Public)

### 7.1 Xác minh giấy tờ

```
GET /api/verify/:verification_code
```

Bên thứ ba (nhà tuyển dụng, ngân hàng...) quét QR code trên giấy tờ → kiểm tra tính hợp lệ. Không cần đăng nhập.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "is_valid": true,
    "document_type": "Giấy xác nhận sinh viên",
    "student_name": "Nguyễn Quốc Anh",
    "mssv": "21CS001",
    "issued_date": "2026-10-29",
    "issued_by": "Trường Đại học Việt Nhật"
  }
}
```

**Response 404:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CODE",
    "message": "Mã xác minh không hợp lệ hoặc giấy tờ không tồn tại."
  }
}
```

---

## 8. NOTIFICATIONS — Thông báo

### 8.1 Lấy danh sách thông báo

```
GET /api/notifications
```

Lấy thông báo in-app của user hiện tại. Hiển thị trên icon chuông.

**Query params:**
| Param | Kiểu | Mô tả |
|-------|------|-------|
| is_read | boolean (optional) | Lọc đã đọc/chưa đọc |
| page | int (default: 1) | |
| limit | int (default: 20) | |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "notification_id": 1,
      "request_id": 1,
      "request_code": "REQ-20261030-001",
      "title": "Yêu cầu đã được duyệt",
      "message": "Yêu cầu Giấy xác nhận sinh viên đã được duyệt. Vui lòng kiểm tra kết quả.",
      "is_read": false,
      "sent_at": "2026-10-29T09:00:00"
    }
  ],
  "unread_count": 3,
  "pagination": { ... }
}
```

### 8.2 Đánh dấu đã đọc

```
PUT /api/notifications/:notification_id/read
```

**Response 200:**
```json
{
  "success": true,
  "message": "Đã đánh dấu đọc."
}
```

### 8.3 Đánh dấu tất cả đã đọc

```
PUT /api/notifications/read-all
```

**Response 200:**
```json
{
  "success": true,
  "message": "Đã đánh dấu tất cả đã đọc."
}
```

---

## 9. STAFF — Cán bộ xử lý (CV + TP)

### 9.1 Lấy inbox (danh sách đơn cần xử lý)

```
GET /api/staff/inbox
```

TP thấy đơn "Chờ phân công" trong phòng mình. CV thấy đơn được phân công cho mình.

**Query params:**
| Param | Kiểu | Mô tả |
|-------|------|-------|
| internal_status | string (optional) | Lọc theo trạng thái nội bộ |
| type_id | int (optional) | Lọc theo loại thủ tục |
| page | int (default: 1) | |
| limit | int (default: 20) | |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "request_id": 5,
      "request_code": "REQ-20261030-005",
      "type_name": "Bảo lưu KQHT",
      "student_name": "Phạm Văn E",
      "mssv": "21CS005",
      "internal_status": "Chờ phân công",
      "sla_deadline": "2026-11-04T10:00:00",
      "sla_remaining_hours": 96,
      "is_overdue": false,
      "created_at": "2026-10-30T10:00:00"
    }
  ],
  "summary": {
    "total_pending": 12,
    "overdue": 1,
    "due_today": 3
  },
  "pagination": { ... }
}
```

### 9.2 TP phân công CV

```
PUT /api/staff/requests/:request_id/assign
```

Trưởng phòng chọn chuyên viên xử lý đơn (BR-20: chỉ TP mới được Assign).

**Request:**
```json
{
  "assigned_staff_id": 10
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "internal_status": "CV đang thẩm định",
    "assigned_staff": {
      "user_id": 10,
      "full_name": "Trần Thị B"
    }
  },
  "message": "Đã phân công CV Trần Thị B."
}
```

### 9.3 Lấy danh sách CV trong phòng (để TP chọn khi phân công)

```
GET /api/staff/department-members
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "user_id": 10,
      "full_name": "Trần Thị B",
      "email": "tranthi.b@vju.ac.vn",
      "current_workload": 5
    },
    {
      "user_id": 11,
      "full_name": "Ngô Văn F",
      "email": "ngovan.f@vju.ac.vn",
      "current_workload": 3
    }
  ]
}
```

### 9.4 CV duyệt (thủ tục 1 cấp)

```
PUT /api/staff/requests/:request_id/approve
```

CV trực tiếp duyệt đơn — chỉ áp dụng cho thủ tục 1 cấp (approval_levels = 1). Hệ thống render PDF kết quả.

**Request:**
```json
{
  "note": "Đã xác nhận tình trạng SV qua Academic MS — active."
}
```

**Response 200:**
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

### 9.5 CV trình duyệt TP (thủ tục 2-3 cấp)

```
PUT /api/staff/requests/:request_id/submit-to-head
```

CV hoàn thành thẩm định, trình lên TP phê duyệt.

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

**Response 200:**
```json
{
  "success": true,
  "data": {
    "internal_status": "Chờ TP phê duyệt"
  },
  "message": "Đã trình duyệt Trưởng phòng."
}
```

### 9.6 CV từ chối

```
PUT /api/staff/requests/:request_id/reject
```

CV hoặc TP từ chối đơn. Bắt buộc lý do từ danh mục hoặc ≥ 20 ký tự (BR-12).

**Request:**
```json
{
  "reason_id": 3,
  "note": "SV đang bảo lưu, không đủ điều kiện tạm hoãn NVQS."
}
```

hoặc (lý do tự nhập, không chọn từ danh mục):

```json
{
  "reason_id": null,
  "note": "Giấy tờ đính kèm không hợp lệ, thiếu xác nhận từ Khoa về học phần."
}
```

**Response 200:**
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

**Response 422:**
```json
{
  "success": false,
  "error": {
    "code": "REASON_TOO_SHORT",
    "message": "Lý do từ chối phải có ít nhất 20 ký tự."
  }
}
```

### 9.7 CV yêu cầu bổ sung

```
PUT /api/staff/requests/:request_id/request-supplement
```

CV yêu cầu SV bổ sung minh chứng. SLA tạm dừng + deadline 5 ngày (BR-09). Tối đa 2 lần (BR-11).

**Request:**
```json
{
  "note": "Vui lòng bổ sung giấy xác nhận từ Khoa về học phần thực tập."
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "internal_status": "Cần bổ sung",
    "supplement_count": 1,
    "supplement_deadline": "2026-11-04T10:00:00",
    "sla_paused_at": "2026-10-30T10:00:00"
  },
  "message": "Đã gửi yêu cầu bổ sung cho SV. SLA tạm dừng."
}
```

**Response 422:**
```json
{
  "success": false,
  "error": {
    "code": "MAX_SUPPLEMENTS_REACHED",
    "message": "Đã yêu cầu bổ sung 2 lần. Phải từ chối yêu cầu."
  }
}
```

### 9.8 CV chuyển phòng ban (Transfer)

```
PUT /api/staff/requests/:request_id/transfer
```

CV chuyển đơn sang phòng ban khác. assigned_staff_id reset NULL, đơn vào inbox TP PB nhận (BR-25, BR-26).

**Request:**
```json
{
  "to_department_id": 3,
  "note": "Đã xác nhận đối tượng chính sách. Chuyển PKHTC thẩm định mức miễn giảm."
}
```

**Response 200:**
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

**Response 422:**
```json
{
  "success": false,
  "error": {
    "code": "ALREADY_TRANSFERRED",
    "message": "Yêu cầu đã được chuyển phòng ban 1 lần (giới hạn Release 1)."
  }
}
```

### 9.9 TP phê duyệt (thủ tục 2 cấp)

```
PUT /api/staff/requests/:request_id/approve-head
```

TP phê duyệt cuối cho thủ tục 2 cấp. Hệ thống render PDF / cập nhật Academic MS.

**Request:**
```json
{
  "note": "Đồng ý. Điểm phúc khảo: 7.75."
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "internal_status": "Đã xử lý"
  },
  "message": "Đã phê duyệt."
}
```

### 9.10 TP trình Hiệu trưởng ký (thủ tục 3 cấp)

```
PUT /api/staff/requests/:request_id/submit-to-principal
```

TP phê duyệt chuyên môn xong, trình HT ký số SmartCA. Hệ thống render PDF QĐ.

**Request:**
```json
{
  "note": "Đã xác nhận GPA ≥ 2.0, minh chứng hợp lệ. Trình HT ký QĐ bảo lưu."
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "internal_status": "Chờ HT ký số"
  },
  "message": "Đã trình Hiệu trưởng. Chờ ký số SmartCA."
}
```

### 9.11 TP trả về CV

```
PUT /api/staff/requests/:request_id/return-to-staff
```

TP không đồng ý kết quả thẩm định, trả về CV xem lại.

**Request:**
```json
{
  "note": "Điểm GV1 và GV2 chênh > 2, cần mời GV3 chấm lại."
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "internal_status": "CV đang thẩm định"
  },
  "message": "Đã trả về CV xem lại."
}
```

### 9.12 CV/TP thu hồi duyệt

```
PUT /api/staff/requests/:request_id/revoke
```

Thu hồi quyết định duyệt trong vòng 30 phút, cấp tiếp chưa xử lý, chưa xuất kết quả (BR-13).

**Response 200:**
```json
{
  "success": true,
  "data": {
    "internal_status": "CV đang thẩm định"
  },
  "message": "Đã thu hồi duyệt."
}
```

**Response 422:**
```json
{
  "success": false,
  "error": {
    "code": "REVOKE_EXPIRED",
    "message": "Đã quá 30 phút hoặc cấp tiếp đã xử lý."
  }
}
```

### 9.13 CV/TP chỉ định lịch nhận bản cứng

```
PUT /api/staff/requests/:request_id/assign-pickup
```

CV/TP chỉ định ngày, địa điểm cho SV đến nhận bản cứng.

**Request:**
```json
{
  "pickup_date": "2026-11-02T09:00:00",
  "pickup_location": "Phòng PCTSV, Tầng 2, Tòa A",
  "pickup_note": "Mang theo CCCD. Nhận trong giờ hành chính 8h–17h."
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Đã chỉ định lịch nhận bản cứng. SV sẽ được thông báo."
}
```

### 9.14 Xác nhận đã giao bản cứng

```
PUT /api/staff/requests/:request_id/confirm-handover
```

SV đến nhận, cán bộ xác nhận đã giao.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "handover_confirmed_at": "2026-11-02T09:15:00"
  },
  "message": "Đã xác nhận giao bản cứng."
}
```

---

## 10. PRINCIPAL — Hiệu trưởng ký số

### 10.1 Lấy danh sách QĐ chờ ký

```
GET /api/principal/pending-signatures
```

HT mở Portal, thấy các QĐ cần ký số SmartCA.

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "request_id": 5,
      "request_code": "REQ-20261030-005",
      "type_name": "Bảo lưu KQHT",
      "student_name": "Phạm Văn E",
      "submitted_by": "Lê Văn C (TP PĐT)",
      "submitted_at": "2026-10-30T16:00:00",
      "sub_sla_deadline": "2026-10-31T16:00:00",
      "pdf_preview_url": "/api/results/5/preview"
    }
  ]
}
```

### 10.2 Ký số SmartCA

```
POST /api/principal/requests/:request_id/sign
```

HT bấm "Ký số". Backend gọi API SmartCA, SmartCA đẩy thông báo lên app ĐT HT. HT xác nhận FaceID/vân tay.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "smartca_transaction_id": "SMARTCA-20261030-001",
    "internal_status": "Đã duyệt — Có kết quả",
    "signed_at": "2026-10-30T16:05:00"
  },
  "message": "Ký số thành công."
}
```

**Response 504:**
```json
{
  "success": false,
  "error": {
    "code": "SMARTCA_TIMEOUT",
    "message": "SmartCA không phản hồi trong 5 phút. Vui lòng thử lại."
  }
}
```

---

## 11. ADMIN — Quản trị hệ thống

### 11.1 Quản lý thủ tục

```
GET    /api/admin/procedures                  — Danh sách tất cả thủ tục (kể cả inactive)
POST   /api/admin/procedures                  — Tạo thủ tục mới
GET    /api/admin/procedures/:type_id         — Chi tiết thủ tục
PUT    /api/admin/procedures/:type_id         — Cập nhật thủ tục
DELETE /api/admin/procedures/:type_id         — Soft delete (is_active = false, BR-18)
```

**POST /api/admin/procedures — Request:**
```json
{
  "name": "Giấy xác nhận sinh viên",
  "description": "Xin cấp giấy xác nhận đang là sinh viên VJU",
  "department_id": 1,
  "sla_total_days": 1,
  "approval_levels": 1,
  "sub_sla_l1_days": 1,
  "sub_sla_l2_days": null,
  "sub_sla_l3_days": null,
  "result_type": "PDF",
  "template_file_path": "/templates/xac_nhan_sv.docx",
  "is_fee_required": false,
  "fee_amount": null,
  "form_fields": [
    {
      "field_name": "Mục đích xin cấp",
      "field_key": "purpose",
      "data_type": "dropdown",
      "is_required": true,
      "dropdown_options": ["Vay vốn", "Visa", "Tạm hoãn NVQS", "Xin việc", "Khác"],
      "display_order": 1
    }
  ],
  "attachment_configs": [
    {
      "item_name": "CCCD 2 mặt",
      "is_required": false,
      "allowed_formats": "PDF,JPG,PNG",
      "max_size_mb": 5,
      "display_order": 1
    }
  ]
}
```

### 11.2 Quản lý tài khoản

```
GET    /api/admin/users                       — Danh sách users (lọc role, department)
POST   /api/admin/users/import-students       — Import SV từ file Excel
POST   /api/admin/users                       — Tạo tài khoản cán bộ
PUT    /api/admin/users/:user_id              — Cập nhật (đổi role, department, lock...)
```

**POST /api/admin/users/import-students — Request (multipart/form-data):**
```
file: students_2026.xlsx
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "total_rows": 150,
    "imported": 148,
    "skipped": 2,
    "errors": [
      { "row": 45, "email": "invalid-email", "reason": "Email không hợp lệ" },
      { "row": 89, "email": "duplicate@st.vju.ac.vn", "reason": "Email đã tồn tại" }
    ]
  }
}
```

### 11.3 Quản lý ngày nghỉ

```
GET    /api/admin/holidays                    — Danh sách ngày nghỉ
POST   /api/admin/holidays                    — Thêm ngày nghỉ
PUT    /api/admin/holidays/:holiday_id        — Sửa
DELETE /api/admin/holidays/:holiday_id        — Xóa
```

**POST /api/admin/holidays — Request:**
```json
{
  "holiday_date": "2026-09-02",
  "description": "Quốc khánh 2/9",
  "type": "holiday",
  "year": 2026
}
```

### 11.4 Quản lý danh mục lý do từ chối

```
GET    /api/admin/rejection-reasons           — Danh sách
POST   /api/admin/rejection-reasons           — Thêm
PUT    /api/admin/rejection-reasons/:id       — Sửa
DELETE /api/admin/rejection-reasons/:id       — Soft delete
```

### 11.5 Lấy danh mục lý do từ chối (cho CV/TP chọn)

```
GET /api/rejection-reasons
```

CV/TP gọi khi bấm "Từ chối" để hiển thị dropdown chọn lý do.

**Response 200:**
```json
{
  "success": true,
  "data": [
    { "reason_id": 1, "reason_text": "Hồ sơ không đầy đủ" },
    { "reason_id": 2, "reason_text": "Không thuộc đối tượng" },
    { "reason_id": 3, "reason_text": "Quá thời hạn quy định" }
  ]
}
```

### 11.6 Dashboard thống kê

```
GET /api/admin/dashboard
```

**Query params:**
| Param | Kiểu | Mô tả |
|-------|------|-------|
| from_date | date (optional) | Từ ngày |
| to_date | date (optional) | Đến ngày |
| department_id | int (optional) | Lọc phòng ban |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_requests": 450,
      "pending": 23,
      "processing": 15,
      "completed": 380,
      "rejected": 22,
      "cancelled": 10
    },
    "sla_compliance": {
      "on_time": 342,
      "overdue": 38,
      "compliance_rate": 90.0
    },
    "satisfaction": {
      "avg_star_rating": 4.2,
      "avg_speed_score": 4.0,
      "avg_attitude_score": 4.5,
      "avg_convenience_score": 4.1,
      "total_feedbacks": 280
    },
    "by_procedure": [
      {
        "type_name": "Giấy xác nhận sinh viên",
        "total": 200,
        "avg_processing_hours": 18.5
      },
      {
        "type_name": "Phúc khảo điểm thi",
        "total": 80,
        "avg_processing_hours": 120.0
      }
    ],
    "by_department": [
      {
        "department_name": "Phòng Công tác Sinh viên",
        "total": 250,
        "on_time_rate": 92.0
      }
    ]
  }
}
```

---

## 12. FILE DOWNLOAD — Tải file

### 12.1 Tải file đính kèm

```
GET /api/attachments/:attachment_id/download
```

SV hoặc cán bộ tải file minh chứng đã upload.

**Response:** Binary file

### 12.2 Xem trước PDF kết quả (cho HT trước khi ký)

```
GET /api/results/:result_id/preview
```

HT xem PDF trước khi quyết định ký số.

**Response:** Binary file (application/pdf)

---

## Tổng hợp tất cả endpoints

| # | Method | URL | Actor | Mô tả |
|---|--------|-----|-------|-------|
| 1 | POST | /api/auth/google | All | Đăng nhập Google OAuth |
| 2 | GET | /api/auth/me | All | Lấy thông tin user hiện tại |
| 3 | POST | /api/auth/logout | All | Đăng xuất |
| 4 | GET | /api/procedures | SV | Danh sách thủ tục (nhóm theo PB) |
| 5 | GET | /api/procedures/:type_id | SV | Chi tiết thủ tục + form fields |
| 6 | GET | /api/requests | SV | Danh sách đơn của tôi |
| 7 | POST | /api/requests | SV | Gửi yêu cầu mới |
| 8 | GET | /api/requests/:id | SV/Staff | Chi tiết yêu cầu |
| 9 | PUT | /api/requests/:id/cancel | SV | Hủy đơn (BR-06) |
| 10 | POST | /api/requests/:id/supplements | SV | Nộp bổ sung |
| 11 | GET | /api/requests/:id/timeline | SV/Staff | Timeline trạng thái |
| 12 | POST | /api/requests/:id/payments | SV | Tạo giao dịch thanh toán |
| 13 | GET | /api/requests/:id/payments | SV | Xem trạng thái thanh toán |
| 14 | POST | /api/webhooks/vnpay | System | Webhook VNPay |
| 15 | POST | /api/webhooks/momo | System | Webhook MoMo |
| 16 | GET | /api/results/:id/download | SV | Tải PDF kết quả |
| 17 | POST | /api/requests/:id/feedback | SV | Đánh giá dịch vụ |
| 18 | GET | /api/verify/:code | Public | Xác minh giấy tờ |
| 19 | GET | /api/notifications | All | Danh sách thông báo |
| 20 | PUT | /api/notifications/:id/read | All | Đánh dấu đã đọc |
| 21 | PUT | /api/notifications/read-all | All | Đánh dấu tất cả đã đọc |
| 22 | GET | /api/staff/inbox | Staff | Inbox đơn cần xử lý |
| 23 | PUT | /api/staff/requests/:id/assign | TP | Phân công CV |
| 24 | GET | /api/staff/department-members | TP | DS chuyên viên trong phòng |
| 25 | PUT | /api/staff/requests/:id/approve | CV | Duyệt (1 cấp) |
| 26 | PUT | /api/staff/requests/:id/submit-to-head | CV | Trình TP (2-3 cấp) |
| 27 | PUT | /api/staff/requests/:id/reject | CV/TP | Từ chối |
| 28 | PUT | /api/staff/requests/:id/request-supplement | CV | Yêu cầu bổ sung |
| 29 | PUT | /api/staff/requests/:id/transfer | CV | Chuyển phòng ban |
| 30 | PUT | /api/staff/requests/:id/approve-head | TP | Phê duyệt (2 cấp) |
| 31 | PUT | /api/staff/requests/:id/submit-to-principal | TP | Trình HT ký (3 cấp) |
| 32 | PUT | /api/staff/requests/:id/return-to-staff | TP | Trả về CV |
| 33 | PUT | /api/staff/requests/:id/revoke | CV/TP | Thu hồi duyệt (BR-13) |
| 34 | PUT | /api/staff/requests/:id/assign-pickup | CV/TP | Chỉ định lịch nhận bản cứng |
| 35 | PUT | /api/staff/requests/:id/confirm-handover | CV/TP | Xác nhận đã giao |
| 36 | GET | /api/principal/pending-signatures | HT | DS QĐ chờ ký |
| 37 | POST | /api/principal/requests/:id/sign | HT | Ký số SmartCA |
| 38 | GET | /api/admin/procedures | Admin | DS thủ tục (kể cả inactive) |
| 39 | POST | /api/admin/procedures | Admin | Tạo thủ tục mới |
| 40 | PUT | /api/admin/procedures/:id | Admin | Cập nhật thủ tục |
| 41 | DELETE | /api/admin/procedures/:id | Admin | Soft delete thủ tục |
| 42 | GET | /api/admin/users | Admin | DS người dùng |
| 43 | POST | /api/admin/users/import-students | Admin | Import SV từ Excel |
| 44 | POST | /api/admin/users | Admin | Tạo TK cán bộ |
| 45 | PUT | /api/admin/users/:id | Admin | Cập nhật TK |
| 46 | GET | /api/admin/holidays | Admin | DS ngày nghỉ |
| 47 | POST | /api/admin/holidays | Admin | Thêm ngày nghỉ |
| 48 | PUT | /api/admin/holidays/:id | Admin | Sửa ngày nghỉ |
| 49 | DELETE | /api/admin/holidays/:id | Admin | Xóa ngày nghỉ |
| 50 | GET | /api/admin/rejection-reasons | Admin | DS lý do từ chối |
| 51 | POST | /api/admin/rejection-reasons | Admin | Thêm lý do |
| 52 | PUT | /api/admin/rejection-reasons/:id | Admin | Sửa lý do |
| 53 | DELETE | /api/admin/rejection-reasons/:id | Admin | Soft delete lý do |
| 54 | GET | /api/rejection-reasons | CV/TP | Lấy dropdown lý do từ chối |
| 55 | GET | /api/admin/dashboard | Admin | Dashboard thống kê |
| 56 | GET | /api/attachments/:id/download | SV/Staff | Tải file đính kèm |
| 57 | GET | /api/results/:id/preview | HT | Xem trước PDF |
