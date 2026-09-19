import { describe, it, expect } from "vitest";
import { DEMO_EVENT_ID, SEED_TASKS, SEED_SESSIONS } from "../data/seed";

describe("Layout and App State Logic", () => {
  it("filters tasks by search query matching title or assignee", () => {
    const query = "priya";
    const filteredTasks = SEED_TASKS.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        (t.assignee && t.assignee.toLowerCase().includes(query))
    );
    expect(filteredTasks.length).toBeGreaterThan(0);
    expect(filteredTasks.every((t) => t.assignee.toLowerCase() === "priya")).toBe(true);
  });

  it("filters sessions by search query matching title or speaker", () => {
    const query = "gupta";
    const filteredSessions = SEED_SESSIONS.filter(
      (s) =>
        s.title.toLowerCase().includes(query) ||
        (s.speaker && s.speaker.toLowerCase().includes(query))
    );
    expect(filteredSessions.length).toBe(1);
    expect(filteredSessions[0].speaker).toContain("Dr. Ramesh Gupta");
    expect(filteredSessions[0].phoneticGuide).toBe("Dr. GOOP-ta");
  });

  it("calculates overdue tasks correctly", () => {
    const referenceNow = new Date("2026-09-19T17:50:00");
    const overdue = SEED_TASKS.filter((t) => {
      if (!t.dueDate || t.status === "done") return false;
      const due = t.dueDate.toDate ? t.dueDate.toDate() : new Date(t.dueDate);
      return due < referenceNow;
    });
    expect(overdue.length).toBeGreaterThan(0);
  });
});
