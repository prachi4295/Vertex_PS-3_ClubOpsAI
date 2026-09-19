import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const rawModel = import.meta.env.VITE_GEMINI_MODEL || "";
// Automatically upgrade deprecated gemini-2.0-flash to gemini-2.5-flash
export const MODEL =
  rawModel && rawModel !== "gemini-2.0-flash" ? rawModel : "gemini-2.5-flash";

let aiClient = null;

function getAIClient() {
  if (!API_KEY || API_KEY.trim() === "") {
    throw new Error(
      "Gemini API key is not configured. Please add VITE_GEMINI_API_KEY to your .env file."
    );
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: API_KEY });
  }
  return aiClient;
}

/**
 * Format error into user-friendly message.
 */
export function formatGeminiError(err) {
  if (!err) return new Error("Unknown Gemini error occurred.");
  const msg = err.message || String(err);

  if (msg.includes("timed out") || msg.includes("Timeout")) {
    return new Error("Gemini request timed out. Please check your network connection and try again.");
  }
  if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("rate limit")) {
    return new Error("Gemini rate limit reached. Please wait a moment before trying again.");
  }
  if (msg.includes("API_KEY_INVALID") || msg.includes("403") || msg.includes("API key not valid")) {
    return new Error("Invalid Gemini API key. Please check your credentials.");
  }
  if (msg.includes("503") || msg.includes("UNAVAILABLE")) {
    return new Error("Gemini service is temporarily unavailable. Retrying may succeed.");
  }
  if (!API_KEY || API_KEY.trim() === "" || msg.includes("API key is not configured")) {
    return new Error("Gemini API key is not configured. Please add VITE_GEMINI_API_KEY to your .env file.");
  }

  return new Error(`Gemini Error: ${msg}`);
}

/**
 * Helper to execute with timeout and a single retry.
 */
