from sqlalchemy import Column, Integer, String, Text
from database import Base

class SessionModel(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    start_time = Column(String)  # e.g., "10:00 AM"
    duration_minutes = Column(Integer)
    session_type = Column(String)  # "fixed" or "flexible"
    status = Column(String, default="upcoming")  # "upcoming", "live", "completed", "delayed"

class TaskModel(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    assigned_to = Column(String)
    status = Column(String, default="todo")  # "todo", "in_progress", "done"
    deadline = Column(String)

class MeetingNoteModel(Base):
    __tablename__ = "meeting_notes"

    id = Column(Integer, primary_key=True, index=True)
    raw_text = Column(Text)