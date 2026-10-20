import { createHash } from 'node:crypto';
import { getRecord, listRecords, updateRecord } from '../services/records.js';
import { restaurantById, ownedRestaurant } from '../services/marketplace.js';
import { restaurantReviews, reviewSummary, saveReview } from '../services/reviews.js';
import { fail, requiredText } from '../utils/errors.js';

const reviewId = (orderId) =>
  `RV-${createHash('sha256').update(orderId).digest('hex').slice(0, 24)}`;
const eligibleStatuses = ['Delivered', 'Collected'];
const publicReview = ({ orderId: _orderId, moderatedBy: _moderatedBy, ...review }) => review;

function authorName(name) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts.at(-1)[0]}.` : parts[0];
}

export async function orderReview(req, res) {
  const order = await getRecord('order', req.params.id, req.user.id);
  if (!order) fail('Order not found.', 404);
  res.json({
    eligible: eligibleStatuses.includes(order.status),
    review: await getRecord('review', reviewId(order.id), req.user.id),
  });
}

export async function submitReview(req, res) {
  const order = await getRecord('order', req.params.id, req.user.id);
  if (!order) fail('Order not found.', 404);
  if (!eligibleStatuses.includes(order.status))
    fail('You can review an order after it is delivered or collected.', 409);
  if (!Number.isInteger(req.body?.rating) || req.body.rating < 1 || req.body.rating > 5)
    fail('Choose a rating from 1 to 5.');
  const comment = requiredText(req.body?.comment, 'review', 600);
  if (comment.length < 10) fail('Your review should be at least 10 characters.');
  const id = reviewId(order.id);
  const existing = await getRecord('review', id, req.user.id);
  const now = new Date().toISOString();
  const review = await saveReview(req.user.id, {
    id,
    orderId: order.id,
    restaurantId: order.restaurantId,
    restaurantName: order.restaurantName,
    author: authorName(order.customer.name),
    rating: req.body.rating,
    comment,
    status: existing?.status || 'published',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    verifiedOrder: true,
  });
  if (!review) fail('Unable to save this review.', 409);
  res.status(existing ? 200 : 201).json(review);
}

export async function publicRestaurantReviews(req, res) {
  const restaurant = await restaurantById(req.params.id);
  if (!restaurant || restaurant.status !== 'published') fail('Restaurant not found.', 404);
  const reviews = await restaurantReviews(restaurant.id, { publishedOnly: true });
  res.json({ summary: reviewSummary(reviews), reviews: reviews.map(publicReview) });
}

export async function partnerReviews(req, res) {
  const restaurant = await ownedRestaurant(req.user.id);
  if (!restaurant) fail('Create your restaurant workspace first.', 404);
  const reviews = await restaurantReviews(restaurant.id);
  res.json({ summary: reviewSummary(reviews), reviews });
}

export async function adminReviews(_req, res) {
  const reviews = await listRecords('review');
  res.json({ summary: reviewSummary(reviews), reviews });
}

export async function moderateReview(req, res) {
  if (!['published', 'hidden'].includes(req.body?.status)) fail('Invalid review status.');
  const review = await getRecord('review', req.params.id);
  if (!review) fail('Review not found.', 404);
  if (review.status !== req.body.expectedStatus)
    fail('This review changed. Refresh and try again.', 409);
  const updated = await updateRecord('review', review.id, undefined, review.status, {
    status: req.body.status,
    moderatedAt: new Date().toISOString(),
    moderatedBy: req.user.id,
  });
  if (!updated) fail('This review changed. Refresh and try again.', 409);
  res.json(updated);
}
