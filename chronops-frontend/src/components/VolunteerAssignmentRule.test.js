import { describe, it, expect } from "vitest";
import { findLeastLoadedCandidate } from "./VolunteerManagement";

describe("Volunteer Assignment Rule: Priority to Available over Active", () => {
  const volunteers = [
    {
      id: "vol-1",
      name: "Rahul",
      status: "Active",
      skills: "AV Support, Stage",
    },
    {
      id: "vol-2",
      name: "Priya",
      status: "Available",
      skills: "Registration, Welcome",
    },
    {
      id: "vol-3",
      name: "Amit",
      status: "Off Duty",
      skills: "AV Support",
    },
  ];

  it("never assigns an Active person if an Available person is available (even if Active has 0 tasks and matching skills)", () => {
    const task = { title: "Set up AV microphones", description: "Stage equipment" };
    // Rahul (Active) has 0 tasks and matching AV skills
    // Priya (Available) has 2 tasks
    const taskCounts = { rahul: 0, priya: 2, amit: 0 };

    const selected = findLeastLoadedCandidate(task, volunteers, taskCounts);

    expect(selected).not.toBeNull();
    expect(selected.name).toBe("Priya");
    expect(selected.status).toBe("Available");
  });

  it("assigns an Active person ONLY when no Available person is available", () => {
    const activeOnly = [
      { id: "vol-1", name: "Rahul", status: "Active" },
      { id: "vol-4", name: "Sara", status: "Active" },
      { id: "vol-3", name: "Amit", status: "Off Duty" },
    ];
    const task = { title: "Check attendee badges" };
    const taskCounts = { rahul: 3, sara: 1, amit: 0 };

    const selected = findLeastLoadedCandidate(task, activeOnly, taskCounts);

    expect(selected).not.toBeNull();
    expect(selected.name).toBe("Sara"); // Active, but least loaded among active
  });

  it("never assigns an Off Duty volunteer", () => {
    const offDutyOnly = [
      { id: "vol-3", name: "Amit", status: "Off Duty" },
    ];
    const task = { title: "Clean up stage" };
    const taskCounts = { amit: 0 };

    const selected = findLeastLoadedCandidate(task, offDutyOnly, taskCounts);

    expect(selected).toBeNull();
  });

  it("picks the Available volunteer with least tasks among multiple Available volunteers", () => {
    const pool = [
      { id: "vol-1", name: "Rahul", status: "Active" },
      { id: "vol-2", name: "Priya", status: "Available" },
      { id: "vol-5", name: "Ananya", status: "Available" },
    ];
    const task = { title: "Hand out water bottles" };
    const taskCounts = { rahul: 0, priya: 3, ananya: 1 };

    const selected = findLeastLoadedCandidate(task, pool, taskCounts);

    expect(selected).not.toBeNull();
    expect(selected.name).toBe("Ananya");
    expect(selected.status).toBe("Available");
  });
});

describe("Volunteer Multi-Deletion and Selection Logic", () => {
  const initialRoster = [
    { id: "vol-1", name: "Rahul", status: "Active" },
    { id: "vol-2", name: "Priya", status: "Available" },
    { id: "vol-3", name: "Amit", status: "Off Duty" },
    { id: "vol-4", name: "Sara", status: "Active" },
  ];

  it("filters out multiple selected volunteer IDs correctly", () => {
    const selectedIds = new Set(["vol-1", "vol-3"]);
    const updated = initialRoster.filter((v) => !selectedIds.has(v.id));

    expect(updated).toHaveLength(2);
    expect(updated.map((v) => v.id)).toEqual(["vol-2", "vol-4"]);
  });

  it("handles selecting all filtered volunteers and clearing selection", () => {
    const selectedIds = new Set();
    const filtered = initialRoster.filter((v) => v.status === "Active"); // Rahul, Sara
    
    // Select all filtered
    filtered.forEach((v) => selectedIds.add(v.id));
    expect(selectedIds.size).toBe(2);
    expect(selectedIds.has("vol-1")).toBe(true);
    expect(selectedIds.has("vol-4")).toBe(true);

    // Delete selected
    const remaining = initialRoster.filter((v) => !selectedIds.has(v.id));
    expect(remaining).toHaveLength(2);
    expect(remaining.map((v) => v.name)).toEqual(["Priya", "Amit"]);
  });
});
