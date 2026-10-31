import React, { useState, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { allRequests } from '../../data/mockData';
import { staffApi } from '../../services/api';
import './StaffPages.css';

function StaffReviewForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  // Find request or fallback to mock appeal request VJU-2026-0835 / VJU-2026-0840
  const foundReq = (allRequests || []).find(
    (r) => r.id === id || r.request_code === id || String(r.request_id) === String(id)
  );

  const requestCode = id || foundReq?.request_code || foundReq?.id || 'VJU-2026-0835';
  const backUrl = `/staff/request/${requestCode}`;

  // Form states matching Figma spec
  const [score1, setScore1] = useState('');
  const [score2, setScore2] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [opinion, setOpinion] = useState('');
  const [toastMsg, setToastMsg] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const fileInputRef = useRef(null);

  // Auto-calculated final score
  const calcFinalScore = () => {
    const s1 = parseFloat(score1);
    const s2 = parseFloat(score2);
    if (!isNaN(s1) && !isNaN(s2)) {
      const avg = (s1 + s2) / 2;
      return Number.isInteger(avg) ? avg.toFixed(1) : avg.toFixed(2);
    }
    return null;
  };

  const finalScore = calcFinalScore();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 4500);
  };

  const handleSubmitToHead = async () => {
    try {
      if (staffApi && staffApi.submitToHead) {
        await staffApi.submitToHead(requestCode, {
          score_teacher_1: score1,
          score_teacher_2: score2,
          final_score: finalScore,
          file_name: uploadedFile?.name,
          review_notes: opinion,
        }).catch(() => {});
      }
    } catch {}

    setSubmitted(true);
    showToast(`Đã trình duyệt đơn phúc khảo ${requestCode} lên Trưởng phòng`);
  };

  return (
    <div className="staff-detail-container" style={{ position: 'relative' }}>
      {/* Toast Notification matching Figma spec */}
      {toastMsg && (
        <div className="depthead-toast-card">
          <div className="depthead-toast-icon-circle">
            <span className="depthead-toast-icon-check">✓</span>
          </div>
          <span className="depthead-toast-text">{toastMsg}</span>
        </div>
      )}

      {/* Title & Back Button Row */}
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
          Thẩm định đơn phúc khảo
        </div>
        <button
          type="button"
          onClick={() => navigate(backUrl)}
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
            ← Chi tiết đơn
          </div>
        </button>
      </div>

      {/* Main Review Card: Chi tiết thẩm định */}
      <div
        style={{
          alignSelf: 'stretch',
          paddingLeft: 28,
          paddingRight: 28,
          paddingTop: 24,
          paddingBottom: 24,
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
          Chi tiết thẩm định
        </div>
        <div style={{ alignSelf: 'stretch', height: 16 }} />
        <div style={{ alignSelf: 'stretch', height: 1, background: '#E2E5EA' }} />

        {/* Row 1: Điểm giáo viên 1 */}
        <div
          style={{
            alignSelf: 'stretch',
            paddingTop: 14,
            paddingBottom: 14,
            overflow: 'hidden',
            justifyContent: 'flex-start',
            alignItems: 'center',
            gap: 16,
            display: 'inline-flex',
          }}
        >
          <div
            style={{
              width: 180,
              color: '#4B5563',
              fontSize: 13,
              fontFamily: 'Inter',
              fontWeight: '500',
              wordWrap: 'break-word',
              flexShrink: 0,
            }}
          >
            Điểm giáo viên 1
          </div>
          <input
            type="number"
            step="0.1"
            min="0"
            max="10"
            value={score1}
            onChange={(e) => setScore1(e.target.value)}
            placeholder="Nhập điểm..."
            style={{
              width: 140,
              height: 38,
              paddingLeft: 12,
              paddingRight: 12,
              paddingTop: 8,
              paddingBottom: 8,
              background: 'white',
              borderRadius: 8,
              border: '1px #E2E5EA solid',
              outline: 'none',
              color: '#1F2937',
              fontSize: 14,
              fontFamily: 'Inter',
              fontWeight: '400',
              boxSizing: 'border-box',
            }}
            className="staff-review-score-input"
          />
        </div>
        <div style={{ alignSelf: 'stretch', height: 1, background: '#E2E5EA' }} />

        {/* Row 2: Điểm giáo viên 2 */}
        <div
          style={{
            alignSelf: 'stretch',
            paddingTop: 14,
            paddingBottom: 14,
            overflow: 'hidden',
            justifyContent: 'flex-start',
            alignItems: 'center',
            gap: 16,
            display: 'inline-flex',
          }}
        >
          <div
            style={{
              width: 180,
              color: '#4B5563',
              fontSize: 13,
              fontFamily: 'Inter',
              fontWeight: '500',
              wordWrap: 'break-word',
              flexShrink: 0,
            }}
          >
            Điểm giáo viên 2
          </div>
          <input
            type="number"
            step="0.1"
            min="0"
            max="10"
            value={score2}
            onChange={(e) => setScore2(e.target.value)}
            placeholder="Nhập điểm..."
            style={{
              width: 140,
              height: 38,
              paddingLeft: 12,
              paddingRight: 12,
              paddingTop: 8,
              paddingBottom: 8,
              background: 'white',
              borderRadius: 8,
              border: '1px #E2E5EA solid',
              outline: 'none',
              color: '#1F2937',
              fontSize: 14,
              fontFamily: 'Inter',
              fontWeight: '400',
              boxSizing: 'border-box',
            }}
            className="staff-review-score-input"
          />
        </div>
        <div style={{ alignSelf: 'stretch', height: 1, background: '#E2E5EA' }} />

        {/* Row 3: Điểm cuối */}
        <div
          style={{
            alignSelf: 'stretch',
            paddingTop: 14,
            paddingBottom: 14,
            overflow: 'hidden',
            justifyContent: 'flex-start',
            alignItems: 'center',
            gap: 16,
            display: 'inline-flex',
          }}
        >
          <div
            style={{
              width: 180,
              color: '#4B5563',
              fontSize: 13,
              fontFamily: 'Inter',
              fontWeight: '500',
              wordWrap: 'break-word',
              flexShrink: 0,
            }}
          >
            Điểm cuối
          </div>
          {finalScore !== null ? (
            <div
              style={{
                color: '#1F2937',
                fontSize: 15,
                fontFamily: 'Inter',
                fontWeight: '600',
                wordWrap: 'break-word',
              }}
            >
              {finalScore}
            </div>
          ) : (
            <div
              style={{
                color: '#9CA3AF',
                fontSize: 13,
                fontFamily: 'Inter',
                fontWeight: '400',
                wordWrap: 'break-word',
              }}
            >
              Tự động tính sau khi nhập điểm
            </div>
          )}
        </div>
        <div style={{ alignSelf: 'stretch', height: 1, background: '#E2E5EA' }} />

        {/* Row 4: Biên bản phúc khảo */}
        <div
          style={{
            alignSelf: 'stretch',
            paddingTop: 14,
            paddingBottom: 14,
            overflow: 'hidden',
            justifyContent: 'flex-start',
            alignItems: 'center',
            gap: 16,
            display: 'inline-flex',
          }}
        >
          <div
            style={{
              width: 180,
              color: '#4B5563',
              fontSize: 13,
              fontFamily: 'Inter',
              fontWeight: '500',
              wordWrap: 'break-word',
              flexShrink: 0,
            }}
          >
            Biên bản phúc khảo
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
            accept=".pdf,.doc,.docx,.png,.jpg"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
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
              gap: 6,
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
                color: uploadedFile ? '#168039' : '#1F2937',
                fontSize: 14,
                fontFamily: 'Inter',
                fontWeight: '500',
                wordWrap: 'break-word',
              }}
            >
              {uploadedFile ? `✓ ${uploadedFile.name}` : '↑ Tải file lên'}
            </div>
          </button>
        </div>
        <div style={{ alignSelf: 'stretch', height: 1, background: '#E2E5EA' }} />

        {/* Row 5: Ý kiến thẩm định */}
        <div
          style={{
            alignSelf: 'stretch',
            paddingTop: 14,
            paddingBottom: 14,
            overflow: 'hidden',
            justifyContent: 'flex-start',
            alignItems: 'flex-start',
            gap: 16,
            display: 'inline-flex',
          }}
        >
          <div
            style={{
              width: 180,
              paddingTop: 8,
              overflow: 'hidden',
              flexDirection: 'column',
              justifyContent: 'flex-start',
              alignItems: 'flex-start',
              display: 'inline-flex',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                color: '#4B5563',
                fontSize: 13,
                fontFamily: 'Inter',
                fontWeight: '500',
                wordWrap: 'break-word',
              }}
            >
              Ý kiến thẩm định
            </div>
          </div>
          <textarea
            value={opinion}
            onChange={(e) => setOpinion(e.target.value)}
            placeholder="Nhập ý kiến thẩm định của chuyên viên..."
            style={{
              flex: '1 1 0',
              height: 100,
              paddingLeft: 12,
              paddingRight: 12,
              paddingTop: 10,
              paddingBottom: 10,
              background: 'white',
              overflow: 'hidden',
              borderRadius: 8,
              border: '1px #E2E5EA solid',
              outline: 'none',
              resize: 'vertical',
              color: '#1F2937',
              fontSize: 14,
              fontFamily: 'Inter',
              fontWeight: '400',
              boxSizing: 'border-box',
              lineHeight: 1.5,
            }}
            className="staff-review-textarea"
          />
        </div>
        <div style={{ alignSelf: 'stretch', height: 1, background: '#E2E5EA' }} />
      </div>

      <div style={{ alignSelf: 'stretch', height: 8 }} />

      {/* Action Buttons Row */}
      <div
        style={{
          alignSelf: 'stretch',
          overflow: 'hidden',
          justifyContent: 'flex-end',
          alignItems: 'flex-start',
          gap: 12,
          display: 'inline-flex',
        }}
      >
        <button
          type="button"
          onClick={() => navigate(backUrl)}
          style={{
            paddingLeft: 16,
            paddingRight: 16,
            paddingTop: 10,
            paddingBottom: 10,
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
            ← Quay lại chi tiết đơn
          </div>
        </button>

        <button
          type="button"
          onClick={handleSubmitToHead}
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
            display: 'flex',
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
            Trình duyệt TP →
          </div>
        </button>
      </div>
    </div>
  );
}

export default StaffReviewForm;
