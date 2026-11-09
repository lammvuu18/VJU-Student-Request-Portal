# Plan: Module 4 — Bảo lưu Kết quả học tập (Quy trình 3 cấp & Ký số SmartCA)

## Summary
Triển khai toàn diện **Module 4 — Thủ tục Bảo lưu kết quả học tập** (Mã thủ tục: 4) theo đặc tả `docs/expected-results-all-modules.md`:
1. **Quy trình phê duyệt 3 cấp hoàn chỉnh:** Sinh viên nộp đơn $\rightarrow$ Trưởng phòng phân công $\rightarrow$ Chuyên viên thẩm định (kiểm tra GPA $\ge$ 2.0 & minh chứng) $\rightarrow$ Trình Trưởng phòng (`submit-to-head`) $\rightarrow$ Trưởng phòng phê duyệt chuyên môn & trình Hiệu trưởng (`submit-to-principal`) $\rightarrow$ Hiệu trưởng ký số SmartCA (`sign`).
2. **Tích hợp Mock Services:**
   - **Academic MS:** Tự động điền GPA sinh viên (`getStudentGPA`), cập nhật trạng thái học vụ sang `"suspended"` (`updateStudentStatus`) sau khi Hiệu trưởng ký duyệt.
   - **SmartCA Service:** Mô phỏng ký số từ xa (Remote Signing), sinh mã giao dịch `smartca_transaction_id`, đóng dấu mộc chữ ký số điện tử của Hiệu trưởng vào file PDF Quyết định bảo lưu kèm mã QR xác thực `verify`.
3. **Frontend Kết nối API thực tế:**
   - Sinh viên: Xem tiến độ 3 cấp rõ ràng trên Timeline, tải Quyết định bảo lưu PDF có dấu ký số SmartCA.
   - Cán bộ & Trưởng phòng: Giao diện thẩm định, các nút hành động "Trình Trưởng phòng", "Trình Hiệu trưởng", "Trả lại chuyên viên".
   - Hiệu trưởng: Trang Danh sách quyết định chờ ký (`/principal/decisions`) và Chi tiết ký số (`/principal/decision/:id`) kết nối 100% dữ liệu backend, ký số SmartCA thời gian thực.

---

## User Story
- **Là một Sinh viên**, tôi muốn nộp đơn xin bảo lưu kết quả học tập trực tuyến, hệ thống tự động điền GPA của tôi và tôi có thể theo dõi tiến độ duyệt qua từng cấp để nhận Quyết định bảo lưu có ký số hợp lệ của Hiệu trưởng.
- **Là một Chuyên viên Phòng Đào tạo**, tôi muốn thẩm định điều kiện học vụ (GPA $\ge$ 2.0) và minh chứng sức khỏe/nghĩa vụ của sinh viên, từ chối nếu không đạt điều kiện hoặc trình lên Trưởng phòng phê duyệt.
- **Là một Trưởng phòng Đào tạo**, tôi muốn xem xét kết quả thẩm định của chuyên viên, trả lại nếu chưa đạt hoặc phê duyệt chuyên môn để hệ thống sinh bản thảo Quyết định và trình Hiệu trưởng ký.
- **Là Hiệu trưởng**, tôi muốn xem danh sách các Quyết định bảo lưu chờ ký, xem trước nội dung văn bản và thực hiện ký số điện tử SmartCA an toàn, nhanh chóng.

---

## Problem → Solution
- **Hiện trạng:**
  - Thủ tục ID 4 đã có trong danh mục (`ProcedureType` ID 4, `approval_levels = 3`, `sla_total_days = 5`) nhưng backend chưa có các endpoint duyệt 3 cấp (`submit-to-head`, `submit-to-principal`, `return-to-staff`).
  - Chưa có endpoint dành cho Hiệu trưởng (`/api/principal/pending-signatures`, `/api/principal/requests/:id/sign`, `/api/principal/requests/:id/return-to-head`).
  - Giao diện Hiệu trưởng (`PrincipalDecisionList.js`, `PrincipalDecisionDetail.js`) đang dùng dữ liệu mock cứng, chưa gọi API backend.
  - Chưa có hàm sinh Quyết định bảo lưu chính thức có con dấu ký số điện tử SmartCA của Hiệu trưởng.
