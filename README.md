⚡ ChronOps
Unified Event Command Center
AI-powered task management + real-time schedule reflow for seamless event execution.

ChronOps is an all-in-one event operations platform built for fast-moving clubs, hackathons, conferences, and live events.

It combines AI-powered meeting intelligence with a real-time schedule reflow engine, helping organizers turn messy discussions into actionable tasks and keep events running even when schedules fall behind.

🎯 The Problem
Event operations often break down because of two recurring problems:

📝 Meeting decisions get lost
Unstructured meeting notes make it difficult to identify tasks, assign responsibilities, and track deadlines.

⏱️ Live schedules are fragile
When a session runs over time, organizers have to manually recalculate the remaining schedule, creating delays and communication chaos.

ChronOps solves both.
Meeting → AI → Tasks → Execution → Real-time Reflow

🚀 Key Features
🤖 1. AI Meeting Note Ingestion
Turn messy meeting discussions into structured, actionable tasks.

Organizers can paste raw meeting notes or transcripts into ChronOps. Using Google Gemini 2.5 Flash, the system automatically extracts:

📌 Task title

👤 Assignee

📅 Deadline

🗂️ Structured task information

The extracted tasks are automatically stored in the database and displayed on the Kanban board.

Example
Meeting:
"Rahul will handle the stage setup before 5 PM.
Priya will contact the speakers by tomorrow."

              ↓ Gemini AI

┌─────────────────────────────────────┐
│ Stage Setup                         │
│ Assignee: Rahul                     │
│ Deadline: 5:00 PM                   │
├─────────────────────────────────────┤
│ Contact Speakers                    │
│ Assignee: Priya                     │
│ Deadline: Tomorrow                  │
└─────────────────────────────────────┘
⏱️ 2. Dynamic Time-Reflow Engine
Live events rarely follow the original schedule.

ChronOps automatically recalculates the run-sheet when delays occur.

🔒 Fixed Slots
Critical sessions that cannot move.

Examples:

Keynote

Guest appearance

External speaker

Venue booking constraint

🔄 Flexible Slots
Sessions that can automatically absorb delays.

Examples:

Panel discussions

Q&A

Breaks

Internal sessions

Example
ORIGINAL SCHEDULE

10:00  Opening
10:30  Keynote        🔒 Fixed
11:30  Panel          🔄 Flexible
12:15  Q&A            🔄 Flexible
12:45  Lunch          🔄 Flexible


              +15 MIN DELAY
                    ↓


REFLOWED SCHEDULE

10:15  Opening
10:45  Keynote        🔒 Fixed
11:30  Panel          🔄 Compressed
12:15  Q&A            🔄 Flexible
12:45  Lunch          🔄 Flexible
Organizers can simulate this directly from the dashboard using the:

+15m Delay Simulator
No manual recalculation.
No spreadsheet chaos.
Just an updated run-sheet.

🖥️ 3. Unified Command Center
ChronOps provides a single dashboard for both planning and execution.

Run-Sheet View
Monitor the live event timeline and immediately see:

Current session

Upcoming sessions

Delays

Fixed constraints

Reflowed timings

Kanban View
Track operational tasks using a simple workflow:

┌──────────────┬──────────────┬──────────────┐
│ TODO         │ IN PROGRESS  │ DONE         │
├──────────────┼──────────────┼──────────────┤
│ Stage Setup  │ Speaker Call │ Registration │
│ AV Check     │ Banner       │ Volunteers   │
│ Guest Kit    │              │              │
└──────────────┴──────────────┴──────────────┘
🏗️ Architecture
                 ┌──────────────────────┐
                 │      React UI        │
                 │ Vite + Tailwind CSS  │
                 └──────────┬───────────┘
                            │
                         REST API
                            │
                            ▼
                 ┌──────────────────────┐
                 │       FastAPI        │
                 │      Backend         │
                 └───────┬───────┬──────┘
                         │       │
             ┌───────────┘       └────────────┐
             ▼                                ▼
     ┌────────────────┐              ┌─────────────────┐
     │    SQLite      │              │   Gemini AI     │
     │   Database     │              │  2.5 Flash      │
     └────────────────┘              └─────────────────┘
             │
             ▼
     ┌────────────────┐
     │ Reflow Engine  │
     │ Delay Handling │
     └────────────────┘
