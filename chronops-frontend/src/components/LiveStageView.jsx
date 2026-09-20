import { useState, useEffect } from "react";
import {
  Radio,
  Clock,
  Play,
  CheckSquare,
  AlertTriangle,
  Volume2,
  VolumeX,
  Copy,
  Check,
  FastForward,
  Wand2,
  FileText,
  RotateCcw,
  Sliders,
  X,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  Sparkles,
  Mail,
} from "lucide-react";
import { Card, Badge, Input } from "./ui";
import Button from "./ui/Button";
import { useSessions } from "../hooks/useSessions";
import { useNotifications } from "../hooks/useNotifications";
import { useClock, formatClockTime, formatCountdown } from "../hooks/useClock";
import { reflowSchedule } from "../lib/reflow";
import { formatTimeRange, formatDuration } from "../lib/time";
import {
  generateSpeakerIntro,
  generateTransition,
  generateFillerScript,
} from "../services/gemini";
import { resetDemoData } from "../data/seed";
import { INITIAL_EVENTS } from "../data/multiEvents";
import ConfigureSessionsModal from "./ConfigureSessionsModal";
import VolunteerEmailModal from "./VolunteerEmailModal";

import { getStoredEvents, getStoredDispatches, saveStoredDispatches } from "../lib/storage";

const DEMO_EVENT_IDS = ["chronops-summit-2026", "ai-summit-2026", "club-orientation-2026"];

function loadSavedEvents() {
  return getStoredEvents();
}

/**
 * LiveStageView: Full-screen, phone-friendly anchor view for Live Stage mode.
 * - Current session in huge type with speaker and phonetic guide
 * - Live countdown timer based on actualStart and durationMinutes
 * - Turns accent red and counts up as overrun once past zero
 * - Next session preview
 * - Delay buttons (+5m, +10m) using schedule reflow
 * - Current session script: on-demand generation cached in session.script
 * - "Filler script" button for stage anchor
 * - "Complete and next" button (calls completeSession)
 * - Hidden "Demo controls" drawer with clock speed slider (1x, 30x, 60x) and reset demo data
 * - Designed for one-handed operation at 375px width with 44px+ touch targets
 * - Multi-event switching and AI-powered session configuration
 */
