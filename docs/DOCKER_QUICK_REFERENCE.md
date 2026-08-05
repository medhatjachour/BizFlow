# Docker Quick Reference

## Local Development

```bash
# Start everything (website + bridge + web app)
docker-compose up --build

# Start in background
docker-compose up -d --build

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f bizflow-app

# Stop services
docker-compose down

# Remove volumes (delete database)
docker-compose down -v

# Restart
docker-compose restart
```

## Production Commands

```bash
# SSH into VPS
ssh root@your.vps.ip

# Navigate to app
cd /opt/bizflow

# Start services
docker-compose up -d

# Check status
docker ps

# View logs
docker-compose logs -f

# Restart after changes
docker-compose up -d --build

# Stop everything
docker-compose down

# Stop specific service
docker-compose stop bizflow-app
```

## Debugging

```bash
# Access container shell
docker exec -it bizflow-app sh

# Inside container, run commands
ls /data/bizflow/
sqlite3 /data/bizflow/database.db ".tables"
node -e "console.log(process.env.DATABASE_URL)"

# Check container stats
docker stats bizflow-app

# View container processes
docker top bizflow-app

# Inspect container details
docker inspect bizflow-app
```

## Database Operations

```bash
# Backup database
docker cp bizflow-app:/data/bizflow/database.db ./backup-$(date +%Y%m%d).db

# Restore database
docker cp ./backup-20260804.db bizflow-app:/data/bizflow/database.db
docker restart bizflow-app

# Check database size
docker exec bizflow-app du -h /data/bizflow/database.db

# Run database integrity check
docker exec bizflow-app sqlite3 /data/bizflow/database.db "PRAGMA integrity_check;"

# Backup entire volume
docker run --rm -v bizflow-app_bizflow-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/database-backup.tar.gz /data

# Restore from backup
docker run --rm -v bizflow-app_bizflow-data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/database-backup.tar.gz -C /
```

## Building & Deployment

```bash
# Build image
docker build -t bizflow:latest .

# Build with no cache
docker build --no-cache -t bizflow:latest .

# Push to registry (Docker Hub)
docker tag bizflow:latest yourusername/bizflow:latest
docker push yourusername/bizflow:latest

# Build from specific dockerfile
docker build -f Dockerfile.prod -t bizflow:prod .

# Check image size
docker images bizflow
```

## Volume & Network Management

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect bizflow-app_bizflow-data

# List networks
docker network ls

# Inspect network
docker network inspect bizflow-app_bizflow-network

# Connect container to network
docker network connect bizflow-network container-id

# Disconnect
docker network disconnect bizflow-network container-id
```

## Troubleshooting

```bash
# Check logs for errors
docker-compose logs -f | grep -i error

# Check port usage
docker port bizflow-app

# Test connectivity to container
docker exec bizflow-app curl http://localhost:8787/health

# View environment variables
docker exec bizflow-app env

# Check disk space
docker exec bizflow-app df -h

# Check memory usage
docker exec bizflow-app free -h

# View running processes
docker exec bizflow-app ps aux

# Check if port is accessible from host
curl http://localhost:3000
curl http://localhost:5180
curl http://localhost:8787/health
```

## Cleanup & Maintenance

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove unused networks
docker network prune

# Remove unused containers
docker container prune

# Remove everything (CAREFUL!)
docker system prune -a --volumes

# View disk usage
docker system df

# Update image to latest
docker pull node:20-alpine
docker-compose build --no-cache

# Export logs to file
docker-compose logs > all-logs.txt

# Save image as tar file
docker save bizflow:latest -o bizflow-image.tar

# Load image from tar
docker load -i bizflow-image.tar
```

## Environment Variables

```bash
# View container environment
docker exec bizflow-app env | sort

# Set environment variable in docker-compose.yml
# services:
#   bizflow-app:
#     environment:
#       - NODE_ENV=production
#       - DATABASE_URL=file:/data/bizflow/database.db

# Or via .env file
# Create .env in same directory as docker-compose.yml
echo "NODE_ENV=production" > .env
```

## SSL/TLS Management

```bash
# Check certificate expiration
openssl x509 -enddate -noout -in /opt/bizflow/ssl/cert.pem

# Renew Let's Encrypt certificate
certbot renew --force-renewal

# Copy renewed cert to docker volume
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /opt/bizflow/ssl/cert.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /opt/bizflow/ssl/key.pem

# Restart to apply new cert
docker-compose restart

# Generate self-signed cert
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

## Monitoring

```bash
# Watch container stats in real-time
watch docker stats bizflow-app

