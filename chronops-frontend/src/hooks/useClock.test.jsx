import { describe, it, expect } from "vitest";
import { formatClockTime, formatCountdown } from "./useClock";

describe("useClock & Countdown Calculations", () => {
  it("formats clock times as HH:mm:ss", () => {
    const d = new Date("2026-09-19T09:35:05");
    expect(formatClockTime(d)).toBe("09:35:05");
  });

  it("formats positive remaining time as MM:SS", () => {
    expect(formatCountdown(300)).toBe("05:00");
    expect(formatCountdown(75)).toBe("01:15");
    expect(formatCountdown(9)).toBe("00:09");
    expect(formatCountdown(0)).toBe("00:00");
  });

  it("formats long positive remaining time as HH:MM:SS", () => {
    expect(formatCountdown(3665)).toBe("01:01:05");
  });

  it("formats overrun correctly as absolute elapsed seconds", () => {
    const overrunSec = -145; // 2 min 25 sec overrun
    expect(formatCountdown(overrunSec)).toBe("02:25");
  });

  it("computes speed progression correctly (1x, 30x, 60x)", () => {
    const baseSimulatedMs = 100000;
    const realElapsedMs = 1000; // 1 real second

    // At 1x: 1 real second = 1000 simulated ms (1 sec)
    expect(baseSimulatedMs + realElapsedMs * 1).toBe(101000);

    // At 30x: 1 real second = 30,000 simulated ms (30 sec)
    expect(baseSimulatedMs + realElapsedMs * 30).toBe(130000);

    // At 60x: 1 real second = 60,000 simulated ms (1 minute)
    expect(baseSimulatedMs + realElapsedMs * 60).toBe(160000);
  });

  it("correctly identifies when countdown flips to overrun past zero", () => {
    const durationMinutes = 45;
    const totalAllowedSeconds = durationMinutes * 60; // 2700s

    // Case 1: 30 minutes in -> 15 min remaining (normal)
    const elapsed1 = 30 * 60;
    const remaining1 = totalAllowedSeconds - elapsed1;
    expect(remaining1 > 0).toBe(true);
    expect(remaining1).toBe(900);
    expect(formatCountdown(remaining1)).toBe("15:00");

    // Case 2: Exactly 45 minutes in -> 0s remaining
    const elapsed2 = 45 * 60;
    const remaining2 = totalAllowedSeconds - elapsed2;
    expect(remaining2).toBe(0);
    expect(formatCountdown(remaining2)).toBe("00:00");

    // Case 3: 47 minutes in -> 2 minutes overrun (overrun state)
    const elapsed3 = 47 * 60;
    const remaining3 = totalAllowedSeconds - elapsed3;
    const isOverrun = remaining3 < 0;
    expect(isOverrun).toBe(true);
    expect(remaining3).toBe(-120);
    expect(`+${formatCountdown(remaining3)}`).toBe("+02:00");
  });
});
