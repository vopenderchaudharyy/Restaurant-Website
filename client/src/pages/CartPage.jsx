import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Trash2, ShieldCheck, ShoppingBag } from 'lucide-react';
import { useStore } from '../context/store.js';
import { menu, extras, money, itemPrice, totals } from '../../../shared/menu.js';
import { ButtonLink, Quantity, OrderTotals, EmptyState } from '../components/ui.jsx';

export default function CartPage() {
  const { cart, setCart, updateQuantity, checkout, setCheckout } = useStore();
  if (!cart.length)
    return (
      <div className="container">
        <EmptyState
          title="Your next great meal starts here."
          text="Your bag is empty. Let’s fill it with something you’ll love."
        />
      </div>
    );
  return (
    <div className="container page-space">
      <Link className="back-link" to="/menu">
        <ArrowLeft size={16} /> Back to menu
      </Link>
      <div className="page-title">
        <span className="eyebrow">GOOD CHOICES, GREAT TASTE</span>
        <h1>
          Your cart<span>({cart.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
        </h1>
      </div>
      <div className="checkout-grid">
        <div className="panel cart-panel">
          <div className="panel-heading">
            <h3>A little happiness, to go</h3>
            <button className="text-link" onClick={() => setCart([])}>
              Clear all
            </button>
          </div>
          <div>
            {cart.map((item) => {
              const dish = menu.find((entry) => entry.id === item.dishId);
              return (
                <article className="cart-item" key={item.key}>
                  <Link to={`/menu/${dish.id}`}>
                    <img src={dish.image} alt={dish.name} />
                  </Link>
                  <div className="cart-item-info">
                    <h3>
                      <Link to={`/menu/${dish.id}`}>{dish.name}</Link>
                    </h3>
                    <p>
                      {item.size === 'large' ? 'Large' : 'Regular'} portion
                      {item.extras.length > 0 &&
                        ` · ${extras
                          .filter((extra) => item.extras.includes(extra.id))
                          .map((extra) => extra.name)
                          .join(', ')}`}
                    </p>
                    <Quantity
                      value={item.quantity}
                      onChange={(value) => updateQuantity(item.key, value)}
                      label={dish.name}
                    />
                  </div>
                  <div className="cart-item-end">
                    <strong>{money(itemPrice(item) * item.quantity)}</strong>
                    <button
                      className="icon-button"
                      aria-label={`Remove ${dish.name}`}
                      onClick={() => updateQuantity(item.key, 0)}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          <label className="field-label cart-notes">
            Anything we should know?
            <textarea
              maxLength={500}
              value={checkout.notes}
              onChange={(event) => setCheckout({ ...checkout, notes: event.target.value })}
              placeholder="Less spicy, no onions, a little extra love…"
              rows={3}
            />
          </label>
        </div>
        <aside className="panel summary-panel">
          <h2>Order summary</h2>
          <OrderTotals totals={totals(cart, checkout.fulfillment)} />
          <ButtonLink to="/checkout" className="full-width">
            Proceed to checkout <ArrowRight size={17} />
          </ButtonLink>
          <div className="assurance">
            <ShieldCheck size={18} />
            <span>Freshly made. Carefully packed.</span>
          </div>
          <div className="summary-quote">
            <ShoppingBag size={25} strokeWidth={1.3} />
            <p>
              Good food is always
              <br />a good idea.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
