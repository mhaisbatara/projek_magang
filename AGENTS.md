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
- Entry point: `server.js`. Routes mounted under `/api/*` (`/api/auth`, `/api/dashboard`,
  `/api/pasien`, `/api/pendaftaran`, `/api/logistik`); all except `/api/auth` and `/`
  pass through `middleware/auth.js` (JWT, `Bearer` token).
- **IDs are NOT auto-increment.** They are string-prefixed, zero-padded codes
  generated manually inside transactions via `SELECT ... ORDER BY ... DESC LIMIT 1
  FOR UPDATE` then incrementing the numeric suffix. Patterns in use (all
  `padStart(2)`, i.e. `USR01`, `PSN01`, `ANT01`, `OBT01`, `SUP01`, `PO01`,
  `POD01`, `KAS01`, `LOG01`): `USR01`, `PSN01`, `ANT01`; logistik `OBT01`,
  `SUP01`, `PO01`, `POD01`, `KAS01`, `LOG01`. Codes with their own generators:
  `no_rm` = `RM0001` (4-digit, pasien), `kode_antrian` = `ANT-YYYYMMDD-NNN`
  (per-day global sequence), `kode_po` = `PO-YYYYMMDD-NNN` (per-day global
  sequence), `kode_obat` = `OBT001` (3-digit, sequential — distinct from the
  `OBT01` row `id`). Referenced-but-not-generated prefixes include `POL01`,
  `PJM01`, `ROL01` (seeded data). When adding tables or writes, follow the
  transactional scheme — do not assume `AUTO_INCREMENT`.
- **All tables use `mst_` (master) / `trx_` (transaction) prefixes** (e.g.
  `mst_user`, `mst_pasien`, `mst_obat`, `trx_tagihan`, `trx_buku_kas`), except
  `audit_log` and `log_integrasi`. There is no service layer: business logic lives
  inline in `controllers/*`.
- **FK columns are named `kode_<entity>`** (not `id_<entity>`), e.g.
  `mst_antrian.kode_poli` → `mst_poli.kode_poli`, `mst_pasien.kode_penjamin` →
  `mst_penjamin.kode_penjamin`, `mst_purchase_order.kode_supplier` →
  `mst_supplier.kode_supplier`, `mst_po_detail.kode_obat` → `mst_obat.kode_obat`,
  `mst_kunjungan.no_sip` → `mst_dokter.no_sip`, `mst_antrian.no_rm` →
  `mst_pasien.no_rm`. In the seeded data `id` and `kode_*` hold equal values
  (e.g. `POL01` == `kode_poli`, `PJM01` == `kode_penjamin`, `SUP01` ==
  `kode_supplier`) — **except `mst_obat`, where `id` = `OBT01` but `kode_obat` =
  `OBT001`**. Always join/update through the `kode_*` column to match what
  `resolvePenjamin`/inserts actually store. All primary keys are named `id`; when
  SELECTing, alias `id AS id_<entity>` if the frontend expects the old field name.
- `pasienController.js` imports helpers (`formatNoAntrian`, `resolvePenjamin`)
  from `pendaftaranController.js` — keep that coupling in mind when refactoring.
- Queue tickets are `<poli-letter>-<NNN>` (e.g. `A-001`). `formatNoAntrian` in
  `pendaftaranController.js` hardcodes `POL01..POL05` → `A..E` (fallback `Q`),
  so adding a 6th poli will not get a sensible letter without editing the map.
  The `no_antrian` string is stored directly in the `mst_antrian` table (no
  separate `no_urut` column); legacy rows before the letter format hold bare
  numbers like `001`.
- `register` hardcodes the role to `ROL01` (Super Admin). The `mst_role` table
  (`id`, `role`) is referenced but its data lives only in the database.
- The auth middleware decodes the JWT into `req.user = { id, nama, role }` (1-day
  expiry). `role` is the raw role code (e.g. `ROL01`), not a readable name.
  `logistikController.js` writes `req.user.nama` (the email from the JWT) into
  `audit_log.email_user` — the schema has no `email_user` FK to `mst_user.id`. The
  `mst_user` table has no `nama` column — `email` is used as the display name in
  the JWT and login response (the `nama` sent to `register` is ignored).
