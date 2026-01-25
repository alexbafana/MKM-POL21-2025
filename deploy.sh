#!/bin/bash

#############################################
# MKM-POL21 DAO Deployment Script
#
# This script builds the application locally
# and deploys it to your production server
#############################################

set -e  # Exit on error

# CONFIGURATION - EDIT THESE VALUES
SERVER_USER="${SERVER_USER:-your-username}"
SERVER_HOST="${SERVER_HOST:-your-server-ip}"
SERVER_PATH="${SERVER_PATH:-/var/www/mkmpol-dao}"
APP_NAME="${APP_NAME:-mkmpol-dao}"
SERVER_PORT="${SERVER_PORT:-3000}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if configuration is set
if [ "$SERVER_USER" = "your-username" ] || [ "$SERVER_HOST" = "your-server-ip" ]; then
    log_error "Please configure SERVER_USER and SERVER_HOST in deploy.sh"
    log_info "Edit the script or set environment variables:"
    echo "  export SERVER_USER=\"your-username\""
    echo "  export SERVER_HOST=\"your-server-ip\""
    echo "  ./deploy.sh"
    exit 1
fi

# Confirm deployment
log_warning "Deployment Configuration:"
echo "  Server: $SERVER_USER@$SERVER_HOST"
echo "  Path: $SERVER_PATH"
echo "  App Name: $APP_NAME"
echo "  Port: $SERVER_PORT"
echo ""
read -p "Continue with deployment? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_warning "Deployment cancelled"
    exit 0
fi

# Start deployment
log_info "🚀 Starting deployment to $SERVER_HOST"
echo ""

# Step 1: Build application
log_info "📦 Building Next.js application..."
if ! yarn install; then
    log_error "Yarn install failed"
    exit 1
fi

if ! yarn next:build; then
    log_error "Build failed"
    exit 1
fi
log_success "Build completed successfully"
echo ""

# Step 2: Create deployment package
log_info "📦 Creating deployment package..."
DEPLOY_FILE="mkmpol-dao-deploy-$(date +%Y%m%d-%H%M%S).tar.gz"

tar -czf "$DEPLOY_FILE" \
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

log_success "Package created: $DEPLOY_FILE ($(du -h "$DEPLOY_FILE" | cut -f1))"
echo ""

# Step 3: Upload to server
log_info "📤 Uploading to server..."
if ! scp "$DEPLOY_FILE" "$SERVER_USER@$SERVER_HOST:/tmp/"; then
    log_error "Upload failed"
    rm "$DEPLOY_FILE"
    exit 1
fi
log_success "Upload completed"
echo ""

# Step 4: Deploy on server
log_info "🔧 Deploying on server..."
ssh "$SERVER_USER@$SERVER_HOST" << ENDSSH
    set -e

    echo "📂 Preparing directory..."
    sudo mkdir -p $SERVER_PATH
    sudo chown \$USER:\$USER $SERVER_PATH

    # Backup existing deployment
    if [ -d "$SERVER_PATH/packages" ]; then
        echo "💾 Creating backup..."
        sudo mkdir -p /var/backups
        sudo tar -czf /var/backups/mkmpol-dao-backup-\$(date +%Y%m%d-%H%M%S).tar.gz -C $SERVER_PATH . 2>/dev/null || true

        # Keep only last 5 backups
        cd /var/backups
        ls -t mkmpol-dao-backup-*.tar.gz 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true
    fi

    echo "⏹️  Stopping application..."
    pm2 stop $APP_NAME 2>/dev/null || echo "App not running"

    echo "📦 Extracting files..."
    cd $SERVER_PATH
    tar -xzf /tmp/$DEPLOY_FILE

    echo "📦 Installing dependencies..."
    yarn install --production --frozen-lockfile

    echo "🔧 Configuring environment..."
    cat > packages/nextjs/.env.production << 'EOF'
NEXT_PUBLIC_MFSSIA_ENABLED=false
NEXT_PUBLIC_MFSSIA_API_URL=https://api.dymaxion-ou.co
EOF

    echo "🚀 Starting application..."
    if pm2 list | grep -q $APP_NAME; then
        pm2 restart $APP_NAME
    else
        cd packages/nextjs
        pm2 start npm --name $APP_NAME -- start -- -p $SERVER_PORT
    fi

    pm2 save

    echo "✅ Deployment complete!"
    echo ""
    echo "📊 Application status:"
    pm2 status

    # Cleanup
    rm /tmp/$DEPLOY_FILE
ENDSSH

if [ $? -eq 0 ]; then
    log_success "Deployment completed successfully!"
    echo ""
    log_info "Your application should now be running at:"
    echo "  http://$SERVER_HOST:$SERVER_PORT"
    echo ""
    log_info "Useful commands:"
    echo "  ssh $SERVER_USER@$SERVER_HOST 'pm2 logs $APP_NAME'     # View logs"
    echo "  ssh $SERVER_USER@$SERVER_HOST 'pm2 restart $APP_NAME'  # Restart app"
    echo "  ssh $SERVER_USER@$SERVER_HOST 'pm2 status'             # Check status"
else
    log_error "Deployment failed on server"
    exit 1
fi

# Cleanup local package
rm "$DEPLOY_FILE"
log_success "Local cleanup completed"

log_success "🎉 Deployment script finished!"
ENDSSH
