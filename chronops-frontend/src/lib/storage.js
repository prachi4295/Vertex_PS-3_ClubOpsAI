/**
 * Multi-User Scoped Storage Utility
 * Isolates events, taskboards, tasks, sessions, and settings per email/account login.
 */

const DEMO_EVENT_IDS = ["chronops-summit-2026", "ai-summit-2026", "club-orientation-2026"];

/**
 * Retrieves the currently authenticated user's email or identifier.
 *
 * @returns {string} normalized user email/id or "anonymous"
 */
export function getActiveUserEmail() {
  try {
    const raw = sessionStorage.getItem("clubops_session_auth");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.email) return parsed.email.toLowerCase().trim();
      if (parsed?.uid) return parsed.uid.toLowerCase().trim();
    }
    const local = localStorage.getItem("clubops_current_user_email");
    if (local) return local.toLowerCase().trim();
  } catch (e) {
    console.warn("Error reading active user email:", e);
  }
  return "anonymous";
}

/**
 * Returns a storage key scoped to the specific user's email.
 * e.g. "clubops_all_events_list" -> "clubops_all_events_list__usr_user_gmail_com"
 *
 * @param {string} baseKey
 * @param {string|null} [userEmail]
 * @returns {string}
 */
export function getScopedKey(baseKey, userEmail = null) {
  const email = (userEmail || getActiveUserEmail() || "anonymous").toLowerCase().trim();
  const safeScope = email.replace(/[^a-z0-9_]/gi, "_");
  return `${baseKey}__usr_${safeScope}`;
}

// ─── Events Storage ───

export function getStoredEvents(userEmail = null) {
  try {
    const key = getScopedKey("clubops_all_events_list", userEmail);
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((e) => !DEMO_EVENT_IDS.includes(e.id))
          .map((e) => ({
            ...e,
            time: e.time || "09:00",
          }));
      }
    }
  } catch (e) {
    console.warn("Failed to load user-scoped events:", e);
  }
  return [];
}

export function saveStoredEvents(events, userEmail = null) {
  try {
    const key = getScopedKey("clubops_all_events_list", userEmail);
    localStorage.setItem(key, JSON.stringify(events));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("clubops-data-updated"));
    }
  } catch (e) {
    console.warn("Failed to save user-scoped events:", e);
  }
}

// ─── Active Event ID ───

export function getActiveEventId(userEmail = null) {
  try {
    const key = getScopedKey("clubops_current_active_event_id", userEmail);
    const stored = localStorage.getItem(key);
    if (stored && !DEMO_EVENT_IDS.includes(stored)) return stored;
  } catch (e) {}
  return "";
}

export function saveActiveEventId(eventId, userEmail = null) {
  try {
    const key = getScopedKey("clubops_current_active_event_id", userEmail);
    localStorage.setItem(key, eventId);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("clubops-data-updated"));
    }
  } catch (e) {}
}

// ─── Tasks Storage ───

export function getStoredTasks(eventId, userEmail = null) {
  if (!eventId) return [];
  try {
    const key = getScopedKey(`clubops_tasks_${eventId}`, userEmail);
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((t) => ({
          ...t,
          dueDate: t.dueDate ? new Date(t.dueDate) : null,
          createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
          updatedAt: t.updatedAt ? new Date(t.updatedAt) : new Date(),
        }));
      }
    }
  } catch (e) {
    console.warn("Failed to load user-scoped tasks:", e);
  }
  return [];
}

export function saveStoredTasks(eventId, tasks, userEmail = null) {
  if (!eventId) return;
  try {
    const key = getScopedKey(`clubops_tasks_${eventId}`, userEmail);
    const serialized = tasks.map((t) => ({
      ...t,
      dueDate: t.dueDate ? (t.dueDate instanceof Date ? t.dueDate.toISOString() : t.dueDate) : null,
      createdAt: t.createdAt ? (t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt) : new Date().toISOString(),
      updatedAt: t.updatedAt ? (t.updatedAt instanceof Date ? t.updatedAt.toISOString() : t.updatedAt) : new Date().toISOString(),
    }));
    localStorage.setItem(key, JSON.stringify(serialized));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("clubops-data-updated"));
    }
  } catch (e) {
    console.warn("Failed to save user-scoped tasks:", e);
  }
}

export function removeStoredTasks(eventId, userEmail = null) {
  if (!eventId) return;
  try {
    const key = getScopedKey(`clubops_tasks_${eventId}`, userEmail);
    localStorage.removeItem(key);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("clubops-data-updated"));
    }
  } catch (e) {}
}

// ─── Sessions Storage ───

export function getStoredSessions(eventId, userEmail = null) {
  if (!eventId) return [];
  try {
    const key = getScopedKey(`clubops_sessions_${eventId}`, userEmail);
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((s) => ({
          ...s,
          actualStart: s.actualStart ? new Date(s.actualStart) : null,
        }));
      }
    }
  } catch (e) {
    console.warn("Failed to load user-scoped sessions:", e);
  }
  return [];
}

export function saveStoredSessions(eventId, sessions, userEmail = null) {
  if (!eventId) return;
  try {
    const key = getScopedKey(`clubops_sessions_${eventId}`, userEmail);
    const serialized = sessions.map((s) => ({
      ...s,
      actualStart: s.actualStart ? (s.actualStart instanceof Date ? s.actualStart.toISOString() : s.actualStart) : null,
    }));
    localStorage.setItem(key, JSON.stringify(serialized));
  } catch (e) {
    console.warn("Failed to save user-scoped sessions:", e);
  }
}

export function removeStoredSessions(eventId, userEmail = null) {
  if (!eventId) return;
  try {
    const key = getScopedKey(`clubops_sessions_${eventId}`, userEmail);
    localStorage.removeItem(key);
  } catch (e) {}
}

// ─── Volunteers Storage ───

export function getStoredVolunteers(userEmail = null) {
  try {
    const key = getScopedKey("clubops_volunteers", userEmail);
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
}

export function saveStoredVolunteers(volunteers, userEmail = null) {
  try {
    const key = getScopedKey("clubops_volunteers", userEmail);
    localStorage.setItem(key, JSON.stringify(volunteers));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("clubops-data-updated"));
    }
  } catch (e) {}
}

// ─── Single Event Document Storage ───

export function getStoredEvent(eventId, userEmail = null) {
  if (!eventId) return null;
  try {
    const key = getScopedKey(`clubops_event_${eventId}`, userEmail);
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

export function saveStoredEvent(eventId, eventData, userEmail = null) {
  if (!eventId) return;
  try {
    const key = getScopedKey(`clubops_event_${eventId}`, userEmail);
    localStorage.setItem(key, JSON.stringify(eventData));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("clubops-data-updated"));
    }
  } catch (e) {}
}

// ─── Email Dispatches Storage ───

export function getStoredDispatches(userEmail = null) {
  try {
    const key = getScopedKey("clubops_email_dispatches", userEmail);
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

export function saveStoredDispatches(dispatches, userEmail = null) {
  try {
    const key = getScopedKey("clubops_email_dispatches", userEmail);
    localStorage.setItem(key, JSON.stringify(dispatches.slice(0, 30)));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("clubops-data-updated"));
    }
  } catch (e) {}
}