- **Giải pháp:**
  - Xây dựng module backend `accounts/principal_views.py` và bổ sung các view 3 cấp trong `accounts/staff_views.py`.
  - Mở rộng `accounts/services.py` với `MockSmartCAService` và hàm `generate_decision_pdf` kết hợp đóng dấu số điện tử.
  - Bổ sung `updateStudentStatus` vào `AcademicMSService` để tự động chuyển trạng thái học vụ sinh viên thành `suspended`.
  - Kết nối toàn bộ giao diện Frontend (`PrincipalDecisionList`, `PrincipalDecisionDetail`, `StaffRequestDetail`, `DeptHeadRequestDetail`) với API backend.
  - Viết bộ kiểm thử tự động toàn diện (`accounts/tests_module4.py`) bao phủ đầy đủ 7 test cases theo `docs/expected-results-all-modules.md`.

---

## Metadata
- **Complexity**: Large (Cross-cutting: 3-tier approval state machine, PDF digital seal generation, external MS mocking, Principal portal frontend & backend).
- **Source PRD**: `docs/expected-results-all-modules.md` (Mục MODULE 4 — Bảo lưu KQHT).
- **Estimated Files**: 8-10 files
  - Backend: `accounts/principal_views.py` (Mới), `accounts/staff_views.py` (Cập nhật), `accounts/services.py` (Cập nhật), `accounts/urls.py` (Cập nhật), `accounts/tests_module4.py` (Mới).
  - Frontend: `vju-portal-admin/src/services/api.js`, `vju-portal-admin/src/components/principal/PrincipalDecisionList.js`, `vju-portal-admin/src/components/principal/PrincipalDecisionDetail.js`, `vju-portal-admin/src/components/staff/StaffRequestDetail.js`, `vju-portal-admin/src/components/depthead/DeptHeadRequestDetail.js`.

---

## UX Design & State Transitions

### Sơ đồ Luồng trạng thái 3 cấp (State Machine)
```
[Sinh viên gửi đơn (GPA >= 2.0)]
               │
               ▼
   [internal_status: "Chờ phân công"] (status: "Đã gửi")
               │
               ▼ (TP phân công: PUT /api/staff/requests/:id/assign)
   [internal_status: "CV đang thẩm định"] (status: "Đang xử lý")
               │
     ┌─────────┴─────────────────────────────────────────┐
     │ (GPA < 2.0 hoặc thiếu minh chứng)                 │ (Hợp lệ: PUT /api/staff/requests/:id/submit-to-head)
     ▼                                                   ▼
[internal_status: "Từ chối"]               [internal_status: "Chờ TP phê duyệt"]
                                                         │
                               ┌─────────────────────────┴─────────────────────────┐
                               │ (TP trả về: return-to-staff)                       │ (TP duyệt: submit-to-principal)
                               ▼                                                   ▼
                  [internal_status: "CV đang thẩm định"]              [internal_status: "Chờ HT ký số"]
                                                                      - Hệ thống render PDF bản thảo QĐ
                                                                      - Result lưu đường dẫn PDF
                                                                                   │
                                                   ┌───────────────────────────────┴───────────────────────────────┐
                                                   │ (HT trả lại: return-to-head)                                  │ (HT ký số SmartCA: POST .../sign)
                                                   ▼                                                               ▼
                                      [internal_status: "Chờ TP phê duyệt"]                 [internal_status: "Đã duyệt — Có kết quả"]
                                                                                            - Đóng dấu mộc ký số SmartCA lên PDF
                                                                                            - StudentRegistry status -> "suspended"
                                                                                            - Gửi Notification cho SV & TP
```

### Interaction Changes
| Người dùng | Màn hình | Thao tác trước đây (Mock) | Thao tác mới (Tích hợp thực tế) |
|---|---|---|---|
| **Sinh viên** | `/student/request/new/4` | Tự gõ điểm GPA | Hệ thống tự động auto-fill GPA từ Academic MS (3.2), sinh viên điền kỳ bảo lưu và đính kèm minh chứng |
| **Chuyên viên** | `/staff/request/:id` | Chỉ có nút Duyệt (1 cấp) | Thêm nút "Trình Trưởng phòng", nhập ghi chú thẩm định và kết quả kiểm tra điều kiện |
| **Trưởng phòng** | `/depthead/request/:id` | Chỉ có nút Duyệt trực tiếp | Với thủ tục 3 cấp: có nút "Trình Hiệu trưởng ký số" và "Trả lại chuyên viên" |
| **Hiệu trưởng** | `/principal/decisions` | Dữ liệu mock tĩnh | Gọi `GET /api/principal/pending-signatures`, hiển thị số lượng và danh sách đơn chờ ký thật từ DB |
| **Hiệu trưởng** | `/principal/decision/:id` | Bấm ký chỉ đổi state local | Hiển thị preview file PDF Quyết định thật, bấm "Ký số SmartCA" gọi API ký số, cập nhật trạng thái hồ sơ |

