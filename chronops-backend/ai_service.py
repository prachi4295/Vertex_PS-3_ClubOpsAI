import os
from google import genai
from google.genai import types
from pydantic import BaseModel, Field
from typing import List

# Initialize the Gemini client. 
# Make sure to set your GEMINI_API_KEY environment variable, or pass it directly.
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

# Define the structure we want Gemini to return
class ExtractedTask(BaseModel):
    title: str = Field(description="The action item or task to be done.")
    assigned_to: str = Field(description="The name of the person assigned to the task, or 'Unassigned' if none.")
    deadline: str = Field(description="The deadline or time frame mentioned, or 'TBD'.")

class MeetingParseResult(BaseModel):
    tasks: List[ExtractedTask]

def parse_meeting_notes_with_gemini(raw_notes: str) -> List[dict]:
    prompt = f"""
    Analyze the following club meeting notes/transcript. Extract all action items, 
    who is responsible for them, and their deadlines.
    
    Meeting Notes:
    {raw_notes}
    """

    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=MeetingParseResult,
            temperature=0.1,
        ),
    )
    
    # Parse the JSON response back into Python dictionaries
    import json
    result_data = json.loads(response.text)
    return result_data.get("tasks", [])