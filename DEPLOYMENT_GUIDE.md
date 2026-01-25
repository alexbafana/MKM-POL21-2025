# MKM-POL21 DAO Deployment Guide

**Date:** 2025-12-30
**Target:** Production Node via SSH

---

## Prerequisites

### 1. Server Requirements

**Minimum Specifications:**
- Ubuntu 20.04+ or similar Linux distribution
- Node.js >= 20.18.3
- Yarn package manager
- PM2 (for process management)
- Nginx (for reverse proxy)
- 4GB RAM minimum
- 20GB disk space

### 2. SSH Access

You need SSH access to your server:
```bash
ssh user@your-server-ip
```

### 3. Environment Variables

Create a `.env.production` file with:
```bash
# Next.js
NEXT_PUBLIC_MFSSIA_ENABLED=false
NEXT_PUBLIC_MFSSIA_API_URL=https://api.dymaxion-ou.co

# Blockchain (if deploying contracts)
DEPLOYER_PRIVATE_KEY=your_private_key_here
```

---

## Deployment Options

### Option 1: Build Locally, Deploy to Server (Recommended)

This approach builds the app on your local machine and uploads to the server.

#### Step 1: Build Locally

```bash
cd /home/sowelo/Scrivania/MKM_Repo/MKM-POL21-2025/mkmpol-dao

# Install dependencies
yarn install

# Build Next.js application
yarn next:build

# This creates: packages/nextjs/.next/ (production build)
```

#### Step 2: Upload to Server

```bash
# Set server details
SERVER_USER="your-username"
SERVER_HOST="your-server-ip"
SERVER_PATH="/var/www/mkmpol-dao"

# Create deployment archive
tar -czf mkmpol-dao-deploy.tar.gz \
  packages/nextjs/.next \
  packages/nextjs/public \
  packages/nextjs/package.json \
  packages/nextjs/contracts \
  packages/nextjs/app \
  packages/nextjs/components \
  packages/nextjs/hooks \
  packages/nextjs/services \
  packages/nextjs/utils \
  package.json \
  yarn.lock

# Upload to server
scp mkmpol-dao-deploy.tar.gz $SERVER_USER@$SERVER_HOST:/tmp/

# SSH and extract
ssh $SERVER_USER@$SERVER_HOST << 'ENDSSH'
  # Stop existing app
  pm2 stop mkmpol-dao || true

  # Create/update directory
  sudo mkdir -p /var/www/mkmpol-dao
  sudo chown $USER:$USER /var/www/mkmpol-dao

  # Extract
  cd /var/www/mkmpol-dao
  tar -xzf /tmp/mkmpol-dao-deploy.tar.gz

  # Install dependencies (production only)
  yarn install --production

  # Start with PM2
  pm2 start packages/nextjs/package.json --name mkmpol-dao -- start
  pm2 save
ENDSSH
```

### Option 2: Git Pull and Build on Server

This approach clones/pulls the repository on the server and builds there.

#### Step 1: Initial Setup (One Time)

```bash
# SSH into server
ssh $SERVER_USER@$SERVER_HOST

# Install Node.js 20+ if not installed
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Yarn
npm install -g yarn

# Install PM2
npm install -g pm2

# Clone repository
cd /var/www
git clone https://github.com/your-org/mkmpol-dao.git
cd mkmpol-dao

# Install dependencies
yarn install

# Build
yarn next:build
```

#### Step 2: Deploy Updates

```bash
# SSH into server
ssh $SERVER_USER@$SERVER_HOST

cd /var/www/mkmpol-dao

# Pull latest code
git pull origin main

# Rebuild
yarn install
yarn next:build

# Restart
pm2 restart mkmpol-dao
```

---

## Automated Deployment Script

Create `deploy.sh` in project root:

