import { listRecords, getRecord, updateRecord } from '../services/records.js';
import { setAvailability } from '../services/catalog.js';
import { nextOrderStatuses, reservationTransitions } from '../../../shared/orderStatus.js';
import { fail } from '../utils/errors.js';

export async function adminOrders(_req, res) {
  res.set('Cache-Control', 'no-store');
  res.json(await listRecords('order'));
}
export async function adminReservations(_req, res) {
  res.set('Cache-Control', 'no-store');
  res.json(await listRecords('reservation'));
}
export async function adminOrderStatus(req, res) {
  const order = await getRecord('order', req.params.id);
  if (!order) fail('Order not found.', 404);
  if (req.body?.expectedStatus !== order.status)
    fail('This order changed. Refresh and try again.', 409);
  if (!nextOrderStatuses(order).includes(req.body?.status))
    fail('This status change is not allowed.', 409);
  const updated = await updateRecord('order', order.id, undefined, order.status, {
    status: req.body.status,
    history: [
      ...(order.history || [{ status: 'Placed', at: order.createdAt }]),
      { status: req.body.status, at: new Date().toISOString(), actor: req.user.id },
    ],
  });
  if (!updated) fail('This order changed. Refresh and try again.', 409);
  res.json(updated);
}
export async function adminReservationStatus(req, res) {
  const booking = await getRecord('reservation', req.params.id);
  if (!booking) fail('Reservation not found.', 404);
  if (
    req.body?.expectedStatus !== booking.status ||
    !reservationTransitions[booking.status]?.includes(req.body?.status)
  )
    fail('This reservation changed or the transition is not allowed.', 409);
  const updated = await updateRecord('reservation', booking.id, undefined, booking.status, {
    status: req.body.status,
    updatedAt: new Date().toISOString(),
    history: [
      ...(booking.history || []),
      { status: req.body.status, at: new Date().toISOString(), actor: req.user.id },
    ],
  });
  if (!updated) fail('This reservation changed. Refresh and try again.', 409);
  res.json(updated);
}
export async function adminAvailability(req, res) {
  res.json(await setAvailability(req.params.id, req.body?.available));
}
export async function cancelOrder(req, res) {
  const order = await getRecord('order', req.params.id, req.user.id);
  if (!order) fail('Order not found.', 404);
  const updated = await updateRecord('order', req.params.id, req.user.id, 'Placed', {
    status: 'Cancelled',
    cancelledAt: new Date().toISOString(),
    history: [
      ...(order.history || []),
      { status: 'Cancelled', at: new Date().toISOString(), actor: req.user.id },
    ],
  });
  if (!updated)
    fail(
      'This order cannot be cancelled. Orders can only be cancelled before preparation starts.',
      409,
    );
  res.json(updated);
}
export async function cancelReservation(req, res) {
  const booking = await getRecord('reservation', req.params.id, req.user.id);
  if (!booking) fail('Reservation not found.', 404);
  if (new Date(`${booking.date}T${booking.time}:00+05:30`).getTime() <= Date.now())
    fail('Past reservations cannot be cancelled.', 409);
  const updated = await updateRecord('reservation', booking.id, req.user.id, 'Confirmed', {
    status: 'Cancelled',
    updatedAt: new Date().toISOString(),
    history: [
      ...(booking.history || []),
      { status: 'Cancelled', at: new Date().toISOString(), actor: req.user.id },
    ],
  });
  if (!updated) fail('This reservation cannot be cancelled.', 409);
  res.json(updated);
}
