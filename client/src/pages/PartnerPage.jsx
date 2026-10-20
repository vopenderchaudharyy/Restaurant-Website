import { PaymentStatus } from '../components/PaymentStatus.jsx';
import { ReviewCard, Stars } from '../components/OrderReview.jsx';
import { photoUrl } from '../services/photos.js';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Store,
  Utensils,
  ShoppingBag,
  ArrowUpRight,
  Clock,
  MapPin,
  CircleCheck,
  CirclePause,
  ArrowRight,
  RefreshCw,
  Settings2,
  MessageSquareText,
} from 'lucide-react';
import { useResource } from '../hooks/useResource.js';
import { apiRequest } from '../services/api.js';
import { money } from '../../../shared/menu.js';
import { nextOrderStatuses } from '../../../shared/orderStatus.js';
import { Loading, ErrorMessage } from '../components/ui.jsx';
import RestaurantForm from '../components/RestaurantSetup.jsx';
import MenuManagement from '../components/MenuManagement.jsx';
function OwnerOrder({ order, onSaved }) {
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function update() {
    setBusy(true);
    setError('');
    try {
      await apiRequest(`/partner/orders/${order.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, expectedStatus: order.status }),
      });
      setStatus('');
      onSaved();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  const options = nextOrderStatuses(order);
  return (
    <article className="panel partner-order">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">#{order.id.slice(0, 11).toUpperCase()}</span>
          <h3>{order.customer.name}</h3>
        </div>
        <span className="status-badge">{order.status}</span>
      </div>
      <p>
        {order.items.map((item) => `${item.quantity} × ${item.name} (${item.size})`).join(', ')}
      </p>
      <div className="partner-order-meta">
        <span>
          {order.fulfillment} · {new Date(order.createdAt).toLocaleString('en-IN')}
        </span>
        <strong>{money(order.totals.total)}</strong>
      </div>
      <p className="small-muted">
        {order.customer.phone}
        {order.customer.address ? ` · ${order.customer.address}, ${order.customer.city || ''}` : ''}
      </p>
      {order.notes && <p className="order-notes">Notes: {order.notes}</p>}
      <p className="small-muted">
        {order.items
          .filter((item) => item.extras.length)
          .map((item) => `${item.name}: ${item.extras.join(', ')}`)
          .join(' · ')}
      </p>
      <PaymentStatus order={order} />
      {options.length > 0 && (
        <div className="partner-order-action">
          <select
            aria-label={`Next status for ${order.id}`}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Update status…</option>
            {options.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <button className="button" disabled={!status || busy} onClick={update}>
            {busy ? 'Updating…' : 'Apply'}
          </button>
        </div>
      )}
      <ErrorMessage>{error}</ErrorMessage>
    </article>
  );
}
function PartnerOrders() {
  const { data, loading, error, reload } = useResource('/partner/orders', { pollMs: 15000 });
  const [filter, setFilter] = useState('Active');
  if (loading) return <Loading />;
  if (error)
    return (
      <>
        <ErrorMessage>{error}</ErrorMessage>
        <button className="button" onClick={reload}>
          Retry
        </button>
      </>
    );
  const orders = (data || []).filter(
    (order) => filter === 'All' || !['Delivered', 'Collected', 'Cancelled'].includes(order.status),
  );
  return (
    <>
      <div className="partner-orders-heading">
        <div>
          <h2>Orders from your restaurant</h2>
          <p>Status updates are visible to your customers.</p>
        </div>
        <div className="cuisine-chips">
          {['Active', 'All'].map((value) => (
            <button
              key={value}
              aria-pressed={filter === value}
              className={filter === value ? 'selected' : ''}
              onClick={() => setFilter(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
      <div className="partner-orders-grid">
        {orders.map((order) => (
          <OwnerOrder key={`${order.id}-${order.status}`} order={order} onSaved={reload} />
        ))}
      </div>
      {!orders.length && (
        <div className="panel partner-empty">
          <ShoppingBag size={35} />
          <h3>No {filter === 'Active' ? 'active ' : ''}orders yet.</h3>
          <p>New orders will appear here automatically.</p>
        </div>
      )}
    </>
  );
}
function PartnerReviews() {
  const { data, loading, error, reload } = useResource('/partner/reviews', { pollMs: 30000 });
  if (loading) return <Loading />;
  if (error)
    return (
      <>
        <ErrorMessage>{error}</ErrorMessage>
        <button className="button" onClick={reload}>
          Retry
        </button>
      </>
    );
  return (
    <section className="merchant-reviews">
      <div className="management-title">
        <div>
          <span className="console-eyebrow">CUSTOMER FEEDBACK</span>
          <h2>Verified order reviews</h2>
          <p>Reviews appear only after an order is delivered or collected.</p>
        </div>
        <Stars rating={data.summary.rating} count={data.summary.count} label="Restaurant rating" />
      </div>
      {data.reviews.length ? (
        <div className="review-grid">
          {data.reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      ) : (
        <div className="panel partner-empty">
          <MessageSquareText size={35} />
          <h3>No reviews yet.</h3>
          <p>Feedback from completed orders will appear here.</p>
        </div>
      )}
    </section>
  );
}
export default function PartnerPage() {
  const { data, loading, error, reload, updateData } = useResource('/partner');
  const [tab, setTab] = useState('Menu');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
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
  const restaurant = data.restaurant;
  async function publish() {
    setBusy(true);
    setActionError('');
    try {
      await apiRequest('/partner/publish', { method: 'POST' });
      window.dispatchEvent(new Event('menumate:menu-updated'));
      reload();
    } catch (failure) {
      setActionError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  function saveDish(dish) {
    updateData((previous) => ({
      ...previous,
      menu: previous.menu.some((item) => item.id === dish.id)
        ? previous.menu.map((item) => (item.id === dish.id ? dish : item))
        : [...previous.menu, dish],
    }));
    window.dispatchEvent(new Event('menumate:menu-updated'));
  }
  return (
    <div className={`container page-space partner-workspace ${restaurant ? 'has-restaurant' : ''}`}>
      {!restaurant ? (
        <>
          <header className="partner-page-heading">
            <div>
              <div className="partner-breadcrumb">
                Partner workspace <span>/</span> Getting started
              </div>
              <h1>Let's set up your restaurant.</h1>
              <p>A few details now. Your own storefront next.</p>
            </div>
            <span className="setup-draft-badge">
              <span /> Not published
            </span>
          </header>
          <RestaurantForm onSaved={reload} />
        </>
      ) : (
        <div className="merchant-workspace">
          <aside className="merchant-sidebar">
            <div className="merchant-identity">
              <img src={photoUrl(restaurant.image)} alt="" />
              <div>
                <strong>{restaurant.name}</strong>
                <span>{restaurant.cuisine} restaurant</span>
              </div>
            </div>
            <span className="merchant-nav-label">WORKSPACE</span>
            <nav aria-label="Restaurant workspace">
              {[
                ['Menu', Utensils, 'Menu'],
                ['Orders', ShoppingBag, 'Orders'],
                ['Reviews', MessageSquareText, 'Reviews'],
                ['Restaurant', Settings2, 'Settings'],
              ].map(([name, Icon, label]) => (
                <button
                  key={name}
                  aria-label={name === 'Restaurant' ? 'Restaurant settings' : name}
                  aria-pressed={tab === name}
                  className={tab === name ? 'selected' : ''}
                  onClick={() => setTab(name)}
                >
                  <Icon size={19} />
                  <span>{label}</span>
                  {name === 'Menu' && <b>{data.menu.length}</b>}
                </button>
              ))}
            </nav>
            <div className="merchant-sidebar-bottom">
              <span className="merchant-nav-label">STOREFRONT</span>
              <strong>
                <span
                  className={`merchant-status-dot ${restaurant.status === 'published' ? 'live' : ''}`}
                />
                {restaurant.status === 'published'
                  ? 'Published'
                  : restaurant.status === 'suspended'
                    ? 'Suspended'
                    : 'Draft'}
              </strong>
              <p>
                {restaurant.status === 'published'
                  ? 'Visible to customers'
                  : 'Hidden from customers'}
              </p>
            </div>
          </aside>
          <div className="merchant-main">
            <header className="merchant-page-header">
              <div>
                <span className="merchant-breadcrumb">
                  Workspace <span>/</span>{' '}
                  {tab === 'Menu'
                    ? 'Menu management'
                    : tab === 'Orders'
                      ? 'Orders'
                      : tab === 'Reviews'
                        ? 'Reviews'
                        : 'Settings'}
                </span>
                <h1>{restaurant.name}</h1>
                <p>
                  <MapPin size={14} />
                  {restaurant.area}, {restaurant.city}
                  <span className="merchant-header-divider" />
                  {restaurant.cuisine}
                </p>
              </div>
              <div className="merchant-header-actions">
                <span
                  className={`merchant-operating-state ${restaurant.acceptingOrders && restaurant.status === 'published' ? 'open' : ''}`}
                >
                  {restaurant.acceptingOrders && restaurant.status === 'published' ? (
                    <CircleCheck size={16} />
                  ) : (
                    <CirclePause size={16} />
                  )}{' '}
                  {restaurant.acceptingOrders && restaurant.status === 'published'
                    ? 'Taking orders'
                    : 'Orders paused'}
                </span>
                <button
                  className="icon-button merchant-refresh"
                  onClick={reload}
                  aria-label="Refresh workspace"
                >
                  <RefreshCw size={18} />
                </button>
                {restaurant.status === 'published' && (
                  <Link
                    className="button secondary merchant-storefront-link"
                    to={`/restaurants/${restaurant.id}`}
                  >
                    View storefront <ArrowUpRight size={16} />
                  </Link>
                )}
                {restaurant.status === 'draft' && (
                  <button className="button console-primary" disabled={busy} onClick={publish}>
                    {busy ? 'Publishing...' : 'Publish restaurant'}
                    <ArrowUpRight size={16} />
                  </button>
                )}
              </div>
            </header>
            {restaurant.status === 'suspended' ? (
              <ErrorMessage>
                Your restaurant is suspended and hidden from customers. Contact platform support.
              </ErrorMessage>
            ) : (
              (!restaurant.acceptingOrders || restaurant.status === 'draft') && (
                <div className="merchant-operation-notice">
                  <span className="notice-icon">
                    <Store size={21} />
                  </span>
                  <div>
                    <strong>
                      {restaurant.status === 'draft'
                        ? 'Finish setting up your storefront'
                        : 'Your kitchen is currently paused'}
                    </strong>
                    <p>
                      {restaurant.status === 'draft'
                        ? 'Add an available dish, publish your menu, then enable incoming orders.'
                        : 'Your restaurant is not taking new orders. Enable "Accept new orders" in Restaurant settings when your kitchen is ready.'}
                    </p>
                  </div>
                  <button onClick={() => setTab('Restaurant')}>
                    Review settings <ArrowRight size={15} />
                  </button>
                </div>
              )
            )}
            <ErrorMessage>{actionError}</ErrorMessage>
            {tab === 'Menu' && (
              <div className="merchant-metrics">
                <article>
                  <span className="metric-icon">
                    <Utensils size={21} />
                  </span>
                  <div>
                    <span>Total dishes</span>
                    <strong>{data.menu.length}</strong>
                    <small>
                      Across {new Set(data.menu.map((dish) => dish.category)).size} categories
                    </small>
                  </div>
                </article>
                <article>
                  <span className="metric-icon">
                    <CircleCheck size={21} />
                  </span>
                  <div>
                    <span>Available dishes</span>
                    <strong>{data.menu.filter((dish) => dish.available).length}</strong>
                    <small>
                      {data.menu.filter((dish) => !dish.available).length} currently sold out
                    </small>
                  </div>
                </article>
                <article>
                  <span className="metric-icon">
                    <Clock size={21} />
                  </span>
                  <div>
                    <span>Delivery estimate</span>
                    <strong>
                      {restaurant.etaMin}
                      <span className="estimate-separator">{'\u2013'}</span>
                      {restaurant.etaMax}
                      <em> min</em>
                    </strong>
                    <small>Your restaurant's estimate</small>
                  </div>
                </article>
              </div>
            )}
            <div className="merchant-section">
              {tab === 'Menu' ? (
                <MenuManagement
                  menu={data.menu}
                  disabled={restaurant.status === 'suspended'}
                  onSaved={saveDish}
                />
              ) : tab === 'Orders' ? (
                <PartnerOrders />
              ) : tab === 'Reviews' ? (
                <PartnerReviews />
              ) : (
                <>
                  <div className="management-title">
                    <div>
                      <span className="console-eyebrow">YOUR STOREFRONT</span>
                      <h2>Restaurant settings</h2>
                      <p>Manage your public details and how customers order.</p>
                    </div>
                  </div>
                  <RestaurantForm
                    key={restaurant.id}
                    restaurant={restaurant}
                    onSaved={() => {
                      window.dispatchEvent(new Event('menumate:menu-updated'));
                      reload();
                    }}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function ModerateRestaurant({ restaurant, onSaved }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function update() {
    setBusy(true);
    try {
      await apiRequest(`/admin/restaurants/${restaurant.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: restaurant.status === 'suspended' ? 'published' : 'suspended',
          expectedStatus: restaurant.status,
        }),
      });
      onSaved();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="panel moderation-row">
      <div>
        <h3>{restaurant.name}</h3>
        <p>
          {restaurant.city} · {restaurant.cuisine} · {restaurant.status}
        </p>
      </div>
      {!restaurant.demo && (
        <button className="button secondary" disabled={busy} onClick={update}>
          {busy
            ? 'Updating…'
            : restaurant.status === 'suspended'
              ? 'Restore listing'
              : 'Suspend listing'}
        </button>
      )}
      <ErrorMessage>{error}</ErrorMessage>
    </article>
  );
}
export function PlatformRestaurantsPage() {
  const { data, loading, error, reload } = useResource('/admin/restaurants');
  if (loading) return <Loading />;
  return (
    <div className="container page-space">
      <Link className="back-link" to="/admin">
        ← Platform dashboard
      </Link>
      <span className="eyebrow">PLATFORM CONTROLS</span>
      <h1>Restaurant listings</h1>
      <p>
        Suspending a listing hides its menu and blocks new orders. Existing orders remain
        manageable.
      </p>
      <ErrorMessage>{error}</ErrorMessage>
      {(data || []).map((restaurant) => (
        <ModerateRestaurant key={restaurant.id} restaurant={restaurant} onSaved={reload} />
      ))}
    </div>
  );
}
