# ⚡ ClubOps Studio (ChronOps)
> **Unified Event Command Center for Student Clubs & Hackathons**  
> AI-powered task management + real-time schedule reflow for seamless event execution.  
> Built with **React 19**, **Vite**, **Google Gemini**, **Firebase (Firestore & Auth)**, and designed with **Neo-brutalist aesthetics**.

---

## 🌟 Overview

ChronOps is an all-in-one event operations platform built for fast-moving clubs, hackathons, conferences, and live events.
It features two core operating modes:
1. **Operations Mode**: Turn raw meeting notes or voice transcripts into actionable Kanban tasks, monitor real-time event risk with the **Event Health Radar**, and organize tasks across Backlog, To Do, In Progress, and Done.
2. **Live Stage Mode**: Full-screen confidence anchor view for MCs featuring live countdown timers, overrun tracking (turns accent red past zero), instant `+5m`/`+10m` schedule reflow, on-demand AI speaker intros, 60-second emergency filler scripts, and phonetic pronunciation guides.

---

## 🎨 Design System: Strict Neo-Brutalism

- **Zero gradients, zero blur, zero gray text**.
- Hard contrast: `#FFFDF5` background, `#000000` text & thick borders (`border-2`, `border-3`, `border-4`).
- Hard box shadows: `box-shadow: 4px 4px 0 #000`, `8px 8px 0 #000`.
- Neo-brutalist palette:
  - Cream: `#FFFDF5`
  - Onyx Black: `#000000`
  - Hot Coral (Overdue / Risk / Slip Warning / Overrun): `#FF6B6B`
  - Canary Yellow (In Progress / AI Badges): `#FFD93D`
  - Pastel Lavender (Done / Flexible Badges): `#C4B5FD`
  - Pure Card White: `#FFFFFF`
- Accessible dual-ring keyboard focus states (`:focus-visible`).
- Full support for `prefers-reduced-motion: reduce`.

---

## 🔑 Environment Variables Setup

In `chronops-frontend/`, copy `.env.example` to `.env`:

```bash
cd chronops-frontend
cp .env.example .env
```

Your `.env` file requires:

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
VITE_GEMINI_MODEL=gemini-2.0-flash
```

> **Local Demo Fallback**: If Firebase or Gemini credentials are not supplied, ChronOps automatically operates in **Local Demo Mode** using in-memory / `localStorage` stores and built-in static template fallbacks, allowing full offline testing!

---

## 🔥 Firebase Setup Guide

### 1. Create a Firebase Project
1. Navigate to the [Firebase Console](https://console.firebase.google.com/) and click **Add Project**.
2. Set your project name (e.g., `clubops-studio`) and create the project.

### 2. Enable Authentication
1. Go to **Build > Authentication** > **Sign-in method**.
2. Enable **Google** sign-in (set support email and save).
3. Enable **Anonymous** sign-in (enables "Continue as demo" mode without logging into personal accounts).

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
>
> Follow these two recommended tiers:

#### Tier 1 (Immediate / Hackathon / Dev): Restrict Key by HTTP Referrer
Lock down your API key in Google Cloud Console so it **only** executes requests originating from your authorized domains:
1. Go to the [Google Cloud Console Credentials Page](https://console.cloud.google.com/apis/credentials).
2. Select your Google Cloud / Firebase project.
3. Click your **Gemini API Key** to open its settings.
4. Under **Application restrictions**, select **Websites (HTTP referrers)**.
5. Click **Add an Item** and enter your authorized URLs:
   - `http://localhost:5173/*` (local development)
   - `http://127.0.0.1:5173/*`
   - `https://<your-project-id>.web.app/*` (your production Firebase domain)
   - `https://<your-project-id>.firebaseapp.com/*`
6. Under **API restrictions**, choose **Restrict key** and check **Generative Language API** (or Vertex AI API).
7. Click **Save**. Any request originating from other websites or third-party tools will be rejected with `403 Forbidden`.

