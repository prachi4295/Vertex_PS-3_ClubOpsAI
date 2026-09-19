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
import { db } from "../services/firebase";
import { DEMO_EVENT_ID, SEED_TASKS } from "../data/seed";

const TasksContext = createContext(null);

/**
 * Provides real-time task list from Firestore with CRUD helpers.
 * Falls back to seed data when Firebase is not configured.
 */
export function TasksProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usingLocal, setUsingLocal] = useState(false);

  const eventId = DEMO_EVENT_ID;

  // ─── Real-time listener (or local fallback) ───
  useEffect(() => {
    // Check if Firebase is configured
    const hasFirebase = import.meta.env.VITE_FIREBASE_API_KEY;

    if (!hasFirebase) {
      // Use local seed data as fallback
      console.info("Firebase not configured — using local seed data.");
      setUsingLocal(true);
      setTasks(
        SEED_TASKS.map((t, i) => ({
          ...t,
          id: `local-${i}`,
          dueDate: t.dueDate ? t.dueDate.toDate() : null,
          createdAt: t.createdAt.toDate(),
          updatedAt: t.updatedAt.toDate(),
        }))
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    // Query by eventId only — no orderBy (avoids composite index requirement)
    const q = query(
      collection(db, "tasks"),
      where("eventId", "==", eventId)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            dueDate: data.dueDate?.toDate?.() ?? null,
            createdAt: data.createdAt?.toDate?.() ?? new Date(),
            updatedAt: data.updatedAt?.toDate?.() ?? new Date(),
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
        setLoading(false);
      }
    );

    return () => unsub();
  }, [eventId]);

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

      if (usingLocal) {
        setTasks((prev) => [
          ...prev,
          {
            ...newTask,
            id: `local-${Date.now()}`,
            dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
            createdAt: now,
            updatedAt: now,
          },
        ]);
        return;
      }

      await addDoc(collection(db, "tasks"), newTask);
    },
    [eventId, usingLocal]
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

      if (usingLocal) {
        setTasks((prev) =>
          prev.map((t) =>
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
          )
        );
        return;
      }

      await updateDoc(doc(db, "tasks", taskId), firestoreUpdates);
    },
    [usingLocal]
  );

  // ─── Delete task ───
  const deleteTask = useCallback(
    async (taskId) => {
      if (usingLocal) {
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
        return;
      }

      await deleteDoc(doc(db, "tasks", taskId));
    },
    [usingLocal]
  );

  // ─── Move task (optimistic) ───
  const moveTask = useCallback(
    async (taskId, newStatus) => {
      // Optimistic update
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, status: newStatus, updatedAt: new Date() } : t
        )
      );

      if (usingLocal) return;

      try {
        await updateDoc(doc(db, "tasks", taskId), {
          status: newStatus,
          updatedAt: Timestamp.fromDate(new Date()),
        });
      } catch (err) {
        console.error("Failed to persist task move:", err);
        // Revert handled by onSnapshot re-sync
      }
    },
    [usingLocal]
  );

  return (
    <TasksContext.Provider
      value={{ tasks, loading, error, addTask, updateTask, deleteTask, moveTask }}
    >
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasks must be used within TasksProvider");
  return ctx;
}
