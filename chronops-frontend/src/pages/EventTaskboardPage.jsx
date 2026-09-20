import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Columns3,
  Star,
  CheckCircle2,
  Clock,
  Sparkles,
  Trash2,
  AlertTriangle,
  Edit3,
} from "lucide-react";
import Header from "../components/Header";
import KanbanBoard from "../components/KanbanBoard";
import EditEventModal from "../components/EditEventModal";
import Footer from "../components/Footer";
import { Badge, Modal } from "../components/ui";
import Button from "../components/ui/Button";
import { INITIAL_EVENTS, getEventTheme } from "../data/multiEvents";
import { useTasks } from "../hooks/useTasks";
import { useApp } from "../hooks/useApp";
import {
  getStoredEvents,
  saveStoredEvents,
  removeStoredTasks,
  removeStoredSessions,
} from "../lib/storage";
import { formatDateDMY, formatTime12 } from "../lib/time";

/**
 * Dedicated webpage for an event's full taskboard.
 * Navigated to upon clicking an event from the Task Board directory.
 */
export default function EventTaskboardPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { goTasks } = useApp();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [eventOverride, setEventOverride] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setRefreshTick((t) => t + 1);
    window.addEventListener("clubops-data-updated", handleUpdate);
    return () => window.removeEventListener("clubops-data-updated", handleUpdate);
  }, []);

  // Retrieve event metadata from storage or presets
  const event = useMemo(() => {
    if (eventOverride) return eventOverride;
    try {
      const list = getStoredEvents();
      const found = list.find((e) => e.id === eventId);
      if (found) return found;
    } catch (e) {
      console.warn("Failed to load event metadata:", e);
    }
    return INITIAL_EVENTS.find((e) => e.id === eventId) || null;
  }, [eventId, eventOverride, refreshTick]);

  const eventTheme = useMemo(() => {
    return getEventTheme(event?.themeColor || event?.color || "amber");
  }, [event]);

  // Read tasks for this specific event
  const { tasks: allTasks } = useTasks();
  const tasks = useMemo(() => {
    if (!eventId) return [];
    return allTasks.filter((t) => t.eventId === eventId);
  }, [allTasks, eventId]);

  // Compute live stats for header
  const stats = useMemo(() => {
    const total = tasks.length;
    const backlog = tasks.filter((t) => t.status === "backlog").length;
    const todo = tasks.filter((t) => t.status === "todo").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const done = tasks.filter((t) => t.status === "done").length;
    const completionRate = total === 0 ? 0 : Math.round((done / total) * 100);

    return { total, backlog, todo, inProgress, done, completionRate };
  }, [tasks]);

  const handleBackToDirectory = () => {
    goTasks();
    navigate("/");
  };

  const handleDeleteBoard = () => {
    if (!event) return;
    try {
      const stored = getStoredEvents();
      const filtered = stored.filter((e) => e.id !== event.id);
      saveStoredEvents(filtered);
      removeStoredTasks(event.id);
      removeStoredSessions(event.id);
      window.dispatchEvent(new CustomEvent("clubops-data-updated"));
    } catch (e) {
      console.error("Failed to delete event board:", e);
    }
    setDeleteConfirmOpen(false);
    goTasks();
    navigate("/");
  };

  if (!event) {
    return (
      <div className="min-h-screen bg-neo-bg relative flex flex-col justify-between">
        <div className="fixed inset-0 texture-halftone pointer-events-none" />
        <div className="fixed inset-0 texture-grid pointer-events-none" />
        <div className="fixed inset-0 texture-noise pointer-events-none" />
        <div className="relative z-40">
          <Header />
        </div>
        <main className="relative z-10 max-w-xl mx-auto px-4 py-20 text-center space-y-6 flex-1">
          <div className="bg-neo-white border-4 border-neo-ink p-8 shadow-neo space-y-4">
            <AlertTriangle size={48} strokeWidth={2.5} className="mx-auto text-neo-accent" />
            <h1 className="text-2xl font-black uppercase text-neo-ink">Event Not Found</h1>
            <p className="text-xs font-bold text-neo-ink/70 uppercase">
              The event taskboard you are looking for does not exist or has been deleted.
            </p>
            <Button variant="primary" onClick={handleBackToDirectory}>
              Back to Directory
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neo-bg relative flex flex-col justify-between">
      {/* Background textures */}
      <div className="fixed inset-0 texture-halftone pointer-events-none" />
      <div className="fixed inset-0 texture-grid pointer-events-none" />
      <div className="fixed inset-0 texture-noise pointer-events-none" />

      {/* Sticky header */}
      <div className="relative z-40">
        <Header />
      </div>

      {/* Page Content */}
      <main className="relative z-10 max-w-[1440px] mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* ─── Breadcrumb & Navigation Bar ─── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleBackToDirectory}
            className={[
              "inline-flex items-center gap-2 px-4 py-2 bg-neo-white text-neo-ink border-3 border-neo-ink font-black text-xs uppercase tracking-wider",
              "shadow-neo-sm hover:shadow-neo hover:bg-neo-bg transition-all duration-100 ease-linear cursor-pointer",
              "active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
            ].join(" ")}
          >
            <ArrowLeft size={16} strokeWidth={3} />
            <span>Back to Event Directory</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-neo-ink/50 uppercase tracking-widest hidden sm:inline-block">
              Directory / {event.name}
            </span>
          </div>
        </div>

        {/* ─── Event Header Banner ─── */}
        <div className="bg-neo-white border-4 border-neo-ink p-5 sm:p-6 shadow-neo flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
          {/* Top Theme Accent Stripe */}
          <div
            className="absolute top-0 left-0 right-0 h-2"
            style={{ backgroundColor: getEventTheme(event.themeColor || event.color).hex }}
          />
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="text-xs px-3 py-0.5 font-black uppercase border-2 border-neo-ink shadow-[1px_1px_0_#000] text-neo-ink"
                style={{ backgroundColor: getEventTheme(event.themeColor || event.color).hex }}
              >
                {event.category}
              </span>

              {/* Status pill: Live Now vs Upcoming vs Completed */}
              {event.status === "active" ? (
                <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 font-black uppercase bg-emerald-300 border-2 border-neo-ink shadow-[1px_1px_0_#000] text-neo-ink animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-800 animate-ping" />
                  Live Now
                </span>
              ) : event.status === "completed" ? (
                <span className="text-[10px] px-2.5 py-0.5 font-black uppercase bg-slate-200 border-2 border-neo-ink text-slate-700 shadow-[1px_1px_0_#000]">
                  Completed
                </span>
              ) : (
                <span className="text-[10px] px-2.5 py-0.5 font-black uppercase bg-neo-bg border-2 border-neo-ink text-neo-ink/70 shadow-[1px_1px_0_#000]">
                  Upcoming
                </span>
              )}

              <span className="flex items-center gap-1.5 text-xs font-bold text-neo-ink/80 uppercase">
                <Calendar size={14} strokeWidth={3} />
                {formatDateDMY(event.date)}
                {event.time ? ` • ${formatTime12(event.time)}` : ""}
              </span>

              {event.location && (
                <span className="flex items-center gap-1.5 text-xs font-bold text-neo-ink/60 uppercase">
                  <MapPin size={14} strokeWidth={3} />
                  {event.location}
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-3">
              <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-neo-ink">
                {event.name}
              </h1>
              <span className="text-sm font-black text-neo-ink/60 uppercase tracking-wider">
                • {stats.total} Total Tasks
              </span>
            </div>

            {event.tagline && (
              <p className="text-xs sm:text-sm font-bold text-neo-ink/70 uppercase">
                {event.tagline}
              </p>
            )}
          </div>

          {/* Quick Metrics & Actions */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 shrink-0">
            {/* Progress Gauge */}
            <div className="w-32 hidden sm:block">
              <div className="flex justify-between items-center text-[10px] font-black uppercase mb-1">
                <span>Completed</span>
                <span>{stats.completionRate}%</span>
              </div>
              <div className="w-full h-3.5 bg-neo-white border-2 border-neo-ink p-0.5 shadow-[2px_2px_0_#000]">
                <div
                  className="h-full border border-neo-ink transition-all duration-300"
                  style={{
                    width: `${stats.completionRate}%`,
                    backgroundColor: getEventTheme(event.themeColor || event.color).hex,
                  }}
                />
              </div>
            </div>

            {/* Edit Board Button */}
            <Button
              variant="outline"
              size="md"
              onClick={() => setEditModalOpen(true)}
              className="!h-10 !text-xs !px-3 shadow-[2px_2px_0_#000] hover:!bg-neo-secondary text-neo-ink"
              title="Edit Board (Name, Date, Location)"
              aria-label="Edit this taskboard"
            >
              <Edit3 size={16} strokeWidth={2.5} />
              <span className="hidden sm:inline">Edit Board</span>
            </Button>

            {/* Delete Taskboard Button */}
            <Button
              variant="outline"
              size="md"
              onClick={() => setDeleteConfirmOpen(true)}
              className="!h-10 !text-xs !px-3 shadow-[2px_2px_0_#000] hover:!bg-neo-accent text-neo-ink"
              title="Delete Taskboard"
              aria-label="Delete this taskboard"
            >
              <Trash2 size={16} strokeWidth={2.5} />
              <span className="hidden sm:inline">Delete Board</span>
            </Button>
          </div>
        </div>

        {/* ─── Dedicated Kanban Board ─── */}
        <div className="pb-8">
          <KanbanBoard
            eventId={eventId}
            eventTitle="Kanban Board"
          />
        </div>
      </main>

      {/* Edit Event Board Modal */}
      <EditEventModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        event={event}
        onEventUpdated={(updated) => {
          setEventOverride(updated);
        }}
      />

      {/* Delete Taskboard Confirmation Modal */}
      <Modal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Delete Event Taskboard"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-neo-accent/20 border-3 border-neo-accent">
            <AlertTriangle size={20} strokeWidth={3} className="text-neo-ink shrink-0 mt-0.5" />
            <div className="text-xs font-bold text-neo-ink uppercase leading-relaxed">
              Are you sure you want to delete the <span className="font-black underline">{event.name}</span> taskboard? This will remove the board and all of its tasks from your directory.
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t-2 border-neo-ink/20">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleDeleteBoard}
              className="!bg-neo-accent !border-2"
            >
              <Trash2 size={15} strokeWidth={3} />
              Yes, Delete Taskboard
            </Button>
          </div>
        </div>
      </Modal>

      {/* Footer */}
      <Footer />
    </div>
  );
}
