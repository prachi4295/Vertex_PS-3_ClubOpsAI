import { describe, it, expect } from "vitest";
import { splitTime12, joinTime24, formatTime12 } from "../../lib/time";

describe("TimeInput12 Logic & Time Formats", () => {
  it("converts 24h '13:30' into 12-hour values: 01, 30, PM", () => {
    const parsed = splitTime12("13:30");
    expect(parsed.hour12).toBe("01");
    expect(parsed.minute).toBe("30");
    expect(parsed.period).toBe("PM");
  });

  it("updates hour while preserving minute and PM period", () => {
    // Changing from 01:30 PM to 05:30 PM
    const next24 = joinTime24("05", "30", "PM");
    expect(next24).toBe("17:30");
    expect(formatTime12(next24)).toBe("05:30 PM");
  });

  it("updates minute while preserving hour and AM period", () => {
    // Changing from 09:00 AM to 09:45 AM
    const next24 = joinTime24("09", "45", "AM");
    expect(next24).toBe("09:45");
    expect(formatTime12(next24)).toBe("09:45 AM");
  });

  it("toggles period from AM to PM", () => {
    // Changing 09:00 AM to 09:00 PM
    const next24 = joinTime24("09", "00", "PM");
    expect(next24).toBe("21:00");
    expect(formatTime12(next24)).toBe("09:00 PM");
  });

  it("handles boundary midnight and noon transitions correctly", () => {
    expect(joinTime24("12", "00", "AM")).toBe("00:00");
    expect(joinTime24("12", "00", "PM")).toBe("12:00");
    expect(splitTime12("00:00")).toEqual({ hour12: "12", minute: "00", period: "AM" });
    expect(splitTime12("12:00")).toEqual({ hour12: "12", minute: "00", period: "PM" });
  });
});
