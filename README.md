# ⚡ ChronOpsAI
> **Unified Event Command Center for Student Clubs & Hackathons**  
> AI-powered multi-event task management + real-time schedule reflow for seamless event execution.  
> Built with **React 19**, **Vite**, **Google Gemini**, **Firebase (Firestore & Auth)**, and designed with strict **Neo-brutalist aesthetics**.

---

## 🌟 Overview

**ChronOpsAI** is an all-in-one event operations platform built for fast-moving clubs, hackathons, conferences, and live stages. It unifies high-tempo operations into three integrated modes:

1. **Operations Mode**: Turn raw meeting notes or speech audio transcripts into actionable tasks with **Club Intelligence**, monitor real-time event slip risk with the **Event Health Radar**, and draft stage announcements with **Quick AI Tools**.
2. **Event Directory Mode**: Manage multiple event taskboards simultaneously (*HackGenesis 2026*, *AI & Web3 Summit 2026*, *Club Orientation & Showcase*, or custom created events). Open dedicated full-page Kanban boards (`/taskboards/:eventId`) with drag-and-drop, priority filtering, subtasks, and taskboard deletion.
3. **Live Stage Mode**: Full-screen confidence monitor for anchors and MCs featuring live countdown timers, overrun tracking (turns accent red past zero), instant `+5m`/`+10m` schedule reflow, on-demand AI speaker intros, 60-second emergency filler scripts, and phonetic pronunciation guides.

---

## 🎨 Design System: Strict Neo-Brutalism

- **Zero gradients, zero blur, zero gray text**.
- **High-contrast palette**: `#FFFDF5` background, `#000000` text & thick borders (`border-2`, `border-3`, `border-4`).
- **Hard box shadows**: `box-shadow: 4px 4px 0 #000`, `8px 8px 0 #000`.
- **Palette**:
  - Cream Background: `#FFFDF5`
  - Onyx Black: `#000000`
  - Hot Coral (Overdue / Risk / Slip Warning / Overrun): `#FF6B6B`
  - Canary Yellow (In Progress / AI Badges): `#FFD93D`
  - Pastel Lavender (Done / Flexible Badges): `#C4B5FD`
  - Pure Card White: `#FFFFFF`
- Accessible dual-ring keyboard focus states (`:focus-visible`).
- Full support for `prefers-reduced-motion: reduce`.

---

## 🚀 Quick Start (Running Locally)

### 1. Clone & Navigate
```bash
git clone https://github.com/prachi4295/Vertex_PS-3_ClubOpsAI.git
cd Vertex_PS-3_ClubOpsAI/chronops-frontend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```

Open **[http://localhost:5173](http://localhost:5173)** in your browser.

> **Instant Demo Access**: You do not need cloud credentials to explore! Click **"Continue as Demo"** or **"Continue with Google"** on the login screen to explore pre-seeded data in **Offline Demo Mode**.

---

## 🔑 Environment Variables Setup

For connecting your own Firebase backend and Google Gemini API key:

In `chronops-frontend/`, copy `.env.example` to `.env`:

```bash
cd chronops-frontend
cp .env.example .env
```

Your `.env` file structure:

```ini
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Google Gemini Configuration
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_GEMINI_MODEL=gemini-2.5-flash
```

> **Security Note**: `.env` is git-ignored by default to prevent leaking secrets to public repositories.

---

## 🔥 Firebase Setup Guide

### 1. Create a Firebase Project
1. Navigate to the [Firebase Console](https://console.firebase.google.com/) and click **Add Project**.
2. Set your project name (e.g., `chronops-ai`) and create the project.

### 2. Enable Authentication
1. Go to **Build > Authentication** > **Sign-in method**.
2. Enable **Google** sign-in (set support email and save).
3. Enable **Anonymous** sign-in (allows instant demo access without credentials).

### 3. Create Cloud Firestore Database
1. Go to **Build > Firestore Database** and click **Create Database**.
2. Select your nearest region and start in **production mode**.
3. Deploy the security rules from `firestore.rules`:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       function isAuthenticated() {
         return request.auth != null;
       }
       function isEventOwner(eventId) {
         return isAuthenticated() &&
           request.auth.uid == get(/databases/$(database)/documents/events/$(eventId)).data.ownerId;
       }
       match /events/{eventId} {
         allow read: if isAuthenticated();
         allow create: if isAuthenticated() && request.resource.data.ownerId == request.auth.uid;
         allow update, delete: if isAuthenticated() && resource.data.ownerId == request.auth.uid;
       }
       match /tasks/{taskId} {
         allow read: if isAuthenticated();
         allow create: if isAuthenticated() && isEventOwner(request.resource.data.eventId);
         allow update, delete: if isAuthenticated() && isEventOwner(resource.data.eventId);
       }
       match /sessions/{sessionId} {
         allow read: if isAuthenticated();
         allow create: if isAuthenticated() && isEventOwner(request.resource.data.eventId);
         allow update, delete: if isAuthenticated() && isEventOwner(resource.data.eventId);
       }
     }
   }
   ```

### 4. Register Web App & Config
1. In Firebase Project Overview, click **Add App (`</>`)** to create a Web App.
2. Copy the credentials into `chronops-frontend/.env`.

---

## 🤖 Google Gemini API Key Setup

1. Obtain a Gemini API key at [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Add `VITE_GEMINI_API_KEY` to `chronops-frontend/.env`.

### 🛡️ Restricting Your Gemini Key & Client Exposure Note

> **Security & Best Practices**:  
> Because frontend builds bundle `VITE_*` environment variables in client-side code, anyone inspecting browser network calls can view the key if left unrestricted.

#### Tier 1 (Immediate / Hackathon / Dev): Restrict Key by HTTP Referrer
Lock down your API key in Google Cloud Console so it **only** executes requests originating from your authorized domains:
1. Go to the [Google Cloud Console Credentials Page](https://console.cloud.google.com/apis/credentials).
2. Select your project and click your **Gemini API Key**.
3. Under **Application restrictions**, select **Websites (HTTP referrers)**.
4. Add your authorized URLs:
   - `http://localhost:5173/*` (local dev)
   - `https://<your-project-id>.web.app/*` (Firebase hosting)
