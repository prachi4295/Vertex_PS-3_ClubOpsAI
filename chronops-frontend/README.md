# ⚡ ChronOpsAI Frontend

> **Unified Event Command Center for Student Clubs & Hackathons**  
> Built with **React 19**, **Vite**, **Google Gemini**, **Firebase (Firestore & Auth)**, and styled with strict **Neo-brutalist aesthetics**.

---

## 🌟 Overview

**ChronOpsAI** simplifies high-stakes hackathon and club event execution with three integrated operational modes:

1. **Operations Mode**: Turn raw meeting notes or voice transcripts into actionable Kanban tasks with **Club Intelligence**, track live event risk on the **Event Health Radar**, and draft stage scripts with **Quick AI Tools**.
2. **Event Directory Mode**: Directory of multiple event taskboards with dedicated full-page Kanban boards (`/taskboards/:eventId`), task filtering, drag-and-drop, and board deletion.
3. **Live Stage Mode**: Full-screen confidence monitor for anchors and MCs featuring a live countdown, overrun detection past zero, real-time schedule reflow (`+5m`, `+10m`), emergency 60s filler scripts, speaker introductions, and phonetic pronunciation guides.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide React icons, `@dnd-kit`.
- **Styling**: Strictly **Neo-brutalism** (`#FFFDF5` background, `#000000` borders and text, hard 4px/8px/12px shadows with zero blur, no gradients, no gray text, high contrast).
- **Backend & Database**: Firebase modular SDK (Auth with Google & anonymous demo sign-in, Cloud Firestore with `onSnapshot` real-time listeners and atomic batch writes).
- **AI Integration**: Google Gemini (`@google/genai`) for task extraction, filler scripts, speaker intros, transition scripts, volunteer emails, and phonetic respellings. All AI tools feature resilient static template fallbacks so the app operates offline seamlessly.
- **Testing**: Vitest with unit tests for reflow logic, time calculations, health scores, and Gemini service invariants.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Development Server
```bash
npm run dev
```

Open **[http://localhost:5173](http://localhost:5173)** in your browser.

> **Offline Demo Mode**: ChronOpsAI works right out of the box with zero cloud setup! Both "Continue as Demo" and "Continue with Google" will automatically launch a persistent local session with pre-seeded data.

### 3. Run Automated Tests
```bash
npm test -- --run
```

All **79 automated unit and component tests** across 10 test suites pass cleanly.

### 4. Build for Production
```bash
npm run build
```

---

## 🔑 Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

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

---

## 🚢 Firebase Hosting Deployment

```bash
npm run build
firebase login
firebase deploy --only hosting,firestore:rules
```
