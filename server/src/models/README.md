# Database models

- `User.js`: customer/owner identity, salted password hash, and session revocation version.
- `Session.js`: hashed session token, account reference/version, and expiry with a MongoDB TTL index.
- `MenuAvailability.js`: persisted overrides in `menu_availability` for the shared menu catalog.
- `Record.js`: shared schema with separate `orders`, `reservations`, and `messages` collections. Orders/reservations
  belong to an authenticated account ID. Guest contact messages use a hashed browser token.

Controllers validate input, calculate authoritative prices, and check authorization.
Status updates use a conditional write against the previous status to reject conflicting
changes. Records include actor/timestamp history for order and reservation status changes.

Services select MongoDB when connected, or durable local development storage when no URI
is configured. Database failures never silently fall back. Production requires MongoDB;
payment and restaurant operation integrations are still required before enabling demo
transaction endpoints in production.
