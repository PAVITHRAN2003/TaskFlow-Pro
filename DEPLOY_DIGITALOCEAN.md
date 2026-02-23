# TaskFlow Pro - DigitalOcean Deployment Guide

## Option 1: Droplet (VPS) - Recommended

### 1. Create a Droplet
- Go to DigitalOcean → Create → Droplet
- Choose **Ubuntu 24.04**, **$12/mo** (2GB RAM) minimum
- Add your SSH key

### 2. SSH into the Droplet
```bash
ssh root@YOUR_DROPLET_IP
```

### 3. Install Docker
```bash
curl -fsSL https://get.docker.com | sh
```

### 4. Clone your repo & deploy
```bash
git clone YOUR_REPO_URL /app
cd /app

# Update backend .env
nano backend/.env
# Set: MONGO_URL="mongodb://mongo:27017"
# Set: DB_NAME="taskflow_pro"
# Set: JWT_SECRET="your-strong-secret-here"
# Set: SENDGRID_API_KEY="your-key"
# Set: SENDER_EMAIL="your-verified-email"
# Set: CORS_ORIGINS="*"

# Set your domain/IP for frontend
export REACT_APP_BACKEND_URL=http://YOUR_DROPLET_IP

# Build & run
docker compose up -d --build
```

### 5. Access the app
- Visit `http://YOUR_DROPLET_IP` in your browser

### 6. (Optional) Add a domain + HTTPS
```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Point your domain's A record to YOUR_DROPLET_IP
# Then run:
certbot --nginx -d yourdomain.com
```

---

## Option 2: DigitalOcean App Platform

### 1. Push code to GitHub
### 2. Go to DigitalOcean → App Platform → Create App
### 3. Add 3 components:
- **Backend**: Source = `/backend`, Dockerfile, port 8001
- **Frontend**: Source = `/frontend`, Dockerfile, port 80
- **Database**: Add managed MongoDB (or use MongoDB Atlas free tier)

### 4. Set environment variables in App Platform dashboard:
```
Backend:
  MONGO_URL=mongodb+srv://...  (from MongoDB Atlas or DO managed DB)
  DB_NAME=taskflow_pro
  JWT_SECRET=your-strong-secret
  SENDGRID_API_KEY=your-key
  SENDER_EMAIL=your-email
  CORS_ORIGINS=*

Frontend (build arg):
  REACT_APP_BACKEND_URL=https://your-app.ondigitalocean.app
```

---

## Important Notes
- **MongoDB**: The docker-compose setup includes MongoDB. For App Platform, use MongoDB Atlas (free tier at mongodb.com/atlas)
- **REACT_APP_BACKEND_URL**: Must point to your server's public URL (no trailing slash)
- **MONGO_URL in docker-compose**: Use `mongodb://mongo:27017` (service name, not localhost)
