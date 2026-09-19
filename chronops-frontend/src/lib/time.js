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
