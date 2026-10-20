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
        title="Platform admin access required"
        text="This page is for platform administrators. Restaurant owners can manage their own restaurant in the partner workspace."
        to="/partner"
        action="Open restaurant workspace"
      />
    );
  return children;
}