```bash
#!/bin/bash

# Configuration
SERVER_USER="your-username"
SERVER_HOST="your-server-ip"
SERVER_PATH="/var/www/mkmpol-dao"
APP_NAME="mkmpol-dao"

echo "🚀 Starting deployment to $SERVER_HOST"

# Step 1: Build locally
echo "📦 Building application..."
yarn install
yarn next:build

if [ $? -ne 0 ]; then
  echo "❌ Build failed"
  exit 1
fi

# Step 2: Create deployment package
echo "📦 Creating deployment package..."
tar -czf mkmpol-dao-deploy.tar.gz \
  packages/nextjs/.next \
  packages/nextjs/public \
  packages/nextjs/package.json \
  packages/nextjs/contracts \
  packages/nextjs/app \
  packages/nextjs/components \
  packages/nextjs/hooks \
  packages/nextjs/services \
  packages/nextjs/utils \
  packages/nextjs/scaffold.config.ts \
  package.json \
  yarn.lock

# Step 3: Upload to server
echo "📤 Uploading to server..."
scp mkmpol-dao-deploy.tar.gz $SERVER_USER@$SERVER_HOST:/tmp/

# Step 4: Deploy on server
echo "🔧 Deploying on server..."
ssh $SERVER_USER@$SERVER_HOST << ENDSSH
  set -e

  echo "⏹️  Stopping application..."
  pm2 stop $APP_NAME || true

  echo "📂 Preparing directory..."
  sudo mkdir -p $SERVER_PATH
  sudo chown \$USER:\$USER $SERVER_PATH

  echo "📦 Extracting files..."
  cd $SERVER_PATH
  tar -xzf /tmp/mkmpol-dao-deploy.tar.gz

  echo "📦 Installing dependencies..."
  yarn install --production

  echo "🚀 Starting application..."
  pm2 start packages/nextjs/package.json --name $APP_NAME
  pm2 save

  echo "✅ Deployment complete!"
  pm2 status
ENDSSH

# Cleanup
rm mkmpol-dao-deploy.tar.gz

echo "✅ Deployment script completed!"
echo "🌐 Application should be running on server"
```

Make it executable:
```bash
chmod +x deploy.sh
```

Run deployment:
```bash
./deploy.sh
```

---

## Nginx Configuration

Configure Nginx as reverse proxy:

```nginx
# /etc/nginx/sites-available/mkmpol-dao
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/mkmpol-dao /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## SSL Certificate (HTTPS)

Install Let's Encrypt certificate:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Environment Configuration

### Production Environment Variables

Create `.env.production` on server:

```bash
# Next.js
NEXT_PUBLIC_MFSSIA_ENABLED=false
NEXT_PUBLIC_MFSSIA_API_URL=https://api.dymaxion-ou.co

