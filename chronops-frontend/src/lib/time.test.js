import { describe, it, expect } from "vitest";
import {
  timeToMinutes,
  minutesToTime,
  addMinutesToTime,
  diffMinutes,
  calculateDelayMinutes,
  formatTimeRange,
  formatDuration,
  formatDateDMY,
  formatTime12,
  splitTime12,
  joinTime24,
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

  describe("formatDuration", () => {
    it("formats 70m to 1hr 10 min and 80m to 1hr 20 min", () => {
      expect(formatDuration(70)).toBe("1hr 10 min");
      expect(formatDuration(80)).toBe("1hr 20 min");
    });

    it("formats exact hours correctly", () => {
      expect(formatDuration(60)).toBe("1hr");
      expect(formatDuration(120)).toBe("2hr");
    });

    it("formats minutes under 1 hour correctly", () => {
      expect(formatDuration(30)).toBe("30 min");
      expect(formatDuration(45)).toBe("45 min");
      expect(formatDuration(5)).toBe("5 min");
    });

    it("handles invalid or zero minutes gracefully", () => {
      expect(formatDuration(0)).toBe("0 min");
      expect(formatDuration(null)).toBe("0 min");
      expect(formatDuration(undefined)).toBe("0 min");
    });
  });

  describe("formatTime12, splitTime12, joinTime24 (12h AM/PM)", () => {
    it("formatTime12 formats 24h strings into 12-hour AM/PM", () => {
      expect(formatTime12("11:30")).toBe("11:30 AM");
      expect(formatTime12("14:45")).toBe("02:45 PM");
      expect(formatTime12("00:15")).toBe("12:15 AM");
      expect(formatTime12("12:00")).toBe("12:00 PM");
      expect(formatTime12("23:59")).toBe("11:59 PM");
      expect(formatTime12("09:05")).toBe("09:05 AM");
      expect(formatTime12("11:30 AM")).toBe("11:30 AM");
      expect(formatTime12("")).toBe("");
      expect(formatTime12(null)).toBe("");
    });

    it("splitTime12 correctly breaks down 24h and 12h strings", () => {
      expect(splitTime12("14:30")).toEqual({ hour12: "02", minute: "30", period: "PM" });
      expect(splitTime12("09:15")).toEqual({ hour12: "09", minute: "15", period: "AM" });
      expect(splitTime12("00:00")).toEqual({ hour12: "12", minute: "00", period: "AM" });
      expect(splitTime12("12:00")).toEqual({ hour12: "12", minute: "00", period: "PM" });
      expect(splitTime12("11:45 PM")).toEqual({ hour12: "11", minute: "45", period: "PM" });
      expect(splitTime12("07:20 AM")).toEqual({ hour12: "07", minute: "20", period: "AM" });
      expect(splitTime12("")).toEqual({ hour12: "09", minute: "00", period: "AM" });
    });

    it("joinTime24 accurately generates 24h strings", () => {
      expect(joinTime24("11", "30", "AM")).toBe("11:30");
      expect(joinTime24("02", "30", "PM")).toBe("14:30");
      expect(joinTime24("12", "00", "AM")).toBe("00:00");
      expect(joinTime24("12", "00", "PM")).toBe("12:00");
      expect(joinTime24("11", "59", "PM")).toBe("23:59");
      expect(joinTime24("1", "5", "AM")).toBe("01:05");
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

  describe("formatDateDMY", () => {
    it("formats YYYY-MM-DD to DD-MM-YYYY", () => {
      expect(formatDateDMY("2026-09-20")).toBe("20-09-2026");
      expect(formatDateDMY("2025-01-05")).toBe("05-01-2025");
      expect(formatDateDMY("2024-12-31")).toBe("31-12-2024");
    });

    it("handles ISO timestamps", () => {
      expect(formatDateDMY("2026-09-20T14:30:00.000Z")).toBe("20-09-2026");
    });

    it("handles Date objects", () => {
      const d = new Date("2026-09-20T00:00:00.000Z");
      expect(formatDateDMY(d)).toBe("20-09-2026");
    });

    it("returns original or empty for non-standard or missing inputs", () => {
      expect(formatDateDMY("")).toBe("");
      expect(formatDateDMY(null)).toBe("");
      expect(formatDateDMY(undefined)).toBe("");
      expect(formatDateDMY("20-09-2026")).toBe("20-09-2026");
    });
  });
});
