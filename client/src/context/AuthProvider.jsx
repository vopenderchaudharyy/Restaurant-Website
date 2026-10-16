import { useCallback, useEffect, useRef, useState } from 'react';
import { AuthContext } from './auth.js';
import { apiRequest } from '../services/api.js';

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const mutating = useRef(false);
  const refresh = useCallback(async () => {
    if (mutating.current) return;
    const version = ++generation.current;
    try {
      const result = await apiRequest('/auth/me');
      if (version === generation.current) {
        setUser(result.user);
        setError('');
      }
    } catch (failure) {
      if (version === generation.current) setError(failure.message);
    } finally {
      if (version === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    // State updates in refresh occur only after the session request completes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    window.addEventListener('focus', refresh);
    const expired = () => {
      generation.current++;
      setUser(null);
      setLoading(false);
    };
    window.addEventListener('menumate:unauthorized', expired);
    return () => {
      // This ref is a request counter, not a DOM node; invalidate outstanding requests.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
      window.removeEventListener('focus', refresh);
      window.removeEventListener('menumate:unauthorized', expired);
    };
  }, [refresh]);
  async function mutate(path, options) {
    const version = ++generation.current;
    mutating.current = true;
    try {
      const result = await apiRequest(path, options);
      if (version === generation.current) {
        setUser(result.user ?? null);
        setError('');
      }
      return result;
    } finally {
      mutating.current = false;
      setLoading(false);
    }
  }
  async function authenticate(mode, details) {
    const result = await mutate(`/auth/${mode}`, { method: 'POST', body: JSON.stringify(details) });
    localStorage.removeItem('menumate-profile');
    return result.user;
  }
  async function logout() {
    await mutate('/auth/logout', { method: 'POST' });
  }
  async function updateProfile(details) {
    await mutate('/auth/profile', { method: 'PATCH', body: JSON.stringify(details) });
  }
  return (
    <AuthContext.Provider
      value={{ user, loading, error, refresh, authenticate, logout, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}
