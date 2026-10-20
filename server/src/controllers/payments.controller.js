import { createHash } from 'node:crypto';
import { env } from '../config/env.js';
import { fail } from '../utils/errors.js';
import { buildOrder } from '../services/orderDraft.js';
import { findAttempt, createAttempt, changeAttempt } from '../services/paymentAttempts.js';
import { getRecord, saveOrderOnce, updateRecord } from '../services/records.js';
import { razorpay, paymentConfig, requirePayments, validSignature } from '../services/razorpay.js';

const hash = (value) => createHash('sha256').update(value).digest('hex');
const providerId = (value, prefix) =>
  typeof value === 'string' && new RegExp(`^${prefix}_[A-Za-z0-9]+$`).test(value);
const paidStates = ['captured', 'refund_pending', 'refunded', 'refund_failed'];
const paymentDetails = (attempt) => ({
  provider: 'razorpay',
  mode: 'test',
  state: attempt.status,
  paymentId: attempt.paymentId,
  gatewayOrderId: attempt.gatewayOrderId,
  attemptId: attempt.id,
  refundId: attempt.refund?.id,
});
function publicAttempt(attempt) {
  return {
    id: attempt.id,
    status: attempt.status,
    mode: 'test',
    keyId: env.razorpayKeyId,
    gatewayOrderId: attempt.gatewayOrderId,
    amount: attempt.snapshot.totals.total * 100,
    currency: 'INR',
    orderId: paidStates.includes(attempt.status) ? attempt.snapshot.id : undefined,
  };
}
async function ownedAttempt(req) {
  const attempt = await findAttempt({ id: req.params.id, owner: req.user.id });
  if (!attempt) fail('Payment session not found.', 404);
  return attempt;
}
async function persistConfirmed(attempt) {
  const confirmedAt = new Date().toISOString();
  const order = await saveOrderOnce(attempt.owner, {
    ...attempt.snapshot,
    createdAt: confirmedAt,
    history: [{ status: 'Placed', at: confirmedAt, actor: attempt.owner }],
    payment: 'razorpay',
    demo: true,
    paymentDetails: paymentDetails(attempt),
  });
  if (!order) fail('Unable to recover the paid order. Contact support.', 503);
}
async function capture(attempt, payment) {
  const amount = attempt.snapshot.totals.total * 100;
  if (
    !providerId(payment.id, 'pay') ||
    payment.order_id !== attempt.gatewayOrderId ||
    payment.amount !== amount ||
    payment.currency !== 'INR' ||
    payment.status !== 'captured' ||
    payment.captured !== true
  )
    fail('Payment is not captured for this order and amount yet.', 409);
  if (attempt.paymentId && attempt.paymentId !== payment.id)
    fail('Payment does not match this order.', 409);
  // Save the order idempotently before making the payment session report success.
  await persistConfirmed({ ...attempt, paymentId: payment.id, status: 'captured' });
  await changeAttempt(attempt.id, 'pending', { status: 'captured', paymentId: payment.id });
  return findAttempt({ id: attempt.id });
}
async function syncRefund(attempt) {
  if (!attempt.refund?.id || !providerId(attempt.refund.id, 'rfnd')) return attempt;
  const refund = await razorpay(`/refunds/${attempt.refund.id}`);
  if (
    refund.payment_id !== attempt.paymentId ||
    refund.amount !== attempt.snapshot.totals.total * 100
  )
    fail('Refund details do not match this payment.', 409);
  const status =
    refund.status === 'processed'
      ? 'refunded'
      : refund.status === 'failed'
        ? 'refund_failed'
        : 'refund_pending';
  const updated =
    (await changeAttempt(attempt.id, attempt.status, { status, refund })) ||
    (await findAttempt({ id: attempt.id }));
  for (let retry = 0; retry < 3; retry++) {
    const order = await getRecord('order', attempt.snapshot.id);
    if (!order) fail('Refund order not found.', 409);
    if (
      await updateRecord('order', order.id, undefined, order.status, {
        paymentDetails: paymentDetails(updated),
      })
    )
      return updated;
  }
  fail('Refund received; refresh to sync the order.', 409);
}
async function reconcile(attempt) {
  if (paidStates.includes(attempt.status)) {
    await persistConfirmed(attempt);
    return attempt.refund?.id ? syncRefund(attempt) : attempt;
  }
  if (attempt.status !== 'pending' || !attempt.gatewayOrderId) return attempt;
  const payments = await razorpay(`/orders/${attempt.gatewayOrderId}/payments`);
  const captured = payments.items?.find((payment) => payment.status === 'captured');
  return captured ? capture(attempt, captured) : attempt;
}
export function getPaymentConfig(_req, res) {
  res.json(paymentConfig());
}

