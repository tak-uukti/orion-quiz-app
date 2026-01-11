# Quiz App Backend Server

FastAPI + Socket.IO backend for real-time multiplayer quiz application.

## 🚀 Deployment

### ⚠️ DO NOT Deploy to Vercel

This backend uses Socket.IO which requires persistent WebSocket connections. Vercel's serverless architecture does not support this.

See `VERCEL_WARNING.md` for detailed explanation.

### ✅ Recommended Platforms

Deploy to platforms that support WebSockets:

1. **Railway** (Recommended)
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn main:sio_app --host 0.0.0.0 --port $PORT`

2. **Render**
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn main:sio_app --host 0.0.0.0 --port $PORT`

3. **Heroku**
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn main:sio_app --host 0.0.0.0 --port $PORT`

## 📦 Files

- `main.py` - FastAPI app with Socket.IO integration
- `database.py` - MongoDB connection and queries
- `quiz_manager.py` - Game session management
- `requirements.txt` - Python dependencies
- `.env` - Environment variables (local)
- `.env.example` - Environment template
- `vercel.json` - ⚠️ For reference only, won't work properly
- `VERCEL_WARNING.md` - Why Vercel won't work

## 🔧 Environment Variables

Required for deployment:

```env
MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net/?appName=app
DATABASE_NAME=quiz_app
PORT=8000
CORS_ORIGINS=https://your-frontend.vercel.app
```

## 🏃 Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run server
python -m uvicorn main:sio_app --reload --port 8000
```

Server will run on http://localhost:8000

## 📚 API Endpoints

- `GET /` - Health check
- `GET /export/{room_id}` - Export quiz results as CSV
- WebSocket: `/socket.io` - Real-time game communication

## 🔌 Socket.IO Events

### Client → Server
- `create_game` - Host creates a new game
- `join_game` - Player joins with PIN
- `host_join` - Host joins room
- `start_game` - Host starts the quiz
- `submit_answer` - Player submits answer
- `show_results` - Host shows question results
- `next_question` - Host moves to next question

### Server → Client
- `game_created` - Game created with room ID
- `game_joined` - Player successfully joined
- `player_joined` - Notify all players
- `game_state` - Game status update
- `new_question` - Next question data
- `question_result` - Show correct answer and stats
- `game_over` - Final leaderboard
- `error` - Error messages

## 📖 Full Documentation

See main `DEPLOYMENT.md` in root directory for complete deployment guide.
