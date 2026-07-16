# Deploying Zumen Share

Zumen Share deploys as **one process**: the `pocketbase` binary (`pocketbase.exe` on
Windows). That single binary serves the JSON API, the admin UI, *and* the built React
frontend from `pb_public`. There is no separate web server and no Node.js in production —
Node is only needed on a build machine to regenerate `pb_public` when the frontend source
changes.

PocketBase ships a native binary for **Linux, Windows, and macOS** (amd64 and arm64), so
the "server" can be any always-on machine on the office LAN. Coworkers reach it at
`http://<server-ip>:8090`.

> The commands below use `./pocketbase`. On Windows that's `.\pocketbase.exe`; everything
> else (flags, `git`, `npm`) is identical across platforms.

## What lives where

| Path | In git? | Role |
| --- | --- | --- |
| `pocketbase` (`.exe` on Windows) | no (`.gitignore`) | The server binary. Download per OS/version below. |
| `pb_public/` | **yes** | Prebuilt frontend (HTML/JS/CSS + PWA assets). Shipped in the repo, so a plain checkout is already serveable. |
| `pb_data/` | no (`.gitignore`) | **All state**: SQLite DB (`data.db`) + uploaded files (`storage/`). This is what you back up. |
| `pb_migrations/` | yes | Schema. Applied automatically at startup. |
| `pb_hooks/` | yes | Server-side audit logging (upload/copy/edit/delete). |
| `src/`, `vite.config.ts`, … | yes | Frontend source. Only needed to *build*, never at runtime. |

Because `pb_public` is committed, a deploy from a fresh clone needs **no build step** —
just the binary and `pb_data`.

## Prerequisites

- A host that stays powered on (the office "server") — **any OS PocketBase builds for**:
  Linux, Windows, or macOS, amd64 or arm64.
