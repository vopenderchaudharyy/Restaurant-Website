import { useNavigate } from 'react-router-dom';
import { Bike, ShoppingBag, Utensils, Clock, ArrowRight } from 'lucide-react';
import { useStore } from '../context/store.js';
import { totals } from '../../../shared/menu.js';
import { Stepper, OrderTotals, EmptyState, DemoNote } from '../components/ui.jsx';

export default function CheckoutPage() {
  const { cart, checkout, setCheckout, profile } = useStore();
  const navigate = useNavigate();
  if (!cart.length)
    return (
      <EmptyState
        title="Your bag is feeling a little empty"
        text="Add a dish before checking out."
      />
    );
  function update(event) {
    setCheckout({ ...checkout, [event.target.name]: event.target.value });
  }
  function submit(event) {
    event.preventDefault();
    navigate('/payment');
  }
  return (
    <div className="container page-space checkout-page">
      <Stepper step={1} />
      <div className="centered-heading">
        <span className="eyebrow">ALMOST AT YOUR TABLE</span>
        <h1>How would you like it?</h1>
        <p>A delicious meal, your way.</p>
      </div>
      <DemoNote />
      <form className="checkout-grid" onSubmit={submit}>
        <div className="panel">
          <div className="fulfillment-options">
            {[
              ['delivery', Bike, 'Delivery'],
              ['pickup', ShoppingBag, 'Pickup'],
              ['dine-in', Utensils, 'Dine-in'],
            ].map(([value, Icon, label]) => (
              <label key={value} className={checkout.fulfillment === value ? 'selected' : ''}>
                <input
                  type="radio"
                  name="fulfillment"
                  value={value}
                  checked={checkout.fulfillment === value}
                  onChange={update}
                />
                <Icon size={20} />
                {label}
              </label>
            ))}
          </div>
          <h3>{checkout.fulfillment === 'delivery' ? 'Delivery details' : 'Your details'}</h3>
          <div className="form-grid">
            <label className="field-label">
              Full name
              <input
                required
                name="name"
                autoComplete="name"
                maxLength={80}
                value={checkout.name}
                onChange={update}
                placeholder={profile.name || 'Your name'}
              />
            </label>
            <label className="field-label">
              Phone number
              <input
                required
                name="phone"
                type="tel"
                autoComplete="tel"
                pattern="[+0-9 ()\-]{7,20}"
                maxLength={20}
                value={checkout.phone}
                onChange={update}
                placeholder="Your mobile number"
              />
            </label>
          </div>
          {checkout.fulfillment === 'delivery' ? (
            <label className="field-label">
              Delivery address
              <textarea
                required
                name="address"
                autoComplete="street-address"
                minLength={8}
                maxLength={300}
                rows={3}
                value={checkout.address}
                onChange={update}
                placeholder="House / flat, street, area and postal code"
              />
            </label>
          ) : (
            <div className="address-card">
              <strong>MenuMate, MG Road</strong>
              <p>123, MG Road, Bangalore, Karnataka 560001</p>
              <span>
                {checkout.fulfillment === 'pickup'
                  ? 'Collect your order from our front desk.'
                  : 'Please share your order number with our team.'}
              </span>
            </div>
          )}
          <h3 className="spaced-title">
            {checkout.fulfillment === 'delivery' ? 'Delivery time' : 'Ready when you are'}
          </h3>
          <div className="time-card">
            <Clock size={21} />
            <div>
              <strong>As soon as possible</strong>
              <p>Estimated 30–40 minutes · Demo estimate</p>
            </div>
            <span className="radio-dot" />
          </div>
        </div>
        <aside className="panel summary-panel">
          <h2>Your delicious plan</h2>
          <OrderTotals totals={totals(cart, checkout.fulfillment)} />
          <button className="button full-width" type="submit">
            Continue to payment <ArrowRight size={17} />
          </button>
          <p className="small-muted">You can review your order before placing it.</p>
        </aside>
      </form>
    </div>
  );
}
