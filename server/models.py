from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

class Question(BaseModel):
    title: str
    options: List[str]
    correctOption: int
    timeLimit: int = 20

class QuizBase(BaseModel):
    title: str
    questions: List[Question]

class QuizCreate(QuizBase):
    pass

class Quiz(QuizBase):
    id: str = Field(alias="_id")
    created_at: datetime = datetime.utcnow()

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class Response(BaseModel):
    sid: str
    question_index: int
    answer_index: int
    is_correct: bool
    score_awarded: int
    timestamp: datetime = Field(default_factory=datetime.utcnow)
