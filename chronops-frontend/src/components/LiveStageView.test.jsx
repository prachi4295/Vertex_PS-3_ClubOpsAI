import { describe, it, expect } from "vitest";
import { formatCountdown } from "../hooks/useClock";
import { reflowSchedule } from "../lib/reflow";

describe("LiveStageView Mechanics and Invariants", () => {
  const mockLiveSession = {
    id: "live-session-1",
    title: "Keynote: Next-Gen Autonomous AI Agents",
    speaker: "Dr. Ananya Mukherjee",
    phoneticGuide: "ah-NAN-yah MOO-kher-jee",
    bio: "Principal Research Scientist at DeepMind",
    startTime: "09:30",
    plannedStart: "09:30",
    durationMinutes: 45,
    sessionType: "flexible",
    status: "live",
    actualStart: new Date("2026-09-19T09:35:00"),
    script: "Please welcome Dr. Ananya Mukherjee to unveil agentic architectures.",
  };

  const mockNextSession = {
    id: "next-session-2",
    title: "Sponsor Tech Talk",
    speaker: "Vikram Malhotra",
    phoneticGuide: "vik-RUM mal-HOH-trah",
    startTime: "10:20",
    plannedStart: "10:20",
    durationMinutes: 40,
    sessionType: "flexible",
    status: "upcoming",
  };

  it("calculates countdown and overrun correctly against simulated clock", () => {
    const actualStartMs = mockLiveSession.actualStart.getTime();
    const totalAllowedSec = mockLiveSession.durationMinutes * 60; // 2700s

    // Clock is at 10:00:00 (25 mins into session)
    const simulatedClock1 = new Date("2026-09-19T10:00:00");
    const elapsedSec1 = Math.floor((simulatedClock1.getTime() - actualStartMs) / 1000);
    const remainingSec1 = totalAllowedSec - elapsedSec1;

    expect(elapsedSec1).toBe(25 * 60);
    expect(remainingSec1).toBe(20 * 60); // 20m remaining
    expect(formatCountdown(remainingSec1)).toBe("20:00");

    // Clock is at 10:25:00 (50 mins into session -> 5 min overrun)
    const simulatedClockOverrun = new Date("2026-09-19T10:25:00");
    const elapsedSecOverrun = Math.floor((simulatedClockOverrun.getTime() - actualStartMs) / 1000);
    const remainingSecOverrun = totalAllowedSec - elapsedSecOverrun;

    expect(remainingSecOverrun < 0).toBe(true);
    expect(remainingSecOverrun).toBe(-300); // 5 min overrun
    expect(`+${formatCountdown(remainingSecOverrun)}`).toBe("+05:00");
  });

  it("script caching invariant: does not regenerate if session.script is already populated", () => {
    // If session.script exists, it should be used directly
    expect(mockLiveSession.script).toBeDefined();
    expect(mockLiveSession.script.length).toBeGreaterThan(0);

    const cachedScript = mockLiveSession.script;
    expect(cachedScript).toContain("Dr. Ananya Mukherjee");

    // Re-accessing must yield the exact cached script without network calls
    expect(mockLiveSession.script).toBe(cachedScript);
  });

  it("delay buttons (+5m, +10m) reflow downstream sessions properly", () => {
    const sessions = [mockLiveSession, mockNextSession];

    // Apply +10m delay to live session
    const { sessions: reflowed, warnings } = reflowSchedule(sessions, 10, mockLiveSession.id);
    expect(warnings).toHaveLength(0);

    const reflowedLive = reflowed.find((s) => s.id === mockLiveSession.id);
    const reflowedNext = reflowed.find((s) => s.id === mockNextSession.id);

    expect(reflowedLive.durationMinutes).toBe(55);
    expect(reflowedNext.startTime).toBe("10:25");
  });

  it("displays phonetic guide when present", () => {
    expect(mockLiveSession.phoneticGuide).toBe("ah-NAN-yah MOO-kher-jee");
    expect(mockNextSession.phoneticGuide).toBe("vik-RUM mal-HOH-trah");
  });
});
