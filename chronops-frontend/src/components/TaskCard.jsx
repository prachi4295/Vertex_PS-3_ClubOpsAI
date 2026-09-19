import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Bot,
  Calendar,
} from "lucide-react";
import { Badge } from "./ui";

const STATUS_ORDER = ["backlog", "todo", "in_progress", "done"];

const PRIORITY_BADGE = {
  high: { color: "accent", label: "High" },
  medium: { color: "secondary", label: "Med" },
  low: { color: "muted", label: "Low" },
};

/**
 * A single draggable Kanban task card.
 * Shows title, assignee, priority badge, due date (red if overdue), "AI" badge.
 * Move-left / move-right buttons for keyboard + touch.
 */
export default function TaskCard({ task, onEdit, onMove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const statusIdx = STATUS_ORDER.indexOf(task.status);
  const canMoveLeft = statusIdx > 0;
  const canMoveRight = statusIdx < STATUS_ORDER.length - 1;

  const isOverdue =
    task.dueDate &&
    new Date(task.dueDate) < new Date() &&
    task.status !== "done";

  const pb = PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.medium;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={[
        "bg-neo-white border-4 border-neo-ink p-3",
        "shadow-[2px_2px_0_#000] hover:shadow-neo-sm hover:-translate-y-0.5",
        "transition-all duration-200 ease-linear",
        "group",
      ].join(" ")}
    >
      {/* Top row: grip + title */}
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="cursor-grab active:cursor-grabbing bg-transparent border-0 p-0 mt-0.5 shrink-0 text-neo-ink/30 hover:text-neo-ink"
        >
          <GripVertical size={14} strokeWidth={3} />
        </button>

        <button
          onClick={() => onEdit?.(task)}
          className="flex-1 text-left font-bold text-sm cursor-pointer bg-transparent border-0 p-0 text-neo-ink hover:underline underline-offset-2"
          aria-label={`Edit task: ${task.title}`}
        >
          {task.title}
        </button>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-1.5 mt-2 ml-5">
        <Badge
          color={pb.color}
          className="!text-[9px] !px-2 !py-0 !border-2"
        >
          {pb.label}
        </Badge>

        {task.source === "ai" && (
          <Badge
            color="muted"
            className="!text-[9px] !px-2 !py-0 !border-2"
          >
            <Bot size={10} strokeWidth={3} className="mr-0.5" />
            AI
          </Badge>
        )}

        {task.assignee && (
          <span className="font-bold text-[10px] text-neo-ink/50 uppercase tracking-wider">
            {task.assignee}
          </span>
        )}

        {task.dueDate && (
          <span
            className={[
              "inline-flex items-center gap-1 font-bold text-[10px] uppercase tracking-wider",
              isOverdue
                ? "bg-neo-accent text-neo-white px-1.5 py-0.5 border border-neo-ink shadow-[1px_1px_0_#000]"
                : "text-neo-ink/60",
            ].join(" ")}
          >
            <Calendar size={10} strokeWidth={3} />
            {isOverdue ? "OVERDUE • " : ""}
            {new Date(task.dueDate).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            })}
          </span>
        )}
      </div>

      {/* Move buttons (keyboard/touch fallback) */}
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
    </div>
  );
}
