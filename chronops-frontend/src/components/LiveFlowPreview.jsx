import { useState } from "react";
import {
  Clock,
  Play,
  CheckCircle,
  AlertTriangle,
  Radio,
  CheckSquare,
} from "lucide-react";
import { Card, Badge, Input } from "./ui";
import Button from "./ui/Button";
import { useApp } from "../hooks/useApp";
import { useSessions } from "../hooks/useSessions";
import { useNotifications } from "../hooks/useNotifications";
import { reflowSchedule } from "../lib/reflow";
import { formatTimeRange, formatDuration } from "../lib/time";

const statusConfig = {
  completed: {
    icon: CheckCircle,
    color: "dark",
    label: "Completed",
    itemBg: "bg-neo-white/60 opacity-80",
  },
  live: {
    icon: Radio,
    color: "accent",
    label: "In Progress",
    itemBg: "bg-neo-accent/15 border-l-8 border-l-neo-accent",
  },
  upcoming: {
    icon: Clock,
    color: "secondary",
    label: "Up Next",
    itemBg: "bg-neo-white",
  },
};

import { INITIAL_EVENTS } from "../data/multiEvents";
import { getStoredEvents } from "../lib/storage";

function loadSavedEvents() {
  const stored = getStoredEvents();
  return stored.length > 0 ? stored : INITIAL_EVENTS;
}

/**
 * LiveFlowPreview:
 * - Compact chronological list with status tags (Completed, In Progress, Up Next)
 * - Speaker, time range, phonetic guide under speaker name, and fixed/flexible badge
 * - Delay controls on the live session (+5m, +10m, custom minutes)
 * - Reflow calculation with single Firestore batch write
 * - Red accent warning banner with Confirm/Cancel step when a fixed session would slip
 * - Start / Complete session controls
 * - Filtered by global search string
 * - Multi-event switching support
 */
