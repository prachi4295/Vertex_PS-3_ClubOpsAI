import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Columns3,
  Plus,
  Calendar,
  MapPin,
  ArrowRight,
  Sparkles,
  Layers,
  ExternalLink,
  Trash2,
  AlertTriangle,
  Edit3,
  UploadCloud,
} from "lucide-react";
import { Badge, Modal, Input } from "./ui";
import Button from "./ui/Button";
import EditEventModal from "./EditEventModal";
import UploadDocumentModal from "./UploadDocumentModal";
import EventPosterModal from "./EventPosterModal";
import { INITIAL_EVENTS } from "../data/multiEvents";
import { useTasks } from "../hooks/useTasks";
import { useApp } from "../hooks/useApp";
import {
  getStoredEvents,
  saveStoredEvents,
  removeStoredTasks,
  removeStoredSessions,
  getActiveUserEmail,
} from "../lib/storage";

const DEMO_EVENT_IDS = ["chronops-summit-2026", "ai-summit-2026", "club-orientation-2026"];

/**
 * EventTaskboardsManager:
 * Displays a clean list of event taskboards.
 * Clicking any event card opens its dedicated webpage (/taskboards/:eventId).
 */
export default function EventTaskboardsManager() {
  const navigate = useNavigate();
  const { searchQuery } = useApp();
  const [events, setEvents] = useState(() => getStoredEvents());

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [posterModalEvent, setPosterModalEvent] = useState(null);
  const [editingEventTarget, setEditingEventTarget] = useState(null);
  const [deleteEventTarget, setDeleteEventTarget] = useState(null);
  const [newEventForm, setNewEventForm] = useState({
    name: "",
    category: "Hackathon",
    tagline: "",
    date: new Date().toISOString().split("T")[0],
    location: "Campus Auditorium",
  });
  const [customNewCategory, setCustomNewCategory] = useState("");
  const [formErrors, setFormErrors] = useState({});

  // Sync events from local storage on updates
  useEffect(() => {
    const handleUpdate = () => {
      setEvents(getStoredEvents());
    };
    window.addEventListener("clubops-data-updated", handleUpdate);
    return () => window.removeEventListener("clubops-data-updated", handleUpdate);
  }, []);

  // Sync events to local storage
  const saveEvents = (updated) => {
    setEvents(updated);
    saveStoredEvents(updated);
  };

  const handleConfirmDeleteEvent = () => {
    if (!deleteEventTarget) return;
    const updated = events.filter((e) => e.id !== deleteEventTarget.id);
    saveEvents(updated);
    removeStoredTasks(deleteEventTarget.id);
    removeStoredSessions(deleteEventTarget.id);
    setDeleteEventTarget(null);
  };

  // Filter events by global search
  const filteredEvents = useMemo(() => {
    const q = (searchQuery || "").trim().toLowerCase();
    if (!q) return events;
    return events.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        (e.tagline && e.tagline.toLowerCase().includes(q))
    );
  }, [events, searchQuery]);

  const handleCreateEvent = (e) => {
    e.preventDefault();
    const errs = {};
    if (!newEventForm.name.trim()) errs.name = "Event name is required";
    if (!newEventForm.date) errs.date = "Event date is required";

    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    const newId =
      newEventForm.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") + `-${Date.now().toString(36).slice(-4)}`;

    const effectiveCategory =
      newEventForm.category === "Other"
        ? customNewCategory.trim() || "Other"
        : newEventForm.category;

    const created = {
      id: newId,
      ownerEmail: getActiveUserEmail(),
      name: newEventForm.name.trim(),
      category: effectiveCategory,
      tagline:
        newEventForm.tagline.trim() ||
        "Dynamic Event Taskboard & Live Stage",
      date: newEventForm.date,
      status: "active",
      location: newEventForm.location.trim() || "Campus Venue",
      color: "accent",
    };

    const updated = [created, ...events];
    saveEvents(updated);
    setCreateModalOpen(false);
    setNewEventForm({
      name: "",
      category: "Hackathon",
      tagline: "",
      date: new Date().toISOString().split("T")[0],
      location: "Campus Auditorium",
    });
    setFormErrors({});
    // Navigate straight to the new event's dedicated webpage!
    navigate(`/taskboards/${created.id}`);
  };

  return (
    <div className="space-y-6">
      {/* ─── Top Control Header ─── */}
      <div className="bg-neo-white border-4 border-neo-ink p-5 shadow-neo flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-neo-secondary border-2 border-neo-ink px-2.5 py-0.5 text-xs font-bold shadow-[2px_2px_0_#000]">
              Multi-Event Workspace
            </span>
            <span className="text-xs font-semibold text-neo-ink/70">
              {events.length} Boards Available
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neo-ink">
            Event Taskboards Directory
          </h2>
          <p className="text-xs font-medium text-neo-ink/70 mt-0.5">
            Click any event below to open its dedicated full taskboard webpage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUploadModalOpen(true)}
            className="!h-9 !text-xs !px-3 !border-2 shadow-[2px_2px_0_#000] bg-neo-white hover:bg-neo-secondary font-bold"
          >
            <UploadCloud size={16} strokeWidth={3} />
            Upload Document (AI)
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="!h-9 !text-xs !px-4 !border-2 shadow-[2px_2px_0_#000] font-bold"
          >
            <Plus size={16} strokeWidth={3} />
            New Event Board
          </Button>
        </div>
      </div>

      {/* ─── Grid / List of Event Cards ─── */}
      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="bg-neo-white border-4 border-neo-ink p-8 text-center shadow-neo">
            <Columns3
              size={36}
              strokeWidth={2.5}
              className="mx-auto text-neo-ink/40 mb-2"
            />
            <p className="font-bold text-sm text-neo-ink">
              No event boards found
            </p>
            <p className="text-xs font-medium text-neo-ink/60 mt-1">
              Try adjusting your search query or create a new event board.
            </p>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <EventCardItem
              key={event.id}
              event={event}
              onOpen={() => navigate(`/taskboards/${event.id}`)}
              onEdit={() => setEditingEventTarget(event)}
              onDelete={() => setDeleteEventTarget(event)}
              onPoster={() => setPosterModalEvent(event)}
            />
          ))
        )}
      </div>

      {/* ─── Create New Event Board Modal ─── */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Event Board"
      >
        <form onSubmit={handleCreateEvent} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neo-ink mb-1">
              Event Name *
            </label>
            <Input
              value={newEventForm.name}
              onChange={(e) =>
                setNewEventForm((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g. Winter Hackathon 2026"
              className="!border-2 font-bold text-sm"
              autoFocus
            />
            {formErrors.name && (
              <p className="text-xs font-semibold text-neo-accent mt-1">
                {formErrors.name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-neo-ink mb-1">
                Category
              </label>
              <select
                value={newEventForm.category}
                onChange={(e) =>
                  setNewEventForm((prev) => ({
                    ...prev,
                    category: e.target.value,
                  }))
                }
                className="w-full h-10 px-3 border-2 border-neo-ink bg-neo-white font-medium text-sm focus:outline-none"
              >
                <option value="Hackathon">Hackathon</option>
                <option value="Tech Conference">Tech Conference</option>
                <option value="Campus Drive">Campus Drive</option>
                <option value="Workshop Series">Workshop Series</option>
                <option value="Cultural Fest">Cultural Fest</option>
                <option value="Other">Other</option>
              </select>

              {newEventForm.category === "Other" && (
                <div className="mt-2">
                  <Input
                    placeholder="Enter custom category (e.g. Esports, Design Sprint)"
                    value={customNewCategory}
                    onChange={(e) => setCustomNewCategory(e.target.value)}
                    className="!border-2 font-medium text-xs !h-9"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-neo-ink mb-1">
                Event Date *
              </label>
              <Input
                type="date"
                value={newEventForm.date}
                onChange={(e) =>
                  setNewEventForm((prev) => ({ ...prev, date: e.target.value }))
                }
                className="!border-2 font-bold text-sm"
              />
              {formErrors.date && (
                <p className="text-xs font-semibold text-neo-accent mt-1">
                  {formErrors.date}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neo-ink mb-1">
              Tagline / Focus
            </label>
            <Input
              value={newEventForm.tagline}
              onChange={(e) =>
                setNewEventForm((prev) => ({
                  ...prev,
                  tagline: e.target.value,
                }))
              }
              placeholder="e.g. National collegiate AI and Web3 builder showcase"
              className="!border-2 font-medium text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neo-ink mb-1">
              Venue / Location
            </label>
            <Input
              value={newEventForm.location}
              onChange={(e) =>
                setNewEventForm((prev) => ({
                  ...prev,
                  location: e.target.value,
                }))
              }
              placeholder="e.g. Science Complex Main Hall"
              className="!border-2 font-medium text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t-2 border-neo-ink/20">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="secondary" size="sm">
              <Plus size={16} strokeWidth={3} />
              Create & Open Board
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── Delete Taskboard Confirmation Modal ─── */}
      <Modal
        open={Boolean(deleteEventTarget)}
        onClose={() => setDeleteEventTarget(null)}
        title="Delete Event Taskboard"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-neo-accent/20 border-3 border-neo-accent">
            <AlertTriangle size={20} strokeWidth={3} className="text-neo-ink shrink-0 mt-0.5" />
            <div className="text-xs font-medium text-neo-ink leading-relaxed">
              Are you sure you want to delete the <span className="font-bold underline">{deleteEventTarget?.name}</span> taskboard? This will remove the board and all of its tasks from the directory.
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t-2 border-neo-ink/20">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeleteEventTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleConfirmDeleteEvent}
              className="!bg-neo-accent !border-2"
            >
              <Trash2 size={15} strokeWidth={3} />
              Yes, Delete Taskboard
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Edit Event Board Modal ─── */}
      <EditEventModal
        open={Boolean(editingEventTarget)}
        event={editingEventTarget}
        onClose={() => setEditingEventTarget(null)}
        onEventUpdated={(updated) => {
          setEvents((prev) =>
            prev.map((e) => (e.id === updated.id ? updated : e))
          );
        }}
      />

      {/* ─── Upload Event Document Modal (AI) ─── */}
      <UploadDocumentModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onEventCreated={(created) => {
          setEvents((prev) => [created, ...prev]);
          navigate(`/taskboards/${created.id}`);
        }}
      />

      {/* ─── Event Poster Studio Modal ─── */}
      <EventPosterModal
        open={!!posterModalEvent}
        onClose={() => setPosterModalEvent(null)}
        event={posterModalEvent}
      />
    </div>
  );
}

/**
 * EventCardItem:
 * Renders an event summary card with live task statistics.
 * Clicking navigates directly to the event's dedicated webpage.
 */
function EventCardItem({ event, onOpen, onEdit, onDelete, onPoster }) {
  const { tasks } = useTasks(event.id);

  // Compute live statistics for this board
  const stats = useMemo(() => {
    const total = tasks.length;
    const backlog = tasks.filter((t) => t.status === "backlog").length;
    const todo = tasks.filter((t) => t.status === "todo").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const done = tasks.filter((t) => t.status === "done").length;
    const completionRate = total === 0 ? 0 : Math.round((done / total) * 100);

    return { total, backlog, todo, inProgress, done, completionRate };
  }, [tasks]);

  return (
    <div
      onClick={onOpen}
      className={[
        "bg-neo-white border-4 border-neo-ink shadow-neo p-5 sm:p-6 cursor-pointer select-none",
        "hover:shadow-neo-lg hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all duration-100 ease-linear",
        "flex flex-col md:flex-row md:items-center justify-between gap-5",
      ].join(" ")}
    >
      {/* Left Info */}
      <div className="space-y-2 flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            color="secondary"
            className="!text-[10px] !px-2.5 !py-0.5 font-bold !border-2"
          >
            {event.category}
          </Badge>

          <span className="flex items-center gap-1 text-xs font-medium text-neo-ink/80">
            <Calendar size={13} strokeWidth={2.5} />
            {event.date}
          </span>

          {event.location && (
            <span className="hidden sm:flex items-center gap-1 text-xs font-medium text-neo-ink/60">
              <MapPin size={13} strokeWidth={2.5} />
              {event.location}
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-3">
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-neo-ink truncate group-hover:underline">
            {event.name}
          </h3>
          <span className="text-xs font-medium text-neo-ink/60">
            • {stats.total} Tasks
          </span>
        </div>

        {event.tagline && (
          <p className="text-xs font-medium text-neo-ink/70">
            {event.tagline}
          </p>
        )}
      </div>

      {/* Right Stats & Navigation Action */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6 shrink-0">
        {/* Status Breakdown Pills */}
        <div className="flex items-center gap-1.5 text-xs font-bold">
          <span
            title="Backlog"
            className="bg-neo-muted border-2 border-neo-ink px-2 py-0.5 shadow-[1px_1px_0_#000]"
          >
            {stats.backlog} Backlog
          </span>
          <span
            title="To Do"
            className="bg-neo-white border-2 border-neo-ink px-2 py-0.5 shadow-[1px_1px_0_#000]"
          >
            {stats.todo} To Do
          </span>
          <span
            title="In Progress"
            className="bg-neo-secondary border-2 border-neo-ink px-2 py-0.5 shadow-[1px_1px_0_#000]"
          >
            {stats.inProgress} In Progress
          </span>
          <span
            title="Done"
            className="bg-neo-ink text-neo-white border-2 border-neo-ink px-2 py-0.5 shadow-[1px_1px_0_#000]"
          >
            {stats.done} Done
          </span>
        </div>

        {/* Progress Bar Gauge */}
        <div className="w-28 sm:w-32 hidden sm:block">
          <div className="flex justify-between items-center text-[10px] font-bold mb-1">
            <span>Progress</span>
            <span>{stats.completionRate}%</span>
          </div>
          <div className="w-full h-3 bg-neo-white border-2 border-neo-ink overflow-hidden p-0.5 shadow-[1px_1px_0_#000]">
            <div
              className="h-full bg-neo-accent border border-neo-ink transition-all duration-300"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
        </div>

        {/* Poster Studio CTA */}
        {onPoster && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPoster();
            }}
            title={`Generate Poster & Social Assets for ${event.name}`}
            aria-label={`Poster studio for ${event.name}`}
            className={[
              "h-10 w-10 bg-neo-white text-neo-ink border-3 border-neo-ink font-bold",
              "flex items-center justify-center cursor-pointer shadow-neo-sm hover:shadow-neo hover:bg-neo-secondary",
              "transition-all duration-100 ease-linear active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
            ].join(" ")}
          >
            <Sparkles size={16} strokeWidth={2.5} />
          </button>
        )}

        {/* Edit Taskboard CTA */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          title={`Edit ${event.name} details (name, date, location)`}
          aria-label={`Edit ${event.name} details`}
          className={[
            "h-10 w-10 bg-neo-white text-neo-ink border-3 border-neo-ink font-bold",
            "flex items-center justify-center cursor-pointer shadow-neo-sm hover:shadow-neo hover:bg-neo-secondary",
            "transition-all duration-100 ease-linear active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
          ].join(" ")}
        >
          <Edit3 size={16} strokeWidth={2.5} />
        </button>

        {/* Delete Taskboard CTA */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title={`Delete ${event.name} taskboard`}
          aria-label={`Delete ${event.name} taskboard`}
          className={[
            "h-10 w-10 bg-neo-white text-neo-ink border-3 border-neo-ink font-bold",
            "flex items-center justify-center cursor-pointer shadow-neo-sm hover:shadow-neo hover:bg-neo-accent",
            "transition-all duration-100 ease-linear active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
          ].join(" ")}
        >
          <Trash2 size={16} strokeWidth={2.5} />
        </button>

        {/* Open Webpage CTA Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className={[
            "h-10 px-4 bg-neo-secondary text-neo-ink border-3 border-neo-ink font-bold text-xs",
            "flex items-center gap-2 cursor-pointer shadow-neo-sm hover:shadow-neo hover:bg-neo-accent",
            "transition-all duration-100 ease-linear active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
          ].join(" ")}
        >
          <span>Open Board</span>
          <ArrowRight size={16} strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}
