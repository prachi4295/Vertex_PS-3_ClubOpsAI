import { describe, it, expect } from "vitest";
import {
  calculateTaskCompletion,
  calculateVolunteerAllocation,
  calculateCurrentDelay,
  calculateRiskScore,
  calculateHealthMetrics,
  isTaskOverdue,
  RISK_THRESHOLDS,
  DELAY_THRESHOLDS,
  RISK_POINTS,
} from "./health";

describe("Event Health Calculation Engine (health.js)", () => {
  const referenceNow = new Date("2026-09-19T10:00:00Z");

  describe("Task Completion %", () => {
    it("returns 0 when task list is empty", () => {
      expect(calculateTaskCompletion([])).toBe(0);
      expect(calculateTaskCompletion(null)).toBe(0);
    });

    it("calculates correct percentage of completed tasks", () => {
      const tasks = [
        { status: "done" },
        { status: "done" },
        { status: "todo" },
        { status: "in_progress" },
      ];
      // 2 / 4 = 50%
      expect(calculateTaskCompletion(tasks)).toBe(50);
    });

    it("returns 100 when all tasks are done", () => {
      const tasks = [{ status: "done" }, { status: "done" }];
      expect(calculateTaskCompletion(tasks)).toBe(100);
    });
  });

  describe("Volunteer Allocation %", () => {
    it("returns 0 when task list is empty", () => {
      expect(calculateVolunteerAllocation([])).toBe(0);
    });

    it("returns 100 when all tasks are already done", () => {
      const tasks = [{ status: "done", assignee: "" }];
      expect(calculateVolunteerAllocation(tasks)).toBe(100);
    });

    it("calculates non-done tasks with an assignee over all non-done tasks", () => {
      const tasks = [
        { status: "todo", assignee: "Priya" },
        { status: "in_progress", assignee: "Arjun" },
        { status: "backlog", assignee: "" },
        { status: "todo", assignee: "   " }, // empty trimmed
        { status: "done", assignee: "" }, // should not count towards non-done
      ];
      // 4 non-done tasks: 2 assigned, 2 unassigned => 50%
      expect(calculateVolunteerAllocation(tasks)).toBe(50);
    });
  });

  describe("Current Schedule Delay", () => {
    it("returns 0 when there are no sessions", () => {
      expect(calculateCurrentDelay([])).toBe(0);
      expect(calculateCurrentDelay(null)).toBe(0);
    });

    it("computes delay from the active live session", () => {
      const sessions = [
        { status: "completed", startTime: "09:00", plannedStart: "09:00" },
        { status: "live", startTime: "10:15", plannedStart: "10:00" }, // 15 min delay
        { status: "upcoming", startTime: "11:00", plannedStart: "10:45" },
      ];
      expect(calculateCurrentDelay(sessions)).toBe(15);
    });

    it("computes delay from the next upcoming session if none is live", () => {
      const sessions = [
        { status: "completed", startTime: "09:00", plannedStart: "09:00", order: 1 },
        { status: "upcoming", startTime: "10:05", plannedStart: "10:00", order: 2 }, // 5 min delay
        { status: "upcoming", startTime: "11:20", plannedStart: "11:00", order: 3 },
      ];
      expect(calculateCurrentDelay(sessions)).toBe(5);
    });

    it("returns 0 if sessions are running on time or early", () => {
      const sessions = [
        { status: "live", startTime: "09:00", plannedStart: "09:00" },
      ];
      expect(calculateCurrentDelay(sessions)).toBe(0);
    });
  });

  describe("Risk Score & Level", () => {
    it("exports named constants for thresholds and points", () => {
      expect(RISK_THRESHOLDS.LOW_MAX).toBe(2);
      expect(RISK_THRESHOLDS.MEDIUM_MAX).toBe(5);
      expect(DELAY_THRESHOLDS.LOW).toBe(5);
      expect(DELAY_THRESHOLDS.HIGH).toBe(15);
      expect(RISK_POINTS.OVERDUE_TASK).toBe(2);
      expect(RISK_POINTS.UNASSIGNED_TASK).toBe(1);
    });

    it("scores Low (0-2) when tasks are on track and assigned", () => {
      const tasks = [
        { status: "todo", assignee: "Priya", dueDate: "2026-09-25T00:00:00Z" },
        { status: "in_progress", assignee: "Raj", dueDate: "2026-09-26T00:00:00Z" },
      ];
      const sessions = [
        { status: "live", startTime: "09:00", plannedStart: "09:00" },
      ];

      const result = calculateRiskScore(tasks, sessions, referenceNow);
      expect(result.score).toBe(0);
      expect(result.level).toBe("Low");
    });

    it("adds 1 point per unassigned non-done task", () => {
      const tasks = [
        { status: "todo", assignee: "", dueDate: "2026-09-25T00:00:00Z" }, // 1 pt
        { status: "in_progress", assignee: "", dueDate: "2026-09-26T00:00:00Z" }, // 1 pt
      ];
      const result = calculateRiskScore(tasks, [], referenceNow);
      expect(result.score).toBe(2);
      expect(result.level).toBe("Low"); // 0-2 is Low
    });

    it("adds 2 points per overdue non-done task", () => {
      const tasks = [
        // Overdue (due Sep 15, now Sep 19)
        { status: "todo", assignee: "Priya", dueDate: "2026-09-15T00:00:00Z" }, // 2 pts
        { status: "todo", assignee: "Arjun", dueDate: "2026-09-25T00:00:00Z" }, // 0 pt
      ];
      const result = calculateRiskScore(tasks, [], referenceNow);
      expect(result.score).toBe(2);
      expect(result.level).toBe("Low");
    });

    it("scores Medium (3-5) when accumulating moderate risk", () => {
      const tasks = [
        // 1 overdue (2 pts) + 1 unassigned (1 pt) = 3 pts
        { status: "todo", assignee: "Meera", dueDate: "2026-09-15T00:00:00Z" },
        { status: "in_progress", assignee: "", dueDate: "2026-09-25T00:00:00Z" },
      ];
      // Delay: 5 min => 1 delay pt. Total = 4 pts (Medium)
      const sessions = [
        { status: "live", startTime: "10:05", plannedStart: "10:00" },
      ];
      const result = calculateRiskScore(tasks, sessions, referenceNow);
      expect(result.score).toBe(4);
      expect(result.level).toBe("Medium");
    });

    it("scores High (6 or more) and adds delay points (2 for >=15 min)", () => {
      const tasks = [
        // 2 overdue (4 pts)
        { status: "todo", assignee: "A", dueDate: "2026-09-10T00:00:00Z" },
        { status: "todo", assignee: "B", dueDate: "2026-09-12T00:00:00Z" },
        // 1 unassigned (1 pt)
        { status: "in_progress", assignee: "", dueDate: "2026-09-25T00:00:00Z" },
      ];
      // 20 min delay >= 15 min => 2 pts delay. Total = 4 + 1 + 2 = 7 pts (High)
      const sessions = [
        { status: "live", startTime: "10:20", plannedStart: "10:00" },
      ];
      const result = calculateRiskScore(tasks, sessions, referenceNow);
      expect(result.score).toBe(7);
      expect(result.level).toBe("High");
    });
  });

  describe("Live Metric Updates on State Transitions", () => {
    it("visibly increases Task Completion and reduces Risk when task is moved to Done", () => {
      const initialTasks = [
        { id: "t1", status: "todo", assignee: "Priya", dueDate: "2026-09-10T00:00:00Z" }, // overdue non-done: 2 pts
        { id: "t2", status: "in_progress", assignee: "Arjun" },
        { id: "t3", status: "backlog", assignee: "Meera" },
        { id: "t4", status: "done", assignee: "Raj" },
      ];

      const before = calculateHealthMetrics(initialTasks, [], referenceNow);
      expect(before.taskCompletion).toBe(25); // 1 / 4
      expect(before.risk.score).toBe(2);

      // Transition: User drags t1 to Done
      const updatedTasks = initialTasks.map((t) =>
        t.id === "t1" ? { ...t, status: "done" } : t
      );

      const after = calculateHealthMetrics(updatedTasks, [], referenceNow);
      expect(after.taskCompletion).toBe(50); // 2 / 4 -> visibly increased!
      expect(after.risk.score).toBe(0); // overdue points eliminated because task is done!
    });

    it("visibly decreases Volunteer Allocation and increases Risk when unassigning a task", () => {
      const initialTasks = [
        { id: "t1", status: "todo", assignee: "Priya" },
        { id: "t2", status: "todo", assignee: "Arjun" },
      ];

      const before = calculateHealthMetrics(initialTasks, [], referenceNow);
      expect(before.volunteerAllocation).toBe(100); // 2 / 2
      expect(before.risk.score).toBe(0);

      // Transition: User unassigns t1
      const updatedTasks = initialTasks.map((t) =>
        t.id === "t1" ? { ...t, assignee: "" } : t
      );

      const after = calculateHealthMetrics(updatedTasks, [], referenceNow);
      expect(after.volunteerAllocation).toBe(50); // 1 / 2 -> visibly decreased!
      expect(after.risk.score).toBe(1); // 1 unassigned point added!
    });
  });
});
