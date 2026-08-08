# TransHub VPS Docker Setup

This guide is the TransHub counterpart to the BizFlow deployment notes. It assumes a VPS with Docker and Docker Compose, an nginx reverse proxy, and Let’s Encrypt certificates.

Use it as the template when you are ready to launch TransHub. The structure is intentionally the same as BizFlow’s VPS flow so the two apps can live side by side with consistent ops.

---

## 1. Prerequisites

You need:

- A VPS with Ubuntu or similar Linux
- Docker Engine and Docker Compose plugin installed
- A domain or subdomain for TransHub, for example `transhub.medhatjachour.tech`
- DNS records pointing that hostname to the VPS IP
- A Linux user with sudo access

Recommended ports:

- `80` and `443` for nginx
- Your app port for the TransHub container, for example `3001`
- Any internal API or bridge ports you need, kept private unless required

---

## 2. Suggested directory layout

Keep the deployment files in one folder on the VPS, for example:

```text
/home/medhat/transhub
├─ docker-compose.yml
├─ nginx.conf
├─ .env
├─ ssl/
└─ data/
```

If you use a separate app repo later, keep the same deployment shape so the reverse proxy and certificate flow stay simple.

---

## 3. Docker Compose template

Use a compose file with the same pattern BizFlow uses:

- one app service
- one nginx service
- optional admin/logging services if needed
- a persistent data volume or bind mount

Example skeleton:

```yaml
services:
  transhub-app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: transhub-app
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_SITE_URL: https://transhub.medhatjachour.tech
      NEXTAUTH_URL: https://transhub.medhatjachour.tech
      DATABASE_URL: file:/data/transhub/database.db
    volumes:
      - transhub-data:/data/transhub
    restart: unless-stopped
    ports:
      - "3001:3000"

  nginx:
    image: nginx:alpine
    container_name: transhub-nginx
    depends_on:
      - transhub-app
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    restart: unless-stopped

volumes:
  transhub-data:
    driver: local
```

Adjust the internal port if your app does not listen on `3000`.

---

## 4. Nginx template

Use a host-based nginx config, not a path-based one.

Recommended behavior:

- `transhub.medhatjachour.tech` serves the TransHub app
- the apex domain can show a chooser page or a separate website
- `www.transhub.medhatjachour.tech` can redirect to the canonical host if you add DNS for it

Example pattern:

```nginx
server {
    listen 80;
    server_name transhub.medhatjachour.tech;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name transhub.medhatjachour.tech;

    ssl_certificate /etc/nginx/ssl/transhub-cert.pem;
    ssl_certificate_key /etc/nginx/ssl/transhub-key.pem;

    location / {
        proxy_pass http://transhub-app:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

If you later add a root chooser page like BizFlow, keep it in a separate server block for the apex domain.

---

## 5. TLS certificate issuance

If nginx is already bound to port 80, stop it before using Certbot standalone.

Issue the cert:

```bash
sudo certbot certonly --standalone \
  --non-interactive \
  --agree-tos \
  --register-unsafely-without-email \
  --cert-name transhub.medhatjachour.tech \
  -d transhub.medhatjachour.tech
```

If you later add `www.transhub.medhatjachour.tech`, include it in the same command only after the DNS record exists.

After issuance, copy the files into the nginx mount if your compose file expects that:

```bash
sudo cp /etc/letsencrypt/live/transhub.medhatjachour.tech/fullchain.pem ssl/transhub-cert.pem
sudo cp /etc/letsencrypt/live/transhub.medhatjachour.tech/privkey.pem ssl/transhub-key.pem
```

Restart nginx after the copy.

---

## 6. Deployment flow

A typical update flow looks like this:

1. Pull or sync the latest app code to the VPS.
2. Copy the deployment files (`docker-compose.yml`, `nginx.conf`, `.env`).
3. Rebuild the image with Docker Compose.
4. Restart the stack.
5. Smoke test the HTTPS endpoint.

Example:

```bash
cd /home/medhat/transhub
docker compose up -d --build
docker compose ps
```

Smoke test with curl:

```bash
curl -I https://transhub.medhatjachour.tech/
```

---

## 7. Environment variables

At minimum, expect values like these:

- `NEXT_PUBLIC_SITE_URL`
- `NEXTAUTH_URL`
- `DATABASE_URL`
- `ADMIN_PASSWORD` or equivalent admin seed password
- SMTP values if TransHub sends mail
- Any payment or webhook keys if TransHub has commerce features

Keep public URL values aligned with the host you actually serve.

---

## 8. Production checklist

Before going live, verify:

- DNS points to the VPS
- nginx serves the correct certificate
- the app responds on the public hostname
- the root domain does not conflict with the subdomain
- health checks pass after restart
- logs show no certificate or proxy errors

---

## 9. Notes for later

- If TransHub gets its own root chooser page, keep it separate from BizFlow.
- If you add a `www` hostname, do not request the cert until DNS exists.
- Keep the deployment layout consistent with BizFlow so automation can be reused.
