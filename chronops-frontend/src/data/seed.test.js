import { describe, it, expect } from "vitest";
import {
  DEMO_EVENT_ID,
  SEED_EVENT,
  SEED_TASKS,
  SEED_SESSIONS,
  seedDemoData,
  resetDemoData,
} from "./seed";

describe("HackGenesis 2026 Seed Data", () => {
  it("defines the correct event ID and basic event metadata", () => {
    expect(DEMO_EVENT_ID).toBe("hackgenesis-2026");
    expect(SEED_EVENT.name).toBe("HackGenesis 2026");
    expect(SEED_EVENT.status).toBe("active");
  });

  it("contains 12 tasks across all four statuses", () => {
    expect(SEED_TASKS.length).toBe(12);

    const statuses = new Set(SEED_TASKS.map((t) => t.status));
    expect(statuses.has("backlog")).toBe(true);
    expect(statuses.has("todo")).toBe(true);
    expect(statuses.has("in_progress")).toBe(true);
    expect(statuses.has("done")).toBe(true);

    const backlogCount = SEED_TASKS.filter((t) => t.status === "backlog").length;
    const todoCount = SEED_TASKS.filter((t) => t.status === "todo").length;
    const inProgressCount = SEED_TASKS.filter((t) => t.status === "in_progress").length;
    const doneCount = SEED_TASKS.filter((t) => t.status === "done").length;

    expect(backlogCount).toBeGreaterThan(0);
    expect(todoCount).toBeGreaterThan(0);
    expect(inProgressCount).toBeGreaterThan(0);
    expect(doneCount).toBeGreaterThan(0);
  });

  it("contains overdue tasks and unassigned tasks", () => {
    const unassignedTasks = SEED_TASKS.filter((t) => !t.assignee || t.assignee.trim() === "");
    expect(unassignedTasks.length).toBeGreaterThan(0);

    const referenceNow = new Date("2026-09-19T17:50:00");
    const overdueTasks = SEED_TASKS.filter((t) => {
      if (!t.dueDate) return false;
      const due = t.dueDate.toDate ? t.dueDate.toDate() : new Date(t.dueDate);
      return due < referenceNow;
    });
    expect(overdueTasks.length).toBeGreaterThan(0);
  });

  it("contains 10 sessions with 3 fixed sessions and realistic order", () => {
    expect(SEED_SESSIONS.length).toBe(10);

    const fixedSessions = SEED_SESSIONS.filter((s) => s.sessionType === "fixed");
    expect(fixedSessions.length).toBe(3);

    const fixedTitles = fixedSessions.map((s) => s.title.toLowerCase());
    expect(fixedTitles.some((t) => t.includes("inauguration"))).toBe(true);
    expect(fixedTitles.some((t) => t.includes("lunch"))).toBe(true);
    expect(fixedTitles.some((t) => t.includes("closing") || t.includes("finale"))).toBe(true);

    // Verify ordering
    const orders = SEED_SESSIONS.map((s) => s.order);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("includes at least one session with phoneticGuide like 'Dr. GOOP-ta'", () => {
    const phoneticGuides = SEED_SESSIONS.map((s) => s.phoneticGuide).filter(Boolean);
    expect(phoneticGuides.length).toBeGreaterThan(0);
    expect(phoneticGuides.some((g) => g.includes("Dr. GOOP-ta"))).toBe(true);
  });

  it("seeds and cleanly resets data", async () => {
    const seeded = await seedDemoData("test-owner-uid");
    expect(seeded.event.id).toBe("hackgenesis-2026");
    expect(seeded.tasks.length).toBe(12);
    expect(seeded.sessions.length).toBe(10);

    const reset = await resetDemoData("test-owner-uid");
    expect(reset.event.id).toBe("hackgenesis-2026");
    expect(reset.tasks.length).toBe(12);
    expect(reset.sessions.length).toBe(10);
  });
});
