import React from 'react';
import { formatDateTime } from '../../utils/format';

const COLORS = {
  done: { dot: '#168039', bg: '#ECFDF5', text: '#047857' },
  pending: { dot: '#1D4ED8', bg: '#EFF6FF', text: '#1D4ED8' },
  failed: { dot: '#B91C1C', bg: '#FEF2F2', text: '#B91C1C' },
  idle: { dot: '#D1D5DB', bg: '#F9FAFB', text: '#6B7280' },
};

const ICONS = { done: '✓', pending: '…', failed: '✕', idle: '' };

function Step({ index, state, title, lines, isLast }) {
  const c = COLORS[state];
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{
          width: 26, height: 26, borderRadius: 999, background: c.dot, color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0,
        }}>
          {ICONS[state] || index}
        </div>
        {!isLast && <div style={{ width: 2, flex: 1, minHeight: 18, background: '#E5E7EB', margin: '4px 0' }} />}
      </div>
      <div style={{ paddingBottom: isLast ? 0 : 16, flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#1F2937' }}>{title}</div>
        {lines.filter(Boolean).map((line) => (
          <div key={line} style={{ fontSize: 13, color: state === 'failed' ? c.text : '#4B5563', marginTop: 2 }}>{line}</div>
        ))}
      </div>
    </div>
  );
}

/**
 * Tiến trình chi hoàn trả học phí sau khi Hiệu trưởng ký:
 * Finance MS ghi nhận → Internet Banking lập lệnh chi → Ngân hàng xác nhận (webhook).
 * canOperate: cán bộ Phòng KHTC đang giữ đơn (hiện nút lập lại lệnh chi và giả lập ngân hàng).
 */
function RefundProgressCard({
  refund,
  canOperate = false,
  busy = false,
  onRetry,
  onSimulate,
  cardClassName = 'staff-detail-card',
  titleClassName = 'staff-detail-section-title',
}) {
  if (!refund) return null;

  const { status } = refund;
  const financeState = refund.finance_ref ? 'done' : (status === 'failed' ? 'failed' : 'pending');
  let orderState = 'idle';
  if (refund.payout_order_id) orderState = 'done';
  else if (status === 'failed' && refund.finance_ref) orderState = 'failed';
  let bankState = 'idle';
  if (status === 'succeeded') bankState = 'done';
  else if (status === 'pending_bank') bankState = 'pending';
  else if (status === 'failed' && refund.payout_order_id) bankState = 'failed';

  const summary = {
    succeeded: { text: `Đã chuyển khoản ${refund.amount_text}`, ...COLORS.done },
    pending_bank: { text: 'Đang chờ ngân hàng xác nhận chuyển khoản', ...COLORS.pending },
    pending_finance: { text: 'Đang ghi nhận khoản hoàn trên Finance MS', ...COLORS.pending },
    failed: { text: 'Chi hoàn trả chưa thành công', ...COLORS.failed },
  }[status] || { text: status, ...COLORS.idle };

  return (
    <div className={cardClassName} style={{ marginTop: 16 }}>
      <h2 className={titleClassName} style={{ margin: 0 }}>Tiến trình chi hoàn trả</h2>
      <div style={{ height: 12 }} />
      <div style={{
        background: summary.bg, color: summary.text, borderRadius: 8, padding: '10px 14px',
        fontWeight: 600, fontSize: 14, marginBottom: 16,
      }}>
        {summary.text}
      </div>

      <Step
        index={1}
        state={financeState}
        title="Finance MS ghi nhận khoản hoàn trả"
        lines={refund.finance_ref ? [
          `Mã ghi nhận: ${refund.finance_ref}`,
          `Số tiền: ${refund.amount_text} · ${formatDateTime(refund.finance_recorded_at)}`,
        ] : [status === 'failed' ? refund.failure_reason : 'Hệ thống đang gửi yêu cầu ghi nhận sang Finance MS']}
      />
      <Step
        index={2}
        state={orderState}
        title="Internet Banking lập lệnh chi"
        lines={refund.payout_order_id ? [
          `Mã lệnh chi: ${refund.payout_order_id}${refund.attempt_count > 1 ? ` (lần ${refund.attempt_count})` : ''}`,
          `Từ TK nguồn: ${refund.source_account}`,
          `Tới: ${refund.bank_account_no} · ${refund.bank_name} · ${refund.account_holder}`,
          `Lập lúc: ${formatDateTime(refund.payout_created_at)}`,
        ] : [orderState === 'failed' ? refund.failure_reason : 'Chờ Finance MS ghi nhận xong']}
      />
      <Step
        index={3}
        state={bankState}
        isLast
        title="Ngân hàng xác nhận chuyển khoản (webhook)"
        lines={{
          done: [`Mã giao dịch: ${refund.bank_txn_id}`, `Xác nhận lúc: ${formatDateTime(refund.bank_confirmed_at)}`],
          pending: ['Lệnh chi đã gửi ngân hàng, hệ thống tự cập nhật khi ngân hàng gửi kết quả về.'],
          failed: [`Ngân hàng báo thất bại: ${refund.failure_reason || 'không rõ lý do'}`],
          idle: ['Chưa có lệnh chi'],
        }[bankState]}
      />

      {canOperate && status === 'failed' && onRetry && (
        <div style={{ marginTop: 16, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#6B7280' }}>Kiểm tra lại thông tin tài khoản với sinh viên rồi lập lại lệnh chi.</span>
          <button type="button" className="staff-btn-action-primary" disabled={busy} onClick={onRetry}>
            {busy ? 'Đang xử lý...' : 'Lập lại lệnh chi →'}
          </button>
        </div>
      )}

      {canOperate && status === 'pending_bank' && refund.sandbox_enabled && onSimulate && (
        <div style={{
          marginTop: 16, border: '1px dashed #F59E0B', background: '#FFFBEB', borderRadius: 8, padding: '12px 14px',
        }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: '#92400E' }}>Môi trường thử nghiệm (sandbox ngân hàng)</div>
          <div style={{ fontSize: 13, color: '#92400E', marginTop: 4 }}>
            Chưa kết nối ngân hàng thật. Bấm để giả lập ngân hàng gửi webhook kết quả về hệ thống (có ký HMAC như ngân hàng thật).
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <button type="button" className="staff-btn-action-primary" disabled={busy} onClick={() => onSimulate('success')}>
              Ngân hàng xác nhận thành công
            </button>
            <button type="button" className="staff-btn-action-outline" disabled={busy} onClick={() => onSimulate('failed')}>
              Ngân hàng báo thất bại
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RefundProgressCard;
