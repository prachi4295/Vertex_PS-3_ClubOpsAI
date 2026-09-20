import { useState, useMemo, useEffect } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  ShieldAlert,
  Sparkles,
  UserPlus,
  CalendarClock,
  Send,
  Zap,
} from "lucide-react";
import { Card, Gauge, Badge, Modal } from "./ui";
import Button from "./ui/Button";
import { useTasks } from "../hooks/useTasks";
import { useSessions } from "../hooks/useSessions";
import { useNotifications } from "../hooks/useNotifications";
import { calculateHealthMetrics } from "../lib/health";
import { resolveTimingClashes } from "../lib/time";
import { INITIAL_EVENTS } from "../data/multiEvents";
import VolunteerEmailModal from "./VolunteerEmailModal";

import {
  getStoredEvents,
  getActiveEventId,
} from "../lib/storage";

const DEMO_EVENT_IDS = ["chronops-summit-2026", "ai-summit-2026", "club-orientation-2026"];
const AVAILABLE_VOLUNTEERS = ["Rahul", "Priya", "Kavita", "Arjun", "Neha", "Vikram"];

function loadSavedEvents() {
  return getStoredEvents();
}

export default function HealthRadar({ eventId }) {
  const [events, setEvents] = useState(loadSavedEvents);
  const [activeEventId, setActiveEventId] = useState(() => {
    const stored = getActiveEventId();
    if (stored && !DEMO_EVENT_IDS.includes(stored)) return stored;
    return eventId || (events[0] && events[0].id) || "";
  });

  useEffect(() => {
    const handleEventsUpdate = () => {
      const refreshed = loadSavedEvents();
      setEvents(refreshed);
      const stored = getActiveEventId();
      if (stored && refreshed.some((e) => e.id === stored)) {
        setActiveEventId(stored);
      }
    };
    window.addEventListener("clubops-data-updated", handleEventsUpdate);
    return () => window.removeEventListener("clubops-data-updated", handleEventsUpdate);
  }, []);

  const activeEvent = events.find((e) => e.id === activeEventId) || events[0];

  const { tasks, updateTask } = useTasks(activeEvent?.id || activeEventId);
  const { sessions, updateSessionsBatch } = useSessions(activeEvent?.id || activeEventId);
  const { addNotification } = useNotifications();

  const [solveModalOpen, setSolveModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [resolvingAction, setResolvingAction] = useState(null);

  // Compute live health metrics
  const metrics = useMemo(() => {
    return calculateHealthMetrics(tasks, sessions);
  }, [tasks, sessions]);

  const { taskCompletion, volunteerAllocation, risk, currentDelay } = metrics;
  const { score: riskScore, level: riskLevel, breakdown } = risk;

  const isAtRisk = riskLevel === "High" || riskLevel === "Medium" || (breakdown.clashesCount > 0);

  // 0. Auto-Resolve Stage Timing Clashes
  const handleAutoResolveClashes = async () => {
    setResolvingAction("clashes");
    try {
      const fixedSessions = resolveTimingClashes(sessions);
      await updateSessionsBatch(fixedSessions);
      addNotification({
        message: `Auto-reflowed schedule: resolved ${breakdown.clashesCount || 1} timing clash(es).`,
        type: "action",
      });
      setSolveModalOpen(false);
    } catch (err) {
      console.warn("Auto-resolve clashes error:", err);
    } finally {
      setResolvingAction(null);
    }
  };

  // 1. Auto-Allocate Volunteers to Unassigned Tasks
  const handleAutoAllocate = async () => {
    setResolvingAction("allocate");
    try {
      const unassigned = tasks.filter(
        (t) => t.status !== "done" && (!t.assignee || !t.assignee.trim())
      );

      for (let i = 0; i < unassigned.length; i++) {
        const volunteer = AVAILABLE_VOLUNTEERS[i % AVAILABLE_VOLUNTEERS.length];
        await updateTask(unassigned[i].id, { assignee: volunteer });
      }

      addNotification({
        message: `Auto-allocated ${unassigned.length} task(s) across volunteers.`,
        type: "action",
      });
      setSolveModalOpen(false);
    } catch (err) {
      console.warn("Auto-allocate error:", err);
    } finally {
      setResolvingAction(null);
    }
  };

  // 2. Extend Overdue Deadlines
  const handleExtendDeadlines = async () => {
    setResolvingAction("extend");
    try {
      const now = new Date();
      const overdue = tasks.filter((t) => {
        if (t.status === "done" || !t.dueDate) return false;
        const due = new Date(t.dueDate);
        return due < now;
      });

      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      for (const t of overdue) {
        await updateTask(t.id, { dueDate: tomorrow, dueTime: "18:00" });
      }

      addNotification({
        message: `Extended deadlines for ${overdue.length} overdue task(s) to tomorrow 18:00.`,
        type: "action",
      });
      setSolveModalOpen(false);
    } catch (err) {
      console.warn("Extend deadlines error:", err);
    } finally {
      setResolvingAction(null);
    }
  };

  // 3. Re-buffer Stage Schedule
  const handleBufferStage = async () => {
    setResolvingAction("buffer");
    try {
      const upcoming = sessions.filter((s) => s.status === "upcoming");
      if (upcoming.length > 0) {
        const buffered = upcoming.map((s) => {
          const [h, m] = (s.startTime || "10:00").split(":").map(Number);
          const totalMins = h * 60 + m + 15;
          const newH = Math.floor(totalMins / 60) % 24;
          const newM = totalMins % 60;
          return {
            ...s,
            startTime: `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`,
          };
        });
        await updateSessionsBatch(buffered);
        addNotification({
          message: `Injected 15-minute recovery buffer into ${upcoming.length} upcoming stage sessions.`,
          type: "action",
        });
      }
      setSolveModalOpen(false);
    } catch (err) {
      console.warn("Buffer stage error:", err);
    } finally {
      setResolvingAction(null);
    }
  };

  return (
    <>
      <Card
        headerContent={
          <span className="flex items-center justify-between w-full">
            <span className="flex items-center gap-2">
              <Activity size={16} strokeWidth={3} />
              <span>Event Health Radar</span>
              {activeEvent?.name && (
                <span className="text-[11px] font-medium text-neo-ink/70 hidden sm:inline">
                  — {activeEvent.name}
                </span>
              )}
            </span>
            <Badge
              color={riskLevel === "High" ? "accent" : riskLevel === "Medium" ? "secondary" : "muted"}
              className="!text-[9px] !px-2 !py-0 !border-2"
            >
              {riskLevel} Risk
            </Badge>
          </span>
        }
        headerColor={riskLevel === "High" ? "bg-neo-accent text-neo-white" : "bg-neo-secondary text-neo-ink"}
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b-2 border-neo-ink/10 pb-2">
            <span className="text-xs font-black uppercase tracking-wider text-neo-ink">
              Operational Readiness & Risk Radar
            </span>
            <span className="text-[10px] font-bold text-neo-ink/60 uppercase">
              {tasks.length} tasks • {sessions.length} sessions
            </span>
          </div>

          {/* ─── Chunky Gauges Row ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 justify-items-center bg-neo-bg/30 p-3 border-2 border-neo-ink">
            <Gauge
              value={taskCompletion}
              max={100}
              label="Completion"
              color="secondary"
              size={80}
              tooltip="Done tasks / all tasks."
            />

            <Gauge
              value={volunteerAllocation}
              max={100}
              label="Allocation"
              color="muted"
              size={80}
              tooltip="Assigned tasks / active tasks."
            />

            <Gauge
              value={Math.min(riskScore * 10, 100)}
              max={100}
              displayValue={riskLevel}
              sublabel={riskScore > 0 ? `${riskScore} PTS` : "0 PTS"}
              label="Risk Level"
              color={riskLevel === "High" ? "accent" : riskLevel === "Medium" ? "secondary" : "muted"}
              size={80}
              tooltip="Overdue tasks + unassigned tasks + stage delay."
            />
          </div>

          {/* Status Alert & Quick Mitigation Banner */}
          <div
            className={[
              "p-3 border-2 border-neo-ink text-xs transition-all",
              riskLevel === "High"
                ? "bg-neo-accent/15 border-neo-accent"
                : riskLevel === "Medium"
                ? "bg-neo-secondary/25"
                : "bg-neo-bg/60",
            ].join(" ")}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-black text-xs uppercase flex items-center gap-1.5">
                {riskLevel === "High" ? (
                  <AlertTriangle size={14} className="text-neo-accent" strokeWidth={3} />
                ) : (
                  <CheckCircle size={14} className="text-emerald-700" strokeWidth={3} />
                )}
                <span>{riskLevel} Operational Risk</span>
              </span>

              {currentDelay > 0 ? (
                <span className="text-[11px] font-black uppercase text-neo-accent bg-neo-white px-1.5 py-0.5 border border-neo-ink">
                  +{currentDelay}m delay
                </span>
              ) : (
                <span className="text-[11px] font-bold text-emerald-800 bg-neo-white px-1.5 py-0.5 border border-neo-ink">
                  On schedule
                </span>
              )}
            </div>

            <p className="text-[11px] font-medium leading-tight text-neo-ink/85">
              {breakdown.clashesCount > 0
                ? `${breakdown.clashesCount} timing clash(es) detected in stage run-sheet!`
                : riskLevel === "High"
                ? `${breakdown.overdueCount} overdue and ${breakdown.unassignedCount} unassigned tasks require immediate attention.`
                : riskLevel === "Medium"
                ? `${breakdown.unassignedCount} unassigned task(s). Keep track of live stage transitions.`
                : "All operational vectors are within healthy thresholds."}
            </p>

            {/* Timing Clashes Quick Alert */}
            {breakdown.clashesCount > 0 && (
              <div className="mt-2 p-2 bg-neo-accent text-neo-white font-black text-[11px] border-2 border-neo-ink flex items-center justify-between gap-2 shadow-[2px_2px_0_#000]">
                <span className="flex items-center gap-1.5 min-w-0">
                  <AlertTriangle size={13} strokeWidth={3} className="shrink-0 text-neo-bg" />
                  <span className="truncate">
                    {breakdown.clashesCount} Timing Clash{breakdown.clashesCount > 1 ? "es" : ""} ({breakdown.clashes.map(c => `${c.overlapMinutes}m`).join(", ")})
                  </span>
                </span>
                <button
                  type="button"
                  onClick={handleAutoResolveClashes}
                  disabled={resolvingAction === "clashes"}
                  className="bg-neo-bg text-neo-ink px-2 py-0.5 border border-neo-ink text-[10px] font-black uppercase hover:bg-neo-white active:translate-x-[1px] active:translate-y-[1px] shrink-0 cursor-pointer"
                  title="Automatically adjust start times to fix overlaps"
                >
                  {resolvingAction === "clashes" ? "Reflowing..." : "⚡ Auto-Reflow"}
                </button>
              </div>
            )}

            {isAtRisk && (
              <div className="mt-2 pt-2 border-t border-neo-ink/20 flex items-center justify-between">
                <span className="text-[10px] font-bold text-neo-ink/70">Remediate risk:</span>
                <button
                  type="button"
                  onClick={() => setSolveModalOpen(true)}
                  className="text-[10px] font-black uppercase bg-neo-accent text-neo-white px-2.5 py-1 border border-neo-ink shadow-[2px_2px_0_#000] hover:shadow-none active:translate-x-[1px] active:translate-y-[1px] cursor-pointer"
                >
                  ⚡ Solve Issue with AI
                </button>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ─── Incident Resolution Prompt Modal ─── */}
      <Modal
        open={solveModalOpen}
        onClose={() => setSolveModalOpen(false)}
        title="Event Health Radar: Risk Mitigation"
      >
        <div className="space-y-4">
          <div className="p-3 bg-neo-accent/20 border-2 border-neo-accent text-neo-ink text-xs font-bold leading-relaxed">
            <span className="font-black text-neo-accent uppercase block mb-1">
              ⚠️ Radar Alert: Risk Level {riskLevel.toUpperCase()} ({riskScore} PTS)
            </span>
            Detected {breakdown.clashesCount > 0 ? `${breakdown.clashesCount} timing clash(es), ` : ""}{breakdown.overdueCount} overdue task(s), {breakdown.unassignedCount} unassigned task(s), and {currentDelay}m of stage overrun. Select an automated mitigation plan to bring the event back to Green:
          </div>

          {/* Quick Resolution Actions */}
          <div className="space-y-2.5">
            {/* Action 0: Auto-Reflow Timing Clashes */}
            {breakdown.clashesCount > 0 && (
              <div className="p-3 bg-neo-accent/15 border-2 border-neo-accent shadow-[2px_2px_0_#000] flex items-center justify-between gap-3">
                <div className="space-y-1 min-w-0 flex-1">
                  <span className="font-black text-xs uppercase flex items-center gap-1.5 text-neo-accent">
                    <Zap size={14} strokeWidth={3} />
                    Auto-Reflow Stage Clashes ({breakdown.clashesCount} Overlap{breakdown.clashesCount > 1 ? "s" : ""})
                  </span>
                  <p className="text-[11px] font-bold text-neo-ink/80">
                    Recalculates subsequent session start times to eliminate overlapping schedules.
                  </p>
                  <div className="space-y-0.5 pt-0.5">
                    {breakdown.clashes.map((c, i) => (
                      <div key={i} className="text-[10px] text-neo-accent font-black">
                        • &quot;{c.currentTitle}&quot; overlaps &quot;{c.nextTitle}&quot; by {c.overlapMinutes}m ({c.currentEndTime} &gt; {c.nextStartTime})
                      </div>
                    ))}
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={resolvingAction === "clashes"}
                  onClick={handleAutoResolveClashes}
                  className="!text-xs shrink-0 !bg-neo-accent !text-neo-white"
                >
                  {resolvingAction === "clashes" ? "Reflowing..." : "⚡ Fix Clashes"}
                </Button>
              </div>
            )}
            {/* Action 1: Auto-allocate volunteers */}
            <div className="p-3 bg-neo-white border-2 border-neo-ink shadow-[2px_2px_0_#000] flex items-center justify-between gap-3">
              <div>
                <span className="font-black text-xs uppercase flex items-center gap-1.5 text-neo-ink">
                  <UserPlus size={14} strokeWidth={3} className="text-neo-accent" />
                  Auto-Allocate Volunteers
                </span>
                <p className="text-[11px] font-bold text-neo-ink/70 mt-0.5">
                  Distributes {breakdown.unassignedCount} unassigned tasks evenly across active volunteers (Rahul, Priya, Kavita, etc.).
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                disabled={resolvingAction === "allocate" || breakdown.unassignedCount === 0}
                onClick={handleAutoAllocate}
                className="!text-xs shrink-0"
              >
                {resolvingAction === "allocate" ? "Assigning..." : "Auto-Assign"}
              </Button>
            </div>

            {/* Action 2: Extend Overdue Deadlines */}
            <div className="p-3 bg-neo-white border-2 border-neo-ink shadow-[2px_2px_0_#000] flex items-center justify-between gap-3">
              <div>
                <span className="font-black text-xs uppercase flex items-center gap-1.5 text-neo-ink">
                  <CalendarClock size={14} strokeWidth={3} className="text-neo-secondary" />
                  Extend Overdue Deadlines (+24h)
                </span>
                <p className="text-[11px] font-bold text-neo-ink/70 mt-0.5">
                  Pushes deadlines for {breakdown.overdueCount} overdue task(s) to tomorrow 18:00 to clear bottlenecks.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                disabled={resolvingAction === "extend" || breakdown.overdueCount === 0}
                onClick={handleExtendDeadlines}
                className="!text-xs shrink-0 !bg-neo-secondary"
              >
                {resolvingAction === "extend" ? "Extending..." : "Extend +24h"}
              </Button>
            </div>

            {/* Action 3: Buffer Stage Timing */}
            <div className="p-3 bg-neo-white border-2 border-neo-ink shadow-[2px_2px_0_#000] flex items-center justify-between gap-3">
              <div>
                <span className="font-black text-xs uppercase flex items-center gap-1.5 text-neo-ink">
                  <Clock size={14} strokeWidth={3} className="text-neo-accent" />
                  Buffer Stage Run-Sheet (+15m)
                </span>
                <p className="text-[11px] font-bold text-neo-ink/70 mt-0.5">
                  Inserts a 15-minute recovery buffer into upcoming sessions to absorb the current {currentDelay}m delay.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={resolvingAction === "buffer"}
                onClick={handleBufferStage}
                className="!text-xs shrink-0"
              >
                {resolvingAction === "buffer" ? "Buffering..." : "Add Buffer"}
              </Button>
            </div>

            {/* Action 4: Broadcast Alert to Volunteers */}
            <div className="p-3 bg-neo-white border-2 border-neo-ink shadow-[2px_2px_0_#000] flex items-center justify-between gap-3">
              <div>
                <span className="font-black text-xs uppercase flex items-center gap-1.5 text-neo-ink">
                  <Send size={14} strokeWidth={3} className="text-neo-ink" />
                  Broadcast Volunteer Alert Email
                </span>
                <p className="text-[11px] font-bold text-neo-ink/70 mt-0.5">
                  Dispatches an email alert to volunteer staff requesting immediate assistance.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSolveModalOpen(false);
                  setEmailModalOpen(true);
                }}
                className="!text-xs shrink-0"
              >
                Email Crew
              </Button>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t-2 border-neo-ink/20">
            <Button variant="outline" size="sm" onClick={() => setSolveModalOpen(false)} className="!text-xs">
              Dismiss
            </Button>
          </div>
        </div>
      </Modal>

      {/* Volunteer Broadcast Modal */}
      <VolunteerEmailModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        defaultContext={`OPERATIONAL ALERT: Event Health Radar is currently ${riskLevel} Risk. Please check urgent stage tasks immediately.`}
      />
    </>
  );
}
