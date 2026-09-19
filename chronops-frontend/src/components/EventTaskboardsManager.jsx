import { useState, useMemo } from "react";
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
} from "lucide-react";
import { Badge, Modal, Input } from "./ui";
import Button from "./ui/Button";
import { INITIAL_EVENTS } from "../data/multiEvents";
import { useTasks } from "../hooks/useTasks";
import { useApp } from "../hooks/useApp";

const LOCAL_EVENTS_STORAGE_KEY = "clubops_all_events_list";

/**
 * EventTaskboardsManager:
 * Displays a clean list of event taskboards.
 * Clicking any event card opens its dedicated webpage (/taskboards/:eventId).
 */
export default function EventTaskboardsManager() {
  const navigate = useNavigate();
  const { searchQuery } = useApp();
  const [events, setEvents] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_EVENTS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to parse saved events:", e);
    }
    return INITIAL_EVENTS;
  });

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newEventForm, setNewEventForm] = useState({
    name: "",
    category: "Hackathon",
    tagline: "",
    date: new Date().toISOString().split("T")[0],
    location: "Campus Auditorium",
  });
  const [formErrors, setFormErrors] = useState({});

  // Sync events to local storage
  const saveEvents = (updated) => {
    setEvents(updated);
    try {
      localStorage.setItem(LOCAL_EVENTS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn("Could not save events list:", e);
    }
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

    const created = {
      id: newId,
      name: newEventForm.name.trim(),
      category: newEventForm.category.trim() || "Event",
      tagline:
        newEventForm.tagline.trim() ||
        "Club operations and live stage management.",
      date: newEventForm.date,
      status: "planning",
      location: newEventForm.location.trim() || "Campus Venue",
      color: "secondary",
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
            <span className="bg-neo-secondary border-2 border-neo-ink px-2.5 py-0.5 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#000]">
              Multi-Event Workspace
            </span>
            <span className="text-xs font-black text-neo-ink/60 uppercase tracking-widest">
              {events.length} Boards Available
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-neo-ink">
            Event Taskboards Directory
          </h2>
          <p className="text-xs font-bold text-neo-ink/70 uppercase tracking-wider mt-0.5">
            Click any event below to open its dedicated full taskboard webpage.
          </p>
        </div>

        <div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="!h-9 !text-xs !px-4 !border-2 shadow-[2px_2px_0_#000]"
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
            <p className="font-black text-sm uppercase text-neo-ink">
              No event boards found
            </p>
            <p className="text-xs font-bold text-neo-ink/60 uppercase mt-1">
              Try adjusting your search query or create a new event board.
            </p>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <EventCardItem
              key={event.id}
              event={event}
              onOpen={() => navigate(`/taskboards/${event.id}`)}
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
            <label className="block text-xs font-black uppercase tracking-wider text-neo-ink mb-1">
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
              <p className="text-xs font-black text-neo-accent mt-1 uppercase">
                {formErrors.name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-neo-ink mb-1">
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
                className="w-full h-10 px-3 border-2 border-neo-ink bg-neo-white font-bold text-sm uppercase tracking-wide focus:outline-none"
              >
                <option value="Hackathon">Hackathon</option>
                <option value="Tech Conference">Tech Conference</option>
                <option value="Campus Drive">Campus Drive</option>
                <option value="Workshop Series">Workshop Series</option>
                <option value="Cultural Fest">Cultural Fest</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-neo-ink mb-1">
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
                <p className="text-xs font-black text-neo-accent mt-1 uppercase">
                  {formErrors.date}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-neo-ink mb-1">
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
              className="!border-2 font-bold text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-neo-ink mb-1">
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
              className="!border-2 font-bold text-sm"
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
    </div>
  );
}

/**
 * EventCardItem:
 * Renders an event summary card with live task statistics.
 * Clicking navigates directly to the event's dedicated webpage.
 */
function EventCardItem({ event, onOpen }) {
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
            color={event.id === "hackgenesis-2026" ? "accent" : "secondary"}
            className="!text-[10px] !px-2.5 !py-0.5 font-black uppercase !border-2"
          >
            {event.category}
          </Badge>

          <span className="flex items-center gap-1 text-xs font-bold text-neo-ink/80 uppercase">
            <Calendar size={13} strokeWidth={3} />
            {event.date}
          </span>

          {event.location && (
            <span className="hidden sm:flex items-center gap-1 text-xs font-bold text-neo-ink/60 uppercase">
              <MapPin size={13} strokeWidth={3} />
              {event.location}
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-3">
          <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-neo-ink truncate group-hover:underline">
            {event.name}
          </h3>
          <span className="text-xs font-black text-neo-ink/50 uppercase tracking-wider">
            • {stats.total} Tasks
          </span>
        </div>

        {event.tagline && (
          <p className="text-xs font-bold text-neo-ink/70 line-clamp-1 uppercase">
            {event.tagline}
          </p>
        )}
      </div>

      {/* Right Stats & Navigation Action */}
      <div className="flex flex-wrap items-center gap-4 sm:gap-6 shrink-0">
        {/* Status Breakdown Pills */}
        <div className="flex items-center gap-1.5 text-xs font-black uppercase">
          <span
            title="Backlog"
            className="bg-neo-muted border-2 border-neo-ink px-2 py-0.5 shadow-[1px_1px_0_#000]"
          >
            {stats.backlog} BL
          </span>
          <span
            title="To Do"
            className="bg-neo-white border-2 border-neo-ink px-2 py-0.5 shadow-[1px_1px_0_#000]"
          >
            {stats.todo} TD
          </span>
          <span
            title="In Progress"
            className="bg-neo-secondary border-2 border-neo-ink px-2 py-0.5 shadow-[1px_1px_0_#000]"
          >
            {stats.inProgress} IP
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
          <div className="flex justify-between items-center text-[10px] font-black uppercase mb-1">
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

        {/* Open Webpage CTA Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className={[
            "h-10 px-4 bg-neo-secondary text-neo-ink border-3 border-neo-ink font-black text-xs uppercase tracking-wider",
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