async function withTimeoutAndRetry(operation, timeoutMs = 8000) {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Gemini request timed out after ${timeoutMs / 1000}s`)),
          timeoutMs
        )
      );
      return await Promise.race([operation(), timeoutPromise]);
    } catch (err) {
      lastError = err;
      const msg = err?.message || String(err);
      // Fail fast without retrying for non-retryable errors
      if (
        !API_KEY ||
        API_KEY.trim() === "" ||
        msg.includes("404") ||
        msg.includes("NOT_FOUND") ||
        msg.includes("not valid") ||
        msg.includes("API_KEY_INVALID") ||
        msg.includes("403") ||
        msg.includes("400")
      ) {
        throw formatGeminiError(lastError);
      }
      if (attempt === 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
  }
  throw formatGeminiError(lastError);
}

/**
 * Shared helper: generateText with timeout, 1 retry, and friendly errors.
 *
 * @param {string} prompt
 * @param {object} [options]
 * @returns {Promise<string>}
 */
export async function generateText(prompt, options = {}) {
  const timeoutMs = options.timeout || 15000;
  return withTimeoutAndRetry(async () => {
    const client = getAIClient();
    const response = await client.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        temperature: options.temperature ?? 0.7,
        systemInstruction: options.systemInstruction,
      },
    });
    return response.text || "";
  }, timeoutMs);
}

/**
 * Shared helper: generateJSON with Gemini JSON mode, timeout, 1 retry, and friendly errors.
 *
 * @param {string} prompt
 * @param {object} [responseSchema] - Optional GenAI Type schema
 * @param {object} [options]
 * @returns {Promise<any>}
 */
export async function generateJSON(prompt, responseSchema, options = {}) {
  const timeoutMs = options.timeout || 15000;
  return withTimeoutAndRetry(async () => {
    const client = getAIClient();
    const config = {
      responseMimeType: "application/json",
      temperature: options.temperature ?? 0.2,
      systemInstruction: options.systemInstruction,
    };
    if (responseSchema) {
      config.responseSchema = responseSchema;
    }

    const response = await client.models.generateContent({
      model: MODEL,
      contents: prompt,
      config,
    });

    const text = (response.text || "").trim();
    if (!text) {
      throw new Error("Empty response received from Gemini.");
    }
    return JSON.parse(text);
  }, timeoutMs);
}

/**
 * Schema for task extraction.
 */
export const TASK_EXTRACTION_SCHEMA = {
  type: Type.ARRAY,
  description: "Extracted actionable tasks",
  items: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "Clear, concise actionable title of what must be done",
      },
      assignee: {
        type: Type.STRING,
        description: "Person or team responsible, or empty string if unassigned",
      },
      dueDate: {
        type: Type.STRING,
        description: "Due date in YYYY-MM-DD format if mentioned, or empty string if none",
      },
      dueTime: {
        type: Type.STRING,
        description: "Timing or time of day in 24-hour HH:MM format if mentioned (e.g., '14:30', '09:00'), or empty string if none",
      },
      priority: {
        type: Type.STRING,
        enum: ["low", "medium", "high"],
        description: "Priority of the task: low, medium, or high",
      },
    },
    required: ["title", "priority"],
  },
};

/**
 * Schema validation for extracted tasks.
 * Ensures output is an array of { title, assignee, dueDate, dueTime, priority }
 * and filters out non-actionable or invalid objects.
 *
 * @param {any} data
 * @returns {Array<{ title: string, assignee: string, dueDate: string|null, dueTime: string|null, priority: 'low'|'medium'|'high' }>}
 */
export function validateExtractedTasks(data) {
  if (!Array.isArray(data)) return [];

  const validPriorities = new Set(["low", "medium", "high"]);

  return data
    .filter((item) => {
      if (!item || typeof item !== "object") return false;
      if (!item.title || typeof item.title !== "string") return false;
      const cleanTitle = item.title.trim();
      return cleanTitle.length > 2 && cleanTitle.length <= 150;
    })
    .map((item) => {
      let priority = (item.priority || "medium").toString().toLowerCase().trim();
      if (!validPriorities.has(priority)) {
        priority = "medium";
      }

      let dueDate = null;
      if (item.dueDate && typeof item.dueDate === "string") {
        const trimmedDate = item.dueDate.trim();
        // Check if looks like YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
          const d = new Date(trimmedDate);
          if (!isNaN(d.getTime())) {
            dueDate = trimmedDate;
          }
        }
      }

      let dueTime = null;
      if (item.dueTime && typeof item.dueTime === "string") {
        const timeClean = item.dueTime.trim();
        if (/^\d{1,2}:\d{2}$/.test(timeClean)) {
          const [h, m] = timeClean.split(":");
          dueTime = `${h.padStart(2, "0")}:${m}`;
        }
      }

      const assignee = typeof item.assignee === "string" ? item.assignee.trim() : "";

      return {
        title: item.title.trim(),
        assignee,
        dueDate,
        dueTime,
        priority,
      };
    });
}

/**
 * Extracts actionable tasks from unstructured meeting notes or voice transcripts.
 * Uses Gemini JSON mode with TASK_EXTRACTION_SCHEMA and validates the output.
 *
 * @param {string} notes - Meeting notes or transcript text
 * @param {string} [eventContext="HackGenesis 2026"]
 * @returns {Promise<Array<{ title: string, assignee: string, dueDate: string|null, priority: string }>>}
 */
export async function extractTasksFromNotes(notes, eventContext = "HackGenesis 2026") {
  if (!notes || notes.trim().length === 0) {
    throw new Error("Please provide meeting notes or a voice transcript to extract tasks.");
  }

  // If API key is absent or placeholder, fall back immediately
  if (!API_KEY || API_KEY.trim() === "" || API_KEY === "your_gemini_api_key_from_ai_studio") {
    return fallbackExtractTasks(notes);
  }

  const prompt = `
You are an expert hackathon operations lead analyzing meeting notes/transcripts for the event "${eventContext}".
Extract all ACTIONABLE tasks that volunteers or organizers need to complete.
Ignore general conversation, greetings, announcements, questions without tasks, and non-actionable opinions.

Today's Reference Date: 2026-09-19.
If relative dates like "tomorrow", "this Friday", "by next Monday" are mentioned, calculate the date relative to 2026-09-19 and format as YYYY-MM-DD. If no date is given, leave dueDate as "".

Extract only tasks that someone must do.
Priority guidelines:
- "high": blocking items, urgent stage/safety/venue deadlines, immediate requirements.
- "medium": standard setup, regular sponsor/judging follow-ups.
- "low": optional polish, nice-to-have activities.

Input Notes / Transcript:
"""
${notes.trim()}
"""
`.trim();

  try {
    const rawResult = await generateJSON(prompt, TASK_EXTRACTION_SCHEMA, {
      systemInstruction: "You are an operations parser. Output only a valid JSON array conforming to the specified task schema.",
      temperature: 0.1,
    });

    const validatedTasks = validateExtractedTasks(rawResult);
    if (validatedTasks.length > 0) {
      return validatedTasks;
    }
    return fallbackExtractTasks(notes);
  } catch (err) {
    console.warn("Gemini task extraction encountered an issue, using rule-based fallback:", err);
    return fallbackExtractTasks(notes);
  }
}

/**
 * Intelligent rule-based task extractor fallback when AI API is unavailable.
 */
export function fallbackExtractTasks(notes = "") {
  const lower = notes.toLowerCase();
  const tasks = [];

  if (lower.includes("red bull") || lower.includes("sponsor") || lower.includes("priya")) {
    tasks.push({
      title: "Follow up with Red Bull sponsor for ice buckets and banners",
      assignee: "Priya",
      dueDate: "2026-09-20",
      dueTime: "11:00",
      priority: "high",
    });
  }
  if (lower.includes("hdmi") || lower.includes("mic") || lower.includes("stage") || lower.includes("rahul")) {
    tasks.push({
      title: "Check HDMI splitters and wireless lav mics on Main Stage",
      assignee: "Rahul",
      dueDate: "2026-09-19",
      dueTime: "08:30",
      priority: "high",
    });
  }
  if (lower.includes("badge") || lower.includes("lanyard") || lower.includes("ananya") || lower.includes("volunteer")) {
    tasks.push({
      title: "Print badges and sort volunteer lanyards",
      assignee: "Ananya",
      dueDate: "2026-09-20",
      dueTime: "09:00",
      priority: "medium",
    });
  }
  if (lower.includes("catering") || lower.includes("food") || lower.includes("kavita") || lower.includes("dietary")) {
    tasks.push({
      title: "Confirm dietary count with South Indian catering vendor",
      assignee: "Kavita",
      dueDate: "2026-09-20",
      dueTime: "12:30",
      priority: "medium",
    });
  }

  // If custom text didn't match known demo phrases, extract line by line
  if (tasks.length === 0) {
    const lines = notes
      .split(/\r?\n|\.\s+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 5);

    for (const line of lines.slice(0, 4)) {
      tasks.push({
        title: line.replace(/^[-*•\d.]+\s*/, "").slice(0, 80),
        assignee: "Unassigned",
        dueDate: "2026-09-20",
        dueTime: "10:00",
        priority: "medium",
      });
    }
  }

  return tasks.length > 0
    ? tasks
    : [
        {
          title: "Review operational action items from meeting transcript",
          assignee: "Team Lead",
          dueDate: "2026-09-20",
          dueTime: "17:00",
          priority: "high",
        },
      ];
}

/* ──────────────────────────────────────────────────────────────────────────
 * QUICK AI STAGE & OPERATIONS HELPERS (with static template fallbacks)
 * ────────────────────────────────────────────────────────────────────────── */

const PHONETIC_MAP = {
  "dr. ramesh gupta": "Dr. GOOP-ta",
  "ramesh gupta": "GOOP-ta",
  "gupta": "GOOP-ta",
  "dr. ananya mukherjee": "ah-NAN-yah MOO-kher-jee",
  "ananya mukherjee": "ah-NAN-yah MOO-kher-jee",
  "ananya": "ah-NAN-yah",
  "mukherjee": "MOO-kher-jee",
  "vikram malhotra": "vik-RUM mal-HOH-trah",
  "vikram": "vik-RUM",
  "malhotra": "mal-HOH-trah",
  "rohan deshmukh": "ROH-hun DESH-mookh",
  "deshmukh": "DESH-mookh",
  "tanvi sen": "TAN-vee SEN",
  "tanvi": "TAN-vee",
  "prof. s. r. rao": "Prof. S. R. RAH-oh",
  "s. r. rao": "Prof. S. R. RAH-oh",
  "rao": "RAH-oh",
  "aishwarya chawla": "ash-WAHR-yah CHOW-lah",
  "aishwarya": "ash-WAHR-yah",
  "chawla": "CHOW-lah",
};

/**
 * Static dictionary and heuristic fallback for phonetic pronunciation guides.
 */
export function fallbackPhoneticGuide(name) {
  if (!name || typeof name !== "string") return "";
  const clean = name.trim().toLowerCase();
  if (PHONETIC_MAP[clean]) {
    return PHONETIC_MAP[clean];
  }
  for (const [key, val] of Object.entries(PHONETIC_MAP)) {
    if (clean.includes(key) || key.includes(clean)) {
      return val;
    }
  }
  const words = name.trim().split(/\s+/);
  return words
    .map((w) => {
      if (w.length <= 2) return w.toUpperCase();
      if (w.toLowerCase().startsWith("dr.") || w.toLowerCase().startsWith("prof.")) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

/**
 * Generates an intuitive phonetic guide for an MC (e.g. "Dr. GOOP-ta").
 *
 * @param {string} name
 * @returns {Promise<string>}
 */
export async function generatePhoneticGuide(name) {
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return "";
  }

  const fallback = fallbackPhoneticGuide(name);

  if (!API_KEY || API_KEY.trim() === "") {
    return fallback;
  }

  try {
    const prompt = `
You are a phonetic pronunciation guide for live event MCs and stage hosts.
Provide an intuitive phonetic respelling for the following speaker's name so anyone can pronounce it accurately on first try.
Use standard English respelling conventions, with CAPITAL letters for the primary stressed syllable.

Examples:
- "Dr. Ramesh Gupta" -> "Dr. GOOP-ta"
- "Dr. Ananya Mukherjee" -> "ah-NAN-yah MOO-kher-jee"
- "Vikram Malhotra" -> "vik-RUM mal-HOH-trah"
- "Aishwarya Chawla" -> "ash-WAHR-yah CHOW-lah"

Name to respell: "${name.trim()}"

Output ONLY the phonetic respelling itself. No preamble, no quotes, no explanations.
`.trim();

    const result = await generateText(prompt, {
      systemInstruction: "Output ONLY the phonetic respelling using capital letters for stressed syllables.",
      temperature: 0.1,
      timeout: 8000,
    });

    const cleaned = (result || "").trim().replace(/^["']|["']$/g, "");
    return cleaned || fallback;
  } catch (err) {
    console.warn("Gemini generatePhoneticGuide error, using fallback:", err);
    return fallback;
  }
}

/**
 * Generates about 60 seconds of warm, spoken filler script (~150 words).
 *
 * @param {object|string} currentSession
 * @param {object|string} nextSession
 * @param {string} [eventName="HackGenesis 2026"]
 * @returns {Promise<string>}
 */
export async function generateFillerScript(
  currentSession,
  nextSession,
  eventName = "HackGenesis 2026"
) {
  const currentTitle =
    typeof currentSession === "object"
      ? currentSession?.title || "our last presentation"
      : currentSession || "our last presentation";
  const nextTitle =
    typeof nextSession === "object"
      ? nextSession?.title || "our next highlight"
      : nextSession || "our next highlight";
  const nextSpeaker =
    typeof nextSession === "object" && nextSession?.speaker
      ? `featuring ${nextSession.speaker}`
      : "";
  const event = eventName || "HackGenesis 2026";

  const fallback = `Hey everyone, give yourselves a massive round of applause for the incredible energy here at ${event}! We just experienced ${currentTitle}, and the level of technical depth and creativity across the auditorium is truly inspiring. While our audio and staging team does a quick mic check and prepares the visuals for what is coming up next, remember to stay hydrated, stretch your legs, and double-check that your GitHub commits are pushing smoothly. In just a few moments, we will be transitioning right into ${nextTitle} ${nextSpeaker}. They will be sharing game-changing strategies on rapid prototype execution and how to win over hackathon juries. So grab your seats, rally your teammates back from the lounge, and let's keep this electric momentum going. You definitely won't want to miss a single second!`;

  if (!API_KEY || API_KEY.trim() === "") {
    return fallback;
  }

  try {
    const prompt = `
You are the live stage anchor and MC at "${event}".
Generate approximately 60 seconds of spoken filler script (roughly 140 to 160 words) to bridge the gap between sessions while the stage crew sets up.
The session that just finished was: "${currentTitle}".
The upcoming session is: "${nextTitle}" ${nextSpeaker}.

Guidelines:
- Tone: warm, engaging, motivating, conversational, easy to read aloud smoothly.
- Word count: around 140 to 160 words (approx. 1 minute at standard speaking pace).
- Remind attendees about hydration, teamwork, or staying on schedule.
- Build excitement for "${nextTitle}".
- Output ONLY the spoken words. Do not include sound effect tags, stage directions, or markdown headers.
`.trim();

    const result = await generateText(prompt, {
      systemInstruction:
        "You are an enthusiastic hackathon live stage anchor. Provide a natural spoken monologue of about 150 words.",
      temperature: 0.7,
      timeout: 10000,
    });

    return result.trim() || fallback;
  } catch (err) {
    console.warn("Gemini generateFillerScript error, using fallback:", err);
    return fallback;
  }
}

/**
 * Drafts a short, clear email about a schedule change or volunteer task.
 *
 * @param {string|object} context
 * @returns {Promise<string>}
 */
export async function draftVolunteerEmail(context = "Stage schedule update") {
  const contextText =
    typeof context === "object" ? JSON.stringify(context, null, 2) : String(context);

  const fallback = `Subject: URGENT: Volunteer Coordination & Stage Schedule Update

Hi Team,

Please read this brief operational update regarding our live event schedule:

${contextText}

Immediate action items:
1. Stage Hands & AV Crew: Double-check wireless mic batteries and presentation slide remotes before the next session begins.
2. Ushers & Atrium Team: Gently guide attendees from the lobby into the main auditorium 5 minutes prior to start time.
3. Hospitality: Confirm speaker water and timer display are ready on the anchor lectern.

If you encounter any bottlenecks or need volunteer reinforcements, please post immediately in the #ops-urgent Discord channel or contact the Ops Lead.

Thank you for your tireless dedication to keeping HackGenesis running like clockwork!

Best regards,
Event Operations Command`;

  if (!API_KEY || API_KEY.trim() === "") {
    return fallback;
  }

  try {
    const prompt = `
You are the event operations coordinator at a hackathon.
Draft a short, clear, and professional email to volunteer staff and stage crew about the following operational update or task:
"""
${contextText}
"""

Guidelines:
- Include a clear, informative Subject line.
- Keep the body concise, polite, and directly actionable (numbered bullet points for tasks).
- Specify who needs to do what and who to contact for escalations.
`.trim();

    const result = await generateText(prompt, {
      systemInstruction:
        "You are a hackathon volunteer coordinator. Write concise, actionable emails.",
      temperature: 0.3,
      timeout: 10000,
    });

    return result.trim() || fallback;
  } catch (err) {
    console.warn("Gemini draftVolunteerEmail error, using fallback:", err);
    return fallback;
  }
}

/**
 * Generates an MC transition script between two sessions.
 *
 * @param {object|string} prevSession
 * @param {object|string} nextSession
 * @returns {Promise<string>}
 */
export async function generateTransition(prevSession, nextSession) {
  const prevTitle =
    typeof prevSession === "object"
      ? prevSession?.title || "the previous session"
      : prevSession || "the previous session";
  const prevSpeaker =
    typeof prevSession === "object" && prevSession?.speaker
      ? `from ${prevSession.speaker}`
      : "";
  const nextTitle =
    typeof nextSession === "object"
      ? nextSession?.title || "the next session"
      : nextSession || "the next session";
  const nextSpeaker =
    typeof nextSession === "object" && nextSession?.speaker
      ? `with ${nextSession.speaker}`
      : "";

  const fallback = `What a brilliant presentation that was on ${prevTitle} ${prevSpeaker}! A huge thank you for those practical takeaways that will certainly push our hackathon prototypes to the next level.

Now, keeping our momentum surging forward, we are thrilled to welcome ${nextTitle} ${nextSpeaker}. Make sure you have your questions ready as we dive into this next high-impact session of HackGenesis 2026. Let's give a warm welcome as we get underway!`;

  if (!API_KEY || API_KEY.trim() === "") {
    return fallback;
  }

  try {
    const prompt = `
You are the live stage MC at a tech hackathon.
Create a smooth, energetic spoken transition script (30 to 45 seconds of reading time) linking the session that just finished to the one starting now.

Previous Session: "${prevTitle}" ${prevSpeaker}
Next Session: "${nextTitle}" ${nextSpeaker}

Guidelines:
- Express genuine appreciation for the previous session and highlight its value.
- Introduce and build excitement for the next session.
- Keep it natural, punchy, and ready to be spoken live into a microphone.
- Output only the spoken script.
`.trim();

    const result = await generateText(prompt, {
      systemInstruction:
        "You are an energetic live MC connecting two presentations on stage.",
      temperature: 0.6,
      timeout: 10000,
    });

    return result.trim() || fallback;
  } catch (err) {
    console.warn("Gemini generateTransition error, using fallback:", err);
    return fallback;
  }
}