export default function LiveStageView({ initialEventId }) {
  const [events, setEvents] = useState(loadSavedEvents);
  const [selectedEventId, setSelectedEventId] = useState(
    initialEventId || (events[0] && events[0].id) || ""
  );
  const [configureModalOpen, setConfigureModalOpen] = useState(false);
  const [volunteerEmailOpen, setVolunteerEmailOpen] = useState(false);
  const [autoTimeSync, setAutoTimeSync] = useState(true);

  useEffect(() => {
    const handleEventsUpdate = () => {
      const refreshed = loadSavedEvents();
      setEvents(refreshed);
      if (refreshed.length > 0 && !refreshed.some((e) => e.id === selectedEventId)) {
        setSelectedEventId(refreshed[0].id);
      }
    };
    window.addEventListener("clubops-data-updated", handleEventsUpdate);
    return () =>
      window.removeEventListener("clubops-data-updated", handleEventsUpdate);
  }, [selectedEventId]);

  const activeEvent =
    events.find((e) => e.id === selectedEventId) ||
    events[0] ||
    null;

  const {
    sessions,
    startSession,
    completeSession,
    updateSession,
    updateSessionsBatch,
  } = useSessions(activeEvent?.id || null);
  const { addNotification } = useNotifications();
  const {
    currentTime,
    speed,
    setSpeed,
    isPaused,
    togglePause,
    resetClock,
  } = useClock();

  // Clamp speed to 30x if previously higher
  useEffect(() => {
    if (speed > 30) {
      setSpeed(30);
    }
  }, [speed, setSpeed]);

  // Drawers and modals
  const [demoDrawerOpen, setDemoDrawerOpen] = useState(false);
  const [fillerModalOpen, setFillerModalOpen] = useState(false);
  const [fillerText, setFillerText] = useState("");
  const [fillerDuration, setFillerDuration] = useState(1);
  const [loadingFiller, setLoadingFiller] = useState(false);

  // Script generation and audio
  const [generatingScript, setGeneratingScript] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [isSpeakingScript, setIsSpeakingScript] = useState(false);

  // Reflow slip warning state
  const [pendingReflow, setPendingReflow] = useState(null); // { sessions, warnings, delta }
  const [isReflowing, setIsReflowing] = useState(false);

  // Active live session and upcoming session
  const sortedSessions = [...sessions].sort(
    (a, b) =>
      (a.order || 0) - (b.order || 0) ||
      (a.startTime || "").localeCompare(b.startTime || "")
  );

  const liveSession = sortedSessions.find((s) => s.status === "live");
  const upcomingSessions = sortedSessions.filter((s) => s.status === "upcoming");
  const nextSession = upcomingSessions[0] || null;
  const completedSessions = sortedSessions.filter((s) => s.status === "completed");
  const prevSession = completedSessions[completedSessions.length - 1] || null;

  // ─── Forward Emails to Speakers, Volunteers, Participants ───
  const forwardStakeholderEmails = (session) => {
    const speakerEmail = session.speaker
      ? `${session.speaker.toLowerCase().replace(/[^a-z0-9]/g, "")}@speaker.chronops.io`
      : "speaker@chronops.io";
    const dispatches = [
      {
        to: `Speaker: ${session.speaker || "Presenter"} (${speakerEmail})`,
        subject: `STAGE NOTICE: Your session "${session.title}" is now LIVE`,
        body: `Hello ${session.speaker || "Speaker"}, your session "${session.title}" is now officially live on the ChronOps stage. Your planned time is ${session.durationMinutes} minutes. Best of luck!`,
      },
      {
        to: "All Volunteers (volunteers@chronops.io)",
        subject: `LIVE ALERT: "${session.title}" has started`,
        body: `Stage crew & AV: "${session.title}" is now live. Ensure timer displays are visible and speaker mics are balanced.`,
      },
      {
        to: "Participants (attendees@chronops.io)",
        subject: `HAPPENING NOW: "${session.title}" on Main Stage`,
        body: `Join now: "${session.title}" is starting on the main stage right now!`,
      },
    ];

    try {
      const saved = getStoredDispatches();
      dispatches.forEach((d) =>
        saved.unshift({
          ...d,
          id: "auto-" + Date.now() + Math.random(),
          timestamp: new Date().toISOString(),
        })
      );
      saveStoredDispatches(saved);
    } catch (e) {}

    addNotification({
      message: `Forwarded stage emails to speaker (${session.speaker || "Presenter"}), 24 volunteers, and participants.`,
      type: "action",
    });
  };

  const handleStartSession = async (sessionId, time) => {
    const sess = sessions.find((s) => s.id === sessionId);
    await startSession(sessionId, time);
    if (sess) {
      forwardStakeholderEmails(sess);
    }
  };

  // ─── Time-Sync: Auto-advance live stage based on event time ───
  useEffect(() => {
    if (!autoTimeSync || !currentTime || sessions.length === 0) return;

    const currentHours = currentTime.getHours().toString().padStart(2, "0");
    const currentMins = currentTime.getMinutes().toString().padStart(2, "0");
    const currentHHMM = `${currentHours}:${currentMins}`;

    // If no session is currently live and the first upcoming session's time has arrived:
    if (!liveSession && nextSession && nextSession.startTime) {
      if (currentHHMM >= nextSession.startTime) {
        handleStartSession(nextSession.id, currentTime);
      }
    }
  }, [currentTime, autoTimeSync, liveSession, nextSession, sessions]);

  // ─── Auto-Show Scripts: Automatically generate/display script when session is live ───
  useEffect(() => {
    if (liveSession && !liveSession.script && !generatingScript) {
      const autoGenerate = async () => {
        setGeneratingScript(true);
        try {
          const script = await generateSpeakerIntro(liveSession);
          if (script) {
            await updateSession(liveSession.id, { script });
          }
        } catch (e) {
          console.warn("Auto script generation error:", e);
        } finally {
          setGeneratingScript(false);
        }
      };
      autoGenerate();
    }
  }, [liveSession?.id, liveSession?.script]);

  // Cleanup speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // ─── Countdown & Overrun Calculation ───
  let remainingSeconds = 0;
  let isOverrun = false;
  let hasActualStart = false;

  if (liveSession) {
    const totalAllowedSeconds = (Number(liveSession.durationMinutes) || 30) * 60;
    if (liveSession.actualStart) {
      hasActualStart = true;
      const startMs =
        liveSession.actualStart instanceof Date
          ? liveSession.actualStart.getTime()
          : new Date(liveSession.actualStart).getTime();
      const currentMs = currentTime.getTime();
      const elapsedSeconds = Math.floor((currentMs - startMs) / 1000);
      remainingSeconds = totalAllowedSeconds - elapsedSeconds;
      isOverrun = remainingSeconds < 0;
    } else {
      remainingSeconds = totalAllowedSeconds;
    }
  }

  // ─── Delay Reflow Action (+5m, +10m) ───
  const handleApplyDelay = async (deltaMinutes) => {
    if (!liveSession) return;
    const mins = Number(deltaMinutes);
    const { sessions: reflowed, warnings } = reflowSchedule(sessions, mins, liveSession.id);

    if (warnings && warnings.length > 0) {
      setPendingReflow({ sessions: reflowed, warnings, delta: mins });
    } else {
      setIsReflowing(true);
      try {
        await updateSessionsBatch(reflowed);
        addNotification({
          message: `Reflowed schedule (+${mins}m) for "${liveSession.title}".`,
          type: "action",
        });
      } catch (err) {
        console.error("Reflow failed:", err);
      } finally {
        setIsReflowing(false);
      }
    }
  };

  const handleConfirmReflow = async () => {
    if (!pendingReflow) return;
    setIsReflowing(true);
    try {
      await updateSessionsBatch(pendingReflow.sessions);
      addNotification({
        message: `Confirmed +${pendingReflow.delta}m reflow. Flexible sessions adjusted.`,
        type: "warning",
      });
      setPendingReflow(null);
    } catch (err) {
      console.error("Reflow confirmation failed:", err);
    } finally {
      setIsReflowing(false);
    }
  };

  // ─── Script Generation & Caching ───
  const handleGenerateScript = async (type = "intro") => {
    if (!liveSession) return;
    setGeneratingScript(true);
    try {
      let scriptContent = "";
      if (type === "transition" && prevSession) {
        scriptContent = await generateTransition(prevSession, liveSession);
      } else {
        scriptContent = await generateSpeakerIntro(liveSession);
      }

      // Cache directly in session.script in Firestore / local storage
      await updateSession(liveSession.id, { script: scriptContent });
      addNotification({
        message: `AI generated and cached stage script for "${liveSession.title}".`,
        type: "ai",
      });
    } catch (err) {
      console.error("Failed to generate script:", err);
    } finally {
      setGeneratingScript(false);
    }
  };

  // ─── Filler Script Generation with User-Specified Duration ───
  const generateFillerForTime = async (mins) => {
    setLoadingFiller(true);
    try {
      const text = await generateFillerScript(
        liveSession,
        nextSession,
        activeEvent?.name || "Live Event",
        mins
      );
      setFillerText(text);
      addNotification({
        message: `AI generated ${mins}-min filler script for stage anchor.`,
        type: "ai",
      });
    } catch (err) {
      console.error("Failed to generate filler:", err);
    } finally {
      setLoadingFiller(false);
    }
  };

  const handleOpenFiller = async () => {
    setFillerModalOpen(true);
    if (!fillerText) {
      await generateFillerForTime(fillerDuration);
    }
  };

  // ─── Copy & Speech Synthesis Helpers ───
  const handleCopyText = async (text) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    } catch (e) {
      console.warn("Copy failed:", e);
    }
  };

  const handleToggleSpeech = (text) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Speech synthesis is not supported in this browser.");
      return;
    }

    if (isSpeakingScript) {
      window.speechSynthesis.cancel();
      setIsSpeakingScript(false);
      return;
    }

    if (!text) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeakingScript(false);
    utterance.onerror = () => setIsSpeakingScript(false);
    setIsSpeakingScript(true);
    window.speechSynthesis.speak(utterance);
  };

  // ─── Reset Demo Action ───
  const handleResetDemo = async () => {
    if (window.confirm(`Reset all ${activeEvent.name} data and sessions back to initial state?`)) {
      await resetDemoData();
      resetClock(new Date("2026-09-19T09:35:00"));
      addNotification({
        message: `Demo data cleanly reset for ${activeEvent.name}.`,
        type: "action",
      });
    }
  };

  return (
    <div className="min-h-screen bg-neo-bg text-neo-ink pb-10 pt-3 px-3 sm:px-6 max-w-4xl mx-auto flex flex-col justify-between">
      {/* ─── Top Stage Header Bar ─── */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-4 border-neo-ink pb-3 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="w-3.5 h-3.5 rounded-full bg-neo-accent border-2 border-neo-ink animate-ping inline-block shrink-0" />
          <span className="font-black text-xs uppercase tracking-widest bg-neo-ink text-neo-white px-2.5 py-1 shadow-[2px_2px_0_#FDE68A]">
            LIVE STAGE MONITOR
          </span>

          {/* Event Selector Dropdown - Bigger & Bolder */}
          <div className="flex items-center gap-2 bg-neo-white border-3 border-neo-ink px-3 py-1.5 shadow-[3px_3px_0_#000]">
            <span className="text-xs font-black uppercase tracking-wider text-neo-ink/80">EVENT:</span>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="font-black text-sm bg-transparent border-none outline-none cursor-pointer text-neo-ink pr-2"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id} className="font-bold">
                  {ev.name}
                </option>
              ))}
            </select>
          </div>

          {/* Configure Sessions with AI Button */}
          <button
            type="button"
            onClick={() => setConfigureModalOpen(true)}
            className="min-h-[36px] px-3 bg-neo-accent border-2 border-neo-ink font-black text-xs uppercase flex items-center gap-1.5 shadow-[2px_2px_0_#000] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer hover:bg-neo-accent/90"
            title="Configure sessions with AI for this event"
          >
            <Sparkles size={14} strokeWidth={3} />
            <span className="hidden sm:inline">Configure with AI</span>
            <span className="sm:hidden">AI Config</span>
          </button>

          {/* Auto-Sync Time Toggle */}
          <button
            type="button"
            onClick={() => setAutoTimeSync((prev) => !prev)}
            className={[
              "min-h-[36px] px-2.5 border-2 border-neo-ink font-black text-[11px] uppercase flex items-center gap-1.5 shadow-[2px_2px_0_#000] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer",
              autoTimeSync ? "bg-neo-white text-green-700" : "bg-neo-white/60 text-neo-ink/50",
            ].join(" ")}
            title="Auto-sync live stage transitions with event schedule time"
          >
            <Clock size={13} strokeWidth={3} />
            <span>Time-Sync: {autoTimeSync ? "ON" : "OFF"}</span>
          </button>
        </div>

        {/* Live Clock readout */}
        <div className="flex items-center gap-2">
          <span className="font-mono font-black text-sm bg-neo-white border-3 border-neo-ink px-3 py-1.5 shadow-[2px_2px_0_#000] flex items-center gap-1.5">
            <Clock size={14} strokeWidth={3} className="text-neo-ink/70" />
            {formatClockTime(currentTime)}
          </span>
        </div>
      </div>

      {/* ─── Red Slip Warning Banner (if fixed session slippage detected) ─── */}
      {pendingReflow && (
        <div
          role="alert"
          className="p-3.5 bg-neo-accent border-4 border-neo-ink shadow-neo mb-4 text-neo-ink animate-shake"
        >
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle size={20} strokeWidth={3} className="shrink-0 mt-0.5" />
            <div>
              <h4 className="font-black text-xs uppercase tracking-wider">
                Fixed Session Slip Warning (+{pendingReflow.delta}m)
              </h4>
              <p className="text-[11px] font-bold mt-0.5">
                Delay overflows into locked fixed anchors:
              </p>
            </div>
          </div>
          <div className="space-y-1 mb-3">
            {pendingReflow.warnings.map((w, idx) => (
              <div key={idx} className="bg-neo-white p-1.5 border-2 border-neo-ink font-mono text-[11px] font-bold">
                ⚠️ {w}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="dark"
              size="sm"
              disabled={isReflowing}
              onClick={handleConfirmReflow}
              className="!min-h-[44px] !text-xs !bg-neo-ink !text-neo-white cursor-pointer flex-1"
            >
              {isReflowing ? "Reflowing..." : "Confirm Schedule Shift"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isReflowing}
              onClick={() => setPendingReflow(null)}
              className="!min-h-[44px] !text-xs !bg-neo-white cursor-pointer px-4"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* ─── Main Anchor Content Area ─── */}
      {liveSession ? (
        <div className="space-y-4">
          {/* 1. Massive Live Countdown / Overrun Card */}
          <div
            className={[
              "p-4 sm:p-6 border-4 border-neo-ink shadow-neo transition-colors text-center",
              isOverrun
                ? "bg-neo-accent text-neo-ink"
                : "bg-neo-white text-neo-ink",
            ].join(" ")}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-black text-xs uppercase tracking-widest flex items-center gap-1.5">
                {isOverrun ? (
                  <>
                    <AlertTriangle size={14} strokeWidth={3} />
                    STAGE OVERRUN
                  </>
                ) : (
                  <>
                    <Clock size={14} strokeWidth={3} />
                    TIME REMAINING
                  </>
                )}
              </span>
              <Badge
                color={liveSession.sessionType === "fixed" ? "accent" : "muted"}
                className="!text-[9px] !px-2 !py-0.5 !border-2"
              >
                {liveSession.sessionType.toUpperCase()}
              </Badge>
            </div>

            {/* Huge Countdown Display */}
            <div className="font-mono font-black text-5xl sm:text-7xl lg:text-8xl tracking-tight my-2 selection:bg-neo-secondary">
              {isOverrun ? `+${formatCountdown(remainingSeconds)}` : formatCountdown(remainingSeconds)}
            </div>

            <div className="flex items-center justify-center gap-3 text-xs font-bold mt-2 uppercase tracking-wide">
              <span>Planned: {formatDuration(liveSession.durationMinutes)}</span>
              <span>•</span>
              <span>Window: {formatTimeRange(liveSession.startTime, liveSession.durationMinutes)}</span>
            </div>

            {!hasActualStart && (
              <p className="text-[11px] font-black uppercase text-neo-ink/70 mt-2 bg-neo-secondary/30 p-1 border border-neo-ink">
                Session queued — click Start or Complete to run live timer
              </p>
            )}
          </div>

          {/* 2. Current Session in Huge Type & Speaker Info */}
          <div className="p-4 sm:p-6 bg-neo-white border-4 border-neo-ink shadow-neo">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-neo-accent text-neo-ink px-2 py-0.5 font-black text-[10px] uppercase border border-neo-ink">
                CURRENT SESSION
              </span>
              <span className="font-mono font-bold text-xs text-neo-ink/70">
                #{liveSession.order || 1}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-neo-ink leading-tight tracking-tight mt-1">
              {liveSession.title}
            </h1>

            {/* Speaker & Phonetic Guide */}
            <div className="mt-3 pt-3 border-t-2 border-neo-ink/20 flex flex-wrap items-baseline gap-2 sm:gap-4">
              <span className="text-lg sm:text-xl font-bold text-neo-ink">
                {liveSession.speaker || "General Stage Session"}
              </span>

              {liveSession.phoneticGuide && (
                <span className="bg-neo-secondary border-2 border-neo-ink px-2.5 py-1 text-xs sm:text-sm font-black text-neo-ink shadow-[2px_2px_0_#000]">
                  🗣️ Phonetic: {liveSession.phoneticGuide}
                </span>
              )}
            </div>

            {liveSession.bio && (
              <p className="text-xs font-bold text-neo-ink/70 mt-2 italic bg-neo-bg p-2 border border-neo-ink/30">
                Facts from bio: {liveSession.bio}
              </p>
            )}

            {/* Delay Buttons (+5m, +10m, +15m), Filler Script & Complete & Next in Current Session Box */}
            <div className="mt-4 pt-3 border-t-2 border-neo-ink/20 flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Delay Buttons (+5m, +10m, +15m) */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={!liveSession || isReflowing}
                  onClick={() => handleApplyDelay(5)}
                  className="px-3 py-2 bg-neo-white border-2 border-neo-ink text-neo-ink font-black text-xs sm:text-sm shadow-[2px_2px_0_#000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer disabled:opacity-40"
                  title="Add +5 minutes delay with schedule reflow"
                >
                  +5m
                </button>
                <button
                  type="button"
                  disabled={!liveSession || isReflowing}
                  onClick={() => handleApplyDelay(10)}
                  className="px-3 py-2 bg-neo-white border-2 border-neo-ink text-neo-ink font-black text-xs sm:text-sm shadow-[2px_2px_0_#000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer disabled:opacity-40"
                  title="Add +10 minutes delay with schedule reflow"
                >
                  +10m
                </button>
                <button
                  type="button"
                  disabled={!liveSession || isReflowing}
                  onClick={() => handleApplyDelay(15)}
                  className="px-3 py-2 bg-neo-white border-2 border-neo-ink text-neo-ink font-black text-xs sm:text-sm shadow-[2px_2px_0_#000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer disabled:opacity-40"
                  title="Add +15 minutes delay with schedule reflow"
                >
                  +15m
                </button>
              </div>

              {/* Emergency Filler Script */}
              <button
                type="button"
                onClick={handleOpenFiller}
                className="px-3.5 py-2 bg-neo-secondary border-2 border-neo-ink text-neo-ink font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-[2px_2px_0_#000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
                title="Open 1-minute emergency filler script"
              >
                <FileText size={14} strokeWidth={3} />
                <span>Filler Script</span>
              </button>

              {/* Complete & Next Button (at the end, beside Filler Script) */}
              <button
                type="button"
                disabled={!liveSession}
                onClick={() => completeSession(liveSession.id, currentTime)}
                className="px-4 py-2 bg-neo-accent border-2 border-neo-ink text-neo-ink font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 shadow-[2px_2px_0_#000] hover:shadow-neo hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer disabled:opacity-40"
                title="Mark this session completed and advance to the next session"
              >
                <CheckSquare size={16} strokeWidth={3} />
                <span>Complete & Next</span>
                <ArrowRight size={16} strokeWidth={3} />
              </button>
            </div>
          </div>

          {/* 3. Session Script Display (Cached or Generated on Demand) */}
          <div className="p-4 bg-neo-white border-4 border-neo-ink shadow-neo space-y-2.5">
            <div className="flex items-center justify-between gap-2 border-b-2 border-neo-ink/20 pb-2">
              <span className="font-black text-xs uppercase tracking-wider flex items-center gap-1.5 text-neo-ink">
                <FileText size={14} strokeWidth={3} />
                MC Stage Script {liveSession.script ? "(Cached)" : ""}
              </span>

              <div className="flex items-center gap-1">
                {liveSession.script && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleCopyText(liveSession.script)}
                      className="min-h-[44px] px-2.5 bg-neo-bg border border-neo-ink text-xs font-bold flex items-center gap-1 hover:bg-neo-secondary cursor-pointer shadow-[1px_1px_0_#000]"
                      title="Copy script"
                    >
                      {copiedScript ? <Check size={12} strokeWidth={3} className="text-green-700" /> : <Copy size={12} strokeWidth={3} />}
                      <span>{copiedScript ? "Copied" : "Copy"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleSpeech(liveSession.script)}
                      className={[
                        "min-h-[44px] px-2.5 border border-neo-ink text-xs font-bold flex items-center gap-1 cursor-pointer shadow-[1px_1px_0_#000]",
                        isSpeakingScript ? "bg-neo-accent text-neo-white animate-pulse" : "bg-neo-bg hover:bg-neo-secondary",
                      ].join(" ")}
                      title="Read aloud"
                    >
                      {isSpeakingScript ? <VolumeX size={12} strokeWidth={3} /> : <Volume2 size={12} strokeWidth={3} />}
                      <span>{isSpeakingScript ? "Stop" : "Speak"}</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {liveSession.script ? (
              <div className="p-3 bg-neo-bg border-2 border-neo-ink font-sans text-xs sm:text-sm font-bold leading-relaxed whitespace-pre-wrap selection:bg-neo-secondary">
                {liveSession.script}
              </div>
            ) : (
              <div className="p-4 text-center bg-neo-bg border-2 border-dashed border-neo-ink/40">
                <p className="text-xs font-bold text-neo-ink/60 mb-3">
                  No script cached for this session yet. Generate on demand with Gemini:
                </p>
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={generatingScript}
                    onClick={() => handleGenerateScript("intro")}
                    className="!min-h-[44px] !text-xs !px-3"
                  >
                    <Wand2 size={12} strokeWidth={3} />
                    {generatingScript ? "Generating..." : "Generate Speaker Intro"}
                  </Button>
                  {prevSession && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={generatingScript}
                      onClick={() => handleGenerateScript("transition")}
                      className="!min-h-[44px] !text-xs !px-3 !bg-neo-white"
                    >
                      <Sparkles size={12} strokeWidth={3} />
                      Generate Transition
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 4. Next Session Preview Card */}
          {nextSession ? (
            <div className="p-3.5 bg-neo-secondary/30 border-4 border-neo-ink shadow-[2px_2px_0_#000] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="font-black text-[10px] uppercase tracking-wider text-neo-ink/70">
                  UP NEXT ({nextSession.startTime})
                </span>
                <h4 className="font-black text-sm text-neo-ink truncate mt-0.5">
                  {nextSession.title}
                </h4>
                <p className="text-xs font-bold text-neo-ink/70 truncate">
                  {nextSession.speaker || "General Stage"}
                  {nextSession.phoneticGuide ? ` • 🗣️ ${nextSession.phoneticGuide}` : ""}
                </p>
              </div>
              <Badge color={nextSession.sessionType === "fixed" ? "accent" : "muted"} className="!text-[9px] shrink-0 !border">
                {nextSession.sessionType.toUpperCase()}
              </Badge>
            </div>
          ) : (
            <div className="p-3 bg-neo-bg border-4 border-neo-ink text-center">
              <p className="font-black text-xs uppercase text-neo-ink/50">
                This is the final scheduled stage session.
              </p>
            </div>
          )}
        </div>
      ) : sessions.length === 0 ? (
        /* No Sessions Configured for this event */
        <div className="p-8 text-center bg-neo-white border-4 border-neo-ink shadow-neo my-auto">
          <div className="w-12 h-12 rounded-full bg-neo-secondary border-4 border-neo-ink flex items-center justify-center mx-auto mb-3 shadow-neo-sm">
            <Sparkles size={24} strokeWidth={3} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-neo-ink mb-1">
            No Sessions Configured
          </h2>
          <p className="text-xs sm:text-sm font-bold text-neo-ink/70 max-w-md mx-auto mb-6">
            "{activeEvent.name}" doesn't have any scheduled stage sessions yet. Use AI to generate an entire run-of-show timeline in seconds!
          </p>
          <Button
            variant="primary"
            size="lg"
            onClick={() => setConfigureModalOpen(true)}
            className="!min-h-[48px] !text-sm !px-6 mx-auto"
          >
            <Sparkles size={16} strokeWidth={3} />
            Configure Sessions with AI
          </Button>
        </div>
      ) : (
        /* Standby State (sessions exist but none is currently live) */
        <div className="p-8 text-center bg-neo-white border-4 border-neo-ink shadow-neo my-auto">
          <div className="w-12 h-12 rounded-full bg-neo-secondary border-4 border-neo-ink flex items-center justify-center mx-auto mb-3 shadow-neo-sm">
            <Radio size={24} strokeWidth={3} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-neo-ink mb-1">
            Stage On Standby
          </h2>
          <p className="text-xs sm:text-sm font-bold text-neo-ink/70 max-w-md mx-auto mb-6">
            {nextSession
              ? `Next session ready: "${nextSession.title}" with ${nextSession.speaker || "scheduled host"}.`
              : "All scheduled stage sessions have been completed."}
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            {nextSession && (
              <Button
                variant="primary"
                size="lg"
                onClick={() => handleStartSession(nextSession.id, currentTime)}
                className="!min-h-[48px] !text-sm !px-6"
              >
                <Play size={16} strokeWidth={3} />
                Start Live Stage: {nextSession.title}
              </Button>
            )}

            <Button
              variant="outline"
              size="lg"
              onClick={() => setConfigureModalOpen(true)}
              className="!min-h-[48px] !text-sm !px-4"
            >
              <Sparkles size={16} strokeWidth={3} />
              Re-configure with AI
            </Button>
          </div>
        </div>
      )}

      {/* ─── Emergency Filler Script Modal / Drawer ─── */}
      {fillerModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 bg-neo-ink/70"
        >
          <div className="bg-neo-white border-4 border-neo-ink p-4 sm:p-6 shadow-neo-lg max-w-lg w-full max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b-2 border-neo-ink pb-2 mb-3">
              <span className="font-bold text-xs sm:text-sm flex items-center gap-2 text-neo-ink">
                <FileText size={16} strokeWidth={2.5} className="text-neo-accent" />
                Anchor Filler Script ({fillerDuration} min{fillerDuration > 1 ? "s" : ""})
              </span>
              <button
                type="button"
                onClick={() => setFillerModalOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer text-neo-ink hover:text-neo-accent"
              >
                <X size={20} strokeWidth={3} />
              </button>
            </div>

            {/* Time / Duration selector given by user */}
            <div className="mb-3 p-2.5 bg-neo-bg/60 border-2 border-neo-ink flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-neo-ink">Duration:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 5].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => {
                        setFillerDuration(mins);
                        generateFillerForTime(mins);
                      }}
                      className={[
                        "px-2 py-0.5 text-xs font-bold border-2 border-neo-ink transition-all cursor-pointer",
                        fillerDuration === mins
                          ? "bg-neo-accent text-neo-ink shadow-[1px_1px_0_#000]"
                          : "bg-neo-white text-neo-ink/80 hover:bg-neo-bg",
                      ].join(" ")}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-neo-ink/70 font-semibold">Custom mins:</span>
                <input
                  type="number"
                  min="0.5"
                  max="15"
                  step="0.5"
                  value={fillerDuration}
                  onChange={(e) => setFillerDuration(parseFloat(e.target.value) || 1)}
                  className="w-14 px-1.5 py-0.5 border-2 border-neo-ink bg-neo-white font-bold text-xs text-center"
                />
                <button
                  type="button"
                  onClick={() => generateFillerForTime(fillerDuration)}
                  disabled={loadingFiller}
                  className="px-2.5 py-1 bg-neo-accent border-2 border-neo-ink font-bold text-xs cursor-pointer hover:bg-neo-accent/90"
                >
                  Generate
                </button>
              </div>
            </div>

            {loadingFiller ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-8 h-8 border-4 border-neo-accent border-t-transparent animate-spin rounded-full mx-auto" />
                <p className="font-bold text-xs uppercase text-neo-ink/60">
                  Generating filler script with Gemini...
                </p>
              </div>
            ) : (
              <>
                <div className="p-3 bg-neo-bg border-2 border-neo-ink font-sans text-xs sm:text-sm font-bold leading-relaxed whitespace-pre-wrap selection:bg-neo-secondary mb-4">
                  {fillerText}
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyText(fillerText)}
                    className="min-h-[44px] px-3 bg-neo-bg border-2 border-neo-ink text-xs font-bold flex items-center gap-1 shadow-[2px_2px_0_#000] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer hover:bg-neo-secondary"
                  >
                    <Copy size={14} strokeWidth={3} />
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleSpeech(fillerText)}
                    className={[
                      "min-h-[44px] px-3 border-2 border-neo-ink text-xs font-bold flex items-center gap-1 shadow-[2px_2px_0_#000] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer",
                      isSpeakingScript ? "bg-neo-accent text-neo-white animate-pulse" : "bg-neo-secondary text-neo-ink",
                    ].join(" ")}
                  >
                    {isSpeakingScript ? <VolumeX size={14} strokeWidth={3} /> : <Volume2 size={14} strokeWidth={3} />}
                    {isSpeakingScript ? "Stop" : "Read Aloud"}
                  </button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFillerModalOpen(false)}
                    className="!min-h-[44px] !text-xs !bg-neo-white"
                  >
                    Close
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── Hidden Demo Controls Drawer ─── */}
      {demoDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Demo controls drawer"
          className="fixed inset-0 z-50 flex justify-end bg-neo-ink/70 animate-fade-in"
        >
          <div className="bg-neo-bg border-l-4 border-neo-ink p-5 sm:p-6 w-full max-w-sm h-full shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div className="space-y-5">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b-2 border-neo-ink pb-3">
                <div className="flex items-center gap-2">
                  <Sliders size={18} strokeWidth={3} className="text-neo-accent" />
                  <span className="font-black text-sm uppercase tracking-wider text-neo-ink">
                    Demo Controls
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setDemoDrawerOpen(false)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer text-neo-ink hover:text-neo-accent"
                >
                  <X size={20} strokeWidth={3} />
                </button>
              </div>

              {/* Clock Speed Controls */}
              <div className="p-4 bg-neo-white border-4 border-neo-ink shadow-[2px_2px_0_#000] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs uppercase tracking-wider text-neo-ink">
                    Clock Speed: {speed}x
                  </span>
                  <span className="font-mono text-xs font-bold text-neo-ink/70">
                    {formatClockTime(currentTime)}
                  </span>
                </div>

                {/* Preset Speed Buttons: 1x, 30x */}
                <div className="grid grid-cols-2 gap-2">
                  {[1, 30].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSpeed(s)}
                      className={[
                        "min-h-[44px] font-black text-xs border-2 border-neo-ink shadow-[1px_1px_0_#000] cursor-pointer transition-all active:translate-x-[1px] active:translate-y-[1px]",
                        speed === s
                          ? "bg-neo-accent text-neo-ink font-black"
                          : "bg-neo-white text-neo-ink/70 hover:bg-neo-secondary",
                      ].join(" ")}
                    >
                      {s}x
                    </button>
                  ))}
                </div>

                {/* Speed Slider */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-neo-ink/60 mb-1">
                    Continuous Multiplier (1x - 30x)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={Math.min(speed, 30)}
                    onChange={(e) => setSpeed(Number(e.target.value))}
                    className="w-full accent-neo-accent cursor-pointer"
                  />
                </div>

                {/* Pause / Resume Button */}
                <button
                  type="button"
                  onClick={togglePause}
                  className="w-full min-h-[44px] bg-neo-bg border-2 border-neo-ink font-bold text-xs uppercase text-neo-ink hover:bg-neo-secondary cursor-pointer shadow-[1px_1px_0_#000]"
                >
                  {isPaused ? "▶️ Resume Clock" : "⏸️ Pause Clock"}
                </button>
              </div>

              <div className="p-3 bg-neo-secondary/30 border-2 border-neo-ink text-[11px] font-bold text-neo-ink leading-snug">
                💡 <span className="font-black">Demo Tip:</span> Set speed to <strong>30x</strong> to watch the live countdown hit zero and turn red as an overrun in just a few seconds!
              </div>
            </div>

            {/* Bottom Reset Demo Button */}
            <div className="pt-4 border-t-2 border-neo-ink/20">
              <button
                type="button"
                onClick={handleResetDemo}
                className="w-full min-h-[48px] bg-neo-white hover:bg-neo-accent hover:text-neo-white border-4 border-neo-ink font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[2px_2px_0_#000] cursor-pointer transition-all active:translate-x-[1px] active:translate-y-[1px]"
              >
                <RotateCcw size={16} strokeWidth={3} />
                Reset Demo Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── AI Session Configurator Modal ─── */}
      <ConfigureSessionsModal
        open={configureModalOpen}
        onClose={() => setConfigureModalOpen(false)}
        initialEventId={selectedEventId}
      />

      {/* ─── Volunteer Email Dispatcher Modal ─── */}
      <VolunteerEmailModal
        open={volunteerEmailOpen}
        onClose={() => setVolunteerEmailOpen(false)}
        defaultContext={
          liveSession
            ? `Live stage update for session "${liveSession.title}" featuring ${liveSession.speaker || "Presenter"}.`
            : "General volunteer operations notice."
        }
      />
    </div>
  );
}
