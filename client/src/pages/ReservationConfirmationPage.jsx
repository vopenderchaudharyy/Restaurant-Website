import { useParams } from 'react-router-dom';
import { CalendarCheck, Download, ArrowRight } from 'lucide-react';
import { useResource } from '../hooks/useResource.js';
import { ButtonLink, DemoNote, ErrorMessage, Loading, EmptyState } from '../components/ui.jsx';

export default function ReservationConfirmationPage() {
  const { id } = useParams();
  const { data: booking, loading, error, reload } = useResource(`/reservations/${id}`);
  if (loading) return <Loading />;
  if (error)
    return (
      <div className="container page-space">
        <ErrorMessage>{error}</ErrorMessage>
        <button className="button" onClick={reload}>
          Try again
        </button>
      </div>
    );
  if (!booking)
    return (
      <EmptyState
        title="Reservation not found"
        text="This reservation is not available for your account."
        to="/booking"
        action="Reserve a table"
      />
    );
  function downloadCalendar() {
    const start = new Date(`${booking.date}T${booking.time}:00+05:30`);
    const format = (date) => date.toISOString().replace(/[-:]/g, '').replace('.000', '');
    const content = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//MenuMate//Demo Reservation//EN',
      'BEGIN:VEVENT',
      `UID:${booking.id}@menumate.local`,
      `DTSTAMP:${format(new Date())}`,
      `DTSTART:${format(start)}`,
      `DTEND:${format(new Date(start.getTime() + 90 * 60000))}`,
      'SUMMARY:MenuMate demo reservation',
      'DESCRIPTION:Demo only. This is not a real restaurant reservation.',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/calendar' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'menumate-demo-reservation.ics';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="confirmation-page container">
      <div className="celebration-icon">
        <CalendarCheck size={64} strokeWidth={1.2} />
        <span>✓</span>
        <i />
        <i />
        <i />
      </div>
      <span className="eyebrow">WE’VE SAVED YOU A SEAT</span>
      <h1>{booking.status === 'Cancelled' ? 'Reservation cancelled' : 'Table reserved!'}</h1>
      <p>
        {booking.status === 'Cancelled'
          ? 'You can make another reservation whenever you are ready.'
          : `We look forward to welcoming you, ${booking.name.split(' ')[0]}.`}
      </p>
      <div className="confirmation-card">
        {[
          ['Booking ID', `#${booking.id.slice(0, 11).toUpperCase()}`],
          [
            'Date',
            new Date(`${booking.date}T12:00:00`).toLocaleDateString('en-IN', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            }),
          ],
          ['Time', `${Number(booking.time.slice(0, 2)) % 12 || 12}:00 PM`],
          ['Guests', `${booking.guests} ${booking.guests === 1 ? 'person' : 'people'}`],
          ['Occasion', booking.occasion || 'A lovely meal'],
          ['Status', booking.status],
        ].map(([label, value]) => (
          <div className="receipt-line" key={label}>
            <span>{label}</span>
            <strong className={label === 'Status' ? 'green' : ''}>{value}</strong>
          </div>
        ))}
      </div>
      <DemoNote />
      <div className="confirmation-actions">
        <button
          className="button secondary"
          onClick={downloadCalendar}
          disabled={booking.status !== 'Confirmed'}
        >
          <Download size={16} />
          Add to calendar
        </button>
        <ButtonLink to="/account/reservations">
          My reservations <ArrowRight size={16} />
        </ButtonLink>
      </div>
    </div>
  );
}