# Optional: Analytics, monitoring, etc.
# NEXT_PUBLIC_GA_ID=your-google-analytics-id
```

PM2 ecosystem file (`ecosystem.config.js`):

```javascript
module.exports = {
  apps: [{
    name: 'mkmpol-dao',
    script: 'packages/nextjs/node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/var/www/mkmpol-dao',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      NEXT_PUBLIC_MFSSIA_ENABLED: 'false',
      NEXT_PUBLIC_MFSSIA_API_URL: 'https://api.dymaxion-ou.co'
    },
    instances: 1,
    exec_mode: 'cluster',
    max_memory_restart: '1G',
    error_file: '/var/log/pm2/mkmpol-dao-error.log',
    out_file: '/var/log/pm2/mkmpol-dao-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

Start with ecosystem:
```bash
pm2 start ecosystem.config.js
pm2 save
```

---

## Blockchain Deployment

If you need to deploy smart contracts to a production network:

### Step 1: Configure Network

Edit `packages/hardhat/hardhat.config.ts`:

```typescript
networks: {
  // ... existing networks
  production: {
    url: "https://your-rpc-endpoint",
    accounts: [process.env.DEPLOYER_PRIVATE_KEY],
  },
}
```

### Step 2: Deploy Contracts

```bash
# Local machine or server
cd packages/hardhat
yarn hardhat --network production deploy
```

### Step 3: Update Frontend Contracts

```bash
# Copy deployed contract addresses to frontend
cp deployments/production/*.json ../nextjs/contracts/deployedContracts.ts
```

---

## Monitoring & Maintenance

### PM2 Commands

```bash
# View status
pm2 status

# View logs
pm2 logs mkmpol-dao

# Restart
pm2 restart mkmpol-dao

# Stop
pm2 stop mkmpol-dao

# Monitor
pm2 monit

# Enable startup on boot
pm2 startup
pm2 save
```

### Check Application

```bash
# Health check
curl http://localhost:3000

# Check MFSSIA integration
curl http://localhost:3000/api/mfssia/health

# View Next.js logs
pm2 logs mkmpol-dao --lines 100
```

---

## Rollback Procedure

If deployment fails:

```bash
# SSH to server
ssh $SERVER_USER@$SERVER_HOST

cd /var/www/mkmpol-dao

# Restore from backup
tar -xzf /var/backups/mkmpol-dao-previous.tar.gz

# Restart
pm2 restart mkmpol-dao
```

---

## Backup Strategy

Create backup before each deployment:

```bash
# On server
cd /var/www
sudo tar -czf /var/backups/mkmpol-dao-$(date +%Y%m%d-%H%M%S).tar.gz mkmpol-dao

# Keep only last 5 backups
cd /var/backups
ls -t mkmpol-dao-*.tar.gz | tail -n +6 | xargs rm -f
```

---

## Troubleshooting

### Issue: Port 3000 already in use

```bash
# Find process
lsof -i :3000

# Kill process
kill -9 <PID>

# Or change port in PM2 config
```

### Issue: Build fails with memory error

```bash
# Increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=4096"
yarn next:build
```

### Issue: Permission denied

```bash
# Fix ownership
sudo chown -R $USER:$USER /var/www/mkmpol-dao
```

### Issue: Nginx not proxying

```bash
# Check Nginx status
sudo systemctl status nginx

# Check configuration
sudo nginx -t

# View error logs
sudo tail -f /var/log/nginx/error.log
```

---

## Quick Deployment Steps

### First Time Setup

1. Build locally: `yarn next:build`
2. Create deployment script: Copy `deploy.sh` above
3. Configure server details in script
4. Make executable: `chmod +x deploy.sh`
5. Run: `./deploy.sh`
6. Configure Nginx (optional)
7. Setup SSL (optional)

### Subsequent Deployments

1. Pull latest code: `git pull origin main`
2. Build: `yarn next:build`
3. Deploy: `./deploy.sh`

---

## Current Deployment Status

### What's Ready

- ✅ Smart contracts (GADataValidation, MKMPOL21, etc.)
- ✅ Next.js application (all pages functional)
- ✅ RDF validation system
- ✅ Committee dashboards
- ✅ Admin interface
- ✅ MFSSIA admin page (`/admin/mfssia-config`)
- ✅ Mock authentication (works without MFSSIA)

### MFSSIA Status

- ✅ Challenge definitions can be created
- ❌ Challenge sets (blocked by backend bug)
- ⏸️ Deploy with `NEXT_PUBLIC_MFSSIA_ENABLED=false`
- 🔄 Enable MFSSIA later when backend is fixed

---

## Recommended Deployment

**For immediate deployment:**

```bash
# 1. Build application
yarn next:build

# 2. Deploy to server with MFSSIA disabled
NEXT_PUBLIC_MFSSIA_ENABLED=false ./deploy.sh

# 3. Verify deployment
curl http://your-server-ip:3000
```

All features work in mock mode. Enable MFSSIA later when challenge sets are working.

---

## Support

### Logs Location

- PM2 logs: `/var/log/pm2/`
- Nginx logs: `/var/log/nginx/`
- Application logs: `pm2 logs mkmpol-dao`

### Useful Commands

```bash
# Check disk space
df -h

# Check memory
free -h

# Check running processes
pm2 status

# Check Nginx
sudo systemctl status nginx

# View system logs
journalctl -xe
```

---

**Document Version:** 1.0
**Last Updated:** 2025-12-30
**Application Status:** Ready for production deployment
