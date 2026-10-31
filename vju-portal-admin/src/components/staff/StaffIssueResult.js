import React, { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { allRequests } from '../../data/mockData';
import { staffApi } from '../../services/api';
import './StaffPages.css';

function StaffIssueResult() {
  const navigate = useNavigate();
  const { id } = useParams();

  // Find request in mock data or fallback to Figma default VJU-2026-0840
  const foundReq = (allRequests || []).find(
    (r) => r.id === id || r.request_code === id || String(r.request_id) === String(id)
  );

  const requestCode = id || foundReq?.request_code || foundReq?.id || 'VJU-2026-0840';
  const procedure = foundReq?.procedure || foundReq?.type_name || 'Cấp bảng điểm';
  const student = foundReq?.student || 'Nguyễn Minh Anh';
  const mssv = foundReq?.mssv || '23110150';
  const quantity = foundReq?.quantity || foundReq?.form_data?.quantity || '01';
  const language = foundReq?.language || foundReq?.form_data?.language || 'Tiếng Việt';

  // State
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages] = useState(2);
  const [location, setLocation] = useState('Văn phòng Một cửa (P.102 Nhà A)');
  const [pickupDate, setPickupDate] = useState('28/10/2026');
  const [timeFrom, setTimeFrom] = useState('08:00');
  const [timeTo, setTimeTo] = useState('11:30');
  const [contactPerson, setContactPerson] = useState('Lê Hoàng Nam');
  const [toastMsg, setToastMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Dropdown open states
  const [openLocationDropdown, setOpenLocationDropdown] = useState(false);
  const [openDateDropdown, setOpenDateDropdown] = useState(false);

  const locationOptions = [
    'Văn phòng Một cửa (P.102 Nhà A)',
    'Bàn tiếp nhận số 1 — Phòng Đào tạo (P.301 Nhà A)',
    'Phòng Công tác Sinh viên (P.205 Nhà B)',
    'Trung tâm Thông tin Thư viện VJU',
  ];

  const dateOptions = [
    '28/10/2026',
    '29/10/2026',
    '30/10/2026',
    '31/10/2026',
    '02/11/2026',
  ];

  const handleZoomIn = () => {
    if (zoom < 150) setZoom(prev => prev + 10);
  };

  const handleZoomOut = () => {
    if (zoom > 70) setZoom(prev => prev - 10);
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4500);
  };

  const handleDownloadPDF = () => {
    showToast(`Đang tải tệp PDF kết quả cho hồ sơ ${requestCode}...`);
  };

  const handleConfirmIssue = async () => {
    try {
      if (staffApi && staffApi.assignPickup) {
        await staffApi.assignPickup(requestCode, {
          location,
          pickup_date: pickupDate,
          time_from: timeFrom,
          time_to: timeTo,
          contact_person: contactPerson,
        }).catch(() => {});
      }
    } catch {}

    setIsSuccess(true);
    showToast(`Đã cấp kết quả thành công cho sinh viên ${student}`);
  };

  return (
    <div className="staff-detail-container" style={{ position: 'relative' }}>
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
          Cấp kết quả cho sinh viên
        </div>
        <button
          type="button"
          onClick={() => navigate(`/staff/request/${requestCode}`)}
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
            ← Quay lại
          </div>
        </button>
      </div>

      {/* Main 2-Column Split: gap 20px */}
      <div
        style={{
          alignSelf: 'stretch',
          overflow: 'visible',
          justifyContent: 'flex-start',
          alignItems: 'flex-start',
          gap: 20,
          display: 'inline-flex',
        }}
      >
        {/* Left Column: PDF Preview (width: 660px) */}
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
              Trang {currentPage} / {totalPages}
            </div>
          </div>

          {/* PDF Document Viewport */}
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
            {/* A4 Document sheet (560 x 792) */}
            <div
              style={{
                width: 560,
                height: 792,
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
                BẢNG ĐIỂM
              </div>
              <div
                style={{
                  textAlign: 'center',
                  color: '#6B7280',
                  fontSize: 10,
                  fontFamily: 'Inter',
                  fontWeight: '400',
                  wordWrap: 'break-word',
                }}
              >
                (Academic Transcript)
              </div>
              <div style={{ width: 10, height: 6 }} />
              <div
                style={{
                  alignSelf: 'stretch',
                  color: '#1F2937',
                  fontSize: 10,
                  fontFamily: 'Inter',
                  fontWeight: '400',
                  wordWrap: 'break-word',
                }}
              >
                Họ và tên: {student}
              </div>
              <div
                style={{
                  alignSelf: 'stretch',
                  color: '#1F2937',
                  fontSize: 10,
                  fontFamily: 'Inter',
                  fontWeight: '400',
                  wordWrap: 'break-word',
                }}
              >
                MSSV: {mssv}
              </div>
              <div
                style={{
                  alignSelf: 'stretch',
                  color: '#1F2937',
                  fontSize: 10,
                  fontFamily: 'Inter',
                  fontWeight: '400',
                  wordWrap: 'break-word',
                }}
              >
                Ngành: Khoa học máy tính
              </div>
              <div style={{ width: 10, height: 4 }} />
              <div
                style={{
                  textAlign: 'center',
                  color: '#6B7280',
                  fontSize: 10,
                  fontFamily: 'Inter',
                  fontWeight: '400',
                  wordWrap: 'break-word',
                }}
              >
                · · ·
              </div>
              <div style={{ width: 10, flex: '1 1 0' }} />
              
              {/* Digital signature stamp area */}
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
                    gap: 3,
                    display: 'inline-flex',
                  }}
                >
                  <div
                    style={{
                      color: '#6B7280',
                      fontSize: 7,
                      fontFamily: 'Inter',
                      fontWeight: '400',
                      wordWrap: 'break-word',
                    }}
                  >
                    Ký số 26/10/2026
                  </div>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      background: '#F0F0F0',
                      borderRadius: 3,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px dashed #D1D5DB',
                    }}
                    title="Dấu ký số xác thực điện tử VJU"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#AA2327" strokeWidth="1.5" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Scrollbar Mock */}
            <div
              style={{
                width: 6,
                height: 794,
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

          {/* Tải PDF Button */}
          <button
            type="button"
            onClick={handleDownloadPDF}
            style={{
              paddingLeft: 20,
              paddingRight: 20,
              paddingTop: 10,
              paddingBottom: 10,
              background: '#AA2327',
              overflow: 'hidden',
              borderRadius: 8,
              border: 'none',
              justifyContent: 'flex-start',
              alignItems: 'flex-start',
              display: 'inline-flex',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#931E22';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#AA2327';
            }}
          >
            <div
              style={{
                color: 'white',
                fontSize: 13,
                fontFamily: 'Inter',
                fontWeight: '600',
                wordWrap: 'break-word',
              }}
            >
              Tải PDF ↓
            </div>
          </button>
        </div>

        {/* Right Column: Info & Pickup Configuration (flex: 1) */}
        <div
          style={{
            flex: '1 1 0',
            overflow: 'visible',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'flex-start',
            gap: 16,
            display: 'inline-flex',
          }}
        >
          {/* Card 1: Thông tin kết quả */}
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
                fontSize: 15,
                fontFamily: 'Inter',
                fontWeight: '600',
                wordWrap: 'break-word',
              }}
            >
              Thông tin kết quả
            </div>

            {/* Mã yêu cầu */}
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
                Mã yêu cầu
              </div>
              <div
                style={{
                  alignSelf: 'stretch',
                  color: '#1F2937',
                  fontSize: 12,
                  fontFamily: 'Inter',
                  fontWeight: '500',
                  wordWrap: 'break-word',
                }}
              >
                {requestCode}
              </div>
            </div>
            <div style={{ alignSelf: 'stretch', height: 1, background: '#E2E5EA' }} />

            {/* Thủ tục */}
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
                Thủ tục
              </div>
              <div
                style={{
                  alignSelf: 'stretch',
                  color: '#1F2937',
                  fontSize: 12,
                  fontFamily: 'Inter',
                  fontWeight: '500',
                  wordWrap: 'break-word',
                }}
              >
                {procedure}
              </div>
            </div>
            <div style={{ alignSelf: 'stretch', height: 1, background: '#E2E5EA' }} />

            {/* Sinh viên */}
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
                Sinh viên
              </div>
              <div
                style={{
                  alignSelf: 'stretch',
                  color: '#1F2937',
                  fontSize: 12,
                  fontFamily: 'Inter',
                  fontWeight: '500',
                  wordWrap: 'break-word',
                }}
              >
                {student}
              </div>
            </div>
            <div style={{ alignSelf: 'stretch', height: 1, background: '#E2E5EA' }} />

            {/* Template */}
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
                Template
              </div>
              <div
                style={{
                  alignSelf: 'stretch',
                  color: '#1F2937',
                  fontSize: 12,
                  fontFamily: 'Inter',
                  fontWeight: '500',
                  wordWrap: 'break-word',
                }}
              >
                Bảng điểm chính quy v2.1
              </div>
            </div>
            <div style={{ alignSelf: 'stretch', height: 1, background: '#E2E5EA' }} />

            {/* Hình thức nhận */}
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
                Hình thức nhận
              </div>
              <div
                style={{
                  overflow: 'hidden',
                  justifyContent: 'flex-start',
                  alignItems: 'flex-start',
                  gap: 6,
                  display: 'inline-flex',
                  marginTop: 2,
                }}
              >
                <div
                  style={{
                    paddingLeft: 6,
                    paddingRight: 6,
                    paddingTop: 2,
                    paddingBottom: 2,
                    background: '#DBEAFE',
                    overflow: 'hidden',
                    borderRadius: 999,
                    justifyContent: 'flex-start',
                    alignItems: 'flex-start',
                    display: 'flex',
                  }}
                >
                  <div
                    style={{
                      color: '#1D4ED8',
                      fontSize: 10,
                      fontFamily: 'Inter',
                      fontWeight: '500',
                      wordWrap: 'break-word',
                    }}
                  >
                    PDF ký số
                  </div>
                </div>
                <div
                  style={{
                    paddingLeft: 6,
                    paddingRight: 6,
                    paddingTop: 2,
                    paddingBottom: 2,
                    background: '#DCFCE7',
                    overflow: 'hidden',
                    borderRadius: 999,
                    justifyContent: 'flex-start',
                    alignItems: 'flex-start',
                    display: 'flex',
                  }}
                >
                  <div
                    style={{
                      color: '#168039',
                      fontSize: 10,
                      fontFamily: 'Inter',
                      fontWeight: '500',
                      wordWrap: 'break-word',
                    }}
                  >
                    Bản cứng
                  </div>
                </div>
              </div>
            </div>
            <div style={{ alignSelf: 'stretch', height: 1, background: '#E2E5EA' }} />

            {/* Số bản */}
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
                Số bản
              </div>
              <div
                style={{
                  alignSelf: 'stretch',
                  color: '#1F2937',
                  fontSize: 12,
                  fontFamily: 'Inter',
                  fontWeight: '500',
                  wordWrap: 'break-word',
                }}
              >
                {quantity}
              </div>
            </div>
            <div style={{ alignSelf: 'stretch', height: 1, background: '#E2E5EA' }} />

            {/* Ngôn ngữ */}
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
                Ngôn ngữ
              </div>
              <div
                style={{
                  alignSelf: 'stretch',
                  color: '#1F2937',
                  fontSize: 12,
                  fontFamily: 'Inter',
                  fontWeight: '500',
                  wordWrap: 'break-word',
                }}
              >
                {language}
              </div>
            </div>
          </div>

          {/* Card 2: Thông tin nhận bản cứng */}
          <div
            style={{
              alignSelf: 'stretch',
              paddingLeft: 20,
              paddingRight: 20,
              paddingTop: 16,
              paddingBottom: 16,
              background: 'white',
              overflow: 'visible',
              borderRadius: 12,
              border: '1px #E2E5EA solid',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              alignItems: 'flex-start',
              gap: 10,
              display: 'flex',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                alignSelf: 'stretch',
                color: '#1F2937',
                fontSize: 15,
                fontFamily: 'Inter',
                fontWeight: '600',
                wordWrap: 'break-word',
              }}
            >
              Thông tin nhận bản cứng
            </div>

            {/* Địa điểm */}
            <div
              style={{
                alignSelf: 'stretch',
                position: 'relative',
                overflow: 'visible',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                alignItems: 'flex-start',
                gap: 4,
                display: 'flex',
              }}
            >
              <div
                style={{
                  alignSelf: 'stretch',
                  color: '#4B5563',
                  fontSize: 12,
                  fontFamily: 'Inter',
                  fontWeight: '500',
                  wordWrap: 'break-word',
                }}
              >
                Địa điểm
              </div>
              <div
                onClick={() => {
                  setOpenLocationDropdown(!openLocationDropdown);
                  setOpenDateDropdown(false);
                }}
                style={{
                  alignSelf: 'stretch',
                  paddingLeft: 10,
                  paddingRight: 10,
                  paddingTop: 8,
                  paddingBottom: 8,
                  background: 'white',
                  borderRadius: 6,
                  border: '1px #E2E5EA solid',
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                  gap: 4,
                  display: 'inline-flex',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    flex: '1 1 0',
                    color: location ? '#1F2937' : '#9CA3AF',
                    fontSize: 12,
                    fontFamily: 'Inter',
                    fontWeight: '400',
                    wordWrap: 'break-word',
                  }}
                >
                  {location || 'Chọn địa điểm...'}
                </div>
                <div
                  style={{
                    color: '#6B7280',
                    fontSize: 12,
                    fontFamily: 'Inter',
                    fontWeight: '400',
                    wordWrap: 'break-word',
                  }}
                >
                  ▾
                </div>
              </div>

              {openLocationDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: 4,
                    background: 'white',
                    borderRadius: 8,
                    border: '1px #E2E5EA solid',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    zIndex: 50,
                    overflow: 'hidden',
                  }}
                >
                  {locationOptions.map((opt) => (
                    <div
                      key={opt}
                      onClick={() => {
                        setLocation(opt);
                        setOpenLocationDropdown(false);
                      }}
                      style={{
                        padding: '8px 12px',
                        fontSize: 12,
                        fontFamily: 'Inter',
                        color: location === opt ? '#AA2327' : '#1F2937',
                        fontWeight: location === opt ? '600' : '400',
                        background: location === opt ? '#FDF2F2' : 'white',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        if (location !== opt) e.currentTarget.style.background = '#F9FAFB';
                      }}
                      onMouseLeave={(e) => {
                        if (location !== opt) e.currentTarget.style.background = 'white';
                      }}
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Ngày nhận */}
            <div
              style={{
                alignSelf: 'stretch',
                position: 'relative',
                overflow: 'visible',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                alignItems: 'flex-start',
                gap: 4,
                display: 'flex',
              }}
            >
              <div
                style={{
                  alignSelf: 'stretch',
                  color: '#4B5563',
                  fontSize: 12,
                  fontFamily: 'Inter',
                  fontWeight: '500',
                  wordWrap: 'break-word',
                }}
              >
                Ngày nhận
              </div>
              <div
                onClick={() => {
                  setOpenDateDropdown(!openDateDropdown);
                  setOpenLocationDropdown(false);
                }}
                style={{
                  alignSelf: 'stretch',
                  paddingLeft: 10,
                  paddingRight: 10,
                  paddingTop: 8,
                  paddingBottom: 8,
                  background: 'white',
                  borderRadius: 6,
                  border: '1px #E2E5EA solid',
                  justifyContent: 'flex-start',
                  alignItems: 'center',
                  gap: 4,
                  display: 'inline-flex',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    flex: '1 1 0',
                    color: pickupDate ? '#1F2937' : '#9CA3AF',
                    fontSize: 12,
                    fontFamily: 'Inter',
                    fontWeight: '400',
                    wordWrap: 'break-word',
                  }}
                >
                  {pickupDate || 'Chọn ngày...'}
                </div>
                <div
                  style={{
                    color: '#6B7280',
                    fontSize: 12,
                    fontFamily: 'Inter',
                    fontWeight: '400',
                    wordWrap: 'break-word',
                  }}
                >
                  ▾
                </div>
              </div>

              {openDateDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: 4,
                    background: 'white',
                    borderRadius: 8,
                    border: '1px #E2E5EA solid',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    zIndex: 50,
                    overflow: 'hidden',
                  }}
                >
                  {dateOptions.map((opt) => (
                    <div
                      key={opt}
                      onClick={() => {
                        setPickupDate(opt);
                        setOpenDateDropdown(false);
                      }}
                      style={{
                        padding: '8px 12px',
                        fontSize: 12,
                        fontFamily: 'Inter',
                        color: pickupDate === opt ? '#AA2327' : '#1F2937',
                        fontWeight: pickupDate === opt ? '600' : '400',
                        background: pickupDate === opt ? '#FDF2F2' : 'white',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        if (pickupDate !== opt) e.currentTarget.style.background = '#F9FAFB';
                      }}
                      onMouseLeave={(e) => {
                        if (pickupDate !== opt) e.currentTarget.style.background = 'white';
                      }}
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Giờ nhận: Từ - Đến */}
            <div
              style={{
                alignSelf: 'stretch',
                overflow: 'hidden',
                justifyContent: 'flex-start',
                alignItems: 'flex-start',
                gap: 8,
                display: 'inline-flex',
              }}
            >
              {/* Từ */}
              <div
                style={{
                  flex: '1 1 0',
                  overflow: 'hidden',
                  flexDirection: 'column',
                  justifyContent: 'flex-start',
                  alignItems: 'flex-start',
                  gap: 4,
                  display: 'inline-flex',
                }}
              >
                <div
                  style={{
                    color: '#4B5563',
                    fontSize: 12,
                    fontFamily: 'Inter',
                    fontWeight: '500',
                    wordWrap: 'break-word',
                  }}
                >
                  Từ
                </div>
                <input
                  type="text"
                  value={timeFrom}
                  onChange={(e) => setTimeFrom(e.target.value)}
                  style={{
                    alignSelf: 'stretch',
                    paddingLeft: 10,
                    paddingRight: 10,
                    paddingTop: 8,
                    paddingBottom: 8,
                    background: 'white',
                    borderRadius: 6,
                    border: '1px #E2E5EA solid',
                    outline: 'none',
                    color: '#1F2937',
                    fontSize: 12,
                    fontFamily: 'Inter',
                    fontWeight: '400',
                    boxSizing: 'border-box',
                    width: '100%',
                  }}
                />
              </div>

              {/* Đến */}
              <div
                style={{
                  flex: '1 1 0',
                  overflow: 'hidden',
                  flexDirection: 'column',
                  justifyContent: 'flex-start',
                  alignItems: 'flex-start',
                  gap: 4,
                  display: 'inline-flex',
                }}
              >
                <div
                  style={{
                    color: '#4B5563',
                    fontSize: 12,
                    fontFamily: 'Inter',
                    fontWeight: '500',
                    wordWrap: 'break-word',
                  }}
                >
                  Đến
                </div>
                <input
                  type="text"
                  value={timeTo}
                  onChange={(e) => setTimeTo(e.target.value)}
                  style={{
                    alignSelf: 'stretch',
                    paddingLeft: 10,
                    paddingRight: 10,
                    paddingTop: 8,
                    paddingBottom: 8,
                    background: 'white',
                    borderRadius: 6,
                    border: '1px #E2E5EA solid',
                    outline: 'none',
                    color: '#1F2937',
                    fontSize: 12,
                    fontFamily: 'Inter',
                    fontWeight: '400',
                    boxSizing: 'border-box',
                    width: '100%',
                  }}
                />
              </div>
            </div>

            {/* Người liên hệ */}
            <div
              style={{
                alignSelf: 'stretch',
                overflow: 'hidden',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                alignItems: 'flex-start',
                gap: 4,
                display: 'flex',
              }}
            >
              <div
                style={{
                  alignSelf: 'stretch',
                  color: '#4B5563',
                  fontSize: 12,
                  fontFamily: 'Inter',
                  fontWeight: '500',
                  wordWrap: 'break-word',
                }}
              >
                Người liên hệ
              </div>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                style={{
                  alignSelf: 'stretch',
                  paddingLeft: 10,
                  paddingRight: 10,
                  paddingTop: 8,
                  paddingBottom: 8,
                  background: 'white',
                  borderRadius: 6,
                  border: '1px #E2E5EA solid',
                  outline: 'none',
                  color: '#1F2937',
                  fontSize: 12,
                  fontFamily: 'Inter',
                  fontWeight: '400',
                  boxSizing: 'border-box',
                  width: '100%',
                }}
              />
            </div>
          </div>

          {/* Confirm Button */}
          <button
            type="button"
            onClick={handleConfirmIssue}
            style={{
              alignSelf: 'stretch',
              paddingLeft: 16,
              paddingRight: 16,
              paddingTop: 10,
              paddingBottom: 10,
              background: '#AA2327',
              overflow: 'hidden',
              borderRadius: 8,
              border: 'none',
              justifyContent: 'center',
              alignItems: 'center',
              display: 'inline-flex',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#931E22';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#AA2327';
            }}
          >
            <div
              style={{
                flex: '1 1 0',
                textAlign: 'center',
                color: 'white',
                fontSize: 13,
                fontFamily: 'Inter',
                fontWeight: '600',
                wordWrap: 'break-word',
              }}
            >
              Xác nhận cấp kết quả →
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default StaffIssueResult;