#### Tier 2 (Production / Enterprise): Serverless Cloud Function Proxy
For production deployments where you want zero API key exposure to the browser, route AI requests through Firebase Cloud Functions (2nd Gen):

```
┌─────────────────┐       Firebase Auth Token        ┌─────────────────────────┐       GEMINI_API_KEY        ┌──────────────┐
│  React Frontend │ ───────────────────────────────> │  Firebase Cloud Function│ ──────────────────────────> │ Google Gemini│
│ (ChronOps App)  │ <─────────────────────────────── │  (Node.js / onCall)     │ <────────────────────────── │   API / SDK  │
└─────────────────┘        Structured JSON           └─────────────────────────┘      Generative Output      └──────────────┘
```

**Implementation Pattern**:
1. Store the API key in Firebase Secret Manager:
   ```bash
   firebase functions:secrets:set GEMINI_API_KEY
   ```
2. Create an `onCall` function in `functions/index.js`:
   ```javascript
   const { onCall, HttpsError } = require("firebase-functions/v2/https");
   const { defineSecret } = require("firebase-functions/params");
   const { GoogleGenAI } = require("@google/genai");

   const geminiSecret = defineSecret("GEMINI_API_KEY");

   exports.extractTasks = onCall({ secrets: [geminiSecret] }, async (request) => {
     // Verify user is authenticated
     if (!request.auth) {
       throw new HttpsError("unauthenticated", "Authentication required.");
     }
     const ai = new GoogleGenAI({ apiKey: geminiSecret.value() });
     const response = await ai.models.generateContent({
       model: "gemini-2.0-flash",
       contents: request.data.notes,
     });
     return JSON.parse(response.text);
   });
   ```
3. Call it securely from the frontend without any client-side API key:
   ```javascript
   import { getFunctions, httpsCallable } from "firebase/functions";
   const functions = getFunctions();
   const extractTasks = httpsCallable(functions, "extractTasks");
   const result = await extractTasks({ notes: userNotes });
   ```

---

## 🚀 Running Locally

```bash
# Navigate to frontend directory
cd chronops-frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🧪 Running Tests

Run the complete Vitest test suite covering the schedule reflow engine, time utilities, event health algorithms, and Gemini service invariants:

```bash
cd chronops-frontend
npm test -- --run
```

All 79 unit and component tests will run and pass synchronously.

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

## 📋 Evaluation Checklist & Demo Flows

1. **Seed Demo Data**: Click **"Seed demo data"** in the bottom debug bar to populate "HackGenesis 2026" with 12 tasks across all 4 statuses and 10 sessions with realistic buffers.
2. **AI Transcript Task Extraction**: In the **Club Intelligence** panel, paste meeting notes or click "Try sample transcript", then click **PROCESS WITH AI**. Tasks are parsed into JSON and batch-written into the Kanban Backlog with an Undo toast.
3. **Interactive Kanban & Health Radar**: Drag cards between columns (or use card arrow buttons for keyboard/touch navigation). Notice the **Event Health Radar** (Task Completion %, Volunteer Allocation %, Risk Score) update dynamically in real time.
4. **Schedule Reflow Engine**:
   - In **Live Flow Preview**, click `+10m` on the live session.
   - Subsequent flexible sessions shift back while buffer gaps absorb delay first.
   - Fixed sessions (e.g., Inauguration, Lunch, Closing) remain anchored.
   - Over-delaying triggers a high-visibility **Red Accent Slip Warning Banner** with explicit Confirm/Cancel protection.
5. **Live Stage Confidence Monitor**:
   - Tap **GO LIVE** in the header.
   - Experience high-contrast typography, live countdown/overrun timer (counts up in red past zero), speaker bio, phonetic guides, and 1-click `+5m`/`+10m` delay adjustments.
   - Use the hidden **Demo Controls** drawer to run the clock at `30x` or `60x` speed to simulate real-time stage progression.
