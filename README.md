# MenuMate

Multi-restaurant marketplace organized as a MERN project: MongoDB, Express, React, and Node.js.
The responsive React UI expands the supplied storyboard into a contemporary food experience: bold typography, warm neutral surfaces, orange and sage accents, locally hosted photography/fonts, and connected customer/owner workflows.
The previous static website is preserved unchanged in `legacy/`.

## Requirements

- Node.js 24.12.0 or newer (the setup version is in `.nvmrc`).
- npm, included with Node.js.
- MongoDB for production; local development also supports durable file storage.

## Run locally

From the repository root:

```sh
npm install
```

Copy `client/.env.example` to `client/.env` and `server/.env.example` to `server/.env`.
These local files have already been created during initial setup and are ignored by Git.
Start the project-local MongoDB server, then both applications:

```sh
npm run db:start
npm run dev
```

- Frontend: http://127.0.0.1:5173
- API health: http://127.0.0.1:5000/api/health
- Vite forwards `/api` requests to Express in development.
- Stop both processes with Ctrl+C.
- On PowerShell, use `npm.cmd` instead of `npm` if execution policy blocks `npm.ps1`.

## Structure

```text
client/
  public/images/         Original assets and new food/restaurant photography
  public/fonts/          Locally hosted fonts and their licenses
  src/
    components/layout/   Shared navigation and page layout
    pages/               Customer, checkout, reservation, account, and admin screens
    context/             Account sessions, browser cart/favourites, and notifications
    hooks/               Abortable API data loading
    services/            Shared API request helper
    styles/              Layout primitives plus the contemporary experience.css theme
    test/                Menu, cart, checkout, reservation, and account interaction tests
    App.jsx              Frontend routes
    main.jsx             React entry point
  vite.config.js         React tooling and development API proxy
server/
  src/
    config/              Environment validation and MongoDB connection
    controllers/         HTTP request handlers
    middleware/          Authentication, role checks, CSRF, rate limits, and errors
    models/              Mongoose accounts, sessions, availability, and restaurant records
    services/            MongoDB storage with a durable development file fallback
    routes/              API route definitions
    app.js               Express application, importable by tests
    server.js            Startup and graceful shutdown
  test/                  API authorization, workflow, pricing, and persistence tests
shared/                  Shared menu catalog and pricing calculations
legacy/                  Original HTML, CSS, JavaScript, images, and README
package.json             npm workspaces and shared commands
package-lock.json        Locked dependency versions for both applications
eslint.config.js         JavaScript and React lint configuration
```

Legacy images are retained in the archive and copied into `client/public/images/`
so the original website remains intact while React can reuse them. New assets should
go in the client; the archive is for reference only. To preview the old site, run
`python -m http.server 8000 --bind 127.0.0.1 --directory legacy` from the root.

## MongoDB