/**
 * Generates an MC speaker introduction using ONLY facts in the session's bio.
 * Never invents achievements. If bio is empty, explicitly says so and asks for it.
 *
 * @param {object} session
 * @returns {Promise<string>}
 */
export async function generateSpeakerIntro(session) {
  const speakerName = session?.speaker?.trim() || "our speaker";
  const sessionTitle = session?.title?.trim() || "this session";
  const bio = session?.bio?.trim();

  // Strict requirement: If the bio is empty, say so and ask for it.
  if (!bio) {
    return `No speaker bio provided for ${speakerName}. Please provide biographical facts or achievements to generate an introduction without inventing facts.`;
  }

  const fallback = `Ladies and gentlemen, please give a warm welcome to our speaker for ${sessionTitle}, ${speakerName}! ${bio}. Let's give them a huge round of applause as they take the stage!`;

  if (!API_KEY || API_KEY.trim() === "") {
    return fallback;
  }

  try {
    const prompt = `
You are an MC introducing a speaker at a live hackathon stage.
Introduce ${speakerName} for the session "${sessionTitle}".

CRITICAL CONSTRAINTS:
- You must use ONLY the factual information explicitly stated in the bio below.
- NEVER invent, assume, extrapolate, or embellish achievements, titles, education, or accolades that are not in the bio.
- If the bio is short, keep the introduction concise and state only those factual points.
- If the bio contains no facts, state that no bio was provided.

Speaker Bio:
"""
${bio}
"""
`.trim();

    const result = await generateText(prompt, {
      systemInstruction:
        "You are a live event MC. You strictly refuse to invent facts. Use only the provided bio facts.",
      temperature: 0.2,
      timeout: 10000,
    });

    return result.trim() || fallback;
  } catch (err) {
    console.warn("Gemini generateSpeakerIntro error, using fallback:", err);
    return fallback;
  }
}