export default function LiveFlowPreview({ eventId }) {
  const { searchQuery } = useApp();
  const [events, setEvents] = useState(loadSavedEvents);
  const [selectedEventId, setSelectedEventId] = useState(
    eventId || (events[0] && events[0].id) || "chronops-summit-2026"
  );

  useEffect(() => {
    const handleUpdate = () => {
      const refreshed = loadSavedEvents();
      setEvents(refreshed);
      if (refreshed.length > 0 && !refreshed.some((e) => e.id === selectedEventId)) {
        setSelectedEventId(refreshed[0].id);
      }
    };
    window.addEventListener("clubops-data-updated", handleUpdate);
    return () => window.removeEventListener("clubops-data-updated", handleUpdate);
  }, [selectedEventId]);

  const activeEventId = eventId || selectedEventId;

  const {
    sessions,
    loading,
    startSession,
    completeSession,
    updateSessionsBatch,
  } = useSessions(activeEventId);
  const { addNotification } = useNotifications();

  // Local state for delay inputs and pending reflow warnings
  const [customMinutes, setCustomMinutes] = useState("");
  const [pendingReflow, setPendingReflow] = useState(null); // { sessions, warnings, delta }
  const [isProcessing, setIsProcessing] = useState(false);

  const query = searchQuery.toLowerCase().trim();

  // Sort sessions chronologically by order / start time
  const sortedSessions = [...sessions].sort(
    (a, b) =>
      (a.order || 0) - (b.order || 0) ||
      (a.startTime || "").localeCompare(b.startTime || "")
  );

  // Active live session (if any)
  const liveSession = sortedSessions.find((s) => s.status === "live");

  // First upcoming session
  const upcomingSessions = sortedSessions.filter((s) => s.status === "upcoming");
  const firstUpcoming = upcomingSessions[0] || null;

  // Filter list by global search
  const filteredSessions = sortedSessions.filter((s) => {
    if (!query) return true;
    return (
      s.title?.toLowerCase().includes(query) ||
      s.speaker?.toLowerCase().includes(query) ||
      s.phoneticGuide?.toLowerCase().includes(query) ||
      s.bio?.toLowerCase().includes(query)
    );
  });

  /**
   * Applies delay to the currently live session.
   * Runs pure reflowSchedule calculation.
   * If warnings occur (e.g. fixed anchor slips), shows Confirm/Cancel red banner.
   * If no warnings, immediately persists via batch write.
   */
  const handleApplyDelay = async (deltaMinutes) => {
    const mins = Number(deltaMinutes);
    if (!mins || mins <= 0) return;

    if (!liveSession) {
      alert("No session is currently live. Please start a session first.");
      return;
    }

    const { sessions: reflowed, warnings } = reflowSchedule(
      sessions,
      mins,
      liveSession.id
    );

    if (warnings && warnings.length > 0) {
      // Slip detected: show red accent warning banner for organizer confirmation
      setPendingReflow({
        sessions: reflowed,
        warnings,
        delta: mins,
      });
    } else {
      // Clean reflow: batch persist immediately
      setIsProcessing(true);
      try {
        await updateSessionsBatch(reflowed);
        addNotification({
          message: `Schedule reflowed (+${mins}m) on "${liveSession.title}".`,
          type: "action",
        });
        setCustomMinutes("");
      } catch (err) {
        console.error("Batch update failed:", err);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  /**
   * Confirms the reflow that had warnings.
   */
  const handleConfirmReflow = async () => {
    if (!pendingReflow) return;
    setIsProcessing(true);
    try {
      await updateSessionsBatch(pendingReflow.sessions);
      addNotification({
        message: `Schedule reflow confirmed (+${pendingReflow.delta}m). Fixed sessions protected.`,
        type: "warning",
      });
      setPendingReflow(null);
      setCustomMinutes("");
    } catch (err) {
      console.error("Reflow confirmation failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Cancels the pending reflow.
   */
  const handleCancelReflow = () => {
    setPendingReflow(null);
  };

  return (
    <Card
      headerContent={
        <div className="flex items-center justify-between w-full flex-wrap gap-1">
          <span className="flex items-center gap-2">
            <Clock size={16} strokeWidth={3} />
            Live Flow Preview
          </span>
          <div className="flex items-center gap-2">
            {!eventId && events.length > 1 && (
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="text-[10px] font-black bg-neo-white border border-neo-ink px-1.5 py-0.5 outline-none cursor-pointer"
                title="Select event to preview"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </select>
            )}
            {liveSession ? (
              <span className="flex items-center gap-1.5 bg-neo-accent text-neo-ink px-2 py-0.5 text-[10px] font-black border border-neo-ink">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping inline-block" />
                STAGE LIVE
              </span>
            ) : (
              <span className="bg-neo-bg text-neo-ink/70 px-2 py-0.5 text-[10px] font-black border border-neo-ink">
                STANDBY
              </span>
            )}
          </div>
        </div>
      }
      headerColor="bg-neo-accent"
      noPadding
    >
      <div className="p-3 space-y-3">
        {/* ─── Slip Warning Red Accent Banner ─── */}
        {pendingReflow && (
          <div
            role="alert"
            className="p-3 bg-neo-accent border-4 border-neo-ink shadow-neo text-neo-ink"
          >
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle size={18} strokeWidth={3} className="shrink-0 mt-0.5 text-neo-ink" />
              <div>
                <h4 className="font-black text-xs uppercase tracking-wider text-neo-ink">
                  Fixed Session Slip Warning
                </h4>
                <p className="text-[11px] font-bold text-neo-ink/90 mt-0.5">
                  Adding +{pendingReflow.delta}m overflows into fixed schedule anchors:
                </p>
              </div>
            </div>

            <div className="space-y-1 mb-3">
              {pendingReflow.warnings.map((w, idx) => (
                <div
                  key={idx}
                  className="bg-neo-white p-1.5 border-2 border-neo-ink font-mono text-[11px] font-bold"
                >
                  ⚠️ {w}
                </div>
              ))}
            </div>

            <p className="text-[10px] font-bold uppercase text-neo-ink/80 mb-2">
              Confirming will shift flexible sessions while pinning fixed start times.
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="dark"
                size="sm"
                disabled={isProcessing}
                onClick={handleConfirmReflow}
                className="!h-8 !text-xs !bg-neo-ink !text-neo-white hover:!bg-black cursor-pointer"
              >
                {isProcessing ? "Applying..." : "Confirm Reflow"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isProcessing}
                onClick={handleCancelReflow}
                className="!h-8 !text-xs !bg-neo-white cursor-pointer"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* ─── Live Session Controls Panel ─── */}
        {liveSession ? (
          <div className="p-3 bg-neo-secondary/20 border-4 border-neo-ink shadow-[2px_2px_0_#000]">
            <div className="flex items-center justify-between gap-2 border-b-2 border-neo-ink/20 pb-2 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-neo-accent border border-neo-ink animate-pulse" />
                <span className="font-black text-[11px] uppercase tracking-wider text-neo-ink">
                  Now On Stage
                </span>
              </div>
              <Badge color="accent" className="!text-[9px] !px-1.5 !py-0 !border">
                {liveSession.sessionType.toUpperCase()}
              </Badge>
            </div>

            {/* Title & details */}
            <div className="mb-2.5">
              <h3 className="font-black text-sm text-neo-ink leading-tight">
                {liveSession.title}
              </h3>
              <p className="text-xs font-bold text-neo-ink/80 mt-0.5">
                {liveSession.speaker || "General Session"}
              </p>
              {liveSession.phoneticGuide && (
                <p className="text-[11px] font-bold text-neo-ink/80 mt-0.5">
                  Phonetic: <span className="underline decoration-2">{liveSession.phoneticGuide}</span>
                </p>
              )}
              <div className="text-[10px] font-black text-neo-ink/60 uppercase mt-1 flex items-center gap-2">
                <span>⏱️ {formatTimeRange(liveSession.startTime, liveSession.durationMinutes)}</span>
                <span>({formatDuration(liveSession.durationMinutes)})</span>
              </div>
            </div>

            {/* Delay & Complete Buttons */}
            <div className="space-y-2 pt-1 border-t-2 border-neo-ink/20">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase text-neo-ink/70">
                  Delay Controls:
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isProcessing}
                  onClick={() => completeSession(liveSession.id)}
                  className="!h-7 !px-2.5 !text-[10px]"
                  title="Complete this session and start the next upcoming session"
                >
                  <CheckSquare size={12} strokeWidth={3} />
                  Complete Session
                </Button>
              </div>

              {/* +5m, +10m, custom input */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isProcessing}
                  onClick={() => handleApplyDelay(5)}
                  className="!h-7 !px-2 !text-xs !bg-neo-white"
                >
                  +5m
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isProcessing}
                  onClick={() => handleApplyDelay(10)}
                  className="!h-7 !px-2 !text-xs !bg-neo-white font-black"
                >
                  +10m
                </Button>

                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min="1"
                    max="180"
                    placeholder="Min"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value)}
                    className="!w-14 !h-7 !px-1.5 !py-0 !text-xs !border-2 text-center"
                    aria-label="Custom delay minutes"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isProcessing || !customMinutes || Number(customMinutes) <= 0}
                    onClick={() => handleApplyDelay(customMinutes)}
                    className="!h-7 !px-2 !text-[11px]"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Standby State: No active session */
          <div className="p-3 bg-neo-bg border-4 border-neo-ink shadow-[2px_2px_0_#000] flex items-center justify-between gap-3">
            <div>
              <p className="font-black text-xs uppercase text-neo-ink">Stage On Standby</p>
              <p className="text-[11px] font-bold text-neo-ink/60">
                {firstUpcoming ? `Next: ${firstUpcoming.title}` : "All sessions completed."}
              </p>
            </div>
            {firstUpcoming && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => startSession(firstUpcoming.id)}
                className="!h-8 !text-xs shrink-0"
              >
                <Play size={12} strokeWidth={3} />
                Start Session
              </Button>
            )}
          </div>
        )}

        {/* ─── Chronological Session List ─── */}
        <div className="divide-y-4 divide-neo-ink border-4 border-neo-ink bg-neo-white max-h-[460px] overflow-y-auto">
          {loading && sessions.length === 0 ? (
            <div className="p-6 text-center">
              <p className="font-bold text-xs uppercase tracking-wider text-neo-ink/50 animate-pulse">
                Loading schedule...
              </p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <p className="py-8 px-4 text-center font-bold text-xs uppercase text-neo-ink/40">
              {query ? `No sessions matching "${query}"` : "No sessions found in run-sheet."}
            </p>
          ) : (
            filteredSessions.map((session) => {
              const cfg = statusConfig[session.status] || statusConfig.upcoming;
              const StatusIcon = cfg.icon;

              return (
                <div
                  key={session.id}
                  className={[
                    "p-3 transition-colors",
                    cfg.itemBg,
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-2">
                    {/* Time range & Fixed/Flexible badge */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-xs text-neo-ink shrink-0">
                        {formatTimeRange(session.startTime, session.durationMinutes)}
                      </span>
                      <Badge
                        color={session.sessionType === "fixed" ? "accent" : "muted"}
                        className="!text-[8px] !px-1 !py-0 !border"
                      >
                        {session.sessionType === "fixed" ? "Fixed" : "Flexible"}
                      </Badge>
                    </div>

                    {/* Status Tag: Completed | In Progress | Up Next */}
                    <Badge
                      color={cfg.color}
                      className="!text-[9px] !px-2 !py-0 !border-2 shrink-0 flex items-center gap-1"
                    >
                      <StatusIcon size={10} strokeWidth={3} />
                      {cfg.label}
                    </Badge>
                  </div>

                  {/* Title */}
                  <h4 className="font-black text-xs text-neo-ink mt-1.5 leading-snug">
                    {session.title}
                  </h4>

                  {/* Speaker name */}
                  {session.speaker && (
                    <p className="text-[11px] font-bold text-neo-ink/80 mt-0.5">
                      {session.speaker}
                    </p>
                  )}

                  {/* Phonetic guide under the speaker name */}
                  {session.phoneticGuide && (
                    <p className="text-[11px] font-bold text-neo-ink/70 mt-0.5">
                      Phonetic: <span className="bg-neo-secondary/40 px-1 border border-neo-ink/30 font-semibold">{session.phoneticGuide}</span>
                    </p>
                  )}

                  {/* Row Action Controls */}
                  <div className="flex items-center justify-end gap-2 mt-2 pt-1 border-t border-neo-ink/15">
                    {session.status === "upcoming" && (
                      <button
                        type="button"
                        onClick={() => startSession(session.id)}
                        className="text-[10px] font-black uppercase text-neo-ink hover:text-neo-accent cursor-pointer flex items-center gap-1 bg-neo-bg px-2 py-1 border border-neo-ink shadow-[1px_1px_0_#000] active:translate-x-[1px] active:translate-y-[1px]"
                        aria-label={`Start session ${session.title}`}
                      >
                        <Play size={10} strokeWidth={3} />
                        Start Session
                      </button>
                    )}
                    {session.status === "live" && (
                      <button
                        type="button"
                        onClick={() => completeSession(session.id)}
                        className="text-[10px] font-black uppercase text-neo-ink bg-neo-accent hover:bg-neo-accent/80 cursor-pointer flex items-center gap-1 px-2 py-1 border border-neo-ink shadow-[1px_1px_0_#000] active:translate-x-[1px] active:translate-y-[1px]"
                        aria-label={`Complete session ${session.title}`}
                      >
                        <CheckSquare size={10} strokeWidth={3} />
                        Complete Session
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Card>
  );
}
