import { PaymentStatus, RefundControl } from '../components/PaymentStatus.jsx';
import { ReviewCard, Stars } from '../components/OrderReview.jsx';
import { photoUrl } from '../services/photos.js';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChefHat,
  LayoutDashboard,
  ShoppingBag,
  Utensils,
  CalendarDays,
  IndianRupee,
  Users,
  Search,
  ArrowLeft,
  ArrowRight,
  Eye,
  RefreshCw,
  LogOut,
  MessageSquareText,
} from 'lucide-react';
import { useResource } from '../hooks/useResource.js';
import { useAuth } from '../context/auth.js';
import { apiRequest } from '../services/api.js';
import { money } from '../../../shared/menu.js';
import { nextOrderStatuses, reservationTransitions } from '../../../shared/orderStatus.js';
import { DemoNote, Loading, ErrorMessage } from '../components/ui.jsx';

function StatusControl({ record, kind, options, onSaved }) {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save() {
    setBusy(true);
    setError('');
    try {
      await apiRequest(`/admin/${kind}/${record.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, expectedStatus: record.status }),
      });
      setStatus('');
      onSaved();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  if (!options.length) return <small className="small-muted">Final status</small>;
  return (
    <div className="status-control">
      <select
        aria-label={`Next status for ${record.id}`}
        value={status}
        onChange={(event) => setStatus(event.target.value)}
        disabled={busy}
      >
        <option value="">Change status…</option>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
      <button className="button" disabled={!status || busy} onClick={save}>
        {busy ? 'Saving…' : 'Apply'}
      </button>
      <ErrorMessage>{error}</ErrorMessage>
    </div>
  );
}
function AvailabilityControl({ dish, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function toggle() {
    setBusy(true);
    setError('');
    try {
      await apiRequest(`/admin/menu/${dish.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ available: !dish.available }),
      });
      window.dispatchEvent(new Event('menumate:menu-updated'));
      onSaved();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <button
        className={`availability-button ${dish.available ? 'available' : ''}`}
        disabled={busy}
        onClick={toggle}
        aria-label={`${dish.available ? 'Mark' : 'Make'} ${dish.name} ${dish.available ? 'sold out' : 'available'}`}
      >
        {busy
          ? 'Saving…'
          : dish.available
            ? 'Available · Mark sold out'
            : 'Sold out · Make available'}
      </button>
      <ErrorMessage>{error}</ErrorMessage>
    </div>
  );
}
export default function AdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('Overview');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const orders = useResource('/admin/orders', { pollMs: 30000 });
  const reservations = useResource('/admin/reservations', { pollMs: 30000 });
  const catalog = useResource('/menu');
  const reviews = useResource('/admin/reviews', { pollMs: 30000 });
  const allOrders = orders.data || [];
  const allReservations = reservations.data || [];
  const dishes = catalog.data || [];
  const allReviews = reviews.data?.reviews || [];
  const orderValue = allOrders
    .filter((order) => order.status !== 'Cancelled')
    .reduce((sum, order) => sum + order.totals.total, 0);
  const filtered = allOrders.filter(
    (order) =>
      (filter === 'All' || order.status === filter) &&
      `${order.id} ${order.customer.name} ${order.restaurantName || 'MenuMate Kitchen'}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, totalPages);
  const displayed = filtered.slice((currentPage - 1) * 10, currentPage * 10);
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const key = date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    return {
      label: date.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'Asia/Kolkata' }),
      count: allOrders.filter(
        (order) =>
          new Date(order.createdAt).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) ===
          key,
      ).length,
    };
  });
  const peak = Math.max(1, ...days.map((day) => day.count));
  async function signOut() {
    try {
      await logout();
      navigate('/login');
    } catch (failure) {
      setError(failure.message);
    }
  }
  function refresh() {
    orders.reload();
    reservations.reload();
    catalog.reload();
    reviews.reload();
  }
  async function moderate(review) {
    setError('');
    try {
      await apiRequest(`/admin/reviews/${review.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: review.status === 'hidden' ? 'published' : 'hidden',
          expectedStatus: review.status,
        }),
      });
      reviews.reload();
    } catch (failure) {
      setError(failure.message);
    }
  }
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="brand" to="/">
          <span className="brand-mark">
            <ChefHat size={23} />
          </span>
          MenuMate<span className="brand-dot">.</span>
        </Link>
        <span className="admin-label">PLATFORM WORKSPACE</span>
        <nav aria-label="Dashboard navigation">
          {[
            ['Overview', LayoutDashboard],
            ['Orders', ShoppingBag],
            ['Menu', Utensils],
            ['Reservations', CalendarDays],
            ['Reviews', MessageSquareText],
          ].map(([name, Icon]) => (
            <button
              className={tab === name ? 'active' : ''}
              key={name}
              onClick={() => {
                setTab(name);
                setPage(1);
              }}
            >
              <Icon size={18} />
              {name}
              {name === 'Orders' && <span>{allOrders.length}</span>}
              {name === 'Reviews' && <span>{allReviews.length}</span>}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <div className="admin-avatar">MM</div>
          <strong>{user.name}</strong>
          <small>Platform administrator</small>
          <Link to="/">
            <ArrowLeft size={15} /> Back to marketplace
          </Link>
          <button className="account-logout" onClick={signOut}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>
      <main className="admin-main">
        <Link className="platform-manage-link" to="/platform/restaurants">
          Manage restaurant listings <ArrowRight size={17} />
        </Link>
        <header className="admin-header">
          <div>
            <span className="eyebrow">YOUR MARKETPLACE, AT A GLANCE</span>
            <h1>{tab === 'Overview' ? 'Dashboard' : tab}</h1>
          </div>
          <div className="admin-toolbar">
            <button className="icon-button" aria-label="Refresh dashboard" onClick={refresh}>
              <RefreshCw size={18} />
            </button>
            <Link className="text-link" to="/account">
              My account
            </Link>
          </div>
        </header>
        <DemoNote>
          Platform workspace · Accounts, moderation and order controls are live. Razorpay runs in
          Test Mode; rider delivery remains simulated.
        </DemoNote>
        <ErrorMessage>
          {error || orders.error || reservations.error || catalog.error || reviews.error}
        </ErrorMessage>
        {orders.loading || reservations.loading || catalog.loading || reviews.loading ? (
          <Loading />
        ) : (
          <>
            {tab === 'Overview' && (
              <>
                <div className="admin-stats">
                  {[
                    [ShoppingBag, 'Total orders', allOrders.length, 'Across all customer accounts'],
                    [
                      IndianRupee,
                      'Order value',
                      money(orderValue),
                      'Excludes cancelled orders · simulated payments',
                    ],
                    [
                      CalendarDays,
                      'Reservations',
                      allReservations.filter((item) => item.status === 'Confirmed').length,
                      'Confirmed reservations',
                    ],
                    [
                      Users,
                      'Guests booked',
                      allReservations
                        .filter((item) => item.status === 'Confirmed')
                        .reduce((sum, item) => sum + item.guests, 0),
                      'Guests on confirmed reservations',
                    ],
                  ].map(([Icon, title, value, caption]) => (
                    <article key={title}>
                      <div>
                        <span>{title}</span>
                        <Icon size={20} />
                      </div>
                      <strong>{value}</strong>
                      <small>{caption}</small>
                    </article>
                  ))}
                </div>
                <section className="panel weekly-orders">
                  <div className="panel-heading">
                    <div>
                      <h3>Your week in orders</h3>
                      <p className="small-muted">Actual stored orders · Last 7 days · India time</p>
                    </div>
                  </div>
                  <div
                    className="bar-chart"
                    aria-label={days.map((day) => `${day.label}: ${day.count} orders`).join(', ')}
                  >
                    {days.map((day, index) => (
                      <div className="bar-column" key={index}>
                        <div style={{ height: `${(day.count / peak) * 90}%` }}>
                          <span>{day.count}</span>
                        </div>
                        <small>{day.label}</small>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
            {(tab === 'Overview' || tab === 'Orders') && (
              <section className="panel admin-table-panel">
                <div className="panel-heading">
                  <h3>Restaurant orders</h3>
                  <div className="admin-order-filters">
                    <div className="search-field compact">
                      <Search size={16} />
                      <input
                        aria-label="Search orders"
                        value={query}
                        onChange={(event) => {
                          setQuery(event.target.value);
                          setPage(1);
                        }}
                        placeholder="Name or order number…"
                      />
                    </div>
                    <select
                      aria-label="Filter orders by status"
                      value={filter}
                      onChange={(event) => {
                        setFilter(event.target.value);
                        setPage(1);
                      }}
                    >
                      {[
                        'All',
                        'Placed',
                        'Preparing',
                        'Out for delivery',
                        'Ready',
                        'Delivered',
                        'Collected',
                        'Cancelled',
                      ].map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Order / customer</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Manage</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayed.map((order) => (
                        <tr key={order.id}>
                          <td>
                            <strong>#{order.id.slice(0, 11).toUpperCase()}</strong>
                            <small>
                              {order.customer.name} · {order.fulfillment}
                            </small>
                          </td>
                          <td>{money(order.totals.total)}</td>
                          <td>
                            <span
                              className={`status-badge ${order.status === 'Cancelled' ? 'cancelled' : ''}`}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td>
                            <PaymentStatus order={order} />
                            <RefundControl order={order} onSaved={orders.reload} />
                            <StatusControl
                              key={`${order.id}-${order.status}`}
                              record={order}
                              kind="orders"
                              options={nextOrderStatuses(order)}
                              onSaved={orders.reload}
                            />
                          </td>
                          <td>
                            <Link
                              aria-label={`View order ${order.id}`}
                              to={`/orders/${order.id}/tracking`}
                            >
                              <Eye size={18} />
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!displayed.length && (
                    <div className="admin-empty">
                      <ShoppingBag size={30} />
                      <p>No matching orders yet.</p>
                      <Link to="/menu" className="text-link">
                        Explore the menu
                      </Link>
                    </div>
                  )}
                </div>
                <div className="pagination">
                  <span>
                    {filtered.length} orders · Page {currentPage} of {totalPages}
                  </span>
                  <button disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                    Previous
                  </button>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    Next
                  </button>
                </div>
              </section>
            )}
            {tab === 'Menu' && (
              <section className="panel">
                <div className="panel-heading">
                  <h3>The kitchen’s collection</h3>
                  <span className="pill">{dishes.length} dishes</span>
                </div>
                <p className="small-muted">
                  Sold-out dishes cannot be ordered. Customer menus refresh every 30 seconds and
                  when the window regains focus.
                </p>
                <div className="admin-catalog">
                  {dishes.map((dish) => (
                    <article key={dish.id}>
                      <img src={photoUrl(dish.image)} alt={dish.name} />
                      <div>
                        <Link to={`/menu/${dish.id}`}>
                          <strong>{dish.name}</strong>
                        </Link>
                        <small>
                          {dish.category} · {money(dish.price)}
                        </small>
                      </div>
                      <AvailabilityControl dish={dish} onSaved={catalog.reload} />
                    </article>
                  ))}
                </div>
              </section>
            )}
            {tab === 'Reservations' && (
              <section className="panel">
                <h3>Upcoming moments</h3>
                {allReservations.length ? (
                  allReservations.map((booking) => (
                    <div className="reservation-admin-row" key={booking.id}>
                      <CalendarDays />
                      <div>
                        <strong>{booking.name}</strong>
                        <p>
                          {booking.date} · {booking.time} · {booking.guests} guests
                        </p>
                      </div>
                      <span
                        className={`status-badge ${booking.status === 'Cancelled' ? 'cancelled' : 'green'}`}
                      >
                        {booking.status}
                      </span>
                      <StatusControl
                        key={`${booking.id}-${booking.status}`}
                        record={booking}
                        kind="reservations"
                        options={reservationTransitions[booking.status] || []}
                        onSaved={reservations.reload}
                      />
                      <Link to={`/reservations/${booking.id}`} aria-label="View reservation">
                        <Eye size={18} />
                      </Link>
                    </div>
                  ))
                ) : (
                  <div className="admin-empty">
                    <CalendarDays size={30} />
                    <p>No reservations yet.</p>
                  </div>
                )}
              </section>
            )}
            {tab === 'Reviews' && (
              <section className="admin-reviews">
                <div className="panel-heading">
                  <div>
                    <h3>Verified customer reviews</h3>
                    <p className="small-muted">
                      Hide content that violates marketplace standards. Hidden reviews do not affect
                      public ratings.
                    </p>
                  </div>
                  <Stars
                    rating={reviews.data.summary.rating}
                    count={reviews.data.summary.count}
                    label="Marketplace review rating"
                  />
                </div>
                {allReviews.length ? (
                  <div className="review-grid">
                    {allReviews.map((review) => (
                      <ReviewCard
                        key={review.id}
                        review={review}
                        management
                        onModerate={moderate}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="admin-empty">
                    <MessageSquareText size={30} />
                    <p>No verified reviews yet.</p>
                  </div>
                )}
              </section>
            )}
          </>
        )}
        <p className="admin-footer">MenuMate Workspace · Platform administrator access only.</p>
      </main>
    </div>
  );
}
