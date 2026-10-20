import { useLayoutEffect, useRef } from 'react';
import { Link, Outlet, useNavigationType } from 'react-router-dom';
import { ChefHat, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../../context/auth.js';

export default function PartnerLayout() {
  const { user } = useAuth();
  const navigationType = useNavigationType();
  const main = useRef(null);
  useLayoutEffect(() => {
    if (navigationType !== 'POP') {
      window.scrollTo({ top: 0, behavior: 'instant' });
      main.current?.focus({ preventScroll: true });
    }
  }, [navigationType]);
  return (
    <div className="partner-shell">
      <a className="skip-link" href="#partner-main">
        Skip to workspace
      </a>
      <header className="partner-topbar">
        <div className="partner-topbar-inner">
          <Link className="brand" to="/">
            <span className="brand-mark">
              <ChefHat size={22} />
            </span>
            MenuMate<span className="brand-dot">.</span>
          </Link>
          <span className="partner-product-label">FOR RESTAURANTS</span>
          <div className="partner-topbar-actions">
            <Link className="partner-market-link" to="/restaurants">
              Marketplace <ArrowUpRight size={15} />
            </Link>
            <Link className="partner-account" to="/account" aria-label="My account">
              <span>{user?.name?.[0] || 'M'}</span>
              <b>{user?.name || 'Account'}</b>
            </Link>
          </div>
        </div>
      </header>
      <main ref={main} id="partner-main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="partner-console-footer">
        <span>MenuMate for restaurants</span>
        <span>
          Development preview · Razorpay Test Mode is supported; rider dispatch is not connected.
        </span>
      </footer>
    </div>
  );
}
