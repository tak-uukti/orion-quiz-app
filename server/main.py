from fastapi import FastAPI
from fastapi import FastAPI, Response
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import socketio
import csv
import io
from datetime import datetime
import asyncio
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI()

# Configure CORS
cors_origins = os.getenv("CORS_ORIGINS", "*")
# Convert comma-separated string to list
allowed_origins = [origin.strip() for origin in cors_origins.split(",")] if cors_origins != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create Socket.IO server (Async)
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins=allowed_origins)
sio_app = socketio.ASGIApp(sio, app)

# In-memory storage
games = {} 

@app.get("/")
async def root():
    return {"message": "Quiz App Backend Running"}

from quiz_manager import quiz_manager
from database import (
    connect_to_mongodb,
    create_game_session,
    add_player_to_session,
    save_response,
    update_session_status,
    log_question_start_time,
    get_session_data
)

@app.get("/export/{room_id}")
async def export_results(room_id: str):
    session = await get_session_data(room_id)
    if not session:
        return Response("Session not found", status_code=404)

    # Prepare CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow(["Player Name", "Question Index", "Question Title", "Answer Selected", "Correct Answer", "Is Correct", "Time Taken (s)", "Score Awarded", "Total Score"])
    
    quiz_data = session.get("quiz_data", {})
    questions = quiz_data.get("questions", [])
    responses = session.get("responses", [])
    players = {p["sid"]: p for p in session.get("players", [])}
    start_times = session.get("question_start_times", {})
    
    # Build a lookup for responses
    # We want to export every response. 
    # Also we might want to list all players for all questions even if they didn't answer?
    # For now, let's just export recorded responses.
    
    for r in responses:
        sid = r.get("sid")
        player = players.get(sid, {"name": "Unknown"})
        q_idx = r.get("question_index")
        a_idx = r.get("answer_index")
        
        question = questions[q_idx] if q_idx < len(questions) else {}
        q_title = question.get("title", "")
        options = question.get("options", [])
        correct_opt = question.get("correctOption")
        
        answer_text = options[a_idx] if a_idx < len(options) else str(a_idx)
        correct_text = options[correct_opt] if correct_opt < len(options) else str(correct_opt)
        
        # Calculate time taken
        # response timestamp - question start time
        time_taken = "N/A"
        start_time = start_times.get(str(q_idx)) # Keys might be strings in Mongo
        if start_time and r.get("timestamp"):
            # Ensure proper datetime objects
            # Mongo might return datetime objects directly
            try:
                # If naive, assume UTC
                t1 = r.get("timestamp")
                t2 = start_time
                delta = t1 - t2
                time_taken = round(delta.total_seconds(), 2)
            except Exception as e:
                print(f"Error calculating time: {e}")
                
        writer.writerow([
            player.get("name"),
            q_idx + 1,
            q_title,
            answer_text,
            correct_text,
            "Yes" if r.get("is_correct") else "No",
            time_taken,
            r.get("score_awarded", 0),
            # Total score calculation is complex here without iterating everything for that player up to this point
            # We can just show current total score from 'players' array but that's final score.
            # Let's just leave Total Score as final score for now or omit.
            # Actually let's just dump the final score from the player object
            # Note: The player object in 'players' array is updated only on join. 
            # We don't stick the final score back into the 'players' array in session (yet).
            # The session responses are the source of truth.
            "N/A" 
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=results_{room_id}.csv"}
    )
    

@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongodb()

# Socket.IO Events
@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")
    room = quiz_manager.get_room_by_sid(sid)
    if room:
        room.remove_player(sid)
        await sio.emit('player_left', {'sid': sid}, room=room.room_id)

@sio.event
async def create_game(sid, data):
    # data: { quizData: {...} }
    quiz_data = data.get('quizData')
    room_id = quiz_manager.create_room(quiz_data)
    print(f"Game created: {room_id}")
    await create_game_session(room_id, quiz_data)
    await sio.emit('game_created', {'roomId': room_id}, room=sid)

@sio.event
async def join_game(sid, data):
    # data: { roomId: "...", name: "..." }
    room_id = data.get('roomId')
    name = data.get('name')
    
    room = quiz_manager.get_room(room_id)
    if room:
        if room.add_player(sid, name):
            await sio.enter_room(sid, room_id)
            await sio.emit('game_joined', {'roomId': room_id, 'name': name}, room=sid)
            # Notify host (we iterate to find host? Or just broadcast to room)
            # Actually, host should be in the room too? Or host is separate?
            # For simplicity, Host creates the room but isn't a "Player".
            # Host should join the room too as "Host".
            await add_player_to_session(room_id, {"sid": sid, "name": name})
            await sio.emit('player_joined', {'sid': sid, 'name': name}, room=room_id)
        else:
            await sio.emit('error', {'message': 'Name taken or already joined'}, room=sid)
    else:
        await sio.emit('error', {'message': 'Room not found'}, room=sid)

@sio.event
async def host_join(sid, data):
    # Host joins the room to receive updates but isn't a player
    room_id = data.get('roomId')
    room = quiz_manager.get_room(room_id)
    if room:
        await sio.enter_room(sid, room_id)
        print(f"Host joined room: {room_id}")
    else:
        print(f"Host tried to join invalid room: {room_id}")
        await sio.emit('error', {'message': 'Room does not exist (Server restarted?)'}, room=sid)

@sio.event
async def start_game(sid, data):
    room_id = data.get('roomId')
    room = quiz_manager.get_room(room_id)
    if room:
        print(f"Starting game for room: {room_id}")
        room.status = "COUNTDOWN"
        # Emit state change immediately to UI
        await sio.emit('game_state', {'status': 'COUNTDOWN'}, room=room_id)
        
        # Update DB in background/separately
        try:
            await update_session_status(room_id, "STARTED")
        except Exception as e:
            print(f"DB Update failed: {e}")

        # Start first question after simple delay or immediate
        # In real app, maybe wait 3 sec then next_question
        await sio.sleep(3)
        if room.next_question():
            question = room.quiz_data['questions'][room.current_question_index]
            # Send question without correct answer to players
            player_q = {
                'title': question['title'],
                'options': question['options'],
                'timeLimit': question['timeLimit']
            }
            # Log start time
            try:
                await log_question_start_time(room_id, room.current_question_index)
            except Exception as e:
                print(f"DB Log failed: {e}")
                
            await sio.emit('new_question', player_q, room=room_id)
            
            # Start timer on server (optional, or rely on client timer + server validation)
    else:
        print(f"Start game failed for room: {room_id}")
        await sio.emit('error', {'message': 'Room not found. Please create a new game.'}, room=sid)
            
@sio.event
async def submit_answer(sid, data):
    room_id = data.get('roomId')
    answer_index = data.get('answerIndex')
    room = quiz_manager.get_room(room_id)
    if room:
        result = room.submit_answer(sid, answer_index)
        if result and result['success']:
            await save_response(room_id, {
                "sid": sid,
                "question_index": room.current_question_index,
                "answer_index": answer_index,
                "is_correct": result['is_correct'],
                "score_awarded": result['score_awarded']
            })
            await sio.emit('answer_received', {'sid': sid}, room=sid)

@sio.event
async def show_results(sid, data):
    # Host triggers this after time is up
    room_id = data.get('roomId')
    room = quiz_manager.get_room(room_id)
    if room:
        room.status = "SHOWING_RESULTS"
        current_q = room.quiz_data['questions'][room.current_question_index]
        payload = {
            'correctOption': current_q['correctOption'],
            'stats': room.answers.get(room.current_question_index, {})
        }
        await sio.emit('question_result', payload, room=room_id)

@sio.event
async def next_question(sid, data):
    room_id = data.get('roomId')
    room = quiz_manager.get_room(room_id)
    if room:
        if room.next_question():
             question = room.quiz_data['questions'][room.current_question_index]
             player_q = {
                'title': question['title'],
                'options': question['options'],
                'timeLimit': question['timeLimit']
            }
             # Log start time
             await log_question_start_time(room_id, room.current_question_index)
             await sio.emit('new_question', player_q, room=room_id)
        else:
            # Game Over
            # Send final leaderboard
            # Send final leaderboard
            leaderboard = sorted(room.players.values(), key=lambda x: x.score, reverse=True)
            leaderboard_data = [{'name': p.name, 'score': p.score} for p in leaderboard]
            await update_session_status(room_id, "FINISHED")
            await sio.emit('game_over', {'leaderboard': leaderboard_data}, room=room_id)
