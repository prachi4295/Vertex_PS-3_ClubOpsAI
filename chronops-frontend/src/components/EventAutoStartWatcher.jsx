import { useEffect, useRef } from "react";
import { useClock } from "../hooks/useClock";
import { useNotifications } from "../hooks/useNotifications";
import {
  getStoredEvents,
  saveStoredEvents,
  getStoredSessions,
  saveStoredSessions,
} from "../lib/storage";
import { processAutoStartEvents } from "../lib/eventScheduler";
import { formatDateDMY, formatTime12 } from "../lib/time";

/**
 * EventAutoStartWatcher:
 * Globally listens to the active clock time (real or simulated) and automatically
 * starts events and their live stage run-sheet when their scheduled date and time arrives.
 */
export default function EventAutoStartWatcher() {
  const { currentTime } = useClock();
  const { addNotification } = useNotifications();
  const lastCheckKeyRef = useRef("");

  useEffect(() => {
    if (!currentTime) return;

    // Check once per minute of simulated/real time
    const y = currentTime.getFullYear();
    const m = String(currentTime.getMonth() + 1).padStart(2, "0");
    const d = String(currentTime.getDate()).padStart(2, "0");
    const hh = String(currentTime.getHours()).padStart(2, "0");
    const mm = String(currentTime.getMinutes()).padStart(2, "0");
    const currentKey = `${y}-${m}-${d}_${hh}:${mm}`;

    if (lastCheckKeyRef.current === currentKey) {
      return;
    }
    lastCheckKeyRef.current = currentKey;

    const events = getStoredEvents();
    if (!events || events.length === 0) return;

    const { updatedEvents, startedEvents, hasChanges } = processAutoStartEvents({
      events,
      currentTime,
      getSessions: (eventId) => getStoredSessions(eventId),
      saveSessions: (eventId, sessions) => saveStoredSessions(eventId, sessions),
      onEventStarted: (event) => {
        addNotification({
          type: "action",
          message: `📢 Event Auto-Started: "${event.name}" scheduled for ${formatDateDMY(event.date)}${event.time ? ` at ${formatTime12(event.time)}` : ""} has commenced automatically!`,
        });
      },
      onSessionStarted: (event, session) => {
        addNotification({
          type: "info",
          message: `⚡ Live Stage: First session "${session.title}" of "${event.name}" is now LIVE.`,
        });
      },
    });

    if (hasChanges) {
      saveStoredEvents(updatedEvents);
      window.dispatchEvent(new CustomEvent("clubops-data-updated"));
    }
  }, [currentTime, addNotification]);

  // Reset check lock on manual data changes so new events are evaluated immediately
  useEffect(() => {
    const handleDataUpdated = () => {
      lastCheckKeyRef.current = "";
    };
    window.addEventListener("clubops-data-updated", handleDataUpdated);
    return () => window.removeEventListener("clubops-data-updated", handleDataUpdated);
  }, []);

  return null;
}
