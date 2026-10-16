import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Eye, EyeOff, ChefHat } from 'lucide-react';
import { useAuth } from '../context/auth.js';
import { ErrorMessage, Loading } from '../components/ui.jsx';

export default function AuthPage({ register = false }) {
  const { user, loading, authenticate } = useAuth();
  const [params] = useSearchParams();
  const requested = params.get('next') || '/account';
  const next =
    requested.startsWith('/') && !requested.startsWith('//') && !requested.includes('\\')
      ? requested
      : '/account';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();
  if (loading) return <Loading />;
  if (user) return <Navigate to={next} replace />;
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const details = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setError('');
    try {
      await authenticate(register ? 'register' : 'login', details);
      navigate(next, { replace: true });
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container auth-page">
      <div className="auth-image">
        <img src="/images/design/restaurant.jpg" alt="A warm welcome at MenuMate" />
        <div>
          <ChefHat size={35} />
          <h2>
            Your table.
            <br />
            Your favourites.
            <br />
            <em>Your MenuMate.</em>
          </h2>
          <p>A little more personal. Every time.</p>
        </div>
      </div>
      <section className="auth-form-panel">
        <span className="eyebrow">{register ? 'PULL UP A CHAIR' : 'GOOD TO SEE YOU AGAIN'}</span>
        <h1>{register ? 'Make yourself at home.' : 'Welcome back.'}</h1>
        <p>
          {register
            ? 'Create an account to keep your orders and reservations together.'
            : 'Sign in for your favourites, orders, and upcoming moments.'}
        </p>
        <form onSubmit={submit}>
          {register && (
            <label className="field-label">
              Full name
              <input
                name="name"
                autoComplete="name"
                required
                maxLength={80}
                placeholder="Your name"
              />
            </label>
          )}
          <label className="field-label">
            Email address
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={200}
              placeholder="you@example.com"
            />
          </label>
          <label className="field-label">
            Password
            <div className="password-field">
              <input
                name="password"
                type={visible ? 'text' : 'password'}
                autoComplete={register ? 'new-password' : 'current-password'}
                required
                minLength={register ? 12 : undefined}
                maxLength={128}
                placeholder={register ? 'At least 12 characters' : 'Your password'}
              />
              <button
                type="button"
                className="icon-button"
                aria-label={visible ? 'Hide password' : 'Show password'}
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          {register && <p className="small-muted">Use a unique passphrase of 12–128 characters.</p>}
          <ErrorMessage>{error}</ErrorMessage>
          <button className="button full-width" disabled={busy}>
            {busy ? 'One moment…' : register ? 'Create account' : 'Sign in'}
            <ArrowRight size={17} />
          </button>
        </form>
        <p className="auth-switch">
          {register ? 'Already have an account?' : 'New around here?'}{' '}
          <Link
            className="text-link"
            to={`${register ? '/login' : '/register'}?next=${encodeURIComponent(next)}`}
          >
            {register ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
        <div className="assurance">
          <ShieldCheck size={18} /> Your account, your orders, your table.
        </div>
      </section>
    </div>
  );
}
