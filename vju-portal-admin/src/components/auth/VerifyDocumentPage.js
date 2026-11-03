import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import { formatDate } from '../../utils/format';

/**
 * Cổng xác minh giấy tờ công khai: mã QR trên PDF kết quả trỏ về /verify/:code
 */
function VerifyDocumentPage() {
  const { code } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.verify.verifyDocument(code)
      .then(res => setData(res.data))
      .catch(err => setError(err.message || 'Không xác minh được giấy tờ.'));
  }, [code]);

  const rows = data ? [
    ['Mã xác minh', code],
    ['Loại giấy tờ', data.document_type],
    ['Sinh viên', data.student_name],
    ['MSSV', data.mssv],
    ['Ngày cấp', formatDate(data.issued_date)],
    ['Đơn vị cấp', data.issued_by],
  ] : [];

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#F8F9FA', fontFamily: 'Inter, sans-serif', padding: 20,
    }}>
      <div style={{
        background: '#FFFFFF', padding: '32px 40px', borderRadius: 16, maxWidth: 480, width: '100%',
        boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
      }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: '#1F2937', margin: '0 0 4px' }}>Xác minh giấy tờ</h1>
        <p style={{ fontSize: 13, color: '#68717D', margin: '0 0 20px' }}>Trường Đại học Việt Nhật — VJU Portal</p>

        {!data && !error && <p style={{ color: '#68717D' }}>Đang xác minh...</p>}

        {error && (
          <div style={{ padding: '12px 14px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, color: '#B91C1C', fontSize: 14 }}>
            {error}
          </div>
        )}

        {data && (
          <>
            <div style={{
              padding: '10px 14px', background: '#ECFDF5', border: '1px solid #6EE7B7', borderRadius: 8,
              color: '#047857', fontWeight: 600, fontSize: 14, marginBottom: 16,
            }}>
              ✓ Giấy tờ hợp lệ, do nhà trường cấp
            </div>
            {rows.map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '10px 0', borderBottom: '1px solid #F1F2F4', fontSize: 14 }}>
                <span style={{ color: '#68717D' }}>{label}</span>
                <span style={{ color: '#1F2937', fontWeight: 500, textAlign: 'right' }}>{value || '—'}</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export default VerifyDocumentPage;
