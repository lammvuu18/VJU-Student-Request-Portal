import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../common/Button';
import { procedures } from '../../data/mockData';
import './StudentPages.css';

function ProcedureDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const procedure = procedures.find(p => p.id === parseInt(id)) || procedures[0];

  const steps = [
    { num: 1, label: 'Điền thông tin', desc: 'Điền đầy đủ thông tin yêu cầu' },
    { num: 2, label: 'Nộp hồ sơ', desc: 'Upload các giấy tờ cần thiết' },
    { num: 3, label: 'Xử lý', desc: 'Phòng ban xử lý yêu cầu' },
    { num: 4, label: 'Nhận kết quả', desc: 'Nhận kết quả tại phòng ban' },
  ];

  const requirements = [
    'Ảnh chụp CMND/CCCD (mặt trước và sau)',
    'Đơn xin cấp (theo mẫu)',
    'Biên lai đóng học phí gần nhất',
  ];

  return (
    <div className="procedure-detail">
      <a className="back-link" onClick={() => navigate(-1)}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        Quay lại danh mục
      </a>

      <div className="page-header">
        <div>
          <h1 className="page-title">{procedure.name}</h1>
          <p className="page-subtitle">{procedure.department}</p>
        </div>
        <Button variant="primary" onClick={() => navigate(`/student/request/new/${procedure.id}`)}>Nộp yêu cầu</Button>
      </div>

      <div className="two-col">
        <div>
          <div className="card">
            <div className="card-body">
              <h3 className="section-title">Thông tin thủ tục</h3>
              <table className="info-table">
                <tbody>
                  <tr><th>Phòng ban</th><td>{procedure.department}</td></tr>
                  <tr><th>Thời gian xử lý</th><td>{procedure.time}</td></tr>
                  <tr><th>Lệ phí</th><td>{procedure.fee}</td></tr>
                  <tr><th>Loại</th><td>{procedure.category === 'hocvu' ? 'Học vụ' : procedure.category === 'ctsv' ? 'CTSV' : 'Tài chính'}</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-body">
              <h3 className="section-title">Hồ sơ cần thiết</h3>
              <ul className="requirements-list">
                {requirements.map((r, i) => (
                  <li key={i}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 8h8" stroke="#AA2327" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 className="section-title">Quy trình xử lý</h3>
            <div className="process-steps">
              {steps.map((step, i) => (
                <div key={step.num} className="process-step">
                  <div className="process-step-num">{step.num}</div>
                  <div className="process-step-content">
                    <div className="process-step-title">{step.label}</div>
                    <div className="process-step-desc">{step.desc}</div>
                  </div>
                  {i < steps.length - 1 && <div className="process-step-line" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProcedureDetail;
