import motor.motor_asyncio
from pymongo import MongoClient
import os
from datetime import datetime
from dotenv import load_dotenv
from pathlib import Path

# Load .env from the same directory as this file
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

# MongoDB connection settings
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "quiz_app")

# Async MongoDB client for Motor
motor_client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
database = motor_client[DATABASE_NAME]

# Collections
# Collections
sessions_collection = database["sessions"]
quizzes_collection = database["quizzes"]
responses_collection = database["responses"]

async def create_game_session(room_id, quiz_data):
    """Creates a new game session in the database."""
    session_doc = {
        "room_id": room_id,
        "created_at": datetime.utcnow(),
        "quiz_data": quiz_data,
        "players": [],
        "responses": [],
        "status": "CREATED"
    }
    await sessions_collection.insert_one(session_doc)
    print(f"Session created in DB: {room_id}")

async def add_player_to_session(room_id, player_data):
    """Adds a player to the game session."""
    # player_data: { "sid": ..., "name": ... }
    await sessions_collection.update_one(
        {"room_id": room_id},
        {"$push": {"players": player_data}}
    )

async def create_quiz(quiz_data: dict):
    """Creates a new quiz."""
    quiz_data["created_at"] = datetime.utcnow()
    result = await quizzes_collection.insert_one(quiz_data)
    return str(result.inserted_id)

async def get_quizzes():
    """Returns a list of all quizzes."""
    quizzes = []
    async for quiz in quizzes_collection.find():
        quiz["id"] = str(quiz["_id"])
        del quiz["_id"]
        quizzes.append(quiz)
    return quizzes

async def get_quiz(quiz_id: str):
    """Returns a single quiz by ID."""
    from bson import ObjectId
    try:
        quiz = await quizzes_collection.find_one({"_id": ObjectId(quiz_id)})
        if quiz:
            quiz["id"] = str(quiz["_id"])
            del quiz["_id"]
        return quiz
    except:
        return None

async def save_response(room_id, response_data):
    """Saves a player's response to the dedicated collection."""
    # response_data: { "sid": ..., "question_index": ..., "answer_index": ..., "is_correct": ..., "score_awarded": ... }
    response_data["room_id"] = room_id
    response_data["timestamp"] = datetime.utcnow()
    await responses_collection.insert_one(response_data)

async def get_room_responses(room_id):
    """Retrieves all responses for a specific room."""
    responses = []
    async for r in responses_collection.find({"room_id": room_id}):
        responses.append(r)
    return responses

async def update_session_status(room_id, status):
    """Updates the status of the session (e.g., STARTED, FINISHED)."""
    await sessions_collection.update_one(
        {"room_id": room_id},
        {"$set": {"status": status}}
    )

async def log_question_start_time(room_id, question_index):
    """Logs the start time of a question."""
    await sessions_collection.update_one(
        {"room_id": room_id},
        {"$set": {f"question_start_times.{question_index}": datetime.utcnow()}}
    )

async def get_session_data(room_id):
    """Retrieves full session data."""
    return await sessions_collection.find_one({"room_id": room_id})

async def connect_to_mongodb():
    """Test MongoDB connection"""
    try:
        await motor_client.admin.command("ping")
        print("Successfully connected to MongoDB")
        return True
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")
        return False

async def close_mongodb_connection():
    """Close MongoDB connection"""
    motor_client.close()