export async function startCheckout(req, res) {
  requirePayments();
  const body = req.body || {};
  if (
    !Array.isArray(body.items) ||
    !body.items.length ||
    body.items.length > 30 ||
    body.items.some((item) => !item || typeof item !== 'object')
  )
    fail('Your cart must contain between 1 and 30 valid items.');
  if (
    typeof body.idempotencyKey !== 'string' ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(body.idempotencyKey)
  )
    fail('A checkout request key is required.');
  const id = `pa_${hash(`${req.user.id}:${body.idempotencyKey}`).slice(0, 32)}`;
  const fingerprint = hash(
    JSON.stringify({
      items: body.items?.map?.(({ dishId, quantity, size, extras }) => ({
        dishId,
        quantity,
        size,
        extras,
      })),
      customer: body.customer,
      fulfillment: body.fulfillment,
      restaurantId: body.restaurantId,
      notes: body.notes,
    }),
  );
  const existing = await findAttempt({ id, owner: req.user.id });
  if (existing) {
    if (existing.fingerprint !== fingerprint)
      fail('Checkout details changed. Start a new checkout.', 409);
    return res.json(publicAttempt(await reconcile(existing)));
  }
  const snapshot = await buildOrder({ ...body, payment: 'razorpay' }, req.user.id);
  snapshot.id = `OD-${id.slice(3)}`;
  const attempt = {
    id,
    owner: req.user.id,
    fingerprint,
    snapshot,
    status: 'creating',
    createdAt: new Date().toISOString(),
  };
  if (!(await createAttempt(attempt))) {
    const raced = await findAttempt({ id, owner: req.user.id });
    if (raced.fingerprint !== fingerprint)
      fail('Checkout details changed. Start a new checkout.', 409);
    return res.json(publicAttempt(raced));
  }
  try {
    const gateway = await razorpay('/orders', {
      method: 'POST',
      body: {
        amount: snapshot.totals.total * 100,
        currency: 'INR',
        receipt: id,
        partial_payment: false,
        notes: { menumate_attempt: id },
      },
    });
    if (
      !providerId(gateway.id, 'order') ||
      gateway.amount !== snapshot.totals.total * 100 ||
      gateway.currency !== 'INR'
    )
      fail('Payment provider returned unexpected order details.', 502);
    const updated = await changeAttempt(id, 'creating', {
      status: 'pending',
      gatewayOrderId: gateway.id,
    });
    res.status(201).json(publicAttempt(updated));
  } catch (error) {
    await changeAttempt(id, 'creating', { status: 'creation_unknown' });
    throw error;
  }
}
export async function checkoutStatus(req, res) {
  requirePayments();
  res.json(publicAttempt(await reconcile(await ownedAttempt(req))));
}
export async function verifyCheckout(req, res) {
  requirePayments();
  const attempt = await ownedAttempt(req);
  const body = req.body || {};
  if (
    !providerId(body.razorpay_payment_id, 'pay') ||
    body.razorpay_order_id !== attempt.gatewayOrderId ||
    !validSignature(
      `${attempt.gatewayOrderId}|${body.razorpay_payment_id}`,
      body.razorpay_signature,
      env.razorpayKeySecret,
    )
  )
    fail('Payment verification failed.', 400);
  const payment = await razorpay(`/payments/${body.razorpay_payment_id}`);
  if (paidStates.includes(attempt.status)) {
    if (attempt.paymentId !== payment.id) fail('Payment does not match this order.', 409);
    return res.json(publicAttempt(await reconcile(attempt)));
  }
  res.json(publicAttempt(await capture(attempt, payment)));
}
export async function refundOrder(req, res) {
  requirePayments();
  const order = await getRecord('order', req.params.id);
  if (!order || order.payment !== 'razorpay') fail('Razorpay order not found.', 404);
  if (order.status !== 'Cancelled') fail('Cancel the order before requesting a full refund.', 409);
  let attempt = await findAttempt({ id: order.paymentDetails?.attemptId });
  if (!attempt || !paidStates.includes(attempt.status)) fail('Captured payment not found.', 409);
  if (attempt.refund?.id) return res.json(publicAttempt(await syncRefund(attempt)));
  const refund = await razorpay(`/payments/${attempt.paymentId}/refund`, {
    method: 'POST',
    headers: { 'X-Refund-Idempotency': `refund-${attempt.id}` },
    body: { amount: order.totals.total * 100, speed: 'normal', receipt: attempt.id },
  });
  if (
    !providerId(refund.id, 'rfnd') ||
    refund.payment_id !== attempt.paymentId ||
    refund.amount !== order.totals.total * 100
  )
    fail('Refund response was unexpected. Check its status before retrying.', 502);
  attempt =
    (await changeAttempt(attempt.id, 'captured', { status: 'refund_pending', refund })) ||
    (await findAttempt({ id: attempt.id }));
  res.json(publicAttempt(await syncRefund(attempt)));
}
export async function paymentWebhook(req, res) {
  if (
    !Buffer.isBuffer(req.body) ||
    !validSignature(req.body, req.get('X-Razorpay-Signature'), env.razorpayWebhookSecret)
  )
    fail('Invalid webhook signature.', 400);
  let event;
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch {
    fail('Invalid webhook payload.');
  }
  let attempt;
  if (['payment.captured', 'order.paid'].includes(event.event)) {
    const gatewayId = event.payload?.payment?.entity?.order_id || event.payload?.order?.entity?.id;
    if (providerId(gatewayId, 'order')) attempt = await findAttempt({ gatewayOrderId: gatewayId });
  } else if (['refund.created', 'refund.processed', 'refund.failed'].includes(event.event)) {
    const refund = event.payload?.refund?.entity;
    if (providerId(refund?.payment_id, 'pay')) {
      attempt = await findAttempt({ paymentId: refund.payment_id });
      // Only sync refunds initiated here; unknown/manual refunds require operator reconciliation.
      if (attempt?.refund?.id !== refund.id) attempt = null;
    }
  }
  if (attempt) await reconcile(attempt);
  res.json({ received: true });
}
