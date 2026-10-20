import { randomUUID } from 'node:crypto';
import { requiredText, fail } from '../utils/errors.js';
import { cuisineOptions } from '../../../shared/restaurants.js';
import { resolvePhoto } from '../services/photos.js';
import { categories } from '../../../shared/menu.js';
import {
  restaurants,
  restaurantById,
  ownedRestaurant,
  createRestaurant,
  changeRestaurant,
  menuItems,
  writeMenuItem,
  publicRestaurant,
} from '../services/marketplace.js';
import { getCatalog } from '../services/catalog.js';
import { listRecords, getRecord } from '../services/records.js';
import { adminOrderStatus } from './admin.controller.js';
import { restaurantReviews, reviewSummary } from '../services/reviews.js';
function integer(value, label, min, max) {
  if (!Number.isInteger(value) || value < min || value > max)
    fail(`${label} must be between ${min} and ${max}.`);
  return value;
}
function details(body = {}) {
  if (!cuisineOptions.includes(body.cuisine)) fail('Select a cuisine.');
  const phone = requiredText(body.phone, 'restaurant phone', 20);
  if (!/^[+\d\s()-]{7,20}$/.test(phone)) fail('Enter a valid restaurant phone.');
  const etaMin = integer(body.etaMin, 'Minimum estimated minutes', 10, 120);
  const etaMax = integer(body.etaMax, 'Maximum estimated minutes', etaMin, 180);
  return {
    name: requiredText(body.name, 'restaurant name', 80),
    cuisine: body.cuisine,
    city: requiredText(body.city, 'city', 60),
    area: requiredText(body.area, 'area', 80),
    address: requiredText(body.address, 'restaurant address', 250),
    phone,
    description: requiredText(body.description, 'description', 500),
    deliveryFee: integer(body.deliveryFee, 'Delivery fee', 0, 500),
    minOrder: integer(body.minOrder, 'Minimum order', 0, 5000),
    etaMin,
    etaMax,
  };
}
async function requireRestaurant(req) {
  const restaurant = await ownedRestaurant(req.user.id);
  if (!restaurant) fail('Create your restaurant workspace first.', 404);
  return restaurant;
}
export async function browseRestaurants(_req, res) {
  const listings = await restaurants();
  const reviews = await listRecords('review');
  res.json(
    listings.map((restaurant) => {
      const summary = reviewSummary(
        reviews.filter((review) => review.restaurantId === restaurant.id),
      );
      return { ...restaurant, reviewSummary: summary };
    }),
  );
}
export async function restaurantDetail(req, res) {
  const restaurant = await restaurantById(req.params.id);
  if (!restaurant || restaurant.status !== 'published') fail('Restaurant not found.', 404);
  const reviews = await restaurantReviews(restaurant.id, { publishedOnly: true });
  res.json({
    restaurant: publicRestaurant(restaurant),
    menu: (await getCatalog()).filter((item) => item.restaurantId === restaurant.id),
    reviews: reviews.map(({ orderId: _orderId, moderatedBy: _moderatedBy, ...review }) => review),
    reviewSummary: reviewSummary(reviews),
  });
}
export async function partnerOverview(req, res) {
  const restaurant = await ownedRestaurant(req.user.id);
  res.json({ restaurant, menu: restaurant ? await menuItems(restaurant.id) : [] });
}
export async function partnerRegister(req, res) {
  const restaurant = await createRestaurant({
    id: `rest-${randomUUID()}`,
    ownerId: req.user.id,
    ...details(req.body),
    image: await resolvePhoto(req.body, req.user.id, 'restaurant'),
    status: 'draft',
    acceptingOrders: false,
    createdAt: new Date().toISOString(),
  });
  res.status(201).json(restaurant);
}
export async function partnerUpdate(req, res) {
  const restaurant = await requireRestaurant(req);
  const changes = details(req.body);
  changes.image = await resolvePhoto(req.body, req.user.id, 'restaurant');
  if (typeof req.body.acceptingOrders !== 'boolean') fail('Choose whether to accept orders.');
  changes.acceptingOrders = req.body.acceptingOrders;
  const updated = await changeRestaurant(restaurant.id, changes);
  res.json(updated);
}
export async function partnerPublish(req, res) {
  const restaurant = await requireRestaurant(req);
  if (restaurant.status === 'suspended')
    fail('This restaurant is suspended. Contact platform support.', 403);
  if (!(await menuItems(restaurant.id)).some((item) => item.available))
    fail('Add at least one available dish before publishing.', 409);
  const updated = await changeRestaurant(restaurant.id, { status: 'published' }, restaurant.status);
  if (!updated) fail('Restaurant status changed. Refresh and try again.', 409);
  res.json(updated);
}
export async function partnerMenuSave(req, res) {
  const restaurant = await requireRestaurant(req);
  if (restaurant.status === 'suspended') fail('Restaurant is suspended.', 403);
  const body = req.body || {};
  if (!categories.slice(1).includes(body.category)) fail('Choose a menu category.');
  if (typeof body.veg !== 'boolean' || typeof body.available !== 'boolean')
    fail('Choose dietary preference and availability.');
  const id = req.params.id || `dish-${randomUUID()}`;
  const data = {
    id,
    restaurantId: restaurant.id,
    name: requiredText(body.name, 'dish name', 80),
    description: requiredText(body.description, 'dish description', 600),
    category: body.category,
    price: integer(body.price, 'Price', 1, 100000),
    image: await resolvePhoto(body, req.user.id, 'pizza'),
    veg: body.veg,
    available: body.available,
  };
  const result = await writeMenuItem(data, !req.params.id);
  if (!result) fail('Dish not found in your restaurant.', 404);
  res.status(req.params.id ? 200 : 201).json(result);
}
export async function partnerOrders(req, res) {
  const restaurant = await requireRestaurant(req);
  res.json(await listRecords('order', undefined, restaurant.id));
}
export async function partnerOrderStatus(req, res) {
  const restaurant = await requireRestaurant(req);
  const order = await getRecord('order', req.params.id);
  if (!order || order.restaurantId !== restaurant.id) fail('Order not found.', 404);
  return adminOrderStatus(req, res);
}
export async function platformRestaurants(_req, res) {
  res.json(await restaurants({ all: true }));
}
export async function platformRestaurantStatus(req, res) {
  if (!['published', 'suspended'].includes(req.body?.status)) fail('Invalid restaurant status.');
  const restaurant = await restaurantById(req.params.id);
  if (!restaurant || restaurant.demo) fail('Partner restaurant not found.', 404);
  if (restaurant.status !== req.body.expectedStatus)
    fail('Status changed. Refresh and retry.', 409);
  if (
    req.body.status === 'published' &&
    !(await menuItems(restaurant.id)).some((item) => item.available)
  )
    fail('Restaurant needs an available menu before publishing.', 409);
  const updated = await changeRestaurant(
    restaurant.id,
    { status: req.body.status },
    restaurant.status,
  );
  if (!updated) fail('Status changed. Refresh and retry.', 409);
  res.json(publicRestaurant(updated));
}
