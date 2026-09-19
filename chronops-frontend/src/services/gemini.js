import { GoogleGenAI } from "@google/genai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL = import.meta.env.VITE_GEMINI_MODEL || "gemini-2.0-flash";

let ai = null;

function getAI() {
  if (!ai) {
    if (!API_KEY) {
      console.warn("VITE_GEMINI_API_KEY is not set — Gemini calls will fail.");
    }
    ai = new GoogleGenAI({ apiKey: API_KEY });
  }
  return ai;
}

/**
 * Generate text content from a prompt.
 * @param {string} prompt
 * @returns {Promise<string>} The generated text.
 */
export async function generateContent(prompt) {
  const client = getAI();
  const response = await client.models.generateContent({
    model: MODEL,
    contents: prompt,
  });
  return response.text;
}

export { MODEL };
