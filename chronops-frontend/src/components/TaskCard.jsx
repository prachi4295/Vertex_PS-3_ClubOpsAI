import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Bot,
  Calendar,
  Clock,
  Check,
} from "lucide-react";
import { Badge } from "./ui";

const STATUS_ORDER = ["backlog", "todo", "in_progress", "done"];
const AVAILABLE_VOLUNTEERS = ["Rahul", "Priya", "Arjun", "Kavya", "Neha", "Vikram", "Ananya", "Dev", "Kavita", "Rohan"];

const PRIORITY_BADGE = {
  high: { color: "accent", label: "High" },
  medium: { color: "secondary", label: "Med" },
  low: { color: "muted", label: "Low" },
};

/**
 * A single draggable Kanban task card.
 * Shows title, assignee, priority badge, due date + timing (red if overdue), "AI" badge.
 * Move-left / move-right buttons for keyboard + touch.
 * Supports multi-selection mode for bulk actions (Item 8).
 */
export default function TaskCard({
  task,
  onEdit,
  onMove,
  selectMode = false,
  isSelected = false,
  onToggleSelect,
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: selectMode });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const statusIdx = STATUS_ORDER.indexOf(task.status);
  const canMoveLeft = statusIdx > 0;
  const canMoveRight = statusIdx < STATUS_ORDER.length - 1;

  const isOverdue = (() => {
    if (!task.dueDate || task.status === "done") return false;
    const due = new Date(task.dueDate);
    if (task.dueTime) {
      const [h, m] = task.dueTime.split(":").map(Number);
      if (!isNaN(h) && !isNaN(m)) {
        due.setHours(h, m, 0, 0);
      } else {
        due.setHours(23, 59, 59, 999);
      }
    } else {
      due.setHours(23, 59, 59, 999);
    }
    return due < new Date();
  })();

  const pb = PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.medium;

  const handleCardClick = (e) => {
    if (selectMode) {
      e.stopPropagation();
      onToggleSelect?.(task.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={handleCardClick}
      className={[
        "border-4 p-3 relative",
        isSelected
          ? "border-neo-accent bg-neo-accent/10 shadow-[3px_3px_0_#E26D5C]"
          : "border-neo-ink bg-neo-white shadow-[2px_2px_0_#0F172A] hover:shadow-neo-sm hover:-translate-y-0.5",
        selectMode ? "cursor-pointer" : "",
        "transition-all duration-200 ease-linear",
        "group",
      ].join(" ")}
    >
      {/* Top row: checkbox / grip + title */}
      <div className="flex items-start gap-2">
        {selectMode ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.(task.id);
            }}
            className={[
              "w-5 h-5 border-2 border-neo-ink flex items-center justify-center shrink-0 mt-0.5 transition-colors cursor-pointer",
              isSelected ? "bg-neo-accent text-neo-white" : "bg-neo-white",
            ].join(" ")}
            aria-label={`Select task: ${task.title}`}
          >
            {isSelected && <Check size={14} strokeWidth={4} />}
          </button>
        ) : (
          <button
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
            className="cursor-grab active:cursor-grabbing bg-transparent border-0 p-0 mt-0.5 shrink-0 text-neo-ink/30 hover:text-neo-ink"
          >
            <GripVertical size={14} strokeWidth={3} />
          </button>
        )}

        <button
          onClick={() => {
            if (!selectMode) onEdit?.(task);
          }}
          className="flex-1 text-left font-bold text-sm cursor-pointer bg-transparent border-0 p-0 text-neo-ink hover:underline underline-offset-2"
          aria-label={`Edit task: ${task.title}`}
        >
          {task.title}
        </button>
      </div>

      {/* Meta row */}
      <div className={`flex flex-wrap items-center gap-1.5 mt-2 ${selectMode ? "ml-7" : "ml-5"}`}>
        <Badge color={pb.color} className="!text-[9px] !px-2 !py-0 !border-2">
          {pb.label}
        </Badge>

        {task.source === "ai" && (
          <Badge color="muted" className="!text-[9px] !px-2 !py-0 !border-2">
            <Bot size={10} strokeWidth={3} className="mr-0.5" />
            AI
          </Badge>
        )}

        {task.assignee ? (
          <span className="relative group/assign">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!selectMode) {
                  const el = e.currentTarget.nextElementSibling;
                  if (el) el.classList.toggle("hidden");
                }
              }}
              className="font-bold text-[10px] text-neo-ink/50 uppercase tracking-wider hover:text-neo-accent hover:underline cursor-pointer bg-transparent border-0 p-0"
              title="Click to reassign"
            >
              {task.assignee}
            </button>
            <select
              className="hidden absolute left-0 top-full z-20 mt-0.5 text-[10px] font-bold uppercase bg-neo-white border-2 border-neo-ink shadow-neo-sm cursor-pointer"
              onChange={(e) => {
                e.stopPropagation();
                if (e.target.value) {
                  onMove?.(task.id, task.status, e.target.value);
                }
                e.target.classList.add("hidden");
                e.target.value = "";
              }}
              defaultValue=""
            >
              <option value="" disabled>Assign to...</option>
              {AVAILABLE_VOLUNTEERS.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </span>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!selectMode) onEdit?.(task);
            }}
            className="font-bold text-[10px] text-neo-accent/70 uppercase tracking-wider hover:text-neo-accent hover:underline cursor-pointer bg-transparent border-0 p-0"
            title="Click to assign"
          >
            + Assign
          </button>
        )}

        {(task.dueDate || task.dueTime) && (
          <span
            className={[
              "inline-flex items-center gap-1 font-bold text-[10px] uppercase tracking-wider",
              isOverdue
                ? "bg-neo-accent text-neo-white px-1.5 py-0.5 border border-neo-ink shadow-[1px_1px_0_#000]"
                : "text-neo-ink/60",
            ].join(" ")}
          >
            {task.dueDate && <Calendar size={10} strokeWidth={3} />}
            {isOverdue ? "OVERDUE • " : ""}
            {task.dueDate &&
              new Date(task.dueDate).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
              })}
            {task.dueTime && (
              <span className="inline-flex items-center gap-0.5 ml-1">
                <Clock size={10} strokeWidth={3} />
                {task.dueTime}
              </span>
            )}
          </span>
        )}
      </div>

      {/* Move buttons (keyboard/touch fallback, hidden during select mode) */}
      {!selectMode && (
        <div className="flex items-center gap-1 mt-2.5 ml-5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity duration-100">
          <button
            type="button"
            onClick={() => canMoveLeft && onMove?.(task.id, STATUS_ORDER[statusIdx - 1])}
            disabled={!canMoveLeft}
            aria-label="Move task to previous column"
            className="w-7 h-7 flex items-center justify-center border-2 border-neo-ink bg-neo-white text-neo-ink cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed hover:bg-neo-secondary transition-colors duration-100 active:translate-x-[1px] active:translate-y-[1px]"
          >
            <ChevronLeft size={14} strokeWidth={3} />
          </button>
          <button
            type="button"
            onClick={() => canMoveRight && onMove?.(task.id, STATUS_ORDER[statusIdx + 1])}
            disabled={!canMoveRight}
            aria-label="Move task to next column"
            className="w-7 h-7 flex items-center justify-center border-2 border-neo-ink bg-neo-white text-neo-ink cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed hover:bg-neo-secondary transition-colors duration-100 active:translate-x-[1px] active:translate-y-[1px]"
          >
            <ChevronRight size={14} strokeWidth={3} />
          </button>
        </div>
      )}
    </div>
  );
}
