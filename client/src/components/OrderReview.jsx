import { useState } from 'react';
import { Star, BadgeCheck } from 'lucide-react';
import { useResource } from '../hooks/useResource.js';
import { apiRequest } from '../services/api.js';
import { ErrorMessage } from './ui.jsx';

export function Stars({ rating, count, label = 'Rating' }) {
  return (
    <span className="review-stars" aria-label={`${label}: ${rating || 0} out of 5`}>
      <Star size={16} fill="currentColor" />
      <strong>{rating || 'New'}</strong>
      {count > 0 && (
        <small>
          {count} verified {count === 1 ? 'review' : 'reviews'}
        </small>
      )}
    </span>
  );
}

export function ReviewCard({ review, management = false, onModerate }) {
  return (
    <article className={`review-card ${review.status === 'hidden' ? 'is-hidden' : ''}`}>
      <div className="review-card-head">
        <div>
          <Stars rating={review.rating} />
          <strong>{review.author}</strong>
        </div>
        <span className="verified-review">
          <BadgeCheck size={15} /> Verified order
        </span>
      </div>
      <p>{review.comment}</p>
      <footer>
        <span>
          {review.restaurantName} ·{' '}
          {new Date(review.updatedAt || review.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
        {management && (
          <button className="text-link" onClick={() => onModerate(review)}>
            {review.status === 'hidden' ? 'Restore review' : 'Hide review'}
          </button>
        )}
      </footer>
    </article>
  );
}

export default function OrderReview({ orderId, compact = false }) {
  const resource = useResource(`/orders/${orderId}/review`);
  if (resource.loading)
    return (
      <p className="review-loading" role="status">
        Loading review…
      </p>
    );
  if (resource.error) return <ErrorMessage>{resource.error}</ErrorMessage>;
  if (!resource.data?.eligible) return null;
  return <ReviewEditor orderId={orderId} resource={resource} compact={compact} />;
}

function ReviewEditor({ orderId, resource, compact }) {
  const [rating, setRating] = useState(resource.data.review?.rating || 0);
  const [comment, setComment] = useState(resource.data.review?.comment || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(!compact);
  async function submit(event) {
    event.preventDefault();
    setError('');
    setSaved(false);
    if (!rating) return setError('Choose a rating from 1 to 5.');
    setBusy(true);
    try {
      const review = await apiRequest(`/orders/${orderId}/review`, {
        method: 'PUT',
        body: JSON.stringify({ rating, comment }),
      });
      resource.updateData((previous) => ({ ...previous, review }));
      setSaved(true);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }
  if (!open)
    return (
      <div className="order-review-prompt">
        {resource.data.review ? (
          <Stars rating={resource.data.review.rating} label="Your rating" />
        ) : (
          <span>How was your meal?</span>
        )}
        <button className="text-link" onClick={() => setOpen(true)}>
          {resource.data.review ? 'Edit review' : 'Write a review'}
        </button>
      </div>
    );
  return (
    <form className={`order-review panel ${compact ? 'compact' : ''}`} onSubmit={submit}>
      <div>
        <span className="eyebrow">VERIFIED ORDER REVIEW</span>
        <h3>{resource.data.review ? 'Update your review' : 'How was your meal?'}</h3>
        <p>Your feedback helps other diners choose and helps the restaurant improve.</p>
      </div>
      <fieldset disabled={busy}>
        <legend>Your rating</legend>
        <div className="review-rating-input">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              aria-label={`Rate ${value} out of 5`}
              aria-pressed={rating === value}
              onClick={() => setRating(value)}
            >
              <Star size={24} fill={value <= rating ? 'currentColor' : 'none'} />
            </button>
          ))}
        </div>
        <label className="field-label">
          Your review
          <textarea
            required
            minLength={10}
            maxLength={600}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="What stood out about the food or service?"
          />
        </label>
        <div className="review-form-actions">
          <button className="button" disabled={busy || !rating}>
            {busy ? 'Saving…' : resource.data.review ? 'Update review' : 'Publish review'}
          </button>
          {saved && <span role="status">Review saved.</span>}
          {compact && (
            <button
              type="button"
              className="text-link"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          )}
        </div>
      </fieldset>
      {resource.data.review?.status === 'hidden' && (
        <p className="small-muted">This review is hidden by platform moderation.</p>
      )}
      <ErrorMessage>{error}</ErrorMessage>
    </form>
  );
}