The local project is configured with this connection in `server/.env`:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/restuarantwebsite
```

`restuarantwebsite` is the **database** name (retaining the supplied spelling).
It contains `users`, `sessions`, `orders`, `reservations`, `messages`, and
`menu_availability`, `restaurants`, and `menu_items`. Required unique and expiry indexes are initialized before the API
starts accepting requests. In MongoDB Compass, connect to the URI above and open this database.

MongoDB Community 8.2.12 is installed locally in `.tools/mongodb/` from the
[official MongoDB Windows archive](https://www.mongodb.com/try/download/community-edition/releases).
`npm run db:start` starts it hidden, bound to `127.0.0.1:27017`, with data/logs in
`server/.mongodb/`. It reuses an already running local instance. The process remains running
after the app stops; run the same command after a PC restart. These local runtime folders are
ignored by Git. This localhost setup has no database authentication and is for development;
use an authenticated database for deployment.

On another machine, install MongoDB Community, or extract its official Windows zip under
`.tools/mongodb/`. The helper detects `C:/Program Files/MongoDB/Server/*/bin/mongod.exe` too;
`MONGOD_PATH` can point to another installed executable. The server binary is not committed.

The existing local account, session, and order were copied to MongoDB. To copy additional
file-store data later, stop the API and run `npm run db:migrate`, then restart it. Migration
copies missing IDs, preserves existing MongoDB documents, and leaves the source file intact;
conflicting email identities stop migration. Do not edit the file store after switching to MongoDB.

For Atlas, use your own connection string in that file. Never put database credentials
in client environment variables. MongoDB itself must be running separately; installing
Mongoose does not install the database service.

A blank URI uses `server/.data/store.json` for accounts, sessions, orders, reservations,
messages, and menu availability. Data survives API restarts and source edits. This
folder is ignored by Git; keep it private and back it up if you need the development data.
The file store is intended for a single local machine, with a lock protecting concurrent
writes from the API and owner setup command. `MENUMATE_DATA_DIR` can override its location
for isolated development/testing. If a process crashes leaving `store.lock`, stop the API
and any owner setup process before removing only that stale lock file.

A supplied MongoDB URI must connect successfully before the server starts. Production
requires MongoDB and never silently falls back to local files. Local data is not migrated
automatically when switching to MongoDB. `/api/health` reports API/database state.
Cart and favourites remain browser-local; profile and private history belong to an account.

## Accounts and owner setup

1. Open `/register` and create your account with a password of 12-128 characters.
2. From the repository root, explicitly promote your registered email:

   ```sh
   npm run admin:promote --workspace server -- your-email@example.com
   ```

3. Sign in again at `/login`, then open `/admin`. Promotion revokes existing sessions.

New registrations are always customers. There is no default owner or shared password,
and no browser API to assign roles. The command uses the same configured database or
local data directory as the API.

Sessions expire after seven days and use HttpOnly cookies (Secure in production).
Passwords use salted scrypt hashes; raw passwords and session tokens are not stored.
Changing a password requires the current password and revokes other sessions. Mutation
requests use an origin check and custom request header; authentication endpoints are
rate limited per IP. Password recovery and email verification are not implemented.

## Implemented screens and flows

- `/`: restaurant discovery, city/cuisine search, and restaurant partner onboarding.
- `/restaurants`, `/restaurants/:id`: filters, saved places, delivery costs, and restaurant menus.
- `/partner`: register a restaurant, build/edit its menu, publish, pause orders, and manage its orders.
- `/platform/restaurants`: platform administrators can suspend and restore restaurant listings.
- `/menu`: category tabs, search, vegetarian filtering, price sorting, favourites,
  and sold-out dishes.
- `/menu/:id`: portion sizes, add-ons, quantities, and related dishes.
- `/cart`, `/checkout`, `/payment`: persistent cart, sign-in requirement for checkout,
  fulfillment/address details, server-calculated totals, simulated payments, and errors.
- `/orders/:id/confirmation`, `/orders/:id/tracking`: private confirmation and status
  timeline; tracking checks the server every 15 seconds for owner updates.
- `/booking`, `/reservations/:id`: sign-in on submission, date validation, guest/occasion
  details, confirmation, and a demo `.ics` calendar download for confirmed bookings.
- `/about`, `/contact`: marketplace story, sample support details, and a demo message form.
- `/login`, `/register`: customer authentication and return to the requested page.
- `/account`, `/account/security`: saved name/phone and password changes.
- `/account/orders`, `/account/reservations`, `/account/favorites`: private history,
  reorder, cancellation, and browser-local favourites.
- `/admin`: platform-admin-only dashboard with actual order totals, a seven-day order chart,
  searchable/filterable orders, pagination, status controls, reservations, and dish availability.
  Order/reservation lists refresh every 30 seconds.

Customers can cancel orders while `Placed` and future reservations while `Confirmed`.
Owners can move delivery orders through `Preparing`, `Out for delivery`, and `Delivered`;
pickup/dine-in orders use `Ready` and `Collected`. Reservations support seating, completion,
cancellation, and no-show states. Invalid transitions and stale updates are rejected.
Status history records the acting account and timestamp. Customers can access only their
own records; owner access is checked by the API as well as the UI.

## Restaurant marketplace

Each account can create one restaurant workspace at `/partner`. Multiple owners can register
independently; restaurant ownership is recorded by `ownerId` and never grants global admin
access. The explicit admin promotion command is for trusted platform administrators only.

1. Sign up or sign in, then choose **Partner with us**.
2. Add restaurant name, city, address, cuisine, delivery fee, minimum order, and estimated minutes.
3. Add at least one available menu item, then **Publish restaurant**.
4. In **Restaurant** settings, enable **Accept new orders** when ready.
5. Customers discover the listing at `/restaurants`. The **Orders** tab refreshes every 15 seconds;
   owners update preparation, delivery/collection, or cancellation status there.

Drafts and suspended listings are hidden. A platform administrator can suspend/restore partner
listings; an owner cannot remove their own suspension. Server ownership checks apply to menu
editing and order reads/updates. A restaurant cannot view another restaurant's customer details.

Bags contain dishes from one restaurant. Changing restaurants requires explicit confirmation;
checkout uses that restaurant's delivery fee, minimum order, address, and estimate. The server
rechecks current availability and computes prices independently of client values. Order snapshots
preserve the original dishes, prices, and restaurant details after subsequent menu changes.

Eight labelled demo restaurants cover all discovery cuisines with 52 dishes total: six per cuisine, eight for Italian and eight for Global. Every food category also has at least six dishes. These examples are versioned in `shared/demoMenu.js` and `shared/restaurants.js`, and share the existing MongoDB availability overrides; registered partner records are not overwritten. Discovery shows matching food cards below restaurant listings. Example photos are explicitly illustrative.

The original MenuMate Kitchen is a labelled demo listing, not a registered partner. Its sample
menu/ratings remain available; new restaurants have no invented ratings or reviews. Saved
places/favourite dishes are browser-local. Partners can upload their own food/cover photos or choose
the placeholder library. Portions and add-ons use platform-wide options. Reservations currently apply only to
the demo kitchen. Owner estimates are not geocoded delivery zones or live rider tracking.

Discovery focuses on city/cuisine matching, upfront fees, visible availability, and an easy return
to saved places. Short card entrances, hover feedback, loading skeletons, page/section reveals,
and modal transitions support those flows; reduced-motion preferences suppress movement.
Browser visual/focus checks still require manual review because no browser surface was available.

## Demo boundaries

Razorpay test checkout and verified full test refunds are integrated. Without test keys, only
the simulated development checkout is available. Live keys are rejected; neither checkout
charges real money. Restaurant capacity, real courier/GPS
tracking, email delivery, and password recovery are not integrated. Demo order, reservation,
and contact submissions remain disabled when `NODE_ENV=production` until real operations
are connected. Authentication and owner authorization are implemented.

The server validates quantities, menu IDs, add-ons, guest counts, dates, and contact data,
and calculates prices from its own catalog. Sold-out dishes cannot be ordered, including
when already in a cart. Reservations prevent duplicate slots within an account; restaurant
capacity is not modeled. Switching an owner availability setting does not alter existing orders.

Delivered and collected orders can leave one verified review. Customers can edit their rating
and comment from order history or tracking. Public restaurant pages show rating summaries and
abbreviated reviewer names; internal order IDs and account IDs are not exposed. Restaurant owners
can read feedback for their own listing, while platform administrators can hide and restore reviews.
Hidden reviews are excluded from public lists and rating averages. Review endpoints verify order
ownership and completion on the server, so browsing clients cannot create unverified ratings.

The storyboard's contact information, ratings, and restaurant statistics are sample content.
Automated tests cover the file storage/API path and React interactions. `npm run test:mongo`
repeats the API suite against a randomly named, isolated local MongoDB database and removes
that test database afterwards. It never uses `restuarantwebsite`. Browser visual checks
remain unverified because browser automation was unavailable; production deployment is not configured.

## Updated interface and motion

- A new asymmetric home hero, food photography, craving categories, and contemporary cards.
- Quick dish previews with portions, extras, quantity, and accurate running prices.
- A slide-out shopping bag with editable quantities, removal, totals, and checkout links.
- Global `Ctrl/Cmd + K` search, live results, and query/category links into the menu.
- Header, menu, checkout, account, and owner surfaces share the updated typography and palette.
- Short page entrances, scroll reveals, menu transitions, hover feedback, and bag count feedback.
  No perpetual decorative animation. Reduced-motion preferences disable nonessential movement.
- Native modal dialogs with Escape dismissal, background isolation, scroll locking, and focus restoration.

Motion follows the browser's [reduced-motion preference](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion),
and overlays use the [native modal dialog API](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal).
React tests emulate dialog open/close in jsdom; native focus trapping still needs a browser review.

## Commands

- `npm run db:start`: start/reuse project-local MongoDB.
- `npm run db:migrate`: copy missing file-store records to the configured MongoDB.
- `npm run dev`: run frontend and backend together.
- `npm run test:mongo`: run isolated MongoDB integration tests (requires local MongoDB).
- `npm run dev:client` / `npm run dev:server`: run either application separately.
- `npm run admin:promote --workspace server -- email@example.com`: grant an existing account platform administrator access.
- `npm run lint`: check project JavaScript and React code.
- `npm test`: run API tests and React interaction tests without MongoDB.
- `npm run format` / `npm run format:check`: format or check project source files.
- `npm run build`: create the frontend production bundle in `client/dist/`.
- `npm run preview`: inspect the frontend build on port 4173 (no development API proxy).
- `npm start`: run the API without file watching.
- `npm ci`: reproduce the installed dependency tree from the lockfile.

## Deployment notes

The API and frontend are separate deployment units. Serve `client/dist/` through a static
host with SPA fallback to `index.html`. Use HTTPS and a same-origin reverse proxy for `/api` (recommended). A same-site API
subdomain can also use `VITE_API_BASE_URL`; set `CLIENT_ORIGIN` to the exact frontend
origin. Cross-site hosting is intentionally blocked by the CSRF policy and SameSite cookies.
When behind a proxy, configure Express trust settings for your known proxy before relying
on per-IP rate limits; the default deliberately does not trust forwarded IP headers. Set `NODE_ENV=production`,
`MONGODB_URI`, and `HOST=0.0.0.0` when required by your hosting provider.
`npm start` serves API routes only. Production demo transaction endpoints remain disabled.
Razorpay is restricted to Test Mode until live payment, settlement and restaurant operations
are implemented and reviewed.

### Netlify frontend

The root `netlify.toml` builds the workspace from the repository root, publishes `client/dist`,
and rewrites browser routes to the React entry point. This prevents Netlify from serving the old
root website or returning a 404 when a visitor refreshes `/restaurants`, `/menu/...`, or another
client route. Netlify automatically uses these settings after the commit is deployed.

Netlify hosts the frontend only; it does not run the persistent Express/MongoDB API in this repo.
Until a public API is deployed, `VITE_STATIC_DEMO=true` keeps the public demo restaurants and dishes
browsable and shows a clear preview notice. Accounts, restaurant registration, saved server data,
checkout, uploads, reviews and admin tools require the API.

For the complete application, deploy `server/` to a Node host with persistent storage and MongoDB.
Keep the browser API path at `/api`, then add a Netlify proxy rule **above** the SPA fallback in
`netlify.toml` once the API has a permanent HTTPS URL:

```toml
[[redirects]]
  from = "/api/*"
  to = "https://your-api-host.example/api/:splat"
  status = 200
  force = true
```

Configure the API with:

```text
API: CLIENT_ORIGIN=https://menumateweb.netlify.app
API: MONGODB_URI=<your MongoDB Atlas URI>
API: NODE_ENV=production
API: HOST=0.0.0.0
```

The same-origin proxy preserves the current cookie-authentication and CSRF model. The API must
allow the exact Netlify origin, use HTTPS, and retain uploaded images on persistent storage. Set
`VITE_STATIC_DEMO=false` after the proxy is live and verified. Never put MongoDB or Razorpay secrets
in `VITE_` variables because those values are public browser code.

## Tooling references

- [Vite setup and Node.js requirements](https://vite.dev/guide/)
- [Express 5 documentation](https://expressjs.com/en/guide/migrating-5/)
- [Mongoose connections](https://mongoosejs.com/docs/connections.html)

## Motion and interaction review

- Results retain their DOM identity while filtering/sorting; cards do not replay entrance animations on every keystroke.
- New pages use a short opacity transition. Hero/scroll reveals are restrained, and content already in view is never hidden after paint. Tall sections reveal on intersection, including when reached by keyboard.
- Switching quick view to the bag keeps the same native modal session and body scroll lock. Focus moves to the new heading (or search field) and returns to the original trigger on dismissal without scrolling. Backdrop dismissal requires both the press and click to occur outside the dialog.
- Scrollbar space is reserved to avoid horizontal movement when overlays open. Touch devices and reduced-motion preferences suppress hover displacement; live reduced-motion changes expose pending reveals immediately.
- Mobile navigation closes on Escape, outside pointer interaction, or navigation. New page navigation focuses the main region; Back/Forward no longer forces a scroll to the top.
- Interaction and reveal tests cover these behaviours. Browser-level motion timing, focus trapping and visual smoothness remain unverified because no browser surface was available to the agent.

## Partner console

`/partner` uses a dedicated merchant layout with marketplace/account links and no customer
shopping controls. Registration has three validated steps: restaurant details, location/contact,
and order preferences. Back navigation preserves entries, the storefront preview updates as you
type, and only the final action creates the draft workspace. There is no automatic publication.
Existing partners have a dedicated operations sidebar, real menu/availability summaries, and
a full-width menu table with search, category and availability filters. Add/edit opens a native
dialog with a dish preview, save feedback, focus restoration and unsaved-change protection.
Availability switches save directly without reloading the workspace. Orders and grouped settings
share the console layout; narrow screens use horizontal navigation and compact dish cards.
These changes preserve the existing partner APIs. Reduced-motion preferences suppress the
editor entrance animation. Automated interaction checks cover creation, publishing, menu edits,
failed saves and settings updates; visual rendering still needs a connected browser.

## Real restaurant and food photos

- In **Partner → Menu → Add dish / Edit**, use **Upload photo**, or drop a file into the photo area.
  The processed image appears in the dish preview. Save the dish to update its public image.
- In **Partner → Settings**, use **Cover photo → Upload photo**, then **Save restaurant**.
  The same control is available during registration. Replacing a photo keeps the previous one if
  the upload fails. You can switch back to the library before saving.
- JPG, PNG and still WebP files are supported, up to 5 MiB and 25 million pixels. The authenticated,
  CSRF-protected API validates actual file bytes and fully decodes images with
  [Sharp](https://sharp.pixelplumbing.com/api-constructor/). It corrects orientation, limits output to
  1600 × 1600 without enlargement, re-encodes to WebP and strips original metadata.
- `POST /api/partner/photos` accepts the file bytes with their image content type. It returns an
  `image` URL; send that URL when saving a restaurant/dish. The API checks that the uploaded file
  belongs to the signed-in account and exists. External URLs and arbitrary filesystem paths are
  not accepted. Existing `imageKey` library selections remain supported.
- Files persist in ignored `server/.uploads/`, separated by account with generated filenames.
  MongoDB stores the image URL, not the binary file. `MENUMATE_UPLOAD_DIR` can point to an absolute
  directory on persistent storage. Public photos are served at `/api/photos/...` with immutable
  caching; these URLs are public assets, not private document storage.
- Uploads have rate, processing-concurrency and per-account storage limits (200 files / 100 MiB).
  Replaced or abandoned uploads are retained, including files referenced in past order snapshots.
  Automatic orphan cleanup is not implemented. Back up uploads alongside MongoDB; do not deploy
  them on an ephemeral filesystem. Multiple server instances must share persistent storage or
  migrate this storage adapter to an object store before scaling.
- API tests use disposable upload directories and an isolated database when running `test:mongo`.
  They check actual decoding/resize, metadata removal, file serving, invalid files, authentication,
  ownership and saved image URLs. UI tests cover validation, pending uploads, retry/replacement,
  previews, saving and preserving photos during availability changes.

## Razorpay test payments and refunds

The application creates the gateway order on the server using validated catalog prices in INR.
It verifies the checkout signature and fetches the payment from Razorpay, checking its order,
amount, currency and captured state before confirming a MenuMate order. An authorised payment
alone does not confirm an order. Retries reuse the checkout attempt; duplicate callbacks and
webhooks do not create duplicate orders.

### Configure when test keys are available

1. Generate **Test Mode** API keys in your Razorpay dashboard. Follow the official
   [integration setup](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/).
2. Set these values in ignored `server/.env`, then restart the API:
   ```dotenv
   RAZORPAY_KEY_ID=rzp_test_your_key_id
   RAZORPAY_KEY_SECRET=your_test_key_secret
   RAZORPAY_WEBHOOK_SECRET=your_separate_webhook_secret
   ```
   Keep secrets on the server; do not use `VITE_` variables or commit credentials.
   Only the public Key ID is returned to the checkout browser. This implementation rejects live keys.
3. Configure automatic capture in Razorpay. Use its test payment details in checkout.
   `GET /api/payments/config` reports whether test checkout is configured.
4. For callback recovery, configure a Test Mode webhook at
   `https://<your-public-api-host>/api/payments/webhook` with the same webhook secret.
   Subscribe to `payment.captured`, `order.paid`, `refund.created`, `refund.processed`,
   and `refund.failed`. Localhost is not reachable by Razorpay; a public HTTPS development
   endpoint is needed for provider webhook testing. Follow Razorpay's
   [webhook validation instructions](https://razorpay.com/docs/webhooks/validate-test/).

### Checkout and refund behaviour

- Checkout is labelled **test mode**. Closing or failing checkout retains the bag.
  The signed-in customer's pending attempt is saved in session storage for reload recovery.
  **Check payment status** fetches the provider state; **Resume previous payment** reopens
  the same gateway order. A changed bag is preserved when an older payment completes.
  Pending sessions remain tied to their original order details and total.
- A valid capture webhook can save the order even if the browser closes before verification.
  Payment/refund state is shown in customer, restaurant and administrator order views.
- Cancel a Razorpay order first, then use **Admin → Orders → Refund payment → Confirm test refund**.
  This issues a full refund, with server-side admin authorization and an idempotency key.
  Repeated requests check the same refund rather than issuing another one.
  A pending refund can be refreshed; a failed refund requires operator investigation.
  See the [Razorpay refund API](https://razorpay.com/docs/api/refunds/create-normal/).
- MongoDB stores attempts in `payment_attempts`; confirmed orders remain in `orders`.
  Local development storage and its migration also include payment attempts. Back up both.
  Never remove payment attempts to retry a refund: their identifiers prevent duplicate requests.

Automated tests mock the Razorpay API and browser checkout. They cover signatures, ownership,
authorised versus captured payments, amount tampering, replay, webhook recovery, refund retries,
cart retention and explicit refund confirmation. They do not prove that a merchant's Razorpay
account is configured correctly. A real **Test Mode** success/failure/cancellation/refund and
public-webhook check is still required once keys are available.

Live charging, partial refunds, marketplace split settlements/payouts, automatic restaurant
refund decisions, and synchronising refunds initiated manually in the Razorpay dashboard are
not implemented. Uncertain provider order creation is recorded for investigation; no payment
form opens until its gateway order is safely stored. Switching merchant accounts/keys while
attempts are pending requires operator reconciliation. Real kitchen/delivery operations must
be connected before enabling live commerce.
