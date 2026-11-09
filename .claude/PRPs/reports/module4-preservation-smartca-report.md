# Báo cáo Triển khai: Module 4 — Bảo lưu Kết quả học tập (Quy trình 3 cấp & Ký số SmartCA)

## 1. Tổng quan
- **Nhiệm vụ:** Triển khai toàn diện Module 4 theo đặc tả `docs/expected-results-all-modules.md`.
- **Nhánh Git:** `feature/module4-preservation-smartca`.
- **Trạng thái:** Hoàn thành 100% tất cả yêu cầu, toàn bộ 32/32 tests (Module 1, Payment, Module 4) và frontend build đều PASS.

---

## 2. Các thành phần đã triển khai

### Backend
1. **Mock Services & PDF Generator (`accounts/services.py`):**
   - Bổ sung `AcademicMSService.updateStudentStatus(mssv, status)` và `update_student_status`. Tự động cập nhật `StudentRegistry.academic_status = 'suspended'` khi Hiệu trưởng ký duyệt.
   - Thêm `MockSmartCAService` hỗ trợ `requestSignature`, `sign_decision`, và mô phỏng lỗi 504 `SMARTCA_TIMEOUT`.
   - Xây dựng `generate_decision_pdf(req, verification_code, smartca_data=None)` xuất văn bản Quyết định bảo lưu khổ A4 chuẩn thể thức văn bản:
     - Khi chưa ký: hiển thị khung mờ `[BẢN THẢO TRÌNH KÝ]`.
     - Khi đã ký số: đóng dấu mộc viền đỏ chữ ký điện tử SmartCA (Ký bởi, chức danh, thời gian ký, chứng thư số, số serial) kèm mã QR tra cứu văn bản.

2. **Endpoints 3 cấp cho Cán bộ & Trưởng phòng (`accounts/staff_views.py`):**
   - `PUT /api/staff/requests/:id/submit-to-head`: Chuyên viên thẩm định điều kiện (GPA $\ge$ 2.0) và trình Trưởng phòng phê duyệt.
   - `PUT /api/staff/requests/:id/submit-to-principal`: Trưởng phòng phê duyệt chuyên môn, hệ thống sinh PDF bản thảo, lưu `Result`, chuyển trạng thái `Chờ HT ký số`, gửi thông báo cho Hiệu trưởng.
   - `PUT /api/staff/requests/:id/return-to-staff`: Trưởng phòng trả lại hồ sơ cho chuyên viên thẩm định lại.

3. **Module Hiệu trưởng (`accounts/principal_views.py` & `accounts/urls.py`):**
   - `GET /api/principal/pending-signatures`: Hiển thị danh sách các hồ sơ thủ tục 3 cấp đang chờ ký số. Kiểm tra quyền `principal` nghiêm ngặt (trả 403 `FORBIDDEN` nếu không phải Hiệu trưởng).
   - `POST /api/principal/requests/:id/sign`: Ký số SmartCA, đóng dấu điện tử lên PDF, cập nhật trạng thái học vụ sang `suspended`, gửi thông báo cho sinh viên.
   - `POST /api/principal/requests/:id/return-to-head`: Hiệu trưởng từ chối / trả lại hồ sơ cho Trưởng phòng kiểm tra lại.
   - `GET /api/principal/requests/:id`: Xem chi tiết hồ sơ & lịch sử audit log.
   - `GET /api/results/:id/preview`: Xem trước trực tuyến file PDF quyết định (inline).

4. **Tự động điền GPA khi nộp đơn (`accounts/request_views.py`):**
   - Tự động lấy GPA = 3.2 từ `AcademicMSService` điền vào `form_data` của đơn Bảo lưu KQHT (Thủ tục 4).

### Frontend
1. **API Client (`vju-portal-admin/src/services/api.js`):**
   - Cập nhật `principalApi`: `getPendingSignatures`, `getDecisionDetail`, `signSmartCA`, `returnToHead`.
   - Cập nhật `staffApi`: `submitToHead`, `submitToPrincipal`, `returnToStaff`.
2. **Giao diện Hiệu trưởng (`PrincipalDecisionList.js`, `PrincipalDecisionDetail.js`):**
   - Nạp dữ liệu thực tế từ backend `principalApi.getPendingSignatures()`.
   - Kết nối nút bấm "Ký số SmartCA" và "Từ chối" với backend API, cập nhật trạng thái thời gian thực.
3. **Giao diện Chuyên viên & Trưởng phòng (`StaffRequestDetail.js`):**
   - Bổ sung các nút hành động "Trình Trưởng phòng →", "Trình Hiệu trưởng ký số →", "Trả chuyên viên" theo luồng phê duyệt 3 cấp.

---

## 3. Kết quả Kiểm thử Tự động (`accounts/tests_module4.py`)
Bao phủ toàn diện 7/7 test cases theo PRD + 1 test luồng hoàn trả:
- `test_4_1_1_create_request_autofill_gpa`: **PASS** (Auto-fill GPA 3.2, SLA 5 ngày, minh chứng config 4).
- `test_4_2_1_submit_to_principal`: **PASS** (Sinh PDF bản thảo, `Result`, trạng thái `Chờ HT ký số`, notification cho HT).
- `test_4_3_1_get_pending_signatures_success`: **PASS** (HT lấy danh sách đơn chờ ký).
- `test_4_3_2_get_pending_signatures_forbidden`: **PASS** (Vai trò khác bị 403 FORBIDDEN).
- `test_4_4_1_sign_smartca_success`: **PASS** (Ký SmartCA, đóng dấu số, student_status $\rightarrow$ `suspended`, SV tải PDF).
- `test_4_4_2_sign_smartca_timeout`: **PASS** (Mô phỏng timeout 504, trạng thái giữ nguyên `Chờ HT ký số`).
- `test_4_5_cv_reject_low_gpa`: **PASS** (GPA < 2.0 CV từ chối đơn).
- `test_workflow_returns_between_levels`: **PASS** (TP trả CV & HT trả TP).

**Tổng kiểm thử toàn hệ thống:** 32/32 tests **PASS** (`Ran 32 tests in 5.870s - OK`).
**Frontend build:** `react-scripts build` thành công, không có cảnh báo hay lỗi.