- **PocketBase v0.39.0** — the binary is gitignored, so download the archive for your
  platform separately and match the version the schema/hooks were written against:
  <https://github.com/pocketbase/pocketbase/releases/tag/v0.39.0>. Extract the
  `pocketbase` binary (`pocketbase.exe` on Windows) into the repo root. Upgrading
  PocketBase is a deliberate step — see [Upgrading PocketBase](#upgrading-pocketbase).
- **Node.js 20+** — *only* on the machine where you rebuild the frontend. Not required
  on the server if you deploy the committed `pb_public`.

## 1. First-time deploy

On the server:

```sh
# 1. Get the code (or copy the folder over)
git clone <repo-url> zumen-share
cd zumen-share

# 2. Put the matching pocketbase binary in this folder (see Prerequisites).
#    On Linux/macOS, make it executable:  chmod +x pocketbase

# 3. First run — creates pb_data, applies every migration, prints an admin setup URL
./pocketbase serve --http=0.0.0.0:8090
```

On first boot PocketBase prints a one-time link to create the **superuser** (admin)
account. Open it, set a password — this is the Admin UI login, separate from app
accounts.

Then create the app logins coworkers use (self-signup is disabled):

- Admin UI → `users` collection → **New record** → set email + password.
- Repeat per person. See the README's *Accounts* section.

The frontend in `pb_public` is already built, so the app is live at this point.

## 2. Serve to the office LAN

- **Bind to all interfaces**: `--http=0.0.0.0:8090` (localhost-only `127.0.0.1` won't be
  reachable from other machines).
- **Open the port in the host firewall** — 8090/TCP inbound:

  ```sh
  # Linux (ufw)
  sudo ufw allow 8090/tcp
  # Linux (firewalld)
  sudo firewall-cmd --permanent --add-port=8090/tcp && sudo firewall-cmd --reload
  ```

  ```powershell
  # Windows — the first outside connection also just prompts you to allow it, or:
  New-NetFirewallRule -DisplayName "Zumen Share 8090" -Direction Inbound `
    -Protocol TCP -LocalPort 8090 -Action Allow
  ```

  (macOS has no inbound port firewall enabled by default.)

- **Stable address**: give the server a static IP or DHCP reservation so the URL
  coworkers bookmark (`http://<server-ip>:8090`) doesn't move.

## 3. Keep it running (run as a service)

`./pocketbase serve` runs in the foreground and dies when you close the terminal or log
out. For an always-on deploy, run it under your OS's service manager so it starts on boot
and restarts on crash.

**Linux (systemd)** — create `/etc/systemd/system/zumen-share.service`:

```ini
[Unit]
Description=Zumen Share (PocketBase)
After=network.target

[Service]
Type=simple
User=zumen
WorkingDirectory=/opt/zumen-share
ExecStart=/opt/zumen-share/pocketbase serve --http=0.0.0.0:8090
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Then enable and start it:

```sh
sudo systemctl daemon-reload
sudo systemctl enable --now zumen-share
sudo systemctl status zumen-share        # follow logs: journalctl -u zumen-share -f
```

**Windows (NSSM)** — the simplest way to run it as a service:

```powershell
# Install NSSM (e.g. via winget) then, from an elevated shell:
nssm install ZumenShare "C:\path\to\zumen-share\pocketbase.exe" "serve --http=0.0.0.0:8090"
nssm set   ZumenShare AppDirectory "C:\path\to\zumen-share"
nssm set   ZumenShare Start SERVICE_AUTO_START
nssm start ZumenShare
```

Manage it with `nssm restart ZumenShare` / `nssm stop ZumenShare`, or from
`services.msc`. (Task Scheduler with an "At startup" trigger works too, but NSSM gives
you auto-restart and clean stop/start.)

**macOS (launchd)** — drop a `launchd` plist in `~/Library/LaunchAgents/` (or
`/Library/LaunchDaemons/` for boot-time) with `pocketbase serve …` as the program
arguments, `WorkingDirectory` set to the repo root, and `KeepAlive` enabled, then
`launchctl load` it.

Whichever you use, point the service's **working directory** at the repo root —
PocketBase resolves `pb_data`, `pb_public`, `pb_hooks`, and `pb_migrations` relative to it
(systemd `WorkingDirectory`, NSSM `AppDirectory`, launchd `WorkingDirectory`).

## 4. HTTPS (required for PWA install & offline)

Plain HTTP works fine for day-to-day use. But browsers only register the service worker
over **HTTPS** or on **localhost**, so over `http://<server-ip>:8090` coworkers get the
app but **not** installability or offline caching (it degrades gracefully — the SW is
just skipped).

To get a secure context, put a TLS terminator in front of PocketBase. Any of:

- **Cloudflare Tunnel** — no inbound firewall changes, gives an HTTPS hostname.
- **Tailscale** (with HTTPS / `tailscale serve`) — good for a private office network.
- **A reverse proxy with a cert** (Caddy is easiest — automatic certs; nginx works too)
  terminating HTTPS and proxying to `127.0.0.1:8090`.

Whichever you choose, keep the app reachable at the site **root** (`/`) — the manifest's
`scope` and `start_url` are `/`.

## 5. Updating a deployment

```sh
git pull
```

- **If only committed assets changed** (including a rebuilt `pb_public` that came in with
  the pull), just restart the service (`systemctl restart zumen-share`,
  `nssm restart ZumenShare`, …).
- **If you changed frontend source** (`src/`, `vite.config.ts`, …), rebuild `pb_public`
  on a machine with Node, commit it, pull on the server, then restart:

  ```sh
  npm ci
  npm run build   # tsc -b && vite build → outputs to pb_public
  git add pb_public && git commit -m "build: regenerate pb_public"
  ```

- **Migrations** in `pb_migrations/` apply automatically on the next start; no manual
  step. (To run them without a full restart: `./pocketbase migrate up`.)

Users on an open tab see a **"Reload"** toast when a new build lands (the PWA is set to
`prompt`, never auto-swapping assets mid-markup) — no forced refresh.

### Upgrading PocketBase

Swap the binary deliberately, and read that release's changelog for breaking changes
first (the schema, hooks, and `types.d.ts` target v0.39.0):

1. Stop the service (`systemctl stop zumen-share`, `nssm stop ZumenShare`, …).
2. **Back up `pb_data`** (see below).
3. Replace the `pocketbase` binary with the new version (matching your OS/arch).
4. Start the service again — watch the logs for a clean start / migration output.

## 6. Backups

`pb_data/` is the entire state of the app — SQLite database **and** locally stored files.
Protect it.

- **Built-in (recommended)**: Admin UI → **Settings → Backups** → create/schedule. This
  produces a consistent zip even while running, and can be pointed at S3/R2 for
  offsite storage.
- **Manual**: stop the service, then copy the whole `pb_data/` folder somewhere safe
  (copying `data.db` while running risks a torn SQLite file — stop first, or use the
  built-in backup which snapshots safely).

If you've moved file storage to **Cloudflare R2** (README → *Storage*), a full backup is
the **database backup + the R2 bucket** — uploaded files no longer live in
`pb_data/storage`.

## 7. Verify the deployment

After standing up or updating, run the end-to-end smoke test against the server. It
uploads a file, saves a copy, edits, cascade-deletes, and confirms every action landed
in the audit log. It's a PowerShell script, but PowerShell 7 (`pwsh`) is cross-platform,
so it runs anywhere:

```sh
# Linux/macOS — needs PowerShell 7 installed (the `pwsh` command)
pwsh ./smoke-test.ps1 -Email you@example.com -Password yourpass -BaseUrl http://<server-ip>:8090
```

```powershell
# Windows
./smoke-test.ps1 -Email you@example.com -Password yourpass -BaseUrl http://<server-ip>:8090
```

A green `OK:` line means the full upload → copy → edit → cascade-delete → audit path
works against that deployment.

## Rollback

- **Code / frontend**: `git checkout <previous-commit>` (the committed `pb_public` reverts
  with it), then restart the service.
- **Data**: stop the service, restore the `pb_data/` backup (or restore from the built-in
  backup zip in the Admin UI), start again.
- **Migrations** are forward-only here; roll back by restoring a `pb_data` snapshot taken
  before the upgrade, not by "un-migrating."
