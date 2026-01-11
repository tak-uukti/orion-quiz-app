import random
import string
import time

class Player:
    def __init__(self, sid, name):
        self.sid = sid
        self.name = name
        self.score = 0
        self.streak = 0

class Room:
    def __init__(self, room_id, quiz_data):
        self.room_id = room_id
        self.quiz_data = quiz_data
        self.players = {}  # sid -> Player
        self.current_question_index = -1
        self.status = "WAITING"  # WAITING, COUNTDOWN, QUESTION, RESULT, LEADERBOARD, FINISHED
        self.answers = {}  # question_index -> {sid -> answer_index}
        self.start_time = 0

    def add_player(self, sid, name):
        if sid in self.players:
            return False
        # Prevent duplicate names
        for p in self.players.values():
            if p.name == name:
                return False
        self.players[sid] = Player(sid, name)
        return True

    def remove_player(self, sid):
        if sid in self.players:
            del self.players[sid]

    def submit_answer(self, sid, answer_index):
        if self.status != "QUESTION":
            return False
        
        current_q_idx = self.current_question_index
        if current_q_idx not in self.answers:
            self.answers[current_q_idx] = {}
        
        # Only allow one answer per question per player
        if sid in self.answers[current_q_idx]:
            return False
            
        self.answers[current_q_idx][sid] = answer_index
        
        # Calculate score based on speed (simple version: 1000 pts if correct)
        # More complex: 1000 * (1 - (time_elapsed / time_limit) / 2)
        question = self.quiz_data['questions'][current_q_idx]
        is_correct = False
        score_awarded = 0
        if answer_index == question['correctOption']:
            is_correct = True
            score_awarded = 1000
            self.players[sid].score += score_awarded
            self.players[sid].streak += 1
        else:
            self.players[sid].streak = 0
            
        return {
            'success': True,
            'is_correct': is_correct,
            'score_awarded': score_awarded
        }

    def next_question(self):
        if self.current_question_index < len(self.quiz_data['questions']) - 1:
            self.current_question_index += 1
            self.status = "QUESTION"
            self.start_time = time.time()
            return True
        else:
            self.status = "FINISHED"
            return False

class QuizManager:
    def __init__(self):
        self.rooms = {}  # room_id -> Room

    def create_room(self, quiz_data):
        room_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        while room_id in self.rooms:
            room_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        
        self.rooms[room_id] = Room(room_id, quiz_data)
        return room_id

    def get_room(self, room_id):
        return self.rooms.get(room_id)
        
    def get_room_by_sid(self, sid):
        for room in self.rooms.values():
            if sid in room.players:
                return room
        return None

quiz_manager = QuizManager()
