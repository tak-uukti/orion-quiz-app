
import asyncio
import socketio
import sys
import httpx

# Create two clients
host_sio = socketio.AsyncClient()
player_sio = socketio.AsyncClient()




SERVER_URL = 'http://127.0.0.1:8000'
room_id = None
quiz_id_created = None




@host_sio.event
async def connect():
    print("Host connected")

@host_sio.event
async def game_created(data):
    global room_id
    room_id = data['roomId']
    print(f"Game Created: {room_id}")
    # Join as host
    await host_sio.emit('host_join', {'roomId': room_id})

@host_sio.event
async def player_joined(data):
    print(f"Host saw player join: {data['name']}")
    # Start Game
    print("Host starting game...")
    await host_sio.emit('start_game', {'roomId': room_id})

@host_sio.event
async def game_state(data):
    print(f"Host received game_state: {data['status']}")
    if data['status'] == 'COUNTDOWN':
        print("SUCCESS: Game started!")
        await host_sio.disconnect()
        await player_sio.disconnect()
        sys.exit(0)

@host_sio.event
async def error(data):
    print(f"Host Error: {data}")

@player_sio.event
async def connect():
    print("Player connected")
    # Join game
    if room_id:
        print(f"Player joining room {room_id}")
        await player_sio.emit('join_game', {'roomId': room_id, 'name': 'TestPlayer'})

@player_sio.event
async def game_joined(data):
    print("Player joined successfully")

@player_sio.event
async def error(data):
    print(f"Player Error: {data}")

async def create_quiz_via_api():
    async with httpx.AsyncClient() as client:
        quiz_data = {
            'title': 'Test Quiz API',
            'questions': [
                {'title': 'Q1', 'options': ['A','B','C','D'], 'correctOption': 0, 'timeLimit': 10}
            ]
        }
        resp = await client.post(f"{SERVER_URL}/api/quizzes", json=quiz_data)
        if resp.status_code == 200:
            return resp.json()['id']
        else:
            print(f"Failed to create quiz: {resp.text}")
            return None

async def main():
    global quiz_id_created
    try:
        # Create Quiz via API first
        quiz_id_created = await create_quiz_via_api()
        if not quiz_id_created:
            print("Aborting test due to API failure")
            return

        print(f"Quiz created via API with ID: {quiz_id_created}")

        await host_sio.connect(SERVER_URL)
        
        # Create Game using Quiz ID
        await host_sio.emit('create_game', {'quizId': quiz_id_created})
        
        # Wait for room creation
        await asyncio.sleep(1)
        
        if room_id:
            await player_sio.connect(SERVER_URL)
        else:
            print("Failed to create room")
            return

        # Keep alive for a bit
        await asyncio.sleep(5)
    except Exception as e:
        print(f"Test failed: {e}")
    finally:
        if host_sio.connected:
            await host_sio.disconnect()
        if player_sio.connected:
            await player_sio.disconnect()

if __name__ == '__main__':
    asyncio.run(main())
