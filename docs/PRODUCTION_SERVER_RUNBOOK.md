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

## 7) Exact Command Example If Password Is "password"

If your app password is exactly password:

APP_PASS='password'
sed -i "s|^SMTP_PASS=.*|SMTP_PASS=$APP_PASS|" .env
docker compose up -d

Result in .env will be:
- SMTP_PASS=password

Verify:
- grep '^SMTP_PASS=' .env

## 8) Safe SMTP Command Variant (No Prompt)

If you want to set it directly in one command:
- sed -i 's|^SMTP_PASS=.*|SMTP_PASS=password|' .env
- docker compose up -d

## 9) Deployment Flow Used In This Project

1. Edit files locally.
2. Copy changed files to server (scp).
3. Rebuild and restart:
- ssh medhat@168.231.107.207 "cd ~/bizflow && docker compose up -d --build"
4. Validate endpoints and logs.
5. Validate browser behavior on /bizflow and /app.

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

Working:
- Plugin login with setup/setup123
- Module iframe reaches dashboard
- Logo and favicon path behavior under /bizflow
- Custom request API with quote + persistence

Pending until SMTP_PASS is set:
- Real email delivery to medhatjachour8@gmail.com
