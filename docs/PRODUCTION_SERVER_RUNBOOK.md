# BizFlow Production Server Runbook

This document explains how the production server is set up, what was changed, how to deploy safely, and how to operate and troubleshoot it.

## 1) Current Production Architecture

Domain:
- https://medhatjachour.tech

Main paths:
- https://medhatjachour.tech/bizflow -> marketing/workspace site (Next.js)
- https://medhatjachour.tech/app -> BizFlow web UI (plugin demo app)
- https://medhatjachour.tech/ipc -> bridge API used by the web UI
- https://medhatjachour.tech/health -> bridge health endpoint

Docker services:
- bizflow-app (custom image built from Dockerfile)
- bizflow-nginx (nginx:alpine)

Inside bizflow-app there are 3 runtime processes:
- Next.js standalone server on port 3000
- BizFlow bridge server on port 8787
- BizFlow static web UI server on port 5180

Nginx is the HTTPS reverse proxy in front of app ports.

## 2) Why Two Docker Services

You have two services by design:

1. bizflow-app
- Runs your business app logic and UI servers.
- Contains all Node code, bridge handlers, Prisma client, and built web assets.

2. bizflow-nginx
- Handles TLS certificates (HTTPS).
- Routes incoming web traffic to the correct internal app port.
- Gives one public entrypoint for multiple app components.

Why this split is good:
- Security and transport are separated from application code.
- Nginx can be restarted/reconfigured without rebuilding app image.
- Cleaner production operations and easier troubleshooting.

## 3) What Was Fixed

Main fixes applied:
- Enabled base path support for /bizflow in Next.js.
- Fixed Nginx location precedence so /app assets are not hijacked by generic static regex.
- Added static web UI serving for BizFlow on port 5180.
- Corrected startup command so bridge + web-ui + Next run together.
- Fixed plugin demo URL default to /app/ instead of localhost.
- Fixed duplicated module auto-launch behavior in workspace UI.
- Added request email backend (SMTP-based) and wired target inbox to medhatjachour8@gmail.com.
- Fixed build-time Prisma DB path so schema is created in the template DB used by bridge sessions.
- Seed/login fixed: setup account now exists and login works.
- Logo/favicon/base-path asset behavior fixed under /bizflow.

## 4) Files That Matter Most

Server orchestration and networking:
- docker-compose.yml
- Dockerfile
- nginx.conf

Website app:
- apps/website/next.config.ts
- apps/website/src/lib/site.ts
- apps/website/src/app/layout.tsx
- apps/website/src/app/manifest.ts

BizFlow bridge/web:
- apps/Bizflow/web/server.ts
- apps/Bizflow/web/serve-dist-web.cjs
- apps/Bizflow/web/session-db.ts

Custom request email backend:
- apps/website/src/app/api/requests/route.ts
- apps/website/src/lib/request-mail.ts

## 5) Day-to-Day Command Reference

Run these from the server in project folder:
- cd ~/bizflow

Stack status:
- docker compose ps

Build and start (or rebuild after code changes):
- docker compose up -d --build

Restart only nginx:
- docker compose restart nginx

Restart only app service:
- docker compose restart bizflow-app

View recent app logs:
- docker compose logs --tail=200 bizflow-app

Follow live app logs:
- docker compose logs -f bizflow-app

View recent nginx logs:
- docker compose logs --tail=200 nginx

Health checks:
- curl -s https://medhatjachour.tech/health
- curl -I https://medhatjachour.tech/bizflow
- curl -I https://medhatjachour.tech/app/

## 6) SMTP Setup For Request Emails

Current behavior:
- Requests are accepted and stored.
- API reports notified=false when SMTP is not configured.

Required env file on server:
- ~/bizflow/.env

Minimum values:
- REQUEST_MAIL_TO=medhatjachour8@gmail.com
- REQUEST_MAIL_FROM=medhatjachour8@gmail.com
- SMTP_HOST=smtp.gmail.com
- SMTP_PORT=587
- SMTP_SECURE=false
- SMTP_USER=medhatjachour8@gmail.com
- SMTP_PASS=<your_gmail_app_password>

Optional fallback values (enabled by default):
- REQUEST_MAIL_FALLBACK_DIRECT=true
- REQUEST_MAIL_HELO_NAME=medhatjachour.tech
- REQUEST_MAIL_FALLBACK_HOST=gmail-smtp-in.l.google.com
- REQUEST_MAIL_FALLBACK_PORT=25

