#!/bin/bash
set -e

export DEBIAN_FRONTEND=noninteractive

# -------------------------------------------------------------
# 1. Base tools, Python, Node.js 24 & Nginx
# -------------------------------------------------------------
apt-get update -y
apt-get install -y \
    curl \
    ca-certificates \
    gnupg \
    git \
    build-essential \
    python3-pip \
    python3-venv \
    python-is-python3 \
    nginx

# NodeSource setup for Node.js 24
mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg

NODE_MAJOR=24
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" > /etc/apt/sources.list.d/nodesource.list

apt-get update -y
apt-get install -y nodejs
npm install -g pm2 pnpm

# -------------------------------------------------------------
# 2. Clone or update repository
# -------------------------------------------------------------
APP_DIR="/opt/myapp"
REPO_URL="https://github.com/mohamedIzoughne/practice-google-cloud.git"

if [ ! -d "$APP_DIR" ]; then
    echo "Cloning repository..."
    git clone "$REPO_URL" "$APP_DIR"
else
    echo "Repository exists, pulling latest..."
    git -C "$APP_DIR" pull origin main
fi

# -------------------------------------------------------------
# 3. Build Frontend (React)
# -------------------------------------------------------------
cd "$APP_DIR/frontend"
npm install
npm run build

# Ensure Nginx's worker user (www-data) can read the build files
chmod -R 755 "$APP_DIR/frontend/dist"

# -------------------------------------------------------------
# 4. Configure & Start Backend (Express)
# -------------------------------------------------------------
cd "$APP_DIR/backend"

# If pulling secrets from Secret Manager:
gcloud secrets versions access latest --secret="backend-env" > .env
chmod 600 .env

npm install

# Start Express on localhost:5000 (adjust port to match your app)
pm2 restart backend || pm2 start npm --name "backend" -- start
pm2 save

# -------------------------------------------------------------
# 5. Configure Nginx Reverse Proxy
# -------------------------------------------------------------
cat << 'EOF' > /etc/nginx/sites-available/default
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    # Path to your React production build
    root /opt/myapp/frontend/dist;
    index index.html;

    # 1. Route API requests directly to the Express backend
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    # 2. Serve static React files and fallback to index.html for SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

# Test syntax and restart Nginx
nginx -t
systemctl restart nginx
systemctl enable nginx

echo "Deployment complete: $(date)" >> /var/log/startup-provision.log