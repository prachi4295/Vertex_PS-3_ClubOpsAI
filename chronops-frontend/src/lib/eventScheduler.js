import { splitTime12, joinTime24 } from "./time";

/**
 * Event Scheduling and Auto-Start Utility
 * Evaluates event scheduled date and time against current clock time,
 * automatically starting events and stage sessions when their scheduled time arrives.
 */

/**
 * Normalizes any date representation (YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, Date object)
 * into a canonical YYYY-MM-DD string for reliable chronological comparison.
 *
 * @param {string|Date} dateVal
 * @returns {string} "YYYY-MM-DD"
 */
export function normalizeDateYMD(dateVal) {
  if (!dateVal) return "";
  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    const y = dateVal.getFullYear();
    const m = String(dateVal.getMonth() + 1).padStart(2, "0");
    const d = String(dateVal.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const str = String(dateVal).split("T")[0].trim();
  // Match DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Match YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  return str;
}

/**
 * Checks whether an event's scheduled date & time has arrived or passed.
 *
 * @param {Object} event - Event object with { date, time }
 * @param {Date} currentTime - Current Date object
 * @returns {boolean} true if event is due to start or has already passed start time
 */
export function isEventDue(event, currentTime = new Date()) {
  if (!event || !event.date) return false;

  const now =
    currentTime instanceof Date && !isNaN(currentTime.getTime())
      ? currentTime
      : new Date();

  // Normalize event date to canonical YYYY-MM-DD
  const eventDateStr = normalizeDateYMD(event.date);
  // Normalize event scheduled time to 24h "HH:mm" (handles both "14:30" and "02:30 PM")
  const parsedTime = splitTime12(event.time || "09:00");
  const eventTimeStr = joinTime24(parsedTime.hour12, parsedTime.minute, parsedTime.period);

  // Current local date formatted as YYYY-MM-DD
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const currentDateStr = `${y}-${m}-${d}`;

  // Current local time formatted as HH:mm
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const currentHHMM = `${hh}:${mm}`;

  if (currentDateStr > eventDateStr) {
    return true; // Past date
  }
  if (currentDateStr === eventDateStr) {
    return currentHHMM >= eventTimeStr; // Same date, time arrived or passed
  }
  return false; // Future date
}

/**
 * Checks all events and auto-starts any upcoming event whose scheduled date & time has arrived.
 * Also resets any active event whose scheduled date & time is in the future back to upcoming.
 *
 * @param {Object} options
 * @param {Array} options.events - Array of event objects
 * @param {Date} options.currentTime - Current simulated or real time
 * @param {Function} [options.getSessions] - (eventId) => Array of session objects
 * @param {Function} [options.saveSessions] - (eventId, sessions) => void
 * @param {Function} [options.onEventStarted] - (event) => void
 * @param {Function} [options.onSessionStarted] - (event, session) => void
 * @returns {{ updatedEvents: Array, startedEvents: Array, hasChanges: boolean }}
 */
export function processAutoStartEvents({
  events = [],
  currentTime = new Date(),
  getSessions = null,
  saveSessions = null,
  onEventStarted = null,
  onSessionStarted = null,
}) {
  if (!Array.isArray(events) || events.length === 0) {
    return { updatedEvents: events, startedEvents: [], hasChanges: false };
  }

  const now =
    currentTime instanceof Date && !isNaN(currentTime.getTime())
      ? currentTime
      : new Date();
  let hasChanges = false;
  const startedEvents = [];

  const updatedEvents = events.map((event) => {
    // If event is already completed, do nothing
    if (event.status === "completed") {
      return event;
    }

    const due = isEventDue(event, now);

    // If event is upcoming and its scheduled date and time has arrived:
    if (due && event.status !== "active") {
      hasChanges = true;
      const started = {
        ...event,
        status: "active",
        startedAt: now.toISOString(),
      };
      startedEvents.push(started);
      onEventStarted?.(started);

      // Auto-start the first upcoming session of this event if available
      if (typeof getSessions === "function" && typeof saveSessions === "function") {
        try {
          const sessions = getSessions(event.id);
          if (Array.isArray(sessions) && sessions.length > 0) {
            const hasLive = sessions.some((s) => s.status === "live");
            if (!hasLive) {
              const sortedUpcoming = [...sessions]
                .filter((s) => s.status === "upcoming")
                .sort(
                  (a, b) =>
                    (a.order || 0) - (b.order || 0) ||
                    (a.startTime || "").localeCompare(b.startTime || "")
                );

              const firstUpcoming = sortedUpcoming[0];
              if (firstUpcoming) {
                const updatedSessions = sessions.map((s) =>
                  s.id === firstUpcoming.id
                    ? { ...s, status: "live", actualStart: now }
                    : s
                );
                saveSessions(event.id, updatedSessions);
                onSessionStarted?.(started, firstUpcoming);
              }
            }
          }
        } catch (e) {
          console.warn(`Error auto-starting sessions for event ${event.id}:`, e);
        }
      }

      return started;
    }

    // If an event is currently marked active but its scheduled date/time is in the future
    // (e.g. user moved the date to tomorrow), revert it back to upcoming:
    if (!due && event.status === "active") {
      hasChanges = true;
      return {
        ...event,
        status: "upcoming",
      };
    }

    return event;
  });

  return { updatedEvents, startedEvents, hasChanges };
}
