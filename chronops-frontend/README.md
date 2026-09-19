# ClubOps Studio (ChronOps)

> **Unified Event Command Center for Student Clubs & Hackathons**  
> Built with **React + Vite**, **Google Gemini**, **Firebase (Firestore & Auth)**, and styled with **Neo-brutalist aesthetics**.

---

## 🌟 Overview

ClubOps Studio simplifies high-stakes hackathon and club event execution with two distinct operational modes:
1. **Operations Mode**: Turn raw meeting notes or voice transcripts into actionable Kanban tasks with an Event Health Radar gauge.
2. **Live Stage Mode**: Full-screen confidence monitor for anchors and MCs featuring a live countdown, overrun detection past zero, real-time schedule reflow (+5m, +10m), emergency 60s filler scripts, speaker introductions, and phonetic guides.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide React icons, `@dnd-kit`.
- **Styling**: Strictly **Neo-brutalism** (`#FFFDF5` background, `#000000` borders and text, hard 4px/8px/12px shadows with zero blur, no gradients, no gray text, high contrast).
- **Backend & Database**: Firebase modular SDK (Auth with Google & anonymous demo sign-in, Cloud Firestore with `onSnapshot` real-time listeners and atomic batch writes).
- **AI Integration**: Google Gemini (`@google/genai`) for task extraction, filler scripts, speaker intros, transition scripts, volunteer emails, and phonetic respellings. All AI tools feature resilient static template fallbacks so the app operates offline seamlessly.
- **Testing**: Vitest with unit tests for reflow logic, time calculations, health scores, and Gemini service invariants.

---

## 📋 Prerequisites

- **Node.js**: `v18.0.0` or later.
- **npm**: `v9.0.0` or later.
- (Optional) **Firebase CLI**: `npm install -g firebase-tools` for deployment.

---

## 🔑 Environment Variables Setup

Copy the example environment configuration into `.env`:

```bash
cp .env.example .env
```

Your `.env` file should contain:

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

> **Note**: If Firebase credentials or the Gemini key are omitted, ClubOps Studio automatically enters **Local Demo Mode** using `localStorage` and static AI template fallbacks, so you can test the full user flow without cloud setup!

---

## 🔥 Firebase Setup Guide

### 1. Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/) and click **Add Project**.
2. Name your project (e.g., `clubops-studio`) and create it.

### 2. Enable Authentication
1. Navigate to **Build > Authentication** in the sidebar.
2. Under the **Sign-in method** tab:
   - Enable **Google**: select your project support email and save.
   - Enable **Anonymous**: allows guest organizers to test without signing in with a personal account.

### 3. Create Cloud Firestore Database
1. Navigate to **Build > Firestore Database** and click **Create Database**.
2. Select your server region and choose **Start in production mode**.
3. Apply the security rules defined in `firestore.rules`:
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

### 4. Register Web App & Copy Configuration
1. In Project Overview, click the **Web icon (`</>`)** to register an app.
2. Copy the configuration keys into your `.env` file (`VITE_FIREBASE_*`).

---

## 🤖 Google Gemini API Key Setup

1. Obtain a Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Set `VITE_GEMINI_API_KEY` and optionally `VITE_GEMINI_MODEL=gemini-2.0-flash` in your `.env`.

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

## 🚀 Running the App Locally

```bash
# 1. Install dependencies
npm install

# 2. Start Vite development server
npm run dev

# 3. Open browser at http://localhost:5173/
```

---

## 🧪 Running Automated Tests

Run the full Vitest test suite covering schedule reflow logic, time helpers, health calculations, and Gemini service invariants:

```bash
# Run all tests once
npm test -- --run

# Run in watch mode
npm test
```

---

## 🚢 Firebase Hosting Deployment

This repository includes a preconfigured `firebase.json` for single-page application routing.

```bash
# 1. Build the production bundle
npm run build

# 2. Login to Firebase CLI
firebase login

# 3. Deploy hosting & rules
firebase deploy --only hosting,firestore:rules
```

---

## ⚡ Demo & Evaluation Cheatsheet

1. **Seed Demo Data**: Click **"Seed demo data"** in the bottom debug bar or in the Demo Controls drawer. This loads `"HackGenesis 2026"` with 12 tasks and 10 sessions.
2. **AI Task Extraction**: Paste sample meeting notes into the **Intelligence Card** on the left column and click **PROCESS WITH AI**.
3. **Real-Time Schedule Reflow**: In **Live Flow Preview**, click `+10m` on the live session to watch subsequent flexible sessions push back in real time while preserving buffer gaps and fixed sessions.
4. **Slip Protection**: Apply a `+60m` delay to trigger the **Red Accent Warning Banner**, demonstrating fixed session protection with explicit Confirm/Cancel steps.
5. **Live Stage Confidence Monitor**: Click **GO LIVE** in the top bar to open the full-screen view. Tap the speed button (e.g. `30x` or `60x`) to demo a 6-hour hackathon stage schedule in just 2 minutes!
