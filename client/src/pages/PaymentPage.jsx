import { photoUrl } from '../services/photos.js';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Smartphone, CreditCard, Banknote, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useStore } from '../context/store.js';
import { apiRequest } from '../services/api.js';
import { openRazorpay } from '../services/razorpay.js';
import { useResource } from '../hooks/useResource.js';
import { useAuth } from '../context/auth.js';
import { cartDish, totals, money, itemPrice } from '../../../shared/menu.js';
import { Stepper, OrderTotals, EmptyState, DemoNote, ErrorMessage } from '../components/ui.jsx';

const cartItems = (cart) =>
  cart.map(({ dishId, quantity, size, extras }) => ({ dishId, quantity, size, extras }));

export default function PaymentPage() {
  const { cart, setCart, checkout } = useStore();
  const [payment, setPayment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();
  const config = useResource('/payments/config');
  const storageKey = `menumate-payment-${user.id}`;
  const [pending, setPending] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(storageKey)) || null;
    } catch {
      return null;
    }
  });
  const method = pending?.id
    ? 'razorpay'
    : payment || (config.data?.enabled ? 'razorpay' : 'demo-upi');
  function remember(value) {
    setPending(value);
    if (value) sessionStorage.setItem(storageKey, JSON.stringify(value));
    else sessionStorage.removeItem(storageKey);
  }
  function completed(id, paidItems) {
    remember(null);
    // Recovery must not erase a different bag built after the original checkout.
    if (!paidItems || JSON.stringify(cartItems(cart)) === JSON.stringify(paidItems)) setCart([]);
    navigate(`/orders/${id}/confirmation`);
  }
  async function finishPayment(session, attempt) {
    if (session.orderId) return completed(session.orderId, attempt.items);
    const response = await openRazorpay(session, attempt.customer);
    const verified = await apiRequest(`/payments/checkout/${session.id}/verify`, {
      method: 'POST',
      body: JSON.stringify(response),
    });
    if (!verified.orderId)
      throw new Error('Payment confirmation is pending. Check payment status before retrying.');
    completed(verified.orderId, attempt.items);
  }
  async function resumePayment() {
    if (!pending?.id || busy) return;
    setBusy(true);
    setError('');
    try {
      const session = await apiRequest(`/payments/checkout/${pending.id}`);
      await finishPayment(session, pending);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  async function checkPayment() {
    if (!pending?.id || busy) return;
    setBusy(true);
    setError('');
    try {
      const status = await apiRequest(`/payments/checkout/${pending.id}`);
      if (status.orderId) completed(status.orderId, pending.items);
      else setError('Payment is not confirmed yet. Your bag is saved. Check again shortly.');
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  const recovery = pending?.id && (
    <div className="container panel payment-recovery">
      <p>A previous payment may still be processing. Check it before placing another order.</p>
      <button className="button secondary" disabled={busy} onClick={checkPayment}>
        Check payment status
      </button>
      <button
        className="text-link"
        disabled={busy || !config.data?.enabled}
        onClick={resumePayment}
      >
        Resume previous payment
      </button>
      <ErrorMessage>{error}</ErrorMessage>
    </div>
  );
  if (!cart.length)
    return (
      <>
        <EmptyState
          title="Nothing to check out just yet"
          text="Your next favourite dish is waiting."
        />
        {recovery}
      </>
    );
  if (
    !checkout.name ||
    !checkout.phone ||
    (checkout.fulfillment === 'delivery' && !checkout.address)
  )
    return (
      <>
        <EmptyState
          title="First, a few details"
          text="Tell us where your meal is headed."
          to="/checkout"
          action="Add your details"
        />
        {recovery}
      </>
    );
  async function placeOrder() {
    if (busy) return;
    if (pending?.id) return resumePayment();
    setBusy(true);
    setError('');
    try {
      const payload = {
        items: cartItems(cart),
        restaurantId: cart[0]?.dish?.restaurantId,
        fulfillment: checkout.fulfillment,
        customer: { name: checkout.name, phone: checkout.phone, address: checkout.address },
        notes: checkout.notes,
      };
      if (method === 'razorpay') {
        const fingerprint = JSON.stringify(payload);
        const attempt =
          pending?.fingerprint === fingerprint
            ? pending
            : {
                key: crypto.randomUUID(),
                fingerprint,
                items: payload.items,
                customer: payload.customer,
              };
        remember(attempt);
        const session = await apiRequest('/payments/checkout', {
          method: 'POST',
          body: JSON.stringify({ ...payload, idempotencyKey: attempt.key }),
        });
        if (session.orderId) return completed(session.orderId, attempt.items);
        if (!session.gatewayOrderId) {
          if (session.status === 'creation_unknown') remember(null);
          throw new Error(
            'Checkout could not start. No payment form was opened; please retry shortly.',
          );
        }
        remember({ ...attempt, id: session.id, amount: session.amount });
        await finishPayment(session, attempt);
      } else {
        const order = await apiRequest('/orders', {
          method: 'POST',
          body: JSON.stringify({ ...payload, payment: method }),
        });
        completed(order.id);
      }
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container page-space">
      <Stepper step={2} />
      <div className="centered-heading">
        <span className="eyebrow">ONE LAST LITTLE THING</span>
        <h1>Make it a meal.</h1>
        <p>Review your order and choose how you’d like to pay.</p>
      </div>
      <DemoNote>
        {config.data?.enabled
          ? 'Razorpay test mode: use test payment details only. No real money or food delivery.'
          : 'Demo checkout: no charge and no real order is sent to a kitchen.'}
      </DemoNote>
      <div className="checkout-grid">
        <div className="panel">
          <h3>Select payment method</h3>
          <div className="payment-options">
            {[
              [
                'razorpay',
                ShieldCheck,
                'Pay with Razorpay',
                config.data?.enabled
                  ? 'Test checkout · UPI, cards and more'
                  : 'Setup pending · Test keys required',
              ],
              ...(config.data?.demoAvailable
                ? [
                    ['demo-upi', Smartphone, 'UPI', 'Google Pay, PhonePe, Paytm · simulated'],
                    [
                      'demo-card',
                      CreditCard,
                      'Credit / debit card',
                      'Secure card payment · simulated',
                    ],
                    [
                      'cash',
                      Banknote,
                      'Cash on delivery',
                      'Pay when your food arrives · demo order',
                    ],
                  ]
                : []),
            ].map(([value, Icon, label, text]) => (
              <label key={value} className={method === value ? 'selected' : ''}>
                <Icon size={24} />
                <span>
                  <strong>{label}</strong>
                  <small>{text}</small>
                </span>
                <input
                  type="radio"
                  name="payment"
                  disabled={
                    busy || !!pending?.id || (value === 'razorpay' && !config.data?.enabled)
                  }
                  checked={method === value}
                  onChange={() => setPayment(value)}
                />
              </label>
            ))}
          </div>
          <div className="payment-reassurance">
            <ShieldCheck size={32} strokeWidth={1.2} />
            <div>
              <strong>
                {method === 'razorpay' ? 'Protected checkout' : 'Try the complete experience'}
              </strong>
              <p>
                {method === 'razorpay'
                  ? 'Payment details stay in Razorpay. MenuMate verifies the payment before confirming your order.'
                  : 'The demo does not collect payment details.'}
              </p>
            </div>
          </div>
          <div className="address-card">
            <strong>
              {checkout.fulfillment === 'delivery' ? 'Delivering to' : 'Order for'} {checkout.name}
            </strong>
            <p>
              {checkout.fulfillment === 'delivery'
                ? checkout.address
                : cart[0]?.dish?.restaurantAddress || 'Restaurant pickup'}
              <br />
              {checkout.phone}
            </p>
            <Link to="/checkout" className="text-link">
              Change details
            </Link>
          </div>
        </div>
        <aside className="panel summary-panel">
          <h2>Your order</h2>
          {cart.map((item) => {
            const dish = cartDish(item);
            return (
              <div className="mini-cart-item" key={item.key}>
                <img src={photoUrl(dish.image)} alt="" />
                <span>
                  {dish.name}
                  <small>
                    {item.quantity} × {item.size}
                  </small>
                </span>
                <strong>{money(itemPrice(item) * item.quantity)}</strong>
              </div>
            );
          })}
          <OrderTotals totals={totals(cart, checkout.fulfillment)} />
          <ErrorMessage>{config.error || error}</ErrorMessage>
          {pending?.id && (
            <div className="payment-recovery">
              <p>
                Your previous checkout{pending.amount ? ` for ${money(pending.amount / 100)}` : ''}{' '}
                is saved. Resume it or check its status. Changes to this bag will not change that
                payment.
              </p>
              <button
                className="button secondary full-width"
                disabled={busy}
                onClick={checkPayment}
              >
                Check payment status
              </button>
            </div>
          )}
          {config.loading && <p role="status">Loading payment options...</p>}
          {config.error && (
            <button className="text-link" onClick={config.reload}>
              Retry payment options
            </button>
          )}
          <button
            className="button full-width"
            disabled={
              busy ||
              config.loading ||
              !!config.error ||
              (method === 'razorpay' ? !config.data?.enabled : !config.data?.demoAvailable)
            }
            onClick={placeOrder}
          >
            {busy
              ? 'Confirming your order…'
              : pending?.id
                ? 'Resume previous payment'
                : method === 'razorpay'
                  ? 'Continue to Razorpay'
                  : 'Place demo order'}
          </button>
          <p className="small-muted legal-checkout-note">
            By placing the order, you agree to the <Link to="/terms">Terms of Use</Link> and
            applicable <Link to="/cancellation-refunds">cancellation terms</Link>.
          </p>
          <Link className="back-link centered" to="/cart">
            <ArrowLeft size={14} /> Back to cart
          </Link>
        </aside>
      </div>
    </div>
  );
}
