import { useState, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDroppable,
  closestCorners,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Columns3, Check, Plus } from "lucide-react";
import { Card, Badge } from "./ui";
import Button from "./ui/Button";
import TaskCard from "./TaskCard";
import TaskModal from "./TaskModal";
import { useApp } from "../hooks/useApp";
import { useTasks } from "../hooks/useTasks";

const COLUMNS = [
  { key: "backlog", label: "Backlog", color: "bg-neo-muted" },
  { key: "todo", label: "To Do", color: "bg-neo-white" },
  { key: "in_progress", label: "In Progress", color: "bg-neo-secondary" },
  {
    key: "done",
    label: "Done",
    color: "bg-neo-ink",
    textColor: "text-neo-white",
    icon: Check,
  },
];

/**
 * Full Kanban board with @dnd-kit drag-and-drop, search filtering,
 * loading skeletons, empty states, and CRUD modal.
 */
export default function KanbanBoard({
  eventId,
  eventTitle = "Task Board",
  onCollapse,
}) {
  const { searchQuery } = useApp();
  const { tasks, loading, error, moveTask } = useTasks(eventId);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [activeId, setActiveId] = useState(null);

  const query = searchQuery.toLowerCase();

  // Group tasks by status and filter by search
  const grouped = useMemo(() => {
    const map = {};
    COLUMNS.forEach((col) => (map[col.key] = []));
    tasks.forEach((t) => {
      if (map[t.status]) {
        if (
          !query ||
          t.title.toLowerCase().includes(query) ||
          (t.assignee && t.assignee.toLowerCase().includes(query))
        ) {
          map[t.status].push(t);
        }
      }
    });
    return map;
  }, [tasks, query]);

  // Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // Active task for DragOverlay
  const activeTask = activeId
    ? tasks.find((t) => t.id === activeId)
    : null;

  function handleDragStart(event) {
    setActiveId(event.active.id);
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const taskId = active.id;
    // Determine target column: `over.id` is either a task id or a column droppable id
    let targetStatus = null;

    // Check if dropped over a column droppable
    const col = COLUMNS.find((c) => c.key === over.id);
    if (col) {
      targetStatus = col.key;
    } else {
      // Dropped over another task — find that task's status
      const overTask = tasks.find((t) => t.id === over.id);
      if (overTask) targetStatus = overTask.status;
    }

    if (!targetStatus) return;

    const currentTask = tasks.find((t) => t.id === taskId);
    if (!currentTask || currentTask.status === targetStatus) return;

    moveTask(taskId, targetStatus);
  }

  function openNewTask(status = "backlog") {
    setEditingTask(null);
    setModalOpen(true);
  }

  function openEditTask(task) {
    setEditingTask(task);
    setModalOpen(true);
  }

  function handleMove(taskId, newStatus) {
    moveTask(taskId, newStatus);
  }

  // ─── Loading skeleton ───
  if (loading) {
    return (
      <Card
        headerContent={
          <span className="flex items-center gap-2">
            <Columns3 size={16} strokeWidth={3} />
            Task Board
          </span>
        }
        headerColor="bg-neo-white"
        noPadding
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {COLUMNS.map((col) => (
            <div
              key={col.key}
              className="border-r-0 sm:border-r-4 sm:last:border-r-0 border-neo-ink min-h-[200px]"
            >
              <div
                className={[
                  "px-3 py-2 border-b-4 border-neo-ink font-bold text-xs uppercase tracking-wider",
                  col.color,
                  col.textColor || "text-neo-ink",
                ].join(" ")}
              >
                {col.label}
              </div>
              <div className="p-2 space-y-2">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="border-4 border-neo-ink/20 bg-neo-bg p-3 animate-pulse"
                  >
                    <div className="h-4 bg-neo-ink/10 w-3/4 mb-2" />
                    <div className="h-3 bg-neo-ink/10 w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  // ─── Error state ───
  if (error) {
    return (
      <Card
        headerContent={
          <span className="flex items-center gap-2">
            <Columns3 size={16} strokeWidth={3} />
            Task Board
          </span>
        }
        headerColor="bg-neo-white"
      >
        <div className="border-4 border-neo-accent bg-neo-accent/10 p-4 text-center">
          <p className="font-bold text-sm text-neo-accent">
            Failed to load tasks: {error}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card
        headerContent={
          <span className="flex items-center justify-between w-full">
            <span className="flex items-center gap-2">
              <Columns3 size={16} strokeWidth={3} />
              <span>{eventTitle}</span>
            </span>
            <span className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => openNewTask()}
                className="!h-7 !text-[10px] !px-2 !border-2 !shadow-[2px_2px_0_#000]"
              >
                <Plus size={12} strokeWidth={3} />
                Task
              </Button>
              {onCollapse && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCollapse}
                  className="!h-7 !text-[10px] !px-2 !border-2"
                >
                  Collapse
                </Button>
              )}
            </span>
          </span>
        }
        headerColor="bg-neo-white"
        noPadding
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {COLUMNS.map((col) => {
              const colTasks = grouped[col.key];
              return (
                <KanbanColumn
                  key={col.key}
                  column={col}
                  tasks={colTasks}
                  query={query}
                  onEdit={openEditTask}
                  onMove={handleMove}
                />
              );
            })}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeTask ? (
              <div className="bg-neo-white border-4 border-neo-ink p-3 shadow-neo-md rotate-[2deg] w-56">
                <p className="font-bold text-sm">{activeTask.title}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </Card>

      <TaskModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTask(null);
        }}
        task={editingTask}
        eventId={eventId}
      />
    </>
  );
}

/* ─── Column component with droppable ─── */

function KanbanColumn({ column, tasks, query, onEdit, onMove }) {
  const ColIcon = column.icon;
  const { setNodeRef, isOver } = useDroppable({ id: column.key });

  return (
    <div
      ref={setNodeRef}
      className={[
        "border-r-0 sm:border-r-4 sm:last:border-r-0 border-neo-ink min-h-[200px] flex flex-col transition-colors duration-100",
        isOver ? "bg-neo-secondary/20" : "",
      ].join(" ")}
    >
      {/* Column header */}
      <div
        className={[
          "px-3 py-2 border-b-4 border-neo-ink font-bold text-xs uppercase tracking-wider flex items-center gap-2",
          column.color,
          column.textColor || "text-neo-ink",
        ].join(" ")}
      >
        {ColIcon && <ColIcon size={14} strokeWidth={3} />}
        {column.label}
        <span
          className={[
            "ml-auto w-6 h-6 flex items-center justify-center border-2 rounded-full text-[10px] font-black",
            column.textColor
              ? "border-neo-white text-neo-white"
              : "border-neo-ink text-neo-ink",
          ].join(" ")}
        >
          {tasks.length}
        </span>
      </div>

      {/* Task list */}
      <SortableContext
        id={column.key}
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="p-2 space-y-2 min-h-[120px]">
          {tasks.length === 0 ? (
            <p className="text-center py-6 font-bold text-xs text-neo-ink/30 uppercase">
              {query ? "No matches" : "No tasks"}
            </p>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={onEdit}
                onMove={onMove}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}
