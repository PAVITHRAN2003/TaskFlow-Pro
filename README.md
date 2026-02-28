# TaskFlow Pro - Task Management App

A full-stack task management application with React frontend, FastAPI backend, and MongoDB.

## Run Locally (with Docker & MongoDB)

### Quick Start (Recommended)

1. **Create backend environment file:**
   ```bash
   cp backend/.env.example backend/.env
   ```
   Edit `backend/.env` - the defaults work for local Docker (MongoDB as `mongo:27017`).
   Ensure `JWT_SECRET` is set (any random string for local testing).

2. **Start with Docker Compose:**
   ```bash
   REACT_APP_BACKEND_URL=http://localhost:8001 docker-compose up --build
   ```

3. **Open the app:**
   - Frontend: http://localhost
   - Backend API: http://localhost:8001/docs

   Sign up for an account and start creating projects and tasks.

---

### Alternative: Run Without Docker

**Prerequisites:** Node.js, Python 3.11+, MongoDB (local or Atlas)

1. **MongoDB:** Run MongoDB locally (`mongod`) or use [MongoDB Atlas](https://mongodb.com/atlas) free tier.

2. **Backend:**
   ```bash
   cd backend
   pip install -r requirements.txt
   cp .env.example .env
   ```
   Edit `.env`:
   - `MONGO_URL=mongodb://localhost:27017` (or your Atlas connection string)
   - `DB_NAME=taskflow_pro`
   - `JWT_SECRET=any-secret-for-local`

   ```bash
   uvicorn server:app --host 0.0.0.0 --port 8001
   ```

3. **Frontend** (in a new terminal):
   ```bash
   cd frontend
   yarn install
   REACT_APP_BACKEND_URL=http://localhost:8001 yarn start
   ```

4. Open http://localhost:3000

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URL` | Yes | MongoDB connection string |
| `DB_NAME` | Yes | Database name (e.g. `taskflow_pro`) |
| `JWT_SECRET` | Yes | Secret for JWT signing |
| `JWT_ALGORITHM` | No | Default: `HS256` |
| `SENDGRID_API_KEY` | No | For email invites |
| `SENDER_EMAIL` | No | From address for emails |
| `CORS_ORIGINS` | No | Comma-separated origins, default `*` |

---

## Deploy to Production (Free)

Deploy to the cloud using MongoDB Atlas + Render + Vercel. Full guide: **[DEPLOY_FREE.md](DEPLOY_FREE.md)**

**Quick overview:**
1. **MongoDB Atlas** – Create free cluster, get connection string
2. **Render** – Deploy backend, add env vars
3. **Vercel** – Deploy frontend, set `REACT_APP_BACKEND_URL` to your Render URL

**Prerequisite:** Push your code to GitHub (Render and Vercel deploy from your repo).