After setting/changing SMTP values:
- docker compose up -d

Verify request endpoint:
- Send one test request from website form.
- Confirm API response has notified=true.

## 7) Setting the SMTP Password Safely

`SMTP_PASS` must be a **Gmail App Password** (16 characters, no spaces) — never the account
password, and never a placeholder value. Create one at <https://myaccount.google.com/apppasswords>.

Set it from a shell on the server so it never lands in shell history or a chat log:

```bash
cd ~/bizflow
read -rsp 'Gmail app password: ' APP_PASS && echo
sed -i "s|^SMTP_PASS=.*|SMTP_PASS=${APP_PASS}|" .env
unset APP_PASS
docker compose up -d
```

Verify the value was written without printing it:

- `grep -c '^SMTP_PASS=.\{16\}$' .env` -> `1`
- `grep '^SMTP_PASS=password$' .env` -> no output (a literal `password` would fail Gmail auth)

Verify the credentials actually authenticate (sends no mail):

```bash
docker run --rm -v ~/bizflow/.env:/env:ro node:20-alpine sh -c '
  npm install nodemailer --silent >/dev/null 2>&1
  node -e "const fs=require(\"fs\");const e={};for(const l of fs.readFileSync(\"/env\",\"utf8\").split(/\r?\n/)){const m=/^([A-Z0-9_]+)=(.*)$/.exec(l);if(m)e[m[1]]=m[2];}
  require(\"nodemailer\").createTransport({host:e.SMTP_HOST,port:+(e.SMTP_PORT||587),secure:String(e.SMTP_SECURE)===\"true\",auth:{user:e.SMTP_USER,pass:e.SMTP_PASS}})
    .verify().then(()=>console.log(\"SMTP_VERIFY=OK\")).catch(x=>console.log(\"SMTP_VERIFY=FAIL \"+x.message));"'
```

`.env` is git-ignored. Never commit it, and never paste the app password into a document.

## 8) Deployment Flow Used In This Project

The canonical path is CI, not manual scp:

1. Edit files locally and commit.
2. Push to `main` (or run the `Deploy to VPS` workflow manually via `workflow_dispatch`).
3. GitHub Actions builds/lints, syncs only the listed source files to
   `/tmp/bizflow-ci-deploy`, then runs `cp -a` onto `/home/medhat/bizflow` followed by
   `docker compose up -d --build`.
4. The workflow's smoke test gates the deploy (section 17).

Because CI overlays files with `cp -a` rather than running `git pull`, the git checkout on the
VPS is often **stale** — do not trust `git log` there to tell you what is deployed.

## 9) Manual / Hotfix Deploy (fallback)

Use only when CI is unavailable or you need a targeted fix. This is the procedure that was used
to repair the root-domain 403.

1. Upload changed files to a scratch directory on the host — never straight over the live file:
   - `scp nginx.conf docker-compose.yml medhat@168.231.107.207:/tmp/hf2/`
2. Validate the nginx config BEFORE applying it:
   - `docker cp /tmp/hf2/nginx.conf bizflow-nginx:/tmp/test.conf`
   - `docker exec bizflow-nginx nginx -t -c /tmp/test.conf`
3. Back up what you are about to replace:
   - `mkdir -p /tmp/nginx-hotfix && cd ~/bizflow && cp -a nginx.conf docker-compose.yml /tmp/nginx-hotfix/`
4. Apply and recreate only what changed:
   - `install -m 644 /tmp/hf2/nginx.conf nginx.conf`
   - `docker compose up -d nginx` — add `--build` only if application code changed
5. Verify: `docker compose ps`, then
   `docker logs bizflow-nginx --since 5m 2>&1 | grep -c '\[error\]'`,
   then the smoke-test URLs in section 17.

Rollback: copy the files back from `/tmp/nginx-hotfix/` and re-run `docker compose up -d nginx`.

Notes:
- Files authored on Windows carry CRLF line endings. nginx tolerates them, but the repo uses LF —
  normalise before uploading so hashes stay comparable.
- `medhat` is in the `docker` group but has no passwordless `sudo`, so any root-owned path
  (including a Docker-created `portfolio-dist`) must be written through a root container.

## 10) Troubleshooting Guide

A) Login fails with "An error occurred during login"
- Check logs:
  - docker compose logs --tail=200 bizflow-app
