import {
  doc,
  collection,
  setDoc,
  getDocs,
  writeBatch,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "../services/firebase";

export const DEMO_EVENT_ID = "chronops-summit-2026";

/**
 * Demo event object
 */
export const SEED_EVENT = {
  id: DEMO_EVENT_ID,
  name: "ChronOps Tech Summit 2026",
  date: Timestamp.fromDate(new Date("2026-09-19T09:00:00")),
  status: "active",
  ownerId: "demo-lead-uid",
  location: "Main Auditorium & Innovation Labs",
  description: "Flagship 36-hour national tech summit & AI builders stage.",
};

/**
 * 12 Tasks across all four statuses (backlog, todo, in_progress, done),
 * including some overdue tasks and some unassigned tasks.
 */
export const SEED_TASKS = [
  // ─── Backlog (3 tasks) ───
  {
    id: "task-1",
    eventId: DEMO_EVENT_ID,
    title: "Set up Discord community server & bot verification",
    status: "backlog",
    assignee: "",
    priority: "medium",
    dueDate: null,
    source: "manual",
    createdAt: Timestamp.fromDate(new Date("2026-09-12T10:00:00")),
    updatedAt: Timestamp.fromDate(new Date("2026-09-12T10:00:00")),
  },
  {
    id: "task-2",
    eventId: DEMO_EVENT_ID,
    title: "Draft sponsor prospectus & outreach emails",
    status: "backlog",
    assignee: "",
    priority: "high",
    dueDate: Timestamp.fromDate(new Date("2026-09-28T23:59:59")),
    source: "ai",
    createdAt: Timestamp.fromDate(new Date("2026-09-13T11:00:00")),
    updatedAt: Timestamp.fromDate(new Date("2026-09-13T11:00:00")),
  },
  {
    id: "task-3",
    eventId: DEMO_EVENT_ID,
    title: "Procure IoT hardware kits & sensor modules",
    status: "backlog",
    assignee: "Priya",
    priority: "low",
    dueDate: null,
    source: "manual",
    createdAt: Timestamp.fromDate(new Date("2026-09-14T09:30:00")),
    updatedAt: Timestamp.fromDate(new Date("2026-09-14T09:30:00")),
  },

  // ─── To Do (3 tasks, including overdue and unassigned) ───
  {
    id: "task-4",
    eventId: DEMO_EVENT_ID,
    title: "Finalize judging rubric with lead mentors",
    status: "todo",
    assignee: "Arjun",
    priority: "high",
    // OVERDUE (due Sep 15, mock time Sep 19)
    dueDate: Timestamp.fromDate(new Date("2026-09-15T18:00:00")),
    source: "manual",
    createdAt: Timestamp.fromDate(new Date("2026-09-10T14:00:00")),
    updatedAt: Timestamp.fromDate(new Date("2026-09-10T14:00:00")),
  },
  {
    id: "task-5",
    eventId: DEMO_EVENT_ID,
    title: "Send speaker confirmation briefs & dietary forms",
    status: "todo",
    assignee: "Meera",
    priority: "medium",
    dueDate: Timestamp.fromDate(new Date("2026-09-20T17:00:00")),
    source: "ai",
    createdAt: Timestamp.fromDate(new Date("2026-09-15T16:00:00")),
    updatedAt: Timestamp.fromDate(new Date("2026-09-15T16:00:00")),
  },
  {
    id: "task-6",
    eventId: DEMO_EVENT_ID,
    title: "Order branded volunteer lanyards & badges",
    status: "todo",
    assignee: "",
    priority: "medium",
    // OVERDUE & UNASSIGNED (due Sep 17)
    dueDate: Timestamp.fromDate(new Date("2026-09-17T12:00:00")),
    source: "manual",
    createdAt: Timestamp.fromDate(new Date("2026-09-11T12:00:00")),
    updatedAt: Timestamp.fromDate(new Date("2026-09-11T12:00:00")),
  },

  // ─── In Progress (3 tasks) ───
  {
    id: "task-7",
    eventId: DEMO_EVENT_ID,
    title: "Design main stage banner & photo backdrop",
    status: "in_progress",
    assignee: "Raj",
    priority: "medium",
    dueDate: Timestamp.fromDate(new Date("2026-09-25T18:00:00")),
    source: "manual",
    createdAt: Timestamp.fromDate(new Date("2026-09-16T10:00:00")),
    updatedAt: Timestamp.fromDate(new Date("2026-09-18T11:00:00")),
  },
  {
    id: "task-8",
    eventId: DEMO_EVENT_ID,
    title: "Deploy participant check-in QR scanner app",
    status: "in_progress",
    assignee: "Priya",
    priority: "high",
    dueDate: Timestamp.fromDate(new Date("2026-09-22T20:00:00")),
    source: "ai",
    createdAt: Timestamp.fromDate(new Date("2026-09-17T09:00:00")),
    updatedAt: Timestamp.fromDate(new Date("2026-09-18T15:30:00")),
  },
  {
    id: "task-9",
    eventId: DEMO_EVENT_ID,
    title: "Arrange high-speed backup Wi-Fi router in auditorium",
    status: "in_progress",
    assignee: "Kavya",
    priority: "high",
    dueDate: Timestamp.fromDate(new Date("2026-09-21T15:00:00")),
    source: "manual",
    createdAt: Timestamp.fromDate(new Date("2026-09-17T14:00:00")),
    updatedAt: Timestamp.fromDate(new Date("2026-09-19T08:00:00")),
  },

  // ─── Done (3 tasks) ───
  {
    id: "task-10",
    eventId: DEMO_EVENT_ID,
    title: "Publish official problem statements on website",
    status: "done",
    assignee: "Arjun",
    priority: "high",
    dueDate: Timestamp.fromDate(new Date("2026-09-14T23:59:59")),
    source: "manual",
    createdAt: Timestamp.fromDate(new Date("2026-09-08T09:00:00")),
    updatedAt: Timestamp.fromDate(new Date("2026-09-14T22:00:00")),
  },
  {
    id: "task-11",
    eventId: DEMO_EVENT_ID,
    title: "Confirm keynote speaker hotel & airport transport",
    status: "done",
    assignee: "Meera",
    priority: "medium",
    dueDate: Timestamp.fromDate(new Date("2026-09-16T19:00:00")),
    source: "manual",
    createdAt: Timestamp.fromDate(new Date("2026-09-09T15:00:00")),
    updatedAt: Timestamp.fromDate(new Date("2026-09-16T18:30:00")),
  },
  {
    id: "task-12",
    eventId: DEMO_EVENT_ID,
    title: "Setup emergency medical first-aid desk",
    status: "done",
    assignee: "Raj",
    priority: "low",
    dueDate: Timestamp.fromDate(new Date("2026-09-18T17:00:00")),
    source: "ai",
    createdAt: Timestamp.fromDate(new Date("2026-09-12T11:00:00")),
    updatedAt: Timestamp.fromDate(new Date("2026-09-18T16:45:00")),
  },
];

/**
 * 10 Sessions including 3 fixed sessions (inauguration, lunch, closing),
 * realistic gaps, and phoneticGuides like "Dr. GOOP-ta".
 */
export const SEED_SESSIONS = [
  // 1. FIXED: Inauguration
  {
    id: "session-1",
    eventId: DEMO_EVENT_ID,
    title: "Inauguration & Lighting of the Lamp",
    speaker: "Prof. S. R. Rao",
    bio: "Dean of Academic Affairs & Patron",
    startTime: "09:00",
    plannedStart: "09:00",
    durationMinutes: 30,
    sessionType: "fixed",
    status: "completed",
    phoneticGuide: "Prof. S. R. RAH-oh",
    order: 1,
    actualStart: Timestamp.fromDate(new Date("2026-09-19T09:02:00")),
    script: "Honored guests, esteemed faculty, and vibrant builders of ChronOps Summit...",
  },
  // 2. Flexible Keynote
  {
    id: "session-2",
    eventId: DEMO_EVENT_ID,
    title: "Keynote: Next-Gen Autonomous AI Agents",
    speaker: "Dr. Ananya Mukherjee",
    bio: "Principal Research Scientist at DeepMind",
    startTime: "09:30",
    plannedStart: "09:30",
    durationMinutes: 45,
    sessionType: "flexible",
    status: "live",
    phoneticGuide: "ah-NAN-yah MOO-kher-jee",
    order: 2,
    actualStart: Timestamp.fromDate(new Date("2026-09-19T09:35:00")),
    script: "Please welcome Dr. Ananya Mukherjee to unveil the frontier of agentic architectures.",
  },
  // 3. Flexible Sponsor Talk (5 min buffer after 10:15)
  {
    id: "session-3",
    eventId: DEMO_EVENT_ID,
    title: "Sponsor Tech Talk: Scalable Cloud Pipelines",
    speaker: "Vikram Malhotra",
    bio: "Head of Developer Ecosystem, CloudTech",
    startTime: "10:20",
    plannedStart: "10:20",
    durationMinutes: 40,
    sessionType: "flexible",
    status: "upcoming",
    phoneticGuide: "vik-RUM mal-HOH-trah",
    order: 3,
    actualStart: null,
    script: "",
  },
  // 4. Flexible Coffee & Matchmaking (5 min buffer after 11:00)
  {
    id: "session-4",
    eventId: DEMO_EVENT_ID,
    title: "Coffee Break & Team Mentor Matchmaking",
    speaker: "Organizing Committee",
    bio: "Innovation Atrium Open Space",
    startTime: "11:05",
    plannedStart: "11:05",
    durationMinutes: 25,
    sessionType: "flexible",
    status: "upcoming",
    phoneticGuide: "",
    order: 4,
    actualStart: null,
    script: "",
  },
  // 5. Flexible Fireside Chat (5 min buffer after 11:30)
  {
    id: "session-5",
    eventId: DEMO_EVENT_ID,
    title: "Fireside Chat: From Hackathon to YC Series A",
    speaker: "Rohan Deshmukh & Tanvi Sen",
    bio: "Co-founders of NexaFlow AI",
    startTime: "11:35",
    plannedStart: "11:35",
    durationMinutes: 55,
    sessionType: "flexible",
    status: "upcoming",
    phoneticGuide: "ROH-hun DESH-mookh & TAN-vee SEN",
    order: 5,
    actualStart: null,
    script: "",
  },
  // 6. FIXED: Lunch (ends at 12:30, 30 min buffer before 13:00 lunch)
  {
    id: "session-6",
    eventId: DEMO_EVENT_ID,
    title: "Networking Lunch & Hackathon Fuel",
    speaker: "Catering Team",
    bio: "North Lawn Dining Marquee",
    startTime: "13:00",
    plannedStart: "13:00",
    durationMinutes: 60,
    sessionType: "fixed",
    status: "upcoming",
    phoneticGuide: "",
    order: 6,
    actualStart: null,
    script: "Lunch is served! Refuel, connect with mentors, and keep hacking.",
  },
  // 7. Flexible Afternoon Hacking (starts right after lunch at 14:00)
  {
    id: "session-7",
    eventId: DEMO_EVENT_ID,
    title: "Deep Hacking Sprint & Technical Checkpoints",
    speaker: "Mentor Cohort",
    bio: "20+ industry engineering leads",
    startTime: "14:00",
    plannedStart: "14:00",
    durationMinutes: 90,
    sessionType: "flexible",
    status: "upcoming",
    phoneticGuide: "",
    order: 7,
    actualStart: null,
    script: "",
  },
  // 8. Flexible Pitch Coaching (15 min buffer after 15:30)
  {
    id: "session-8",
    eventId: DEMO_EVENT_ID,
    title: "Pitch Coaching: Nailing the 3-Minute Stage Hook",
    speaker: "Aishwarya Chawla",
    bio: "Angel Investor & Presentation Coach",
    startTime: "15:45",
    plannedStart: "15:45",
    durationMinutes: 45,
    sessionType: "flexible",
    status: "upcoming",
    phoneticGuide: "ash-WAHR-yah CHOW-lah",
    order: 8,
    actualStart: null,
    script: "",
  },
  // 9. Flexible Finalist Demos (10 min buffer after 16:30)
  {
    id: "session-9",
    eventId: DEMO_EVENT_ID,
    title: "Top 10 Finalist Stage Demos",
    speaker: "Selected Finalist Teams",
    bio: "Live jury panel & audience voting",
    startTime: "16:40",
    plannedStart: "16:40",
    durationMinutes: 75,
    sessionType: "flexible",
    status: "upcoming",
    phoneticGuide: "",
    order: 9,
    actualStart: null,
    script: "",
  },
  // 10. FIXED: Grand Finale & Closing (5 min buffer after 17:55)
  {
    id: "session-10",
    eventId: DEMO_EVENT_ID,
    title: "Grand Finale, Awards & Closing Ceremony",
    speaker: "Dr. Ramesh Gupta",
    bio: "Chief Patron & AI Research Chair",
    startTime: "18:00",
    plannedStart: "18:00",
    durationMinutes: 45,
    sessionType: "fixed",
    status: "upcoming",
    // Explicitly contains phonetic guide requested in prompt!
    phoneticGuide: "Dr. GOOP-ta",
    order: 10,
    actualStart: null,
    script: "And now, to announce the Grand Prize Champion, please welcome Dr. Ramesh Gupta!",
  },
];

// LocalStorage Keys for offline/fallback persistence
export const LOCAL_EVENT_KEY = `clubops_event_${DEMO_EVENT_ID}`;
export const LOCAL_TASKS_KEY = `clubops_tasks_${DEMO_EVENT_ID}`;
export const LOCAL_SESSIONS_KEY = `clubops_sessions_${DEMO_EVENT_ID}`;

/**
 * Creates "ChronOps Tech Summit 2026" with 12 tasks and 10 sessions.
 * Writes to Firestore if configured, or localStorage if offline/demo.
 *
 * @param {string} ownerId - Current authenticated user ID
 * @returns {Promise<{ event: object, tasks: Array, sessions: Array }>}
 */
export async function seedDemoData(ownerId = "demo-lead-uid") {
  const effectiveOwner = ownerId || "demo-lead-uid";
  const eventData = {
    ...SEED_EVENT,
    ownerId: effectiveOwner,
    updatedAt: Timestamp.now(),
  };

  if (isFirebaseConfigured && db) {
    try {
      console.info("Seeding demo data into Firestore for event:", DEMO_EVENT_ID);

      const withTimeout = (promise, ms = 800) =>
        Promise.race([
          promise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Firestore operation timed out")), ms)
          ),
        ]);

      await withTimeout(
        (async () => {
          // 1. Set event doc
          await setDoc(doc(db, "events", DEMO_EVENT_ID), eventData);

          // 2. Delete existing tasks for this event
          const taskSnap = await getDocs(
            query(collection(db, "tasks"), where("eventId", "==", DEMO_EVENT_ID))
          );
          const batch1 = writeBatch(db);
          taskSnap.docs.forEach((d) => batch1.delete(d.ref));
          await batch1.commit();

          // 3. Batch write 12 tasks
          const batch2 = writeBatch(db);
          SEED_TASKS.forEach((task) => {
            const taskRef = doc(collection(db, "tasks"));
            batch2.set(taskRef, {
              ...task,
              id: taskRef.id,
              eventId: DEMO_EVENT_ID,
            });
          });
          await batch2.commit();

          // 4. Delete existing sessions for this event
          const sessionSnap = await getDocs(
            query(collection(db, "sessions"), where("eventId", "==", DEMO_EVENT_ID))
          );
          const batch3 = writeBatch(db);
          sessionSnap.docs.forEach((d) => batch3.delete(d.ref));
          await batch3.commit();

          // 5. Batch write 10 sessions
          const batch4 = writeBatch(db);
          SEED_SESSIONS.forEach((session) => {
            const sessionRef = doc(collection(db, "sessions"));
            batch4.set(sessionRef, {
              ...session,
              id: sessionRef.id,
              eventId: DEMO_EVENT_ID,
            });
          });
          await batch4.commit();
        })()
      );

      console.info("Firestore seed complete.");
    } catch (err) {
      console.warn("Firestore seed unavailable or failed, falling back to local storage:", err);
      seedToLocalStorage(effectiveOwner);
    }
  } else {
    // Local / Offline fallback
    seedToLocalStorage(effectiveOwner);
  }

  // Trigger cross-component reactive update event
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("clubops-data-updated"));
  }

  return {
    event: eventData,
    tasks: SEED_TASKS,
    sessions: SEED_SESSIONS,
  };
}

/**
 * Resets and cleanly re-seeds the demo data.
 */
export async function resetDemoData(ownerId = "demo-lead-uid") {
  return seedDemoData(ownerId);
}

/**
 * Helper to write seed data directly to localStorage for persistent local demo mode.
 */
function seedToLocalStorage(ownerId) {
  const event = {
    ...SEED_EVENT,
    ownerId,
    date: new Date("2026-09-19T09:00:00").toISOString(),
  };

  const tasks = SEED_TASKS.map((t) => ({
    ...t,
    dueDate: t.dueDate ? t.dueDate.toDate().toISOString() : null,
    createdAt: t.createdAt.toDate().toISOString(),
    updatedAt: t.updatedAt.toDate().toISOString(),
  }));

  const sessions = SEED_SESSIONS.map((s) => ({
    ...s,
    actualStart: s.actualStart ? s.actualStart.toDate().toISOString() : null,
  }));

  if (typeof localStorage !== "undefined") {
    localStorage.setItem(LOCAL_EVENT_KEY, JSON.stringify(event));
    localStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(tasks));
    localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(sessions));
    console.info("Local storage seeded cleanly for ChronOps Tech Summit 2026.");
  }
}