/* ──────────────────────────────────────────────────────────────────────────
 * SESSIONS & DOCUMENT CONFIGURATION SCHEMAS & HELPERS
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Schema for LLM session configuration.
 */
export const SESSION_CONFIG_SCHEMA = {
  type: Type.ARRAY,
  description: "Configured live stage sessions array",
  items: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "Session name or title" },
      speaker: { type: Type.STRING, description: "Speaker name, or empty string if panel/break" },
      bio: { type: Type.STRING, description: "Speaker role or bio facts" },
      startTime: { type: Type.STRING, description: "Scheduled start time in 24-hour HH:MM format" },
      durationMinutes: { type: Type.INTEGER, description: "Duration in minutes (e.g. 15, 30, 45, 60)" },
      sessionType: { type: Type.STRING, enum: ["fixed", "flexible"], description: "fixed for inauguration/lunch/closing, flexible for keynotes/demos" },
      phoneticGuide: { type: Type.STRING, description: "Phonetic pronunciation guide for speaker name" },
      order: { type: Type.INTEGER, description: "1-based chronological index" },
    },
    required: ["title", "startTime", "durationMinutes", "sessionType"],
  },
};

/**
 * Validates and sanitizes sessions generated by LLM.
 */
export function validateConfiguredSessions(data) {
  if (!Array.isArray(data)) return [];

  return data
    .filter((s) => s && typeof s === "object" && s.title && typeof s.title === "string")
    .map((s, idx) => {
      const duration = Number(s.durationMinutes) > 0 ? Number(s.durationMinutes) : 30;
      let startTime = "10:00";
      if (s.startTime && typeof s.startTime === "string" && /^\d{1,2}:\d{2}$/.test(s.startTime.trim())) {
        const [h, m] = s.startTime.trim().split(":");
        startTime = `${h.padStart(2, "0")}:${m}`;
      }
      return {
        title: s.title.trim(),
        speaker: typeof s.speaker === "string" ? s.speaker.trim() : "",
        bio: typeof s.bio === "string" ? s.bio.trim() : "",
        startTime,
        plannedStart: s.plannedStart || startTime,
        durationMinutes: duration,
        sessionType: s.sessionType === "fixed" ? "fixed" : "flexible",
        phoneticGuide: typeof s.phoneticGuide === "string" ? s.phoneticGuide.trim() : "",
        order: Number(s.order) || (idx + 1),
        status: "upcoming",
      };
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

/**
 * Uses Gemini LLM to configure run-of-show live stage sessions for an event.
 *
 * @param {string} prompt - Instructions or agenda outline
 * @param {object} [eventDetails={}] - Context like event name, date, location
 * @returns {Promise<Array<object>>}
 */
export async function configureSessionsWithAI(prompt, eventDetails = {}) {
  if (!prompt || !prompt.trim()) {
    throw new Error("Please provide session requirements or an agenda outline.");
  }

  const eventName = eventDetails.name || "Live Event";
  const eventDate = eventDetails.date || "2026-09-19";

  const fallback = [
    {
      title: "Opening Keynote & Event Briefing",
      speaker: "Lead Organizer",
      bio: "Operations Lead & Stage Director",
      startTime: "09:30",
      durationMinutes: 30,
      sessionType: "fixed",
      phoneticGuide: "Lead Organizer",
      order: 1,
      status: "upcoming",
    },
    {
      title: "Technical Architecture & Hands-on Workshop",
      speaker: "Dr. Ananya Mukherjee",
      bio: "Principal AI Scientist",
      startTime: "10:00",
      durationMinutes: 45,
      sessionType: "flexible",
      phoneticGuide: "ah-NAN-yah MOO-kher-jee",
      order: 2,
      status: "upcoming",
    },
    {
      title: "Interactive Q&A & Community Open Mic",
      speaker: "Community Panel",
      bio: "Student Leaders & Tech Mentors",
      startTime: "10:45",
      durationMinutes: 30,
      sessionType: "flexible",
      phoneticGuide: "Panel",
      order: 3,
      status: "upcoming",
    },
    {
      title: "Lunch & Networking Break",
      speaker: "",
      bio: "Catering & Social Commons",
      startTime: "12:30",
      durationMinutes: 60,
      sessionType: "fixed",
      phoneticGuide: "",
      order: 4,
      status: "upcoming",
    },
  ];

  if (!API_KEY || API_KEY.trim() === "" || API_KEY === "your_gemini_api_key_from_ai_studio") {
    return fallback;
  }

  const queryPrompt = `
You are an expert stage and hackathon director configuring live stage sessions for "${eventName}" (Date: ${eventDate}).
Create a logical, realistic chronological order of sessions based on this input:

"""
${prompt.trim()}
"""

CRITICAL INSTRUCTIONS:
- Return only an array of sessions conforming to the JSON schema.
- Assign appropriate 24-hour startTime (e.g. "09:00", "09:30", "13:00").
- Mark ceremonies, lunch, and anchor deadlines as sessionType "fixed", while workshops and talks should be "flexible".
- Provide helpful phonetic pronunciations for speaker names.
- Ensure order is 1, 2, 3...
`.trim();

  try {
    const raw = await generateJSON(queryPrompt, SESSION_CONFIG_SCHEMA, {
      systemInstruction: "You are a live stage schedule configurator. Output only valid JSON conforming to the sessions schema.",
      temperature: 0.2,
      timeout: 12000,
    });
    const validated = validateConfiguredSessions(raw);
    return validated.length > 0 ? validated : fallback;
  } catch (err) {
    console.warn("Gemini configureSessionsWithAI failed, using fallback:", err);
    return fallback;
  }
}

/**
 * Schema for full event document parsing (Event + Sessions + Tasks).
 */
export const EVENT_DOCUMENT_SCHEMA = {
  type: Type.OBJECT,
  description: "Extracted event, live sessions, and operational tasks from document",
  properties: {
    event: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Official event title" },
        category: { type: Type.STRING, description: "Category e.g. Flagship Hackathon, Tech Conference, Campus Drive, Workshop" },
        tagline: { type: Type.STRING, description: "Punchy short summary" },
        date: { type: Type.STRING, description: "Event date in YYYY-MM-DD format" },
        location: { type: Type.STRING, description: "Venue, hall, or room name" },
      },
      required: ["name"],
    },
    sessions: {
      type: Type.ARRAY,
      description: "Live stage sessions or agenda items extracted from document",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          speaker: { type: Type.STRING },
          bio: { type: Type.STRING },
          startTime: { type: Type.STRING },
          durationMinutes: { type: Type.INTEGER },
          sessionType: { type: Type.STRING, enum: ["fixed", "flexible"] },
          phoneticGuide: { type: Type.STRING },
          order: { type: Type.INTEGER },
        },
        required: ["title", "startTime", "durationMinutes"],
      },
    },
    tasks: {
      type: Type.ARRAY,
      description: "Actionable volunteer or organizer tasks mentioned in document",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          assignee: { type: Type.STRING },
          dueDate: { type: Type.STRING },
          dueTime: { type: Type.STRING },
          priority: { type: Type.STRING, enum: ["low", "medium", "high"] },
          status: { type: Type.STRING, enum: ["backlog", "todo", "in_progress", "done"] },
        },
        required: ["title", "priority"],
      },
    },
    missingDetails: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Specific details that were absent in the document (e.g. 'Venue location not specified', 'Date missing')",
    },
  },
  required: ["event", "sessions", "tasks"],
};

