import { describe, it, expect } from "vitest";
import { reframeTranscriptWithAI, detectMissingTranscriptDetails } from "./gemini";

describe("AI Transcript Processing & Event Confirmation", () => {
  const sampleTranscript = `
    ChronOps AI Summit 2026:
    Dr. Ananya Mukherjee is presenting the Keynote at 09:30 in Main Auditorium.
    Arjun needs to set up high-speed WiFi splitters before 09:00. High priority.
    Priya, arrange volunteer kits and speaker gift boxes by 10:00.
  `;

  it("processes transcript and extracts structured event details, sessions, and tasks", async () => {
    const result = await reframeTranscriptWithAI(sampleTranscript);

    expect(result).toBeDefined();
    expect(typeof result.suggestedName).toBe("string");
    expect(result.suggestedName.length).toBeGreaterThan(3);

    // Sessions verification
    expect(Array.isArray(result.sessions)).toBe(true);
    expect(result.sessions.length).toBeGreaterThanOrEqual(1);
    expect(result.sessions[0]).toHaveProperty("title");
    expect(result.sessions[0]).toHaveProperty("startTime");
    expect(result.sessions[0]).toHaveProperty("durationMinutes");

    // Tasks verification
    expect(Array.isArray(result.tasks)).toBe(true);
    expect(result.tasks.length).toBeGreaterThanOrEqual(2);
    expect(result.tasks[0]).toHaveProperty("title");
    expect(result.tasks[0]).toHaveProperty("priority");

    // Missing details check
    expect(Array.isArray(result.missingDetails)).toBe(true);
  }, 15000);

  it("detects missing details when transcript lacks date or location", () => {
    const briefNotes = "Team standup: Rahul needs to clean up the room.";
    const analysis = detectMissingTranscriptDetails(briefNotes, [{ title: "Clean room", assignee: "" }], []);

    expect(analysis.hasMissing).toBe(true);
    expect(analysis.missingEvent).toBe(true);
    expect(analysis.missingDate).toBe(true);
  });
});
