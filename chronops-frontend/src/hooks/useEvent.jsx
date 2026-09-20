import { useState, useEffect, useCallback } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../services/firebase";
import {
  DEMO_EVENT_ID,
  SEED_EVENT,
  LOCAL_EVENT_KEY,
} from "../data/seed";
import { getStoredEvent, saveStoredEvent } from "../lib/storage";

/**
 * Hook to listen to an event document in real time via onSnapshot.
 * Falls back to localStorage and local seed data when Firebase is not active.
 */
export function useEvent(eventId = DEMO_EVENT_ID) {
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadLocalEvent = useCallback(() => {
    try {
      const stored = getStoredEvent(eventId);
      if (stored) {
        setEvent(stored);
      } else {
        setEvent({
          ...SEED_EVENT,
          date: SEED_EVENT.date.toDate().toISOString(),
        });
      }
    } catch (e) {
      console.warn("Error loading local event:", e);
      setEvent(SEED_EVENT);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    if (isFirebaseConfigured && db) {
      setLoading(true);
      const docRef = doc(db, "events", eventId);

      const unsubscribe = onSnapshot(
        docRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setEvent({
              id: docSnap.id,
              ...data,
              date: data.date?.toDate?.() ?? data.date ?? null,
            });
            setError(null);
          } else {
            // Document doesn't exist yet, fall back to seed representation
            setEvent({
              ...SEED_EVENT,
              id: eventId,
            });
          }
          setLoading(false);
        },
        (err) => {
          console.error(`Error in useEvent onSnapshot for ${eventId}:`, err);
          setError(err.message);
          // Fall back to local representation on error
          loadLocalEvent();
        }
      );

      return () => unsubscribe();
    } else {
      // Local mode
      loadLocalEvent();

      const handleDataUpdate = () => {
        loadLocalEvent();
      };
      window.addEventListener("clubops-data-updated", handleDataUpdate);
      return () => {
        window.removeEventListener("clubops-data-updated", handleDataUpdate);
      };
    }
  }, [eventId, loadLocalEvent]);

  // Helper to update event properties
  const updateEvent = useCallback(
    async (updates) => {
      if (isFirebaseConfigured && db) {
        await updateDoc(doc(db, "events", eventId), updates);
      } else {
        setEvent((prev) => {
          const next = { ...prev, ...updates };
          saveStoredEvent(eventId, next);
          return next;
        });
      }
    },
    [eventId]
  );

  return { event, loading, error, updateEvent };
}
