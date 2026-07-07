# Falcon Tracking & Personnel Analytics Platform

An enterprise field-force tracking dashboard built with React, TypeScript, and Express, backed by an Oracle database.

## Stack

- **Frontend:** React 18 + Vite, Tailwind CSS 4, Leaflet.js, motion/react
- **Backend:** Express.js with TypeScript (`tsx` runtime, single unified server)
- **Database:** Oracle DB via `oracledb` — falls back to simulation data if no DB is connected
- **Maps:** Leaflet with satellite/roadmap toggle and polyline decoration

## Running the app

### On Replit
The workflow `Start application` runs `npm run dev` and serves on port 5000. Oracle DB credentials are stored as Replit Secrets — no `.env` file needed.

Required secrets (set via Replit Secrets):
- `ORACLE_USER`
- `ORACLE_PASSWORD`
- `ORACLE_CONNECTION_STRING`

### Locally
```bash
# 1. Install dependencies
npm install

# 2. Create your environment file
cp .env.example .env
# Then edit .env and fill in your Oracle credentials

# 3. Start the dev server (Express + Vite on port 5000)
npm run dev
```

Other commands:
```bash
npm run build      # production build (outputs to dist/)
npm run start      # serve the production build
npm run lint       # TypeScript type check
```

Open http://localhost:5000 — it redirects automatically to the movement tracking module.

## Routes

All modules live under `/mtracking`:

| Path | Module |
|------|--------|
| `/mtracking/movementTracking` | Movement map with multi-day path tracking |
| `/mtracking/currentLocation` | Live field monitoring |
| `/mtracking/operationalReport` | Spreadsheet-style operational reports |

Visiting `/` or `/mtracking` redirects to the movement tracking module.

## Environment variables (secrets)

| Key | Required | Description |
|-----|----------|-------------|
| `ORACLE_USER` | ✅ | Oracle DB username |
| `ORACLE_PASSWORD` | ✅ | Oracle DB password |
| `ORACLE_CONNECTION_STRING` | ✅ | e.g. `hostname:port/service_name` |
| `GOOGLE_MAPS_API_KEY` | — | Reverse geocoding — improves address accuracy. If omitted, the server falls back to OpenStreetMap Nominatim automatically (no key needed, location names still appear) |
| `MOVEMENT_TRACKING_API_KEY` | — | External API security code (default: `FALCON_SECURE_TRACE_2026`) |
| `PORT` | — | Server port (default: 5000) |

All sensitive values are stored as Replit Secrets.

## External API gateway

Secure access for other projects via `/api/external/movement-tracking`.  
Authenticate with header `X-Security-Code` or query param `?securityCode=`.

## Architecture note

`server.ts` is a single file that boots Express API routes AND Vite middleware on one port — do not split into separate frontend/backend workflows.

## Replit setup notes

- Verified: Oracle DB connection pool initialises on startup (`[DB] initializing pool for <user>...` in workflow logs)
- Verified: `/api/employees` returns live Oracle data (HTTP 200 with real employee records)
- The workflow `Start application` (`npm run dev` → `tsx server.ts`) opens port 5000 as the web preview
- Port 24678 is the Vite HMR websocket — this is expected and does not need a separate workflow

## User preferences

- Runs with live Oracle DB credentials (not simulation mode)