---

## Codebase Intelligence & Unified Discovery Table

| Hạng mục | Vị trí file tham chiếu | Pattern / Quy ước áp dụng | Đoạn code mẫu |
|---|---|---|---|
| **Auth & Permission** | `accounts/views.py:15-35` | Helper `_get_authenticated_user`, kiểm tra `user.role == 'principal'` | `if user.role != 'principal': return _json_error("FORBIDDEN", ...)` |
| **State Audit Log** | `accounts/staff_views.py:45-65` | `StateAuditLog.objects.create(...)` ghi nhận mọi chuyển trạng thái | `action="submit_for_signature", from_state=..., to_state=...` |
| **Notification** | `accounts/services.py:180-210` | Tạo thông báo cho SV, TP, HT theo chuẩn chuông thông báo | `Notification.objects.create(user=..., title=..., message=...)` |
| **PDF Generation** | `accounts/services.py:242-311` | ReportLab Canvas A4, TTFont Tiếng Việt, QR code xác thực | `generate_decision_pdf(req, verification_code, smartca_info=None)` |
| **Academic MS** | `accounts/services.py:32-74` | Class-based mock service | `AcademicMSService.get_student_gpa(mssv)` & `updateStudentStatus` |
| **Error Handling** | `accounts/views.py:28` | Helper `_json_error(code, message, status)` | `return _json_error("INVALID_STATE", "...", status=422)` |

---

## Technical Architecture & Constraints

### 1. Mock SmartCA Service (`accounts/services.py`)
Mô phỏng quy trình ký số từ xa (Remote Signing / Cloud CA) theo quy chuẩn dịch vụ Viettel / VNPT SmartCA:
- Phương thức `request_signature(request_obj, user_obj)`:
  - Sinh mã giao dịch: `MOCK-SMARTCA-<timestamp>-<request_id>`.
  - Sinh mã xác thực OTP / xác thực sinh trắc học mô phỏng.
- Phương thức `stamp_pdf_with_digital_signature(pdf_path, sign_data)`:
  - Sử dụng ReportLab để vẽ con dấu chữ ký điện tử (Digital Signature Box) vào góc dưới trang Quyết định:
    - Khung viền nét đứt / viền đỏ chứng thư số.
    - Icon bảo mật / dấu tick xác thực số.
    - Dòng chữ: *"KÝ BỞI: [TÊN HIỆU TRƯỞNG] - HIỆU TRƯỞNG TRƯỜNG ĐẠI HỌC VIỆT NHẬT"*.
    - *"Thời gian ký: YYYY-MM-DD HH:MM:SS"*.
    - *"Chứng thư số: VNPT-CA / Viettel-CA, Serial: 5402...*.

### 2. Mock Academic MS (`accounts/services.py`)
- `get_student_gpa(mssv)`: Trả về `3.2` (hoặc mock theo mã SV).
- `update_student_status(mssv, status)`:
  - Cập nhật trường `academic_status` của sinh viên trong bảng `StudentRegistry` thành `"suspended"` (hoặc `"active"`).

### 3. Danh sách Endpoints mới cần triển khai
1. `PUT /api/staff/requests/:id/submit-to-head`:
   - Quyền: Chuyên viên được phân công (`staff`).
   - Yêu cầu: `internal_status == "CV đang thẩm định"`.
   - Chuyển `internal_status` $\rightarrow$ `"Chờ TP phê duyệt"`.
   - Ghi nhận `review_data` vào `form_data` hoặc trường kiểm tra.
2. `PUT /api/staff/requests/:id/submit-to-principal`:
   - Quyền: Trưởng phòng thuộc phòng ban xử lý (`dept_head`).
   - Yêu cầu: Thủ tục 3 cấp (`approval_levels == 3`), `internal_status == "Chờ TP phê duyệt"`.
   - Hành động: Sinh bản thảo file PDF Quyết định bảo lưu, tạo bản ghi `Result`, cập nhật `internal_status` $\rightarrow$ `"Chờ HT ký số"`.
   - Gửi thông báo cho Hiệu trưởng.
