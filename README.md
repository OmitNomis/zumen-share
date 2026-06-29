# Zumen Share

In-office zumen (blueprint) sharing. Upload images/PDFs (bulk OK), draw on them,
save marked-up versions.

Three record kinds, all in the `zumen` collection, distinguished by two relations:

- **oya (親)** — a top-level blueprint. `oya` and `source` both empty.
- **ko (子)** — a real part / detail drawing that belongs to a blueprint.
  `oya` = the blueprint's id. Shown strung under their oya in the left sidebar so
  small parts are easy to find; search matches oya and ko.
- **copy** — a flattened markup snapshot of one drawing (not a real part).
  `source` = the drawing it snapshots. Listed in the viewer's right sidebar.

Deleting a drawing cascades to its ko and its copies. Every upload / copy /
edit / delete is audit-logged with the user who did it.

Stack: PocketBase (auth, storage, API) + React/Vite/Tailwind frontend served
from `pb_public`.

## Run

```powershell
./pocketbase.exe serve --http=0.0.0.0:8090
```

- App: http://localhost:8090 (coworkers use `http://<your-ip>:8090` — allow it
  through Windows Firewall the first time)
- Admin UI: http://localhost:8090/_/ (superuser account)

## Accounts

Self-signup is disabled. Create app accounts as superuser in the Admin UI →
`users` collection → New record. Superuser and app accounts are separate.

## Audit logs

`audit_logs` collection (also the "Logs" button in the app). Plain-text rows
(no relations) so they survive user/zumen deletion. Written server-side by
`pb_hooks/`; not writable through the API.

## Storage: local ⇄ Cloudflare R2

Files live in `pb_data/storage` by default. To switch to an R2 bucket
(PocketBase built-in, no code):

1. Admin UI → **Settings → Files storage** → enable **S3 storage**
2. Endpoint: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, region: `auto`,
   plus bucket name and an R2 API token's access key / secret
3. Save. New uploads go to the bucket. **Existing files are not migrated
   automatically** — copy the contents of `pb_data/storage` into the bucket
   first if you switch with data present.

## Development

```powershell
npm run dev    # vite on :5173, proxies /api to :8090 (pocketbase must be running)
npm run build  # outputs to pb_public, served by pocketbase
```

Schema changes go in `pb_migrations/` (applied automatically at startup, or
`./pocketbase.exe migrate up`).

## Smoke test

```powershell
./smoke-test.ps1 -Email you@example.com -Password yourpass
```

Uploads a test file, saves a copy, edits, cascade-deletes, and verifies each
action landed in the audit log.
