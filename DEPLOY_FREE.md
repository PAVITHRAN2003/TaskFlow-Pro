# TaskFlow Pro - Free Deployment Guide (Render + Vercel + MongoDB Atlas)

## Step 1: MongoDB Atlas (Free Database)

1. Go to [mongodb.com/atlas](https://mongodb.com/atlas) → Sign up / Log in
2. Create a **free shared cluster** (M0 - 512MB)
3. Set a database user (username + password)
4. Under **Network Access** → Add `0.0.0.0/0` (allow from anywhere)
5. Click **Connect** → **Drivers** → Copy the connection string
   - It looks like: `mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/taskflow_pro`
   - Replace `USERNAME` and `PASSWORD` with your credentials

---

## Step 2: Backend on Render (Free)

1. Go to [render.com](https://render.com) → Sign up / Log in
2. Click **New** → **Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Name**: `taskflow-backend`
   - **Root Directory**: `backend`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
5. Add **Environment Variables**:
   ```
   MONGO_URL = mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/taskflow_pro
   DB_NAME = taskflow_pro
   JWT_SECRET = pick-a-strong-random-secret-here
   JWT_ALGORITHM = HS256
   SENDGRID_API_KEY = SG.your-key-here
   SENDER_EMAIL = your-verified-email@domain.com
   CORS_ORIGINS = *
   ```
6. Click **Create Web Service**
7. Wait for deploy → Copy the URL (e.g. `https://taskflow-backend.onrender.com`)

---

## Step 3: Frontend on Vercel (Free)

1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
2. Click **Import Project** → Select your repo
3. Configure:
   - **Framework Preset**: Create React App
   - **Root Directory**: `frontend`
4. Add **Environment Variable**:
   ```
   REACT_APP_BACKEND_URL = https://taskflow-backend.onrender.com
   ```
   (Use the Render URL from Step 2)
5. Click **Deploy**
6. Your app will be live at `https://your-project.vercel.app`

---

## Done!

Your free stack:
- **Frontend**: https://your-project.vercel.app (Vercel)
- **Backend**: https://taskflow-backend.onrender.com (Render)
- **Database**: MongoDB Atlas free cluster

## Important Notes

- **Render free tier** spins down after 15 min of inactivity. First request after sleep takes ~30s to wake up.
- **MongoDB Atlas free tier** gives you 512MB storage — enough for thousands of tasks.
- **Vercel** has unlimited static hosting on the free plan.
- Update `CORS_ORIGINS` in Render env vars to your Vercel domain for tighter security:
  ```
  CORS_ORIGINS = https://your-project.vercel.app
  ```
- WebSocket connections may not persist on Render free tier during sleep periods.
