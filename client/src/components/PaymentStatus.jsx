import { useState } from 'react';
import { apiRequest } from '../services/api.js';
import { money } from '../../../shared/menu.js';
import { ErrorMessage } from './ui.jsx';

export function PaymentStatus({ order }) {
  if (order.payment !== 'razorpay') return null;
  const label =
    {
      captured: 'Payment captured',
      refund_pending: 'Refund processing',
      refunded: 'Refund processed',
      refund_failed: 'Refund needs attention',
    }[order.paymentDetails?.state] || 'Checking payment';
  return (
    <div className="payment-status-note" role="status">
      <strong>
        {label} <small>Razorpay test mode</small>
      </strong>
      <span>{order.paymentDetails?.paymentId}</span>
      {order.status === 'Cancelled' && order.paymentDetails?.state === 'captured' && (
        <p>Order cancelled. A platform administrator can initiate the refund.</p>
      )}
    </div>
  );
}
export function RefundControl({ order, onSaved }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (order.payment !== 'razorpay' || order.status !== 'Cancelled') return null;
  const state = order.paymentDetails?.state;
  async function refund() {
    setBusy(true);
    setError('');
    try {
      await apiRequest(`/admin/orders/${order.id}/refund`, { method: 'POST' });
      setConfirm(false);
      onSaved();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="refund-control">
      {state === 'captured' && !confirm && (
        <button className="button secondary" onClick={() => setConfirm(true)}>
          Refund payment
        </button>
      )}
      {state === 'captured' && confirm && (
        <>
          <p>Issue a full test refund of {money(order.totals.total)}?</p>
          <button className="button" disabled={busy} onClick={refund}>
            {busy ? 'Requesting…' : 'Confirm test refund'}
          </button>
          <button className="text-link" disabled={busy} onClick={() => setConfirm(false)}>
            Keep payment
          </button>
        </>
      )}
      {state === 'refund_pending' && (
        <button className="button secondary" disabled={busy} onClick={refund}>
          {busy ? 'Checking…' : 'Refresh refund status'}
        </button>
      )}
      {state === 'refund_failed' && (
        <p>Review this failed refund in the Razorpay dashboard before taking further action.</p>
      )}
      <ErrorMessage>{error}</ErrorMessage>
    </div>
  );
}
