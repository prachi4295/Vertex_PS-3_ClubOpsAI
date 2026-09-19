import { useMemo } from "react";
import { Activity, AlertTriangle, CheckCircle, Clock, ShieldAlert, Sparkles } from "lucide-react";
import { Card, Gauge, Badge } from "./ui";
import { useTasks } from "../hooks/useTasks";
import { useSessions } from "../hooks/useSessions";
import { calculateHealthMetrics } from "../lib/health";

/**
 * Event Health Radar with three chunky Neo-brutalist gauges:
 * 1. Task Completion %
 * 2. Volunteer Allocation %
 * 3. Risk Level (Low/Med/High with accent red for High)
 *
 * Updates in real-time as tasks and sessions change via onSnapshot.
 */
export default function HealthRadar() {
  const { tasks } = useTasks();
  const { sessions } = useSessions();

  // Compute live health metrics
  const metrics = useMemo(() => {
    return calculateHealthMetrics(tasks, sessions);
  }, [tasks, sessions]);

  const { taskCompletion, volunteerAllocation, risk, currentDelay } = metrics;
  const { score: riskScore, level: riskLevel, breakdown } = risk;

  // Determine risk gauge color: prompt specifies "Risk uses accent red for High"
  const riskColor =
    riskLevel === "High"
      ? "accent"
      : riskLevel === "Medium"
      ? "secondary"
      : "muted";

  return (
    <Card
      headerContent={
        <span className="flex items-center justify-between w-full">
          <span className="flex items-center gap-2">
            <Activity size={16} strokeWidth={3} />
            Event Health Radar
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
        {/* Three Chunky Gauges in a Row */}
        <div className="grid grid-cols-3 gap-2 justify-items-center py-1">
          {/* Gauge 1: Task Completion % */}
          <Gauge
            value={taskCompletion}
            max={100}
            label="Completion"
            color="secondary"
            size={84}
            tooltip="Done tasks / all tasks. Tracks hackathon milestone velocity (0% if none)."
          />

          {/* Gauge 2: Volunteer Allocation % */}
          <Gauge
            value={volunteerAllocation}
            max={100}
            label="Allocation"
            color="muted"
            size={84}
            tooltip="Non-done tasks with an assignee / all non-done tasks. Unassigned tasks risk being dropped."
          />

          {/* Gauge 3: Risk Level */}
          <Gauge
            value={Math.min(riskScore * 10, 100)}
            max={100}
            displayValue={riskLevel}
            sublabel={riskScore > 0 ? `PTS: ${riskScore}` : "0 PTS"}
            label="Risk Score"
            color={riskColor}
            size={84}
            tooltip="2 pts per overdue task + 1 pt per unassigned task + up to 2 pts for stage delay (≥15m = 2pts, ≥5m = 1pt). Low: 0-2, Medium: 3-5, High: 6+."
          />
        </div>

        {/* Live Risk & Delay Breakdown Notice */}
        <div
          className={[
            "border-3 border-neo-ink p-2.5 transition-colors duration-200",
            riskLevel === "High"
              ? "bg-neo-accent/15 border-neo-accent"
              : riskLevel === "Medium"
              ? "bg-neo-secondary/20"
              : "bg-neo-bg",
          ].join(" ")}
        >
          <div className="flex items-center justify-between mb-1">
            <span
              className={[
                "font-black text-[10px] uppercase tracking-wider flex items-center gap-1",
                riskLevel === "High" ? "text-neo-accent" : "text-neo-ink",
              ].join(" ")}
            >
              {riskLevel === "High" ? (
                <AlertTriangle size={12} strokeWidth={3} />
              ) : (
                <CheckCircle size={12} strokeWidth={3} />
              )}
              {riskLevel === "High" ? "Action Required" : "Operations Status"}
            </span>

            {currentDelay > 0 ? (
              <span className="text-[10px] font-black uppercase text-neo-accent flex items-center gap-0.5">
                <Clock size={10} strokeWidth={3} />
                +{currentDelay}m Overrun
              </span>
            ) : (
              <span className="text-[10px] font-bold uppercase text-neo-ink/50">
                Stage on time
              </span>
            )}
          </div>

          <p className="font-bold text-xs leading-snug text-neo-ink">
            {riskLevel === "High"
              ? `${breakdown.overdueCount} overdue task(s) and ${breakdown.unassignedCount} unassigned task(s) require immediate lead attention.`
              : riskLevel === "Medium"
              ? `${breakdown.unassignedCount} task(s) unassigned. Monitor live stage transitions to prevent cascading delays.`
              : "All systems healthy. Milestone execution is on track."}
          </p>
        </div>
      </div>
    </Card>
  );
}