3. `PUT /api/staff/requests/:id/return-to-staff`:
   - Quyền: Trưởng phòng (`dept_head`).
   - Yêu cầu: `internal_status == "Chờ TP phê duyệt"`.
   - Chuyển `internal_status` $\rightarrow$ `"CV đang thẩm định"`.
   - Gửi thông báo cho Chuyên viên được phân công.
4. `GET /api/principal/pending-signatures`:
   - Quyền: Hiệu trưởng (`principal`). Các vai trò khác trả `403 FORBIDDEN`.
   - Lọc các đơn có `internal_status == "Chờ HT ký số"` và `procedure_type__approval_levels == 3`.
5. `POST /api/principal/requests/:id/sign`:
   - Quyền: Hiệu trưởng (`principal`).
   - Yêu cầu: `internal_status == "Chờ HT ký số"`.
   - Thực hiện ký số SmartCA, chèn dấu số vào PDF Quyết định, cập nhật `Result`, chuyển trạng thái `"Đã duyệt — Có kết quả"`, cập nhật trạng thái học vụ sinh viên.
6. `POST /api/principal/requests/:id/return-to-head`:
   - Quyền: Hiệu trưởng (`principal`).
   - Trả lại hồ sơ cho Trưởng phòng: chuyển `internal_status` $\rightarrow$ `"Chờ TP phê duyệt"`.

---

## Detailed Step-by-Step Implementation Tasks

### Task 1: Mở rộng Mock Services & Bộ tạo PDF Quyết định (`accounts/services.py`)
- Bổ sung `AcademicMSService.update_student_status(mssv, status)` cập nhật trực tiếp `StudentRegistry`.
- Xây dựng class `MockSmartCAService`:
  - `request_signature(request_obj, signer_user)`
  - `verify_and_finalize(transaction_id)`
- Xây dựng hàm `generate_decision_pdf(req, verification_code, smartca_data=None)`:
  - Sinh mẫu chuẩn "QUYẾT ĐỊNH VỀ VIỆC CHO PHÉP SINH VIÊN BẢO LƯU KẾT QUẢ HỌC TẬP".
  - Có Quốc hiệu, Tiêu ngữ, Căn cứ quy chế đào tạo, Điều 1, Điều 2.
  - Khi chưa ký: Hiển thị dòng chữ mờ "[BẢN THẢO TRÌNH KÝ]".
  - Khi đã ký số: Đóng khung dấu mộc chữ ký số SmartCA trang trọng ở phần chữ ký Hiệu trưởng.

### Task 2: Triển khai các Endpoints 3 cấp cho Cán bộ & Trưởng phòng (`accounts/staff_views.py`)
- Cập nhật hàm `staff_submit_to_head_view(request, request_id)`:
  - Kiểm tra quyền CV, validate dữ liệu review, chuyển trạng thái `"Chờ TP phê duyệt"`.
- Viết mới hàm `staff_submit_to_principal_view(request, request_id)`:
  - Kiểm tra quyền TP, kiểm tra thủ tục 3 cấp, gọi sinh PDF bản thảo, tạo `Result`, chuyển `"Chờ HT ký số"`, gửi thông báo cho HT.
- Viết mới hàm `staff_return_to_staff_view(request, request_id)`:
  - Trưởng phòng trả lại đơn cho Chuyên viên kèm lý do.

### Task 3: Triển khai Module Hiệu trưởng (`accounts/principal_views.py`)
- Tạo mới file `accounts/principal_views.py` chứa các API:
  - `principal_pending_signatures_view`: Lấy danh sách quyết định chờ ký.
  - `principal_sign_request_view`: Thực hiện ký số SmartCA cho quyết định.
  - `principal_return_to_head_view`: Hiệu trưởng trả lại hồ sơ cho Trưởng phòng.
  - `principal_decision_detail_view`: Xem chi tiết quyết định và đường dẫn preview PDF.
- Đăng ký toàn bộ routes vào `accounts/urls.py`.

