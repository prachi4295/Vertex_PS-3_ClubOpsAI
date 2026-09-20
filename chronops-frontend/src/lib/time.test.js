import { describe, it, expect } from "vitest";
import {
  timeToMinutes,
  minutesToTime,
  addMinutesToTime,
  diffMinutes,
  calculateDelayMinutes,
  formatTimeRange,
  detectTimingClashes,
  resolveTimingClashes,
} from "./time";

describe("Time Utility Module (time.js)", () => {
  describe("timeToMinutes", () => {
    it("converts HH:mm to minutes from midnight", () => {
      expect(timeToMinutes("00:00")).toBe(0);
      expect(timeToMinutes("01:30")).toBe(90);
      expect(timeToMinutes("09:00")).toBe(540);
      expect(timeToMinutes("18:45")).toBe(1125);
    });

    it("handles invalid or empty time strings", () => {
      expect(timeToMinutes("")).toBe(0);
      expect(timeToMinutes(null)).toBe(0);
      expect(timeToMinutes("invalid")).toBe(0);
    });
  });

  describe("minutesToTime", () => {
    it("converts minutes from midnight to HH:mm string", () => {
      expect(minutesToTime(0)).toBe("00:00");
      expect(minutesToTime(90)).toBe("01:30");
      expect(minutesToTime(540)).toBe("09:00");
      expect(minutesToTime(1125)).toBe("18:45");
    });

    it("handles non-number or NaN gracefully", () => {
      expect(minutesToTime(NaN)).toBe("00:00");
      expect(minutesToTime(null)).toBe("00:00");
    });
  });

  describe("addMinutesToTime", () => {
    it("adds minutes and returns correct HH:mm string", () => {
      expect(addMinutesToTime("09:00", 30)).toBe("09:30");
      expect(addMinutesToTime("09:45", 25)).toBe("10:10");
    });
  });

  describe("diffMinutes", () => {
    it("calculates time differences accurately", () => {
      expect(diffMinutes("10:00", "09:30")).toBe(30);
      expect(diffMinutes("09:00", "09:30")).toBe(-30);
    });
  });

  describe("calculateDelayMinutes", () => {
    it("returns positive overrun delay", () => {
      expect(calculateDelayMinutes("09:45", "09:30")).toBe(15);
    });

    it("returns 0 if on time or early", () => {
      expect(calculateDelayMinutes("09:30", "09:30")).toBe(0);
      expect(calculateDelayMinutes("09:20", "09:30")).toBe(0);
    });
  });

  describe("formatTimeRange", () => {
    it("formats start and end times nicely", () => {
      expect(formatTimeRange("09:00", 45)).toBe("09:00 - 09:45");
    });
  });

  describe("detectTimingClashes & resolveTimingClashes", () => {
    const sampleSessions = [
      {
        id: "sess-1",
        title: "Coffee Break & Team Mentor Matchmaking",
        startTime: "11:10",
        durationMinutes: 55, // ends at 12:05
        status: "live",
      },
      {
        id: "sess-2",
        title: "Fireside Chat: From Hackathon to YC Series A",
        startTime: "11:35",
        durationMinutes: 55, // clashes by 30 mins!
        status: "upcoming",
      },
      {
        id: "sess-3",
        title: "Lunch & Networking",
        startTime: "12:35",
        durationMinutes: 60,
        status: "upcoming",
      },
    ];

    it("detects timing clash when session extends past next session start", () => {
      const clashes = detectTimingClashes(sampleSessions);
      expect(clashes).toHaveLength(1);
      expect(clashes[0].currentId).toBe("sess-1");
      expect(clashes[0].nextId).toBe("sess-2");
      expect(clashes[0].overlapMinutes).toBe(30);
      expect(clashes[0].currentEndTime).toBe("12:05");
      expect(clashes[0].nextStartTime).toBe("11:35");
    });

    it("resolves timing clashes by cascading start times forward", () => {
      const resolved = resolveTimingClashes(sampleSessions);
      expect(resolved).toHaveLength(3);
      expect(resolved[0].startTime).toBe("11:10"); // stays 11:10
      expect(resolved[1].startTime).toBe("12:05"); // shifted to 12:05
      // sess-2 ends at 12:05 + 55 = 13:00, so sess-3 (was 12:35) shifts to 13:00
      expect(resolved[2].startTime).toBe("13:00");

      // Verify no clashes remain
      const remainingClashes = detectTimingClashes(resolved);
      expect(remainingClashes).toHaveLength(0);
    });
  });
});
