import { describe, it, expect } from "vitest";
import { reflowSchedule } from "./reflow";

describe("reflowSchedule pure function (reflow.js)", () => {
  it("handles a delta of 0 with no modifications and no warnings", () => {
    const sessions = [
      {
        id: "s1",
        title: "Inauguration",
        startTime: "09:00",
        plannedStart: "09:00",
        durationMinutes: 30,
        sessionType: "fixed",
        status: "live",
      },
      {
        id: "s2",
        title: "Keynote",
        startTime: "09:30",
        plannedStart: "09:30",
        durationMinutes: 45,
        sessionType: "flexible",
        status: "upcoming",
      },
    ];

    const { sessions: result, warnings } = reflowSchedule(sessions, 0, "s1");

    expect(warnings).toEqual([]);
    expect(result[0].durationMinutes).toBe(30);
    expect(result[1].startTime).toBe("09:30");
    expect(result[0].plannedStart).toBe("09:00");
    expect(result[1].plannedStart).toBe("09:30");
  });

  it("handles no fixed session by shifting following flexible sessions", () => {
    const sessions = [
      {
        id: "s1",
        title: "Keynote",
        startTime: "09:00",
        plannedStart: "09:00",
        durationMinutes: 30,
        sessionType: "flexible",
        status: "live",
      },
      {
        id: "s2",
        title: "Workshop",
        startTime: "09:30",
        plannedStart: "09:30",
        durationMinutes: 45,
        sessionType: "flexible",
        status: "upcoming",
      },
      {
        id: "s3",
        title: "Panel",
        startTime: "10:15",
        plannedStart: "10:15",
        durationMinutes: 30,
        sessionType: "flexible",
        status: "upcoming",
      },
    ];

    // s1 overruns by 15 minutes
    const { sessions: result, warnings } = reflowSchedule(sessions, 15, "s1");

    expect(warnings).toEqual([]);
    // s1 duration is increased by 15 (30 -> 45), ends at 09:45
    expect(result[0].durationMinutes).toBe(45);
    expect(result[0].startTime).toBe("09:00");

    // s2 shifted from 09:30 to 09:45 (ends at 09:45 + 45 = 10:30)
    expect(result[1].startTime).toBe("09:45");
    expect(result[1].durationMinutes).toBe(45);

    // s3 shifted from 10:15 to 10:30 (ends at 11:00)
    expect(result[2].startTime).toBe("10:30");
    expect(result[2].durationMinutes).toBe(30);

    // Never modify plannedStart
    expect(result[0].plannedStart).toBe("09:00");
    expect(result[1].plannedStart).toBe("09:30");
    expect(result[2].plannedStart).toBe("10:15");
  });

  it("absorbs delay using existing buffers and gaps without moving subsequent sessions", () => {
    const sessions = [
      {
        id: "s1",
        title: "Live Talk",
        startTime: "09:00",
        plannedStart: "09:00",
        durationMinutes: 30, // originally ends at 09:30
        sessionType: "flexible",
        status: "live",
      },
      {
        id: "s2",
        title: "Post-Break Workshop",
        startTime: "09:45", // there is a 15-min gap between 09:30 and 09:45
        plannedStart: "09:45",
        durationMinutes: 30,
        sessionType: "flexible",
        status: "upcoming",
      },
    ];

    // s1 overruns by 10 minutes (now ends at 09:40)
    const { sessions: result, warnings } = reflowSchedule(sessions, 10, "s1");

    expect(warnings).toEqual([]);
    expect(result[0].durationMinutes).toBe(40);

    // s2 should NOT move because cursor (09:40) <= 09:45
    expect(result[1].startTime).toBe("09:45");
    expect(result[1].plannedStart).toBe("09:45");
  });

  it("compresses flexible sessions before a fixed session when overflow can be absorbed", () => {
    const sessions = [
      {
        id: "s1",
        title: "Opening Live",
        startTime: "09:00",
        plannedStart: "09:00",
        durationMinutes: 30, // ends at 09:30
        sessionType: "flexible",
        status: "live",
      },
      {
        id: "s2",
        title: "Lightning Talks",
        startTime: "09:30",
        plannedStart: "09:30",
        durationMinutes: 30, // planned 30; down to max(5, 15) = 15 (can cut up to 15m)
        sessionType: "flexible",
        status: "upcoming",
      },
      {
        id: "s3",
        title: "Fixed Keynote",
        startTime: "10:10",
        plannedStart: "10:10",
        durationMinutes: 40,
        sessionType: "fixed",
        status: "upcoming",
      },
    ];

    // s1 overruns by 20 minutes (ends at 09:50)
    // Without compression, s2 (30m) would end at 10:20 (passing fixed 10:10 by 10 min)
    // s2 can compress down to 15m (up to 15m reduction). 15 >= 10, so overflow is absorbed!
    const { sessions: result, warnings } = reflowSchedule(sessions, 20, "s1");

    expect(warnings).toEqual([]);

    expect(result[0].durationMinutes).toBe(50); // 30 + 20
    expect(result[0].startTime).toBe("09:00");

    // s2 compressed by 10 min (30 -> 20 min)
    expect(result[1].durationMinutes).toBe(20);
    expect(result[1].startTime).toBe("09:50"); // 09:50 + 20 = 10:10

    // s3 fixed session stays on time at 10:10
    expect(result[2].startTime).toBe("10:10");
    expect(result[2].durationMinutes).toBe(40);

    // plannedStart is never modified
    expect(result[0].plannedStart).toBe("09:00");
    expect(result[1].plannedStart).toBe("09:30");
    expect(result[2].plannedStart).toBe("10:10");
  });

  it("handles an unabsorbable conflict by keeping fixed start and returning a warning", () => {
    const sessions = [
      {
        id: "s1",
        title: "Live Talk",
        startTime: "09:00",
        plannedStart: "09:00",
        durationMinutes: 30,
        sessionType: "flexible",
        status: "live",
      },
      {
        id: "s2",
        title: "Short Prep",
        startTime: "09:30",
        plannedStart: "09:30",
        durationMinutes: 20, // can compress down to max(5, 10) = 10 (can only cut 10m)
        sessionType: "flexible",
        status: "upcoming",
      },
      {
        id: "s3",
        title: "Lunch Break",
        startTime: "10:00",
        plannedStart: "10:00",
        durationMinutes: 60,
        sessionType: "fixed",
        status: "upcoming",
      },
    ];

    // s1 overruns by 40 minutes (ends at 10:10)
    // s2 runs 10:10 - 10:30 (overflow = 30 min)
    // s2 can only compress by 10 min (still overflows by 20 min)
    // Unabsorbable!
    const { sessions: result, warnings } = reflowSchedule(sessions, 40, "s1");

    expect(warnings.length).toBe(1);
    expect(warnings[0]).toContain("Fixed session Lunch Break will start");
    expect(warnings[0]).toContain("late");

    // Fixed session start is kept
    expect(result[2].startTime).toBe("10:00");
    expect(result[2].plannedStart).toBe("10:00");
  });

  it("never modifies plannedStart under any circumstance", () => {
    const sessions = [
      {
        id: "s1",
        title: "S1",
        startTime: "09:00",
        plannedStart: "09:00",
        durationMinutes: 30,
        sessionType: "flexible",
        status: "live",
      },
      {
        id: "s2",
        title: "S2",
        startTime: "09:30",
        plannedStart: "09:30",
        durationMinutes: 30,
        sessionType: "flexible",
        status: "upcoming",
      },
    ];

    const { sessions: result } = reflowSchedule(sessions, 25, "s1");

    expect(result[0].plannedStart).toBe("09:00");
    expect(result[1].plannedStart).toBe("09:30");
  });
});
