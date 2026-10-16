import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { randomUUID } from 'node:crypto';
process.env.NODE_ENV = 'test';
const mongoTestUri = process.env.MENUMATE_TEST_MONGODB_URI;
if (
  mongoTestUri &&
  !/^mongodb:\/\/127\.0\.0\.1:27017\/menumate_test_[a-f0-9]{32}$/.test(mongoTestUri)
)
  throw new Error('Refusing non-isolated MongoDB test target');
process.env.MONGODB_URI = mongoTestUri || ''; // Never read the developer database.
const { default: mongoose } = await import('mongoose');
const { connectDatabase } = await import('../src/config/db.js');
const { default: app } = await import('../src/app.js');
const { findUser, updateUser } = await import('../src/services/accounts.js');
const { rateLimit } = await import('../src/middleware/rateLimit.js');
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
    assert.match(mongoose.connection.name, /^menumate_test_[a-f0-9]{32}$/);
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
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
  assert.deepEqual(await (await request('/health', { cookie: null })).json(), {
    status: 'ok',
    database: mongoTestUri ? 'connected' : 'disconnected',
  });
  const catalog = await (await request('/menu', { cookie: null })).json();
  assert.equal(catalog.length, 8);
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
