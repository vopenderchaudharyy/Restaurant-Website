import { PaymentStatus } from '../components/PaymentStatus.jsx';
import OrderReview from '../components/OrderReview.jsx';
import { photoUrl } from '../services/photos.js';
import { Link, useParams } from 'react-router-dom';
import {
  PackageCheck,
  Clock,
  Check,
  ChefHat,
  Bike,
  ShoppingBag,
  ArrowRight,
  MapPin,
} from 'lucide-react';
import { useResource } from '../hooks/useResource.js';
import { money } from '../../../shared/menu.js';
import { ButtonLink, Loading, ErrorMessage, DemoNote, OrderTotals } from '../components/ui.jsx';

export function OrderConfirmationPage() {
  const { id } = useParams();
  const { data: order, loading, error, reload } = useResource(`/orders/${id}`);
  if (loading) return <Loading />;
  if (error)
    return (
      <div className="container page-space">
        <ErrorMessage>{error}</ErrorMessage>
        <button className="button" onClick={reload}>
          Try again
        </button>
      </div>
    );
  return (
    <div className="confirmation-page container">
      <div className="celebration-icon">
        <PackageCheck size={64} strokeWidth={1.2} />
        <span>✓</span>
        <i />
        <i />
        <i />
      </div>
      <span className="eyebrow">A LITTLE HAPPINESS IS ON ITS WAY</span>
      <h1>{order.status === 'Cancelled' ? 'Order cancelled' : 'Order placed successfully!'}</h1>
      <p>
        Thanks, {order.customer.name.split(' ')[0]}.<br />
        {order.status === 'Cancelled'
          ? 'This order has been cancelled.'
          : 'Your demo order is all set.'}
      </p>
      <div className="confirmation-card">
        <div className="receipt-line">
          <span>{order.restaurantName || 'MenuMate Kitchen'} / Order ID</span>
          <strong>#{order.id.slice(0, 11).toUpperCase()}</strong>
        </div>
        <div className="delivery-estimate">
          <span className="round-icon">
            <Clock />
          </span>
          <div>
            <small>Current order status</small>
            <strong>{order.status}</strong>
          </div>
          <Link to={`/orders/${id}/tracking`} className="text-link">
            Track order <ArrowRight size={14} />
          </Link>
        </div>
        <div className="receipt-line">
          <span>Order total</span>
          <strong>{money(order.totals.total)}</strong>
        </div>
      </div>
      <PaymentStatus order={order} />
      <DemoNote>
        {order.payment === 'razorpay'
          ? 'Razorpay Test Mode payment. No real money or food delivery.'
          : 'This is a demo order. No payment was collected and no food will be dispatched.'}
      </DemoNote>
      <div className="confirmation-actions">
        <ButtonLink to="/menu" secondary>
          Continue exploring
        </ButtonLink>
        <ButtonLink to={`/orders/${id}/tracking`}>
          View order details <ArrowRight size={16} />
        </ButtonLink>
      </div>
    </div>
  );
}
export function OrderTrackingPage() {
  const { id } = useParams();
  const { data: order, loading, error, reload } = useResource(`/orders/${id}`, { pollMs: 15000 });
  if (loading) return <Loading />;
  if (error)
    return (
      <div className="container page-space">
        <ErrorMessage>{error}</ErrorMessage>
        <button className="button" onClick={reload}>
          Try again
        </button>
      </div>
    );
  return (
    <div className="container page-space">
      <div className="page-title">
        <span className="eyebrow">FROM OUR KITCHEN TO YOUR TABLE</span>
        <h1 aria-live="polite">
          {order.status === 'Cancelled'
            ? 'Your order was cancelled.'
            : `Your order: ${order.status.toLowerCase()}.`}
        </h1>
        <p>
          Order #{order.id.slice(0, 11).toUpperCase()} ·{' '}
          {new Date(order.createdAt).toLocaleString('en-IN')}
        </p>
      </div>
      <DemoNote>
        Order status refreshes every 15 seconds when the restaurant updates it. Live courier
        location tracking is not connected.
      </DemoNote>
      <PaymentStatus order={order} />
      <div className="tracking-grid">
        <section className="panel">
          <h2>Your order’s journey</h2>
          <div className="timeline">
            {[
              [Check, 'Order placed', 'Your demo order has been received.'],
              [ChefHat, 'Preparing your order', 'Our chefs would start working their magic.'],
              [
                Bike,
                order.fulfillment === 'delivery' ? 'Out for delivery' : 'Ready for collection',
                'Fresh, warm and carefully packed.',
              ],
              [
                ShoppingBag,
                order.fulfillment === 'delivery' ? 'Delivered' : 'Collected',
                'Time to enjoy something delicious.',
              ],
            ].map(([Icon, title, description], index) => (
              <div
                className={
                  [
                    'Placed',
                    'Preparing',
                    order.fulfillment === 'delivery' ? 'Out for delivery' : 'Ready',
                    order.fulfillment === 'delivery' ? 'Delivered' : 'Collected',
                  ].indexOf(order.status) >= index
                    ? 'complete'
                    : ''
                }
                key={title}
              >
                <span>
                  <Icon size={18} />
                </span>
                <div>
                  <strong>{title}</strong>
                  <p>{description}</p>
                  {index === 0 && (
                    <small>
                      {new Date(order.createdAt).toLocaleTimeString('en-IN', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </small>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
        <div>
          <div className="tracking-art">
            <img
              src={photoUrl(order.restaurantImage || '/images/design/restaurant.jpg')}
              alt={order.restaurantName || 'Restaurant'}
            />
            <div>
              <MapPin size={24} />
              <strong>{order.restaurantName || 'MenuMate Kitchen'}</strong>
              <span>{order.restaurantAddress || 'MG Road, Bengaluru'}</span>
            </div>
          </div>
          <div className="panel tracking-summary">
            <h3>What’s in your bag</h3>
            {order.items.map((item, index) => (
              <p className="receipt-line" key={index}>
                <span>
                  {item.quantity} × {item.name}
                </span>
                <strong>{money(item.unitPrice * item.quantity)}</strong>
              </p>
            ))}
            <OrderTotals totals={order.totals} />
          </div>
        </div>
      </div>
      {['Delivered', 'Collected'].includes(order.status) && <OrderReview orderId={order.id} />}
    </div>
  );
}
