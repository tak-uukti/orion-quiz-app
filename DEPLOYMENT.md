# Deployment Guide for Quiz App

This guide covers deploying your quiz app to production. The frontend will be deployed to **Vercel**, and the backend needs to be deployed to a platform that supports WebSockets.

## Architecture Overview

- **Frontend**: React + Vite → Deploy to Vercel
- **Backend**: FastAPI + Socket.IO → Deploy to Railway/Render/Heroku
- **Database**: MongoDB → MongoDB Atlas (recommended)

## 🎯 Quick Deployment Steps

### 1. Deploy Database (MongoDB Atlas)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Click "Connect" → "Connect your application"
4. Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)
5. Save this for backend deployment

### 2. Deploy Backend

#### Option A: Railway (Recommended)

1. Go to [Railway.app](https://railway.app/)
2. Sign up/Login with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Configure:
   - **Root Directory**: Leave empty or set to `/`
   - **Build Command**: `pip install -r server/requirements.txt`
   - **Start Command**: `uvicorn server.main:sio_app --host 0.0.0.0 --port $PORT`
6. Add environment variables:
   ```
   MONGODB_URL=mongodb+srv://your-atlas-connection-string
   DATABASE_NAME=quiz_app
   PORT=8000
   CORS_ORIGINS=https://your-vercel-app.vercel.app
   ```
7. Deploy and copy the provided URL (e.g., `https://your-app.railway.app`)

#### Option B: Render

1. Go to [Render.com](https://render.com/)
2. Sign up/Login
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Configure:
   - **Name**: quiz-app-backend
   - **Environment**: Python 3
   - **Build Command**: `pip install -r server/requirements.txt`
   - **Start Command**: `uvicorn server.main:sio_app --host 0.0.0.0 --port $PORT`
6. Add environment variables (same as above)
7. Deploy and copy the URL

#### Option C: Heroku

1. Install [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)
2. Create a `Procfile` in the root directory:
   ```
   web: uvicorn server.main:sio_app --host 0.0.0.0 --port $PORT
   ```
3. Deploy:
   ```bash
   heroku login
   heroku create your-app-name
   heroku config:set MONGODB_URL=your-connection-string
   heroku config:set DATABASE_NAME=quiz_app
   git push heroku main
   ```

### 3. Deploy Frontend (Vercel)

1. Go to [Vercel.com](https://vercel.com/)
2. Sign up/Login with GitHub
3. Click "Add New" → "Project"
4. Import your GitHub repository
5. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (root)
   - **Build Command**: `cd client && npm install && npm run build`
   - **Output Directory**: `client/dist`
6. Add environment variables:
   ```
   VITE_API_URL=https://your-backend-url.railway.app
   VITE_SOCKET_URL=https://your-backend-url.railway.app
   VITE_ADMIN_USER=admin
   VITE_ADMIN_PASS=Orion@2026
   ```
7. Click "Deploy"

### 4. Update Backend CORS

After deploying frontend, update your backend's CORS settings:

1. Go to your backend platform (Railway/Render/Heroku)
2. Update the `CORS_ORIGINS` environment variable:
   ```
   CORS_ORIGINS=https://your-app.vercel.app
   ```
3. Redeploy if necessary

## 🔧 Configuration Files

### vercel.json
Already configured in the root directory. This tells Vercel how to build and deploy the frontend.

### Environment Variables

#### Frontend (.env)
Located in `client/.env`:
```env
VITE_API_URL=https://your-backend-url.com
VITE_SOCKET_URL=https://your-backend-url.com
VITE_ADMIN_USER=admin
VITE_ADMIN_PASS=Orion@2026
```

#### Backend (.env)
Located in `server/.env`:
```env
MONGODB_URL=mongodb+srv://username:password@cluster.mongodb.net/
DATABASE_NAME=quiz_app
PORT=8000
CORS_ORIGINS=https://your-vercel-app.vercel.app
```

## 🧪 Testing Deployment

1. **Test Backend**:
   ```bash
   curl https://your-backend-url.com/
   # Should return: {"message": "Quiz App Backend Running"}
   ```

2. **Test Frontend**:
   - Visit your Vercel URL
   - Try creating a game
   - Test joining with another device

3. **Test Real-time Connection**:
   - Open browser console (F12)
   - Should see Socket.IO connection logs
   - No CORS errors

## 🐛 Troubleshooting

### CORS Errors
- Make sure `CORS_ORIGINS` in backend includes your Vercel URL
- Check that URLs don't have trailing slashes

### Socket.IO Connection Failed
- Verify `VITE_SOCKET_URL` matches your backend URL exactly
- Check backend logs for connection attempts
- Ensure backend supports WebSocket protocol

### MongoDB Connection Issues
- Verify connection string is correct
- Check MongoDB Atlas network access (whitelist 0.0.0.0/0 for all IPs)
- Ensure database user has correct permissions

### Build Failures
- Clear Vercel build cache and redeploy
- Check that all dependencies are in package.json
- Verify Node.js version compatibility

## 📊 Monitoring

### Backend Monitoring
- Railway: Built-in logs and metrics
- Render: Logs tab in dashboard
- Heroku: `heroku logs --tail`

### Frontend Monitoring
- Vercel: Analytics tab in dashboard
- Check deployment logs for build issues

## 🔐 Security Checklist

- [ ] Change default admin credentials
- [ ] Use environment variables for all secrets
- [ ] Enable MongoDB Atlas IP whitelist (optional)
- [ ] Set up proper CORS origins
- [ ] Use HTTPS for all connections
- [ ] Regularly update dependencies

## 💰 Cost Estimates

### Free Tier Options:
- **MongoDB Atlas**: 512MB free (good for small apps)
- **Vercel**: Unlimited deployments, 100GB bandwidth/month
- **Railway**: $5 credit/month (usually enough for hobby projects)
- **Render**: Free tier with 750 hours/month

### Scaling Considerations:
- If you exceed free tiers, expect $5-20/month for small-medium traffic
- MongoDB Atlas paid plans start at $9/month
- Backend hosting: $7-25/month depending on platform

## 🚀 Alternative Deployment Strategies

### All-in-One Platform
Deploy everything to a single VPS (Digital Ocean, AWS EC2, etc.):
- More control, slightly more complex
- Cost: ~$5-10/month
- Requires server management skills

### Docker Deployment
Containerize both frontend and backend:
- Better for scaling
- Can deploy to AWS ECS, Google Cloud Run, etc.
- Requires Docker knowledge

## 📝 Post-Deployment Checklist

- [ ] Test game creation flow
- [ ] Test player joining
- [ ] Verify real-time updates work
- [ ] Test on mobile devices
- [ ] Check all environment variables are set
- [ ] Monitor error logs for first 24 hours
- [ ] Set up uptime monitoring (optional: UptimeRobot, Pingdom)

## 🆘 Support

If you encounter issues:
1. Check platform-specific documentation
2. Review error logs carefully
3. Verify all environment variables
4. Test locally first to isolate issues

---

**Need Help?** Create an issue in the repository with:
- Deployment platform used
- Error messages/logs
- Steps to reproduce the issue
