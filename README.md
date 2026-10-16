# MenuMate

Restaurant website organized as a MERN project: MongoDB, Express, React, and Node.js.
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
`menu_availability`. Required unique and expiry indexes are initialized before the API
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

- `/`: home, specials, restaurant story, and reservation call to action.
- `/menu`: category tabs, search, vegetarian filtering, price sorting, favourites,
  and sold-out dishes.
- `/menu/:id`: portion sizes, add-ons, quantities, and related dishes.
- `/cart`, `/checkout`, `/payment`: persistent cart, sign-in requirement for checkout,
  fulfillment/address details, server-calculated totals, simulated payments, and errors.
- `/orders/:id/confirmation`, `/orders/:id/tracking`: private confirmation and status
  timeline; tracking checks the server every 15 seconds for owner updates.
- `/booking`, `/reservations/:id`: sign-in on submission, date validation, guest/occasion
  details, confirmation, and a demo `.ics` calendar download for confirmed bookings.
- `/about`, `/contact`: restaurant story, sample contact details, and a demo message form.
- `/login`, `/register`: customer authentication and return to the requested page.
- `/account`, `/account/security`: saved name/phone and password changes.
- `/account/orders`, `/account/reservations`, `/account/favorites`: private history,
  reorder, cancellation, and browser-local favourites.
- `/admin`: owner-only dashboard with actual order totals, a seven-day order chart,
  searchable/filterable orders, pagination, status controls, reservations, and dish availability.
  Order/reservation lists refresh every 30 seconds.

Customers can cancel orders while `Placed` and future reservations while `Confirmed`.
Owners can move delivery orders through `Preparing`, `Out for delivery`, and `Delivered`;
pickup/dine-in orders use `Ready` and `Collected`. Reservations support seating, completion,
cancellation, and no-show states. Invalid transitions and stale updates are rejected.
Status history records the acting account and timestamp. Customers can access only their
own records; owner access is checked by the API as well as the UI.

## Demo boundaries

Payments are simulated and do not charge money. Restaurant capacity, real courier/GPS
tracking, email delivery, and password recovery are not integrated. Demo order, reservation,
and contact submissions remain disabled when `NODE_ENV=production` until real operations
are connected. Authentication and owner authorization are implemented.

The server validates quantities, menu IDs, add-ons, guest counts, dates, and contact data,
and calculates prices from its own catalog. Sold-out dishes cannot be ordered, including
when already in a cart. Reservations prevent duplicate slots within an account; restaurant
capacity is not modeled. Switching an owner availability setting does not alter existing orders.

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
- `npm run admin:promote --workspace server -- email@example.com`: grant an existing account owner access.
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
`npm start` serves API routes only. Production demo transaction endpoints remain disabled
until payment and restaurant operations are implemented.

## Tooling references

- [Vite setup and Node.js requirements](https://vite.dev/guide/)
- [Express 5 documentation](https://expressjs.com/en/guide/migrating-5/)
- [Mongoose connections](https://mongoosejs.com/docs/connections.html)
