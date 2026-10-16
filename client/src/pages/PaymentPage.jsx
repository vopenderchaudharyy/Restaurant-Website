import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Smartphone, CreditCard, Banknote, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useStore } from '../context/store.js';
import { apiRequest } from '../services/api.js';
import { menu, totals, money, itemPrice } from '../../../shared/menu.js';
import { Stepper, OrderTotals, EmptyState, DemoNote, ErrorMessage } from '../components/ui.jsx';

export default function PaymentPage() {
  const { cart, setCart, checkout } = useStore();
  const [payment, setPayment] = useState('demo-upi');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  if (!cart.length)
    return (
      <EmptyState
        title="Nothing to check out just yet"
        text="Your next favourite dish is waiting."
      />
    );
  if (
    !checkout.name ||
    !checkout.phone ||
    (checkout.fulfillment === 'delivery' && !checkout.address)
  )
    return (
      <EmptyState
        title="First, a few details"
        text="Tell us where your meal is headed."
        to="/checkout"
        action="Add your details"
      />
    );
  async function placeOrder() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const order = await apiRequest('/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: cart,
          fulfillment: checkout.fulfillment,
          customer: { name: checkout.name, phone: checkout.phone, address: checkout.address },
          notes: checkout.notes,
          payment,
        }),
      });
      setCart([]);
      navigate(`/orders/${order.id}/confirmation`, { state: { order } });
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
        Demo checkout · No charge, no payment details required, and no real order is sent to a
        kitchen.
      </DemoNote>
      <div className="checkout-grid">
        <div className="panel">
          <h3>Select payment method</h3>
          <div className="payment-options">
            {[
              ['demo-upi', Smartphone, 'UPI', 'Google Pay, PhonePe, Paytm · simulated'],
              ['demo-card', CreditCard, 'Credit / debit card', 'Secure card payment · simulated'],
              ['cash', Banknote, 'Cash on delivery', 'Pay when your food arrives · demo order'],
            ].map(([value, Icon, label, text]) => (
              <label key={value} className={payment === value ? 'selected' : ''}>
                <Icon size={24} />
                <span>
                  <strong>{label}</strong>
                  <small>{text}</small>
                </span>
                <input
                  type="radio"
                  name="payment"
                  checked={payment === value}
                  onChange={() => setPayment(value)}
                />
              </label>
            ))}
          </div>
          <div className="payment-reassurance">
            <ShieldCheck size={32} strokeWidth={1.2} />
            <div>
              <strong>Try the complete experience</strong>
              <p>This preview never asks for a card number, UPI PIN or bank details.</p>
            </div>
          </div>
          <div className="address-card">
            <strong>
              {checkout.fulfillment === 'delivery' ? 'Delivering to' : 'Order for'} {checkout.name}
            </strong>
            <p>
              {checkout.fulfillment === 'delivery' ? checkout.address : 'MenuMate, MG Road'}
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
            const dish = menu.find((entry) => entry.id === item.dishId);
            return (
              <div className="mini-cart-item" key={item.key}>
                <img src={dish.image} alt="" />
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
          <ErrorMessage>{error}</ErrorMessage>
          <button className="button full-width" disabled={busy} onClick={placeOrder}>
            {busy ? 'Placing your order…' : 'Place demo order'}
          </button>
          <Link className="back-link centered" to="/cart">
            <ArrowLeft size={14} /> Back to cart
          </Link>
        </aside>
      </div>
    </div>
  );
}
