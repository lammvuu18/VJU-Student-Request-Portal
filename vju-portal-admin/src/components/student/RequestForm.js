import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../common/Button';
import { users, procedures } from '../../data/mockData';
import './StudentPages.css';

function RequestForm() {
  const navigate = useNavigate();
  const { procedureId } = useParams();
  const currentProc = procedures.find(p => p.id === parseInt(procedureId)) || procedures[0];
  const [currentStep, setCurrentStep] = useState(1);
  const student = users.student;

  const steps = [
    { num: 1, label: 'Thông tin' },
    { num: 2, label: 'Hồ sơ' },
    { num: 3, label: 'Xác nhận' },
    { num: 4, label: 'Thanh toán' },
  ];

  const renderStep1 = () => (
    <div className="form-step">
      <h3 className="section-title">Thông tin sinh viên</h3>
      <div className="form-row">
        <div className="form-group">
          <label>Họ và tên</label>
          <input type="text" value={student.name} readOnly className="readonly" />
        </div>
        <div className="form-group">
          <label>MSSV</label>
          <input type="text" value={student.mssv} readOnly className="readonly" />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>Email</label>
          <input type="text" value={student.email} readOnly className="readonly" />
        </div>
        <div className="form-group">
          <label>Lớp</label>
          <input type="text" value={student.lop} readOnly className="readonly" />
        </div>
      </div>
      <h3 className="section-title" style={{ marginTop: 24 }}>Chi tiết yêu cầu</h3>
      <div className="form-row">
        <div className="form-group">
          <label>Số lượng bản</label>
          <select><option>1 bản</option><option>2 bản</option><option>3 bản</option></select>
        </div>
        <div className="form-group">
          <label>Ngôn ngữ</label>
          <select><option>Tiếng Việt</option><option>Tiếng Anh</option></select>
        </div>
      </div>
      <div className="form-group">
        <label>Mục đích sử dụng</label>
        <textarea placeholder="Nhập mục đích sử dụng bảng điểm..." rows={3}></textarea>
      </div>
      <div className="form-group">
        <label>Ghi chú (nếu có)</label>
        <textarea placeholder="Nhập ghi chú thêm..." rows={2}></textarea>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="form-step">
      <h3 className="section-title">Tải lên hồ sơ</h3>
      <div className="form-group">
        <label>Ảnh CMND/CCCD (mặt trước) *</label>
        <div className="upload-zone">
          <div className="upload-zone-icon">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none"><path d="M20 10v20M10 20h20" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/><rect x="4" y="4" width="32" height="32" rx="8" stroke="#D1D5DB" strokeWidth="1.5"/></svg>
          </div>
          <p className="upload-zone-text">Kéo thả file hoặc <span>chọn file</span></p>
          <p className="upload-zone-text" style={{ fontSize: 12 }}>PNG, JPG, PDF tối đa 5MB</p>
        </div>
      </div>
      <div className="form-group">
        <label>Ảnh CMND/CCCD (mặt sau) *</label>
        <div className="upload-zone">
          <div className="upload-zone-icon">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none"><path d="M20 10v20M10 20h20" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/><rect x="4" y="4" width="32" height="32" rx="8" stroke="#D1D5DB" strokeWidth="1.5"/></svg>
          </div>
          <p className="upload-zone-text">Kéo thả file hoặc <span>chọn file</span></p>
          <p className="upload-zone-text" style={{ fontSize: 12 }}>PNG, JPG, PDF tối đa 5MB</p>
        </div>
      </div>
      <div className="form-group">
        <label>Tài liệu khác (nếu có)</label>
        <div className="upload-zone">
          <div className="upload-zone-icon">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none"><path d="M20 10v20M10 20h20" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/><rect x="4" y="4" width="32" height="32" rx="8" stroke="#D1D5DB" strokeWidth="1.5"/></svg>
          </div>
          <p className="upload-zone-text">Kéo thả file hoặc <span>chọn file</span></p>
          <p className="upload-zone-text" style={{ fontSize: 12 }}>PNG, JPG, PDF tối đa 5MB</p>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="form-step">
      <h3 className="section-title">Xác nhận thông tin</h3>
      <div className="card">
        <div className="card-body">
          <table className="info-table">
            <tbody>
              <tr><th>Thủ tục</th><td>Cấp bảng điểm</td></tr>
              <tr><th>Sinh viên</th><td>{student.name} — {student.mssv}</td></tr>
              <tr><th>Lớp</th><td>{student.lop}</td></tr>
              <tr><th>Số lượng</th><td>1 bản</td></tr>
              <tr><th>Ngôn ngữ</th><td>Tiếng Việt</td></tr>
              <tr><th>Lệ phí</th><td>50.000đ</td></tr>
              <tr><th>Hồ sơ</th><td>2 file đã tải lên</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <label className="confirm-check">
        <input type="checkbox" />
        <span>Tôi xác nhận thông tin trên là chính xác và đầy đủ</span>
      </label>
    </div>
  );

  const renderStep4 = () => (
    <div className="form-step">
      <h3 className="section-title">Thanh toán lệ phí</h3>
      <div className="payment-summary card">
        <div className="card-body">
          <div className="payment-row"><span>Thủ tục</span><span>Cấp bảng điểm</span></div>
          <div className="payment-row"><span>Số lượng</span><span>1 bản</span></div>
          <div className="payment-divider" />
          <div className="payment-row payment-total"><span>Tổng cộng</span><span>50.000đ</span></div>
        </div>
      </div>
      <div className="payment-methods">
        <h4>Phương thức thanh toán</h4>
        <div className="payment-method-tabs">
          <button className="payment-tab active">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M2 8h16" stroke="currentColor" strokeWidth="1.5"/></svg>
            Thẻ ngân hàng
          </button>
          <button className="payment-tab">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M4 4h12v12H4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/><path d="M7 7h6M7 10h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            Chuyển khoản
          </button>
          <button className="payment-tab">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="5" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/><circle cx="10" cy="10" r="2" stroke="currentColor" strokeWidth="1.2"/></svg>
            Ví điện tử
          </button>
        </div>
        <div className="form-row" style={{ marginTop: 16 }}>
          <div className="form-group">
            <label>Số thẻ</label>
            <input type="text" placeholder="0000 0000 0000 0000" />
          </div>
          <div className="form-group">
            <label>Tên chủ thẻ</label>
            <input type="text" placeholder="NGUYEN VAN A" />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Ngày hết hạn</label>
            <input type="text" placeholder="MM/YY" />
          </div>
          <div className="form-group">
            <label>CVV</label>
            <input type="text" placeholder="***" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="request-form-page">
      <a className="back-link" onClick={() => navigate(-1)}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Quay lại
      </a>

      <h1 className="page-title">{currentProc.name}</h1>
      <p className="page-subtitle">{currentProc.department} — Lệ phí: {currentProc.fee}</p>

      {/* Stepper */}
      <div className="stepper">
        {steps.map((step, i) => (
          <React.Fragment key={step.num}>
            <div className={`step ${currentStep === step.num ? 'active' : ''} ${currentStep > step.num ? 'completed' : ''}`}>
              <div className="step-circle">
                {currentStep > step.num ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                ) : step.num}
              </div>
              <span className="step-label">{step.label}</span>
            </div>
            {i < steps.length - 1 && <div className={`step-connector ${currentStep > step.num ? 'completed' : ''}`} />}
          </React.Fragment>
        ))}
      </div>

      <div className="card">
        <div className="card-body">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}

          <div className="form-actions">
            {currentStep > 1 && (
              <Button variant="secondary" onClick={() => setCurrentStep(currentStep - 1)}>Quay lại</Button>
            )}
            {currentStep < 4 ? (
              <Button variant="primary" onClick={() => setCurrentStep(currentStep + 1)}>Tiếp tục</Button>
            ) : (
              <Button variant="primary" onClick={() => navigate('/student/request/success')}>Thanh toán & Nộp</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RequestForm;
