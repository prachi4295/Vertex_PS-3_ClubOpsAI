import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "../services/firebase";
import {
  DEMO_EVENT_ID,
  SEED_SESSIONS,
  LOCAL_SESSIONS_KEY,
} from "../data/seed";
import { AI_SUMMIT_SESSIONS, CLUB_ORIENTATION_SESSIONS } from "../data/multiEvents";

const SessionsContext = createContext(null);

const withTimeout = (promise, ms = 1800) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Firestore session operation timed out")), ms)
    ),
  ]);

function getLocalSessions(eventId) {
  try {
    const raw = localStorage.getItem(`clubops_sessions_${eventId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.map((s) => ({
        ...s,
        actualStart: s.actualStart ? new Date(s.actualStart) : null,
      }));
    }
  } catch (e) {
    console.warn("Failed to load local sessions:", e);
  }

  if (eventId === "ai-summit-2026") {
    return AI_SUMMIT_SESSIONS.map((s) => ({ ...s }));
  }
  if (eventId === "club-orientation-2026") {
    return CLUB_ORIENTATION_SESSIONS.map((s) => ({ ...s }));
  }

  return SEED_SESSIONS.map((s, i) => ({
    ...s,
    id: s.id || `session-${i + 1}`,
    actualStart: s.actualStart ? s.actualStart.toDate() : null,
  }));
}

function saveLocalSessions(eventId, sessions) {
  try {
    const serialized = sessions.map((s) => ({
      ...s,
      actualStart: s.actualStart ? (s.actualStart instanceof Date ? s.actualStart.toISOString() : s.actualStart) : null,
    }));
    localStorage.setItem(`clubops_sessions_${eventId}`, JSON.stringify(serialized));
  } catch (e) {
    console.warn("Failed to save local sessions:", e);
  }
}

/**
 * Hook to manage live sessions for an event via onSnapshot with client-side sorting.
 */
export function useEventSessions(eventId = DEMO_EVENT_ID) {
  const [sessions, setSessions] = useState(() => {
    if (!eventId) return [];
    const localData = getLocalSessions(eventId);
    localData.sort((a, b) => (a.order || 0) - (b.order || 0));
    return localData;
  });
  const [loading, setLoading] = useState(() => {
    if (!eventId) return false;
    const localData = getLocalSessions(eventId);
    return localData.length === 0;
  });
  const [error, setError] = useState(null);

  const reloadFromLocal = useCallback(() => {
    const localData = getLocalSessions(eventId);
    // Client-side sort by order
    localData.sort((a, b) => (a.order || 0) - (b.order || 0));
    setSessions(localData);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    if (!eventId) {
      setSessions([]);
      setLoading(false);
      return;
    }

    if (isFirebaseConfigured && db) {
      // Fallback timer so loading never hangs
      const timer = setTimeout(() => {
        setLoading(false);
      }, 1500);

      // Query by eventId only — client-side sort per ANTIGRAVITY_CONTEXT.md
      const q = query(collection(db, "sessions"), where("eventId", "==", eventId));

      const unsub = onSnapshot(
        q,
        (snap) => {
          clearTimeout(timer);
          const docs = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              ...data,
              actualStart: data.actualStart?.toDate?.() ?? (data.actualStart ? new Date(data.actualStart) : null),
            };
          });

          // Sort client-side by order, falling back to startTime
          docs.sort((a, b) => (a.order || 0) - (b.order || 0) || (a.startTime || "").localeCompare(b.startTime || ""));
          setSessions(docs);
          setLoading(false);
          setError(null);
        },
        (err) => {
          clearTimeout(timer);
          console.warn("Firestore sessions error, falling back to local storage:", err);
          setError(null);
          reloadFromLocal();
        }
      );

      return () => {
        clearTimeout(timer);
        unsub();
      };
    } else {
      reloadFromLocal();

      const handleUpdate = () => {
        reloadFromLocal();
      };
      window.addEventListener("clubops-data-updated", handleUpdate);
      return () => window.removeEventListener("clubops-data-updated", handleUpdate);
    }
  }, [eventId, reloadFromLocal]);

  // ─── Add session ───
  const addSession = useCallback(
    async (sessionData) => {
      const newSession = {
        eventId,
        title: sessionData.title || "Untitled Session",
        speaker: sessionData.speaker || "",
        bio: sessionData.bio || "",
        startTime: sessionData.startTime || "10:00",
        plannedStart: sessionData.plannedStart || sessionData.startTime || "10:00",
        durationMinutes: Number(sessionData.durationMinutes) || 30,
        sessionType: sessionData.sessionType || "flexible",
        status: sessionData.status || "upcoming",
        phoneticGuide: sessionData.phoneticGuide || "",
        order: Number(sessionData.order) || (sessions.length + 1),
        actualStart: null,
        script: sessionData.script || "",
      };

      const localItem = {
        ...newSession,
        id: sessionData.id || `session-${Date.now()}`,
      };

      setSessions((prev) => {
        const updated = [...prev, localItem];
        updated.sort((a, b) => (a.order || 0) - (b.order || 0));
        saveLocalSessions(eventId, updated);
        return updated;
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("clubops-data-updated"));
      }

      if (!isFirebaseConfigured || !db) {
        return localItem;
      }

      try {
        const docRef = await withTimeout(addDoc(collection(db, "sessions"), newSession), 1800);
        return { id: docRef.id, ...newSession };
      } catch (err) {
        console.warn("Firestore addSession sync timed out or failed, kept local:", err);
        return localItem;
      }
    },
    [eventId, sessions.length]
  );

  // ─── Update session ───
  const updateSession = useCallback(
    async (sessionId, updates) => {
      setSessions((prev) => {
        const updated = prev.map((s) =>
          s.id === sessionId ? { ...s, ...updates } : s
        );
        updated.sort((a, b) => (a.order || 0) - (b.order || 0));
        saveLocalSessions(eventId, updated);
        return updated;
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("clubops-data-updated"));
      }

      if (!isFirebaseConfigured || !db) {
        return;
      }

      try {
        await withTimeout(updateDoc(doc(db, "sessions", sessionId), updates), 1800);
      } catch (err) {
        console.warn("Firestore updateSession sync timed out or failed, kept local:", err);
      }
    },
    [eventId]
  );

  // ─── Delete session ───
  const deleteSession = useCallback(
    async (sessionId) => {
      setSessions((prev) => {
        const updated = prev.filter((s) => s.id !== sessionId);
        saveLocalSessions(eventId, updated);
        return updated;
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("clubops-data-updated"));
      }

      if (!isFirebaseConfigured || !db) {
        return;
      }

      try {
        await withTimeout(deleteDoc(doc(db, "sessions", sessionId)), 1800);
      } catch (err) {
        console.warn("Firestore deleteSession sync timed out or failed, kept local:", err);
      }
    },
    [eventId]
  );

  // ─── Update multiple sessions with a single batch write ───
  const updateSessionsBatch = useCallback(
    async (updatedSessionsList) => {
      if (!Array.isArray(updatedSessionsList) || updatedSessionsList.length === 0) return;

      setSessions((prev) => {
        const updateMap = new Map(updatedSessionsList.map((s) => [s.id, s]));
        const updated = prev.map((s) => (updateMap.has(s.id) ? { ...s, ...updateMap.get(s.id) } : s));
        updated.sort((a, b) => (a.order || 0) - (b.order || 0) || (a.startTime || "").localeCompare(b.startTime || ""));
        saveLocalSessions(eventId, updated);
        return updated;
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("clubops-data-updated"));
      }

      if (!isFirebaseConfigured || !db) {
        return;
      }

      try {
        const batch = writeBatch(db);
        updatedSessionsList.forEach((s) => {
          const ref = doc(db, "sessions", s.id);
          const updates = {
            startTime: s.startTime,
            durationMinutes: s.durationMinutes,
          };
          if (s.order !== undefined) updates.order = s.order;
          if (s.status !== undefined) updates.status = s.status;
          if (s.actualStart !== undefined) {
            updates.actualStart =
              s.actualStart instanceof Date
                ? Timestamp.fromDate(s.actualStart)
                : s.actualStart;
          }
          batch.update(ref, updates);
        });
        await withTimeout(batch.commit(), 1800);
      } catch (err) {
        console.warn("Firestore updateSessionsBatch sync timed out or failed, kept local:", err);
      }
    },
    [eventId]
  );

  // ─── Start session (sets status: 'live' and actualStart: Timestamp) ───
  const startSession = useCallback(
    async (sessionId, customStartTime = null) => {
      const now = customStartTime instanceof Date ? customStartTime : new Date();
      const timestampVal = isFirebaseConfigured && db ? Timestamp.fromDate(now) : now;

      const otherLive = sessions.filter((s) => s.status === "live" && s.id !== sessionId);

      setSessions((prev) => {
        const updated = prev.map((s) => {
          if (s.id === sessionId) {
            return { ...s, status: "live", actualStart: now };
          }
          if (s.status === "live") {
            return { ...s, status: "completed" };
          }
          return s;
        });
        saveLocalSessions(eventId, updated);
        return updated;
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("clubops-data-updated"));
      }

      if (!isFirebaseConfigured || !db) {
        return;
      }

      try {
        const batch = writeBatch(db);
        otherLive.forEach((s) => {
          batch.update(doc(db, "sessions", s.id), { status: "completed" });
        });
        batch.update(doc(db, "sessions", sessionId), {
          status: "live",
          actualStart: timestampVal,
        });
        await withTimeout(batch.commit(), 1800);
      } catch (err) {
        console.warn("Firestore startSession sync timed out or failed, kept local:", err);
      }
    },
    [eventId, sessions]
  );

  // ─── Complete session (marks completed and makes next upcoming session live) ───
  const completeSession = useCallback(
    async (sessionId, customStartTime = null) => {
      const now = customStartTime instanceof Date ? customStartTime : new Date();
      const timestampVal = isFirebaseConfigured && db ? Timestamp.fromDate(now) : now;

      const sortedUpcoming = [...sessions]
        .filter((s) => s.status === "upcoming" && s.id !== sessionId)
        .sort((a, b) => (a.order || 0) - (b.order || 0) || (a.startTime || "").localeCompare(b.startTime || ""));

      const nextSession = sortedUpcoming[0] || null;

      setSessions((prev) => {
        const updated = prev.map((s) => {
          if (s.id === sessionId) {
            return { ...s, status: "completed" };
          }
          if (nextSession && s.id === nextSession.id) {
            return { ...s, status: "live", actualStart: now };
          }
          return s;
        });
        saveLocalSessions(eventId, updated);
        return updated;
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("clubops-data-updated"));
      }

      if (!isFirebaseConfigured || !db) {
        return;
      }

      try {
        const batch = writeBatch(db);
        batch.update(doc(db, "sessions", sessionId), { status: "completed" });
        if (nextSession) {
          batch.update(doc(db, "sessions", nextSession.id), {
            status: "live",
            actualStart: timestampVal,
          });
        }
        await withTimeout(batch.commit(), 1800);
      } catch (err) {
        console.warn("Firestore completeSession sync timed out or failed, kept local:", err);
      }
    },
    [eventId, sessions]
  );

  // ─── Reorder sessions (reassigns order 1, 2, 3...) ───
  const reorderSessions = useCallback(
    async (orderedIds) => {
      if (!Array.isArray(orderedIds) || orderedIds.length === 0) return;

      setSessions((prev) => {
        const idOrderMap = new Map(orderedIds.map((id, index) => [id, index + 1]));
        const updated = prev.map((s) =>
          idOrderMap.has(s.id) ? { ...s, order: idOrderMap.get(s.id) } : s
        );
        updated.sort((a, b) => (a.order || 0) - (b.order || 0));
        saveLocalSessions(eventId, updated);
        return updated;
      });
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("clubops-data-updated"));
      }

      if (!isFirebaseConfigured || !db) {
        return;
      }

      try {
        const batch = writeBatch(db);
        orderedIds.forEach((id, index) => {
          batch.update(doc(db, "sessions", id), { order: index + 1 });
        });
        await withTimeout(batch.commit(), 1800);
      } catch (err) {
        console.warn("Firestore reorderSessions sync timed out or failed, kept local:", err);
      }
    },
    [eventId]
  );

  return {
    sessions,
    loading,
    error,
    addSession,
    updateSession,
    deleteSession,
    updateSessionsBatch,
    startSession,
    completeSession,
    reorderSessions,
  };
}

/**
 * Standalone helper to write a batch of sessions directly to any specific eventId.
 */
export async function setSessionsBatchForEvent(eventId, sessionsArray) {
  const prepared = sessionsArray.map((s, idx) => ({
    eventId,
    title: s.title || "Session",
    speaker: s.speaker || "",
    bio: s.bio || "",
    startTime: s.startTime || "10:00",
    plannedStart: s.plannedStart || s.startTime || "10:00",
    durationMinutes: Number(s.durationMinutes) || 30,
    sessionType: s.sessionType === "fixed" ? "fixed" : "flexible",
    status: s.status || "upcoming",
    phoneticGuide: s.phoneticGuide || "",
    order: Number(s.order) || (idx + 1),
    actualStart: null,
    script: s.script || "",
  }));

  const localItems = prepared.map((s, idx) => ({
    ...s,
    id: s.id || `session-${Date.now()}-${idx}`,
  }));

  saveLocalSessions(eventId, localItems);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("clubops-data-updated"));
  }

  if (!isFirebaseConfigured || !db) {
    return localItems;
  }

  try {
    const batch = writeBatch(db);
    prepared.forEach((s) => {
      const ref = doc(collection(db, "sessions"));
      batch.set(ref, s);
    });
    await withTimeout(batch.commit(), 1800);
  } catch (err) {
    console.warn("Firestore setSessionsBatchForEvent timed out or failed, saved locally:", err);
  }

  return localItems;
}

export function SessionsProvider({ children, eventId = DEMO_EVENT_ID }) {
  const sessionState = useEventSessions(eventId);
  return (
    <SessionsContext.Provider value={sessionState}>
      {children}
    </SessionsContext.Provider>
  );
}

export function useSessions(customEventId) {
  const ctx = useContext(SessionsContext);
  const standaloneState = useEventSessions(customEventId);

  if (customEventId) {
    return standaloneState;
  }
  if (ctx) {
    return ctx;
  }
  return standaloneState;
}

