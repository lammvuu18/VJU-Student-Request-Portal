import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { procedures } from '../../data/mockData';
import './StudentPages.css';

function ProcedureDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  // Dữ liệu mặc định từ mockData
  const defaultProcedure = procedures.find(p => p.id === parseInt(id) || p.type_id === parseInt(id)) || procedures[0];

  const [procedure, setProcedure] = useState(defaultProcedure);
  const [loading, setLoading] = useState(true);
  const [backendDocs, setBackendDocs] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await api.procedures.getDetail(id);
        if (isMounted && res && res.data) {
          const d = res.data;
          const isFee = Boolean(d.is_fee_required && d.fee_amount && Number(d.fee_amount) > 0);
          setProcedure({
            id: d.type_id || parseInt(id),
            type_id: d.type_id || parseInt(id),
            name: d.name,
            description: d.description,
            department_name: d.department_name,
            department: d.department_name,
            sla_total_days: d.sla_total_days || 1,
            time: `${d.sla_total_days || 1} ngày làm việc`,
            is_fee_required: d.is_fee_required,
            fee_amount: d.fee_amount,
            fee: isFee ? `${Number(d.fee_amount).toLocaleString('vi-VN')} VNĐ` : 'Miễn phí',
            approval_levels: d.approval_levels,
            form_fields: d.form_fields || [],
            attachment_configs: d.attachment_configs || [],
          });

          // Nếu backend trả về cấu hình file đính kèm
          if (Array.isArray(d.attachment_configs) && d.attachment_configs.length > 0) {
            const mappedDocs = d.attachment_configs.map((att, idx) => ({
              stt: String(idx + 1).padStart(2, '0'),
              name: `${att.item_name || `Tệp minh chứng ${idx + 1}`}${att.is_required ? ' (bắt buộc)' : ' (không bắt buộc)'}`,
              desc: `Định dạng ${att.allowed_formats || 'PDF, JPG, PNG'}, tối đa ${att.max_size_mb || 5} MB.`,
              hasTemplate: Boolean(att.template_url),
              templateName: att.template_url || 'mau_ho_so.docx',
            }));
            setBackendDocs(mappedDocs);
          }
        }
      } catch (err) {
        console.warn('Lỗi khi tải chi tiết thủ tục từ Backend, dùng dữ liệu dự phòng:', err.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetail();
    return () => { isMounted = false; };
  }, [id]);

  // Danh mục giấy tờ cần chuẩn bị (ưu tiên từ backend configs nếu có)
  const getDocuments = () => {
    if (backendDocs.length > 0) {
      return backendDocs;
    }

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
        name: `Đơn đề nghị ${procedure.name ? procedure.name.toLowerCase() : 'thủ tục'}`,
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

  // Các bước thực hiện
  const steps = [
    {
      num: 1,
      title: 'Điền thông tin',
      desc: 'Điền thông tin và tải giấy tờ cần thiết',
    },
    {
      num: 2,
      title: 'Gửi & thanh toán',
      desc: procedure.is_fee_required ? 'Gửi yêu cầu và thanh toán lệ phí' : 'Gửi yêu cầu xét duyệt',
    },
    {
      num: 3,
      title: 'Xử lý',
      desc: `${procedure.department_name || 'Phòng ban chuyên môn'} tiếp nhận, xử lý`,
    },
    {
      num: 4,
      title: 'Nhận kết quả',
      desc: 'Nhận PDF hoặc đặt lịch nhận bản giấy',
    },
  ];

  const getResultTypeDisplay = () => {
    if (procedure.id === 1) {
      return 'PDF ký số / Bản giấy tại phòng';
    }
    return procedure.result_type || 'PDF ký số / Bản giấy tại phòng';
  };

  const handleDownloadTemplate = (templateName) => {
    const filename = templateName || 'don_de_nghi.docx';
    const sampleContent = `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n\nĐƠN ĐỀ NGHỊ ${procedure.name ? procedure.name.toUpperCase() : 'THỦ TỤC'}\n\nKính gửi: ${procedure.department_name || 'Phòng ban chuyên trách'} - Trường Đại học Việt Nhật\n\nTên sinh viên: Nguyễn Minh Anh\nMã sinh viên: 21CS001\nKhoa/Ngành: Khoa học và Kỹ thuật Máy tính\n\nNội dung đề nghị: ${procedure.description || procedure.name}\n\nSinh viên cam kết thông tin khai báo trên là chính xác.\n\nNgười làm đơn\n(Ký và ghi rõ họ tên)`;
    const blob = new Blob([sampleContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getPurpose = () => {
    return procedure.description || 'Thực hiện giải quyết nhu cầu hành chính của sinh viên theo quy định của Trường Đại học Việt Nhật.';
  };

  const getDepartmentDisplay = () => {
    if (procedure.department_name) {
      return procedure.department_name;
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
            onClick={() => navigate(`/student/request/new/${procedure.id || procedure.type_id}`)}
          >
            Nộp giấy tờ →
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ padding: '8px 0', color: '#68717D', fontSize: 13 }}>
          Đang đồng bộ dữ liệu từ máy chủ...
        </div>
      )}

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
          <div className="pdetail-info-value">{getResultTypeDisplay()}</div>
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
                <div className="pdetail-col-name pdetail-td-text">
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