🛠️ Tech Stack
Layer	Technology
🎨 Frontend	React, Vite
💅 Styling	Tailwind CSS
🎯 Icons	Lucide React
🔌 API	FastAPI
🐍 Backend	Python
🗄️ Database	SQLite
🧩 ORM	SQLAlchemy
🤖 AI	Google Gemini 2.5 Flash
📡 HTTP Client	Axios
🚀 Server	Uvicorn
📂 Project Structure
Vertex_PS-3_ClubOpsAI/
│
├── chronops-backend/
│   │
│   ├── main.py
│   │   ├── FastAPI entrypoint
│   │   ├── API routes
│   │   └── Database initialization
│   │
│   ├── database.py
│   │   └── SQLAlchemy + SQLite configuration
│   │
│   ├── models.py
│   │   └── Database models
│   │
│   ├── ai_service.py
│   │   └── Gemini AI integration
│   │
│   ├── reflow_engine.py
│   │   └── Schedule delay & compression logic
│   │
│   └── chronops.db
│       └── SQLite database
│
└── chronops-frontend/
    │
    ├── src/
    │   └── App.jsx
    │       └── Main dashboard
    │
    ├── package.json
    └── tailwind.config.js
⚙️ How ChronOps Works
          MEETING
             │
             ▼
      Meeting Notes
             │
             ▼
        Gemini AI
             │
             ▼
     Structured Tasks
             │
             ▼
       ┌───────────┐
       │  Kanban   │
       │  Board    │
       └───────────┘


        LIVE EVENT
             │
             ▼
       Session Delay
             │
             ▼
      Reflow Engine
             │
       ┌─────┴─────┐
       ▼           ▼
   Fixed Slots  Flexible Slots
       │           │
       │      Compress / Shift
       │           │
       └─────┬─────┘
             ▼
       Updated Run-Sheet
💡 Why ChronOps?
Traditional event management often relies on a combination of:

WhatsApp + Google Docs + Excel + Manual Calls
ChronOps brings the operational workflow into one place:

        PLAN
         ↓
      AI EXTRACT
         ↓
       ASSIGN
         ↓
      EXECUTE
         ↓
      MONITOR
         ↓
       REFLOW
         ↓
       DELIVER
The goal is simple:

When the plan changes, the system adapts with it.

🚀 Getting Started
Backend
cd chronops-backend

pip install -r requirements.txt

uvicorn main:app --reload
Backend will be available at:

http://127.0.0.1:8000
Frontend
cd chronops-frontend

npm install

npm run dev
The frontend will typically be available at:

http://127.0.0.1:5173
🔑 Environment Variables
Create a .env file inside the backend:

GEMINI_API_KEY=your_api_key_here
Never commit API keys or .env files to GitHub.

🧪 Core Modules
ai_service.py
Responsible for converting unstructured meeting text into structured task data using Gemini.

reflow_engine.py
Responsible for calculating schedule changes when sessions are delayed.

models.py
Defines the database entities for:

Events

Sessions

Tasks

Meeting notes

main.py
Connects the application components through FastAPI routes.

🏆 Built For
ChronOps can be used for:

🎓 College festivals

💻 Hackathons

🎤 Conferences

🎭 Cultural events

🏢 Corporate events

🏛️ Club operations

🎪 Multi-stage events

⚡ Core Idea
ChronOps is not just an event planner.

It is an execution engine designed to help organizers adapt when reality doesn't follow the plan.

Plan less. React faster. Execute better.

👥 Team
Built with ❤️ during a 24-hour hackathon.

ChronOps — Unified Event Command Center


Add a prominent live demo link

Yes. Put the live demo near the top, immediately after the project tagline, so judges/reviewers see it without scrolling.

Use this section:

ChronOps README
⚡ ChronOps
Unified Event Command Center
AI-powered task management + real-time schedule reflow for seamless event execution.

🚀 Live Demo
👉 🔴 Launch ChronOps Live Demo →
Try the command center:
AI Meeting Notes → Task Extraction → Kanban → Live Run-Sheet → +15m Delay → Automatic Schedule Reflow

ChronOps is an all-in-one event operations platform built for fast-moving clubs, hackathons, conferences, and live events.

It combines AI-powered meeting intelligence with a real-time schedule reflow engine, helping organizers turn messy discussions into actionable tasks and keep events running even when schedules fall behind.

Replace YOUR_LIVE_DEMO_URL with your deployed frontend URL, for example:

