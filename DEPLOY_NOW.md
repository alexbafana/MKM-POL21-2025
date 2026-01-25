# Deploy MKM-POL21 DAO Now - Quick Start

**Created:** 2025-12-30
**Status:** Ready to deploy

---

## Quick Deploy (3 Steps)

### Step 1: Configure Server Details

Edit `deploy.sh` and set your server details:

```bash
nano deploy.sh

# Change these lines:
SERVER_USER="your-username"      # e.g., "ubuntu" or "root"
SERVER_HOST="your-server-ip"     # e.g., "192.168.1.100" or "dao.example.com"
SERVER_PATH="/var/www/mkmpol-dao"  # Where to deploy
APP_NAME="mkmpol-dao"             # PM2 process name
SERVER_PORT="3000"                # Port to run on
```

**OR** set environment variables:

```bash
export SERVER_USER="ubuntu"
export SERVER_HOST="192.168.1.100"
export SERVER_PATH="/var/www/mkmpol-dao"
```

### Step 2: Ensure Server is Ready

SSH into your server and install requirements (one-time setup):

```bash
# SSH to server
ssh your-username@your-server-ip

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Yarn
sudo npm install -g yarn

# Install PM2
sudo npm install -g pm2

# Enable PM2 on startup
pm2 startup
# Follow the command it prints

# Exit server
exit
```

### Step 3: Deploy!

```bash
cd /home/sowelo/Scrivania/MKM_Repo/MKM-POL21-2025/mkmpol-dao

# Run deployment
./deploy.sh
```

That's it! Your DAO will be deployed and running.

---

## What the Script Does

1. ✅ Builds Next.js application locally
2. ✅ Creates deployment package (tar.gz)
3. ✅ Uploads to server via SCP
4. ✅ Backs up existing deployment
5. ✅ Extracts files on server
6. ✅ Installs dependencies
7. ✅ Configures environment (MFSSIA disabled)
8. ✅ Starts app with PM2
9. ✅ Saves PM2 configuration
10. ✅ Shows status

---

## After Deployment

### Access Your DAO

```bash
http://your-server-ip:3000
```

### View Logs

```bash
ssh your-username@your-server-ip 'pm2 logs mkmpol-dao'
```

### Check Status

```bash
ssh your-username@your-server-ip 'pm2 status'
```

### Restart App

```bash
ssh your-username@your-server-ip 'pm2 restart mkmpol-dao'
```

---

## Setup Nginx (Optional but Recommended)

To serve on port 80/443 instead of 3000:

```bash
# SSH to server
ssh your-username@your-server-ip

# Install Nginx
sudo apt install nginx

# Create configuration
sudo nano /etc/nginx/sites-available/mkmpol-dao

# Paste this:
```

```nginx
server {
    listen 80;
    server_name your-domain.com;  # or your server IP

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/mkmpol-dao /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

Now access at: `http://your-domain.com` or `http://your-server-ip`

---

## Setup SSL/HTTPS (Optional)

If you have a domain name:

```bash
# SSH to server
ssh your-username@your-server-ip

# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is configured automatically
```

Now access at: `https://your-domain.com`

---

## Deploy Updates

When you make changes to the code:

```bash
# Pull latest code
git pull origin main

# Deploy again
./deploy.sh
```

The script will:
- Backup current deployment
- Deploy new version
- Restart app automatically

---

## Troubleshooting

### Problem: "Permission denied" when connecting

**Solution:**
```bash
# Test SSH connection first
ssh your-username@your-server-ip

# If using SSH key:
ssh -i /path/to/your/key.pem your-username@your-server-ip
```

### Problem: "pm2: command not found"

**Solution:**
```bash
ssh your-username@your-server-ip
sudo npm install -g pm2
```

### Problem: Port 3000 already in use

**Solution:**
```bash
ssh your-username@your-server-ip
pm2 kill
lsof -ti:3000 | xargs kill -9
pm2 start npm --name mkmpol-dao -- start
```

### Problem: Build fails with memory error

**Solution:**
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
./deploy.sh
```

### Problem: Can't connect to application

**Check firewall:**
```bash
ssh your-username@your-server-ip
sudo ufw allow 3000
# or for Nginx:
sudo ufw allow 80
sudo ufw allow 443
```

---

## Rollback to Previous Version

If something goes wrong:

```bash
ssh your-username@your-server-ip

# List backups
ls -lh /var/backups/mkmpol-dao-backup-*

# Restore backup (replace with your backup timestamp)
cd /var/www/mkmpol-dao
sudo tar -xzf /var/backups/mkmpol-dao-backup-YYYYMMDD-HHMMSS.tar.gz

# Restart
pm2 restart mkmpol-dao
```

---

## What's Included in Deployment

### ✅ Fully Working Features

- **Homepage** - Landing page with onboarding
- **Admin Panel** - Role assignment (Owner only)
- **Committees** - Consortium, Validation, Dispute Resolution
- **RDF Submission** - Data provision interface
- **RDF Review** - Committee approval dashboard
- **RDF Status** - Public status checker
- **Roles & Permissions** - View role matrix
- **MFSSIA Config** - Challenge set management (Owner only)
- **Mock Authentication** - Works without MFSSIA

### ⏸️ MFSSIA Integration

- Currently disabled (`NEXT_PUBLIC_MFSSIA_ENABLED=false`)
- Challenge definitions created on MFSSIA API
- Challenge sets blocked by backend bug
- Will be enabled later when MFSSIA backend is fixed

### 🔧 Smart Contracts

- MKMPOL21 (Permission Manager)
- GADataValidation (RDF registry)
- Consortium (Governance)
- Validation_Committee (Governance)
- Dispute_Resolution_Board (Governance)

**Note:** Contracts are deployed locally. For production blockchain, see `DEPLOYMENT_GUIDE.md`.

---

## Production Checklist

Before going live:

- [ ] Server configured with Node.js 20+
- [ ] PM2 installed globally
- [ ] SSH access working
- [ ] Firewall allows port 3000 (or 80/443 with Nginx)
- [ ] Domain name pointed to server (optional)
- [ ] SSL certificate installed (optional)
- [ ] Environment variables configured
- [ ] Smart contracts deployed to production network (if needed)
- [ ] Backup strategy in place

---

## Support & Documentation

**Full Documentation:**
- `DEPLOYMENT_GUIDE.md` - Complete deployment documentation
- `MFSSIA_DISCOVERY_REPORT.md` - MFSSIA integration status
- `MFSSIA_ADMIN_GUIDE.md` - MFSSIA configuration guide
- `CLAUDE.md` - Project architecture and commands

**Key Commands:**
```bash
# Local Development
yarn chain           # Start local blockchain
yarn deploy          # Deploy contracts
yarn start           # Start Next.js dev server

# Production Deployment
./deploy.sh          # Deploy to server

# Server Management
pm2 logs mkmpol-dao  # View logs
pm2 restart mkmpol-dao  # Restart app
pm2 status          # Check status
```

---

## Quick Reference

### Deploy Command

```bash
./deploy.sh
```

### Access Application

```bash
http://your-server-ip:3000
```

### View Logs

```bash
ssh your-username@your-server-ip 'pm2 logs mkmpol-dao'
```

### Update Deployment

```bash
git pull origin main && ./deploy.sh
```

---

**Status:** ✅ Ready to deploy
**MFSSIA:** ⏸️ Disabled (works in mock mode)
**All Features:** ✅ Functional
**Deployment Time:** ~5 minutes

🚀 **Run `./deploy.sh` now to deploy!**
