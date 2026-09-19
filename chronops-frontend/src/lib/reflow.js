import { timeToMinutes, minutesToTime } from "./time";

/**
 * Reflows the event run-sheet schedule when a session overruns or changes duration.
 *
 * Rules:
 * - Work in minutes since midnight. The live session's durationMinutes increases by delta.
 * - Walk the following sessions in order with a cursor at the end of the previous session.
 * - A flexible session gets startTime = max(its current start, cursor), so existing gaps and buffers absorb delay first.
 * - A fixed session never moves. If the cursor is at or before its start, propagation stops.
 * - If the cursor passes it, first try compressing the flexible sessions between the live session and that fixed one
 *   (each down to max(5, 50% of planned duration)). If that absorbs the overflow, apply it.
 *   If not, keep the fixed start and return a warning like "Fixed session X will start N min late".
 * - Never modify plannedStart.
 *
 * @param {Array} sessions - Array of session objects
 * @param {number} deltaMinutes - Overrun/delay in minutes
 * @param {string} [liveSessionId] - ID of the session experiencing the overrun
 * @returns {{ sessions: Array, warnings: Array<string> }}
 */
export function reflowSchedule(sessions = [], deltaMinutes = 0, liveSessionId) {
  if (!Array.isArray(sessions) || sessions.length === 0) {
    return { sessions: [], warnings: [] };
  }

  // Pure function: clone all session objects
  const reflowed = sessions.map((s) => ({
    ...s,
    // Store original duration as plannedDuration if not explicitly set
    plannedDuration: s.plannedDuration || s.durationMinutes,
  }));

  const warnings = [];

  // If delta is 0 or negative, return unchanged sessions without warnings
  if (!deltaMinutes || deltaMinutes <= 0) {
    return { sessions: reflowed, warnings: [] };
  }

  // Sort sessions in sequence (preserving original order field or current startTime)
  reflowed.sort((a, b) => {
    if (a.order !== undefined && b.order !== undefined) {
      return a.order - b.order;
    }
    return timeToMinutes(a.startTime) - timeToMinutes(b.startTime);
  });

  // Identify the live session
  const liveIndex = liveSessionId
    ? reflowed.findIndex((s) => s.id === liveSessionId)
    : reflowed.findIndex((s) => s.status === "live");

  if (liveIndex === -1) {
    return { sessions: reflowed, warnings: [] };
  }

  const liveSession = reflowed[liveIndex];
  // Live session's durationMinutes increases by delta
  liveSession.durationMinutes = (liveSession.durationMinutes || 0) + deltaMinutes;

  // Cursor at the end of the live session
  let cursor = timeToMinutes(liveSession.startTime) + liveSession.durationMinutes;

  // Walk following sessions in order
  let i = liveIndex + 1;
  while (i < reflowed.length) {
    const session = reflowed[i];

    if (session.sessionType === "fixed") {
      const fixedStart = timeToMinutes(session.startTime);

      if (cursor <= fixedStart) {
        // If cursor is at or before its start, propagation stops
        break;
      }

      // Cursor passes the fixed session!
      const overflow = cursor - fixedStart;

      // Find flexible sessions between the live session and this fixed one
      const flexibleBetween = [];
      for (let k = liveIndex + 1; k < i; k++) {
        if (reflowed[k].sessionType === "flexible") {
          flexibleBetween.push(reflowed[k]);
        }
      }

      // Calculate compressible capacity: each down to max(5, 50% of planned duration)
      let totalCompressible = 0;
      const compressionPlans = flexibleBetween.map((s) => {
        const planned = s.plannedDuration || s.durationMinutes;
        const minDuration = Math.max(5, Math.floor(planned * 0.5));
        const maxReduction = Math.max(0, s.durationMinutes - minDuration);
        totalCompressible += maxReduction;
        return { session: s, minDuration, maxReduction };
      });

      if (totalCompressible >= overflow) {
        // Compression absorbs the overflow! Apply it.
        let neededReduction = overflow;
        for (const plan of compressionPlans) {
          if (neededReduction <= 0) break;
          const reduceBy = Math.min(plan.maxReduction, neededReduction);
          plan.session.durationMinutes -= reduceBy;
          neededReduction -= reduceBy;
        }

        // Re-walk flexible sessions from live session with compressed durations
        let reCursor = timeToMinutes(liveSession.startTime) + liveSession.durationMinutes;
        for (let k = liveIndex + 1; k < i; k++) {
          const s = reflowed[k];
          const origStart = timeToMinutes(s.plannedStart || s.startTime);
          const newStart = Math.max(origStart, reCursor);
          s.startTime = minutesToTime(newStart);
          reCursor = newStart + s.durationMinutes;
        }

        // The overflow was fully absorbed by compression, cursor is now <= fixedStart
        cursor = fixedStart + (session.durationMinutes || 0);
        // Propagation stops at this fixed session
        break;
      } else {
        // Compression cannot absorb the overflow.
        // Keep the fixed start and return a warning like "Fixed session X will start N min late"
        warnings.push(`Fixed session ${session.title} will start ${overflow} min late`);

        // Fixed session never moves: keep its fixed start
        cursor = fixedStart + (session.durationMinutes || 0);
        i++;
      }
    } else {
      // Flexible session:
      // A flexible session gets startTime = max(its current start, cursor),
      // so existing gaps and buffers absorb delay first.
      const currentStart = timeToMinutes(session.startTime);
      const newStart = Math.max(currentStart, cursor);
      session.startTime = minutesToTime(newStart);
      cursor = newStart + (session.durationMinutes || 0);
      i++;
    }
  }

  return { sessions: reflowed, warnings };
}
