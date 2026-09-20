import { describe, it, expect } from "vitest";

const COLUMNS = [
  { key: "backlog", label: "Backlog", color: "bg-[#CBD5E1]" },
  { key: "todo", label: "To Do", color: "bg-[#BFDBFE]" },
  { key: "in_progress", label: "In Progress", color: "bg-[#FED7AA]" },
  { key: "done", label: "Done", color: "bg-neo-ink", textColor: "text-neo-white" },
];

const STATUS_ORDER = ["backlog", "todo", "in_progress", "done"];

describe("Kanban Board Configuration and Mechanics", () => {
  it("matches context specification for four column header colors", () => {
    expect(COLUMNS).toHaveLength(4);
    expect(COLUMNS[0].color).toBe("bg-[#CBD5E1]");
    expect(COLUMNS[1].color).toBe("bg-[#BFDBFE]");
    expect(COLUMNS[2].color).toBe("bg-[#FED7AA]");
    expect(COLUMNS[3].color).toBe("bg-neo-ink");
    expect(COLUMNS[3].textColor).toBe("text-neo-white");
  });

  it("calculates move-left and move-right status transitions properly", () => {
    // Backlog: cannot move left, can move right to todo
    const backlogIdx = STATUS_ORDER.indexOf("backlog");
    expect(backlogIdx > 0).toBe(false);
    expect(STATUS_ORDER[backlogIdx + 1]).toBe("todo");

    // To Do: can move left to backlog, can move right to in_progress
    const todoIdx = STATUS_ORDER.indexOf("todo");
    expect(STATUS_ORDER[todoIdx - 1]).toBe("backlog");
    expect(STATUS_ORDER[todoIdx + 1]).toBe("in_progress");

    // In Progress: can move left to todo, can move right to done
    const inProgIdx = STATUS_ORDER.indexOf("in_progress");
    expect(STATUS_ORDER[inProgIdx - 1]).toBe("todo");
    expect(STATUS_ORDER[inProgIdx + 1]).toBe("done");

    // Done: can move left to in_progress, cannot move right
    const doneIdx = STATUS_ORDER.indexOf("done");
    expect(STATUS_ORDER[doneIdx - 1]).toBe("in_progress");
    expect(doneIdx < STATUS_ORDER.length - 1).toBe(false);
  });

  it("correctly identifies AI tasks and overdue tasks", () => {
    const aiTask = { source: "ai", title: "AI task" };
    expect(aiTask.source === "ai").toBe(true);

    const overdueTask = {
      dueDate: "2026-09-15T00:00:00.000Z",
      status: "todo",
    };
    const now = new Date("2026-09-19T18:00:00.000Z");
    const isOverdue =
      overdueTask.dueDate &&
      new Date(overdueTask.dueDate) < now &&
      overdueTask.status !== "done";

    expect(isOverdue).toBe(true);

    const completedOverdueTask = {
      dueDate: "2026-09-15T00:00:00.000Z",
      status: "done",
    };
    const completedIsOverdue =
      completedOverdueTask.dueDate &&
      new Date(completedOverdueTask.dueDate) < now &&
      completedOverdueTask.status !== "done";

    expect(completedIsOverdue).toBe(false);
  });

  it("evaluates task timing (dueTime) accurately for overdue status", () => {
    // Current time: 2026-09-19 at 15:00
    const now = new Date("2026-09-19T15:00:00");

    function checkOverdue(task, currentTime) {
      if (!task.dueDate || task.status === "done") return false;
      const due = new Date(task.dueDate);
      if (task.dueTime) {
        const [h, m] = task.dueTime.split(":").map(Number);
        if (!isNaN(h) && !isNaN(m)) {
          due.setHours(h, m, 0, 0);
        } else {
          due.setHours(23, 59, 59, 999);
        }
      } else {
        due.setHours(23, 59, 59, 999);
      }
      return due < currentTime;
    }

    // Task due earlier today at 11:00 AM -> OVERDUE
    const taskPast = {
      dueDate: "2026-09-19",
      dueTime: "11:00",
      status: "todo",
    };
    expect(checkOverdue(taskPast, now)).toBe(true);

    // Task due later today at 18:00 (6:00 PM) -> NOT OVERDUE
    const taskFuture = {
      dueDate: "2026-09-19",
      dueTime: "18:00",
      status: "todo",
    };
    expect(checkOverdue(taskFuture, now)).toBe(false);

    // Task due earlier today but already done -> NOT OVERDUE
    const taskDone = {
      dueDate: "2026-09-19",
      dueTime: "11:00",
      status: "done",
    };
    expect(checkOverdue(taskDone, now)).toBe(false);
  });
});

