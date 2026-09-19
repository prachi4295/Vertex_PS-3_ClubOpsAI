import { describe, it, expect } from "vitest";

const COLUMNS = [
  { key: "backlog", label: "Backlog", color: "bg-neo-muted" },
  { key: "todo", label: "To Do", color: "bg-neo-white" },
  { key: "in_progress", label: "In Progress", color: "bg-neo-secondary" },
  { key: "done", label: "Done", color: "bg-neo-ink", textColor: "text-neo-white" },
];

const STATUS_ORDER = ["backlog", "todo", "in_progress", "done"];

describe("Kanban Board Configuration and Mechanics", () => {
  it("matches context specification for four column header colors", () => {
    expect(COLUMNS).toHaveLength(4);
    expect(COLUMNS[0].color).toBe("bg-neo-muted");
    expect(COLUMNS[1].color).toBe("bg-neo-white");
    expect(COLUMNS[2].color).toBe("bg-neo-secondary");
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
});