5. Under **API restrictions**, choose **Restrict key** and check **Generative Language API**.
6. Click **Save**.

#### Tier 2 (Production): Serverless Cloud Function Proxy
Route AI requests through Firebase Cloud Functions (2nd Gen) so the key stays completely server-side.

---

## 🧪 Running Tests

Run the complete Vitest test suite covering the schedule reflow engine, time utilities, event health algorithms, and Gemini service invariants:

```bash
cd chronops-frontend
npm test -- --run
```

All **79 unit and component tests** pass synchronously across 10 test suites.

---

## 🚢 Firebase Hosting Deployment

Both `firebase.json` and `chronops-frontend/firebase.json` are preconfigured with single-page app rewrites.

```bash
cd chronops-frontend

# 1. Build production bundle
npm run build

# 2. Login to Firebase
firebase login

# 3. Deploy
firebase deploy --only hosting,firestore:rules
```

---

## 📋 Features Walkthrough

1. **Operations Mode**:
   - **Club Intelligence & Missing Details Detection**: Paste raw standup notes or record speech transcripts. The AI analyzes the notes, flags any missing operational specifics (such as unassigned team members, missing deadlines, or unspecified destination events), and opens an interactive Neo-brutalist modal allowing organizers to review, fill in missing fields, and select the destination taskboard.
   - **Event Health Radar**: Dynamic completion percentage, volunteer allocation ratio, and slip risk score.
   - **Quick AI Tools**: Instant 1-minute MC filler speech generator, volunteer coordination email drafter, stage transition script generator, and speaker intro generator with fact-compliance checks.

2. **Event Directory Mode**:
   - **Multi-Event Taskboards**: Switch between multiple concurrent events (*HackGenesis 2026*, *AI & Web3 Summit 2026*, *Club Orientation & Showcase*, plus custom boards).
   - **Upload Event Document with AI**: Upload event schedules, brochures, or guidelines (`.txt`, `.md`, `.pdf`, `.json`, `.csv`) or paste raw text. The AI extracts the Event metadata, schedule sessions, and operational tasks automatically, creates the event board, and wires everything in seconds.
   - **Edit Event Board**: Edit Event Name, Date, Location, Category, and Tagline directly from the directory card or from inside the Kanban taskboard.
   - **Dedicated Kanban View**: Navigate to `/taskboards/:eventId` with drag-and-drop status lanes, priority filtering, subtasks, and board deletion.

3. **Live Stage Mode**:
   - **Multi-Event Live Stage**: Select any event board via the top stage monitor event dropdown to view and manage its specific stage run-of-show.
   - **Configure Sessions with AI**: Generate or re-generate logical, time-ordered stage sessions using Gemini AI based on custom agendas or pre-built templates (Hackathon, Technical Conference, Club Orientation).
   - **Real-Time Countdown & Overrun Monitor**: High-contrast countdown timer that turns hot coral (`#FF6B6B`) and counts up overrun once the session runs past scheduled time.
   - **Dynamic Reflow Engine**: `+5m` and `+10m` schedule reflow with intelligent buffer compression, flexible session shifts, and fixed anchor protection.
   - **Stage Anchor Utilities**: AI speaker introductions, transitional bridges, 60s emergency filler scripts, and phonetic pronunciation guides.

