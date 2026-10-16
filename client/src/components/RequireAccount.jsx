import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/auth.js';
import { Loading, ErrorMessage, EmptyState } from './ui.jsx';

export default function RequireAccount({ children, admin = false }) {
  const { user, loading, error, refresh } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (error)
    return (
      <div className="container page-space">
        <ErrorMessage>{error}</ErrorMessage>
        <button className="button" onClick={refresh}>
          Reconnect
        </button>
      </div>
    );
  if (!user)
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  if (admin && user.role !== 'admin')
    return (
      <EmptyState
        title="Owner access required"
        text="Your account is a customer account. Only an owner can manage the restaurant."
        to="/account"
        action="Back to my account"
      />
    );
  return children;
}
