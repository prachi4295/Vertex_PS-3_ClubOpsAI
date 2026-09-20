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
 * Formats duration in minutes to human-readable format.
 * E.g., 70 -> "1hr 10 min", 80 -> "1hr 20 min", 60 -> "1hr", 45 -> "45 min"
 *
 * @param {number|string} durationMinutes
 * @returns {string}
 */
export function formatDuration(durationMinutes) {
  const mins = Number(durationMinutes);
  if (!mins || isNaN(mins) || mins <= 0) return "0 min";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) {
    return `${h}hr ${m} min`;
  }
  if (h > 0) {
    return `${h}hr`;
  }
  return `${m} min`;
}

/**
 * Formats a date string or Date instance into DD-MM-YYYY format.
 * E.g. "2026-09-20" -> "20-09-2026"
 *
 * @param {string|Date} dateVal
 * @returns {string} formatted as "DD-MM-YYYY"
 */
export function formatDateDMY(dateVal) {
  if (!dateVal) return "";
  const str = dateVal instanceof Date ? dateVal.toISOString().split("T")[0] : String(dateVal).trim();
  const clean = str.split("T")[0];
  const parts = clean.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    const [y, m, d] = parts;
    return `${d.padStart(2, "0")}-${m.padStart(2, "0")}-${y}`;
  }
  return str;
}

/**
 * Formats a 24-hour "HH:mm" time string into 12-hour "hh:mm AM/PM" format.
 * E.g. "11:30" -> "11:30 AM", "14:45" -> "02:45 PM", "00:15" -> "12:15 AM"
 *
 * @param {string} timeStr - "HH:mm" or time string
 * @returns {string} e.g. "11:30 AM"
 */
export function formatTime12(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return "";
  const trimmed = timeStr.trim();
  if (/am|pm/i.test(trimmed)) return trimmed;

  const parts = trimmed.split(":");
  if (parts.length < 2) return trimmed;

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return trimmed;

  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;
  const hoursStr = String(hours12).padStart(2, "0");
  const minsStr = String(minutes).padStart(2, "0");

  return `${hoursStr}:${minsStr} ${period}`;
}

/**
 * Parses any time string (12-hour or 24-hour) into { hour12, minute, period }.
 * E.g. "14:30" -> { hour12: "02", minute: "30", period: "PM" }
 * E.g. "09:00" -> { hour12: "09", minute: "00", period: "AM" }
 *
 * @param {string} timeStr
 * @returns {{ hour12: string, minute: string, period: "AM"|"PM" }}
 */
export function splitTime12(timeStr) {
  if (!timeStr || typeof timeStr !== "string") {
    return { hour12: "09", minute: "00", period: "AM" };
  }

  const trimmed = timeStr.trim();
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    h = Math.min(12, Math.max(1, h));
    return {
      hour12: String(h).padStart(2, "0"),
      minute: match12[2],
      period: match12[3].toUpperCase(),
    };
  }

  const parts = trimmed.split(":");
  if (parts.length >= 2) {
    let h24 = parseInt(parts[0], 10);
    let m = parseInt(parts[1], 10);
    if (isNaN(h24)) h24 = 9;
    if (isNaN(m)) m = 0;
    const period = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    return {
      hour12: String(h12).padStart(2, "0"),
      minute: String(m).padStart(2, "0"),
      period,
    };
  }

  return { hour12: "09", minute: "00", period: "AM" };
}

/**
 * Combines 12-hour components into a 24-hour "HH:mm" string for storage and comparison.
 * E.g. ("02", "30", "PM") -> "14:30", ("12", "00", "AM") -> "00:00"
 *
 * @param {number|string} hour12
 * @param {number|string} minute
 * @param {"AM"|"PM"} period
 * @returns {string} "HH:mm"
 */
export function joinTime24(hour12, minute, period = "AM") {
  let h = parseInt(hour12, 10);
  let m = parseInt(minute, 10);
  if (isNaN(h)) h = 9;
  if (isNaN(m)) m = 0;

  h = Math.min(12, Math.max(1, h));
  m = Math.min(59, Math.max(0, m));

  const isPM = String(period).toUpperCase() === "PM";
  let h24 = h;
  if (isPM && h < 12) h24 = h + 12;
  if (!isPM && h === 12) h24 = 0;

  return `${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
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


