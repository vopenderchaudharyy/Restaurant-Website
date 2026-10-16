import { createHash, randomUUID } from 'node:crypto';
import { extras, totals, itemPrice } from '../../../shared/menu.js';
import { env } from '../config/env.js';
import { saveRecord, listRecords, getRecord } from '../services/records.js';
import { getCatalog } from '../services/catalog.js';
import { restaurantById } from '../services/marketplace.js';
import { legacyRestaurant } from '../../../shared/restaurants.js';

function fail(message, status = 400) {
  throw Object.assign(new Error(message), { status, expose: true });
}
function text(value, name, max = 200) {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    fail(`Please provide a valid ${name}.`);
  return value.trim();
}
function owner(req) {
  if (req.user) return req.user.id;
  if (env.nodeEnv === 'production') fail('Demo transactions are disabled in production.', 503);
  const token = req.get('X-Demo-Session');
  if (
    !token ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(token)
  )
    fail('A valid demo session is required.', 401);
  return createHash('sha256').update(token).digest('hex');
}
export async function getMenu(_req, res) {
  res.set('Cache-Control', 'no-store');
  res.json(await getCatalog());
}

export async function createOrder(req, res) {
  if (env.nodeEnv === 'production')
    fail('Demo payments are disabled in production until a payment provider is configured.', 503);
  const session = owner(req);
  const catalog = await getCatalog();
  const body = req.body || {};
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 30)
    fail('Your cart must contain between 1 and 30 items.');
  const items = body.items.map((item) => {
    if (!item || !catalog.some((dish) => dish.id === item.dishId))
      fail('A dish in your cart is unavailable.');
    if (!catalog.find((dish) => dish.id === item.dishId)?.available)
      fail('A dish in your cart is sold out. Please update your cart.', 409);
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20)
      fail('Item quantities must be between 1 and 20.');
    if (!['regular', 'large'].includes(item.size)) fail('Invalid portion size.');
    if (
      !Array.isArray(item.extras) ||
      new Set(item.extras).size !== item.extras.length ||
      item.extras.some((id) => !extras.some((extra) => extra.id === id))
    )
      fail('Invalid add-ons.');
    const clean = {
      dishId: item.dishId,
      quantity: item.quantity,
      size: item.size,
      extras: item.extras,
    };
    return {
      ...clean,
      name: catalog.find((dish) => dish.id === item.dishId).name,
      dish: catalog.find((dish) => dish.id === item.dishId),
      unitPrice: itemPrice(clean,catalog),
    };
  });
  const restaurantId=items[0].dish.restaurantId;
  if(items.some(item=>item.dish.restaurantId!==restaurantId)) fail('Your bag can contain dishes from only one restaurant.',409);
  if(body.restaurantId && body.restaurantId!==restaurantId) fail('Restaurant does not match your bag.',400);
  const restaurant=await restaurantById(restaurantId);
  if(!restaurant || restaurant.status!=='published' || !restaurant.acceptingOrders) fail('This restaurant is not accepting orders.',409);
  const calculated=totals(items,body.fulfillment,catalog,restaurant.deliveryFee);
  if(calculated.subtotal<restaurant.minOrder) fail(`This restaurant has a minimum order of ${restaurant.minOrder} rupees.`,400);
  if (!['delivery', 'pickup', 'dine-in'].includes(body.fulfillment))
    fail('Select a fulfillment method.');
  if (!['demo-upi', 'demo-card', 'cash'].includes(body.payment)) fail('Select a payment method.');
  const customer = {
    name: text(body.customer?.name, 'name', 80),
    phone: text(body.customer?.phone, 'phone', 20),
  };
  if (!/^[+\d\s()-]{7,20}$/.test(customer.phone)) fail('Please enter a valid phone number.');
  if (body.fulfillment === 'delivery')
    customer.address = text(body.customer?.address, 'delivery address', 300);
  customer.city = restaurant.city;
  const notes = typeof body.notes === 'string' ? body.notes.slice(0, 500) : '';
  const data = {
    id: `OD-${randomUUID()}`,
    createdAt: new Date().toISOString(),
    items,
    customer,
    notes,
    fulfillment: body.fulfillment,
    payment: body.payment,
    restaurantId,
    restaurantName: restaurant.name,
    restaurantAddress: restaurant.address,
    restaurantImage: restaurant.image,
    etaMin: restaurant.etaMin, etaMax: restaurant.etaMax,
    totals: calculated,
    status: 'Placed',
    history: [{ status: 'Placed', at: new Date().toISOString(), actor: req.user.id }],
    demo: true,
  };
  res.status(201).json(await saveRecord('order', session, data));
}
export async function getOrders(req, res) {
  res.json(await listRecords('order', owner(req)));
}
export async function getOrder(req, res) {
  const record = await getRecord(
    'order',
    req.params.id,
    req.user.role === 'admin' ? undefined : req.user.id,
  );
  if (!record) fail('Order not found.', 404);
  res.json(record);
}
export async function createReservation(req, res) {
  if (env.nodeEnv === 'production') fail('Demo reservations are disabled in production.', 503);
  const session = owner(req);
  const body = req.body || {};
  const date = text(body.date, 'date', 10);
  const time = text(body.time, 'time', 5);
  const requested = new Date(`${date}T${time}:00+05:30`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^(12|13|14|18|19|20|21):00$/.test(time) ||
    !Number.isFinite(requested.getTime()) ||
    requested <= new Date()
  )
    fail('Select an available future date and time.');
  if (requested.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) !== date)
    fail('Invalid date.');
  if (!Number.isInteger(body.guests) || body.guests < 1 || body.guests > 8)
    fail('Reservations support 1 to 8 guests.');
  const name = text(body.name, 'name', 80);
  const phone = text(body.phone, 'phone', 20);
  if (!/^[+\d\s()-]{7,20}$/.test(phone)) fail('Please enter a valid phone number.');
  const existing = await listRecords('reservation', session);
  if (
    existing.some(
      (record) => record.date === date && record.time === time && record.status !== 'Cancelled',
    )
  )
    fail('You already have a demo reservation at this time.', 409);
  const data = {
    id: `TB-${randomUUID()}`,
    restaurantId: legacyRestaurant.id,
    createdAt: new Date().toISOString(),
    date,
    time,
    guests: body.guests,
    name,
    phone,
    occasion: typeof body.occasion === 'string' ? body.occasion.slice(0, 50) : '',
    notes: typeof body.notes === 'string' ? body.notes.slice(0, 500) : '',
    status: 'Confirmed',
    history: [{ status: 'Confirmed', at: new Date().toISOString(), actor: req.user.id }],
    demo: true,
  };
  res.status(201).json(await saveRecord('reservation', session, data));
}
export async function getReservations(req, res) {
  res.json(await listRecords('reservation', owner(req)));
}
export async function getReservation(req, res) {
  const record = await getRecord(
    'reservation',
    req.params.id,
    req.user.role === 'admin' ? undefined : req.user.id,
  );
  if (!record) fail('Reservation not found.', 404);
  res.json(record);
}
export async function createMessage(req, res) {
  if (env.nodeEnv === 'production') fail('Demo messages are disabled in production.', 503);
  const session = owner(req);
  const body = req.body || {};
  const email = text(body.email, 'email', 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Please enter a valid email.');
  await saveRecord('message', session, {
    id: randomUUID(),
    name: text(body.name, 'name', 80),
    email,
    message: text(body.message, 'message', 2000),
  });
  res.status(201).json({ message: 'Your demo message has been saved. No email was sent.' });
}
