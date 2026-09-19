from datetime import datetime, timedelta

def time_to_minutes(time_str: str) -> int:
    """Converts '10:00 AM' to minutes past midnight."""
    dt = datetime.strptime(time_str.strip(), "%I:%M %p")
    return dt.hour * 60 + dt.minute

def minutes_to_time(minutes: int) -> str:
    """Converts minutes past midnight back to '10:00 AM'."""
    # Ensure minutes don't exceed a 24-hour cycle
    minutes = minutes % (24 * 60)
    dt = datetime.strptime(f"{minutes // 60:02d}:{minutes % 60:02d}", "%H:%M")
    return dt.strftime("%I:%M %p").lstrip("0")

def recalculate_schedule(sessions: list, delayed_session_id: int, extra_delay_minutes: int):
    """
    sessions: list of dictionaries or SQLAlchemy objects representing sessions.
              Each must have: id, start_time, duration_minutes, session_type ('fixed' or 'flexible')
    delayed_session_id: the ID of the session that overran.
    extra_delay_minutes: how many extra minutes it took.
    """
    # Sort sessions by current start time just in case
    sorted_sessions = sorted(sessions, key=lambda x: time_to_minutes(x["start_time"]))
    
    propagation_delay = 0
    target_hit = False

    for session in sorted_sessions:
        if session["id"] == delayed_session_id:
            propagation_delay = extra_delay_minutes
            session["duration_minutes"] += extra_delay_minutes
            target_hit = True
            continue

        if target_hit:
            if propagation_delay == 0:
                break # No more delay to absorb or push

            current_start_mins = time_to_minutes(session["start_time"])
            new_start_mins = current_start_mins + propagation_delay

            if session["session_type"] == "fixed":
                # Fixed slots CANNOT move. The delay must be absorbed entirely 
                # by shortening this session or treating it as a buffer wall.
                # For hackathon simplicity, we cap the propagation if it hits a fixed wall, 
                # or we compress flexible slots right before it.
                propagation_delay = 0  # Stop cascade from breaking fixed slot
            else:
                # Flexible slot: shifts its start time downstream
                session["start_time"] = minutes_to_time(new_start_mins)
                
    return sorted_sessions