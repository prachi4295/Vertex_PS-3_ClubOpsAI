# \# ⚡ ChronOps: Unified Event Command Center

# > \*\*Problem Statement:\*\* Built for a 24-hour hackathon focusing on club operations, automated task management, and real-time stage execution.

# 

# ChronOps is an all-in-one event management and real-time execution engine designed to eliminate chaotic handovers and stage delays. It bridges automated AI task tracking with a dynamic, real-time schedule reflow system to keep live events running seamlessly.

# 

# \---

# 

# \## 🚀 Key Features

# 

# \### 1. \*\*AI Meeting Note Ingestion\*\*

# \* \*\*The Problem:\*\* Club meeting minutes are messy, unstructured, and often result in lost tasks and unassigned responsibilities.

# \* \*\*The Solution:\*\* Organizers can paste raw meeting text or transcripts into ChronOps. Powered by \*\*Google Gemini 2.5 Flash\*\*, the backend automatically extracts clean, structured tasks (Title, Assignee, Deadline) and pushes them straight to the SQLite database and Kanban board.

# 

# \### 2. \*\*Dynamic Time-Reflow Engine\*\*

# \* \*\*The Problem:\*\* Live events always run behind schedule. When one session overruns, manually recalculating the entire remaining run-sheet causes chaos.

# \* \*\*The Solution:\*\* ChronOps features an algorithmic reflow engine. 

# &#x20; \* \*\*Fixed Slots\*\* (e.g., Keynotes, hard booking constraints) act as absolute boundaries that cannot be shifted.

# &#x20; \* \*\*Flexible Slots\*\* (e.g., Panel Discussions, Q\&A, breaks) automatically compress or push back downstream to absorb delays seamlessly.

# &#x20; \* Organizers can test this live with the \*\*`+15m Delay`\*\* simulator button in the dashboard.

# 

# \### 3. \*\*Unified React + FastAPI Architecture\*\*

# \* \*\*Frontend:\*\* Built with React, Vite, Tailwind CSS, and Lucide Icons for a modern dark-mode command center UI.

# \* \*\*Backend:\*\* Built with FastAPI (Python) and SQLAlchemy over a local SQLite database (`chronops.db`).

# 

# \---

# 

# \## 🛠️ Tech Stack

# 

# \* \*\*Backend:\*\* Python, FastAPI, Uvicorn, SQLAlchemy, SQLite, Google GenAI SDK (`google-genai`).

# \* \*\*Frontend:\*\* React, Vite, Tailwind CSS, Axios, Lucide React.

# \* \*\*AI Model:\*\* Google Gemini (`gemini-2.5-flash`) via structured schema generation.

# 

# \---

# 

# \## 📂 Project Structure

# 

# ```text

# Vertex\_PS-3\_ClubOpsAI/

# ├── chronops-backend/

# │   ├── main.py            # FastAPI entrypoint, database init, API routes

# │   ├── database.py        # SQLAlchemy SQLite setup and session handling

# │   ├── models.py          # Database tables (Sessions, Tasks, MeetingNotes)

# │   ├── ai\_service.py      # Gemini AI integration for structured task parsing

# │   ├── reflow\_engine.py   # Delay propagation and schedule compression logic

# │   └── chronops.db        # SQLite database (auto-generated)

# └── chronops-frontend/

# &#x20;   ├── src/

# &#x20;   │   └── App.jsx        # Main dashboard UI (Run-Sheet \& Kanban views)

# &#x20;   ├── package.json

# &#x20;   └── tailwind.config.js