### Task 4: Cập nhật API Client Frontend (`vju-portal-admin/src/services/api.js`)
- Cập nhật `principalApi`:
  - `getPendingSignatures`: gọi endpoint thật `/principal/pending-signatures`.
  - `signSmartCA`: gọi endpoint thật `/principal/requests/:id/sign`.
  - `returnToHead`: gọi endpoint thật `/principal/requests/:id/return-to-head`.
- Cập nhật `staffApi` & `deptHeadApi`:
  - Bổ sung `submitToHead`, `submitToPrincipal`, `returnToStaff`.

### Task 5: Kết nối Giao diện Frontend
- **Giao diện Hiệu trưởng:**
  - `PrincipalDecisionList.js`: Nạp dữ liệu thực từ `principalApi.getPendingSignatures()`, hiển thị danh sách đơn thật từ DB.
  - `PrincipalDecisionDetail.js`: Tải chi tiết đơn, nhúng PDF Viewer xem trước quyết định thật, nút bấm Ký số gọi API thật và hiển thị thông báo thành công.
- **Giao diện Chuyên viên & Trưởng phòng:**
  - `StaffRequestDetail.js`: Hiển thị nút "Trình Trưởng phòng" khi đơn ở trạng thái CV đang thẩm định và thủ tục là 2-3 cấp.
  - `DeptHeadRequestDetail.js`: Hiển thị nút "Trình Hiệu trưởng ký số" cho thủ tục 3 cấp.

### Task 6: Viết Bộ Test Tự Động Toàn Diện (`accounts/tests_module4.py`)
Viết đầy đủ các test cases kiểm tra chính xác checklist của PRD:
1. `test_4_1_1_create_request_autofill_gpa`: Nộp đơn bảo lưu, kiểm tra GPA tự động điền 3.2, SLA 5 ngày, file đính kèm.
2. `test_4_2_1_submit_to_principal`: TP trình HT ký, kiểm tra sinh file PDF Quyết định, trạng thái `"Chờ HT ký số"`, notification gửi cho HT.
3. `test_4_3_1_get_pending_signatures_success`: HT lấy danh sách đơn chờ ký thành công.
4. `test_4_3_2_get_pending_signatures_forbidden`: Vai trò không phải HT (ví dụ TP) bị từ chối 403.
5. `test_4_4_1_sign_smartca_success`: HT ký số thành công, có mã giao dịch SmartCA, cập nhật trạng thái học vụ SV thành `"suspended"`, thông báo cho SV, tải được PDF có chữ ký số.
6. `test_4_4_2_sign_smartca_timeout`: Mô phỏng lỗi timeout từ chối ký hoặc quá hạn, trạng thái vẫn giữ nguyên `"Chờ HT ký số"`.
7. `test_4_5_cv_reject_low_gpa`: CV từ chối đơn khi GPA < 2.0.

---

## Acceptance Criteria Checklist
- [ ] Gửi đơn Bảo lưu KQHT (Thủ tục 4) tự động lấy GPA từ Academic MS (3.2), khởi tạo trạng thái `Chờ phân công` với SLA 5 ngày.
- [ ] Chuyên viên thẩm định có thể từ chối đơn nếu GPA < 2.0; nếu hợp lệ có thể chuyển tiếp "Trình Trưởng phòng".
- [ ] Trưởng phòng có thể trả lại đơn về cho Chuyên viên hoặc chuyển tiếp "Trình Hiệu trưởng ký số".
- [ ] Khi Trình Hiệu trưởng, hệ thống tự động kết xuất văn bản Quyết định bảo lưu PDF bản thảo và gửi thông báo tới Hiệu trưởng.
- [ ] Hiệu trưởng đăng nhập thấy danh sách đơn chờ ký tại `/principal/decisions`, người khác truy cập bị báo lỗi 403.
- [ ] Hiệu trưởng xem được văn bản quyết định và thực hiện Ký số SmartCA thành công.
- [ ] Sau khi ký số: PDF được đóng dấu mộc điện tử chính thức, trạng thái đơn chuyển thành `"Đã duyệt — Có kết quả"`, trạng thái sinh viên trong `StudentRegistry` chuyển thành `"suspended"`.
- [ ] Sinh viên nhận thông báo và tải được file PDF Quyết định đã có con dấu ký số.
- [ ] Toàn bộ 7/7 bài test tự động của Module 4 chạy vượt qua 100% (`OK`).
- [ ] Frontend biên dịch không có lỗi (`npm run build` thành công).
