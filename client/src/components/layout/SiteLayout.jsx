import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigationType } from 'react-router-dom';
import {
  ChefHat,
  Search,
  ShoppingBag,
  UserRound,
  Menu,
  X,
  ArrowUpRight,
  Camera,
  Heart,
  Clock,
} from 'lucide-react';
import { useStore } from '../../context/store.js';
import ExperienceOverlays from '../ExperienceOverlays.jsx';
import { useAuth } from '../../context/auth.js';
import { staticDemoMode } from '../../services/api.js';

const navigation = [
  ['/', 'Home'],
  ['/restaurants', 'Restaurants'],
  ['/menu', 'Dishes'],
  ['/about', 'About'],
  ['/contact', 'Contact'],
];
export default function SiteLayout() {
  const { cart, setOverlay } = useStore();
  const { user } = useAuth();
  const location = useLocation();
  const navigationType = useNavigationType();
  const mainRef = useRef(null);
  const headerRef = useRef(null);
  const menuToggleRef = useRef(null);
  const [open, setOpen] = useState(false);
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  useLayoutEffect(() => {
    // Preserve native Back/Forward restoration; only new navigation starts at the top.
    if (location.hash || navigationType === 'POP') return;
    window.scrollTo({ top: 0, behavior: 'instant' });
    mainRef.current?.focus({ preventScroll: true });
  }, [location.key, location.hash, navigationType]);
  useEffect(() => {
    if (!open) return;
    const escape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        menuToggleRef.current?.focus({ preventScroll: true });
      }
    };
    const outside = (event) => {
      if (!headerRef.current?.contains(event.target)) setOpen(false);
    };
    const back = () => setOpen(false);
    document.addEventListener('keydown', escape);
    document.addEventListener('pointerdown', outside);
    window.addEventListener('popstate', back);
    return () => {
      document.removeEventListener('keydown', escape);
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('popstate', back);
    };
  }, [open]);
  useEffect(() => {
    const search = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOverlay((current) => (current?.type === 'search' ? null : { type: 'search' }));
      }
    };
    window.addEventListener('keydown', search);
    return () => window.removeEventListener('keydown', search);
  }, [setOverlay]);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header
        ref={headerRef}
        className="site-header"
        onClick={(event) => {
          if (event.target.closest('a')) setOpen(false);
        }}
      >
        <div className="header-inner">
          <Link className="brand" to="/" onClick={() => setOpen(false)}>
            <span className="brand-mark">
              <ChefHat size={24} />
            </span>
            MenuMate<span className="brand-dot">.</span>
          </Link>
          <nav
            id="main-navigation"
            className={`main-nav ${open ? 'is-open' : ''}`}
            aria-label="Main navigation"
          >
            {navigation.map(([path, label]) => (
              <NavLink key={path} to={path} end={path === '/'} onClick={() => setOpen(false)}>
                {label}
              </NavLink>
            ))}
            <NavLink className="mobile-account-nav" to="/account" onClick={() => setOpen(false)}>
              {user ? 'My account' : 'Sign in'}
            </NavLink>
            <NavLink className="mobile-account-nav" to="/partner" onClick={() => setOpen(false)}>
              Restaurant workspace
            </NavLink>
          </nav>
          <div className="header-actions">
            <button
              className="icon-button search-link"
              onClick={() => setOverlay({ type: 'search' })}
              aria-label="Search menu"
              title="Search (Ctrl / Command + K)"
            >
              <Search size={20} />
            </button>
            <Link
              className="icon-button favorites-link"
              to="/account/favorites"
              aria-label="Favorites"
            >
              <Heart size={20} />
            </Link>
            <button
              className="icon-button cart-link"
              onClick={() => setOverlay({ type: 'bag' })}
              aria-label={`Shopping bag, ${count} items`}
            >
              <ShoppingBag size={21} />
              {count > 0 && (
                <span className="cart-count" key={count}>
                  {count}
                </span>
              )}
            </button>
            <Link className="icon-button account-link" to="/account" aria-label="My account">
              {user ? <span className="nav-avatar">{user.name[0]}</span> : <UserRound size={20} />}
            </Link>
            <Link className="button header-order" to="/partner">
              Partner with us <ArrowUpRight size={16} />
            </Link>
            <button
              ref={menuToggleRef}
              aria-controls="main-navigation"
              className="icon-button mobile-toggle"
              onClick={() => setOpen(!open)}
              aria-label={open ? 'Close navigation' : 'Open navigation'}
              aria-expanded={open}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      {staticDemoMode && (
        <div className="deployment-notice" role="status">
          <strong>Marketplace preview</strong>
          <span>
            Browsing is available. Accounts and live ordering need the connected MenuMate API.
          </span>
        </div>
      )}
      <main id="main" tabIndex={-1} ref={mainRef}>
        <div className="page-enter" key={location.pathname + location.search}>
          <Outlet />
        </div>
      </main>
      <ExperienceOverlays />
      {count > 0 && !['/cart', '/checkout', '/payment'].includes(location.pathname) && (
        <button className="floating-bag" onClick={() => setOverlay({ type: 'bag' })}>
          <span>
            <ShoppingBag size={18} />
            <b>{count}</b>
          </span>{' '}
          View your bag <ArrowUpRight size={18} />
        </button>
      )}
      <footer className="site-footer">
        <div className="footer-top container">
          <div>
            <Link className="brand" to="/">
              <span className="brand-mark">
                <ChefHat size={24} />
              </span>
              MenuMate<span className="brand-dot">.</span>
            </Link>
            <p>
              Your city. Served fresh.
              <br />
              Local kitchens. A world of flavour.
            </p>
          </div>
          <div>
            <h4>Made for your city</h4>
            <p>
              Discover restaurants near you
              <br />
              Filter by city and cuisine
            </p>
            <span className="footer-hours">
              <Clock size={14} /> Availability is set by each restaurant
            </span>
          </div>
          <div>
            <h4>Find your next favourite</h4>
            <Link to="/restaurants">Explore restaurants</Link>
            <Link to="/menu">Browse all dishes</Link>
            <Link to="/contact">Get in touch</Link>
          </div>
          <div>
            <h4>Make yourself at home</h4>
            <Link to="/partner">Restaurant workspace</Link>
            <Link to="/account/orders">Your orders</Link>
            <Link to="/account">Your account</Link>
            <Link to="/admin">
              Platform dashboard <ArrowUpRight size={12} />
            </Link>
          </div>
        </div>
        <div className="footer-bottom container">
          <span>© {new Date().getFullYear()} MenuMate. Made with a little extra love.</span>
          <span>
            <Camera size={15} />
            <Heart size={15} /> Stay hungry. Stay curious.
          </span>
        </div>
      </footer>
    </>
  );
}
