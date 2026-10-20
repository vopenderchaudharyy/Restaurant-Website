import { useState } from 'react';
import { MapPin, Clock, Phone, Mail, ArrowUpRight, Send } from 'lucide-react';
import { apiRequest } from '../services/api.js';
import { ErrorMessage, DemoNote } from '../components/ui.jsx';

export default function ContactPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const data = await apiRequest('/messages', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      setSuccess(data.message);
      form.reset();
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="container page-space">
      <div className="contact-grid">
        <div>
          <span className="eyebrow">LET’S TALK OVER GOOD FOOD</span>
          <h1>Get in touch.</h1>
          <p className="lead">
            A question, a celebration, or just a hello?
            <br />
            We’d love to hear from you.
          </p>
          <div className="contact-details">
            {[
              [Phone, 'Give us a ring', '+91 88946 16815', 'tel:+918894616815'],
              [
                Mail,
                'Drop us a note',
                'vopenderchaudhary@gmai.com',
                'mailto:vopenderchaudhary@gmai.com',
              ],
              [
                MapPin,
                'Come find us',
                'North Pateri, Satna, Madhya Pradesh',
                'https://www.google.com/maps/search/?api=1&query=North+Pateri+Satna+Madhya+Pradesh',
              ],
              [Clock, 'Our doors are open', 'Monday – Sunday · 11:00 AM – 11:00 PM'],
            ].map(([Icon, label, text, href]) => (
              <div key={label}>
                <span>
                  <Icon size={21} />
                </span>
                <div>
                  <small>{label}</small>
                  <p>
                    {href ? (
                      <a
                        href={href}
                        target={href.startsWith('http') ? '_blank' : undefined}
                        rel={href.startsWith('http') ? 'noreferrer' : undefined}
                      >
                        {text}
                      </a>
                    ) : (
                      text
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <DemoNote>Call or email us for customer and restaurant-partner support.</DemoNote>
        </div>
        <div className="contact-image">
          <img src="/images/design/restaurant.jpg" alt="A glimpse inside our warm restaurant" />
          <div>
            <MapPin size={24} />
            <span>
              <strong>Your next favourite place.</strong>
              <small>North Pateri, Satna, Madhya Pradesh</small>
            </span>
            <a
              className="icon-button"
              href="https://www.google.com/maps/search/?api=1&query=North+Pateri+Satna+Madhya+Pradesh"
              target="_blank"
              rel="noreferrer"
              aria-label="Explore North Pateri, Satna on Google Maps"
            >
              <ArrowUpRight />
            </a>
          </div>
        </div>
      </div>
      <div className="contact-form-section">
        <div>
          <span className="eyebrow">WE’RE ALL EARS</span>
          <h2>Leave us a little note.</h2>
          <p>Tell us what’s on your mind. Big plans, small questions — we’re happy to help.</p>
          <p className="small-muted">
            This preview saves your message to the demo API. It does not send an email.
          </p>
        </div>
        <form className="panel" onSubmit={submit}>
          <div className="form-grid">
            <label className="field-label">
              Your name
              <input
                name="name"
                required
                maxLength={80}
                autoComplete="name"
                placeholder="Full name"
              />
            </label>
            <label className="field-label">
              Email address
              <input
                name="email"
                type="email"
                required
                maxLength={200}
                autoComplete="email"
                placeholder="you@example.com"
              />
            </label>
          </div>
          <label className="field-label">
            Your message
            <textarea
              name="message"
              required
              maxLength={2000}
              rows={4}
              placeholder="How can we make your day?"
            />
          </label>
          <ErrorMessage>{error}</ErrorMessage>
          {success && (
            <p className="success-message" role="status">
              {success}
            </p>
          )}
          <button disabled={busy} className="button">
            {busy ? 'Saving your note…' : 'Send demo message'}
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
