import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { studentOverviewRequests, allRequests } from '../../data/mockData';
import './StudentPages.css';

function RequestDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  // Find request in mock data or fallback to Figma default VJU-2026-0840
  const foundReq = (studentOverviewRequests || []).find(
    (r) => r.id === id || r.request_code === id || String(r.request_id) === String(id)
  ) || (allRequests || []).find(
    (r) => r.id === id || r.request_code === id || String(r.request_id) === String(id)
  );

  const request = foundReq || {
    id: id || 'VJU-2026-0840',
    request_code: id || 'VJU-2026-0840',
    student: 'Nguyễn Minh Anh',
    mssv: '23110150',
    procedure: 'Cấp bảng điểm',
    procedure_id: 1,
    purpose: 'Xin việc / Ứng tuyển',
    quantity: 1,
    language: 'Tiếng Việt',
    delivery_method: 'PDF ký số',
    date: '21/10/2026',
    status: 'Đang xử lý',
    assigned_to: 'Chưa phân công',
  };

  const [showDocModal, setShowDocModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const handleFeedbackSubmit = (e) => {
    e.preventDefault();
    setShowFeedbackModal(false);
    showToast('Cảm ơn bạn đã gửi đánh giá dịch vụ!');
  };

  const getStatusPillClass = (status) => {
    if (status === 'Đang xử lý') return 'processing';
    if (status === 'Cần bổ sung') return 'supplement';
    if (status === 'Chờ thanh toán') return 'payment';
    if (status === 'Hoàn thành') return 'completed';
    if (status === 'Đã hủy') return 'cancelled';
    return 'processing';
  };

  const requestCode = request.id || request.request_code || 'VJU-2026-0840';
  const studentName = request.student || 'Nguyễn Minh Anh';
  const studentMssv = request.mssv || '23110150';
  const procedureName = request.procedure || request.type_name || 'Cấp bảng điểm';
  const purpose = request.purpose || request.form_data?.purpose || 'Xin việc / Ứng tuyển';
  const quantity = request.quantity || request.form_data?.quantity || 1;
  const language = request.language || request.form_data?.language || 'Tiếng Việt';
  const deliveryMethod = request.delivery_method || request.form_data?.delivery_method || 'PDF ký số';
  const submissionDate = request.date || '21/10/2026';
  const status = request.status || 'Đang xử lý';
  const assignee = request.assigned_to || request.staff_name || 'Chưa phân công';

  return (
    <div className="req-detail-container">
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          top: 24,
          right: 24,
          zIndex: 9999,
          background: '#059669',
          color: '#FFFFFF',
          padding: '12px 20px',
          borderRadius: 8,
          boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 14,
          fontWeight: 600,
          fontFamily: 'Inter, sans-serif',
        }}>
          <span>✓</span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header Row */}
      <div className="req-detail-top-bar">
        <h1 className="req-detail-title">Yêu cầu {requestCode}</h1>
        <button
          type="button"
          className="btn-back-to-requests"
          onClick={() => navigate('/student/dashboard')}
        >
          <span>← Yêu cầu của tôi</span>
        </button>
      </div>

      {/* Main Card: Thông tin yêu cầu */}
      <div className="req-detail-card">
        <div className="req-detail-card-title">Thông tin yêu cầu</div>
        <div className="req-detail-divider" />

        {/* Row 1: Tên sinh viên */}
        <div className="req-detail-row">
          <div className="req-detail-label">Tên sinh viên</div>
          <div className="req-detail-value">{studentName}</div>
        </div>
        <div className="req-detail-divider" />

        {/* Row 2: Mã sinh viên */}
        <div className="req-detail-row">
          <div className="req-detail-label">Mã sinh viên</div>
          <div className="req-detail-value">{studentMssv}</div>
        </div>
        <div className="req-detail-divider" />

        {/* Row 3: Mã yêu cầu */}
        <div className="req-detail-row">
          <div className="req-detail-label">Mã yêu cầu</div>
          <div className="req-detail-value">{requestCode}</div>
        </div>
        <div className="req-detail-divider" />

        {/* Row 4: Tên thủ tục */}
        <div className="req-detail-row">
          <div className="req-detail-label">Tên thủ tục</div>
          <div className="req-detail-value">{procedureName}</div>
        </div>
        <div className="req-detail-divider" />

        {/* Row 5: Mục đích */}
        <div className="req-detail-row">
          <div className="req-detail-label">Mục đích</div>
          <div className="req-detail-value">{purpose}</div>
        </div>
        <div className="req-detail-divider" />

        {/* Row 6: Số bản */}
        <div className="req-detail-row">
          <div className="req-detail-label">Số bản</div>
          <div className="req-detail-value">{quantity}</div>
        </div>
        <div className="req-detail-divider" />

        {/* Row 7: Ngôn ngữ */}
        <div className="req-detail-row">
          <div className="req-detail-label">Ngôn ngữ</div>
          <div className="req-detail-value">{language}</div>
        </div>
        <div className="req-detail-divider" />

        {/* Row 8: Hình thức nhận kết quả */}
        <div className="req-detail-row">
          <div className="req-detail-label">Hình thức nhận kết quả</div>
          <div className="req-detail-value">{deliveryMethod}</div>
        </div>
        <div className="req-detail-divider" />

        {/* Row 9: Ngày gửi */}
        <div className="req-detail-row">
          <div className="req-detail-label">Ngày gửi</div>
          <div className="req-detail-value">{submissionDate}</div>
        </div>
        <div className="req-detail-divider" />

        {/* Row 10: Trạng thái */}
        <div className="req-detail-row">
          <div className="req-detail-label">Trạng thái</div>
          <div className="req-detail-value">
            <span className={`req-status-pill ${getStatusPillClass(status)}`}>
              {status}
            </span>
          </div>
        </div>
        <div className="req-detail-divider" />

        {/* Row 11: Người phụ trách */}
        <div className="req-detail-row">
          <div className="req-detail-label">Người phụ trách</div>
          <div className="req-detail-value">{assignee}</div>
        </div>
        <div className="req-detail-divider" />

        {/* Row 12: Tài liệu đã gửi */}
        <div className="req-detail-row">
          <div className="req-detail-label">Tài liệu đã gửi</div>
          <div className="req-detail-value">
            <button
              type="button"
              className="btn-view-document"
              onClick={() => setShowDocModal(true)}
            >
              <span>Xem tài liệu ↗</span>
            </button>
          </div>
        </div>
        <div className="req-detail-divider" />
      </div>

      {/* Action Buttons Row */}
      <div className="req-detail-actions">
        {/* Button 1: Bổ sung hồ sơ */}
        <button
          type="button"
          className="btn-req-action-outline"
          onClick={() => navigate('/student/request/supplement')}
        >
          Bổ sung hồ sơ
        </button>

        {/* Button 2: Thanh toán */}
        <button
          type="button"
          className="btn-req-action-outline"
          onClick={() => navigate(`/student/request/payment/${request.procedure_id || 1}`)}
        >
          Thanh toán
        </button>

        {/* Button 3: Đánh giá */}
        <button
          type="button"
          className="btn-req-action-outline"
          onClick={() => setShowFeedbackModal(true)}
        >
          Đánh giá
        </button>

        {/* Button 4: Nhận kết quả → */}
        <button
          type="button"
          className="btn-req-action-primary"
          onClick={() => navigate('/student/request/result')}
        >
          <span>Nhận kết quả →</span>
        </button>
      </div>

      {/* Modal Xem tài liệu đã gửi */}
      <Modal
        isOpen={showDocModal}
        onClose={() => setShowDocModal(false)}
        title="Tài liệu đính kèm yêu cầu"
      >
        <div style={{ padding: '8px 0', fontFamily: 'Inter, sans-serif' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: 14,
            background: '#F9FAFB',
            borderRadius: 8,
            border: '1px solid #E2E5EA',
            marginBottom: 16,
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: '#FCE8E8',
              color: '#AA2327',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 13,
            }}>
              PDF
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#202630' }}>
                Don_yeu_cau_{requestCode}.pdf
              </div>
              <div style={{ fontSize: 12, color: '#68717D', marginTop: 2 }}>
                1.4 MB • Đã tải lên vào {submissionDate}
              </div>
            </div>
            <button
              type="button"
              className="btn btn--outline-red"
              style={{ padding: '6px 12px', fontSize: 12 }}
              onClick={() => showToast('Đang tải xuống tệp đính kèm...')}
            >
              Tải xuống
            </button>
          </div>

          <div style={{
            height: 180,
            background: '#F5F6F8',
            borderRadius: 8,
            border: '1px dashed #CBD5E1',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#68717D',
            fontSize: 13,
            gap: 8,
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#68717D" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <span>Bản xem trước tệp tài liệu PDF hợp lệ có ký số nội bộ</span>
          </div>
        </div>
      </Modal>

      {/* Modal Đánh giá chất lượng dịch vụ */}
      <Modal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        title="Đánh giá chất lượng dịch vụ"
      >
        <form onSubmit={handleFeedbackSubmit} style={{ fontFamily: 'Inter, sans-serif' }}>
          <p style={{ fontSize: 13, color: '#68717D', marginBottom: 16 }}>
            Vui lòng đánh giá mức độ hài lòng của bạn đối với quá trình xử lý thủ tục <strong>{procedureName}</strong> ({requestCode}):
          </p>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#202630', marginBottom: 8 }}>
              Mức độ hài lòng
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 26,
                    cursor: 'pointer',
                    color: star <= rating ? '#F59E0B' : '#D1D5DB',
                    transition: 'color 0.15s',
                    padding: 0,
                  }}
                >
                  ★
                </button>
              ))}
              <span style={{ fontSize: 13, fontWeight: 600, color: '#68717D', alignSelf: 'center', marginLeft: 8 }}>
                {rating === 5 ? 'Rất hài lòng' : rating === 4 ? 'Hài lòng' : rating === 3 ? 'Bình thường' : 'Chưa hài lòng'}
              </span>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#202630', marginBottom: 6 }}>
              Ý kiến đóng góp (tùy chọn)
            </label>
            <textarea
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #E2E5EA',
                borderRadius: 8,
                fontSize: 13,
                fontFamily: 'Inter, sans-serif',
                color: '#202630',
                outline: 'none',
                boxSizing: 'border-box',
                minHeight: 80,
              }}
              placeholder="Chia sẻ thêm cảm nhận hoặc góp ý giúp VJU cải thiện dịch vụ..."
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="secondary" onClick={() => setShowFeedbackModal(false)}>
              Đóng
            </Button>
            <Button variant="primary" type="submit">
              Gửi đánh giá
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default RequestDetail;
