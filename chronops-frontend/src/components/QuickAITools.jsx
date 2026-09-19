import { useState, useEffect } from "react";
import {
  Wand2,
  FileText,
  Mail,
  Sparkles,
  UserCheck,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Card, Badge } from "./ui";
import Button from "./ui/Button";
import { useSessions } from "../hooks/useSessions";
import { useNotifications } from "../hooks/useNotifications";
import {
  generateFillerScript,
  draftVolunteerEmail,
  generateTransition,
  generateSpeakerIntro,
} from "../services/gemini";

/**
 * QuickAITools:
 * - Four quick AI generation buttons:
 *   1. 1-Min Filler Script
 *   2. Draft Volunteer Email
 *   3. Transition Script
 *   4. Speaker Intro (strictly uses facts from bio)
 * - Output panel with Copy and Read Aloud (speechSynthesis) actions
 * - Loading states, error handling, and notifications integration
 */
export default function QuickAITools() {
  const { sessions } = useSessions();
  const { addNotification } = useNotifications();

  const [activeTool, setActiveTool] = useState(null); // 'filler' | 'email' | 'transition' | 'intro'
  const [outputText, setOutputText] = useState("");
  const [outputTitle, setOutputTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Active live session and upcoming session for context
  const liveSession = sessions.find((s) => s.status === "live");
  const upcomingSessions = sessions.filter((s) => s.status === "upcoming");
  const nextSession = upcomingSessions[0] || null;
  const completedSessions = sessions.filter((s) => s.status === "completed");
  const prevSession = completedSessions[completedSessions.length - 1] || null;

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const runAITool = async (toolKey, title, actionFn, notifMsg) => {
    // Stop any active speech
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    setActiveTool(toolKey);
    setOutputTitle(title);
    setLoading(true);
    setError(null);
    setCopied(false);

    try {
      const result = await actionFn();
      setOutputText(result);
      addNotification({
        message: notifMsg,
        type: "ai",
      });
    } catch (err) {
      console.error(`Quick AI tool error [${toolKey}]:`, err);
      setError(err.message || "Failed to generate AI response.");
    } finally {
      setLoading(false);
    }
  };

  // 1. 1-Min Filler Script
  const handleFillerScript = () => {
    const cur = liveSession || { title: "HackGenesis Main Stage Welcome" };
    const nxt = nextSession || { title: "Next-Gen AI Builders Keynote", speaker: "Dr. Ananya Mukherjee" };

    runAITool(
      "filler",
      "1-Min Filler Script",
      () => generateFillerScript(cur, nxt, "HackGenesis 2026"),
      `AI generated 1-min filler script for stage anchor.`
    );
  };

  // 2. Draft Volunteer Email
  const handleVolunteerEmail = () => {
    const context = {
      event: "HackGenesis 2026",
      liveSession: liveSession?.title || "Keynote Presentation",
      nextSession: nextSession?.title || "Sponsor Workshop",
      operationalNote: "Schedule reflow applied (+10m). Ushers and stage crew please synchronize timer displays.",
    };

    runAITool(
      "email",
      "Volunteer Coordination Email",
      () => draftVolunteerEmail(context),
      `AI drafted volunteer operational email.`
    );
  };

  // 3. Transition Script
  const handleTransition = () => {
    const prev = prevSession || liveSession || { title: "Inauguration Ceremony", speaker: "Prof. S. R. Rao" };
    const next = nextSession || liveSession || { title: "Keynote: Autonomous Agents", speaker: "Dr. Ananya Mukherjee" };

    runAITool(
      "transition",
      "Stage Transition Script",
      () => generateTransition(prev, next),
      `AI generated stage transition script to "${next.title}".`
    );
  };

  // 4. Speaker Intro
  const handleSpeakerIntro = () => {
    const target = liveSession || nextSession || sessions[0] || {
      title: "Keynote: Next-Gen Autonomous AI Agents",
      speaker: "Dr. Ananya Mukherjee",
      bio: "Principal Research Scientist at DeepMind leading agentic architectures.",
    };

    runAITool(
      "intro",
      `Speaker Intro: ${target.speaker || "Stage Speaker"}`,
      () => generateSpeakerIntro(target),
      `AI generated speaker introduction for ${target.speaker || "speaker"}.`
    );
  };

  // Clipboard copy
  const handleCopy = async () => {
    if (!outputText) return;
    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn("Copy to clipboard failed:", e);
    }
  };

  // Read Aloud (speechSynthesis)
  const handleToggleSpeech = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Text-to-speech is not supported in this browser.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!outputText) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(outputText);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <Card
      headerContent={
        <div className="flex items-center justify-between w-full">
          <span className="flex items-center gap-2">
            <Wand2 size={16} strokeWidth={3} />
            Quick AI Tools
          </span>
          <Badge color="muted" className="!text-[9px] !px-1.5 !py-0 !border">
            POWERED BY AI
          </Badge>
        </div>
      }
      headerColor="bg-neo-muted"
    >
      <div className="space-y-3">
        {/* ─── 4 Action Buttons Grid ─── */}
        <div className="grid grid-cols-2 gap-2">
          {/* 1. 1-Min Filler Script */}
          <button
            type="button"
            disabled={loading}
            onClick={handleFillerScript}
            className={[
              "flex flex-col items-start p-2.5 bg-neo-white border-4 border-neo-ink shadow-[2px_2px_0_#000]",
              "hover:bg-neo-secondary/30 active:translate-x-[1px] active:translate-y-[1px] cursor-pointer text-left transition-all",
              activeTool === "filler" ? "!bg-neo-secondary/40 !shadow-none" : "",
            ].join(" ")}
          >
            <div className="w-6 h-6 bg-neo-secondary border-2 border-neo-ink flex items-center justify-center mb-1.5 shrink-0">
              <FileText size={12} strokeWidth={3} />
            </div>
            <span className="font-black text-xs text-neo-ink leading-tight">
              1-Min Filler
            </span>
            <span className="text-[10px] font-bold text-neo-ink/50 uppercase mt-0.5">
              ~150 words MC
            </span>
          </button>

          {/* 2. Draft Volunteer Email */}
          <button
            type="button"
            disabled={loading}
            onClick={handleVolunteerEmail}
            className={[
              "flex flex-col items-start p-2.5 bg-neo-white border-4 border-neo-ink shadow-[2px_2px_0_#000]",
              "hover:bg-neo-secondary/30 active:translate-x-[1px] active:translate-y-[1px] cursor-pointer text-left transition-all",
              activeTool === "email" ? "!bg-neo-secondary/40 !shadow-none" : "",
            ].join(" ")}
          >
            <div className="w-6 h-6 bg-neo-accent border-2 border-neo-ink flex items-center justify-center mb-1.5 shrink-0">
              <Mail size={12} strokeWidth={3} />
            </div>
            <span className="font-black text-xs text-neo-ink leading-tight">
              Volunteer Email
            </span>
            <span className="text-[10px] font-bold text-neo-ink/50 uppercase mt-0.5">
              Ops coordination
            </span>
          </button>

          {/* 3. Transition Script */}
          <button
            type="button"
            disabled={loading}
            onClick={handleTransition}
            className={[
              "flex flex-col items-start p-2.5 bg-neo-white border-4 border-neo-ink shadow-[2px_2px_0_#000]",
              "hover:bg-neo-secondary/30 active:translate-x-[1px] active:translate-y-[1px] cursor-pointer text-left transition-all",
              activeTool === "transition" ? "!bg-neo-secondary/40 !shadow-none" : "",
            ].join(" ")}
          >
            <div className="w-6 h-6 bg-neo-muted border-2 border-neo-ink flex items-center justify-center mb-1.5 shrink-0">
              <Sparkles size={12} strokeWidth={3} />
            </div>
            <span className="font-black text-xs text-neo-ink leading-tight">
              Transition
            </span>
            <span className="text-[10px] font-bold text-neo-ink/50 uppercase mt-0.5">
              Bridge sessions
            </span>
          </button>

          {/* 4. Speaker Intro */}
          <button
            type="button"
            disabled={loading}
            onClick={handleSpeakerIntro}
            className={[
              "flex flex-col items-start p-2.5 bg-neo-white border-4 border-neo-ink shadow-[2px_2px_0_#000]",
              "hover:bg-neo-secondary/30 active:translate-x-[1px] active:translate-y-[1px] cursor-pointer text-left transition-all",
              activeTool === "intro" ? "!bg-neo-secondary/40 !shadow-none" : "",
            ].join(" ")}
          >
            <div className="w-6 h-6 bg-neo-white border-2 border-neo-ink flex items-center justify-center mb-1.5 shrink-0">
              <UserCheck size={12} strokeWidth={3} />
            </div>
            <span className="font-black text-xs text-neo-ink leading-tight">
              Speaker Intro
            </span>
            <span className="text-[10px] font-bold text-neo-ink/50 uppercase mt-0.5">
              Facts from bio
            </span>
          </button>
        </div>

        {/* ─── Output Panel ─── */}
        <div className="bg-neo-bg border-4 border-neo-ink shadow-[2px_2px_0_#000] p-3 space-y-2">
          <div className="flex items-center justify-between border-b-2 border-neo-ink/20 pb-1.5">
            <span className="font-black text-[11px] uppercase tracking-wider text-neo-ink truncate">
              {loading ? "Generating Output..." : outputTitle || "Output Panel"}
            </span>

            {outputText && !loading && (
              <div className="flex items-center gap-1 shrink-0">
                {/* Copy Action */}
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-2 py-0.5 bg-neo-white border border-neo-ink text-[10px] font-bold flex items-center gap-1 hover:bg-neo-secondary cursor-pointer shadow-[1px_1px_0_#000] active:translate-x-[1px] active:translate-y-[1px]"
                  title="Copy to clipboard"
                >
                  {copied ? (
                    <>
                      <Check size={10} strokeWidth={3} className="text-green-700" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={10} strokeWidth={3} />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                {/* Read Aloud (speechSynthesis) */}
                <button
                  type="button"
                  onClick={handleToggleSpeech}
                  className={[
                    "px-2 py-0.5 border border-neo-ink text-[10px] font-bold flex items-center gap-1 cursor-pointer shadow-[1px_1px_0_#000] active:translate-x-[1px] active:translate-y-[1px]",
                    isSpeaking
                      ? "bg-neo-accent text-neo-white animate-pulse"
                      : "bg-neo-white hover:bg-neo-secondary text-neo-ink",
                  ].join(" ")}
                  title={isSpeaking ? "Stop reading aloud" : "Read aloud (speech synthesis)"}
                >
                  {isSpeaking ? (
                    <>
                      <VolumeX size={10} strokeWidth={3} />
                      <span>Stop</span>
                    </>
                  ) : (
                    <>
                      <Volume2 size={10} strokeWidth={3} />
                      <span>Read Aloud</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="py-6 flex flex-col items-center justify-center gap-2">
              <Loader2 size={22} strokeWidth={3} className="animate-spin text-neo-ink" />
              <p className="font-bold text-xs uppercase tracking-wider text-neo-ink/70">
                Drafting script with Gemini...
              </p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="p-2 bg-neo-accent/20 border-2 border-neo-accent text-xs font-bold text-neo-ink flex items-start gap-2">
              <AlertCircle size={14} strokeWidth={3} className="shrink-0 mt-0.5 text-neo-accent" />
              <span>{error}</span>
            </div>
          )}

          {/* Output Content */}
          {!loading && !error && outputText && (
            <div className="bg-neo-white border-2 border-neo-ink p-2.5 max-h-56 overflow-y-auto font-sans text-xs font-bold text-neo-ink leading-relaxed whitespace-pre-wrap selection:bg-neo-secondary">
              {outputText}
            </div>
          )}

          {/* Empty Placeholder */}
          {!loading && !error && !outputText && (
            <p className="py-6 text-center font-bold text-xs uppercase text-neo-ink/40">
              Select an AI tool above to generate anchor scripts, transition banter, or volunteer emails.
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

