from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import models
from database import engine, get_db
from ai_service import parse_meeting_notes_with_gemini
from pydantic import BaseModel
from reflow_engine import recalculate_schedule


app = FastAPI(title="ChronOps API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables
models.Base.metadata.create_all(bind=engine)

# ---------------------------------------------------------
# Schemas
# ---------------------------------------------------------
class DelayTrigger(BaseModel):
    session_id: int
    delay_minutes: int

class MeetingNoteCreate(BaseModel):
    raw_text: str

# ---------------------------------------------------------
# Simulate Delay Endpoint
# ---------------------------------------------------------
@app.post("/api/sessions/simulate-delay")
def simulate_delay(payload: DelayTrigger, db: Session = Depends(get_db)):
    # 1. Fetch all sessions
    db_sessions = db.query(models.SessionModel).all()
    if not db_sessions:
        return {"error": "No sessions found in database."}

    # Convert SQLAlchemy models to dicts
    sessions_list = [
        {
            "id": s.id,
            "title": s.title,
            "start_time": s.start_time,
            "duration_minutes": s.duration_minutes,
            "session_type": s.session_type,
            "status": s.status
        }
        for s in db_sessions
    ]

    # 2. Run reflow algorithm
    updated_sessions = recalculate_schedule(
        sessions_list,
        payload.session_id,
        payload.delay_minutes
    )

    # 3. Save updated times
    for u in updated_sessions:
        db_item = db.query(models.SessionModel).filter(models.SessionModel.id == u["id"]).first()
        if db_item:
            db_item.start_time = u["start_time"]
            db_item.duration_minutes = u["duration_minutes"]

    db.commit()

    return {
        "message": "Schedule reflowed successfully!",
        "sessions": updated_sessions
    }

# ---------------------------------------------------------
# Parse Meeting Notes + Auto-create Tasks
# ---------------------------------------------------------
@app.post("/api/meetings/parse")
def parse_and_save_meeting(note: MeetingNoteCreate, db: Session = Depends(get_db)):
    # 1. Save raw note
    db_note = models.MeetingNoteModel(raw_text=note.raw_text)
    db.add(db_note)
    db.commit()

    try:
        # 2. Extract tasks using Gemini
        extracted_tasks = parse_meeting_notes_with_gemini(note.raw_text)

        # 3. Save tasks
        saved_tasks = []
        for t in extracted_tasks:
            db_task = models.TaskModel(
                title=t["title"],
                assigned_to=t["assigned_to"],
                deadline=t["deadline"],
                status="todo"
            )
            db.add(db_task)
            db.commit()
            db.refresh(db_task)

            saved_tasks.append({
                "id": db_task.id,
                "title": db_task.title,
                "assigned_to": db_task.assigned_to,
                "deadline": db_task.deadline,
                "status": db_task.status
            })

        return {
            "message": "Meeting parsed and tasks created successfully!",
            "tasks": saved_tasks
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/tasks")
def get_tasks(db: Session = Depends(get_db)):
    tasks = db.query(models.TaskModel).all()
    return [
        {
            "id": t.id,
            "title": t.title,
            "assigned_to": t.assigned_to,
            "deadline": t.deadline,
            "status": t.status
        }
        for t in tasks
    ]