https://chronops.vercel.app
If you also have a deployed backend/API, you can add:

| 🌐 Frontend | [Launch Demo](https://your-frontend-url.com) |
| ⚡ Backend | [API](https://your-backend-url.com) |
| 📖 API Docs | [Swagger](https://your-backend-url.com/docs) |
For a hackathon README, I'd keep the big Live Demo button at the top and put API/GitHub links underneath it.




Ad

make md file

Done. I created the complete Markdown README with the prominent Live Demo section at the top.


Just replace YOUR_LIVE_DEMO_URL with your actual deployed frontend URL. 



ChronOps_README.md


⚡ ChronOps
Unified Event Command Center
AI-powered task management + real-time schedule reflow for seamless event execution.

🚀 Live Demo
👉 🔴 Launch ChronOps Live Demo →
Try the command center:
AI Meeting Notes → Task Extraction → Kanban → Live Run-Sheet → +15m Delay → Automatic Schedule Reflow

ChronOps is an all-in-one event operations platform built for fast-moving clubs, hackathons, conferences, and live events.

It combines AI-powered meeting intelligence with a real-time schedule reflow engine, helping organizers turn messy discussions into actionable tasks and keep events running even when schedules fall behind.

🎯 The Problem
Event operations often break down because of two recurring problems:

📝 Meeting decisions get lost
Unstructured meeting notes make it difficult to identify tasks, assign responsibilities, and track deadlines.

⏱️ Live schedules are fragile
When a session runs over time, organizers have to manually recalculate the remaining schedule, creating delays and communication chaos.

ChronOps solves both.
Meeting → AI → Tasks → Execution → Real-time Reflow

🚀 Key Features
🤖 1. AI Meeting Note Ingestion
Turn messy meeting discussions into structured, actionable tasks.

Organizers can paste raw meeting notes or transcripts into ChronOps. Using Google Gemini 2.5 Flash, the system automatically extracts:

📌 Task title

👤 Assignee

📅 Deadline

🗂️ Structured task information

The extracted tasks are automatically stored in the database and displayed on the Kanban board.

Example
Meeting:
"Rahul will handle the stage setup before 5 PM.
Priya will contact the speakers by tomorrow."

              ↓ Gemini AI

┌─────────────────────────────────────┐
│ Stage Setup                         │
│ Assignee: Rahul                     │
│ Deadline: 5:00 PM                   │
├─────────────────────────────────────┤
│ Contact Speakers                    │
│ Assignee: Priya                     │
│ Deadline: Tomorrow                  │
└─────────────────────────────────────┘
⏱️ 2. Dynamic Time-Reflow Engine
Live events rarely follow the original schedule.

ChronOps automatically recalculates the run-sheet when delays occur.

🔒 Fixed Slots
Critical sessions that cannot move.

Examples:

Keynote

Guest appearance

External speaker

Venue booking constraint

🔄 Flexible Slots
Sessions that can automatically absorb delays.

Examples:

Panel discussions

Q&A

Breaks

Internal sessions

Example
ORIGINAL SCHEDULE

10:00  Opening
10:30  Keynote        🔒 Fixed
11:30  Panel          🔄 Flexible
12:15  Q&A            🔄 Flexible
12:45  Lunch          🔄 Flexible


              +15 MIN DELAY
                    ↓


REFLOWED SCHEDULE

10:15  Opening
10:45  Keynote        🔒 Fixed
11:30  Panel          🔄 Compressed
12:15  Q&A            🔄 Flexible
12:45  Lunch          🔄 Flexible
Organizers can simulate this directly from the dashboard using the:

+15m Delay Simulator
No manual recalculation.
No spreadsheet chaos.
Just an updated run-sheet.

🖥️ 3. Unified Command Center
ChronOps provides a single dashboard for both planning and execution.

Run-Sheet View
Monitor the live event timeline and immediately see:

Current session

Upcoming sessions

Delays

Fixed constraints

Reflowed timings

Kanban View
Track operational tasks using a simple workflow:

┌──────────────┬──────────────┬──────────────┐
│ TODO         │ IN PROGRESS  │ DONE         │
├──────────────┼──────────────┼──────────────┤
│ Stage Setup  │ Speaker Call │ Registration │
│ AV Check     │ Banner       │ Volunteers   │
│ Guest Kit    │              │              │
└──────────────┴──────────────┴──────────────┘
🏗️ Architecture
                 ┌──────────────────────┐
                 │      React UI        │
                 │ Vite + Tailwind CSS  │
                 └──────────┬───────────┘
                            │
                         REST API
                            │
                            ▼
                 ┌──────────────────────┐
                 │       FastAPI        │
                 │      Backend         │
                 └───────┬───────┬──────┘
                         │       │
             ┌───────────┘       └────────────┐
             ▼                                ▼
     ┌────────────────┐              ┌─────────────────┐
     │    SQLite      │              │   Gemini AI     │
     │   Database     │              │  2.5 Flash      │
     └────────────────┘              └─────────────────┘
             │
             ▼
     ┌────────────────┐
     │ Reflow Engine  │
     │ Delay Handling │
     └────────────────┘
🛠️ Tech Stack
Layer	Technology
🎨 Frontend	React, Vite
💅 Styling	Tailwind CSS
🎯 Icons	Lucide React
🔌 API	FastAPI
🐍 Backend	Python
🗄️ Database	SQLite
🧩 ORM	SQLAlchemy
🤖 AI	Google Gemini 2.5 Flash
📡 HTTP Client	Axios
🚀 Server	Uvicorn
📂 Project Structure
Vertex_PS-3_ClubOpsAI/
│
├── chronops-backend/
│   │
│   ├── main.py
│   │   ├── FastAPI entrypoint
│   │   ├── API routes
│   │   └── Database initialization
│   │
│   ├── database.py
│   │   └── SQLAlchemy + SQLite configuration
│   │
│   ├── models.py
│   │   └── Database models
│   │
│   ├── ai_service.py
│   │   └── Gemini AI integration
│   │
│   ├── reflow_engine.py
│   │   └── Schedule delay & compression logic
│   │
│   └── chronops.db
│       └── SQLite database
│
└── chronops-frontend/
    │
    ├── src/
    │   └── App.jsx
    │       └── Main dashboard
    │
    ├── package.json
    └── tailwind.config.js
⚙️ How ChronOps Works
          MEETING
             │
             ▼
      Meeting Notes
             │
             ▼
        Gemini AI
             │
             ▼
     Structured Tasks
             │
             ▼
       ┌───────────┐
       │  Kanban   │
       │  Board    │
       └───────────┘


        LIVE EVENT
             │
             ▼
       Session Delay
             │
             ▼
      Reflow Engine
             │
       ┌─────┴─────┐
       ▼           ▼
   Fixed Slots  Flexible Slots
       │           │
       │      Compress / Shift
       │           │
       └─────┬─────┘
             ▼
       Updated Run-Sheet
💡 Why ChronOps?
Traditional event management often relies on a combination of:

WhatsApp + Google Docs + Excel + Manual Calls
ChronOps brings the operational workflow into one place:

        PLAN
         ↓
      AI EXTRACT
         ↓
       ASSIGN
         ↓
      EXECUTE
         ↓
      MONITOR
         ↓
       REFLOW
         ↓
       DELIVER
The goal is simple:

When the plan changes, the system adapts with it.

🚀 Getting Started
Backend
cd chronops-backend

pip install -r requirements.txt

uvicorn main:app --reload
Backend will be available at:

http://127.0.0.1:8000
Frontend
cd chronops-frontend

npm install

npm run dev
The frontend will typically be available at:

http://127.0.0.1:5173
🔑 Environment Variables
Create a .env file inside the backend:

GEMINI_API_KEY=your_api_key_here
Never commit API keys or .env files to GitHub.

🧪 Core Modules
ai_service.py
Responsible for converting unstructured meeting text into structured task data using Gemini.

reflow_engine.py
Responsible for calculating schedule changes when sessions are delayed.

models.py
Defines the database entities for:

Events

Sessions

Tasks

Meeting notes

main.py
Connects the application components through FastAPI routes.

🏆 Built For
ChronOps can be used for:

🎓 College festivals

💻 Hackathons

🎤 Conferences

🎭 Cultural events

🏢 Corporate events

🏛️ Club operations

🎪 Multi-stage events

⚡ Core Idea
ChronOps is not just an event planner.

It is an execution engine designed to help organizers adapt when reality doesn't follow the plan.

Plan less. React faster. Execute better.

👥 Team
Built with ❤️ during a 24-hour hackathon.

ChronOps — Unified Event Command Center

