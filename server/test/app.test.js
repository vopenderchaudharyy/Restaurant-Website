import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { randomUUID, createHmac } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import sharp from 'sharp';
process.env.NODE_ENV = 'test';
process.env.RAZORPAY_KEY_ID = '';
process.env.RAZORPAY_KEY_SECRET = '';
process.env.RAZORPAY_WEBHOOK_SECRET = '';
process.env.ADMIN_NOTIFICATION_EMAIL = 'owner@example.com';
const uploadTestDirectory = await mkdtemp(join(tmpdir(), 'menumate-photos-test-'));
// Match the default hidden storage folder so serving tests catch dotfile regressions.
process.env.MENUMATE_UPLOAD_DIR = join(uploadTestDirectory, '.uploads');
const mongoTestUri = process.env.MENUMATE_TEST_MONGODB_URI;
const mongoTestDatabase = process.env.MENUMATE_TEST_DATABASE;
if (
  mongoTestUri &&
  (!/^mongodb:\/\/127\.0\.0\.1:27017\/menumate_source_[a-f0-9]{32}$/.test(mongoTestUri) ||
    !/^menumate_test_[a-f0-9]{32}$/.test(mongoTestDatabase || ''))
)
  throw new Error('Refusing non-isolated MongoDB test target');
process.env.MONGODB_URI = mongoTestUri || ''; // Never read the developer database.
process.env.MONGODB_DB_NAME = mongoTestDatabase || '';
const { default: mongoose } = await import('mongoose');
const { connectDatabase } = await import('../src/config/db.js');
const { default: app } = await import('../src/app.js');
const { findUser, updateUser } = await import('../src/services/accounts.js');
const { rateLimit } = await import('../src/middleware/rateLimit.js');
const { env } = await import('../src/config/env.js');
const { clearTestEmailOutbox, readTestEmailOutbox } = await import('../src/services/email.js');
let server, baseUrl, customer, other, admin;
const secret = 'a-strong-test-passphrase-42';
async function request(
  path,
  { body, cookie = customer, method = body ? 'POST' : 'GET', headers = {} } = {},
) {
  return fetch(`${baseUrl}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'MenuMate',
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}
async function register(email = `${randomUUID()}@example.com`, extra = {}) {
  const response = await request('/auth/register', {
    cookie: null,
    body: { email, name: 'Test Guest', password: secret, ...extra },
  });
  assert.equal(response.status, 201);
  return {
    response,
    cookie: response.headers.get('set-cookie').split(';')[0],
    user: (await response.json()).user,
  };
}
before(async () => {
  if (mongoTestUri) await connectDatabase();
  if (process.env.MENUMATE_TEST_MIGRATED_EMAIL)
    assert.ok(await findUser({ email: process.env.MENUMATE_TEST_MIGRATED_EMAIL }));
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  customer = (await register()).cookie;
  other = (await register()).cookie;
  const owner = await register();
  await updateUser(owner.user.id, { role: 'admin' });
  admin = owner.cookie;
});
after(async () => {
  if (server)
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  if (mongoTestUri && mongoose.connection.readyState === 1) {
    assert.equal(mongoose.connection.name, mongoTestDatabase);
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
  const target = resolve(uploadTestDirectory);
  assert.ok(target.startsWith(resolve(tmpdir()) + sep));
  assert.ok(target.includes(`${sep}menumate-photos-test-`));
  await rm(target, { recursive: true, force: true });
});
const validOrder = {
  items: [{ dishId: 'grilled-chicken', quantity: 2, size: 'large', extras: ['sauce'] }],
  customer: { name: 'Test Guest', phone: '9876543210', address: '123 Test Road' },
  fulfillment: 'delivery',
  payment: 'demo-upi',
};
async function order(body = validOrder) {
  const response = await request('/orders', { body });
  assert.equal(response.status, 201);
  return response.json();
}

test('public health and menu are available; private APIs require accounts', async () => {
  const health = await (await request('/health', { cookie: null })).json();
  assert.equal(health.status, 'ok');
  assert.equal(health.database, mongoTestUri ? 'connected' : 'disconnected');
  assert.equal(health.databaseName, mongoTestUri ? mongoose.connection.name : null);
  assert.equal(health.schema, mongoTestUri ? 'ready' : 'unavailable');
  if (mongoTestUri) {
    assert.equal(health.migration.status, 'complete');
    assert.equal(health.migration.source, process.env.MONGODB_MIGRATE_FROM);
    assert.ok(health.migration.copied >= 1);
  } else assert.equal(health.migration, undefined);
  const catalog = await (await request('/menu', { cookie: null })).json();
  assert.equal(catalog.length, 52);
  assert.equal((await request('/orders', { cookie: null })).status, 401);
  assert.equal((await request('/reservations', { cookie: null })).status, 401);
  assert.equal((await request('/admin/orders', { cookie: null })).status, 401);
});
test('registration hashes passwords, ignores role injection and sets an HTTP-only cookie', async () => {
  const result = await register(undefined, { role: 'admin' });
  assert.equal(result.user.role, 'customer');
  assert.equal(result.user.passwordHash, undefined);
  assert.match(result.response.headers.get('set-cookie'), /HttpOnly/i);
  assert.match(result.response.headers.get('set-cookie'), /SameSite=Lax/i);
  const stored = await findUser({ id: result.user.id });
  assert.match(stored.passwordHash, /^scrypt:/);
  assert.notEqual(stored.passwordHash, secret);
  assert.equal(
    (
      await request('/auth/register', {
        cookie: null,
        body: { name: 'Someone', email: result.user.email.toUpperCase(), password: secret },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request('/auth/register', {
        cookie: null,
        body: { name: 'Someone', email: 'short@example.com', password: 'short' },
      })
    ).status,
    400,
  );
});
test('registration welcomes the user and successful login notifies the platform owner', async () => {
  clearTestEmailOutbox();
  const address = `${randomUUID()}@example.com`;
  await register(address);
  let messages = readTestEmailOutbox();
  assert.equal(messages.length, 1);
  assert.equal(messages[0].to, address);
  assert.equal(messages[0].subject, 'Welcome to MenuMate');
  assert.doesNotMatch(JSON.stringify(messages[0]), new RegExp(secret));

  clearTestEmailOutbox();
  const response = await request('/auth/login', {
    cookie: null,
    body: { email: address, password: secret },
  });
  assert.equal(response.status, 200);
  messages = readTestEmailOutbox();
  assert.equal(messages.length, 1);
  assert.equal(messages[0].to, 'owner@example.com');
  assert.match(messages[0].subject, new RegExp(address));
  assert.doesNotMatch(JSON.stringify(messages[0]), new RegExp(secret));
});
test('login rejects invalid credentials, restores an account, and logout invalidates the session', async () => {
  const result = await register();
  assert.equal(
    (
      await request('/auth/login', {
        cookie: null,
        body: { email: result.user.email, password: 'wrong' },
      })
    ).status,
    401,
  );
  const response = await request('/auth/login', {
    cookie: null,
    body: { email: result.user.email, password: secret },
  });
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie').split(';')[0];
  assert.equal((await (await request('/auth/me', { cookie })).json()).user.id, result.user.id);
  await request('/auth/logout', { cookie, method: 'POST' });
  assert.equal((await request('/orders', { cookie })).status, 401);
});
test('password recovery is private, single-use, and revokes existing sessions', async () => {
  const account = await register();
  const unknownResponse = await request('/auth/forgot-password', {
    cookie: null,
    body: { email: `missing-${randomUUID()}@example.com` },
  });
  const knownResponse = await request('/auth/forgot-password', {
    cookie: null,
    body: { email: account.user.email.toUpperCase() },
  });
  assert.equal(unknownResponse.status, 200);
  assert.equal(knownResponse.status, 200);
  const unknown = await unknownResponse.json();
  const known = await knownResponse.json();
  assert.equal(known.message, unknown.message);
  assert.equal(unknown.resetToken, undefined);
  assert.match(known.resetToken, /^[A-Za-z0-9_-]{40,80}$/);

  const newPassword = `${secret}-recovered`;
  const changed = await request('/auth/reset-password', {
    cookie: null,
    body: { token: known.resetToken, newPassword },
  });
  assert.equal(changed.status, 200);
  assert.equal((await changed.json()).message, 'Password changed. Sign in with your new password.');
  assert.equal((await request('/orders', { cookie: account.cookie })).status, 401);
  assert.equal(
    (
      await request('/auth/login', {
        cookie: null,
        body: { email: account.user.email, password: secret },
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await request('/auth/login', {
        cookie: null,
        body: { email: account.user.email, password: newPassword },
      })
    ).status,
    200,
  );
  const reused = await request('/auth/reset-password', {
    cookie: null,
    body: { token: known.resetToken, newPassword: `${newPassword}-again` },
  });
  assert.equal(reused.status, 400);
  assert.match((await reused.json()).message, /invalid or has expired/i);
});
test('password change rejects wrong current password and revokes older sessions', async () => {
  const first = await register();
  const login = await request('/auth/login', {
    cookie: null,
    body: { email: first.user.email, password: secret },
  });
  const second = login.headers.get('set-cookie').split(';')[0];
  assert.equal(
    (
      await request('/auth/password', {
        cookie: first.cookie,
        body: { currentPassword: 'wrong', newPassword: secret + 'new' },
      })
    ).status,
    400,
  );
  const changed = await request('/auth/password', {
    cookie: first.cookie,
    body: { currentPassword: secret, newPassword: secret + 'new' },
  });
  assert.equal(changed.status, 200);
  assert.equal((await request('/orders', { cookie: first.cookie })).status, 401);
  assert.equal((await request('/orders', { cookie: second })).status, 401);
  assert.equal(
    (await request('/orders', { cookie: changed.headers.get('set-cookie').split(';')[0] })).status,
    200,
  );
  assert.equal(
    (
      await request('/auth/login', {
        cookie: null,
        body: { email: first.user.email, password: secret },
      })
    ).status,
    401,
  );
});
test('profile changes cannot alter role, email or another customer', async () => {
  const result = await register();
  const response = await request('/auth/profile', {
    cookie: result.cookie,
    method: 'PATCH',
    body: {
      name: 'Updated Name',
      phone: '9876543210',
      role: 'admin',
      email: 'different@example.com',
      id: 'another',
    },
  });
  const { user } = await response.json();
  assert.equal(user.name, 'Updated Name');
  assert.equal(user.role, 'customer');
  assert.equal(user.email, result.user.email);
  assert.equal(user.id, result.user.id);
});
test('CSRF protections reject untrusted origins and missing custom headers', async () => {
  assert.equal(
    (
      await request('/auth/logout', {
        method: 'POST',
        headers: { Origin: 'https://untrusted.example' },
      })
    ).status,
    403,
  );
  assert.equal(
    (await request('/auth/logout', { method: 'POST', headers: { 'X-Requested-With': '' } })).status,
    403,
  );
  assert.equal(
    (await request('/auth/logout', { method: 'POST', headers: { 'Sec-Fetch-Site': 'cross-site' } }))
      .status,
    403,
  );
});
test('customer and admin authorization are enforced on the server', async () => {
  assert.equal((await request('/admin/orders')).status, 403);
  assert.equal(
    (await request('/admin/menu/grilled-chicken', { method: 'PATCH', body: { available: false } }))
      .status,
    403,
  );
  assert.equal((await request('/admin/orders', { cookie: admin })).status, 200);
});
test('server computes prices and isolates order access by owner', async () => {
  const record = await order({ ...validOrder, totals: { total: 1 } });
  assert.deepEqual(record.totals, { subtotal: 1058, delivery: 50, tax: 55, total: 1163 });
  assert.equal((await request(`/orders/${record.id}`)).status, 200);
  assert.equal((await request(`/orders/${record.id}`, { cookie: other })).status, 404);
  assert.equal(
    (await request(`/orders/${record.id}/cancel`, { cookie: other, method: 'PATCH' })).status,
    404,
  );
  assert.equal((await request(`/orders/${record.id}`, { cookie: admin })).status, 200);
  assert.deepEqual(await (await request('/orders', { cookie: other })).json(), []);
});
test('invalid order quantities, dishes, extras and payment methods are rejected', async () => {
  for (const items of [
    [],
    [null],
    [{ ...validOrder.items[0], quantity: -1 }],
    [{ ...validOrder.items[0], quantity: 1.5 }],
    [{ ...validOrder.items[0], dishId: 'unknown' }],
    [{ ...validOrder.items[0], extras: ['sauce', 'sauce'] }],
    [{ ...validOrder.items[0], extras: ['unknown'] }],
  ])
    assert.equal((await request('/orders', { body: { ...validOrder, items } })).status, 400);
  assert.equal(
    (await request('/orders', { body: { ...validOrder, payment: 'live-card' } })).status,
    400,
  );
  const pickup = await order({ ...validOrder, fulfillment: 'pickup' });
  assert.deepEqual(pickup.totals, { subtotal: 1058, delivery: 0, tax: 53, total: 1111 });
});
test('admin transitions are validated and stale updates cannot overwrite newer status', async () => {
  const record = await order();
  const update = (status, expectedStatus) =>
    request(`/admin/orders/${record.id}`, {
      cookie: admin,
      method: 'PATCH',
      body: { status, expectedStatus },
    });
  assert.equal((await update('Delivered', 'Placed')).status, 409);
  assert.equal((await update('Preparing', 'Placed')).status, 200);
  assert.equal((await update('Cancelled', 'Placed')).status, 409);
  assert.equal((await request(`/orders/${record.id}/cancel`, { method: 'PATCH' })).status, 409);
  assert.equal((await update('Out for delivery', 'Preparing')).status, 200);
  const delivered = await update('Delivered', 'Out for delivery');
  assert.equal(delivered.status, 200);
  assert.equal((await delivered.json()).history.length, 4);
  assert.equal((await update('Preparing', 'Delivered')).status, 409);
});
test('customer cancellation works before preparation; cancelled orders stay final', async () => {
  const record = await order();
  const cancelled = await request(`/orders/${record.id}/cancel`, { method: 'PATCH' });
  assert.equal(cancelled.status, 200);
  const history = (await cancelled.json()).history;
  assert.equal(history.at(-1).status, 'Cancelled');
  assert.equal(typeof history.at(-1).actor, 'string');
  assert.equal(
    (
      await request(`/admin/orders/${record.id}`, {
        cookie: admin,
        method: 'PATCH',
        body: { status: 'Preparing', expectedStatus: 'Cancelled' },
      })
    ).status,
    409,
  );
});
test('sold-out menu items cannot be ordered even with a stale client catalog', async () => {
  await request('/admin/menu/grilled-chicken', {
    cookie: admin,
    method: 'PATCH',
    body: { available: false },
  });
  assert.equal((await request('/orders', { body: validOrder })).status, 409);
  assert.equal(
    (await (await request('/menu')).json()).find((dish) => dish.id === 'grilled-chicken').available,
    false,
  );
  assert.equal(
    (
      await request('/admin/menu/grilled-chicken', {
        cookie: admin,
        method: 'PATCH',
        body: { available: 'yes' },
      })
    ).status,
    400,
  );
  await request('/admin/menu/grilled-chicken', {
    cookie: admin,
    method: 'PATCH',
    body: { available: true },
  });
});
test('reservations validate dates, ownership, duplicates and cancellation', async () => {
  const date = new Date(Date.now() + 2 * 86400000).toLocaleDateString('en-CA', {
    timeZone: 'Asia/Kolkata',
  });
  const body = { date, time: '19:00', guests: 4, name: 'Test Guest', phone: '9876543210' };
  for (const change of [
    { date: '2020-01-01' },
    { date: '2099-02-31' },
    { guests: 0 },
    { time: '03:00' },
  ])
    assert.equal((await request('/reservations', { body: { ...body, ...change } })).status, 400);
  const first = await request('/reservations', { body });
  assert.equal(first.status, 201);
  const record = await first.json();
  assert.equal((await request('/reservations', { body })).status, 409);
  assert.equal((await request(`/reservations/${record.id}`, { cookie: other })).status, 404);
  assert.equal(
    (await request(`/reservations/${record.id}/cancel`, { cookie: other, method: 'PATCH' })).status,
    404,
  );
  assert.equal(
    (await request(`/reservations/${record.id}/cancel`, { method: 'PATCH' })).status,
    200,
  );
  const second = await request('/reservations', { body });
  assert.equal(second.status, 201);
  const replacement = await second.json();
  assert.equal(
    (
      await request(`/admin/reservations/${replacement.id}`, {
        cookie: admin,
        method: 'PATCH',
        body: { status: 'Seated', expectedStatus: 'Confirmed' },
      })
    ).status,
    200,
  );
  assert.equal(
    (await request(`/reservations/${replacement.id}/cancel`, { method: 'PATCH' })).status,
    409,
  );
});
test('malformed JSON and invalid contact email produce controlled client errors', async () => {
  const broken = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{',
  });
  assert.equal(broken.status, 400);
  assert.equal(
    (await request('/messages', { body: { name: 'Test', email: 'invalid', message: 'Hello' } }))
      .status,
    400,
  );
  const response = await request('/messages', {
    body: { name: 'Test', email: 'test@example.com', message: 'Hello' },
  });
  assert.equal(response.status, 201);
  assert.match((await response.json()).message, /No email was sent/);
});
test('rate limiter stops repeated attempts and returns retry guidance', () => {
  const middleware = rateLimit({ limit: 2 });
  let passed = 0,
    status;
  const response = {
    set() {},
    status(code) {
      status = code;
      return this;
    },
    json() {},
  };
  for (let i = 0; i < 3; i++) middleware({ ip: 'test-client' }, response, () => passed++);
  assert.equal(passed, 2);
  assert.equal(status, 429);
});

test('marketplace isolates restaurant workspaces, validates pricing and moderates listings', async () => {
  assert.equal((await request('/partner', { cookie: null })).status, 401);
  assert.equal((await request('/partner/orders')).status, 404);
  const first = await register();
  const second = await register();
  const details = {
    name: 'Test Kitchen A',
    cuisine: 'Indian',
    city: 'Bengaluru',
    area: 'Indiranagar',
    address: '12 Test Street',
    phone: '9876543210',
    description: 'Fresh test meals',
    imageKey: 'paneer',
    deliveryFee: 35,
    minOrder: 300,
    etaMin: 20,
    etaMax: 35,
    acceptingOrders: true,
  };
  const dishDetails = {
    name: 'Test Curry',
    description: 'Paneer with rice',
    category: 'Main Course',
    price: 200,
    imageKey: 'paneer',
    veg: true,
    available: true,
  };
  const firstResult = await request('/partner', {
    cookie: first.cookie,
    body: { ...details, ownerId: second.user.id, status: 'published', role: 'admin' },
  });
  assert.equal(firstResult.status, 201);
  const a = await firstResult.json();
  assert.equal(a.ownerId, first.user.id);
  assert.equal(a.status, 'draft');
  assert.equal(a.acceptingOrders, false);
  assert.equal((await request('/partner', { cookie: first.cookie, body: details })).status, 409);
  assert.equal(
    (await request('/partner/publish', { cookie: first.cookie, method: 'POST' })).status,
    409,
  );
  assert.equal((await request(`/restaurants/${a.id}`, { cookie: null })).status, 404);
  const b = await (
    await request('/partner', { cookie: second.cookie, body: { ...details, name: 'Kitchen B' } })
  ).json();
  assert.equal(
    (await request('/partner/menu', { cookie: first.cookie, body: { ...dishDetails, price: -1 } }))
      .status,
    400,
  );
  const added = await request('/partner/menu', {
    cookie: first.cookie,
    body: { ...dishDetails, restaurantId: b.id },
  });
  assert.equal(added.status, 201);
  const dish = await added.json();
  assert.equal(dish.restaurantId, a.id);
  assert.equal(
    (
      await request(`/partner/menu/${dish.id}`, {
        cookie: second.cookie,
        method: 'PATCH',
        body: dishDetails,
      })
    ).status,
    404,
  );
  assert.equal(
    (await (await request('/menu', { cookie: null })).json()).some((item) => item.id === dish.id),
    false,
  );
  assert.equal(
    (await request('/partner/publish', { cookie: first.cookie, method: 'POST' })).status,
    200,
  );
  const orderBody = {
    ...validOrder,
    restaurantId: a.id,
    items: [
      {
        dishId: dish.id,
        size: 'regular',
        extras: [],
        quantity: 2,
        dish: { price: 1 },
        unitPrice: 1,
      },
    ],
    totals: { total: 1 },
  };
  assert.equal((await request('/orders', { body: orderBody })).status, 409);
  assert.equal(
    (
      await request('/partner', {
        cookie: first.cookie,
        method: 'PATCH',
        body: { ...details, status: 'suspended', ownerId: second.user.id },
      })
    ).status,
    200,
  );
  const overview = await (await request('/partner', { cookie: first.cookie })).json();
  assert.equal(overview.restaurant.status, 'published');
  assert.equal(overview.restaurant.ownerId, first.user.id);
  assert.equal((await request('/admin/restaurants', { cookie: first.cookie })).status, 403);
  const publicData = await (await request(`/restaurants/${a.id}`, { cookie: null })).json();
  assert.equal(publicData.restaurant.ownerId, undefined);
  assert.equal(publicData.restaurant.phone, undefined);
  assert.equal(publicData.menu[0].price, 200);
  assert.equal(
    (
      await request('/orders', {
        body: { ...orderBody, items: [...orderBody.items, validOrder.items[0]] },
      })
    ).status,
    409,
  );
  assert.equal(
    (await request('/orders', { body: { ...orderBody, restaurantId: b.id } })).status,
    400,
  );
  assert.equal(
    (
      await request('/orders', {
        body: { ...orderBody, items: [{ ...orderBody.items[0], quantity: 1 }] },
      })
    ).status,
    400,
  );
  const placedResponse = await request('/orders', { body: orderBody });
  assert.equal(placedResponse.status, 201);
  const placed = await placedResponse.json();
  assert.deepEqual(placed.totals, { subtotal: 400, delivery: 35, tax: 22, total: 457 });
  assert.equal(placed.restaurantId, a.id);
  assert.equal(placed.items[0].unitPrice, 200);
  assert.equal(placed.items[0].dish.price, 200);
  assert.equal((await request(`/orders/${placed.id}`, { cookie: second.cookie })).status, 404);
  assert.deepEqual(
    (await (await request('/partner/orders', { cookie: first.cookie })).json()).map(
      (item) => item.id,
    ),
    [placed.id],
  );
  assert.deepEqual(await (await request('/partner/orders', { cookie: second.cookie })).json(), []);
  assert.equal(
    (
      await request(`/partner/orders/${placed.id}`, {
        cookie: second.cookie,
        method: 'PATCH',
        body: { status: 'Preparing', expectedStatus: 'Placed' },
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await request(`/partner/orders/${placed.id}`, {
        cookie: first.cookie,
        method: 'PATCH',
        body: { status: 'Preparing', expectedStatus: 'Placed' },
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request(`/partner/orders/${placed.id}`, {
        cookie: first.cookie,
        method: 'PATCH',
        body: { status: 'Cancelled', expectedStatus: 'Placed' },
      })
    ).status,
    409,
  );
  for (const [expectedStatus, status] of [
    ['Preparing', 'Out for delivery'],
    ['Out for delivery', 'Delivered'],
  ]) {
    assert.equal(
      (
        await request(`/partner/orders/${placed.id}`, {
          cookie: first.cookie,
          method: 'PATCH',
          body: { status, expectedStatus },
        })
      ).status,
      200,
    );
  }
  assert.equal((await (await request(`/orders/${placed.id}`)).json()).status, 'Delivered');
  const emptyReview = await (await request(`/orders/${placed.id}/review`)).json();
  assert.equal(emptyReview.eligible, true);
  assert.equal(emptyReview.review, null);
  assert.equal((await request(`/orders/${placed.id}/review`, { cookie: other })).status, 404);
  assert.equal(
    (
      await request(`/orders/${placed.id}/review`, {
        method: 'PUT',
        body: { rating: 6, comment: 'This should not be accepted.' },
      })
    ).status,
    400,
  );
  const reviewResponse = await request(`/orders/${placed.id}/review`, {
    method: 'PUT',
    body: { rating: 5, comment: 'Fresh, warm and packed with care.' },
  });
  assert.equal(reviewResponse.status, 201);
  const review = await reviewResponse.json();
  assert.equal(review.author, 'Test G.');
  assert.equal(review.verifiedOrder, true);
  const editedReview = await request(`/orders/${placed.id}/review`, {
    method: 'PUT',
    body: { rating: 4, comment: 'Fresh food and a very smooth pickup experience.' },
  });
  assert.equal(editedReview.status, 200);
  assert.equal((await editedReview.json()).id, review.id);
  const publicReviews = await (await request(`/restaurants/${a.id}`, { cookie: null })).json();
  assert.deepEqual(publicReviews.reviewSummary, { count: 1, rating: 4 });
  assert.equal(publicReviews.reviews[0].orderId, undefined);
  assert.equal(
    (await (await request('/restaurants', { cookie: null })).json()).find(
      (restaurant) => restaurant.id === a.id,
    ).reviewSummary.rating,
    4,
  );
  assert.equal(
    (await (await request('/partner/reviews', { cookie: first.cookie })).json()).reviews.length,
    1,
  );
  assert.equal((await request('/admin/reviews', { cookie: other })).status, 403);
  assert.equal(
    (
      await request(`/admin/reviews/${review.id}`, {
        cookie: admin,
        method: 'PATCH',
        body: { status: 'hidden', expectedStatus: 'published' },
      })
    ).status,
    200,
  );
  const hiddenPublic = await (await request(`/restaurants/${a.id}`, { cookie: null })).json();
  assert.deepEqual(hiddenPublic.reviewSummary, { count: 0, rating: null });
  assert.equal(hiddenPublic.reviews.length, 0);
  assert.equal(
    (
      await request(`/admin/reviews/${review.id}`, {
        cookie: admin,
        method: 'PATCH',
        body: { status: 'published', expectedStatus: 'hidden' },
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request(`/admin/restaurants/${a.id}`, {
        cookie: admin,
        method: 'PATCH',
        body: { status: 'suspended', expectedStatus: 'published' },
      })
    ).status,
    200,
  );
  assert.equal((await request(`/restaurants/${a.id}`, { cookie: null })).status, 404);
  assert.equal(
    (await (await request('/menu', { cookie: null })).json()).some((item) => item.id === dish.id),
    false,
  );
  assert.equal((await request('/orders', { body: orderBody })).status, 400);
  assert.equal(
    (await request('/partner/publish', { cookie: first.cookie, method: 'POST' })).status,
    403,
  );
  assert.equal(
    (await request('/partner/menu', { cookie: first.cookie, body: dishDetails })).status,
    403,
  );
  assert.equal(
    (
      await request(`/admin/restaurants/${a.id}`, {
        cookie: admin,
        method: 'PATCH',
        body: { status: 'published', expectedStatus: 'draft' },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request(`/admin/restaurants/${a.id}`, {
        cookie: admin,
        method: 'PATCH',
        body: { status: 'published', expectedStatus: 'suspended' },
      })
    ).status,
    200,
  );
  assert.equal((await request(`/restaurants/${a.id}`, { cookie: null })).status, 200);
  assert.equal(
    (
      await request(`/partner/menu/${dish.id}`, {
        cookie: first.cookie,
        method: 'PATCH',
        body: { ...dishDetails, price: 250 },
      })
    ).status,
    200,
  );
  assert.equal((await (await request(`/orders/${placed.id}`)).json()).items[0].unitPrice, 200);
});

test('every demo cuisine and food category has six dishes and new demo meals can be ordered', async () => {
  const { cuisineOptions } = await import('../../shared/restaurants.js');
  const { categories } = await import('../../shared/menu.js');
  const venues = await (await request('/restaurants', { cookie: null })).json();
  const catalog = await (await request('/menu', { cookie: null })).json();
  assert.equal(new Set(catalog.map((dish) => dish.id)).size, catalog.length);
  for (const cuisine of cuisineOptions) {
    const ids = venues
      .filter((venue) => venue.demo && venue.cuisine === cuisine)
      .map((venue) => venue.id);
    assert.ok(ids.length > 0, `${cuisine} has a discoverable demo restaurant`);
    assert.ok(
      catalog.filter((dish) => ids.includes(dish.restaurantId)).length >= 6,
      `${cuisine} has six dishes`,
    );
    for (const id of ids) {
      const detail = await request(`/restaurants/${id}`, { cookie: null });
      assert.equal(detail.status, 200);
      assert.ok((await detail.json()).menu.length >= 6);
    }
  }
  for (const category of categories.slice(1))
    assert.ok(
      catalog.filter((dish) => dish.demo && dish.category === category).length >= 6,
      `${category} has six dishes`,
    );
  const placed = await order({
    ...validOrder,
    restaurantId: 'demo-spice-courtyard',
    items: [{ dishId: 'demo-paneer-butter-masala', quantity: 1, size: 'regular', extras: [] }],
  });
  assert.equal(placed.restaurantId, 'demo-spice-courtyard');
  assert.equal(placed.restaurantName, 'Spice Courtyard');
  assert.equal(placed.items[0].unitPrice, 289);
  assert.deepEqual(placed.totals, { subtotal: 289, delivery: 35, tax: 16, total: 340 });
});

test('photo uploads validate bytes, enforce ownership, and persist through restaurant and menu saves', async () => {
  const owner = await register();
  const stranger = await register();
  const png = await sharp({
    create: { width: 2048, height: 1024, channels: 3, background: '#ee6633' },
  })
    .png()
    .withMetadata()
    .toBuffer();
  const upload = (body = png, { cookie = owner.cookie, type = 'image/png', origin } = {}) =>
    fetch(`${baseUrl}/api/partner/photos`, {
      method: 'POST',
      body,
      headers: {
        'Content-Type': type,
        'X-Requested-With': 'MenuMate',
        ...(cookie ? { Cookie: cookie } : {}),
        ...(origin ? { Origin: origin } : {}),
      },
    });
  assert.equal((await upload(png, { cookie: null })).status, 401);
  assert.equal((await upload(png, { origin: 'https://untrusted.example' })).status, 403);
  assert.equal(
    (await upload(Buffer.from('<svg onload="alert(1)"></svg>'), { type: 'image/svg+xml' })).status,
    415,
  );
  assert.equal((await upload(Buffer.from('<script>bad</script>'))).status, 415);
  assert.equal((await upload(Buffer.from([255, 216, 255, 0, 0]))).status, 400);
  assert.equal((await upload(Buffer.alloc(5 * 1024 * 1024 + 1))).status, 413);
  const response = await upload();
  assert.equal(response.status, 201);
  const photo = await response.json();
  assert.match(photo.image, /^\/api\/photos\/[a-f0-9]{64}\/[a-f0-9-]+\.webp$/);
  assert.equal(photo.width, 1600);
  assert.equal(photo.height, 800);
  const publicImage = await fetch(`${baseUrl}${photo.image}`);
  assert.equal(publicImage.status, 200);
  assert.match(publicImage.headers.get('content-type'), /image\/webp/);
  assert.match(publicImage.headers.get('cache-control'), /immutable/);
  assert.equal(publicImage.headers.get('x-content-type-options'), 'nosniff');
  const metadata = await sharp(Buffer.from(await publicImage.arrayBuffer())).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.exif, undefined);
  const details = {
    name: 'Photo Kitchen',
    cuisine: 'Indian',
    city: 'Delhi',
    area: 'Saket',
    address: '10 Test Road',
    phone: '9876543210',
    description: 'Fresh meals',
    image: photo.image,
    deliveryFee: 30,
    minOrder: 0,
    etaMin: 20,
    etaMax: 30,
    acceptingOrders: false,
  };
  assert.equal((await request('/partner', { cookie: stranger.cookie, body: details })).status, 403);
  assert.equal(
    (
      await request('/partner', {
        cookie: owner.cookie,
        body: { ...details, image: '/api/photos/../../secret' },
      })
    ).status,
    403,
  );
  const created = await request('/partner', { cookie: owner.cookie, body: details });
  assert.equal(created.status, 201);
  assert.equal((await created.json()).image, photo.image);
  const dishDetails = {
    name: 'Fresh Bowl',
    description: 'Rice and greens',
    category: 'Main Course',
    price: 200,
    veg: true,
    available: true,
    image: photo.image,
  };
  const added = await request('/partner/menu', { cookie: owner.cookie, body: dishDetails });
  assert.equal(added.status, 201);
  const dish = await added.json();
  assert.equal(dish.image, photo.image);
  const updated = await request(`/partner/menu/${dish.id}`, {
    cookie: owner.cookie,
    method: 'PATCH',
    body: { ...dishDetails, available: false },
  });
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).image, photo.image);
  const jpeg = await sharp(png).jpeg().toBuffer();
  const replacement = await (await upload(jpeg, { type: 'image/jpeg' })).json();
  assert.notEqual(replacement.image, photo.image);
  const changed = await request('/partner', {
    cookie: owner.cookie,
    method: 'PATCH',
    body: { ...details, image: replacement.image },
  });
  assert.equal(changed.status, 200);
  const overview = await (await request('/partner', { cookie: owner.cookie })).json();
  assert.equal(overview.restaurant.image, replacement.image);
  assert.equal(overview.menu[0].image, photo.image);
  const library = await request(`/partner/menu/${dish.id}`, {
    cookie: owner.cookie,
    method: 'PATCH',
    body: { ...dishDetails, image: '', imageKey: 'pizza' },
  });
  assert.equal((await library.json()).image, '/images/design/pizza.jpg');
  assert.equal((await fetch(`${baseUrl}${photo.image}`)).status, 200);
  assert.equal((await fetch(`${baseUrl}/api/photos/not-an-owner/not-a-photo`)).status, 404);
});

test('Razorpay verifies capture, deduplicates checkout/webhooks, and refunds cancelled orders safely', async () => {
  const buyer = await register();
  const payload = { ...validOrder, idempotencyKey: randomUUID(), total: 1 };
  assert.equal(
    (await request('/payments/checkout', { cookie: buyer.cookie, body: payload })).status,
    503,
  );
  assert.equal((await (await request('/payments/config')).json()).enabled, false);
  const realFetch = globalThis.fetch;
  const gatewayOrders = new Map();
  const paymentEntities = new Map();
  const refundEntities = new Map();
  const refundKeys = [];
  let creates = 0;
  let loseRefundResponse = true;
  env.razorpayKeyId = 'rzp_test_fixture';
  env.razorpayKeySecret = 'fixture-only-payment-secret';
  env.razorpayWebhookSecret = 'fixture-only-webhook-secret';
  const signature = (value, secret = env.razorpayKeySecret) =>
    createHmac('sha256', secret).update(value).digest('hex');
  const json = (value) =>
    new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
  globalThis.fetch = async (url, options = {}) => {
    if (!String(url).startsWith('https://api.razorpay.com/')) return realFetch(url, options);
    const path = new URL(url).pathname.replace('/v1', '');
    if (path === '/orders' && options.method === 'POST') {
      const body = JSON.parse(options.body);
      const order = { ...body, id: `order_fixture${++creates}`, status: 'created' };
      gatewayOrders.set(order.id, order);
      return json(order);
    }
    if (/^\/orders\/[^/]+\/payments$/.test(path))
      return json({
        items: [...paymentEntities.values()].filter((p) => p.order_id === path.split('/')[2]),
      });
    if (/^\/payments\/[^/]+$/.test(path)) return json(paymentEntities.get(path.split('/')[2]));
    if (/^\/payments\/[^/]+\/refund$/.test(path)) {
      const key = options.headers['X-Refund-Idempotency'];
      assert.ok(key);
      refundKeys.push(key);
      if (!refundEntities.has(key))
        refundEntities.set(key, {
          id: 'rfnd_fixture1',
          payment_id: path.split('/')[2],
          amount: JSON.parse(options.body).amount,
          status: 'pending',
        });
      if (loseRefundResponse) {
        loseRefundResponse = false;
        throw new Error('Simulated response loss after refund accepted');
      }
      return json(refundEntities.get(key));
    }
    if (path === '/refunds/rfnd_fixture1') return json([...refundEntities.values()][0]);
    throw new Error(`Unexpected mocked Razorpay request ${path}`);
  };
  try {
    assert.equal(
      (await request('/payments/checkout', { cookie: null, body: payload })).status,
      401,
    );
    assert.equal(
      (
        await request('/payments/checkout', {
          cookie: buyer.cookie,
          body: { ...payload, items: [null] },
        })
      ).status,
      400,
    );
    const response = await request('/payments/checkout', { cookie: buyer.cookie, body: payload });
    assert.equal(response.status, 201);
    const session = await response.json();
    assert.equal(session.amount, 116300); // Server-priced 2 large chicken + sauce, delivery and tax.
    assert.equal(session.currency, 'INR');
    assert.equal(session.orderId, undefined);
    assert.equal((await (await request('/orders', { cookie: buyer.cookie })).json()).length, 0);
    const repeats = await Promise.all(
      [1, 2].map(() => request('/payments/checkout', { cookie: buyer.cookie, body: payload })),
    );
    assert.ok(repeats.every((response) => response.status === 200));
    assert.equal(creates, 1);
    assert.equal(
      (
        await request('/payments/checkout', {
          cookie: buyer.cookie,
          body: { ...payload, notes: 'changed' },
        })
      ).status,
      409,
    );
    assert.equal(
      (await request(`/payments/checkout/${session.id}`, { cookie: other })).status,
      404,
    );
    const payment = {
      id: 'pay_fixture1',
      order_id: session.gatewayOrderId,
      amount: session.amount,
      currency: 'INR',
      status: 'authorized',
      captured: false,
    };
    paymentEntities.set(payment.id, payment);
    const verification = {
      razorpay_order_id: session.gatewayOrderId,
      razorpay_payment_id: payment.id,
      razorpay_signature: signature(`${session.gatewayOrderId}|${payment.id}`),
    };
    const verify = (body = verification) =>
      request(`/payments/checkout/${session.id}/verify`, { cookie: buyer.cookie, body });
    assert.equal(
      (await verify({ ...verification, razorpay_signature: '0'.repeat(64) })).status,
      400,
    );
    assert.equal((await verify()).status, 409);
    payment.status = 'captured';
    payment.captured = true;
    payment.amount = 1;
    assert.equal((await verify()).status, 409);
    payment.amount = session.amount;
    const verified = await (await verify()).json();
    assert.ok(verified.orderId);
    assert.equal((await verify()).status, 200);
    const orders = await (await request('/orders', { cookie: buyer.cookie })).json();
    assert.equal(orders.length, 1);
    assert.equal(orders[0].paymentDetails.state, 'captured');
    assert.equal(orders[0].totals.total * 100, session.amount);
    const event = { event: 'payment.captured', payload: { payment: { entity: payment } } };
    const webhook = (event, sig) =>
      realFetch(`${baseUrl}/api/payments/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Razorpay-Signature':
            sig || signature(JSON.stringify(event), env.razorpayWebhookSecret),
        },
        body: JSON.stringify(event),
      });
    assert.equal((await webhook(event, 'invalid')).status, 400);
    assert.equal((await webhook(event)).status, 200);
    assert.equal((await webhook(event)).status, 200);
    assert.equal(
      (
        await request(`/admin/orders/${verified.orderId}/refund`, {
          cookie: buyer.cookie,
          method: 'POST',
        })
      ).status,
      403,
    );
    assert.equal(
      (await request(`/admin/orders/${verified.orderId}/refund`, { cookie: admin, method: 'POST' }))
        .status,
      409,
    );
    assert.equal(
      (
        await request(`/orders/${verified.orderId}/cancel`, {
          cookie: buyer.cookie,
          method: 'PATCH',
        })
      ).status,
      200,
    );
    const refund = () =>
      request(`/admin/orders/${verified.orderId}/refund`, { cookie: admin, method: 'POST' });
    assert.equal((await refund()).status, 503);
    assert.equal((await refund()).status, 200);
    assert.equal(refundEntities.size, 1);
    assert.equal(refundKeys[0], refundKeys[1]);
    [...refundEntities.values()][0].status = 'processed';
    const refunded = await (await refund()).json();
    assert.equal(refunded.status, 'refunded');
    assert.equal((await refund()).status, 200);
    assert.equal(refundKeys.length, 2); // Retries of saved refunds only fetch their status.
    const finalOrder = await (
      await request(`/orders/${verified.orderId}`, { cookie: buyer.cookie })
    ).json();
    assert.equal(finalOrder.status, 'Cancelled');
    assert.equal(finalOrder.paymentDetails.state, 'refunded');
    assert.equal((await webhook(event)).status, 200); // Late captured event cannot undo a refund.
    assert.equal(
      (await (await request(`/orders/${verified.orderId}`, { cookie: buyer.cookie })).json())
        .paymentDetails.state,
      'refunded',
    );
    const nextSession = await (
      await request('/payments/checkout', {
        cookie: buyer.cookie,
        body: { ...payload, idempotencyKey: randomUUID() },
      })
    ).json();
    const recoveredPayment = {
      ...payment,
      id: 'pay_fixture2',
      order_id: nextSession.gatewayOrderId,
    };
    paymentEntities.set(recoveredPayment.id, recoveredPayment);
    const recoveryEvent = {
      event: 'payment.captured',
      payload: { payment: { entity: recoveredPayment } },
    };
    assert.equal((await webhook(recoveryEvent)).status, 200); // No browser verification callback.
    const recovered = await (
      await request(`/payments/checkout/${nextSession.id}`, { cookie: buyer.cookie })
    ).json();
    assert.ok(recovered.orderId);
    assert.equal((await (await request('/orders', { cookie: buyer.cookie })).json()).length, 2);
    env.razorpayKeyId = 'rzp_live_not_allowed';
    assert.equal((await (await request('/payments/config')).json()).enabled, false);
  } finally {
    globalThis.fetch = realFetch;
    env.razorpayKeyId = '';
    env.razorpayKeySecret = '';
    env.razorpayWebhookSecret = '';
  }
});
