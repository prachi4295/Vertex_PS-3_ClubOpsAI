import { describe, it, expect, beforeEach } from "vitest";
import {
  getActiveUserEmail,
  getScopedKey,
  getStoredEvents,
  saveStoredEvents,
  getActiveEventId,
  saveActiveEventId,
  getStoredTasks,
  saveStoredTasks,
  removeStoredTasks,
  getStoredSessions,
  saveStoredSessions,
  removeStoredSessions,
} from "./storage";

function createMockStorage() {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, val) => {
      store[key] = String(val);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
}

globalThis.localStorage = createMockStorage();
globalThis.sessionStorage = createMockStorage();

describe("Multi-User Storage Isolation", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("generates distinct scoped storage keys per email", () => {
    const keyUser1 = getScopedKey("clubops_all_events_list", "alice@college.edu");
    const keyUser2 = getScopedKey("clubops_all_events_list", "bob@college.edu");
    expect(keyUser1).not.toBe(keyUser2);
    expect(keyUser1).toContain("alice_college_edu");
    expect(keyUser2).toContain("bob_college_edu");
  });

  it("isolates events list between different user logins", () => {
    // 1. Alice logs in
    sessionStorage.setItem("clubops_session_auth", JSON.stringify({ email: "alice@college.edu" }));
    expect(getActiveUserEmail()).toBe("alice@college.edu");

    const aliceEvents = [
      { id: "alice-hackathon", name: "Alice Hackathon 2026", category: "Hackathon" },
    ];
    saveStoredEvents(aliceEvents);
    saveActiveEventId("alice-hackathon");

    expect(getStoredEvents()).toEqual(aliceEvents);
    expect(getActiveEventId()).toBe("alice-hackathon");

    // 2. Bob logs in
    sessionStorage.setItem("clubops_session_auth", JSON.stringify({ email: "bob@college.edu" }));
    expect(getActiveUserEmail()).toBe("bob@college.edu");

    // Bob should NOT see Alice's events or active event
    expect(getStoredEvents()).toEqual([]);
    expect(getActiveEventId()).toBe("");

    // Bob creates his own event
    const bobEvents = [
      { id: "bob-summit", name: "Bob AI Summit 2026", category: "Summit" },
    ];
    saveStoredEvents(bobEvents);
    saveActiveEventId("bob-summit");

    expect(getStoredEvents()).toEqual(bobEvents);
    expect(getActiveEventId()).toBe("bob-summit");

    // 3. Switch back to Alice
    sessionStorage.setItem("clubops_session_auth", JSON.stringify({ email: "alice@college.edu" }));
    expect(getActiveUserEmail()).toBe("alice@college.edu");

    // Alice's events are untouched and preserved
    expect(getStoredEvents()).toEqual(aliceEvents);
    expect(getActiveEventId()).toBe("alice-hackathon");
  });

  it("isolates tasks and sessions between different users", () => {
    // Alice creates tasks and sessions for an event
    sessionStorage.setItem("clubops_session_auth", JSON.stringify({ email: "alice@college.edu" }));
    const eventId = "shared-event-id-sample";

    const aliceTasks = [
      { id: "t1", title: "Alice Setup Stage", status: "todo" },
    ];
    const aliceSessions = [
      { id: "s1", title: "Alice Opening Keynote", startTime: "10:00" },
    ];

    saveStoredTasks(eventId, aliceTasks);
    saveStoredSessions(eventId, aliceSessions);

    expect(getStoredTasks(eventId)).toHaveLength(1);
    expect(getStoredTasks(eventId)[0].title).toBe("Alice Setup Stage");
    expect(getStoredSessions(eventId)).toHaveLength(1);
    expect(getStoredSessions(eventId)[0].title).toBe("Alice Opening Keynote");

    // Bob switches in
    sessionStorage.setItem("clubops_session_auth", JSON.stringify({ email: "bob@college.edu" }));

    // Bob has zero tasks and zero sessions
    expect(getStoredTasks(eventId)).toHaveLength(0);
    expect(getStoredSessions(eventId)).toHaveLength(0);

    // Bob saves his own
    const bobTasks = [
      { id: "t2", title: "Bob Registration Desk", status: "in_progress" },
    ];
    saveStoredTasks(eventId, bobTasks);
    expect(getStoredTasks(eventId)).toHaveLength(1);
    expect(getStoredTasks(eventId)[0].title).toBe("Bob Registration Desk");

    // Alice logs back in
    sessionStorage.setItem("clubops_session_auth", JSON.stringify({ email: "alice@college.edu" }));
    expect(getStoredTasks(eventId)[0].title).toBe("Alice Setup Stage");
    expect(getStoredSessions(eventId)[0].title).toBe("Alice Opening Keynote");

    // Deleting Alice's tasks does not impact Bob's
    removeStoredTasks(eventId);
    expect(getStoredTasks(eventId)).toHaveLength(0);

    sessionStorage.setItem("clubops_session_auth", JSON.stringify({ email: "bob@college.edu" }));
    expect(getStoredTasks(eventId)).toHaveLength(1);
    expect(getStoredTasks(eventId)[0].title).toBe("Bob Registration Desk");
  });
});

