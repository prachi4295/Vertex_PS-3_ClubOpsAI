import os
from typing import List
from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

# Load GEMINI_API_KEY from .env file
load_dotenv()

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

# -------------------------------------------------------------
# 1. Pydantic Schemas for ClubOps AI Requirements
# -------------------------------------------------------------
class ExtractedTask(BaseModel):
    title: str = Field(description="Action item or operational task to be done.")
    assigned_to: str = Field(description="Volunteer or lead name, or 'Unassigned'.")
    deadline: str = Field(description="Explicit date/timeframe mentioned, or 'TBD'.")
    priority: str = Field(description="High, Medium, or Low based on event impact.")

class ExtractedRisk(BaseModel):
    risk: str = Field(description="Bottleneck, permission issue, budget strain, or delay risk.")
    mitigation: str = Field(description="Proposed solution or preventative step.")

class MeetingParseResult(BaseModel):
    summary: str = Field(description="A concise 2-3 sentence overview of the meeting outcome.")
    tasks: List[ExtractedTask]
    risks: List[ExtractedRisk]
    whatsapp_announcement: str = Field(
        description="A polished, formatted broadcast message with emojis for club members/volunteers."
    )

# -------------------------------------------------------------
# 2. Main Service Function
# -------------------------------------------------------------
def parse_meeting_notes_with_gemini(raw_notes: str) -> dict:
    """
    Parses messy meeting notes/transcripts into tasks, risks, summaries, 
    and ready-to-share announcements using Gemini 2.5 Flash.
    """
    prompt = f"""
    You are the central operational AI for a student club.
    Analyze the following club meeting notes or transcript.
    
    Extract:
    1. A concise summary of decisions made.
    2. All action items with assigned members, deadlines, and priorities.
    3. Potential risks, bottlenecks, or pending administrative clearances.
    4. An engaging, copy-paste-ready WhatsApp announcement for members.

    Meeting Notes:
    \"\"\"{raw_notes}\"\"\"
    """

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=MeetingParseResult,
            temperature=0.2,
        ),
    )
    
    # Parse the JSON response back into Python dictionaries
    import json
    result_data = json.loads(response.text)
    return result_data.get("tasks", [])