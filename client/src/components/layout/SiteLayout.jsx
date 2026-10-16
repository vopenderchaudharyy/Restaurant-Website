import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
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

const navigation = [
  ['/', 'Home'],
  ['/menu', 'Menu'],
  ['/booking', 'Reservations'],
  ['/about', 'About'],
  ['/contact', 'Contact'],
];
export default function SiteLayout() {
  const { cart, setOverlay } = useStore();
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);
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
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/" onClick={() => setOpen(false)}>
            <span className="brand-mark">
              <ChefHat size={24} />
            </span>
            MenuMate<span className="brand-dot">.</span>
          </Link>
          <nav className={`main-nav ${open ? 'is-open' : ''}`} aria-label="Main navigation">
            {navigation.map(([path, label]) => (
              <NavLink key={path} to={path} end={path === '/'} onClick={() => setOpen(false)}>
                {label}
              </NavLink>
            ))}
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
            <Link className="button header-order" to="/menu">
              Order now <ArrowUpRight size={16} />
            </Link>
            <button
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
      <main id="main">
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
              Good food. Great company.
              <br />
              Memories made around the table.
            </p>
          </div>
          <div>
            <h4>Come on over</h4>
            <p>
              123, MG Road, Bangalore
              <br />
              Karnataka 560001
            </p>
            <span className="footer-hours">
              <Clock size={14} /> Daily · 11 AM – 11 PM
            </span>
          </div>
          <div>
            <h4>A seat for everyone</h4>
            <Link to="/menu">Explore our menu</Link>
            <Link to="/booking">Reserve a table</Link>
            <Link to="/contact">Get in touch</Link>
          </div>
          <div>
            <h4>Make yourself at home</h4>
            <Link to="/account/orders">Your orders</Link>
            <Link to="/account">Your account</Link>
            <Link to="/admin">
              Owner dashboard <ArrowUpRight size={12} />
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
