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
} from "lucide-react";
import { Card, Badge, Input } from "./ui";
import Button from "./ui/Button";
import { useSessions } from "../hooks/useSessions";
import { useNotifications } from "../hooks/useNotifications";
import { useClock, formatClockTime, formatCountdown } from "../hooks/useClock";
import { reflowSchedule } from "../lib/reflow";
import { formatTimeRange } from "../lib/time";
import {
  generateSpeakerIntro,
  generateTransition,
  generateFillerScript,
} from "../services/gemini";
import { resetDemoData } from "../data/seed";

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
 */
export default function LiveStageView() {
  const {
    sessions,
    startSession,
    completeSession,
    updateSession,
    updateSessionsBatch,
  } = useSessions();
  const { addNotification } = useNotifications();
  const {
    currentTime,
    speed,
    setSpeed,
    isPaused,
    togglePause,
    resetClock,
  } = useClock();

  // Drawers and modals
  const [demoDrawerOpen, setDemoDrawerOpen] = useState(false);
  const [fillerModalOpen, setFillerModalOpen] = useState(false);
  const [fillerText, setFillerText] = useState("");
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

  // ─── Filler Script Generation ───
  const handleOpenFiller = async () => {
    setFillerModalOpen(true);
    if (!fillerText) {
      setLoadingFiller(true);
      try {
        const text = await generateFillerScript(liveSession, nextSession, "HackGenesis 2026");
        setFillerText(text);
        addNotification({
          message: "AI generated 60s emergency filler script.",
          type: "ai",
        });
      } catch (err) {
        console.error("Failed to generate filler:", err);
      } finally {
        setLoadingFiller(false);
      }
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
    if (window.confirm("Reset all HackGenesis 2026 data and sessions back to initial state?")) {
      await resetDemoData();
      resetClock(new Date("2026-09-19T09:35:00"));
      addNotification({
        message: "Demo data cleanly reset for HackGenesis 2026.",
        type: "action",
      });
    }
  };

  return (
    <div className="min-h-screen bg-neo-bg text-neo-ink pb-28 pt-3 px-3 sm:px-6 max-w-4xl mx-auto flex flex-col justify-between">
      {/* ─── Top Stage Header Bar ─── */}
      <div className="flex items-center justify-between gap-2 border-b-4 border-neo-ink pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded-full bg-neo-accent border-2 border-neo-ink animate-ping inline-block shrink-0" />
          <span className="font-black text-xs uppercase tracking-widest bg-neo-ink text-neo-white px-2.5 py-1 shadow-[2px_2px_0_#FFD93D]">
            LIVE STAGE MONITOR
          </span>
          <Badge color="secondary" className="hidden sm:inline-flex !text-[10px] !px-2 !py-0.5">
            HackGenesis 2026
          </Badge>
        </div>

        {/* Clock speed readout & drawer trigger */}
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-xs bg-neo-white border-2 border-neo-ink px-2 py-1 shadow-[1px_1px_0_#000]">
            {formatClockTime(currentTime)}
          </span>
          <button
            type="button"
            onClick={() => setDemoDrawerOpen(true)}
            aria-label="Open demo controls"
            className="min-h-[44px] px-3 bg-neo-secondary border-2 border-neo-ink font-black text-xs uppercase flex items-center gap-1.5 shadow-[2px_2px_0_#000] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer hover:bg-neo-secondary/80"
          >
            <Sliders size={14} strokeWidth={3} />
            <span>{speed}x</span>
          </button>
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
              <span>Planned: {liveSession.durationMinutes}m</span>
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
      ) : (
        /* Standby State (no session currently live) */
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

          {nextSession && (
            <Button
              variant="primary"
              size="lg"
              onClick={() => startSession(nextSession.id, currentTime)}
              className="!min-h-[48px] !text-sm !px-6 mx-auto"
            >
              <Play size={16} strokeWidth={3} />
              Start Live Stage: {nextSession.title}
            </Button>
          )}
        </div>
      )}

      {/* ─── Bottom Sticky Action Bar (One-Handed 375px Reachable) ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-neo-ink border-t-4 border-neo-ink p-2 sm:p-3 shadow-2xl">
        <div className="max-w-4xl mx-auto flex items-center gap-2">
          {/* +5m and +10m quick delay buttons */}
          <button
            type="button"
            disabled={!liveSession || isReflowing}
            onClick={() => handleApplyDelay(5)}
            className="min-h-[44px] px-3 bg-neo-white border-2 border-neo-white text-neo-ink font-black text-xs sm:text-sm shadow-[2px_2px_0_#FF6B6B] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer disabled:opacity-30 shrink-0"
            title="Add +5 minutes delay with schedule reflow"
          >
            +5m
          </button>
          <button
            type="button"
            disabled={!liveSession || isReflowing}
            onClick={() => handleApplyDelay(10)}
            className="min-h-[44px] px-3 bg-neo-white border-2 border-neo-white text-neo-ink font-black text-xs sm:text-sm shadow-[2px_2px_0_#FF6B6B] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer disabled:opacity-30 shrink-0"
            title="Add +10 minutes delay with schedule reflow"
          >
            +10m
          </button>

          {/* 60s Emergency Filler Script */}
          <button
            type="button"
            onClick={handleOpenFiller}
            className="min-h-[44px] px-3 bg-neo-secondary border-2 border-neo-secondary text-neo-ink font-black text-xs sm:text-sm flex items-center gap-1 shadow-[2px_2px_0_#000] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer shrink-0"
            title="Open 1-minute emergency filler script"
          >
            <FileText size={14} strokeWidth={3} />
            <span className="hidden sm:inline">Filler Script</span>
            <span className="sm:hidden">Filler</span>
          </button>

          {/* Complete and Next Session Button (Primary Action) */}
          <button
            type="button"
            disabled={!liveSession}
            onClick={() => completeSession(liveSession.id, currentTime)}
            className="min-h-[44px] flex-1 bg-neo-accent border-2 border-neo-white text-neo-ink font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[2px_2px_0_#FFF] active:translate-x-[1px] active:translate-y-[1px] cursor-pointer disabled:opacity-40"
          >
            <CheckSquare size={16} strokeWidth={3} />
            <span className="truncate">Complete & Next</span>
            <ArrowRight size={14} strokeWidth={3} className="hidden sm:inline" />
          </button>
        </div>
      </div>

      {/* ─── Emergency Filler Script Modal / Drawer ─── */}
      {fillerModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 bg-neo-ink/70"
        >
          <div className="bg-neo-white border-4 border-neo-ink p-4 sm:p-6 shadow-neo-lg max-w-lg w-full max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b-2 border-neo-ink pb-2 mb-3">
              <span className="font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
                <FileText size={16} strokeWidth={3} className="text-neo-accent" />
                60-Second Anchor Filler Script
              </span>
              <button
                type="button"
                onClick={() => setFillerModalOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer text-neo-ink hover:text-neo-accent"
              >
                <X size={20} strokeWidth={3} />
              </button>
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

                {/* Preset Speed Buttons: 1x, 30x, 60x */}
                <div className="grid grid-cols-3 gap-2">
                  {[1, 30, 60].map((s) => (
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
                    Continuous Multiplier (1x - 60x)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="60"
                    value={speed}
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
                💡 <span className="font-black">Demo Tip:</span> Set speed to <strong>30x or 60x</strong> to watch the live countdown hit zero and turn red as an overrun in just a few seconds!
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
    </div>
  );
}
