import { useState } from "react";
import { Plus, Edit3, Star } from "lucide-react";
import { Badge, Modal } from "./ui";
import Button from "./ui/Button";
import TaskModal from "./TaskModal";

export default function SubHeader() {
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editStageOpen, setEditStageOpen] = useState(false);

  return (
    <>
      <div className="flex flex-wrap items-center gap-4 px-4 py-5 sm:px-6 lg:px-8 max-w-[1440px] mx-auto">
        {/* Title with sticker rotation */}
        <div className="flex items-center gap-3">
          <Star
            size={24}
            strokeWidth={3}
            className="text-neo-accent animate-spin-slow"
          />
          <h1
            className="text-2xl sm:text-3xl font-black tracking-tight text-neo-ink rotate-[-1deg] inline-block"
          >
            Dashboard
          </h1>
          <Badge color="secondary" rotate className="hidden sm:inline-flex">
            HackGenesis 2026
          </Badge>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setTaskModalOpen(true)}
          >
            <Plus size={16} strokeWidth={3} />
            Add Plan
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditStageOpen(true)}
          >
            <Edit3 size={16} strokeWidth={3} />
            Edit Stage
          </Button>
        </div>
      </div>

      {/* Task modal for "+ Add Plan" */}
      <TaskModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        task={null}
      />

      <Modal
        open={editStageOpen}
        onClose={() => setEditStageOpen(false)}
        title="Edit Stage"
      >
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto bg-neo-muted border-4 border-neo-ink flex items-center justify-center mb-4">
            <Edit3 size={32} strokeWidth={3} />
          </div>
          <p className="font-bold text-lg mb-2">Stage Editor</p>
          <p className="font-bold text-sm text-neo-ink/50">
            Configure your event stage layout. Coming soon.
          </p>
        </div>
      </Modal>
    </>
  );
}
