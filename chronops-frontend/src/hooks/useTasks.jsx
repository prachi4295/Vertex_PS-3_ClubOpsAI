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
  SEED_TASKS,
  LOCAL_TASKS_KEY,
} from "../data/seed";
import { AI_SUMMIT_TASKS, CLUB_ORIENTATION_TASKS } from "../data/multiEvents";

const TasksContext = createContext(null);

/**
 * Loads tasks from localStorage or falls back to SEED_TASKS or event presets.
 */
function getLocalTasks(eventId) {
  try {
    const raw = localStorage.getItem(`clubops_tasks_${eventId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.map((t) => ({
        ...t,
        dueDate: t.dueDate ? new Date(t.dueDate) : null,
        createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
        updatedAt: t.updatedAt ? new Date(t.updatedAt) : new Date(),
      }));
    }
  } catch (e) {
    console.warn("Failed to load local tasks:", e);
  }

  if (eventId === "ai-summit-2026") {
    return AI_SUMMIT_TASKS.map((t) => ({ ...t }));
  }
  if (eventId === "club-orientation-2026") {
    return CLUB_ORIENTATION_TASKS.map((t) => ({ ...t }));
  }

  return SEED_TASKS.map((t, i) => ({
    ...t,
    id: t.id || `task-${i + 1}`,
    dueDate: t.dueDate ? t.dueDate.toDate() : null,
    createdAt: t.createdAt.toDate(),
    updatedAt: t.updatedAt.toDate(),
  }));
}

/**
 * Saves tasks to localStorage.
 */
function saveLocalTasks(eventId, tasks) {
  try {
    const serialized = tasks.map((t) => ({
      ...t,
      dueDate: t.dueDate ? (t.dueDate instanceof Date ? t.dueDate.toISOString() : t.dueDate) : null,
      createdAt: t.createdAt ? (t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt) : new Date().toISOString(),
      updatedAt: t.updatedAt ? (t.updatedAt instanceof Date ? t.updatedAt.toISOString() : t.updatedAt) : new Date().toISOString(),
    }));
    localStorage.setItem(`clubops_tasks_${eventId}`, JSON.stringify(serialized));
  } catch (e) {
    console.warn("Failed to save local tasks:", e);
  }
}

/**
 * Core hook that manages tasks for a specific eventId via onSnapshot.
 * Sorts client-side without combining where() and orderBy().
 */
export function useEventTasks(eventId = DEMO_EVENT_ID) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sync state loader
  const reloadFromLocal = useCallback(() => {
    const localData = getLocalTasks(eventId);
    // Sort client-side by createdAt
    localData.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    setTasks(localData);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    if (!eventId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    if (isFirebaseConfigured && db) {
      setLoading(true);
      // Query by eventId only — per spec: do not combine where() with orderBy()
      const q = query(collection(db, "tasks"), where("eventId", "==", eventId));

      const unsub = onSnapshot(
        q,
        (snap) => {
          const docs = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              ...data,
              dueDate: data.dueDate?.toDate?.() ?? (data.dueDate ? new Date(data.dueDate) : null),
              createdAt: data.createdAt?.toDate?.() ?? (data.createdAt ? new Date(data.createdAt) : new Date()),
              updatedAt: data.updatedAt?.toDate?.() ?? (data.updatedAt ? new Date(data.updatedAt) : new Date()),
            };
          });

          // Sort client-side by createdAt
          docs.sort((a, b) => a.createdAt - b.createdAt);
          setTasks(docs);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error("Firestore tasks error:", err);
          setError(err.message);
          reloadFromLocal();
        }
      );

      return () => unsub();
    } else {
      // Local demo mode
      reloadFromLocal();

      const handleUpdate = () => {
        reloadFromLocal();
      };
      window.addEventListener("clubops-data-updated", handleUpdate);
      return () => window.removeEventListener("clubops-data-updated", handleUpdate);
    }
  }, [eventId, reloadFromLocal]);

  // ─── Add task ───
  const addTask = useCallback(
    async (taskData) => {
      const now = new Date();
      const newTask = {
        eventId,
        title: taskData.title,
        status: taskData.status || "backlog",
        assignee: taskData.assignee || "",
        priority: taskData.priority || "medium",
        dueDate: taskData.dueDate ? Timestamp.fromDate(new Date(taskData.dueDate)) : null,
        source: taskData.source || "manual",
        createdAt: Timestamp.fromDate(now),
        updatedAt: Timestamp.fromDate(now),
      };

      if (!isFirebaseConfigured || !db) {
        const localItem = {
          ...newTask,
          id: `task-${Date.now()}`,
          dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
          createdAt: now,
          updatedAt: now,
        };
        setTasks((prev) => {
          const updated = [...prev, localItem];
          saveLocalTasks(eventId, updated);
          return updated;
        });
        window.dispatchEvent(new CustomEvent("clubops-data-updated"));
        return localItem;
      }

      const docRef = await addDoc(collection(db, "tasks"), newTask);
      return { id: docRef.id, ...newTask };
    },
    [eventId]
  );

  // ─── Update task ───
  const updateTask = useCallback(
    async (taskId, updates) => {
      const now = new Date();
      const firestoreUpdates = {
        ...updates,
        updatedAt: Timestamp.fromDate(now),
      };
      if (updates.dueDate !== undefined) {
        firestoreUpdates.dueDate = updates.dueDate
          ? Timestamp.fromDate(new Date(updates.dueDate))
          : null;
      }

      if (!isFirebaseConfigured || !db) {
        setTasks((prev) => {
          const updated = prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  ...updates,
                  dueDate: updates.dueDate !== undefined
                    ? (updates.dueDate ? new Date(updates.dueDate) : null)
                    : t.dueDate,
                  updatedAt: now,
                }
              : t
          );
          saveLocalTasks(eventId, updated);
          return updated;
        });
        window.dispatchEvent(new CustomEvent("clubops-data-updated"));
        return;
      }

      await updateDoc(doc(db, "tasks", taskId), firestoreUpdates);
    },
    [eventId]
  );

  // ─── Delete task ───
  const deleteTask = useCallback(
    async (taskId) => {
      if (!isFirebaseConfigured || !db) {
        setTasks((prev) => {
          const updated = prev.filter((t) => t.id !== taskId);
          saveLocalTasks(eventId, updated);
          return updated;
        });
        window.dispatchEvent(new CustomEvent("clubops-data-updated"));
        return;
      }

      await deleteDoc(doc(db, "tasks", taskId));
    },
    [eventId]
  );

  // ─── Move task (optimistic UI) ───
  const moveTask = useCallback(
    async (taskId, newStatus) => {
      const now = new Date();
      setTasks((prev) => {
        const updated = prev.map((t) =>
          t.id === taskId ? { ...t, status: newStatus, updatedAt: now } : t
        );
        if (!isFirebaseConfigured || !db) {
          saveLocalTasks(eventId, updated);
        }
        return updated;
      });

      if (!isFirebaseConfigured || !db) {
        window.dispatchEvent(new CustomEvent("clubops-data-updated"));
        return;
      }

      try {
        await updateDoc(doc(db, "tasks", taskId), {
          status: newStatus,
          updatedAt: Timestamp.fromDate(now),
        });
      } catch (err) {
        console.error("Failed to persist task move:", err);
      }
    },
    [eventId]
  );

  // ─── Add multiple tasks in a batch ───
  const addTasksBatch = useCallback(
    async (tasksArray) => {
      const now = new Date();
      const prepared = tasksArray.map((t, idx) => ({
        eventId,
        title: t.title,
        status: t.status || "backlog",
        assignee: t.assignee || "",
        priority: t.priority || "medium",
        dueDate: t.dueDate
          ? (t.dueDate instanceof Date
              ? Timestamp.fromDate(t.dueDate)
              : Timestamp.fromDate(new Date(t.dueDate)))
          : null,
        source: t.source || "ai",
        createdAt: Timestamp.fromDate(new Date(now.getTime() + idx * 50)),
        updatedAt: Timestamp.fromDate(now),
      }));

      if (!isFirebaseConfigured || !db) {
        const localCreated = prepared.map((t, i) => ({
          ...t,
          id: `task-ai-${Date.now()}-${i}`,
          dueDate: t.dueDate ? (t.dueDate.toDate ? t.dueDate.toDate() : new Date(t.dueDate)) : null,
          createdAt: t.createdAt.toDate ? t.createdAt.toDate() : new Date(),
          updatedAt: t.updatedAt.toDate ? t.updatedAt.toDate() : new Date(),
        }));
        setTasks((prev) => {
          const updated = [...prev, ...localCreated];
          saveLocalTasks(eventId, updated);
          return updated;
        });
        window.dispatchEvent(new CustomEvent("clubops-data-updated"));
        return localCreated;
      }

      const batch = writeBatch(db);
      const created = [];
      prepared.forEach((t) => {
        const docRef = doc(collection(db, "tasks"));
        batch.set(docRef, t);
        created.push({ id: docRef.id, ...t });
      });
      await batch.commit();
      return created;
    },
    [eventId]
  );

  // ─── Delete multiple tasks in a batch ───
  const deleteTasksBatch = useCallback(
    async (taskIds) => {
      if (!Array.isArray(taskIds) || taskIds.length === 0) return;

      if (!isFirebaseConfigured || !db) {
        setTasks((prev) => {
          const updated = prev.filter((t) => !taskIds.includes(t.id));
          saveLocalTasks(eventId, updated);
          return updated;
        });
        window.dispatchEvent(new CustomEvent("clubops-data-updated"));
        return;
      }

      const batch = writeBatch(db);
      taskIds.forEach((id) => {
        batch.delete(doc(db, "tasks", id));
      });
      await batch.commit();
    },
    [eventId]
  );

  return {
    tasks,
    loading,
    error,
    addTask,
    updateTask,
    deleteTask,
    moveTask,
    addTasksBatch,
    deleteTasksBatch,
  };
}

/**
 * Provider for app-wide tasks context.
 */
/**
 * Standalone helper to write a batch of tasks to any specific eventId.
 */
export async function addTasksBatchToEvent(eventId, tasksArray) {
  const now = new Date();
  const prepared = tasksArray.map((t, idx) => ({
    eventId,
    title: t.title,
    status: t.status || "backlog",
    assignee: t.assignee || "",
    priority: t.priority || "medium",
    dueDate: t.dueDate
      ? (t.dueDate instanceof Date
          ? Timestamp.fromDate(t.dueDate)
          : Timestamp.fromDate(new Date(t.dueDate)))
      : null,
    source: t.source || "ai",
    createdAt: Timestamp.fromDate(new Date(now.getTime() + idx * 50)),
    updatedAt: Timestamp.fromDate(now),
  }));

  if (!isFirebaseConfigured || !db) {
    const localCreated = prepared.map((t, i) => ({
      ...t,
      id: `task-ai-${Date.now()}-${i}`,
      dueDate: t.dueDate ? (t.dueDate.toDate ? t.dueDate.toDate() : new Date(t.dueDate)) : null,
      createdAt: t.createdAt.toDate ? t.createdAt.toDate() : new Date(),
      updatedAt: t.updatedAt.toDate ? t.updatedAt.toDate() : new Date(),
    }));
    const current = getLocalTasks(eventId);
    const updated = [...current, ...localCreated];
    saveLocalTasks(eventId, updated);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("clubops-data-updated"));
    }
    return localCreated;
  }

  const batch = writeBatch(db);
  const created = [];
  prepared.forEach((t) => {
    const docRef = doc(collection(db, "tasks"));
    batch.set(docRef, t);
    created.push({ id: docRef.id, ...t });
  });
  await batch.commit();
  return created;
}

/**
 * Standalone helper to delete a batch of tasks from any specific eventId.
 */
export async function deleteTasksBatchFromEvent(eventId, taskIds) {
  if (!Array.isArray(taskIds) || taskIds.length === 0) return;

  if (!isFirebaseConfigured || !db) {
    const current = getLocalTasks(eventId);
    const updated = current.filter((t) => !taskIds.includes(t.id));
    saveLocalTasks(eventId, updated);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("clubops-data-updated"));
    }
    return;
  }

  const batch = writeBatch(db);
  taskIds.forEach((id) => {
    batch.delete(doc(db, "tasks", id));
  });
  await batch.commit();
}

/**
 * Provider for app-wide tasks context.
 */
export function TasksProvider({ children, eventId = DEMO_EVENT_ID }) {
  const taskState = useEventTasks(eventId);
  return (
    <TasksContext.Provider value={taskState}>
      {children}
    </TasksContext.Provider>
  );
}

/**
 * Hook to access tasks. Can be called with useTasks(eventId) or useTasks() inside provider.
 */
export function useTasks(customEventId) {
  const ctx = useContext(TasksContext);
  const standaloneState = useEventTasks(customEventId);

  // If a custom eventId is passed, return the standalone hook state for that eventId
  if (customEventId) {
    return standaloneState;
  }

  // Otherwise, use the shared context if available
  if (ctx) {
    return ctx;
  }

  // Fallback to standalone default if outside provider
  return standaloneState;
}