- `logistikController.js` is a self-contained pharmacy/inventory module mounted at
  `/api/logistik` (obat, supplier, purchase orders, buku kas). It uses a generic
  `generateId(conn, table, column, prefix)` helper rather than per-entity
  functions. `createPO` resolves each `id_obat` (row id, e.g. `OBT01`) to its
  `kode_obat` (`OBT001`) before inserting `mst_po_detail`, and `terimaPO` bumps
  `mst_obat.stok` via `kode_obat` and writes a `trx_buku_kas` row in a single
  transaction.
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

Tables an agent will encounter (must already exist in the DB): `mst_user`,
`mst_role`, `mst_pasien`, `mst_poli`, `mst_antrian`, `mst_dokter`,
`mst_jadwal_dokter`, `mst_penjamin`, `mst_kunjungan`, `trx_tagihan`,
`trx_pembayaran`, `trx_detail_tagihan`, plus the logistik tables `mst_obat`,
`mst_supplier`, `mst_purchase_order`, `mst_po_detail`, `trx_buku_kas`, and
`audit_log`. Several additional tables exist for future modules (`resep`,
`resep_detail`, `hasil_lab`, `permintaan_lab`, `pemeriksaan`, `dokumen_medis`,
`stok_opname`, `klaim_bpjs`, `log_integrasi`, `pengaturan_klinik`) but are not
yet referenced in code.

**Removed/renamed tables** (do not use): `user_staff` → `mst_user`,
`pendaftaran` (removed — `mst_antrian` now links directly to
`mst_pasien`/`mst_poli`), `inventori` (removed — stok is tracked directly on
`mst_obat`), `kasir` (removed — replaced by
`trx_tagihan`/`trx_pembayaran`/`trx_detail_tagihan`).

**Key column differences** from what you might expect: `mst_pasien` has
`nama_pasien` (not `nama`), `tanggal_lahir` (not `tgl_lahir`), `no_hp` (not
`telepon`); no `nik` or `id_poli` column. `mst_dokter` has `nama_dokter` (not
`nama`). `mst_jadwal_dokter` has `kuota_pasien` (not `kuota`) and `hari` is the
Indonesian day-name string (`Senin`..`Minggu`) which the dashboard matches to
`WEEKDAY(CURDATE())`. `mst_antrian.status_panggil` enum is
`menunggu`/`dipanggil`/`selesai`. `mst_pasien` also has `no_rm` (the `RM` code,
separate from the `PSN...` id), `jk`, and `kode_penjamin` (stores the
`kode_penjamin` value returned by `resolvePenjamin`). `trx_tagihan` uses
`kode_tagihan`, `kode_kunjungan`, `no_rm`, `kode_penjamin`, `total_tagihan`,
`status_pembayaran` (`lunas`), and `tanggal`. `mst_dokter` is keyed by `no_sip`
(referenced from `mst_kunjungan.no_sip`/`mst_jadwal_dokter.no_sip`). `mst_obat` has `harga_beli`/`harga_jual` (not single
`harga`), plus `kategori` and `stok_minimum`. `mst_po_detail` has `qty` (not
`jumlah`). `trx_buku_kas` has `jenis` (not `jenis_transaksi`). `audit_log` has
`aksi` (not `aktivitas`) and `tabel_terkait` (not `modul`). `mst_purchase_order`
status enum is `draft`/`dikirim`/`diterima`/`batal` (not `diajukan`/`diproses`).
If a query fails with a missing-table/column error, the schema is the likely
cause — ask the team rather than inventing columns.

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
- Routing uses **`HashRouter`** (e.g. `/#/dashboard`, `/#/pendaftaran`, `/#/medis`,
  `/#/kasir`, `/#/penunjang`, `/#/administration`, `/#/logistik`, `/#/login`,
  `/#/register`). Keep this if adding routes; do not switch to `BrowserRouter`
  without also handling static hosting. Every authenticated route is wrapped in
  `ProtectedRoute` and rendered inside a shared `Sidebar` shell.
- API base URL `http://localhost:5000/api` is hardcoded in **one place**:
  `src/services/api.js` (axios instance with the `Bearer` token interceptor). All
  service modules (`dashboardService.js`, `logistikService.js`, ...) import and
  reuse this authenticated `api` instance — do not create standalone axios
  instances. If the backend port/origin changes, update `api.js` only.
- Auth state: `token` and `user` JSON in `localStorage`; `ProtectedRoute`
  redirects to `/login` when `user` is absent. `AuthProvider` bootstraps `user`
  from `localStorage` on mount.