- If you see P2021 / missing User table:
  - The schema/template DB is wrong or stale.
  - Rebuild with latest Dockerfile:
    - docker compose up -d --build

B) /app loads but iframe stays on loading
- Check if /app assets return 200:
  - curl -I https://medhatjachour.tech/app/assets/index-d2fb67bb.js
- Ensure nginx location precedence includes:
  - location ^~ /app/

C) Logo/favicon missing
- Check:
  - curl -I https://medhatjachour.tech/bizflow/brand/bizflow-icon.png
  - curl -I https://medhatjachour.tech/bizflow/icon.png
- Confirm base-path-aware icon paths in website code.

D) Request emails not arriving
- Check API response for notifyReason.
- If SMTP_NOT_CONFIGURED:
  - Fill SMTP_HOST, SMTP_USER, SMTP_PASS in .env
  - Restart stack:
    - docker compose up -d
- If auth fails with Gmail:
  - Use a Gmail App Password, not account password.
  - Make sure SMTP_USER matches the sender mailbox.
  - Direct fallback is enabled by default; if SMTP fails, app tries direct MX delivery.
  - Some VPS providers block outbound port 25, which can break direct fallback too.

## 11) Useful One-Liners

Check seeded account exists:
- payload='{"channel":"auth:setupExists","args":[],"session":"check","only":"commerce"}'
- curl -s -X POST https://medhatjachour.tech/ipc -H 'Content-Type: application/json' -d "$payload"

Check login by API:
- payload='{"channel":"auth:login","args":[{"username":"setup","password":"setup123"}],"session":"check","only":"commerce"}'
- curl -s -X POST https://medhatjachour.tech/ipc -H 'Content-Type: application/json' -d "$payload"

## 12) Security Notes

- Never commit SMTP_PASS to git.
- Keep .env server-only.
- Use Gmail App Password, not your main Gmail password.
- Rotate app password if exposed.
- For production hardening later:
  - move from SQLite to managed DB
  - add secret manager
  - add uptime monitoring and alerting

## 13) Quick Recovery Checklist

If site breaks after deploy:
1. docker compose ps
2. docker compose logs --tail=200 bizflow-app
3. docker compose logs --tail=200 nginx
4. Validate:
   - /health
   - /bizflow
   - /app
5. Rebuild clean:
   - docker compose up -d --build
6. Re-test login and module dashboard.

## 14) Known Current Status

Working (verified 2026-09-13):
- Root domain `medhatjachour.tech` serves the Vite portfolio
- `www.bizflow.medhatjachour.tech` — website, `/admin/login`, `/portal/login`, `/api/prices`, sitemap, robots
- Plugin login with setup/setup123; module iframe reaches dashboard
- Custom request API with quote + persistence
- **SMTP verified** (`SMTP_VERIFY=OK` against `smtp.gmail.com:587` with a Gmail App Password),
  so license delivery email and request notifications actually send to medhatjachour8@gmail.com
- `User` / `Customer` / `License` / `Order` tables exist in `/data/bizflow/website.db`

Not yet live:
- **Stripe is not configured** — `POST /api/webhooks/stripe` returns
  `503 {"error":"Webhooks are not configured. See docs/STRIPE-SETUP.md."}`. Licenses are therefore
  issued manually from the admin dashboard (`/admin` -> Access control -> Issue a license).
- `License` and `Order` tables are empty, so no customer can activate yet.

Known issues to be aware of:
- `bizflow.medhatjachour.tech` (no `www`) has no DNS A record. The desktop app defaults to the
  `www` host, so add the A record only if you also want the bare subdomain to work.
- `support@bizflow.medhatjachour.tech` does not exist — the domain publishes no MX records.

## 15) Current Hostnames (subdomain layout)

The app was moved off the `/bizflow` and `/app` path prefixes onto subdomains.

| Host | Serves | Backend |
| --- | --- | --- |
| `medhatjachour.tech`, `www.medhatjachour.tech` | Static portfolio (Vite build) | nginx static from `./portfolio-dist` |
| `www.bizflow.medhatjachour.tech` | Next.js website + admin + portal | `bizflow_website` -> `bizflow-app:3000` |
| `www.bizflow.medhatjachour.tech/demo/` | BizFlow web UI demo | `bizflow_web` -> `bizflow-app:5180` |
| `www.bizflow.medhatjachour.tech/ipc`, `/health` | HTTP bridge | `bizflow_bridge` -> `bizflow-app:8787` |
| `www.transhub.medhatjachour.tech` | TransHub web | `transhub-web:80` |
| `api.transhub.medhatjachour.tech` | TransHub API | `transhub-api:4000` |

