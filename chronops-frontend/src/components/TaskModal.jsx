import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { Modal, Input, Badge } from "./ui";
import Button from "./ui/Button";
import { useTasks } from "../hooks/useTasks";

const PRIORITY_OPTIONS = ["low", "medium", "high"];
const STATUS_OPTIONS = [
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

/**
 * Add / Edit / Delete task modal with validation.
 */
export default function TaskModal({ open, onClose, task = null }) {
  const { addTask, updateTask, deleteTask } = useTasks();
  const isEdit = !!task;

  const [form, setForm] = useState({
    title: "",
    assignee: "",
    priority: "medium",
    status: "backlog",
    dueDate: "",
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
          ? new Date(task.dueDate).toISOString().split("T")[0]
          : "",
      });
    } else {
      setForm({
        title: "",
        assignee: "",
        priority: "medium",
        status: "backlog",
        dueDate: "",
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
        });
      } else {
        await addTask({
          title: form.title.trim(),
          assignee: form.assignee.trim(),
          priority: form.priority,
          status: form.status,
          dueDate: form.dueDate || null,
          source: "manual",
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

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Task" : "New Task"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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
          <Input
            id="task-assignee"
            placeholder="Who's responsible?"
            value={form.assignee}
            onChange={(e) => setField("assignee", e.target.value)}
          />
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
                    "flex-1 py-2 font-bold text-xs uppercase tracking-wider cursor-pointer",
                    "border-4 border-neo-ink transition-all duration-100 ease-linear",
                    form.priority === p
                      ? p === "high"
                        ? "bg-neo-accent text-neo-ink shadow-[2px_2px_0_#000]"
                        : p === "medium"
                        ? "bg-neo-secondary text-neo-ink shadow-[2px_2px_0_#000]"
                        : "bg-neo-muted text-neo-ink shadow-[2px_2px_0_#000]"
                      : "bg-neo-white text-neo-ink/50",
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
              className="w-full h-12 px-3 bg-neo-white text-neo-ink font-bold border-4 border-neo-ink rounded-none cursor-pointer focus:bg-neo-secondary focus:shadow-neo-sm focus:outline-none"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Due date */}
        <div>
          <label
            htmlFor="task-due"
            className="block font-bold text-xs uppercase tracking-wider mb-1"
          >
            Due Date
          </label>
          <Input
            id="task-due"
            type="date"
            value={form.dueDate}
            onChange={(e) => setField("dueDate", e.target.value)}
          />
        </div>

        {/* Error */}
        {errors.submit && (
          <div className="bg-neo-accent/10 border-4 border-neo-accent p-3">
            <p className="font-bold text-sm text-neo-accent">{errors.submit}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          {isEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={saving}
              className={confirmDelete ? "!bg-neo-accent !text-neo-ink" : ""}
            >
              <Trash2 size={14} strokeWidth={3} />
              {confirmDelete ? "Confirm Delete" : "Delete"}
            </Button>
          )}
          <div className="flex-1" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
