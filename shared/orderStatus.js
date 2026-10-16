export function nextOrderStatuses(order) {
  const next = {
    Placed: ['Preparing', 'Cancelled'],
    Preparing: [order.fulfillment === 'delivery' ? 'Out for delivery' : 'Ready', 'Cancelled'],
    'Out for delivery': ['Delivered'],
    Ready: ['Collected'],
    Delivered: [],
    Collected: [],
    Cancelled: [],
  };
  return next[order.status] || [];
}
export const reservationTransitions = {
  Confirmed: ['Seated', 'Cancelled', 'No-show'],
  Seated: ['Completed'],
  Completed: [],
  Cancelled: [],
  'No-show': [],
};