Notes:
- Always use the `www.` prefix: `bizflow.medhatjachour.tech` (no `www`) has no DNS A record and
  does not resolve. The desktop app's license API defaults to `https://www.bizflow.medhatjachour.tech`
  for exactly this reason, so a request never fails with ENOTFOUND.
- `GET /bizflow` and `/bizflow/*` on the root domain 301-redirect to the `www.bizflow` subdomain.

### Deploying the portfolio

The portfolio lives in a **separate repository** (a Vite + React SPA). It is not part of this
monorepo and is deliberately **not** synced by the deploy workflow, so it is deployed out-of-band:

1. Build it in the portfolio repo: `npm run build` (Vite reads `VITE_*` keys from `.env`).
2. Package and extract it into the host directory nginx mounts:

```bash
tar -czf portfolio-dist.tar.gz -C dist .
scp portfolio-dist.tar.gz medhat@168.231.107.207:/tmp/
ssh medhat@168.231.107.207 "\
  docker run --rm -v /tmp/portfolio-dist.tar.gz:/src.tar.gz:ro \
    -v /home/medhat/bizflow/portfolio-dist:/target alpine \
    sh -c 'tar -xzf /src.tar.gz -C /target && chown -R 1000:1000 /target'"
docker compose up -d nginx
```

The container step is required because Docker creates `/home/medhat/bizflow/portfolio-dist` as
`root:root` when the directory is missing, and `medhat` cannot write into it (`sudo` needs a
password). `medhat` is in the `docker` group, so the root container is the way in.

> **Build keys are baked in at build time.** The portfolio `.env` must define both
> `VITE_GEMINI_API_KEY` and `VITE_WEB3FORMS_KEY`, otherwise the AI widget and the contact form
> break silently in the built bundle with no build error.

## 16) Troubleshooting: Root Domain Returns 403 or 500

Symptom:
- `https://medhatjachour.tech/` returns **403 Forbidden** (`nginx/...`)
- any other path (`/robots.txt`, `/favicon.ico`, ...) returns **500 Internal Server Error**

Cause:
`nginx.conf` serves the root domain from `/usr/share/nginx/html`, which `docker-compose.yml`
bind-mounts from `./portfolio-dist`. When that directory is missing on the host, **Docker
silently creates an empty root-owned directory instead of failing**. With an empty web root:
- `GET /` -> `directory index of "/usr/share/nginx/html/" is forbidden` (403)
- any other path -> `rewrite or internal redirection cycle while internally redirecting to "/index.html"` (500),
  because `try_files $uri $uri/ /index.html` falls back to a file that does not exist.

Fix:
- Make sure `./portfolio-dist` exists on the host and contains `index.html` (see section 15).
- `docker compose up -d nginx` so the mount is picked up.

Verify:
- `docker exec bizflow-nginx ls -la /usr/share/nginx/html` -> must list `index.html` and `assets/`
- `curl -o /dev/null -w '%{http_code}\n' https://medhatjachour.tech/` -> `200`
- `curl -o /dev/null -w '%{http_code}\n' https://medhatjachour.tech/assets/nope.js` -> `404` (not 500)

Rule: never bind-mount a directory that is absent from the checkout — a missing mount source
becomes an empty directory with no error. `portfolio-dist/` is therefore git-ignored.

Note: `nginx` writes its error log to stderr, so read it with `docker logs bizflow-nginx`.
`tail /var/log/nginx/error.log` inside the container hangs — it is a symlink to stderr.

## 17) Deploy-Time Smoke Test

`.github/workflows/deploy.yml` fails the deploy unless all of these return 200:
- `www.bizflow.medhatjachour.tech/`, `/robots.txt`, `/sitemap.xml`, `/admin/login`, `/portal/login`, `/api/prices`
- `medhatjachour.tech/`, `/favicon.ico`, `/profile.png`

It also asserts that `medhatjachour.tech/assets/does-not-exist.js` returns **404**. That
exact-status check is the regression guard for the empty-web-root incident: an empty web root
produces 403/500 instead of 404, and the `^~ /assets/` block must never let a missing hashed
asset fall back to `index.html`.
