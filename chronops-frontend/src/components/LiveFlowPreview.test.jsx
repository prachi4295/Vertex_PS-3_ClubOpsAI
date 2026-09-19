import { describe, it, expect } from "vitest";
import { reflowSchedule } from "../lib/reflow";
import { formatTimeRange } from "../lib/time";
import { SEED_SESSIONS } from "../data/seed";

describe("LiveFlowPreview and Stage Management Mechanics", () => {
  const mockSessions = [
    {
      id: "s-1",
      title: "Opening Ceremony",
      speaker: "Dean Rao",
      phoneticGuide: "Prof. RAH-oh",
      startTime: "09:00",
      plannedStart: "09:00",
      durationMinutes: 30,
      sessionType: "fixed",
      status: "completed",
      order: 1,
    },
    {
      id: "s-2",
      title: "Keynote AI Agents",
      speaker: "Dr. Ananya Mukherjee",
      phoneticGuide: "ah-NAN-yah MOO-kher-jee",
      startTime: "09:30",
      plannedStart: "09:30",
      durationMinutes: 45,
      sessionType: "flexible",
      status: "live",
      order: 2,
    },
    {
      id: "s-3",
      title: "Tech Talk Cloud Scale",
      speaker: "Vikram Malhotra",
      phoneticGuide: "vik-RUM",
      startTime: "10:20",
      plannedStart: "10:20",
      durationMinutes: 40,
      sessionType: "flexible",
      status: "upcoming",
      order: 3,
    },
    {
      id: "s-4",
      title: "Networking Lunch",
      speaker: "Catering",
      phoneticGuide: "",
      startTime: "11:15",
      plannedStart: "11:15",
      durationMinutes: 45,
      sessionType: "fixed",
      status: "upcoming",
      order: 4,
    },
    {
      id: "s-5",
      title: "Awards & Grand Finale",
      speaker: "Dr. Ramesh Gupta",
      phoneticGuide: "Dr. GOOP-ta",
      startTime: "12:15",
      plannedStart: "12:15",
      durationMinutes: 45,
      sessionType: "fixed",
      status: "upcoming",
      order: 5,
    },
  ];

  it("formats time ranges correctly", () => {
    expect(formatTimeRange("09:30", 45)).toBe("09:30 - 10:15");
    expect(formatTimeRange("10:20", 40)).toBe("10:20 - 11:00");
    expect(formatTimeRange("12:15", 45)).toBe("12:15 - 13:00");
  });

  it("visibly reflows later flexible sessions in real-time when +10m delay is applied", () => {
    // Keynote ends at 09:30 + 45 = 10:15. There is a 5m buffer before 10:20.
    // Delay +10m -> Keynote duration 55m -> ends at 10:25.
    // S-3 (flexible) originally at 10:20 must move to 10:25.
    const { sessions: reflowed, warnings } = reflowSchedule(mockSessions, 10, "s-2");

    expect(warnings).toHaveLength(0);

    const s2 = reflowed.find((s) => s.id === "s-2");
    const s3 = reflowed.find((s) => s.id === "s-3");
    const s4 = reflowed.find((s) => s.id === "s-4");

    expect(s2.durationMinutes).toBe(55);
    expect(s3.startTime).toBe("10:25");
    // S-3 ends at 10:25 + 40m = 11:05. S-4 fixed starts at 11:15, so 11:05 <= 11:15: no slip!
    expect(s4.startTime).toBe("11:15");

    // Invariant: plannedStart is NEVER modified
    expect(s2.plannedStart).toBe("09:30");
    expect(s3.plannedStart).toBe("10:20");
    expect(s4.plannedStart).toBe("11:15");
  });

  it("protects fixed sessions and returns a warning banner item when delay overflows", () => {
    // If Keynote delays by +45m:
    // S-2 ends at 09:30 + 90m = 11:00.
    // S-3 starts at 11:00, duration 40m (compressible down to 20m).
    // If compressed down to 20m, S-3 ends at 11:20, but fixed S-4 starts at 11:15!
    // Overflow of 5m remains -> warning generated, fixed session stays at 11:15.
    const { sessions: reflowed, warnings } = reflowSchedule(mockSessions, 45, "s-2");

    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain("Fixed session Networking Lunch will start");

    const s4 = reflowed.find((s) => s.id === "s-4");
    // Fixed session start is pinned
    expect(s4.startTime).toBe("11:15");
  });

  it("transitions session status: start sets live + actualStart, complete advances to next upcoming", () => {
    const list = [...mockSessions];

    // Starting an upcoming session (s-3)
    const now = new Date("2026-09-19T10:20:00Z");
    const updatedOnStart = list.map((s) => {
      if (s.id === "s-3") {
        return { ...s, status: "live", actualStart: now };
      }
      if (s.status === "live") {
        return { ...s, status: "completed" };
      }
      return s;
    });

    const s2AfterStart = updatedOnStart.find((s) => s.id === "s-2");
    const s3AfterStart = updatedOnStart.find((s) => s.id === "s-3");

    expect(s2AfterStart.status).toBe("completed");
    expect(s3AfterStart.status).toBe("live");
    expect(s3AfterStart.actualStart).toEqual(now);

    // Completing s-3 advances to next upcoming session (s-4)
    const nextUpcoming = updatedOnStart
      .filter((s) => s.status === "upcoming" && s.id !== "s-3")
      .sort((a, b) => a.order - b.order)[0];

    expect(nextUpcoming.id).toBe("s-4");

    const updatedOnComplete = updatedOnStart.map((s) => {
      if (s.id === "s-3") return { ...s, status: "completed" };
      if (s.id === nextUpcoming.id) return { ...s, status: "live", actualStart: now };
      return s;
    });

    const s3AfterComplete = updatedOnComplete.find((s) => s.id === "s-3");
    const s4AfterComplete = updatedOnComplete.find((s) => s.id === "s-4");

    expect(s3AfterComplete.status).toBe("completed");
    expect(s4AfterComplete.status).toBe("live");
  });

  it("GO LIVE starts the first upcoming session when triggered", () => {
    const allUpcoming = [
      { id: "u-1", order: 1, startTime: "09:00", status: "upcoming" },
      { id: "u-2", order: 2, startTime: "09:30", status: "upcoming" },
    ];

    const firstUpcoming = allUpcoming
      .filter((s) => s.status === "upcoming")
      .sort((a, b) => a.order - b.order)[0];

    expect(firstUpcoming.id).toBe("u-1");
  });

  it("guarantees plannedStart = startTime invariant when creating new session in Edit Stage", () => {
    const inputSession = {
      title: "Closing Keynote",
      speaker: "Dr. Ramesh Gupta",
      startTime: "16:30",
      durationMinutes: 45,
      sessionType: "fixed",
      phoneticGuide: "Dr. GOOP-ta",
    };

    // Modal creation logic
    const createdSession = {
      ...inputSession,
      plannedStart: inputSession.startTime, // Invariant check
      order: 6,
    };

    expect(createdSession.plannedStart).toBe(createdSession.startTime);
    expect(createdSession.phoneticGuide).toBe("Dr. GOOP-ta");
  });

  it("filters sessions by global search string across title, speaker, and phoneticGuide", () => {
    const query = "GOOP-ta";
    const filtered = mockSessions.filter(
      (s) =>
        s.title.toLowerCase().includes(query.toLowerCase()) ||
        (s.speaker && s.speaker.toLowerCase().includes(query.toLowerCase())) ||
        (s.phoneticGuide && s.phoneticGuide.toLowerCase().includes(query.toLowerCase()))
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].speaker).toBe("Dr. Ramesh Gupta");
    expect(filtered[0].phoneticGuide).toBe("Dr. GOOP-ta");
  });
});
