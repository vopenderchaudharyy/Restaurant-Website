import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Clock, Users, ArrowRight } from 'lucide-react';
import { apiRequest } from '../services/api.js';
import { FeatureStrip, DemoNote, ErrorMessage } from '../components/ui.jsx';
import { useAuth } from '../context/auth.js';

export default function BookingPage() {
  const { user } = useAuth();
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const [form, setForm] = useState({
    date: today,
    time: '19:00',
    guests: 2,
    occasion: '',
    name: '',
    phone: '',
    notes: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  function update(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }
  async function submit(event) {
    event.preventDefault();
    if (!user) {
      navigate('/login?next=/booking');
      return;
    }
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const reservation = await apiRequest('/reservations', {
        method: 'POST',
        body: JSON.stringify({ ...form, guests: Number(form.guests) }),
      });
      navigate(`/reservations/${reservation.id}`);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <section className="booking-hero">
        <img src="/images/design/restaurant.jpg" alt="A welcoming table in our restaurant" />
        <div className="booking-content">
          <div className="centered-heading light">
            <span className="eyebrow light">THERE’S A PLACE FOR YOU HERE</span>
            <h1>Reserve your table.</h1>
            <p>
              MenuMate Kitchen demo bookings only. Partner restaurant reservations are not available
              yet.
            </p>
            <p>Good company deserves a great setting. Let’s make it special.</p>
          </div>
          <form className="booking-form" onSubmit={submit}>
            <div className="booking-selects">
              <label className="field-label">
                <span>
                  <CalendarDays size={16} /> Date
                </span>
                <input
                  name="date"
                  type="date"
                  min={today}
                  required
                  value={form.date}
                  onChange={update}
                />
              </label>
              <label className="field-label">
                <span>
                  <Clock size={16} /> Time
                </span>
                <select name="time" value={form.time} onChange={update}>
                  {['12:00', '13:00', '14:00', '18:00', '19:00', '20:00', '21:00'].map((time) => (
                    <option key={time} value={time}>
                      {Number(time.slice(0, 2)) % 12 || 12}:00 PM
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                <span>
                  <Users size={16} /> Guests
                </span>
                <select name="guests" value={form.guests} onChange={update}>
                  {Array.from({ length: 8 }, (_, i) => (
                    <option key={i} value={i + 1}>
                      {i + 1} {i ? 'people' : 'person'}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-grid">
              <label className="field-label">
                Your name
                <input
                  name="name"
                  required
                  maxLength={80}
                  autoComplete="name"
                  value={form.name}
                  onChange={update}
                  placeholder="Name for the reservation"
                />
              </label>
              <label className="field-label">
                Phone number
                <input
                  type="tel"
                  name="phone"
                  required
                  pattern="[+0-9 ()\-]{7,20}"
                  maxLength={20}
                  autoComplete="tel"
                  value={form.phone}
                  onChange={update}
                  placeholder="Your mobile number"
                />
              </label>
            </div>
            <fieldset>
              <legend>
                A special occasion? <span>Optional</span>
              </legend>
              <div className="occasion-options">
                {['Birthday', 'Anniversary', 'Business', 'Just because'].map((occasion) => (
                  <button
                    type="button"
                    key={occasion}
                    aria-pressed={form.occasion === occasion}
                    className={form.occasion === occasion ? 'selected' : ''}
                    onClick={() =>
                      setForm({ ...form, occasion: form.occasion === occasion ? '' : occasion })
                    }
                  >
                    {occasion}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="field-label">
              Any special requests? <span className="optional">Optional</span>
              <textarea
                name="notes"
                maxLength={500}
                rows={2}
                value={form.notes}
                onChange={update}
                placeholder="A window seat, a little surprise, dietary preferences…"
              />
            </label>
            <ErrorMessage>{error}</ErrorMessage>
            <button className="button full-width" disabled={busy}>
              {busy ? 'Reserving your table…' : 'Reserve a demo table'}
              <ArrowRight size={17} />
            </button>
            <p className="booking-disclaimer">
              Preview only. This does not reserve a table at a real restaurant.
            </p>
          </form>
        </div>
      </section>
      <div className="container">
        <FeatureStrip booking />
      </div>
      <section className="booking-bottom container">
        <h2>A table for every occasion.</h2>
        <p>
          From quiet dinners for two to celebrations with your favourite people,
          <br />
          we’ll help you make a little more of the moment.
        </p>
        <DemoNote>
          For groups larger than 8, please use the contact page to explore private dining.
        </DemoNote>
      </section>
    </>
  );
}