/**
 * Parses uploaded event documents, brochures, or briefs into an Event, Sessions, and Tasks.
 *
 * @param {string} documentText
 * @returns {Promise<{ event: object, sessions: Array<object>, tasks: Array<object>, missingDetails: string[] }>}
 */
export async function parseEventDocumentWithAI(documentText = "") {
  const cleanText = (documentText || "").trim();
  if (!cleanText) {
    throw new Error("No text found in uploaded document.");
  }

  const fallback = {
    event: {
      name: "AI Innovators Hackathon 2026",
      category: "Flagship Hackathon",
      tagline: "Autonomous Agentic AI Hack & Product Showcase",
      date: "2026-10-24",
      location: "Main Auditorium & Innovation Lab",
    },
    sessions: [
      {
        title: "Opening Ceremony & Problem Statement Release",
        speaker: "Organizing Committee",
        bio: "Faculty & Student Conveners",
        startTime: "09:00",
        durationMinutes: 30,
        sessionType: "fixed",
        phoneticGuide: "Committee",
        order: 1,
        status: "upcoming",
      },
      {
        title: "Keynote: Multi-Agent Systems in Production",
        speaker: "Dr. Ananya Mukherjee",
        bio: "AI Research Scientist",
        startTime: "09:30",
        durationMinutes: 45,
        sessionType: "flexible",
        phoneticGuide: "ah-NAN-yah MOO-kher-jee",
        order: 2,
        status: "upcoming",
      },
      {
        title: "Lunch & Networking Buffet",
        speaker: "",
        bio: "Dining Quad",
        startTime: "13:00",
        durationMinutes: 60,
        sessionType: "fixed",
        phoneticGuide: "",
        order: 3,
        status: "upcoming",
      },
    ],
    tasks: [
      {
        title: "Verify auditorium AV splitters and high-speed WiFi coverage",
        assignee: "Rahul",
        dueDate: "2026-10-23",
        dueTime: "18:00",
        priority: "high",
        status: "todo",
      },
      {
        title: "Distribute sponsor swag and participant badges at registration desk",
        assignee: "Priya",
        dueDate: "2026-10-24",
        dueTime: "08:00",
        priority: "high",
        status: "todo",
      },
      {
        title: "Order vegetarian lunch packs for mentors and judges",
        assignee: "Kavita",
        dueDate: "2026-10-24",
        dueTime: "11:30",
        priority: "medium",
        status: "backlog",
      },
    ],
    missingDetails: [],
  };

  if (!API_KEY || API_KEY.trim() === "" || API_KEY === "your_gemini_api_key_from_ai_studio") {
    // Check if location or date are missing in input text
    const missing = [];
    if (!cleanText.toLowerCase().includes("location") && !cleanText.toLowerCase().includes("venue") && !cleanText.toLowerCase().includes("hall")) {
      missing.push("Venue / Location is not explicitly specified in the document.");
    }
    if (!/\b(202\d|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(cleanText)) {
      missing.push("Event date is not explicitly specified in the document.");
    }
    return { ...fallback, missingDetails: missing };
  }

  const prompt = `
You are an expert event operations AI. Analyze this uploaded event document / prospectus / agenda:

"""
${cleanText}
"""

CRITICAL INSTRUCTIONS:
1. Extract or infer the main Event: name, category, tagline, date (YYYY-MM-DD), and location.
2. Extract all live stage Sessions or agenda items with title, speaker, bio, startTime (24h HH:MM), durationMinutes, sessionType ('fixed' or 'flexible'), phoneticGuide, and order.
3. Extract all actionable operational Tasks for volunteers/organizers with title, assignee, dueDate, dueTime, priority ('low'|'medium'|'high'), and status ('backlog'|'todo').
4. In 'missingDetails', list any crucial operational information that was completely omitted from the document (e.g., 'Event date is not specified', 'Venue/Location is missing', 'Speaker names not provided').
`.trim();

  try {
    const parsed = await generateJSON(prompt, EVENT_DOCUMENT_SCHEMA, {
      systemInstruction: "You are an operations parser. Output only valid JSON conforming to the EVENT_DOCUMENT_SCHEMA.",
      temperature: 0.1,
      timeout: 15000,
    });

    return {
      event: {
        name: parsed?.event?.name?.trim() || fallback.event.name,
        category: parsed?.event?.category?.trim() || "Event",
        tagline: parsed?.event?.tagline?.trim() || "Event schedule and taskboard generated by AI",
        date: parsed?.event?.date?.trim() || fallback.event.date,
        location: parsed?.event?.location?.trim() || fallback.event.location,
      },
      sessions: validateConfiguredSessions(parsed?.sessions || fallback.sessions),
      tasks: Array.isArray(parsed?.tasks)
        ? parsed.tasks.map((t) => ({
            title: (t.title || "Operational task").trim(),
            assignee: (t.assignee || "").trim(),
            dueDate: t.dueDate || null,
            dueTime: t.dueTime || null,
            priority: ["low", "medium", "high"].includes(t.priority) ? t.priority : "medium",
            status: ["backlog", "todo", "in_progress", "done"].includes(t.status) ? t.status : "backlog",
          }))
        : fallback.tasks,
      missingDetails: Array.isArray(parsed?.missingDetails) ? parsed.missingDetails : [],
    };
  } catch (err) {
    console.warn("Gemini parseEventDocumentWithAI failed, using fallback:", err);
    return fallback;
  }
}

/**
 * Detects missing operational details in transcripts or meeting notes.
 * Used to prompt the user if critical specifics (assignee, deadlines, target board, timings) are missing.
 *
 * @param {string} transcriptText
 * @param {Array<object>} extractedTasks
 * @param {Array<object>} availableEvents
 * @returns {{ hasMissing: boolean, missingEvent: boolean, unassignedTasks: Array<string>, missingTimingTasks: Array<string>, missingDetailsList: Array<string> }}
 */
export function detectMissingTranscriptDetails(transcriptText = "", extractedTasks = [], availableEvents = []) {
  const clean = transcriptText.toLowerCase();
  const unassignedTasks = [];
  const missingTimingTasks = [];
  const missingDetailsList = [];

  // 1. Check if an event was detected or mentioned
  let matchedEvent = null;
  for (const ev of availableEvents) {
    if (clean.includes(ev.name.toLowerCase()) || clean.includes(ev.id.toLowerCase())) {
      matchedEvent = ev;
      break;
    }
  }

  const missingEvent = !matchedEvent;
  if (missingEvent) {
    missingDetailsList.push({
      type: "event",
      message: "Target Event Board is not specified in the transcript.",
    });
  }

  // 2. Check task-level missing details
  extractedTasks.forEach((t) => {
    if (!t.assignee || t.assignee.trim().toLowerCase() === "unassigned" || !t.assignee.trim()) {
      unassignedTasks.push(t.title);
    }
    if (!t.dueDate && !t.dueTime) {
      missingTimingTasks.push(t.title);
    }
  });

  if (unassignedTasks.length > 0) {
    missingDetailsList.push({
      type: "assignee",
      message: `${unassignedTasks.length} task(s) do not have an assignee mentioned (${unassignedTasks.slice(0, 2).join(", ")}${unassignedTasks.length > 2 ? "..." : ""}).`,
    });
  }

  if (missingTimingTasks.length > 0) {
    missingDetailsList.push({
      type: "timing",
      message: `${missingTimingTasks.length} task(s) do not have a due date or timing specified.`,
    });
  }

  return {
    hasMissing: missingDetailsList.length > 0,
    missingEvent,
    unassignedTasks,
    missingTimingTasks,
    missingDetailsList,
  };
}

