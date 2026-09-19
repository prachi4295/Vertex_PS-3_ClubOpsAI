# ClubOps Studio: Project Context

## Product
Unified event command center for club events and hackathons. Two modes:
- Operations (pre-event): AI turns meeting notes or voice transcripts into Kanban tasks, with an event health radar.
- Live Stage (during the event): a run-sheet that reflows in real time when a session overruns, plus anchor tools (phonetic guides, filler scripts).
Sample event: "HackGenesis 2026".

## Stack
React + Vite (JavaScript/JSX), Tailwind CSS, lucide-react, @dnd-kit, Vitest. Firebase modular SDK only (firebase/app, firebase/firestore, firebase/auth) with onSnapshot for real-time data. Google Gemini via the official JS SDK, wrapped in src/services/gemini.js. Model name from env VITE_GEMINI_MODEL (default to a current Gemini Flash model). Secrets only in .env (VITE_ prefix); keep .env.example committed.
Folders: src/components (Header, IntelligenceCard, HealthRadar, KanbanBoard, LiveFlowPreview, QuickAITools, LiveStageView, ui/), src/services (firebase.js, gemini.js), src/lib (reflow.js, health.js, time.js), src/hooks, src/data/seed.js.

## Design system: Neo-brutalism (authoritative)
- Tokens: neo-bg #FFFDF5, neo-ink #000000, neo-accent #FF6B6B, neo-secondary #FFD93D, neo-muted #C4B5FD, white #FFFFFF. No grays or other colors.
- Font: Space Grotesk (Google Fonts, 400/500/700/900). Headings 900, body/labels/buttons 700. Uppercase and wide tracking for labels and buttons; tight tracking for headlines.
- Every visual element has border-4 border-black. Radius 0, except rounded-full for pills and circles.
- Hard shadows only, zero blur: 4px 4px 0 #000 (small), 8px 8px 0 #000 (medium), 12px 12px 0 #000 (large), defined as Tailwind boxShadow tokens.
- Buttons: sharp, h-12 or taller, uppercase bold; active state translates 2px x/y and removes the shadow, 100ms, ease-linear. Cards lift on hover (-translate-y-1, bigger shadow), 200ms.
- Inputs: border-4, bg-white, bold text; focus turns the background yellow and adds a hard shadow (no glow ring).
- Never use blur, backdrop-blur, soft shadows, smooth gradients, gray text, or ease-in-out.
- Textures: halftone dots, grid pattern, and subtle noise on page background and section headers. No large flat areas.
- Sticker energy: slight rotation on badges, section titles, and decorative shapes, plus a slow-spinning star. Keep data-dense areas (Kanban cards, run-sheet rows, gauges) unrotated so they stay readable.
- Kanban headers: Backlog = neo-muted, To Do = white, In Progress = neo-secondary, Done = black header with white text and a check icon. Use neo-accent only for warnings, risk, and primary actions.
- Icons: lucide-react, stroke-[3px], inside bordered boxes.
- Accessibility: WCAG AA contrast, visible focus (ring-2 ring-black ring-offset-2), aria-labels on icon buttons, semantic HTML, keyboard-operable drag-and-drop with button fallbacks, prefers-reduced-motion disables looping animations.
- Responsive, mobile first: three columns on lg, stacked with a tab switcher on mobile; touch targets at least 44px.

## Firestore model
Top-level collections; each doc carries eventId. Additive fields are allowed.
- events: id, name, date (Timestamp), status (active|upcoming|completed), ownerId.
- tasks: id, eventId, title, status (backlog|todo|in_progress|done), assignee, priority (low|medium|high), dueDate (Timestamp, optional), source (manual|ai), createdAt, updatedAt.
- sessions: id, eventId, title, speaker, bio, startTime ("HH:mm", event-local IST), plannedStart ("HH:mm", never changed by reflow), durationMinutes, sessionType (fixed|flexible), status (completed|live|upcoming), phoneticGuide, order (Number), actualStart (Timestamp, set when it goes live), script (cached AI script).
Do not combine where() with orderBy() (needs composite indexes). Query by eventId and sort client-side.

## Conventions
No hardcoded keys. Small modular components. Pure logic lives in src/lib with unit tests. Every async action has loading, error, and empty states. Every task ends with a browser check.
