import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import RejectRequestModal from '../common/RejectRequestModal';
import DigitalSignModal from './DigitalSignModal';
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
  const [showDigitalSignModal, setShowDigitalSignModal] = useState(false);
  const [signingLoading, setSigningLoading] = useState(false);
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

  const handleOpenSignModal = () => {
    setShowDigitalSignModal(true);
  };

  const handleSignConfirm = async ({ pin } = {}) => {
    try {
      setSigningLoading(true);
      const targetId = decisionData?.request_id || foundReq?.request_id || id;
      const res = await principalApi.signSmartCA(targetId, {
        provider: 'vnpt_smartca',
        pin: pin || '123456',
      });
      setIsSigned(true);
      setShowDigitalSignModal(false);
      showToast(res?.message || `Đã ký số thành công quyết định ${requestCode}`);
      if (res?.data) {
        setDecisionData((prev) =>
          prev
            ? {
                ...prev,
                internal_status: res.data.internal_status || 'Đã duyệt — Có kết quả',
                status: 'Đã duyệt',
                result: {
                  ...(prev.result || {}),
                  smartca_transaction_id: res.data.smartca_transaction_id,
                  signed_at: res.data.signed_at,
                  signer_name: res.data.signer_name || 'PGS.TS. Nguyễn Văn Bình',
                  ca_provider: res.data.ca_provider || 'VJU Digital CA (Demo eSign)',
                  cert_serial: res.data.cert_serial || '5402-1890-9982-7716-VJU',
                },
              }
            : null
        );
      }
    } catch (err) {
      showToast(err?.message || 'Lỗi khi thực hiện ký số SmartCA');
    } finally {
      setSigningLoading(false);
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
                      fontSize: 10,
                      fontFamily: 'Inter',
                      fontWeight: '700',
                      wordWrap: 'break-word',
                    }}
                  >
                    HIỆU TRƯỞNG
                  </div>
                  {isSigned ? (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        position: 'relative',
                        marginTop: 4,
                        marginBottom: 4,
                      }}
                    >
                      {/* Dấu tròn đỏ + Chữ ký tay nét mực uốn lượn */}
                      <div
                        style={{
                          position: 'relative',
                          width: 170,
                          height: 70,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {/* Con dấu đỏ tròn ĐH Việt Nhật (đè 1/3 chữ ký tay về bên trái) */}
                        <div
                          style={{
                            position: 'absolute',
                            left: 6,
                            width: 68,
                            height: 68,
                            borderRadius: '50%',
                            border: '1.8px solid #C92127',
                            boxShadow: '0 0 0 1px #C92127 inset',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#C92127',
                            fontFamily: 'Inter, sans-serif',
                            textAlign: 'center',
                            lineHeight: 1.1,
                            background: 'rgba(201, 33, 39, 0.04)',
                            zIndex: 2,
                            opacity: 0.92,
                          }}
                        >
                          <div style={{ fontSize: 5, fontWeight: 700 }}>ĐHQG HÀ NỘI</div>
                          <div style={{ fontSize: 5.5, fontWeight: 800 }}>ĐH VIỆT NHẬT</div>
                          <div style={{ fontSize: 7, margin: '1px 0' }}>★</div>
                          <div style={{ fontSize: 5.8, fontWeight: 800 }}>HIỆU TRƯỞNG</div>
                        </div>

                        {/* Chữ ký tay nét mực xanh bút máy */}
                        <div style={{ position: 'absolute', left: 40, zIndex: 1 }}>
                          <svg width="125" height="50" viewBox="0 0 160 70" fill="none">
                            <path
                              d="M10,40 C18,10 32,8 38,32 C42,48 48,15 56,22 C64,30 70,12 80,18 C90,24 82,48 100,35 C115,25 125,10 138,20 C146,26 150,42 155,38"
                              stroke="#002D72"
                              strokeWidth="2.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M20,52 C60,46 110,48 152,54"
                              stroke="#002D72"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                            />
                            <circle cx="156" cy="54" r="2.2" fill="#002D72" />
                          </svg>
                        </div>
                      </div>

                      {/* Họ tên Hiệu trưởng */}
                      <div
                        style={{
                          textAlign: 'center',
                          color: '#1F2937',
                          fontSize: 9.5,
                          fontFamily: 'Inter',
                          fontWeight: '700',
                          marginTop: 2,
                          marginBottom: 4,
                        }}
                      >
                        PGS.TS. Nguyễn Văn Bình
                      </div>

                      {/* Khung chứng nhận chữ ký số MISA eSign */}
                      <div
                        style={{
                          border: '1px solid #DC2626',
                          borderRadius: 5,
                          padding: '4px 8px',
                          background: '#FEF2F2',
                          fontSize: 7.5,
                          color: '#111827',
                          lineHeight: 1.35,
                          width: 175,
                          textAlign: 'left',
                          boxShadow: '0 1px 2px rgba(220, 38, 38, 0.08)',
                        }}
                      >
                        <div
                          style={{
                            color: '#DC2626',
                            fontWeight: 700,
                            fontSize: 7.2,
                            borderBottom: '0.5px dashed #FCA5A5',
                            paddingBottom: 2,
                            marginBottom: 3,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                          }}
                        >
                          <span>✓</span> MISA eSign Digital Signature
                        </div>
                        <div><strong>Ký bởi:</strong> PGS.TS. NGUYỄN VĂN BÌNH</div>
                        <div><strong>Ngày ký:</strong> {decisionData?.result?.signed_at || 'Vừa ký xong'}</div>
                        <div style={{ color: '#059669', fontWeight: 600, fontSize: 7, marginTop: 2 }}>
                          ● Chữ ký số hợp lệ — Toàn vẹn
                        </div>
                      </div>
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
                        margin: '12px 0',
                      }}
                    >
                      (ĐÃ TỪ CHỐI KÝ)
                    </div>
                  ) : (
                    <div
                      style={{
                        border: '1px dashed #9CA3AF',
                        borderRadius: 6,
                        padding: '8px 12px',
                        textAlign: 'center',
                        background: '#F9FAFB',
                        color: '#6B7280',
                        fontSize: 8,
                        margin: '8px 0',
                      }}
                    >
                      <div style={{ fontWeight: 600, color: '#4B5563' }}>[BẢN THẢO TRÌNH KÝ]</div>
                      <div style={{ fontSize: 7 }}>Chưa có hiệu lực pháp lý</div>
                    </div>
                  )}
                  {!isSigned && (
                    <div
                      style={{
                        textAlign: 'center',
                        color: '#1F2937',
                        fontSize: 9,
                        fontFamily: 'Inter',
                        fontWeight: '600',
                        wordWrap: 'break-word',
                        marginTop: 4,
                      }}
                    >
                      Nguyễn Văn Bình
                    </div>
                  )}
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
        {/* Nút: Ký số SmartCA / Demo eSign */}
        <button
          type="button"
          disabled={isSigned}
          onClick={handleOpenSignModal}
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
            boxShadow: isSigned ? 'none' : '0 2px 4px rgba(170, 35, 39, 0.2)',
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
            {isSigned ? '✓ Đã ký số thành công (MISA eSign)' : '✍️ Ký số Quyết định (Demo eSign) →'}
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

  {/* Modal Ký số điện tử Demo (MISA eSign) */}
  <DigitalSignModal
    isOpen={showDigitalSignModal}
    onClose={() => setShowDigitalSignModal(false)}
    onConfirm={handleSignConfirm}
    loading={signingLoading}
    requestCode={requestCode}
    studentName={student}
    mssv={mssv}
    procedureName={procedure}
    signerName="PGS.TS. Nguyễn Văn Bình"
    signerRole="Hiệu trưởng Trường Đại học Việt Nhật"
  />

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
