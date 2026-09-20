/**
 * Time utility functions for schedule, run-sheet, and reflow calculations.
 */

/**
 * Converts a "HH:mm" time string into total minutes from midnight.
 *
 * @param {string} timeStr - "HH:mm" format (e.g. "09:30")
 * @returns {number} minutes from midnight, or 0 if invalid
 */
export function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return 0;
  const parts = timeStr.trim().split(":");
  if (parts.length < 2) return 0;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

/**
 * Converts minutes from midnight into a 24-hour "HH:mm" string.
 *
 * @param {number} totalMinutes
 * @returns {string} "HH:mm"
 */
export function minutesToTime(totalMinutes) {
  if (typeof totalMinutes !== "number" || isNaN(totalMinutes)) return "00:00";
  const normalized = ((Math.floor(totalMinutes) % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

/**
 * Adds an offset in minutes to a "HH:mm" string and returns the new "HH:mm".
 *
 * @param {string} timeStr - "HH:mm"
 * @param {number} minutesToAdd
 * @returns {string} "HH:mm"
 */
export function addMinutesToTime(timeStr, minutesToAdd) {
  const mins = timeToMinutes(timeStr) + (minutesToAdd || 0);
  return minutesToTime(mins);
}

/**
 * Calculates the difference in minutes between two time strings (timeA - timeB).
 *
 * @param {string} timeA - "HH:mm"
 * @param {string} timeB - "HH:mm"
 * @returns {number} difference in minutes
 */
export function diffMinutes(timeA, timeB) {
  return timeToMinutes(timeA) - timeToMinutes(timeB);
}

/**
 * Calculates delay in minutes between actual/rescheduled start and planned start.
 * Positive value represents a delay/overrun.
 *
 * @param {string} startTime - Current startTime ("HH:mm")
 * @param {string} plannedStart - Original plannedStart ("HH:mm")
 * @returns {number} delay in minutes (>= 0)
 */
export function calculateDelayMinutes(startTime, plannedStart) {
  if (!startTime || !plannedStart) return 0;
  const actualMin = timeToMinutes(startTime);
  const plannedMin = timeToMinutes(plannedStart);
  return Math.max(0, actualMin - plannedMin);
}

/**
 * Returns formatted time range e.g. "09:00 - 09:30".
 *
 * @param {string} startTime - "HH:mm"
 * @param {number} durationMinutes
 * @returns {string}
 */
export function formatTimeRange(startTime, durationMinutes) {
  const endTime = addMinutesToTime(startTime, durationMinutes);
  return `${startTime} - ${endTime}`;
}

/**
 * Detects overlapping or clashing sessions in a schedule.
 * Returns an array of clash objects detailing which sessions overlap and by how many minutes.
 *
 * @param {Array} sessions
 * @returns {Array<{ currentId: string, currentTitle: string, nextId: string, nextTitle: string, overlapMinutes: number, currentEnd: string, nextStart: string }>}
 */
export function detectTimingClashes(sessions = []) {
  if (!Array.isArray(sessions) || sessions.length < 2) return [];

  // Sort sessions sequentially by order or start time
  const sorted = [...sessions].sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined && a.order !== b.order) {
      return a.order - b.order;
    }
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });

  const clashes = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];

    if (!current.startTime || !next.startTime) continue;

    const currentStart = timeToMinutes(current.startTime);
    const duration = Number(current.durationMinutes) || 30;
    const currentEnd = currentStart + duration;
    const nextStart = timeToMinutes(next.startTime);

    if (currentEnd > nextStart) {
      const overlapMinutes = currentEnd - nextStart;
      clashes.push({
        currentId: current.id,
        currentTitle: current.title,
        nextId: next.id,
        nextTitle: next.title,
        overlapMinutes,
        currentEnd: minutesToTime(currentEnd),
        currentEndTime: minutesToTime(currentEnd),
        nextStart: next.startTime,
        nextStartTime: next.startTime,
      });
    }
  }

  return clashes;
}

/**
 * Automatically resolves all timing clashes by shifting subsequent sessions forward
 * so each session starts right after the previous session ends.
 *
 * @param {Array} sessions
 * @returns {Array} resolved sessions
 */
export function resolveTimingClashes(sessions = []) {
  if (!Array.isArray(sessions) || sessions.length === 0) return [];

  const sorted = [...sessions].sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined && a.order !== b.order) {
      return a.order - b.order;
    }
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });

  let cursor = 0;
  return sorted.map((s, idx) => {
    const startMins = timeToMinutes(s.startTime);
    const duration = Number(s.durationMinutes) || 30;

    if (idx === 0) {
      cursor = startMins + duration;
      return { ...s };
    }

    if (s.status === "completed") {
      cursor = Math.max(cursor, startMins + duration);
      return { ...s };
    }

    // If current start is before cursor (overlap clash), shift it forward to cursor
    if (startMins < cursor) {
      const newStart = minutesToTime(cursor);
      cursor = cursor + duration;
      return {
        ...s,
        startTime: newStart,
      };
    } else {
      cursor = Math.max(cursor, startMins + duration);
      return { ...s };
    }
  });
}


