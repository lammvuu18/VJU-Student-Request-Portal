import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { procedures } from '../../data/mockData';
import './StudentPages.css';

function ProcedureDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const procedure = procedures.find(p => p.id === parseInt(id)) || procedures[0];

  // Specific preparation documents
  const getDocuments = () => {
    if (procedure.id === 1) {
      return [
        {
          stt: '01',
          name: 'Đơn đề nghị cấp bảng điểm',
          desc: 'Điền theo mẫu và ký tên trước khi tải lên. Chấp nhận PDF, JPG, PNG; tối đa 5 MB/tệp.',
          hasTemplate: true,
          templateName: 'don_de_nghi_cap_bang_diem.docx',
        },
        {
          stt: '02',
          name: 'Thông tin mục đích sử dụng',
          desc: 'Chuẩn bị số bản, ngôn ngữ và phương thức nhận kết quả.',
          hasTemplate: false,
        },
      ];
    }

    return [
      {
        stt: '01',
        name: `Đơn đề nghị ${procedure.name.toLowerCase()}`,
        desc: 'Điền theo mẫu và ký tên trước khi tải lên. Chấp nhận PDF, JPG, PNG; tối đa 5 MB/tệp.',
        hasTemplate: true,
        templateName: procedure.template || 'don_de_nghi.docx',
      },
      {
        stt: '02',
        name: 'Thông tin yêu cầu kèm theo',
        desc: 'Chuẩn bị các thông tin cụ thể và giấy tờ liên quan theo quy định.',
        hasTemplate: false,
      },
    ];
  };

  const documents = getDocuments();

  // Steps
  const steps = [
    {
      num: 1,
      title: 'Điền thông tin',
      desc: 'Điền thông tin và tải giấy tờ cần thiết',
    },
    {
      num: 2,
      title: 'Gửi & thanh toán',
      desc: 'Gửi yêu cầu và thanh toán lệ phí',
    },
    {
      num: 3,
      title: 'Xử lý',
      desc: `${procedure.department_name || 'Phòng Đào tạo'} tiếp nhận, xử lý`,
    },
    {
      num: 4,
      title: 'Nhận kết quả',
      desc: 'Nhận PDF hoặc đặt lịch nhận bản giấy',
    },
  ];

  const handleDownloadTemplate = (templateName) => {
    alert(`Đang tải xuống biểu mẫu: ${templateName}`);
  };

  const getPurpose = () => {
    if (procedure.id === 1) {
      return 'Thể hiện các học phần, số tín chỉ và kết quả học tập đã được cập nhật trong hệ thống đào tạo. Bản điện tử được ký số và có mã QR để xác minh.';
    }
    return procedure.description;
  };

  const getDepartmentDisplay = () => {
    if (procedure.department_name === 'Phòng Đào tạo') {
      return 'Phòng Đào tạo (PĐT)';
    }
    if (procedure.department_name === 'Phòng Công tác Sinh viên') {
      return 'Phòng Công tác Sinh viên (CTSV)';
    }
    if (procedure.department_name === 'Phòng Kế hoạch – Tài chính') {
      return 'Phòng Kế hoạch – Tài chính (KHTC)';
    }
    return procedure.department || 'Phòng Đào tạo (PĐT)';
  };

  return (
    <div className="pdetail-container">
      {/* Top Header Row */}
      <div className="pdetail-header-row">
        <h1 className="pdetail-title">{procedure.name}</h1>
        <div className="pdetail-actions">
          <button
            type="button"
            className="pdetail-btn-back"
            onClick={() => navigate('/student/procedures')}
          >
            ← Danh mục thủ tục
          </button>
          <button
            type="button"
            className="pdetail-btn-submit"
            onClick={() => navigate(`/student/request/new/${procedure.id}`)}
          >
            Nộp giấy tờ →
          </button>
        </div>
      </div>

      {/* Card 1: Thông tin chung */}
      <div className="pdetail-card">
        <h2 className="pdetail-card-title">Thông tin chung</h2>
        <div className="pdetail-divider" />

        <div className="pdetail-info-row">
          <div className="pdetail-info-label">Mục đích</div>
          <div className="pdetail-info-value">{getPurpose()}</div>
        </div>
        <div className="pdetail-divider" />

        <div className="pdetail-info-row">
          <div className="pdetail-info-label">Đối tượng</div>
          <div className="pdetail-info-value">Sinh viên đang học tại trường</div>
        </div>
        <div className="pdetail-divider" />

        <div className="pdetail-info-row">
          <div className="pdetail-info-label">Đơn vị xử lý</div>
          <div className="pdetail-info-value">{getDepartmentDisplay()}</div>
        </div>
        <div className="pdetail-divider" />

        <div className="pdetail-info-row">
          <div className="pdetail-info-label">Thời gian xử lý</div>
          <div className="pdetail-info-value">{procedure.time}</div>
        </div>
        <div className="pdetail-divider" />

        <div className="pdetail-info-row">
          <div className="pdetail-info-label">Hình thức trả kết quả</div>
          <div className="pdetail-info-value">{procedure.result_type || 'PDF ký số / Bản giấy tại phòng'}</div>
        </div>
        <div className="pdetail-divider" />

        <div className="pdetail-info-row">
          <div className="pdetail-info-label">Lệ phí thủ tục</div>
          <div className="pdetail-info-value">{procedure.fee}</div>
        </div>
        <div className="pdetail-divider" />
      </div>

      {/* Card 2: Giấy tờ cần chuẩn bị */}
      <div className="pdetail-card">
        <h2 className="pdetail-card-title">Giấy tờ cần chuẩn bị</h2>
        <div className="pdetail-divider" />

        <div className="pdetail-table">
          <div className="pdetail-table-head">
            <div className="pdetail-th pdetail-col-stt">STT</div>
            <div className="pdetail-th pdetail-col-name">Tên giấy tờ</div>
            <div className="pdetail-th pdetail-col-desc">Mô tả và yêu cầu</div>
            <div className="pdetail-th pdetail-col-action">Mẫu</div>
          </div>
          <div className="pdetail-divider" />

          {documents.map((doc, idx) => (
            <React.Fragment key={doc.stt}>
              <div className="pdetail-table-row">
                <div className="pdetail-col-stt pdetail-td-stt">{doc.stt}</div>
                <div className="pdetail-col-name pdetail-td-text" style={{ fontWeight: 500 }}>
                  {doc.name}
                </div>
                <div className="pdetail-col-desc pdetail-td-text">
                  {doc.desc}
                </div>
                <div className="pdetail-col-action">
                  {doc.hasTemplate ? (
                    <button
                      type="button"
                      className="pdetail-btn-download"
                      onClick={() => handleDownloadTemplate(doc.templateName)}
                    >
                      Tải mẫu ↓
                    </button>
                  ) : (
                    <span className="pdetail-td-text">—</span>
                  )}
                </div>
              </div>
              {idx < documents.length - 1 && <div className="pdetail-divider" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Card 3: Quy trình thực hiện */}
      <div className="pdetail-card" style={{ paddingBottom: '24px' }}>
        <h2 className="pdetail-card-title">Quy trình thực hiện</h2>

        <div className="pdetail-process-row">
          {steps.map((s, index) => {
            const isFirst = index === 0;
            const isLast = index === steps.length - 1;

            return (
              <div key={s.num} className="pdetail-step-item">
                <div className="pdetail-step-connector-wrap">
                  <div className={`pdetail-step-line ${isFirst ? 'empty' : ''}`} />
                  <div className="pdetail-step-circle">{s.num}</div>
                  <div className={`pdetail-step-line ${isLast ? 'empty' : ''}`} />
                </div>
                <div className="pdetail-step-label">{s.title}</div>
                <div className="pdetail-step-desc">{s.desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ProcedureDetail;
