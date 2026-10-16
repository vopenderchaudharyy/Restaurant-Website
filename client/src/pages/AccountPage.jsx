import { useState } from 'react';
import { Link, NavLink, useParams, useNavigate } from 'react-router-dom';
import {
  UserRound,
  ShoppingBag,
  CalendarDays,
  Heart,
  ArrowRight,
  ShieldCheck,
  LogOut,
  LayoutDashboard,
} from 'lucide-react';
import { useStore } from '../context/store.js';
import { useAuth } from '../context/auth.js';
import { useResource } from '../hooks/useResource.js';
import { apiRequest } from '../services/api.js';
import { menu, money } from '../../../shared/menu.js';
import { DishCard, EmptyState, Loading, ErrorMessage } from '../components/ui.jsx';

const tabs = [
  ['', UserRound, 'My profile'],
  ['orders', ShoppingBag, 'My orders'],
  ['reservations', CalendarDays, 'My reservations'],
  ['favorites', Heart, 'Favourites'],
  ['security', ShieldCheck, 'Security'],
];
export default function AccountPage() {
  const { section = '' } = useParams();
  const { user, logout } = useAuth();
  const { favorites, notify, catalog } = useStore();
  const navigate = useNavigate();
  async function signOut() {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      notify(error.message);
    }
  }
  return (
    <div className="container page-space">
      <div className="account-layout">
        <aside className="account-sidebar">
          <div className="account-welcome">
            <span className="avatar">
              <UserRound size={28} />
            </span>
            <strong>{user.name}</strong>
            <small>
              {user.role === 'admin' ? 'Restaurant owner' : 'Your little corner of MenuMate'}
            </small>
          </div>
          <nav aria-label="Account navigation">
            {tabs.map(([path, Icon, title]) => (
              <NavLink key={title} to={`/account${path ? `/${path}` : ''}`} end>
                <Icon size={18} />
                {title}
                <span>›</span>
              </NavLink>
            ))}
            <Link to="/partner"><LayoutDashboard size={18}/>Restaurant workspace</Link>
            {user.role === 'admin' && (
              <Link to="/admin">
                <LayoutDashboard size={18} />
                Owner dashboard
              </Link>
            )}
          </nav>
          <button className="account-logout" onClick={signOut}>
            <LogOut size={16} />
            Sign out
          </button>
        </aside>
        <div className="account-content">
          {section === 'orders' ? (
            <OrdersList />
          ) : section === 'reservations' ? (
            <ReservationsList />
          ) : section === 'security' ? (
            <SecurityForm />
          ) : section === 'favorites' ? (
            <>
              <span className="eyebrow">SAVED FOR ANOTHER CRAVING</span>
              <h1>Your favourites</h1>
              <p className="small-muted">Saved in this browser.</p>
              {favorites.length ? (
                <div className="dish-grid account-dishes">
                  {catalog
                    .filter((dish) => favorites.includes(dish.id))
                    .map((dish) => (
                      <DishCard dish={dish} key={dish.id} />
                    ))}
                </div>
              ) : (
                <EmptyState
                  title="Love at first bite?"
                  text="Tap the heart on a dish to save it here."
                />
              )}
            </>
          ) : (
            <ProfileForm />
          )}
        </div>
      </div>
    </div>
  );
}
function ProfileForm() {
  const { user, updateProfile } = useAuth();
  const { notify } = useStore();
  const [form, setForm] = useState({ name: user.name, phone: user.phone || '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await updateProfile(form);
      notify('Your profile has been updated.');
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <span className="eyebrow">MAKE YOURSELF AT HOME</span>
      <h1>My profile</h1>
      <p>A few details to make every visit a little more personal.</p>
      <div className="profile-intro">
        <span className="avatar large">{user.name[0].toUpperCase()}</span>
        <div>
          <h3>{user.name}</h3>
          <p>{user.email}</p>
        </div>
        <span className="pill">
          {user.role === 'admin' ? 'Restaurant owner' : 'Food enthusiast'}
        </span>
      </div>
      <form className="profile-form" onSubmit={submit}>
        <h3>Personal information</h3>
        <label className="field-label">
          Full name
          <input
            name="name"
            required
            autoComplete="name"
            maxLength={80}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </label>
        <label className="field-label">
          Email address
          <input name="email" type="email" value={user.email} readOnly />
        </label>
        <p className="small-muted">
          Your email is your sign-in identifier and cannot be changed here.
        </p>
        <label className="field-label">
          Phone number
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={20}
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            placeholder="Your mobile number"
          />
        </label>
        <ErrorMessage>{error}</ErrorMessage>
        <button className="button" disabled={busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </>
  );
}
function SecurityForm() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const details = Object.fromEntries(new FormData(form));
    if (details.newPassword !== details.confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setBusy(true);
    setError('');
    setSuccess(false);
    try {
      await apiRequest('/auth/password', { method: 'POST', body: JSON.stringify(details) });
      setSuccess(true);
      form.reset();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <span className="eyebrow">YOUR ACCOUNT, PROTECTED</span>
      <h1>Account security</h1>
      <p>Changing your password signs out your other sessions.</p>
      <form className="profile-form" onSubmit={submit}>
        <label className="field-label">
          Current password
          <input
            type="password"
            name="currentPassword"
            autoComplete="current-password"
            maxLength={128}
            required
          />
        </label>
        <label className="field-label">
          New password
          <input
            type="password"
            name="newPassword"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
          />
        </label>
        <label className="field-label">
          Confirm new password
          <input
            type="password"
            name="confirmPassword"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
          />
        </label>
        <ErrorMessage>{error}</ErrorMessage>
        {success && (
          <p className="success-message" role="status">
            Password updated. Other sessions have been signed out.
          </p>
        )}
        <button className="button" disabled={busy}>
          {busy ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </>
  );
}
function CancelAction({ path, label, onSuccess }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function cancel() {
    setBusy(true);
    setError('');
    try {
      await apiRequest(path, { method: 'PATCH' });
      onSuccess();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="cancel-action">
      {confirm ? (
        <>
          <span>Are you sure?</span>
          <button className="text-link danger" disabled={busy} onClick={cancel}>
            {busy ? 'Cancelling…' : 'Yes, cancel'}
          </button>
          <button className="text-link" disabled={busy} onClick={() => setConfirm(false)}>
            Keep it
          </button>
        </>
      ) : (
        <button className="text-link danger" onClick={() => setConfirm(true)}>
          {label}
        </button>
      )}
      <ErrorMessage>{error}</ErrorMessage>
    </div>
  );
}
export function OrdersList() {
  const { data, loading, error, reload } = useResource('/orders');
  const { addItems } = useStore();
  const [filter, setFilter] = useState('All orders');
  if (loading) return <Loading />;
  if (error)
    return (
      <>
        <ErrorMessage>{error}</ErrorMessage>
        <button className="button" onClick={reload}>
          Try again
        </button>
      </>
    );
  const orders = data.filter(
    (order) =>
      filter === 'All orders' ||
      (filter === 'Ongoing'
        ? !['Delivered', 'Collected', 'Cancelled'].includes(order.status)
        : filter === 'Completed'
          ? ['Delivered', 'Collected'].includes(order.status)
          : order.status === 'Cancelled'),
  );
  return (
    <>
      <span className="eyebrow">GOOD FOOD, GREAT MEMORIES</span>
      <h1>My orders</h1>
      <div className="simple-tabs">
        {['All orders', 'Ongoing', 'Completed', 'Cancelled'].map((tab) => (
          <button
            key={tab}
            className={filter === tab ? 'active' : ''}
            onClick={() => setFilter(tab)}
          >
            {tab}
          </button>
        ))}
      </div>
      {orders.length ? (
        <div className="order-list">
          {orders.map((order) => (
            <article className="order-history-card" key={order.id}>
              <div className="order-history-top">
                <strong>{order.restaurantName || 'MenuMate Kitchen'} ? #{order.id.slice(0, 11).toUpperCase()}</strong>
                <span className={`status-badge ${order.status === 'Cancelled' ? 'cancelled' : ''}`}>
                  {order.status}
                </span>
              </div>
              <p className="small-muted">
                {new Date(order.createdAt).toLocaleDateString('en-IN')} · {order.fulfillment} · Demo
                payment
              </p>
              <div className="order-history-body">
                <div className="order-thumbnails">
                  {order.items.slice(0, 3).map((item, index) => (
                    <img
                      key={index}
                      src={item.dish?.image || menu.find((dish) => dish.id === item.dishId)?.image}
                      alt={item.name}
                    />
                  ))}
                </div>
                <div>
                  <p>{order.items.map((item) => `${item.quantity} × ${item.name}`).join(', ')}</p>
                  <strong>{money(order.totals.total)}</strong>
                </div>
              </div>
              <div className="order-history-actions">
                <button
                  className="text-link"
                  onClick={() =>
                    addItems(order.items)
                  }
                >
                  Order again
                </button>
                <Link className="text-link" to={`/orders/${order.id}/tracking`}>
                  View details <ArrowRight size={15} />
                </Link>
              </div>
              {order.status === 'Placed' && (
                <CancelAction
                  path={`/orders/${order.id}/cancel`}
                  label="Cancel order"
                  onSuccess={reload}
                />
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No orders here yet"
          text="Your orders will appear here after checkout."
        />
      )}
    </>
  );
}
function ReservationsList() {
  const { data, loading, error, reload } = useResource('/reservations');
  if (loading) return <Loading />;
  if (error)
    return (
      <>
        <ErrorMessage>{error}</ErrorMessage>
        <button className="button" onClick={reload}>
          Try again
        </button>
      </>
    );
  return (
    <>
      <span className="eyebrow">A SEAT AT OUR TABLE</span>
      <h1>My reservations</h1>
      {data.length ? (
        <div className="reservation-list">
          {data.map((booking) => (
            <article className="panel" key={booking.id}>
              <div className="panel-heading">
                <h3>
                  {new Date(`${booking.date}T12:00:00`).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </h3>
                <span
                  className={`status-badge ${booking.status === 'Cancelled' ? 'cancelled' : 'green'}`}
                >
                  {booking.status}
                </span>
              </div>
              <p>
                {Number(booking.time.slice(0, 2)) % 12 || 12}:00 PM · {booking.guests} guests ·{' '}
                {booking.occasion || 'A lovely meal'}
              </p>
              <Link className="text-link" to={`/reservations/${booking.id}`}>
                View confirmation <ArrowRight size={15} />
              </Link>
              {booking.status === 'Confirmed' &&
                new Date(`${booking.date}T${booking.time}:00+05:30`) > new Date() && (
                  <CancelAction
                    path={`/reservations/${booking.id}/cancel`}
                    label="Cancel reservation"
                    onSuccess={reload}
                  />
                )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Your table is waiting"
          text="Plan a little time with your favourite people."
          to="/booking"
          action="Reserve a table"
        />
      )}
    </>
  );
}
