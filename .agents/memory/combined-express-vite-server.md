---
name: Combined Express+Vite dev server
description: This project's server.ts runs Express API routes and Vite (as middleware) in the same process on one port.
---

`server.ts` is the single entry point (`npm run dev` → `tsx server.ts`). It creates an Express app, defines all `/api/*` routes and Oracle DB pool logic directly in that file, then in dev mode mounts Vite via `createServer({ server: { middlewareMode: true } })` and `app.use(vite.middlewares)`. There is no separate Vite dev server process.

**Why:** Only one workflow/port is needed (5000). Setting `vite.config.ts`'s own `server.host`/`allowedHosts` still matters because the Vite instance is created programmatically inside server.ts and inherits config from `vite.config.ts`.

**How to apply:** When adjusting host/port/proxy settings for Replit preview, edit both `server.ts` (the `PORT`/`app.listen` call) and `vite.config.ts` (`server.allowedHosts: true`, `server.host: '0.0.0.0'`) — changing only one is not enough.

Oracle DB (via `oracledb` package) is optional at runtime — the app still renders with fallback/static data in the UI even when `ORACLE_USER`/`ORACLE_PASSWORD`/`ORACLE_CONNECTION_STRING` env vars are unset; `/api/health` just reports "unhealthy" in that case.
