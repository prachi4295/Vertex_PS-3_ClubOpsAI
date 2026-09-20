import { useState, useMemo, useEffect } from "react";
import { Clock, CheckCircle2, Radio, Plus, RefreshCw, AlertTriangle, X, Zap } from "lucide-react";
import { Badge } from "./ui";
import { useApp } from "../hooks/useApp";
import { useSessions } from "../hooks/useSessions";
import { useNotifications } from "../hooks/useNotifications";
import { formatTimeRange, formatDuration, detectTimingClashes, resolveTimingClashes } from "../lib/time";
import { INITIAL_EVENTS } from "../data/multiEvents";

import {
  getStoredEvents,
  getActiveEventId,
  saveActiveEventId,
} from "../lib/storage";

const DEMO_EVENT_IDS = ["chronops-summit-2026", "ai-summit-2026", "club-orientation-2026"];

function loadSavedEvents() {
  return getStoredEvents();
}

export default function LiveFlowView({ eventId }) {
  const { searchQuery } = useApp();
  const { addNotification } = useNotifications();
  const [events, setEvents] = useState(loadSavedEvents);
  const [selectedEventId, setSelectedEventId] = useState(() => {
    const activeStored = getActiveEventId();
    if (activeStored && !DEMO_EVENT_IDS.includes(activeStored)) return activeStored;
    return eventId || (events[0] && events[0].id) || "";
  });

  const [customSessionId, setCustomSessionId] = useState(null);
  const [customMinutes, setCustomMinutes] = useState("15");
  const [autoReflow, setAutoReflow] = useState(true);

  useEffect(() => {
    const handleUpdate = () => {
      const refreshed = loadSavedEvents();
      setEvents(refreshed);
      const activeStored = getActiveEventId();
      if (activeStored && refreshed.some((e) => e.id === activeStored)) {
        setSelectedEventId(activeStored);
      } else if (refreshed[0]) {
        setSelectedEventId(refreshed[0].id);
      }
    };
    window.addEventListener("clubops-data-updated", handleUpdate);
    return () => window.removeEventListener("clubops-data-updated", handleUpdate);
  }, []);

  const activeEventId = eventId || selectedEventId;
  const activeEvent = events.find((e) => e.id === activeEventId) || events[0] || null;

  const {
    sessions,
    loading,
    startSession,
    completeSession,
    updateSession,
    updateSessionsBatch,
  } = useSessions(activeEventId);

  // Detect schedule timing clashes/overlaps
  const clashes = useMemo(() => {
    return detectTimingClashes(sessions);
  }, [sessions]);

  // Handle duration increase (+5m, +10m, +15m, custom)
  const handleAddDuration = async (session, minutesToAdd) => {
    const mins = Number(minutesToAdd);
    if (!mins || mins <= 0) return;
    const newDuration = Number(session.durationMinutes || 30) + mins;

    if (!autoReflow) {
      await updateSession(session.id, { durationMinutes: newDuration });
      addNotification({
        message: `Extended "${session.title}" by +${mins}m (Duration: ${formatDuration(newDuration)}).`,
        type: "action",
      });
      return;
    }

    // Auto-reflow subsequent sessions so they do not overlap
    const updatedSessions = sessions.map((s) =>
      s.id === session.id ? { ...s, durationMinutes: newDuration } : s
    );
    const reflowed = resolveTimingClashes(updatedSessions);
    await updateSessionsBatch(reflowed);
    addNotification({
      message: `Extended "${session.title}" by +${mins}m and auto-reflowed schedule.`,
      type: "action",
    });
  };

  // Handle manual resolve of all clashes
  const handleFixAllClashes = async () => {
    const reflowed = resolveTimingClashes(sessions);
    await updateSessionsBatch(reflowed);
    addNotification({
      message: `Auto-reflowed schedule: resolved ${clashes.length || 1} timing clash(es).`,
      type: "action",
    });
  };

  const query = searchQuery.toLowerCase().trim();

  // Sort sessions chronologically
  const sortedSessions = useMemo(() => {
    return [...sessions].sort(
      (a, b) =>
        (a.order || 0) - (b.order || 0) ||
        (a.startTime || "").localeCompare(b.startTime || "")
    );
  }, [sessions]);

  // Display sessions:
  // 1. In-progress (live) session at the top
  // 2. Upcoming sessions in chronological order
  // 3. Completed sessions moved to the bottom of all sessions
  const displaySessions = useMemo(() => {
    const filtered = sortedSessions.filter((s) => {
      if (!query) return true;
      return (
        s.title?.toLowerCase().includes(query) ||
        s.speaker?.toLowerCase().includes(query) ||
        s.phoneticGuide?.toLowerCase().includes(query)
      );
    });

    const live = filtered.filter((s) => s.status === "live");
    const upcoming = filtered.filter(
      (s) => s.status === "upcoming" || (s.status !== "live" && s.status !== "completed")
    );
    const completed = filtered.filter((s) => s.status === "completed");

    return [...live, ...upcoming, ...completed];
  }, [sortedSessions, query]);

  return (
    <div className="bg-neo-white border-4 border-neo-ink shadow-neo p-5 sm:p-6 space-y-5">
      {/* ─── Header: Live Event Flow ─── */}
      <div className="border-b-2 border-neo-ink/20 pb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-neo-accent border-2 border-neo-ink animate-pulse" />
            <span className="font-bold text-xs text-neo-accent tracking-wide">
              Live Event Flow
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neo-ink mt-1">
            {activeEvent ? `${activeEvent.name} – Live Flow` : "Live Event Flow"}
          </h2>
          <p className="text-xs font-medium text-neo-ink/60 mt-0.5">
            {activeEvent ? `${activeEvent.date || ""} • ${activeEvent.location || "Main Stage"}` : "Select or create an event to view schedule"}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Auto-Reflow Mode Toggle */}
          <button
            type="button"
            onClick={() => setAutoReflow(!autoReflow)}
            className={`text-[11px] font-black uppercase px-2.5 py-1 border-2 border-neo-ink shadow-[2px_2px_0_#000] cursor-pointer flex items-center gap-1.5 transition-all ${
              autoReflow
                ? "bg-neo-secondary text-neo-ink"
                : "bg-neo-bg text-neo-ink/60"
            }`}
            title="When enabled, extending duration shifts downstream sessions to avoid overlaps"
          >
            <Zap size={12} strokeWidth={3} className={autoReflow ? "text-neo-ink fill-neo-ink" : "text-neo-ink/40"} />
            Auto-Reflow: {autoReflow ? "ON" : "OFF"}
          </button>

          {events.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-neo-ink/70 uppercase">Event:</span>
              <select
                value={activeEventId}
                onChange={(e) => {
                  setSelectedEventId(e.target.value);
                  saveActiveEventId(e.target.value);
                }}
                className="text-xs font-bold bg-neo-white border-2 border-neo-ink px-2.5 py-1 shadow-[2px_2px_0_#000] cursor-pointer focus:outline-none"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ─── Global Timing Clash Warning Banner ─── */}
      {clashes.length > 0 && (
        <div className="p-3 bg-neo-accent text-neo-white border-3 border-neo-ink shadow-[3px_3px_0_#000] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertTriangle size={20} strokeWidth={3} className="shrink-0 text-neo-bg" />
            <div>
              <h4 className="font-black text-xs sm:text-sm uppercase tracking-wide">
                {clashes.length} Schedule Timing Clash{clashes.length > 1 ? "es" : ""} Detected!
              </h4>
              <p className="text-[11px] font-medium text-neo-white/90">
                {clashes.map((c) => `"${c.currentTitle}" overlaps "${c.nextTitle}" by ${c.overlapMinutes}m`).join(" • ")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleFixAllClashes}
            className="px-3 py-1.5 bg-neo-bg text-neo-ink font-black text-xs uppercase border-2 border-neo-ink shadow-[2px_2px_0_#000] hover:bg-neo-white active:translate-x-[1px] active:translate-y-[1px] cursor-pointer shrink-0"
          >
            ⚡ Fix All Clashes (AI Reflow)
          </button>
        </div>
      )}

      {/* ─── Sessions List ─── */}
      <div className="space-y-3.5">
        {loading && sessions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-semibold text-xs text-neo-ink/50 animate-pulse">
              Loading schedule...
            </p>
          </div>
        ) : displaySessions.length === 0 ? (
          <div className="p-6 text-center bg-neo-bg border-2 border-neo-ink">
            <p className="font-semibold text-xs text-neo-ink/70">
              {query ? `No sessions matching "${query}"` : "No sessions found in run-sheet."}
            </p>
          </div>
        ) : (
          displaySessions.map((session) => {
            const isLive = session.status === "live";
            const isCompleted = session.status === "completed";
            const isUpcoming = session.status === "upcoming";

            // Check if this session clashes with the next
            const clashCurrent = clashes.find((c) => c.currentId === session.id);

            return (
              <div
                key={session.id}
                className={[
                  "p-4 sm:p-5 border-3 border-neo-ink transition-all duration-100",
                  isLive
                    ? "bg-neo-secondary/30 border-l-8 border-l-neo-accent shadow-[3px_3px_0_#0F172A]"
                    : isCompleted
                    ? "bg-neo-bg/60 shadow-[2px_2px_0_#0F172A] opacity-85"
                    : "bg-neo-white shadow-[2px_2px_0_#0F172A] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo-sm",
                ].join(" ")}
              >
                {/* Session Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold text-neo-ink leading-snug">
                      {session.title}
                    </h3>

                    <p className="text-sm font-medium text-neo-ink/85">
                      Speaker: <span className="font-bold text-neo-ink">{session.speaker || "General Stage"}</span>
                    </p>

                    <p className="text-xs font-semibold text-neo-ink/70 flex items-center gap-1.5 pt-0.5">
                      <Clock size={13} strokeWidth={2.5} />
                      {formatTimeRange(session.startTime, session.durationMinutes).replace(" - ", " – ")}
                      {session.durationMinutes ? ` (${formatDuration(session.durationMinutes)})` : ""}
                    </p>
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0">
                    {isLive && (
                      <Badge
                        color="accent"
                        className="!text-xs !px-3 !py-1 !border-2 font-bold flex items-center gap-1.5"
                      >
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                        In Progress
                      </Badge>
                    )}

                    {isCompleted && (
                      <Badge
                        color="dark"
                        className="!text-xs !px-3 !py-1 !border-2 font-bold"
                      >
                        Completed
                      </Badge>
                    )}

                    {isUpcoming && (
                      <Badge
                        color="secondary"
                        className="!text-xs !px-2.5 !py-1 !border-2 font-bold"
                      >
                        Upcoming
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Clash Warning for this specific session */}
                {clashCurrent && (
                  <div className="mt-2.5 p-2 bg-neo-accent/15 border-2 border-neo-accent text-neo-ink text-xs flex flex-wrap items-center justify-between gap-2 shadow-[2px_2px_0_#000]">
                    <div className="flex items-center gap-1.5 font-bold min-w-0">
                      <AlertTriangle size={14} className="text-neo-accent shrink-0" strokeWidth={3} />
                      <span className="truncate">
                        Timing Clash: Overlaps &quot;{clashCurrent.nextTitle}&quot; by {clashCurrent.overlapMinutes}m ({clashCurrent.currentEndTime} &gt; {clashCurrent.nextStartTime})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleFixAllClashes}
                      className="text-[10px] font-black uppercase bg-neo-accent text-neo-white px-2.5 py-1 border border-neo-ink shadow-[1px_1px_0_#000] hover:shadow-none active:translate-x-[1px] active:translate-y-[1px] cursor-pointer shrink-0"
                    >
                      ⚡ Fix Clash (Reflow)
                    </button>
                  </div>
                )}

                {/* Session Operations Controls: Mark Completed, Start, Increase Time Limit */}
                <div className="pt-2.5 mt-2.5 border-t border-neo-ink/15 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {isUpcoming && (
                      <button
                        type="button"
                        onClick={() => startSession(session.id)}
                        className="text-[11px] font-bold uppercase bg-neo-accent text-neo-white px-2.5 py-1 border border-neo-ink shadow-[1px_1px_0_#000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer flex items-center gap-1"
                        title="Start this session now"
                      >
                        <Radio size={11} strokeWidth={3} />
                        Start Session
                      </button>
                    )}

                    {(isLive || isUpcoming) && (
                      <button
                        type="button"
                        onClick={() => completeSession(session.id)}
                        className="text-[11px] font-bold uppercase bg-neo-white text-neo-ink px-2.5 py-1 border border-neo-ink shadow-[1px_1px_0_#000] hover:bg-neo-bg cursor-pointer flex items-center gap-1"
                        title="Mark session as completed"
                      >
                        <CheckCircle2 size={11} strokeWidth={2.5} />
                        Mark Completed
                      </button>
                    )}

                    {isCompleted && (
                      <button
                        type="button"
                        onClick={() => updateSession(session.id, { status: "upcoming" })}
                        className="text-[11px] font-bold uppercase bg-neo-white text-neo-ink/70 px-2 py-0.5 border border-neo-ink shadow-[1px_1px_0_#000] hover:bg-neo-bg cursor-pointer"
                        title="Reopen completed session"
                      >
                        Reopen
                      </button>
                    )}
                  </div>

                  {/* Increase Time Limit Controls: +5m, +10m, +15m, + Custom */}
                  {!isCompleted && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold uppercase text-neo-ink/60 mr-0.5">Time:</span>
                      <button
                        type="button"
                        onClick={() => handleAddDuration(session, 5)}
                        className="text-[11px] font-bold uppercase bg-neo-secondary text-neo-ink px-2 py-0.5 border border-neo-ink shadow-[1px_1px_0_#000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer"
                        title="Extend session duration by 5 minutes"
                      >
                        +5m
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddDuration(session, 10)}
                        className="text-[11px] font-bold uppercase bg-neo-secondary text-neo-ink px-2 py-0.5 border border-neo-ink shadow-[1px_1px_0_#000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer"
                        title="Extend session duration by 10 minutes"
                      >
                        +10m
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddDuration(session, 15)}
                        className="text-[11px] font-bold uppercase bg-neo-secondary text-neo-ink px-2 py-0.5 border border-neo-ink shadow-[1px_1px_0_#000] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] cursor-pointer"
                        title="Extend session duration by 15 minutes"
                      >
                        +15m
                      </button>

                      {customSessionId === session.id ? (
                        <div className="inline-flex items-center gap-1 bg-neo-bg p-0.5 border border-neo-ink">
                          <input
                            type="number"
                            min="1"
                            max="180"
                            value={customMinutes}
                            onChange={(e) => setCustomMinutes(e.target.value)}
                            placeholder="Mins"
                            autoFocus
                            className="w-14 h-5 px-1 text-[11px] font-bold bg-neo-white border border-neo-ink text-center focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const mins = parseInt(customMinutes, 10);
                              if (mins > 0) {
                                handleAddDuration(session, mins);
                                setCustomSessionId(null);
                              }
                            }}
                            className="h-5 px-1.5 text-[10px] font-black uppercase bg-neo-accent text-neo-white border border-neo-ink hover:bg-neo-accent/90 cursor-pointer"
                          >
                            +Add
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustomSessionId(null)}
                            className="h-5 px-1 text-[10px] font-bold bg-neo-white border border-neo-ink text-neo-ink hover:bg-neo-bg cursor-pointer"
                            title="Cancel"
                          >
                            <X size={10} strokeWidth={3} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomSessionId(session.id);
                            setCustomMinutes("15");
                          }}
                          className="text-[11px] font-bold uppercase bg-neo-white text-neo-ink px-2 py-0.5 border border-neo-ink shadow-[1px_1px_0_#000] hover:bg-neo-bg cursor-pointer flex items-center gap-0.5"
                          title="Custom duration extension"
                        >
                          <Plus size={11} strokeWidth={3} />
                          Custom
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
