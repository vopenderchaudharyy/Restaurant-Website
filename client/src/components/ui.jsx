import { photoUrl } from '../services/photos.js';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ChefHat,
  Leaf,
  Utensils,
  ShoppingBag,
  CalendarCheck,
  Heart,
  Plus,
  Minus,
  Star,
  CheckCircle2,
} from 'lucide-react';
import { useStore } from '../context/store.js';
import { money } from '../../../shared/menu.js';

export function ButtonLink({ to, children, secondary = false, className = '' }) {
  return (
    <Link to={to} className={`button ${secondary ? 'secondary' : ''} ${className}`}>
      {children}
    </Link>
  );
}
export function SectionHeading({ eyebrow, title, text, link }) {
  return (
    <div className={`section-heading ${link ? 'split-heading' : ''}`}>
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {text && <p>{text}</p>}
      </div>
      {link && (
        <Link className="text-link" to={link}>
          Explore the menu <ArrowRight size={17} />
        </Link>
      )}
    </div>
  );
}
export function FeatureStrip({ booking = false }) {
  const features = booking
    ? [
        [CalendarCheck, 'Instant confirmation'],
        [CalendarCheck, 'Flexible booking'],
        [Heart, 'Special occasions'],
        [Utensils, 'Group reservations'],
      ]
    : [
        [Leaf, 'Fresh ingredients'],
        [ChefHat, 'Chef’s special'],
        [Utensils, 'A place to gather'],
        [ShoppingBag, 'Online ordering'],
        [CalendarCheck, 'Private events'],
      ];
  return (
    <div className="feature-strip">
      {features.map(([Icon, title]) => (
        <div key={title}>
          <Icon size={28} strokeWidth={1.4} />
          <span>{title}</span>
        </div>
      ))}
    </div>
  );
}
export function DishCard({ dish }) {
  const { addItem, favorites, toggleFavorite, catalog, setOverlay } = useStore();
  const available = catalog.find((entry) => entry.id === dish.id)?.available !== false;
  return (
    <article className="dish-card">
      <div className="dish-photo">
        <Link to={`/menu/${dish.id}`} aria-label={`View ${dish.name}`}>
          <img src={photoUrl(dish.image)} alt={dish.name} loading="lazy" />
        </Link>
        <button
          className="quick-view"
          onClick={() => setOverlay({ type: 'dish', id: dish.id })}
          aria-label={`Quick view ${dish.name}`}
        >
          Customise <ArrowRight size={15} />
        </button>
        {dish.tag && <span className="dish-tag">{dish.tag}</span>}
        <button
          className={`favorite ${favorites.includes(dish.id) ? 'selected' : ''}`}
          onClick={() => toggleFavorite(dish.id)}
          aria-label={`${favorites.includes(dish.id) ? 'Remove' : 'Save'} ${dish.name} ${favorites.includes(dish.id) ? 'from' : 'to'} favorites`}
          aria-pressed={favorites.includes(dish.id)}
        >
          <Heart size={18} fill={favorites.includes(dish.id) ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="dish-info">
        {dish.restaurantId && (
          <Link className="dish-restaurant" to={`/restaurants/${dish.restaurantId}`}>
            {dish.restaurantName}
          </Link>
        )}
        {dish.samplePhoto && (
          <small className="sample-photo-label">Demo dish / illustrative photo</small>
        )}
        <div className="dish-title">
          <h3>
            <Link to={`/menu/${dish.id}`}>{dish.name}</Link>
          </h3>
          <span
            className={`diet ${dish.veg ? 'veg' : ''}`}
            title={dish.veg ? 'Vegetarian' : 'Non-vegetarian'}
          >
            <i />
          </span>
        </div>
        <div className="rating">
          <Star size={13} fill="currentColor" />
          <b>{dish.rating || 'New'}</b>
          {dish.reviews > 0 && <span>({dish.reviews} demo ratings)</span>}
        </div>
        <div className="dish-bottom">
          <strong>{money(dish.price)}</strong>
          <button
            onClick={() => addItem(dish.id)}
            className="add-button"
            disabled={!available}
            aria-label={`Add ${dish.name} to cart`}
          >
            <Plus size={19} />
            <span>{available ? 'Add' : 'Sold out'}</span>
          </button>
        </div>
      </div>
      {!available && <p className="sold-out-label">Currently sold out</p>}
    </article>
  );
}
export function Quantity({ value, onChange, label = 'Quantity' }) {
  return (
    <div className="quantity" aria-label={label}>
      <button
        aria-label={`Decrease ${label}`}
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
      >
        <Minus size={14} />
      </button>
      <span>{value}</span>
      <button
        aria-label={`Increase ${label}`}
        onClick={() => onChange(value + 1)}
        disabled={value >= 20}
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
export function OrderTotals({ totals }) {
  return (
    <div className="order-totals">
      <p>
        <span>Subtotal</span>
        <span>{money(totals.subtotal)}</span>
      </p>
      <p>
        <span>Delivery charge</span>
        <span>{totals.delivery ? money(totals.delivery) : 'Free'}</span>
      </p>
      <p>
        <span>Taxes (5%)</span>
        <span>{money(totals.tax)}</span>
      </p>
      <p className="grand-total">
        <strong>Total</strong>
        <strong>{money(totals.total)}</strong>
      </p>
    </div>
  );
}
export function EmptyState({ title, text, to = '/menu', action = 'Explore our menu' }) {
  return (
    <div className="empty-state">
      <ShoppingBag size={46} strokeWidth={1.2} />
      <h2>{title}</h2>
      <p>{text}</p>
      <ButtonLink to={to}>
        {action}
        <ArrowRight size={17} />
      </ButtonLink>
    </div>
  );
}
export function ErrorMessage({ children }) {
  return children ? (
    <p className="error-message" role="alert">
      {children}
    </p>
  ) : null;
}
export function Loading() {
  return (
    <div className="loading" role="status">
      <span className="spinner" />
      Getting things ready…
    </div>
  );
}
export function DemoNote({ children }) {
  return (
    <div className="demo-note">
      <span className="demo-dot" />
      {children || 'Demo experience · No payment is collected or real reservation made.'}
    </div>
  );
}
export function Stepper({ step }) {
  return (
    <div className="stepper">
      {['Delivery', 'Payment', 'Review'].map((label, index) => (
        <div key={label} className={step >= index + 1 ? 'active' : ''}>
          <span>{step > index + 1 ? <CheckCircle2 size={19} /> : index + 1}</span>
          <small>{label}</small>
        </div>
      ))}
    </div>
  );
}
