import AuthProvider from './AuthProvider.jsx';
import StoreProvider from './StoreProvider.jsx';
import { useAuth } from './auth.js';

function SessionState({ children }) {
  const { user } = useAuth();
  return <StoreProvider key={user?.id || 'guest'}>{children}</StoreProvider>;
}
export default function AppProviders({ children }) {
  return (
    <AuthProvider>
      <SessionState>{children}</SessionState>
    </AuthProvider>
  );
}
