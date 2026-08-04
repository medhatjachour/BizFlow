# Docker Deployment Guide

## Overview

BizFlow runs completely in Docker, making deployment to any cloud server easy:

- **Dockerfile** — Multi-stage build for optimized production image
- **docker-compose.yml** — Local development and single-command deployment
- **nginx.conf** — Reverse proxy for HTTPS + routing
- **Ports:**
  - `3000` — Nebula website
  - `5180` — BizFlow web UI
  - `8787` — HTTP bridge (IPC handlers)

---

## Quick Start (Local Docker)

### Prerequisites
- Docker Desktop installed ([download](https://www.docker.com/products/docker-desktop))
- ~2GB RAM available for containers
- 500MB disk space

### Run Everything Locally

```bash
# 1. Clone/navigate to repo
cd BizFlow

# 2. Build and start all services
docker-compose up --build

# 3. Wait for startup (~60 seconds)
# Bridge will show: "Bridge server listening on port 8787"
# Nebula will show: "ready - started server on 0.0.0.0:3000"

# 4. Open in browser
# Website:   http://localhost:3000
# BizFlow:   http://localhost:5180
# Bridge:    http://localhost:8787/health
```

### Verify Services Running

```bash
# Check all containers
docker ps

# View logs for specific service
docker logs bizflow-app

# Access container shell for debugging
docker exec -it bizflow-app sh
```

---

## Production Deployment (VPS)

### Prerequisites
- VPS with Docker installed (Ubuntu 22.04+ recommended)
- Domain name (e.g., yourdomain.com)
- SSL certificate (auto-generate via Let's Encrypt)

### Step 1: Prepare VPS

```bash
# SSH into VPS
ssh root@your.vps.ip

# Install Docker + Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create app directory
mkdir -p /opt/bizflow
cd /opt/bizflow

# Create data directory for persistent database
mkdir -p data/bizflow
chmod 777 data/bizflow
```

### Step 2: Copy Files to VPS

From your local machine:

```bash
# Copy monorepo to VPS
scp -r ./ root@your.vps.ip:/opt/bizflow/

# Or clone repo directly on VPS
cd /opt/bizflow
git clone https://github.com/your-org/bizflow-repo .
```

### Step 3: Generate SSL Certificate

```bash
# On VPS, generate self-signed cert (for testing)
mkdir -p /opt/bizflow/ssl
openssl req -x509 -newkey rsa:4096 -keyout /opt/bizflow/ssl/key.pem \
  -out /opt/bizflow/ssl/cert.pem -days 365 -nodes \
  -subj "/CN=yourdomain.com"

# OR use Let's Encrypt (recommended for production)
sudo apt-get install certbot -y
sudo certbot certonly --standalone -d yourdomain.com
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/bizflow/ssl/cert.pem
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /opt/bizflow/ssl/key.pem
sudo chown 1000:1000 /opt/bizflow/ssl/*.pem
```

### Step 4: Configure Environment

Create `/opt/bizflow/.env.production`:

```bash
NODE_ENV=production
DATABASE_URL=file:/data/bizflow/database.db
BRIDGE_PORT=8787
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-secret-key-here
```

### Step 5: Start Services

```bash
cd /opt/bizflow

# Build and start
docker-compose -f docker-compose.yml up -d

# Verify services
docker ps
docker logs bizflow-app

# Test endpoints
curl http://localhost:8787/health
curl http://localhost:3000
```

### Step 6: Configure Firewall

```bash
# Allow HTTP/HTTPS
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### Step 7: Update DNS

Point your domain's DNS records to VPS IP:

```
yourdomain.com  A  168.231.107.207
www.yourdomain.com  CNAME  yourdomain.com
```

### Step 8: Access Application

- **Website:** https://yourdomain.com
- **Web App:** https://yourdomain.com/app
- **Bridge health:** https://yourdomain.com/health

---

## Managing Docker Containers

### View Logs

```bash
# Real-time logs
docker logs -f bizflow-app

# Last 100 lines
docker logs --tail=100 bizflow-app

# Search for errors
docker logs bizflow-app | grep -i error
```

### Restart Services

```bash
# Restart specific container
docker restart bizflow-app

# Restart all services
docker-compose restart

# Full rebuild (if dependencies changed)
docker-compose up -d --build
```

### Backup Database

```bash
# Copy database from container to local
docker cp bizflow-app:/data/bizflow/database.db ./backup-$(date +%Y%m%d).db

# Or backup persistent volume
docker run --rm -v bizflow-app_bizflow-data:/data -v $(pwd)/backups:/backup \
  alpine tar czf /backup/database-$(date +%Y%m%d).tar.gz /data
```

### Restore Database

```bash
# Copy database into container
docker cp ./backup-20260804.db bizflow-app:/data/bizflow/database.db

# Restart to apply
docker restart bizflow-app
```

### Shell Access for Debugging

```bash
# Access container shell
docker exec -it bizflow-app sh

# Inside container, run commands
node -e "console.log(process.env.DATABASE_URL)"
ls -la /data/bizflow/
sqlite3 /data/bizflow/database.db ".tables"
```

---

## Scaling & High Availability

### Multiple Container Instances

For higher traffic, run multiple app instances behind load balancer:

```yaml
# docker-compose.yml - extended
services:
  bizflow-app-1:
    build: .
    environment:
      - INSTANCE=1
    volumes:
      - bizflow-data:/data/bizflow
    networks:
      - bizflow-network

  bizflow-app-2:
    build: .
    environment:
      - INSTANCE=2
    volumes:
      - bizflow-data:/data/bizflow
    networks:
      - bizflow-network

  # Nginx automatically load balances across instances
  nginx:
    # ... nginx config uses upstream with multiple servers
```

Start with:
```bash
docker-compose up -d --scale bizflow-app=3
```

### Kubernetes Deployment

For enterprise deployments, use Kubernetes:

```bash
# Build and push image to registry
docker build -t your-registry/bizflow:latest .
docker push your-registry/bizflow:latest

# Deploy on Kubernetes
kubectl apply -f k8s/
```

See `docs/KUBERNETES_DEPLOYMENT.md` for full setup.

---

## Troubleshooting

### "Cannot connect to database"

```bash
# Check database file exists
docker exec bizflow-app ls -la /data/bizflow/

# Verify permissions
docker exec bizflow-app stat /data/bizflow/database.db

# Check Prisma client generated
docker exec bizflow-app ls -la apps/bizflow/node_modules/.prisma/
```

### "Bridge health check failing"

```bash
# Test bridge connectivity
docker exec bizflow-app curl -v http://localhost:8787/health

# Check bridge is running
docker exec bizflow-app ps aux | grep node
```

### "Port 3000 already in use"

```bash
# Find what's using port 3000
lsof -i :3000

# Or change docker-compose port mapping
# Change "3000:3000" to "3001:3000"
```

### "Out of memory"

```bash
# Increase Docker memory limit in docker-compose.yml
services:
  bizflow-app:
    mem_limit: 2gb
    memswap_limit: 2gb
```

### "SSL certificate errors"

```bash
# Verify certificate is readable
docker exec bizflow-app ls -la /etc/nginx/ssl/

# Test certificate validity
docker run --rm -v /opt/bizflow/ssl:/certs alpine \
  openssl x509 -in /certs/cert.pem -text -noout

# Renew Let's Encrypt certificate
sudo certbot renew --force-renewal
```

---

## Environment Variables

Create `.env` or `.env.production` in project root:

```bash
# Node environment
NODE_ENV=production

# Database (auto-created in Docker)
DATABASE_URL=file:/data/bizflow/database.db

# Bridge server
BRIDGE_PORT=8787
BRIDGE_MAX_SESSIONS=50
BRIDGE_SESSION_TTL_MS=1800000

# Nebula/Next.js
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-random-secret-here
NEXT_PUBLIC_API_URL=https://yourdomain.com/ipc

# SMTP for email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Stripe (if using Nebula payments)
NEXT_PUBLIC_STRIPE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
```

---

## Continuous Deployment (CD)

### GitHub Actions Workflow

Create `.github/workflows/deploy-docker.yml`:

```yaml
name: Deploy to VPS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build Docker image
        run: docker build -t bizflow:latest .

      - name: Deploy to VPS
        env:
          VPS_IP: ${{ secrets.VPS_IP }}
          VPS_SSH_KEY: ${{ secrets.VPS_SSH_KEY }}
        run: |
          mkdir -p ~/.ssh
          echo "$VPS_SSH_KEY" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          
          ssh -i ~/.ssh/deploy_key root@$VPS_IP << 'EOF'
            cd /opt/bizflow
            git pull origin main
            docker-compose up -d --build
            docker image prune -f
          EOF
```

---

## Monitoring & Logging

### View Metrics

```bash
# Container stats (CPU, memory, network)
docker stats bizflow-app

# Long-term monitoring with Prometheus
# See docs/MONITORING.md for setup
```

### Centralized Logging

```bash
# Send Docker logs to file
docker-compose logs -f > /var/log/bizflow.log

# Or setup ELK stack (Elasticsearch, Logstash, Kibana)
# See docs/LOGGING_SETUP.md
```

---

## Production Checklist

- [ ] Domain name configured with DNS pointing to VPS
- [ ] SSL certificate installed and valid (HTTPS working)
- [ ] Firewall rules configured (80, 443 open, others closed)
- [ ] Database backup script scheduled (daily)
- [ ] Environment variables set in `.env.production`
- [ ] Docker image built and tested locally
- [ ] Health checks passing (`curl https://yourdomain.com/health`)
- [ ] Logs monitored for errors
- [ ] Monitoring and alerting setup
- [ ] Auto-restart configured (`restart: unless-stopped`)
- [ ] Resource limits set (memory, CPU)

---

## Next Steps

1. **Test locally** — Run `docker-compose up` and verify all services
2. **Deploy to VPS** — Follow "Production Deployment" section
3. **Configure domain** — Point DNS to VPS IP
4. **Monitor** — Setup log aggregation and alerts
5. **Backup** — Schedule daily database backups

See related docs:
- [NETWORK_DATABASE_SHARING.md](NETWORK_DATABASE_SHARING.md) — Multi-PC database setup
- [DEPLOYMENT_HOSTINGER.md](DEPLOYMENT_HOSTINGER.md) — VPS-specific setup
