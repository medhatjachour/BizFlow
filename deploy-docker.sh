#!/bin/bash

# BizFlow Docker Deployment Script
# Automates setup on Ubuntu 22.04+ VPS
# Usage: sudo bash deploy-docker.sh [domain] [email]

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   BizFlow Docker Deployment Script${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}❌ This script must be run as root${NC}"
   exit 1
fi

# Get parameters
DOMAIN=${1:-yourdomain.com}
EMAIL=${2:-admin@yourdomain.com}
APP_DIR="/opt/bizflow"

echo -e "\n${YELLOW}Configuration:${NC}"
echo "  Domain: $DOMAIN"
echo "  Email: $EMAIL"
echo "  App Directory: $APP_DIR"
echo ""
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
fi

# ============================================================================
# 1. Update system
# ============================================================================
echo -e "\n${YELLOW}📦 Step 1: Updating system packages...${NC}"
apt-get update
apt-get upgrade -y
apt-get install -y curl wget git openssl ufw

# ============================================================================
# 2. Install Docker
# ============================================================================
echo -e "\n${YELLOW}🐳 Step 2: Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    sh /tmp/get-docker.sh
    echo -e "${GREEN}✓ Docker installed${NC}"
else
    echo -e "${GREEN}✓ Docker already installed${NC}"
fi

# ============================================================================
# 3. Install Docker Compose
# ============================================================================
echo -e "\n${YELLOW}🔧 Step 3: Installing Docker Compose...${NC}"
if ! command -v docker-compose &> /dev/null; then
    DOCKER_CONFIG=${DOCKER_CONFIG:-$HOME/.docker}
    mkdir -p $DOCKER_CONFIG/cli-plugins
    curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o $DOCKER_CONFIG/cli-plugins/docker-compose
    chmod +x $DOCKER_CONFIG/cli-plugins/docker-compose
    ln -s $DOCKER_CONFIG/cli-plugins/docker-compose /usr/local/bin/docker-compose
    echo -e "${GREEN}✓ Docker Compose installed${NC}"
else
    echo -e "${GREEN}✓ Docker Compose already installed${NC}"
fi

# ============================================================================
# 4. Create app directories
# ============================================================================
echo -e "\n${YELLOW}📁 Step 4: Creating app directories...${NC}"
mkdir -p $APP_DIR/data/bizflow
mkdir -p $APP_DIR/ssl
mkdir -p $APP_DIR/backups
chmod 777 $APP_DIR/data/bizflow
echo -e "${GREEN}✓ Directories created${NC}"

# ============================================================================
# 5. Clone or update repository
# ============================================================================
echo -e "\n${YELLOW}📥 Step 5: Getting application code...${NC}"
if [ -d "$APP_DIR/.git" ]; then
    echo "Updating existing repository..."
    cd $APP_DIR
    git pull origin main
else
    echo "Cloning repository..."
    read -p "Enter Git repository URL: " REPO_URL
    git clone $REPO_URL $APP_DIR
    cd $APP_DIR
fi
echo -e "${GREEN}✓ Repository ready${NC}"

# ============================================================================
# 6. Generate SSL certificate with Let's Encrypt
# ============================================================================
echo -e "\n${YELLOW}🔐 Step 6: Setting up SSL certificate...${NC}"
if ! command -v certbot &> /dev/null; then
    apt-get install -y certbot
fi

if [ ! -f "$APP_DIR/ssl/cert.pem" ]; then
    echo "Generating SSL certificate for $DOMAIN..."
    certbot certonly --standalone -d $DOMAIN --non-interactive --agree-tos --email $EMAIL --http-01-port 80
    
    # Copy to app directory
    cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $APP_DIR/ssl/cert.pem
    cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $APP_DIR/ssl/key.pem
    chmod 644 $APP_DIR/ssl/cert.pem
    chmod 644 $APP_DIR/ssl/key.pem
    echo -e "${GREEN}✓ SSL certificate installed${NC}"
else
    echo -e "${GREEN}✓ SSL certificate already exists${NC}"
fi

# ============================================================================
# 7. Create environment file
# ============================================================================
echo -e "\n${YELLOW}⚙️  Step 7: Creating environment configuration...${NC}"
if [ ! -f "$APP_DIR/.env.production" ]; then
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
    
    cat > "$APP_DIR/.env.production" << EOF
NODE_ENV=production
DATABASE_URL=file:/data/bizflow/database.db
BRIDGE_PORT=8787
BRIDGE_MAX_SESSIONS=50
BRIDGE_SESSION_TTL_MS=1800000
NEXTAUTH_URL=https://$DOMAIN
NEXTAUTH_SECRET=$NEXTAUTH_SECRET
NEXT_PUBLIC_API_URL=https://$DOMAIN/ipc
LOG_LEVEL=info
EOF
    
    echo -e "${GREEN}✓ .env.production created${NC}"
    echo "  NEXTAUTH_SECRET: $NEXTAUTH_SECRET"
else
    echo -e "${GREEN}✓ .env.production already exists${NC}"
fi

