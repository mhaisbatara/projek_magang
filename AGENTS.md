# AGENTS.md

Clinic registration system (Indonesian: "magang" = internship project). User-facing
strings and commit messages are in Indonesian. Two independent packages: `backend/`
(Express + MySQL) and `frontend/` (React + Vite).

## Repository layout gotchas

- The root `package.json` is **not** a workspace root — it only holds stray deps
  and has no scripts. Do not run install/build at the root. Work inside `backend/`
  and `frontend/` separately.
- No tests, no CI, no migrations exist. Verification = run both dev servers and
  exercise the feature manually.
- Branching: create a `feature/...` branch off `main` and open a PR to `main`.
  Existing branches `diah` / `iqbal` are per-person, not the convention to follow.

## Backend (`backend/`)

```bash
npm install        # inside backend/
npm run dev        # nodemon server.js, hot reload
npm start          # node server.js (production-style)
```

- **ES modules** (`"type": "module"`). Every relative import must include the `.js`
  extension, or it will fail at runtime.
- Entry point: `server.js`. Routes mounted under `/api/*`; all except `/api/auth`
  and `/` pass through `middleware/auth.js` (JWT, `Bearer` token).
- **IDs are NOT auto-increment.** They are string-prefixed, zero-padded codes
  generated manually inside transactions via `SELECT ... ORDER BY ... DESC LIMIT 1
  FOR UPDATE` then incrementing the numeric suffix. Patterns in use: `USR0001`,
  `RM0001`, `PSN0001`, `REG0001`, `ANT0001`. Queue tickets are `<poli-letter>-<NNN>`
  (e.g. `A-001`), mapped per `id_poli` in `formatNoAntrian`. When adding tables or
  writes, follow this scheme — do not assume `AUTO_INCREMENT`.
- There is no service layer: business logic lives inline in `controllers/*`.
  `pasienController.js` imports helpers (`formatNoAntrian`, `resolvePenjamin`,
  `resolveDokter`) from `pendaftaranController.js` — keep that coupling in mind
  when refactoring.
- `register` hardcodes the role to `ROL0007`. The role table is referenced but its
  data lives only in the database.
- Connection pool: `config/db.js` (`mysql2/promise`, limit 10). Transactions use
  `pool.getConnection()` + `beginTransaction()`/`commit()`/`rollback()`/`release()`.

### Environment (required, not committed)

`backend/.env` is gitignored and there is no `.env.example`. The schema/seed data
is also **not in the repo** — it is managed externally in a shared MySQL instance.
Required keys:

```
PORT=5000
DB_HOST= DB_USER= DB_PASSWORD= DB_NAME= DB_PORT=
JWT_SECRET=
```

Tables an agent will encounter (must already exist in the DB): `user_staff`,
`pasien`, `poli`, `pendaftaran`, `antrian`, `dokter`, `jadwal_dokter`,
`penjamin`, `kunjungan`, `kasir`. If a query fails with a missing-table/column
error, the schema is the likely cause — ask the team rather than inventing columns.

CORS is wide open (`app.use(cors())`); intended for local dev only.

## Frontend (`frontend/`)

```bash
npm install        # inside frontend/
npm run dev        # Vite dev server
npm run build      # production build to dist/
npm run lint       # eslint . (flat config) — run before considering work done
```

- No TypeScript and no typecheck step. `npm run lint` is the only static check.
- **Tailwind CSS v4** via `@tailwindcss/vite`, configured CSS-first
  (`@import "tailwindcss";` in `src/index.css`). There is intentionally no
  `tailwind.config.js` — do not add one unless moving off v4 conventions.
- Routing uses **`HashRouter`** (routes are `/#/dashboard`, `/#/pendaftaran`,
  `/#/medis`, `/#/login`, `/#/register`). Keep this if adding routes; do not
  switch to `BrowserRouter` without also handling static hosting.
- API base URL `http://localhost:5000/api` is **hardcoded in two places**:
  `src/services/api.js` (axios instance with the `Bearer` token interceptor — use
  this for authenticated calls) and `src/services/dashboardService.js` (a separate
  axios instance with **no** interceptor). If the backend port or origin changes,
  update both, and prefer reusing the authenticated `api` instance.
- Auth state: `token` and `user` JSON in `localStorage`; `ProtectedRoute`
  redirects to `/login` when `user` is absent. `AuthProvider` bootstraps `user`
  from `localStorage` on mount.
