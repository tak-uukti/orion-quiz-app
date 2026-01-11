# Live Quiz App (Kahoot Clone)

A real-time multiplayer quiz application built with **React**, **FastAPI**, and **Socket.io**.
- **Host**: Creates quizzes and controls the game flow on a large screen.
- **Host**: Creates quizzes and controls the game flow on a large screen.
- **Players**: Join via Game PIN and answer questions on their devices.

## New Features
- **Admin Login**: Host capabilities are protected. Default login: `admin` / `Orion@2026`.
- **Database Integration**: Game sessions and responses are stored in MongoDB.
- **Results Export**: Export all session data to CSV including response times.

## Prerequisites
- **Node.js** (v14+)
- **Python** (v3.8+)

## Installation

### 1. Backend Setup (Server)
Navigate to the root directory and install Python dependencies:
```bash
pip install -r server/requirements.txt
```
Create a `.env` file in `server/` with:
```
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=quiz_app
PORT=8000
```

### 2. Frontend Setup (Client)
Navigate to the client directory and install Node dependencies:
```bash
cd client
npm install
```
Create a `.env` file in `client/` with:
```
VITE_API_URL=http://localhost:8000
VITE_SOCKET_URL=http://localhost:8000
VITE_ADMIN_USER=admin
VITE_ADMIN_PASS=Orion@2026
```

## How to Run

You need to run **both** the backend and frontend servers.

### Option A: Using the Helper Script (Windows)
Run the PowerShell script in the root directory:
```powershell
./start_app.ps1
```

### Option B: Manual Start

**Terminal 1 (Backend):**
```powershell
# From root directory
python -m uvicorn server.main:sio_app --reload --port 8000
```

**Terminal 2 (Frontend):**
```powershell
# From client directory
cd client
npm run dev
```

The app will be available at **http://localhost:5173**.

## How to Play

1. **Host**:
   - Open `http://localhost:5173`.
   - Open `http://localhost:5173`.
   - Click **Host Quiz**.
   - **Login** with credentials (default: `admin` / `Orion@2026`).
   - Click **Create New Quiz** (or use the sample) and **Start**.
   - Share the **Game PIN** shown on the screen.

2. **Players**:
   - Open `http://localhost:5173` on their phones/laptops.
   - Click **Join Game**.
   - Enter the **Game PIN** and a **Nickname**.
   - Wait for the host to start!

## Tech Stack
- **Frontend**: React, Vite, Framer Motion
- **Backend**: Python FastAPI, Python-SocketIO
- **Real-time**: Socket.IO (WebSockets)
- **Database**: MongoDB

## 🚀 Deployment

This app is ready for production deployment!

### Quick Deploy
- **Frontend**: Deploy to [Vercel](https://vercel.com/) (optimized configuration included)
- **Backend**: Deploy to [Railway](https://railway.app/), [Render](https://render.com/), or Heroku
- **Database**: Use [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) free tier

📖 **Full deployment guide**: See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

### What's Included
✅ `vercel.json` - Vercel deployment configuration
✅ `.env.example` files - Environment variable templates
✅ Optimized build settings - Code splitting and minification
✅ `.gitignore` - Prevents committing sensitive files
✅ Complete deployment documentation

## 🌐 Environment Variables

### Frontend (client/.env)
```env
VITE_API_URL=https://your-backend-url.com
VITE_SOCKET_URL=https://your-backend-url.com
VITE_ADMIN_USER=admin
VITE_ADMIN_PASS=your-secure-password
```

### Backend (server/.env)
```env
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/
DATABASE_NAME=quiz_app
PORT=8000
CORS_ORIGINS=https://your-frontend-url.vercel.app
```

Copy `.env.example` files and update with your values.