# ============================================================================
# 8. Setup firewall
# ============================================================================
echo -e "\n${YELLOW}🔥 Step 8: Configuring firewall...${NC}"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp      # SSH
ufw allow 80/tcp      # HTTP
ufw allow 443/tcp     # HTTPS
ufw --force enable
echo -e "${GREEN}✓ Firewall configured${NC}"

# ============================================================================
# 9. Build Docker image
# ============================================================================
echo -e "\n${YELLOW}🏗️  Step 9: Building Docker image (this may take 5-10 minutes)...${NC}"
cd $APP_DIR
docker-compose build
echo -e "${GREEN}✓ Docker image built${NC}"

# ============================================================================
# 10. Start services
# ============================================================================
echo -e "\n${YELLOW}▶️  Step 10: Starting services...${NC}"
docker-compose up -d
echo -e "${GREEN}✓ Services started${NC}"

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 10

# ============================================================================
# 11. Setup backup automation
# ============================================================================
echo -e "\n${YELLOW}💾 Step 11: Setting up automated backups...${NC}"
BACKUP_SCRIPT="$APP_DIR/backup.sh"
cat > "$BACKUP_SCRIPT" << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/bizflow/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
docker exec bizflow-app cp /data/bizflow/database.db $BACKUP_DIR/database_$TIMESTAMP.db
# Keep last 30 days of backups
find $BACKUP_DIR -name "database_*.db" -mtime +30 -delete
EOF
chmod +x "$BACKUP_SCRIPT"

# Add to crontab for daily backups
(crontab -l 2>/dev/null; echo "0 2 * * * $BACKUP_SCRIPT") | crontab -
echo -e "${GREEN}✓ Daily backups scheduled${NC}"

# ============================================================================
# 12. Setup SSL auto-renewal
# ============================================================================
echo -e "\n${YELLOW}🔄 Step 12: Setting up SSL auto-renewal...${NC}"
cat > /etc/cron.d/certbot-renewal << EOF
0 3 * * * root certbot renew --quiet && cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem $APP_DIR/ssl/cert.pem && cp /etc/letsencrypt/live/$DOMAIN/privkey.pem $APP_DIR/ssl/key.pem && docker restart bizflow-app
EOF
echo -e "${GREEN}✓ SSL auto-renewal configured${NC}"

# ============================================================================
# 13. Verify services
# ============================================================================
echo -e "\n${YELLOW}✓ Step 13: Verifying services...${NC}"
echo ""

# Wait a moment for container to be fully ready
sleep 5

# Check bridge health
if curl -s http://localhost:8787/health > /dev/null; then
    echo -e "${GREEN}✓ Bridge health check: PASS${NC}"
else
    echo -e "${RED}✗ Bridge health check: FAIL${NC}"
fi

# Check website
if curl -s -k https://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✓ Website: PASS${NC}"
else
    echo -e "${RED}✗ Website: FAIL${NC}"
fi

# ============================================================================
# Summary
# ============================================================================
echo -e "\n${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   ✅ Deployment Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}Access your application:${NC}"
echo "  🌐 Website:  https://$DOMAIN"
echo "  📱 Web App:  https://$DOMAIN/app"
echo "  🏥 Health:   https://$DOMAIN/health"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo "  View logs:        docker-compose -f $APP_DIR/docker-compose.yml logs -f"
echo "  Check status:     docker ps"
echo "  Stop services:    docker-compose -f $APP_DIR/docker-compose.yml down"
echo "  Restart:          docker-compose -f $APP_DIR/docker-compose.yml restart"
echo "  View backups:     ls -la $APP_DIR/backups/"
echo ""
echo -e "${YELLOW}SSL Certificate:${NC}"
echo "  Location:  $APP_DIR/ssl/"
echo "  Expires:   $(openssl x509 -enddate -noout -in $APP_DIR/ssl/cert.pem)"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Update DNS: Point $DOMAIN to $(hostname -I | awk '{print $1}')"
echo "  2. Wait 5-10 minutes for DNS propagation"
echo "  3. Visit https://$DOMAIN"
echo "  4. Monitor logs: docker-compose -f $APP_DIR/docker-compose.yml logs -f"
echo ""

# Save deployment info
cat > "$APP_DIR/DEPLOYMENT_INFO.txt" << EOF
BizFlow Docker Deployment
=========================
Deployment Date: $(date)
Domain: $DOMAIN
Server IP: $(hostname -I | awk '{print $1}')
App Directory: $APP_DIR
Database: $APP_DIR/data/bizflow/database.db
Backups: $APP_DIR/backups/
SSL Certificate: $APP_DIR/ssl/cert.pem

Services:
- Nebula Website: https://$DOMAIN (port 3000)
- BizFlow Web UI: https://$DOMAIN/app (port 5180)
- HTTP Bridge: https://$DOMAIN/ipc (port 8787)

Auto-configured:
- Daily backups at 2:00 AM
- SSL auto-renewal every 3:00 AM
- Firewall: Only SSH (22), HTTP (80), HTTPS (443)
EOF

echo -e "${GREEN}Deployment info saved to: $APP_DIR/DEPLOYMENT_INFO.txt${NC}"
