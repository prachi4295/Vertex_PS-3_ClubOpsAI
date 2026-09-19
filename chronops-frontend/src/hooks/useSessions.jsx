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
  Timestamp,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "../services/firebase";
import {
  DEMO_EVENT_ID,
  SEED_SESSIONS,
  LOCAL_SESSIONS_KEY,
} from "../data/seed";

const SessionsContext = createContext(null);

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
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
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
      setLoading(true);
      // Query by eventId only — client-side sort per ANTIGRAVITY_CONTEXT.md
      const q = query(collection(db, "sessions"), where("eventId", "==", eventId));

      const unsub = onSnapshot(
        q,
        (snap) => {
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
          console.error("Firestore sessions error:", err);
          setError(err.message);
          reloadFromLocal();
        }
      );

      return () => unsub();
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

      if (!isFirebaseConfigured || !db) {
        const localItem = {
          ...newSession,
          id: `session-${Date.now()}`,
        };
        setSessions((prev) => {
          const updated = [...prev, localItem];
          updated.sort((a, b) => (a.order || 0) - (b.order || 0));
          saveLocalSessions(eventId, updated);
          return updated;
        });
        window.dispatchEvent(new CustomEvent("clubops-data-updated"));
        return localItem;
      }

      const docRef = await addDoc(collection(db, "sessions"), newSession);
      return { id: docRef.id, ...newSession };
    },
    [eventId, sessions.length]
  );

  // ─── Update session ───
  const updateSession = useCallback(
    async (sessionId, updates) => {
      if (!isFirebaseConfigured || !db) {
        setSessions((prev) => {
          const updated = prev.map((s) =>
            s.id === sessionId ? { ...s, ...updates } : s
          );
          updated.sort((a, b) => (a.order || 0) - (b.order || 0));
          saveLocalSessions(eventId, updated);
          return updated;
        });
        window.dispatchEvent(new CustomEvent("clubops-data-updated"));
        return;
      }

      await updateDoc(doc(db, "sessions", sessionId), updates);
    },
    [eventId]
  );

  // ─── Delete session ───
  const deleteSession = useCallback(
    async (sessionId) => {
      if (!isFirebaseConfigured || !db) {
        setSessions((prev) => {
          const updated = prev.filter((s) => s.id !== sessionId);
          saveLocalSessions(eventId, updated);
          return updated;
        });
        window.dispatchEvent(new CustomEvent("clubops-data-updated"));
        return;
      }

      await deleteDoc(doc(db, "sessions", sessionId));
    },
    [eventId]
  );

  return { sessions, loading, error, addSession, updateSession, deleteSession };
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
