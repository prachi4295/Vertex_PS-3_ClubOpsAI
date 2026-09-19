import { describe, it, expect } from "vitest";
import {
  validateExtractedTasks,
  formatGeminiError,
  extractTasksFromNotes,
  generateFillerScript,
  draftVolunteerEmail,
  generateTransition,
  generateSpeakerIntro,
  generatePhoneticGuide,
  fallbackPhoneticGuide,
  MODEL,
} from "./gemini";

describe("Gemini Service & Task Extraction", () => {
  it("uses the configured or default model", () => {
    expect(MODEL).toBeDefined();
    expect(typeof MODEL).toBe("string");
  });

  describe("validateExtractedTasks", () => {
    it("returns empty array for non-array inputs", () => {
      expect(validateExtractedTasks(null)).toEqual([]);
      expect(validateExtractedTasks({})).toEqual([]);
      expect(validateExtractedTasks("not an array")).toEqual([]);
    });

    it("filters out items without actionable titles", () => {
      const input = [
        { title: "Ok", priority: "high" }, // too short <= 2
        { title: "", priority: "low" },
        { priority: "medium" }, // missing title
        { title: "Valid task to setup tables", priority: "medium", assignee: "Priya" },
      ];
      const result = validateExtractedTasks(input);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Valid task to setup tables");
      expect(result[0].assignee).toBe("Priya");
    });

    it("normalizes priorities to low, medium, or high", () => {
      const input = [
        { title: "Fix Wi-Fi router", priority: "URGENT" }, // invalid -> fallback medium
        { title: "Clean auditorium", priority: "HIGH" },
        { title: "Print nametags", priority: "low" },
      ];
      const result = validateExtractedTasks(input);
      expect(result[0].priority).toBe("medium");
      expect(result[1].priority).toBe("high");
      expect(result[2].priority).toBe("low");
    });

    it("validates dueDate format YYYY-MM-DD", () => {
      const input = [
        { title: "Task 1", dueDate: "2026-09-21" },
        { title: "Task 2", dueDate: "yesterday" }, // invalid -> null
        { title: "Task 3", dueDate: "" }, // empty -> null
        { title: "Task 4", dueDate: null },
      ];
      const result = validateExtractedTasks(input);
      expect(result[0].dueDate).toBe("2026-09-21");
      expect(result[1].dueDate).toBeNull();
      expect(result[2].dueDate).toBeNull();
      expect(result[3].dueDate).toBeNull();
    });
  });

  describe("formatGeminiError", () => {
    it("returns a clear friendly error when API key is missing", () => {
      const err = formatGeminiError(new Error("API key is not configured"));
      expect(err.message).toContain("VITE_GEMINI_API_KEY");
    });

    it("handles timeout errors", () => {
      const err = formatGeminiError(new Error("Gemini request timed out"));
      expect(err.message).toContain("timed out");
    });

    it("handles rate limit 429 errors", () => {
      const err = formatGeminiError(new Error("HTTP 429 Resource Exhausted"));
      expect(err.message).toContain("rate limit");
    });

    it("handles invalid key errors", () => {
      const err = formatGeminiError(new Error("API_KEY_INVALID"));
      expect(err.message).toContain("Invalid Gemini API key");
    });
  });

  describe("extractTasksFromNotes input validation", () => {
    it("rejects empty notes", async () => {
      await expect(extractTasksFromNotes("")).rejects.toThrow(
        "Please provide meeting notes or a voice transcript"
      );
      await expect(extractTasksFromNotes("   ")).rejects.toThrow(
        "Please provide meeting notes or a voice transcript"
      );
    });
  });

  describe("Quick AI Stage & Operations Helpers (Static Fallbacks & Fact Checking)", () => {
    it("generateFillerScript falls back cleanly and produces roughly 150 spoken words", async () => {
      const script = await generateFillerScript(
        { title: "Keynote: Next-Gen Autonomous AI Agents" },
        { title: "Sponsor Tech Talk", speaker: "Vikram Malhotra" },
        "HackGenesis 2026"
      );

      expect(script).toBeDefined();
      expect(typeof script).toBe("string");
      expect(script).toContain("HackGenesis 2026");
      expect(script).toContain("Keynote: Next-Gen Autonomous AI Agents");
      expect(script).toContain("Sponsor Tech Talk");

      // Spoken length check: roughly 140-160 words
      const wordCount = script.trim().split(/\s+/).length;
      expect(wordCount).toBeGreaterThanOrEqual(100);
      expect(wordCount).toBeLessThanOrEqual(200);
    });

    it("draftVolunteerEmail generates clear subject and action points", async () => {
      const email = await draftVolunteerEmail("Stage delay of 10m applied due to keynote overrun.");

      expect(email).toContain("Subject:");
      expect(email).toContain("Stage delay of 10m applied");
      expect(email).toContain("Immediate action items:");
      expect(email).toContain("Stage Hands");
    });

    it("generateTransition bridges previous and next sessions cleanly", async () => {
      const transition = await generateTransition(
        { title: "Opening Ceremony", speaker: "Prof. S. R. Rao" },
        { title: "Keynote Talk", speaker: "Dr. Ananya Mukherjee" }
      );

      expect(transition).toContain("Opening Ceremony");
      expect(transition).toContain("Prof. S. R. Rao");
      expect(transition).toContain("Keynote Talk");
      expect(transition).toContain("Dr. Ananya Mukherjee");
    });

    describe("generateSpeakerIntro strict bio compliance", () => {
      it("refuses to invent facts when the bio is empty and asks for it", async () => {
        // Empty string bio
        const emptyBioResult = await generateSpeakerIntro({
          speaker: "John Doe",
          title: "Cloud Infrastructure",
          bio: "",
        });
        expect(emptyBioResult.toLowerCase()).toContain("no speaker bio provided");
        expect(emptyBioResult).toContain("John Doe");

        // Whitespace bio
        const whitespaceBioResult = await generateSpeakerIntro({
          speaker: "Jane Smith",
          title: "AI Systems",
          bio: "   ",
        });
        expect(whitespaceBioResult.toLowerCase()).toContain("no speaker bio provided");

        // Null / undefined bio
        const nullBioResult = await generateSpeakerIntro({
          speaker: "Guest Speaker",
          title: "Robotics",
          bio: null,
        });
        expect(nullBioResult.toLowerCase()).toContain("no speaker bio provided");
      });

      it("uses ONLY facts in the session bio and does not invent achievements", async () => {
        const sessionWithBio = {
          speaker: "Dr. Ramesh Gupta",
          title: "Grand Finale",
          bio: "Dean of Academic Affairs and HackGenesis Chief Patron",
        };

        const intro = await generateSpeakerIntro(sessionWithBio);
        expect(intro).toContain("Dr. Ramesh Gupta");
        expect(intro).toContain("Dean of Academic Affairs and HackGenesis Chief Patron");
        // Must not contain hallucinated facts
        expect(intro).not.toContain("Nobel Prize");
        expect(intro).not.toContain("Fortune 500 CEO");
      });
    });

    describe("generatePhoneticGuide respelling", () => {
      it("returns easy phonetic respelling for known and demo speakers", async () => {
        expect(await generatePhoneticGuide("Dr. Ramesh Gupta")).toBe("Dr. GOOP-ta");
        expect(await generatePhoneticGuide("Dr. Ananya Mukherjee")).toBe("ah-NAN-yah MOO-kher-jee");
        expect(await generatePhoneticGuide("Vikram Malhotra")).toBe("vik-RUM mal-HOH-trah");
        expect(await generatePhoneticGuide("Tanvi Sen")).toBe("TAN-vee SEN");
        expect(await generatePhoneticGuide("Prof. S. R. Rao")).toBe("Prof. S. R. RAH-oh");
      });

      it("handles empty or invalid names safely", async () => {
        expect(await generatePhoneticGuide("")).toBe("");
        expect(await generatePhoneticGuide(null)).toBe("");
      });
    });
  });
});
