import { randomUUID } from 'node:crypto';
import { extras, totals, itemPrice } from '../../../shared/menu.js';
import { getCatalog } from './catalog.js';
import { restaurantById } from './marketplace.js';
import { fail, requiredText as text } from '../utils/errors.js';

export async function buildOrder(body, userId) {
  const catalog = await getCatalog();
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
      unitPrice: itemPrice(clean, catalog),
    };
  });
  const restaurantId = items[0].dish.restaurantId;
  if (items.some((item) => item.dish.restaurantId !== restaurantId))
    fail('Your bag can contain dishes from only one restaurant.', 409);
  if (body.restaurantId && body.restaurantId !== restaurantId)
    fail('Restaurant does not match your bag.', 400);
  const restaurant = await restaurantById(restaurantId);
  if (!restaurant || restaurant.status !== 'published' || !restaurant.acceptingOrders)
    fail('This restaurant is not accepting orders.', 409);
  const calculated = totals(items, body.fulfillment, catalog, restaurant.deliveryFee);
  if (calculated.subtotal < restaurant.minOrder)
    fail(`This restaurant has a minimum order of ${restaurant.minOrder} rupees.`, 400);
  if (!['delivery', 'pickup', 'dine-in'].includes(body.fulfillment))
    fail('Select a fulfillment method.');
  const customer = {
    name: text(body.customer?.name, 'name', 80),
    phone: text(body.customer?.phone, 'phone', 20),
  };
  if (!/^[+\d\s()-]{7,20}$/.test(customer.phone)) fail('Please enter a valid phone number.');
  if (body.fulfillment === 'delivery')
    customer.address = text(body.customer?.address, 'delivery address', 300);
  customer.city = restaurant.city;
  const notes = typeof body.notes === 'string' ? body.notes.slice(0, 500) : '';
  return {
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
    etaMin: restaurant.etaMin,
    etaMax: restaurant.etaMax,
    totals: calculated,
    status: 'Placed',
    history: [{ status: 'Placed', at: new Date().toISOString(), actor: userId }],
    demo: true,
  };
}
