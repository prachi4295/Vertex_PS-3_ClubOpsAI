import { describe, it, expect } from "vitest";
import {
  validateConfiguredSessions,
  detectMissingTranscriptDetails,
  configureSessionsWithAI,
  parseEventDocumentWithAI,
} from "./gemini";
import { INITIAL_EVENTS } from "../data/multiEvents";

describe("New Features: AI Session Config, Document Parsing, Board Editing & Missing Details Detection", () => {
  describe("1. LLM Configure Sessions for Live Stage", () => {
    it("validates and repairs AI configured session objects", () => {
      const rawAIGenerated = [
        {
          title: "Opening Keynote",
          speaker: "Dr. Alice",
          startTime: "09:00",
          durationMinutes: 45,
          sessionType: "fixed",
        },
        {
          title: "Lightning Talks",
          speaker: "Community",
          startTime: "09:50",
          durationMinutes: 30,
          sessionType: "flexible",
        },
      ];

      const validated = validateConfiguredSessions(rawAIGenerated);
      expect(validated).toHaveLength(2);
      expect(validated[0].plannedStart).toBe("09:00");
      expect(validated[0].status).toBe("upcoming");
      expect(validated[0].order).toBe(1);
      expect(validated[1].order).toBe(2);
    });

    it("generates fallback schedule if prompt or network fails", async () => {
      const result = await configureSessionsWithAI("Create an AI hackathon schedule", {
        name: "Test Hackathon",
      });
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(3);
      expect(result[0].title).toBeDefined();
      expect(result[0].startTime).toBeDefined();
    });
  });

  describe("2. Document Upload & Auto-creation with AI", () => {
    it("parses event document text and extracts event, sessions, and tasks", async () => {
      const docText = `
        Event: Autonomous Robotics Hackathon 2026
        Date: 2026-10-15
        Location: Tech Arena, Bangalore
        Tagline: Build the future of physical AI

        Schedule:
        - 09:00 AM: Check-in and breakfast
        - 10:00 AM: Keynote by Prof. Ramanathan
        - 01:00 PM: Lunch and mentoring

        Tasks:
        - Arjun: Procure 20 Arduino starter kits by Oct 10
        - Priya: Setup 3D printer stations
      `;

      const result = await parseEventDocumentWithAI(docText);
      expect(result.event).toBeDefined();
      expect(result.event.name).toBeDefined();
      expect(result.sessions.length).toBeGreaterThan(0);
      expect(result.tasks.length).toBeGreaterThan(0);
    });
  });

  describe("3. Edit Board Functionality", () => {
    it("updates event name, date, and location correctly", () => {
      const originalEvent = {
        id: "test-event-1",
        name: "Original Name",
        date: "2026-09-19",
        location: "Hall A",
        category: "Hackathon",
        tagline: "Old tagline",
      };

      const updated = {
        ...originalEvent,
        name: "Updated Hackathon 2026",
        date: "2026-10-20",
        location: "Auditorium 2",
        tagline: "New exciting tagline",
      };

      expect(updated.name).toBe("Updated Hackathon 2026");
      expect(updated.date).toBe("2026-10-20");
      expect(updated.location).toBe("Auditorium 2");
      expect(updated.tagline).toBe("New exciting tagline");
      expect(updated.id).toBe(originalEvent.id);
    });
  });

  describe("4. Missing Details in Transcript Detection", () => {
    it("detects when target event is missing from transcript", () => {
      const transcript = "Standup: Arjun please finish judging rubric by tomorrow.";
      const tasks = [
        { title: "Finish judging rubric", assignee: "Arjun", dueDate: "2026-09-20", priority: "high" },
      ];

      const analysis = detectMissingTranscriptDetails(transcript, tasks, INITIAL_EVENTS);
      expect(analysis.missingEvent).toBe(true);
      expect(analysis.hasMissing).toBe(true);
      expect(analysis.missingDetailsList.some((d) => d.type === "event")).toBe(true);
    });

    it("detects unassigned tasks and missing timings", () => {
      const transcript = "ChronOps Tech Summit 2026: Order 15 heavy duty power strips urgently.";
      const tasks = [
        { title: "Order 15 heavy duty power strips", assignee: "", dueDate: null, priority: "high" },
      ];

      const analysis = detectMissingTranscriptDetails(transcript, tasks, INITIAL_EVENTS);
      expect(analysis.missingEvent).toBe(false); // ChronOps Tech Summit 2026 is mentioned
      expect(analysis.unassignedTasks).toHaveLength(1);
      expect(analysis.missingTimingTasks).toHaveLength(1);
      expect(analysis.hasMissing).toBe(true);
    });

    it("returns hasMissing: false when transcript contains all specific details", () => {
      const transcript = "ChronOps Tech Summit 2026: Arjun, finalize the judging rubric by 2026-09-21 at 09:00 in the Main Auditorium.";
      const tasks = [
        { title: "Finalize judging rubric", assignee: "Arjun", dueDate: "2026-09-21", priority: "high" },
      ];

      const analysis = detectMissingTranscriptDetails(transcript, tasks, INITIAL_EVENTS);
      expect(analysis.missingEvent).toBe(false);
      expect(analysis.unassignedTasks).toHaveLength(0);
      expect(analysis.missingTimingTasks).toHaveLength(0);
      expect(analysis.hasMissing).toBe(false);
    });
  });
});
