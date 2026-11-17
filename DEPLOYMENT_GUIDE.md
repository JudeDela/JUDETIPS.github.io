# GoalInsight — Production Deployment Guide

This guide explains how to deploy **GoalInsight** to production using free and low-cost cloud providers.

---

## Pre-Configured API Credentials
Your football-data.org API token is already configured in the project:
```env
FOOTBALL_DATA_TOKEN=b7e6bea2bbea49b59808336137209ef8
FOOTBALL_DATA_BASE_URL=https://api.football-data.org/v4
```

---

## Option 1: Vercel (Frontend) + Render (Backend) — Recommended Free Setup

This is the standard modern stack: high-speed global CDN for Next.js, and a managed container for FastAPI.

### Step 1: Push Project to GitHub
1. Create a new GitHub repository (e.g. `goalinsight`).
2. In the `GoalInsight` directory, run:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: GoalInsight Platform"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/goalinsight.git
   git push -u origin main
   ```

### Step 2: Deploy Backend to Render.com
1. Go to [render.com](https://render.com) and create an account.
2. Click **New +** > **Web Service**.
3. Select your `goalinsight` GitHub repository.
4. Configure the service:
   - **Name**: `goalinsight-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Under **Environment Variables**, add:
   - `APP_ENV`: `production`
   - `FOOTBALL_DATA_TOKEN`: `b7e6bea2bbea49b59808336137209ef8`
   - `FOOTBALL_DATA_BASE_URL`: `https://api.football-data.org/v4`
   - `FIXTURE_HORIZON_DAYS`: `7`
   - `CACHE_TTL_SECONDS`: `600`
   - `CORS_ORIGINS`: `*`
6. Click **Deploy Web Service**.
7. Once deployed, copy your backend URL (e.g. `https://goalinsight-backend.onrender.com`).

### Step 3: Deploy Frontend to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New…** > **Project**.
3. Import your `goalinsight` repository.
4. In the configuration screen:
   - **Root Directory**: Click *Edit* and select `frontend`.
   - **Framework Preset**: Next.js (automatically detected).
5. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_API_URL`: Your Render backend URL (e.g. `https://goalinsight-backend.onrender.com`).
6. Click **Deploy**.
7. Vercel will build and deploy your app in ~60 seconds to a fast HTTPS domain (e.g. `https://goalinsight.vercel.app`).

---

## Option 2: 1-Click Docker Deployment (VPS / DigitalOcean / Hetzner / AWS)

If you have a Linux VPS (Ubuntu/Debian) with Docker and Docker Compose installed:

### 1. Clone & Navigate
```bash
git clone https://github.com/YOUR_USERNAME/goalinsight.git
cd goalinsight
```

### 2. Launch with Docker Compose
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

This starts:
- **PostgreSQL Database** on port 5432 with persistent volume
- **FastAPI Backend** on port 8000
- **Next.js Production Frontend** on port 3000

### 3. Add HTTPS with Caddy (Recommended 2-minute reverse proxy)
Install Caddy:
```bash
sudo apt install -y caddy
```

Edit `/etc/caddy/Caddyfile`:
```caddy
yourdomain.com {
    reverse_proxy localhost:3000
}

api.yourdomain.com {
    reverse_proxy localhost:8000
}
```
Reload Caddy:
```bash
sudo systemctl reload caddy
```
Caddy will automatically generate and renew free SSL certificates from Let's Encrypt!

---

## Option 3: Deploy to Railway.app

1. Sign up at [railway.app](https://railway.app).
2. Click **New Project** > **Deploy from GitHub repo**.
3. Select `goalinsight`.
4. Railway will automatically detect `railway.json` and deploy both backend and frontend services.
5. Set the environment variable `FOOTBALL_DATA_TOKEN` to `b7e6bea2bbea49b59808336137209ef8`.

---

## Environment Variables Reference

| Variable | Description | Default |
|---|---|---|
| `APP_ENV` | Application environment (`development` / `production`) | `production` |
| `DATABASE_URL` | SQLAlchemy connection string (SQLite or PostgreSQL) | `sqlite:///./goalinsight.db` |
| `FOOTBALL_DATA_TOKEN` | football-data.org v4 API authentication token | Pre-configured |
| `FOOTBALL_DATA_BASE_URL` | football-data.org v4 base URL | `https://api.football-data.org/v4` |
| `FIXTURE_HORIZON_DAYS` | Ingestion window (free tier max 10 days) | `7` |
| `CACHE_TTL_SECONDS` | In-memory & DB cache duration to prevent 429 limits | `600` (10 min) |
| `CORS_ORIGINS` | Permitted browser origins (comma separated or `*`) | `*` |
| `NEXT_PUBLIC_API_URL` | Frontend URL pointer to FastAPI backend | `http://localhost:8000` |