# Get container logs with timestamps
docker-compose logs --timestamps

# Follow logs and grep for specific text
docker-compose logs -f | grep -i "database\|error\|warning"

# Check container uptime
docker ps --format "table {{.ID}}\t{{.Status}}\t{{.Names}}"

# View container events
docker events --filter type=container

# Monitor network traffic
docker stats --no-stream

# CPU/Memory history (requires stats collection)
docker stats --no-stream --all
```

## Container Management

```bash
# Rename container
docker rename old-name new-name

# Pause/resume container
docker pause bizflow-app
docker unpause bizflow-app

# Update container without rebuilding
docker-compose up -d --no-build

# View changes to container filesystem
docker diff bizflow-app

# Commit container to image (create snapshot)
docker commit bizflow-app bizflow:snapshot

# Export container
docker export bizflow-app > bizflow-container.tar

# Import container
docker import bizflow-container.tar bizflow:imported
```

## VPS/Remote Deployment

```bash
# SSH into VPS
ssh root@your.vps.ip

# Run deployment script
curl https://raw.githubusercontent.com/your-org/bizflow/main/deploy-docker.sh \
  | bash -s yourdomain.com admin@yourdomain.com

# Or run locally downloaded script
scp deploy-docker.sh root@your.vps.ip:/tmp/
ssh root@your.vps.ip "bash /tmp/deploy-docker.sh yourdomain.com admin@yourdomain.com"

# View remote containers
ssh root@your.vps.ip "docker ps"

# View remote logs
ssh root@your.vps.ip "docker-compose -f /opt/bizflow/docker-compose.yml logs -f"

# Copy file from VPS to local
scp root@your.vps.ip:/opt/bizflow/data/bizflow/database.db ./

# Copy file from local to VPS
scp ./database.db root@your.vps.ip:/opt/bizflow/data/bizflow/
```

---

## Tips & Tricks

- **Multiple instances:** `docker-compose up -d --scale bizflow-app=3`
- **View live file changes:** `docker logs -f --follow-log bizflow-app`
- **Quick restart:** `docker-compose restart && docker-compose logs -f`
- **Check DNS resolution:** `docker exec bizflow-app nslookup google.com`
- **Test endpoint:** `docker exec bizflow-app curl -v http://localhost:8787/health`
- **Watch for memory leaks:** `docker stats --no-stream --all | sort -k4 -rn`

---

## GitHub Sync vs Manual Server Push

### Recommended approach

Use a GitHub-synced workflow (push to GitHub, then pull on server) instead of
manual `scp` for every code change.

Manual copy is okay for emergencies, but GitHub sync is safer and easier to
maintain.

### Why GitHub sync is better

- One source of truth (`main`)
- Easy rollback with commit SHA
- Clear history of production changes
- Lower risk of missing files during deploy

## Change -> Server Deployment Flow

### 1) Local machine

```bash
git add .
git commit -m "describe your change"
git push origin main
```

### 2) Server deploy

```bash
ssh medhat@your.vps.ip
cd ~/bizflow

git fetch origin
git checkout main
git pull --ff-only origin main

docker compose up -d --build bizflow-app
docker compose ps
docker compose logs --tail=120 bizflow-app
```

### 3) Rollback if needed

```bash
cd ~/bizflow
git log --oneline -n 10
git checkout <last_good_commit>
docker compose up -d --build bizflow-app
```

## One-liner Deploy (Fast Path)

```bash
ssh medhat@your.vps.ip "cd ~/bizflow && git pull --ff-only origin main && docker compose up -d --build bizflow-app && docker compose ps"
```

## Optional Async Auto-Deploy

If you want auto-sync with GitHub ("async"), use one of these:

- GitHub Actions -> SSH -> `git pull` + `docker compose up -d --build`
- GitHub webhook -> server script doing the same

Recommended guardrails:

- Auto-deploy only from `main`
- Use pull requests before merge to `main`
- Keep rollback commands ready

## When to Use SCP

Use `scp` only for:

- Emergency hotfix if git is unavailable
- Backups, logs, and artifacts
- Temporary debug files

After an SCP hotfix, commit and push the same change to GitHub immediately so
server and repo do not drift.
