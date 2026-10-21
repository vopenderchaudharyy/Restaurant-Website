import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, Mail } from 'lucide-react';
import { apiRequest } from '../services/api.js';
import { ErrorMessage } from '../components/ui.jsx';

function RecoveryShell({ children }) {
  return (
    <div className="container auth-page recovery-page">
      <div className="auth-image recovery-image">
        <img src="/images/design/restaurant.jpg" alt="A welcoming MenuMate restaurant" />
        <div>
          <KeyRound size={35} />
          <h2>
            Back to your
            <br />
            favourite meals.
          </h2>
          <p>Secure account recovery, without the guesswork.</p>
        </div>
      </div>
      <section className="auth-form-panel">{children}</section>
    </div>
  );
}

export function ForgotPasswordPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [address, setAddress] = useState('');

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const email = new FormData(event.currentTarget).get('email');
    setBusy(true);
    setError('');
    try {
      await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setAddress(email);
      setSent(true);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <RecoveryShell>
      {sent ? (
        <div className="recovery-result" aria-live="polite">
          <span className="recovery-icon">
            <Mail size={26} />
          </span>
          <span className="eyebrow">CHECK YOUR INBOX</span>
          <h1>Reset link requested.</h1>
          <p>
            If a MenuMate account exists for <strong>{address}</strong>, a secure link is on its
            way. It expires in 30 minutes.
          </p>
          <Link className="button full-width" to="/login">
            Return to sign in <ArrowRight size={17} />
          </Link>
          <button className="text-button" type="button" onClick={() => setSent(false)}>
            Try another email
          </button>
        </div>
      ) : (
        <>
          <span className="eyebrow">ACCOUNT RECOVERY</span>
          <h1>Forgot your password?</h1>
          <p>Enter your account email. We will send a one-time link to create a new password.</p>
          <form onSubmit={submit}>
            <label className="field-label">
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={200}
                placeholder="you@example.com"
                autoFocus
              />
            </label>
            <ErrorMessage>{error}</ErrorMessage>
            <button className="button full-width" disabled={busy}>
              {busy ? 'Sending secure link…' : 'Email me a reset link'}
              <ArrowRight size={17} />
            </button>
          </form>
          <Link className="recovery-back" to="/login">
            <ArrowLeft size={15} /> Back to sign in
          </Link>
        </>
      )}
    </RecoveryShell>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);
  const [visible, setVisible] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (data.newPassword !== data.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword: data.newPassword }),
      });
      setComplete(true);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  if (!token)
    return (
      <RecoveryShell>
        <div className="recovery-result">
          <span className="recovery-icon">
            <KeyRound size={26} />
          </span>
          <span className="eyebrow">LINK REQUIRED</span>
          <h1>This reset link is incomplete.</h1>
          <p>Request a fresh password reset email to continue securely.</p>
          <Link className="button full-width" to="/forgot-password">
            Request a new link
          </Link>
        </div>
      </RecoveryShell>
    );

  return (
    <RecoveryShell>
      {complete ? (
        <div className="recovery-result" aria-live="polite">
          <span className="recovery-icon success">
            <CheckCircle2 size={28} />
          </span>
          <span className="eyebrow">PASSWORD UPDATED</span>
          <h1>You are ready to sign in.</h1>
          <p>Your new password is active. For your security, previous sessions were signed out.</p>
          <Link className="button full-width" to="/login">
            Sign in now <ArrowRight size={17} />
          </Link>
        </div>
      ) : (
        <>
          <span className="eyebrow">SECURE YOUR ACCOUNT</span>
          <h1>Create a new password.</h1>
          <p>Use a unique passphrase with at least 12 characters.</p>
          <form onSubmit={submit}>
            <label className="field-label">
              New password
              <div className="password-field">
                <input
                  name="newPassword"
                  type={visible ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={128}
                  placeholder="At least 12 characters"
                  autoFocus
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={visible ? 'Hide passwords' : 'Show passwords'}
                  onClick={() => setVisible(!visible)}
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            <label className="field-label">
              Confirm new password
              <input
                name="confirmPassword"
                type={visible ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
                placeholder="Enter it once more"
              />
            </label>
            <ErrorMessage>{error}</ErrorMessage>
            <button className="button full-width" disabled={busy}>
              {busy ? 'Updating password…' : 'Save new password'}
              <ArrowRight size={17} />
            </button>
          </form>
        </>
      )}
    </RecoveryShell>
  );
}
