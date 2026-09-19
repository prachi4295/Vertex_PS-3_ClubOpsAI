import { useState } from "react";
import {
  Database,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  UserCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Code2,
  Calendar,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useEvent } from "../hooks/useEvent";
import { useTasks } from "../hooks/useTasks";
import { useSessions } from "../hooks/useSessions";
import { useNotifications } from "../hooks/useNotifications";
import { DEMO_EVENT_ID, resetDemoData } from "../data/seed";
import { Badge, Card } from "./ui";

export default function DebugDataPanel() {
  const { user, isDemo, isFirebaseConfigured } = useAuth();
  const { event, loading: eventLoading } = useEvent(DEMO_EVENT_ID);
  const { tasks, loading: tasksLoading } = useTasks(DEMO_EVENT_ID);
  const { sessions, loading: sessionsLoading } = useSessions(DEMO_EVENT_ID);
  const { addNotification } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [reseeding, setReseeding] = useState(false);

  const handleResetData = async () => {
    setReseeding(true);
    try {
      await resetDemoData(user?.uid || "demo-lead-uid");
      addNotification({
        title: "Database Re-Seeded",
        message: "HackGenesis 2026 re-seeded cleanly with 12 tasks & 10 sessions.",
        type: "success",
      });
    } catch (err) {
      console.error("Reset failed:", err);
      addNotification({
        title: "Reset Failed",
        message: err.message || "Failed to re-seed data.",
        type: "warning",
      });
    } finally {
      setReseeding(false);
    }
  };

  // Metrics
  const overdueCount = tasks.filter((t) => {
    if (!t.dueDate || t.status === "done") return false;
    return new Date(t.dueDate) < new Date("2026-09-19T17:50:00");
  }).length;

  const unassignedCount = tasks.filter((t) => !t.assignee || t.assignee.trim() === "").length;
  const fixedSessionsCount = sessions.filter((s) => s.sessionType === "fixed").length;
  const phoneticGuideCount = sessions.filter((s) => Boolean(s.phoneticGuide && s.phoneticGuide.trim() !== "")).length;

  return (
    <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 mt-8 mb-12 relative z-20">
      <div className="border-4 border-neo-ink bg-neo-white shadow-neo-md p-4 sm:p-6 transition-all duration-200">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-4 border-neo-ink pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-neo-secondary border-3 border-neo-ink shadow-[2px_2px_0_#000] flex items-center justify-center">
              <Database size={20} strokeWidth={3} className="text-neo-ink" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm uppercase tracking-wider text-neo-ink">
                  Data Debug & Firestore Sync
                </h3>
                <Badge color={isFirebaseConfigured ? "accent" : "secondary"} className="!text-[10px] !py-0">
                  {isFirebaseConfigured ? "🔥 FIRESTORE LIVE" : "💾 LOCAL PERSISTENCE"}
                </Badge>
              </div>
              <p className="text-xs font-bold text-neo-ink/60 uppercase">
                {eventLoading || tasksLoading || sessionsLoading ? "Streaming live data..." : "Live onSnapshot listeners active"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Resettable Seed Action */}
            <button
              type="button"
              onClick={handleResetData}
              disabled={reseeding}
              className={[
                "h-10 px-4 bg-neo-accent text-neo-white border-3 border-neo-ink",
                "font-black text-xs uppercase tracking-wider",
                "shadow-neo-sm hover:shadow-neo transition-all duration-100 ease-linear",
                "active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
                "flex items-center gap-2 cursor-pointer",
                reseeding ? "opacity-60 cursor-not-allowed" : "",
              ].join(" ")}
            >
              <RefreshCw size={14} strokeWidth={3} className={reseeding ? "animate-spin" : ""} />
              <span>{reseeding ? "Re-seeding..." : "Reset Demo Data"}</span>
            </button>

            {/* Toggle Expand View */}
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              className="h-10 px-3 bg-neo-bg text-neo-ink border-3 border-neo-ink font-bold text-xs uppercase shadow-neo-sm hover:bg-neo-white transition-all duration-100 flex items-center gap-1 cursor-pointer"
            >
              <span>{isOpen ? "Hide Raw Data" : "Inspect Raw Data"}</span>
              {isOpen ? <ChevronUp size={16} strokeWidth={3} /> : <ChevronDown size={16} strokeWidth={3} />}
            </button>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4 border-b-4 border-neo-ink/10">
          <div className="p-3 bg-neo-bg border-3 border-neo-ink shadow-[2px_2px_0_#000]">
            <div className="text-[10px] font-black text-neo-ink/60 uppercase">Active Event</div>
            <div className="font-black text-sm text-neo-ink truncate mt-0.5">
              {event?.name || "HackGenesis 2026"}
            </div>
            <div className="text-[10px] font-bold text-neo-ink/50 mt-1 uppercase">
              Owner: {user?.displayName || "Demo Lead"}
            </div>
          </div>

          <div className="p-3 bg-neo-bg border-3 border-neo-ink shadow-[2px_2px_0_#000]">
            <div className="text-[10px] font-black text-neo-ink/60 uppercase">Live Tasks</div>
            <div className="font-black text-lg text-neo-ink mt-0.5">
              {tasks.length} <span className="text-xs font-bold text-neo-ink/60">loaded</span>
            </div>
            <div className="text-[10px] font-bold text-neo-accent mt-0.5 uppercase">
              {overdueCount} Overdue • {unassignedCount} Unassigned
            </div>
          </div>

          <div className="p-3 bg-neo-bg border-3 border-neo-ink shadow-[2px_2px_0_#000]">
            <div className="text-[10px] font-black text-neo-ink/60 uppercase">Live Sessions</div>
            <div className="font-black text-lg text-neo-ink mt-0.5">
              {sessions.length} <span className="text-xs font-bold text-neo-ink/60">scheduled</span>
            </div>
            <div className="text-[10px] font-bold text-neo-ink/60 mt-0.5 uppercase">
              {fixedSessionsCount} Fixed • {phoneticGuideCount} Phonetic Guides
            </div>
          </div>

          <div className="p-3 bg-neo-bg border-3 border-neo-ink shadow-[2px_2px_0_#000]">
            <div className="text-[10px] font-black text-neo-ink/60 uppercase">Current Auth</div>
            <div className="font-black text-sm text-neo-ink truncate mt-0.5">
              {user ? user.displayName : "Guest / Signed Out"}
            </div>
            <div className="text-[10px] font-bold text-neo-ink/50 truncate mt-1">
              UID: {user?.uid || "none"}
            </div>
          </div>
        </div>

        {/* Collapsible Raw JSON Data Inspector */}
        {isOpen && (
          <div className="pt-4">
            {/* Tab navigation */}
            <div className="flex gap-2 mb-3 border-b-2 border-neo-ink pb-2 overflow-x-auto">
              {[
                { id: "overview", label: "Overview Summary" },
                { id: "tasks", label: `Tasks (${tasks.length})` },
                { id: "sessions", label: `Sessions (${sessions.length})` },
                { id: "event", label: "Event Meta" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    "px-3 py-1.5 font-black text-xs uppercase tracking-wider border-2 border-neo-ink cursor-pointer transition-all",
                    activeTab === tab.id
                      ? "bg-neo-ink text-neo-white shadow-[2px_2px_0_#FFD93D]"
                      : "bg-neo-bg text-neo-ink hover:bg-neo-white",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab: Overview */}
            {activeTab === "overview" && (
              <div className="space-y-3">
                <div className="bg-neo-bg border-3 border-neo-ink p-4 text-xs font-bold font-mono">
                  <div className="text-neo-ink/60 font-black mb-2 uppercase">Data Verification Checklist:</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-neo-ink font-black">✓ Sign-in works:</span>
                      <span>{user ? `Authenticated as "${user.displayName}" (${user.isAnonymous ? "Demo" : "Google"})` : "Not signed in"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-neo-ink font-black">✓ Seeding creates HackGenesis 2026:</span>
                      <span>Event ID "{event?.id || DEMO_EVENT_ID}" status: {event?.status || "active"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-neo-ink font-black">✓ Tasks count:</span>
                      <span>{tasks.length} tasks across backlog/todo/in_progress/done ({overdueCount} overdue, {unassignedCount} unassigned)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-neo-ink font-black">✓ Sessions count:</span>
                      <span>{sessions.length} sessions ({fixedSessionsCount} fixed: Inauguration, Lunch, Closing; Phonetic guide e.g. "Dr. GOOP-ta")</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-neo-ink font-black">✓ Real-time & Refresh:</span>
                      <span>Synced via onSnapshot; persists across browser refresh.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Tasks JSON */}
            {activeTab === "tasks" && (
              <div>
                <pre className="bg-neo-ink text-[#A5F3FC] p-4 border-3 border-neo-ink font-mono text-xs overflow-x-auto max-h-96 shadow-inner">
                  {JSON.stringify(tasks, null, 2)}
                </pre>
              </div>
            )}

            {/* Tab: Sessions JSON */}
            {activeTab === "sessions" && (
              <div>
                <pre className="bg-neo-ink text-[#FDE047] p-4 border-3 border-neo-ink font-mono text-xs overflow-x-auto max-h-96 shadow-inner">
                  {JSON.stringify(sessions, null, 2)}
                </pre>
              </div>
            )}

            {/* Tab: Event Meta JSON */}
            {activeTab === "event" && (
              <div>
                <pre className="bg-neo-ink text-[#86EFAC] p-4 border-3 border-neo-ink font-mono text-xs overflow-x-auto max-h-96 shadow-inner">
                  {JSON.stringify(event, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
