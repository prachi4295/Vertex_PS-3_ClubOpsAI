import { useState, useEffect, useMemo } from "react";
import { Trash2, Layers, Plus } from "lucide-react";
import { Modal, Input, Badge } from "./ui";
import Button from "./ui/Button";
import { useTasks } from "../hooks/useTasks";
import { INITIAL_EVENTS } from "../data/multiEvents";
import { getStoredEvents, getStoredVolunteers } from "../lib/storage";

const PRIORITY_OPTIONS = ["low", "medium", "high"];
const AVAILABLE_VOLUNTEERS = ["Rahul", "Priya", "Arjun", "Kavya", "Neha", "Vikram", "Ananya", "Dev", "Kavita", "Rohan"];
const STATUS_OPTIONS = [
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

function loadEvents() {
  const list = getStoredEvents();
  return list.length > 0 ? list : INITIAL_EVENTS;
}

/**
 * Add / Edit / Delete task modal with Event Taskboard Selector (Item 14).
 */
export default function TaskModal({ open, onClose, task = null, eventId }) {
  const [events, setEvents] = useState(loadEvents);
  const [targetEventId, setTargetEventId] = useState(
    eventId || task?.eventId || events[0]?.id || "chronops-summit-2026"
  );

  useEffect(() => {
    setEvents(loadEvents());
  }, [open]);

  useEffect(() => {
    if (eventId) {
      setTargetEventId(eventId);
    } else if (task?.eventId) {
      setTargetEventId(task.eventId);
    }
  }, [eventId, task]);

  const { addTask, updateTask, deleteTask } = useTasks(targetEventId);
  const isEdit = !!task;

  const volunteerOptions = useMemo(() => {
    const custom = getStoredVolunteers().map((v) => v.name).filter(Boolean);
    return Array.from(new Set([...AVAILABLE_VOLUNTEERS, ...custom]));
  }, [open]);

  const [form, setForm] = useState({
    title: "",
    assignee: "",
    priority: "medium",
    status: "backlog",
    dueDate: "",
    dueTime: "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || "",
        assignee: task.assignee || "",
        priority: task.priority || "medium",
        status: task.status || "backlog",
        dueDate: task.dueDate
          ? (task.dueDate instanceof Date
              ? task.dueDate.toISOString().split("T")[0]
              : String(task.dueDate).split("T")[0])
          : "",
        dueTime: task.dueTime || "",
      });
    } else {
      setForm({
        title: "",
        assignee: "",
        priority: "medium",
        status: "backlog",
        dueDate: "",
        dueTime: "",
      });
    }
    setErrors({});
    setConfirmDelete(false);
  }, [task, open]);

  function validate() {
    const e = {};
    if (!form.title.trim()) e.title = "Title is required";
    if (form.title.trim().length > 120) e.title = "Title must be under 120 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      if (isEdit) {
        await updateTask(task.id, {
          title: form.title.trim(),
          assignee: form.assignee.trim(),
          priority: form.priority,
          status: form.status,
          dueDate: form.dueDate || null,
          dueTime: form.dueTime || null,
          eventId: targetEventId,
        });
      } else {
        await addTask({
          title: form.title.trim(),
          assignee: form.assignee.trim(),
          priority: form.priority,
          status: form.status,
          dueDate: form.dueDate || null,
          dueTime: form.dueTime || null,
          source: "manual",
          eventId: targetEventId,
        });
      }
      onClose();
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setSaving(true);
    try {
      await deleteTask(task.id);
      onClose();
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setSaving(false);
    }
  }

  function setField(field, val) {
    setForm((prev) => ({ ...prev, [field]: val }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Task" : "New Operational Task"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Taskboard Selector (Item 14) */}
        <div>
          <label
            htmlFor="target-event"
            className="block font-black text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5"
          >
            <Layers size={13} strokeWidth={3} className="text-neo-accent" />
            Target Event Taskboard *
          </label>
          <select
            id="target-event"
            value={targetEventId}
            onChange={(e) => setTargetEventId(e.target.value)}
            className="w-full h-10 px-3 border-2 border-neo-ink bg-neo-white font-bold text-xs uppercase tracking-wide focus:outline-none"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} ({ev.date})
              </option>
            ))}
          </select>
        </div>

        {/* Title */}
        <div>
          <label
            htmlFor="task-title"
            className="block font-bold text-xs uppercase tracking-wider mb-1"
          >
            Title *
          </label>
          <Input
            id="task-title"
            placeholder="What needs to be done?"
            value={form.title}
            onChange={(e) => setField("title", e.target.value)}
            className={errors.title ? "!border-neo-accent" : ""}
          />
          {errors.title && (
            <p className="mt-1 font-bold text-xs text-neo-accent">
              {errors.title}
            </p>
          )}
        </div>

        {/* Assignee */}
        <div>
          <label
            htmlFor="task-assignee"
            className="block font-bold text-xs uppercase tracking-wider mb-1"
          >
            Assignee
          </label>
          <div className="flex gap-2">
            <select
              id="task-assignee"
              value={volunteerOptions.includes(form.assignee) ? form.assignee : "__custom__"}
              onChange={(e) => {
                if (e.target.value === "__custom__") {
                  setField("assignee", "");
                } else {
                  setField("assignee", e.target.value);
                }
              }}
              className="flex-1 h-10 px-2 border-2 border-neo-ink bg-neo-white font-bold text-xs uppercase focus:outline-none"
            >
              <option value="">Unassigned</option>
              {volunteerOptions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
              <option value="__custom__">Custom...</option>
            </select>
            {(!volunteerOptions.includes(form.assignee) && form.assignee !== "") && (
              <Input
                placeholder="Custom name"
                value={form.assignee}
                onChange={(e) => setField("assignee", e.target.value)}
                className="flex-1 !h-10 !text-xs"
              />
            )}
          </div>
        </div>

        {/* Priority + Status row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-xs uppercase tracking-wider mb-1">
              Priority
            </label>
            <div className="flex gap-1">
              {PRIORITY_OPTIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setField("priority", p)}
                  className={[
                    "flex-1 py-1.5 text-xs font-bold uppercase border-2 border-neo-ink cursor-pointer transition-colors duration-100",
                    form.priority === p
                      ? p === "high"
                        ? "bg-neo-accent text-neo-white"
                        : p === "medium"
                        ? "bg-neo-secondary text-neo-ink"
                        : "bg-neo-muted text-neo-ink"
                      : "bg-neo-white text-neo-ink hover:bg-neo-bg",
                  ].join(" ")}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="task-status"
              className="block font-bold text-xs uppercase tracking-wider mb-1"
            >
              Status
            </label>
            <select
              id="task-status"
              value={form.status}
              onChange={(e) => setField("status", e.target.value)}
              className="w-full h-10 px-2 border-2 border-neo-ink bg-neo-white font-bold text-xs uppercase focus:outline-none"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Due date + Due time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="task-due-date"
              className="block font-bold text-xs uppercase tracking-wider mb-1"
            >
              Due Date
            </label>
            <Input
              id="task-due-date"
              type="date"
              value={form.dueDate}
              onChange={(e) => setField("dueDate", e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="task-due-time"
              className="block font-bold text-xs uppercase tracking-wider mb-1"
            >
              Due Time
            </label>
            <Input
              id="task-due-time"
              type="time"
              value={form.dueTime}
              onChange={(e) => setField("dueTime", e.target.value)}
            />
          </div>
        </div>

        {errors.submit && (
          <p className="font-bold text-xs text-neo-accent">{errors.submit}</p>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-between pt-2 border-t-2 border-neo-ink">
          {isEdit ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={saving}
              className={[
                "!text-xs",
                confirmDelete ? "!bg-neo-accent !text-neo-white" : "",
              ].join(" ")}
            >
              <Trash2 size={14} strokeWidth={3} />
              {confirmDelete ? "Click to Confirm" : "Delete"}
            </Button>
          ) : (
            <div />
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={saving}
              className="!text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              disabled={saving}
              className="!text-xs"
            >
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Task"}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
