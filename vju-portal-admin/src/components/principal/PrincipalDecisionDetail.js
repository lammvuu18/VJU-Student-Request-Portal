import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import RejectRequestModal from '../common/RejectRequestModal';
import { allRequests } from '../../data/mockData';
import { principalApi } from '../../services/api';
import './PrincipalPages.css';

function PrincipalDecisionDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  // Find request or fallback to Figma default VJU-2026-0842 / VJU-2026-0840
  const foundReq = (allRequests || []).find(
    (r) => r.id === id || r.request_code === id || String(r.request_id) === String(id)
  );

  const [decisionData, setDecisionData] = useState(null);
  const [loading, setLoading] = useState(false);

  // State
  const [zoom, setZoom] = useState(100);
  const [isSigned, setIsSigned] = useState(false);
  const [isRejected, setIsRejected] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const res = await principalApi.getDecisionDetail(id).catch(() => null);
        if (isMounted && res && res.data) {
          setDecisionData(res.data);
          if (res.data.internal_status === 'Đã duyệt — Có kết quả') {
            setIsSigned(true);
          }
        }
      } catch (err) {
        console.error('Failed to load decision detail:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const requestCode = decisionData?.request_code || id || foundReq?.request_code || foundReq?.id || 'VJU-2026-0842';
  const procedure = decisionData?.type_name || foundReq?.procedure || foundReq?.type_name || 'Cấp bảng điểm';
  const student = decisionData?.student?.name || foundReq?.student || 'Nguyễn Minh Anh';
  const mssv = decisionData?.student?.mssv || foundReq?.mssv || '23110150';
  const department = decisionData?.department_name || foundReq?.department || foundReq?.department_name || 'Phòng Đào tạo';
  const previewUrl = decisionData?.pdf_preview_url || `/api/results/${id}/preview`;

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4500);
  };

  const handleZoomIn = () => {
    if (zoom < 150) setZoom((prev) => prev + 10);
  };

  const handleZoomOut = () => {
    if (zoom > 70) setZoom((prev) => prev - 10);
  };

  const handleSignSmartCA = async () => {
    try {
      const targetId = decisionData?.request_id || foundReq?.request_id || id;
      const res = await principalApi.signSmartCA(targetId, {
        provider: 'vnpt_smartca',
      });
      setIsSigned(true);
      showToast(res?.message || `Đã ký số SmartCA thành công quyết định ${requestCode}`);
      if (res?.data) {
        setDecisionData((prev) =>
          prev
            ? {
                ...prev,
                internal_status: res.data.internal_status || 'Đã duyệt — Có kết quả',
                result: {
                  ...(prev.result || {}),
                  smartca_transaction_id: res.data.smartca_transaction_id,
                  signed_at: res.data.signed_at,
                },
              }
            : null
        );
      }
    } catch (err) {
      showToast(err?.message || 'Lỗi khi thực hiện ký số SmartCA');
    }
  };

  const handleRejectSubmit = async (data) => {
    try {
      const targetId = decisionData?.request_id || foundReq?.request_id || id;
      await principalApi.returnToHead(targetId, {
        note: data?.notes || data?.reason || '',
      });
      setShowRejectModal(false);
      setIsRejected(true);
      showToast(`Đã từ chối ký và trả lại hồ sơ ${requestCode} cho Trưởng phòng`);
      if (decisionData) {
        setDecisionData((prev) =>
          prev ? { ...prev, internal_status: 'Chờ TP phê duyệt' } : null
        );
      }
    } catch (err) {
      showToast(err?.message || 'Lỗi khi trả lại hồ sơ');
    }
  };

  return (
    <div className="principal-container" style={{ position: 'relative' }}>
      {/* Toast Notification (Figma spec) */}
      {toastMsg && (
        <div className="depthead-toast-card">
          <div className="depthead-toast-icon-circle">
            <span className="depthead-toast-icon-check">✓</span>
          </div>
          <span className="depthead-toast-text">{toastMsg}</span>
        </div>
      )}

      {/* Top Header Row */}
      <div
        style={{
          alignSelf: 'stretch',
          overflow: 'hidden',
          justifyContent: 'flex-start',
          alignItems: 'center',
          gap: 8,
          display: 'inline-flex',
        }}
      >
        <div
          style={{
            flex: '1 1 0',
            color: '#1F2937',
            fontSize: 28,
            fontFamily: 'Inter',
            fontWeight: '600',
            wordWrap: 'break-word',
          }}
        >
          Chi tiết quyết định
        </div>
        <button
          type="button"
          onClick={() => navigate('/principal/decisions')}
          style={{
            paddingLeft: 14,
            paddingRight: 14,
            paddingTop: 8,
            paddingBottom: 8,
            background: 'white',
            overflow: 'hidden',
            borderRadius: 8,
            border: '1px #E2E5EA solid',
            justifyContent: 'flex-start',
            alignItems: 'flex-start',
            display: 'flex',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#D1D5DB';
            e.currentTarget.style.background = '#F9FAFB';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#E2E5EA';
            e.currentTarget.style.background = 'white';
          }}
        >
          <div
            style={{
              color: '#6B7280',
              fontSize: 13,
              fontFamily: 'Inter',
              fontWeight: '500',
              wordWrap: 'break-word',
            }}
          >
            ← Danh sách quyết định
          </div>
        </button>
      </div>

      {/* Main 2-Column Split: gap 20px */}
      <div
        style={{
          alignSelf: 'stretch',
          overflow: 'hidden',
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          gap: 20,
          display: 'inline-flex',
        }}
      >
        {/* Column 1: PDF Viewer Preview (width: 660px) */}
        <div
          style={{
            width: 660,
            overflow: 'hidden',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'center',
            gap: 12,
            display: 'inline-flex',
            flexShrink: 0,
          }}
        >
          {/* PDF Toolbar */}
          <div
            style={{
              alignSelf: 'stretch',
              paddingLeft: 12,
              paddingRight: 12,
              paddingTop: 6,
              paddingBottom: 6,
              background: 'white',
              overflow: 'hidden',
              borderRadius: 8,
              border: '1px #E2E5EA solid',
              justifyContent: 'flex-start',
              alignItems: 'center',
              gap: 12,
              display: 'inline-flex',
              boxSizing: 'border-box',
            }}
          >
            <button
              type="button"
              onClick={handleZoomOut}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#6B7280',
                fontSize: 16,
                fontFamily: 'Inter',
                fontWeight: '500',
                cursor: 'pointer',
                padding: '2px 6px',
                borderRadius: 4,
              }}
              title="Thu nhỏ"
            >
              −
            </button>
            <div
              style={{
                color: '#1F2937',
                fontSize: 12,
                fontFamily: 'Inter',
                fontWeight: '400',
                wordWrap: 'break-word',
                minWidth: 36,
                textAlign: 'center',
              }}
            >
              {zoom}%
            </div>
            <button
              type="button"
              onClick={handleZoomIn}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#6B7280',
                fontSize: 16,
                fontFamily: 'Inter',
                fontWeight: '500',
                cursor: 'pointer',
                padding: '2px 6px',
                borderRadius: 4,
              }}
              title="Phóng to"
            >
              +
            </button>
            <div style={{ flex: '1 1 0' }} />
            <div
              style={{
                color: '#6B7280',
                fontSize: 12,
                fontFamily: 'Inter',
                fontWeight: '400',
                wordWrap: 'break-word',
              }}
            >
              Trang 1 / 1
            </div>
          </div>

          {/* PDF Viewport */}
          <div
            style={{
              alignSelf: 'stretch',
              padding: 16,
              position: 'relative',
              background: 'white',
              overflow: 'hidden',
              borderRadius: 8,
              border: '1px #E2E5EA solid',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              alignItems: 'center',
              display: 'flex',
              boxSizing: 'border-box',
            }}
          >
            {/* A4 Document sheet (560 x 728) */}
            <div
              style={{
                width: 560,
                height: 728,
                paddingLeft: 36,
                paddingRight: 36,
                paddingTop: 28,
                paddingBottom: 28,
                background: 'white',
                overflow: 'hidden',
                border: '0.50px #E2E5EA solid',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                alignItems: 'center',
                gap: 8,
                display: 'flex',
                boxSizing: 'border-box',
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease',
              }}
            >
              <div
                style={{
                  textAlign: 'center',
                  color: '#1F2937',
                  fontSize: 11,
                  fontFamily: 'Inter',
                  fontWeight: '600',
                  lineHeight: '16px',
                  wordWrap: 'break-word',
                }}
              >
                ĐẠI HỌC QUỐC GIA HÀ NỘI<br />TRƯỜNG ĐẠI HỌC VIỆT NHẬT
              </div>
              <div style={{ width: 160, height: 1, background: '#1F2937' }} />
              <div
                style={{
                  textAlign: 'center',
                  color: '#1F2937',
                  fontSize: 16,
                  fontFamily: 'Inter',
                  fontWeight: '600',
                  wordWrap: 'break-word',
                  marginTop: 4,
                }}
              >
                QUYẾT ĐỊNH
              </div>
              <div
                style={{
                  alignSelf: 'stretch',
                  textAlign: 'center',
                  color: '#1F2937',
                  fontSize: 10,
                  fontFamily: 'Inter',
                  fontWeight: '400',
                  wordWrap: 'break-word',
                }}
              >
                Về việc: {procedure} cho sinh viên {student}
              </div>
              <div style={{ width: 10, height: 8 }} />
              <div
                style={{
                  alignSelf: 'stretch',
                  color: '#1F2937',
                  fontSize: 9,
                  fontFamily: 'Inter',
                  fontWeight: '400',
                  lineHeight: '16px',
                  wordWrap: 'break-word',
                }}
              >
                Căn cứ Quy chế đào tạo...<br />
                Căn cứ đề nghị của {department}...<br /><br />
                QUYẾT ĐỊNH:<br /><br />
                Điều 1. {procedure} cho sinh viên {student},<br />
                MSSV: {mssv}, ngành Khoa học máy tính.<br /><br />
                Điều 2. Quyết định có hiệu lực kể từ ngày ký.
              </div>
              <div style={{ width: 10, flex: '1 1 0' }} />

              {/* Signature Footer */}
              <div
                style={{
                  alignSelf: 'stretch',
                  overflow: 'hidden',
                  justifyContent: 'flex-start',
                  alignItems: 'flex-start',
                  display: 'inline-flex',
                }}
              >
                <div style={{ flex: '1 1 0' }} />
                <div
                  style={{
                    overflow: 'hidden',
                    flexDirection: 'column',
                    justifyContent: 'flex-start',
                    alignItems: 'center',
                    gap: 2,
                    display: 'inline-flex',
                  }}
                >
                  <div
                    style={{
                  textAlign: 'center',
                  color: '#1F2937',
                  fontSize: 9,
                  fontFamily: 'Inter',
                  fontWeight: '600',
                  wordWrap: 'break-word',
                }}
              >
                HIỆU TRƯỞNG
              </div>
              {isSigned ? (
                <div
                  style={{
                    textAlign: 'center',
                    color: '#168039',
                    fontSize: 8,
                    fontFamily: 'Inter',
                    fontWeight: '600',
                    wordWrap: 'break-word',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                  }}
                >
                  <span>✓</span> ĐÃ KÝ SỐ SMARTCA
                </div>
              ) : isRejected ? (
                <div
                  style={{
                    textAlign: 'center',
                    color: '#AA2327',
                    fontSize: 8,
                    fontFamily: 'Inter',
                    fontWeight: '600',
                    wordWrap: 'break-word',
                  }}
                >
                  (ĐÃ TỪ CHỐI KÝ)
                </div>
              ) : (
                <div
                  style={{
                    textAlign: 'center',
                    color: '#6B7280',
                    fontSize: 8,
                    fontFamily: 'Inter',
                    fontWeight: '400',
                    wordWrap: 'break-word',
                  }}
                >
                  (Chờ ký số)
                </div>
              )}
              <div style={{ width: 10, height: 24 }} />
              <div
                style={{
                  textAlign: 'center',
                  color: '#1F2937',
                  fontSize: 9,
                  fontFamily: 'Inter',
                  fontWeight: '600',
                  wordWrap: 'break-word',
                }}
              >
                Nguyễn Văn Bình
              </div>
            </div>
          </div>
        </div>

        {/* Mock Scrollbar */}
        <div
          style={{
            width: 6,
            height: 730,
            left: 646,
            top: 16,
            position: 'absolute',
            background: '#F0F0F0',
            borderRadius: 3,
          }}
        />
        <div
          style={{
            width: 6,
            height: 200,
            left: 646,
            top: 16,
            position: 'absolute',
            background: '#BEC2C8',
            borderRadius: 3,
          }}
        />
      </div>
    </div>

    {/* Column 2: Right side info & actions (flex: 1) */}
    <div
      style={{
        flex: '1 1 0',
        overflow: 'hidden',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        gap: 16,
        display: 'inline-flex',
      }}
    >
      {/* Card: Ý kiến trình ký */}
      <div
        style={{
          alignSelf: 'stretch',
          paddingTop: 16,
          paddingBottom: 12,
          paddingLeft: 20,
          paddingRight: 20,
          background: 'white',
          overflow: 'hidden',
          borderRadius: 12,
          border: '1px #E2E5EA solid',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          display: 'flex',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            alignSelf: 'stretch',
            color: '#1F2937',
            fontSize: 18,
            fontFamily: 'Inter',
            fontWeight: '600',
            wordWrap: 'break-word',
          }}
        >
          Ý kiến trình ký
        </div>
        <div style={{ alignSelf: 'stretch', height: 12 }} />

        {/* Chuyên viên */}
        <div
          style={{
            alignSelf: 'stretch',
            paddingTop: 10,
            paddingBottom: 10,
            overflow: 'hidden',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'flex-start',
            gap: 2,
            display: 'flex',
          }}
        >
          <div
            style={{
              alignSelf: 'stretch',
              color: '#6B7280',
              fontSize: 11,
              fontFamily: 'Inter',
              fontWeight: '400',
              wordWrap: 'break-word',
            }}
          >
            Chuyên viên
          </div>
          <div
            style={{
              alignSelf: 'stretch',
              color: '#1F2937',
              fontSize: 13,
              fontFamily: 'Inter',
              fontWeight: '500',
              wordWrap: 'break-word',
            }}
          >
            Lê Hoàng Nam
          </div>
        </div>
        <div style={{ alignSelf: 'stretch', height: 1, background: '#E2E5EA' }} />

        {/* Trưởng phòng */}
        <div
          style={{
            alignSelf: 'stretch',
            paddingTop: 10,
            paddingBottom: 10,
            overflow: 'hidden',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'flex-start',
            gap: 2,
            display: 'flex',
          }}
        >
          <div
            style={{
              alignSelf: 'stretch',
              color: '#6B7280',
              fontSize: 11,
              fontFamily: 'Inter',
              fontWeight: '400',
              wordWrap: 'break-word',
            }}
          >
            Trưởng phòng
          </div>
          <div
            style={{
              alignSelf: 'stretch',
              color: '#1F2937',
              fontSize: 13,
              fontFamily: 'Inter',
              fontWeight: '500',
              wordWrap: 'break-word',
            }}
          >
            Trần Thu Hà
          </div>
        </div>
        <div style={{ alignSelf: 'stretch', height: 1, background: '#E2E5EA' }} />

        {/* Ý kiến phê duyệt */}
        <div
          style={{
            alignSelf: 'stretch',
            paddingTop: 10,
            paddingBottom: 10,
            overflow: 'hidden',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'flex-start',
            gap: 2,
            display: 'flex',
          }}
        >
          <div
            style={{
              alignSelf: 'stretch',
              color: '#6B7280',
              fontSize: 11,
              fontFamily: 'Inter',
              fontWeight: '400',
              wordWrap: 'break-word',
            }}
          >
            Ý kiến phê duyệt
          </div>
          <div
            style={{
              alignSelf: 'stretch',
              color: '#1F2937',
              fontSize: 13,
              fontFamily: 'Inter',
              fontWeight: '500',
              lineHeight: 1.5,
              wordWrap: 'break-word',
            }}
          >
            Đã kiểm tra hồ sơ đầy đủ. Đề nghị Hiệu trưởng ký duyệt cấp bảng điểm cho sinh viên.
          </div>
        </div>
        <div style={{ alignSelf: 'stretch', height: 1, background: '#E2E5EA' }} />

        {/* Ngày trình */}
        <div
          style={{
            alignSelf: 'stretch',
            paddingTop: 10,
            paddingBottom: 10,
            overflow: 'hidden',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'flex-start',
            gap: 2,
            display: 'flex',
          }}
        >
          <div
            style={{
              alignSelf: 'stretch',
              color: '#6B7280',
              fontSize: 11,
              fontFamily: 'Inter',
              fontWeight: '400',
              wordWrap: 'break-word',
            }}
          >
            Ngày trình
          </div>
          <div
            style={{
              alignSelf: 'stretch',
              color: '#1F2937',
              fontSize: 13,
              fontFamily: 'Inter',
              fontWeight: '500',
              wordWrap: 'break-word',
            }}
          >
            26/10/2026
          </div>
        </div>
      </div>

      {/* Buttons Group */}
      <div
        style={{
          alignSelf: 'stretch',
          overflow: 'hidden',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          gap: 8,
          display: 'flex',
        }}
      >
        {/* Nút: Ký số SmartCA */}
        <button
          type="button"
          disabled={isSigned}
          onClick={handleSignSmartCA}
          style={{
            alignSelf: 'stretch',
            paddingLeft: 16,
            paddingRight: 16,
            paddingTop: 12,
            paddingBottom: 12,
            background: isSigned ? '#F0F0F0' : '#AA2327',
            overflow: 'hidden',
            borderRadius: 8,
            border: 'none',
            justifyContent: 'center',
            alignItems: 'center',
            display: 'inline-flex',
            cursor: isSigned ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (!isSigned) e.currentTarget.style.background = '#931E22';
          }}
          onMouseLeave={(e) => {
            if (!isSigned) e.currentTarget.style.background = '#AA2327';
          }}
        >
          <div
            style={{
              flex: '1 1 0',
              textAlign: 'center',
              color: isSigned ? '#168039' : 'white',
              fontSize: 14,
              fontFamily: 'Inter',
              fontWeight: '600',
              wordWrap: 'break-word',
            }}
          >
            {isSigned ? '✓ Đã ký số SmartCA thành công' : 'Ký số SmartCA →'}
          </div>
        </button>

        {/* Nút: Từ chối ký */}
        <button
          type="button"
          disabled={isSigned}
          onClick={() => setShowRejectModal(true)}
          style={{
            alignSelf: 'stretch',
            paddingLeft: 16,
            paddingRight: 16,
            paddingTop: 10,
            paddingBottom: 10,
            background: 'white',
            overflow: 'hidden',
            borderRadius: 8,
            border: '1px #E2E5EA solid',
            justifyContent: 'center',
            alignItems: 'center',
            display: 'inline-flex',
            cursor: isSigned ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (!isSigned) {
              e.currentTarget.style.borderColor = '#D1D5DB';
              e.currentTarget.style.background = '#F9FAFB';
            }
          }}
          onMouseLeave={(e) => {
            if (!isSigned) {
              e.currentTarget.style.borderColor = '#E2E5EA';
              e.currentTarget.style.background = 'white';
            }
          }}
        >
          <div
            style={{
              flex: '1 1 0',
              textAlign: 'center',
              color: '#6B7280',
              fontSize: 13,
              fontFamily: 'Inter',
              fontWeight: '500',
              wordWrap: 'break-word',
            }}
          >
            {isRejected ? 'Đã từ chối ký' : 'Từ chối ký'}
          </div>
        </button>
      </div>
    </div>
  </div>

  {/* Modal Từ chối ký */}
  <RejectRequestModal
    isOpen={showRejectModal}
    onClose={() => setShowRejectModal(false)}
    requestCode={requestCode}
    studentName={student}
    onSubmit={handleRejectSubmit}
  />
</div>
  );
}

export default PrincipalDecisionDetail;
