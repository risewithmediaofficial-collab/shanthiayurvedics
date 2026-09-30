# Shanthi Ayurvedas CRM

Multi-branch CRM for leads, telecaller calls and follow-ups, customers, orders, inventory, shipping, returns, reports, and audit history. React/Vite serves the interface; Express, Socket.IO, and MongoDB provide the API and live updates.

## Local development

Requires Node.js 20+, npm, and MongoDB. From the repository root:

```bash
npm ci
cp .env.example .env
npm run dev:backend
npm run dev:frontend
```

Run the two dev commands in separate terminals. The interface is at `http://localhost:5173`; Vite proxies `/api` and `/socket.io` to the backend on port 5000. Set `MONGO_URI` in `.env` for your database. On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp` if needed.

For a new, empty client database, set `BOOTSTRAP_EMAIL`, `BOOTSTRAP_PASSWORD`, and optionally `BOOTSTRAP_NAME` in the environment, then run `npm run bootstrap` once. Bootstrap refuses to create another owner when one already exists. The server does not automatically seed users or sample records. `npm run seed` creates development sample data with known credentials and must never be run against a client database.

## Access and business rules

Permissions come from the role stored in MongoDB and are included in the login and session responses. A telecaller can open their assigned leads, follow-ups, call history, customers, and orders; API requests are still restricted to their branch and assigned records. Managers can request branch withdrawals, while only an owner can mark a request processed or rejected. Withdrawal balances use delivered order totals and each branch's configured `revenueSharePercent`; a branch with no configured share has no available payout. Processed requests require a bank or UPI transaction reference. The owner settlement endpoint is `PATCH /api/reports/withdrawal-request/:id` with `status` set to `PROCESSED` or `REJECTED`.

## Checks

```bash
npm test
npm run test:frontend
npm run lint
npm run build
```

Backend tests use an in-memory MongoDB server. Lint currently reports warnings for unused code in older modules. The production build may also report large chunks for the owner and manager dashboards; role dashboards load separately so a telecaller does not download those views on login.

## Docker deployment

Copy `.env.example` to `.env` and set unique values for `MONGO_ROOT_USERNAME`, `MONGO_ROOT_PASSWORD`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET`, and `FRONTEND_URL`. Production JWT and cookie secrets must each be at least 32 characters; access and refresh secrets must differ. The Mongo password must be URL-safe because it is embedded in `MONGO_URI`. Set `FRONTEND_URL` to the URL users open in their browser (for example `https://crm.example.com`). Then run:

```bash
docker compose up -d --build
docker compose ps
```

The web app and API are served on `${CRM_PORT:-89}` through Nginx. The backend and MongoDB are internal to the Compose network. `/health/ready` reports whether the API is connected to MongoDB. Back up the `mongodb_data` volume before upgrades. This Compose file runs one backend instance; increasing traffic beyond one instance requires a tested multi-instance deployment, including Socket.IO coordination and shared rate limiting.

Before client handoff, configure each branch and its revenue share, create named staff accounts, change any credentials inherited from development, verify SMTP or messaging integrations that are in use, and test a complete lead-to-delivery flow with client-approved data.

Proprietary software for Shanthi Ayurvedas.
