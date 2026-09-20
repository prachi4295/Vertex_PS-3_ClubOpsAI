import { describe, it, expect, vi } from "vitest";
import { isEventDue, processAutoStartEvents, normalizeDateYMD } from "./eventScheduler";

describe("Event Auto-Start Scheduler (eventScheduler.js)", () => {
  describe("normalizeDateYMD", () => {
    it("normalizes DD-MM-YYYY and DD/MM/YYYY into YYYY-MM-DD", () => {
      expect(normalizeDateYMD("21-09-2026")).toBe("2026-09-21");
      expect(normalizeDateYMD("05/01/2025")).toBe("2025-01-05");
      expect(normalizeDateYMD("31-12-2024")).toBe("2024-12-31");
    });

    it("normalizes Date objects and ISO strings", () => {
      expect(normalizeDateYMD("2026-09-21T00:00:00.000Z")).toBe("2026-09-21");
      const d = new Date(2026, 8, 21);
      expect(normalizeDateYMD(d)).toBe("2026-09-21");
    });
  });

  describe("isEventDue", () => {
    it("returns false for events in future dates (handles DD-MM-YYYY too)", () => {
      const event1 = { date: "2026-10-15", time: "10:00" };
      const event2 = { date: "21-09-2026", time: "10:00" }; // Tomorrow
      const now = new Date(2026, 8, 20, 16, 30, 0); // Today 2026-09-20
      expect(isEventDue(event1, now)).toBe(false);
      expect(isEventDue(event2, now)).toBe(false);
    });

    it("returns false if on the same date but before the scheduled time", () => {
      // 09:30 is before 10:00
      const now = new Date(2026, 8, 20, 9, 30, 0); // local 2026-09-20 09:30
      const event = { date: "2026-09-20", time: "10:00" };
      expect(isEventDue(event, now)).toBe(false);
    });

    it("returns true if on the same date and exactly at scheduled time", () => {
      const now = new Date(2026, 8, 20, 10, 0, 0); // local 2026-09-20 10:00
      const event = { date: "2026-09-20", time: "10:00" };
      expect(isEventDue(event, now)).toBe(true);
    });

    it("returns true if on the same date and after scheduled time", () => {
      const now = new Date(2026, 8, 20, 10, 30, 0); // local 2026-09-20 10:30
      const event = { date: "2026-09-20", time: "10:00" };
      expect(isEventDue(event, now)).toBe(true);
    });

    it("returns true if event date is in the past", () => {
      const now = new Date(2026, 8, 20, 8, 0, 0);
      const event = { date: "2026-09-19", time: "18:00" };
      expect(isEventDue(event, now)).toBe(true);
    });
  });

  describe("processAutoStartEvents", () => {
    it("transitions upcoming event to active when due date & time arrives", () => {
      const now = new Date(2026, 8, 20, 9, 0, 0);
      const onEventStarted = vi.fn();

      const events = [
        {
          id: "event-1",
          name: "Robotics Expo",
          date: "2026-09-20",
          time: "09:00",
          status: "upcoming",
        },
        {
          id: "event-2",
          name: "Future Hackathon",
          date: "2026-10-01",
          time: "09:00",
          status: "upcoming",
        },
      ];

      const { updatedEvents, startedEvents, hasChanges } = processAutoStartEvents({
        events,
        currentTime: now,
        onEventStarted,
      });

      expect(hasChanges).toBe(true);
      expect(startedEvents).toHaveLength(1);
      expect(startedEvents[0].id).toBe("event-1");
      expect(startedEvents[0].status).toBe("active");
      expect(onEventStarted).toHaveBeenCalledTimes(1);

      // Event 2 is in the future, should remain upcoming
      expect(updatedEvents[1].status).toBe("upcoming");
    });

    it("auto-starts first upcoming session of the event", () => {
      const now = new Date(2026, 8, 20, 9, 0, 0);
      const onSessionStarted = vi.fn();
      let storedSessions = [
        { id: "s-1", title: "Keynote", status: "upcoming", startTime: "09:00", order: 1 },
        { id: "s-2", title: "Workshop", status: "upcoming", startTime: "10:00", order: 2 },
      ];

      const events = [
        {
          id: "event-1",
          name: "AI Hackathon",
          date: "2026-09-20",
          time: "09:00",
          status: "upcoming",
        },
      ];

      const { hasChanges } = processAutoStartEvents({
        events,
        currentTime: now,
        getSessions: (eventId) => storedSessions,
        saveSessions: (eventId, newSessions) => {
          storedSessions = newSessions;
        },
        onSessionStarted,
      });

      expect(hasChanges).toBe(true);
      expect(storedSessions[0].status).toBe("live");
      expect(storedSessions[0].actualStart).toBe(now);
      expect(storedSessions[1].status).toBe("upcoming");
      expect(onSessionStarted).toHaveBeenCalledWith(
        expect.objectContaining({ id: "event-1" }),
        expect.objectContaining({ id: "s-1" })
      );
    });

    it("does not re-trigger events that are already active or completed", () => {
      const now = new Date(2026, 8, 20, 10, 0, 0);
      const onEventStarted = vi.fn();

      const events = [
        { id: "event-1", name: "Done Event", date: "2026-09-19", status: "completed" },
        { id: "event-2", name: "Active Event", date: "2026-09-20", status: "active" },
      ];

      const { hasChanges, startedEvents } = processAutoStartEvents({
        events,
        currentTime: now,
        onEventStarted,
      });

      expect(hasChanges).toBe(false);
      expect(startedEvents).toHaveLength(0);
      expect(onEventStarted).not.toHaveBeenCalled();
    });

    it("reverts active status back to upcoming if event date is moved to future", () => {
      const now = new Date(2026, 8, 20, 16, 0, 0); // Today is 20-09-2026
      const events = [
        {
          id: "chronops-26",
          name: "ChronOps26 Operations Summit",
          date: "21-09-2026", // Tomorrow!
          time: "09:00",
          status: "active", // Incorrectly was active
        },
      ];

      const { updatedEvents, hasChanges } = processAutoStartEvents({
        events,
        currentTime: now,
      });

      expect(hasChanges).toBe(true);
      expect(updatedEvents[0].status).toBe("upcoming");
    });
  });
});
