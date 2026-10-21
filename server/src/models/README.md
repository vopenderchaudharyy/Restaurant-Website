# Database models

- `User.js`: customer/owner identity, salted password hash, and session revocation version.
- `Session.js`: hashed session token, account reference/version, and expiry with a MongoDB TTL index.
- `PasswordReset.js`: single-use hashed recovery token with an account index and 30-minute TTL.
- `Restaurant.js`: one workspace per owner, listing status, city, delivery settings and availability.
- `MenuItem.js`: restaurant-owned dishes, prices, images and availability.
- `MenuAvailability.js`: persisted overrides in `menu_availability` for the shared menu catalog.
- `PaymentAttempt.js`: durable Razorpay test checkout snapshots, gateway identifiers, verification
  and refund state in `payment_attempts`. Unique attempt/order identifiers make retries idempotent.
- `Record.js`: shared schema with separate `orders`, `reservations`, `messages`, and `reviews` collections. Orders/reservations
  belong to an authenticated account ID. Marketplace orders also carry `restaurantId` with an index for owner queries. Guest contact messages use a hashed browser token.
  Reviews are tied to completed orders and expose an abbreviated customer name publicly.
- `system_migrations`: idempotent deployment markers. The first Atlas correction copies only known
  MenuMate collections from the previous default database without replacing target records.

Controllers validate input, calculate authoritative prices, and check authorization.
Status updates use a conditional write against the previous status to reject conflicting
changes. Records include actor/timestamp history for order and reservation status changes.

Services select MongoDB when connected, or durable local development storage when no URI
is configured. Database failures never silently fall back. Production requires MongoDB.
Razorpay checkout is deliberately limited to Test Mode; live payments and restaurant delivery
operations must be connected before real commerce is enabled.

Restaurant and menu `image` fields store either a library path or an owned `/api/photos/...` URL.
Uploaded image bytes live on persistent disk (`server/.uploads/` or `MENUMATE_UPLOAD_DIR`), not in
MongoDB. Include that directory in deployment backups; see the photo storage notes in the root README.
