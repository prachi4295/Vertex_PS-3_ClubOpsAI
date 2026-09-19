import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  Calendar,
  Clock,
  Mic,
  Check,
  X,
  AlertTriangle,
  Wand2,
} from "lucide-react";
import { Modal, Input, Textarea, Badge } from "./ui";
import Button from "./ui/Button";
import { useSessions } from "../hooks/useSessions";
import { useNotifications } from "../hooks/useNotifications";
import { generatePhoneticGuide } from "../services/gemini";

/**
 * Edit Stage Modal.
 * Allows adding, editing, deleting, and reordering sessions.
 * Guarantees plannedStart = startTime when creating a session.
 */
export default function EditStageModal({ open, onClose }) {
  const { addNotification } = useNotifications();
  const {
    sessions,
    addSession,
    updateSession,
    deleteSession,
    reorderSessions,
  } = useSessions();

  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: "",
    speaker: "",
    bio: "",
    startTime: "09:00",
    durationMinutes: 30,
    sessionType: "flexible",
    phoneticGuide: "",
  });

  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [generatingPhonetic, setGeneratingPhonetic] = useState(false);

  // Generate phonetic guide via Gemini helper
  const handleGeneratePhonetic = async () => {
    const speakerName = form.speaker?.trim();
    if (!speakerName) return;

    setGeneratingPhonetic(true);
    try {
      const guide = await generatePhoneticGuide(speakerName);
      if (guide) {
        setForm((prev) => ({ ...prev, phoneticGuide: guide }));
        addNotification({
          message: `AI generated phonetic guide "${guide}" for ${speakerName}.`,
          type: "ai",
        });
      }
    } catch (err) {
      console.warn("Failed to generate phonetic guide:", err);
    } finally {
      setGeneratingPhonetic(false);
    }
  };

  // Reset form when opening or changing mode
  useEffect(() => {
    if (!open) {
      setEditingId(null);
      setIsAdding(false);
      setFormErrors({});
      setGeneratingPhonetic(false);
    }
  }, [open]);

  const sortedSessions = [...sessions].sort(
    (a, b) => (a.order || 0) - (b.order || 0) || (a.startTime || "").localeCompare(b.startTime || "")
  );

  const startEdit = (session) => {
    setEditingId(session.id);
    setIsAdding(false);
    setForm({
      title: session.title || "",
      speaker: session.speaker || "",
      bio: session.bio || "",
      startTime: session.startTime || "09:00",
      durationMinutes: session.durationMinutes || 30,
      sessionType: session.sessionType || "flexible",
      phoneticGuide: session.phoneticGuide || "",
    });
    setFormErrors({});
  };

  const startAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    // Find estimated start time from last session
    let defaultStart = "09:00";
    if (sortedSessions.length > 0) {
      const last = sortedSessions[sortedSessions.length - 1];
      const [h, m] = (last.startTime || "09:00").split(":").map(Number);
      const endMin = h * 60 + m + (last.durationMinutes || 30);
      const endH = Math.floor(endMin / 60) % 24;
      const endM = endMin % 60;
      defaultStart = `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;
    }

    setForm({
      title: "",
      speaker: "",
      bio: "",
      startTime: defaultStart,
      durationMinutes: 30,
      sessionType: "flexible",
      phoneticGuide: "",
    });
    setFormErrors({});
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = "Session title is required";
    if (!form.startTime.trim()) errs.startTime = "Start time is required";
    if (!/^\d{1,2}:\d{2}$/.test(form.startTime.trim())) {
      errs.startTime = "Format must be HH:mm (e.g. 09:30)";
    }
    if (!form.durationMinutes || Number(form.durationMinutes) <= 0) {
      errs.durationMinutes = "Duration must be greater than 0";
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      if (isAdding) {
        // Spec rule: Keep plannedStart equal to startTime when creating a session
        await addSession({
          title: form.title.trim(),
          speaker: form.speaker.trim(),
          bio: form.bio.trim(),
          startTime: form.startTime.trim(),
          plannedStart: form.startTime.trim(), // INVARIANT
          durationMinutes: Number(form.durationMinutes),
          sessionType: form.sessionType,
          phoneticGuide: form.phoneticGuide.trim(),
          order: sortedSessions.length + 1,
        });
        setIsAdding(false);
      } else if (editingId) {
        await updateSession(editingId, {
          title: form.title.trim(),
          speaker: form.speaker.trim(),
          bio: form.bio.trim(),
          startTime: form.startTime.trim(),
          durationMinutes: Number(form.durationMinutes),
          sessionType: form.sessionType,
          phoneticGuide: form.phoneticGuide.trim(),
        });
        setEditingId(null);
      }
    } catch (err) {
      setFormErrors({ submit: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to remove this session from the run-sheet?")) {
      await deleteSession(id);
    }
  };

  const handleMoveUp = async (index) => {
    if (index <= 0) return;
    const newOrdered = [...sortedSessions];
    const temp = newOrdered[index - 1];
    newOrdered[index - 1] = newOrdered[index];
    newOrdered[index] = temp;
    await reorderSessions(newOrdered.map((s) => s.id));
  };

  const handleMoveDown = async (index) => {
    if (index >= sortedSessions.length - 1) return;
    const newOrdered = [...sortedSessions];
    const temp = newOrdered[index + 1];
    newOrdered[index + 1] = newOrdered[index];
    newOrdered[index] = temp;
    await reorderSessions(newOrdered.map((s) => s.id));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Stage Run-Sheet Editor"
      className="max-w-2xl w-full"
    >
      <div className="space-y-4">
        {/* Top bar: session count + Add button */}
        <div className="flex items-center justify-between border-b-2 border-neo-ink pb-3">
          <div>
            <span className="font-black text-xs uppercase tracking-wider text-neo-ink">
              Live Sessions ({sortedSessions.length})
            </span>
            <p className="text-[11px] font-bold text-neo-ink/50 uppercase">
              Configure order, phonetic guides & stage anchors
            </p>
          </div>

          {!isAdding && !editingId && (
            <Button
              variant="secondary"
              size="sm"
              onClick={startAdd}
              className="!h-8 !text-xs !px-3"
            >
              <Plus size={14} strokeWidth={3} />
              Add Session
            </Button>
          )}
        </div>

        {/* Add / Edit Form */}
        {(isAdding || editingId) && (
          <form
            onSubmit={handleSave}
            className="p-4 bg-neo-bg border-4 border-neo-ink shadow-[2px_2px_0_#000] space-y-3"
          >
            <div className="flex items-center justify-between border-b-2 border-neo-ink/20 pb-2">
              <span className="font-black text-xs uppercase text-neo-ink">
                {isAdding ? "New Session (plannedStart = startTime)" : "Edit Session"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingId(null);
                }}
                className="cursor-pointer text-neo-ink/60 hover:text-neo-ink"
              >
                <X size={16} strokeWidth={3} />
              </button>
            </div>

            {formErrors.submit && (
              <div className="p-2 bg-neo-accent/20 border-2 border-neo-accent text-[11px] font-bold text-neo-ink">
                {formErrors.submit}
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider mb-1">
                Session Title *
              </label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Keynote: Autonomous Agents"
                className="!h-9 !text-xs"
              />
              {formErrors.title && (
                <p className="text-[10px] font-bold text-neo-accent mt-0.5">{formErrors.title}</p>
              )}
            </div>

            {/* Speaker & Phonetic Guide */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider mb-1">
                  Speaker Name
                </label>
                <Input
                  value={form.speaker}
                  onChange={(e) => setForm({ ...form, speaker: e.target.value })}
                  placeholder="e.g. Dr. Ramesh Gupta"
                  className="!h-9 !text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-black uppercase tracking-wider">
                    Phonetic Guide (for MC)
                  </label>
                  <button
                    type="button"
                    disabled={generatingPhonetic || !form.speaker?.trim()}
                    onClick={handleGeneratePhonetic}
                    className="text-[10px] font-black text-neo-ink bg-neo-secondary hover:bg-neo-secondary/80 disabled:opacity-40 px-1.5 py-0.5 border border-neo-ink flex items-center gap-1 shadow-[1px_1px_0_#000] cursor-pointer active:translate-x-[1px] active:translate-y-[1px]"
                    title="Generate phonetic pronunciation guide with AI"
                  >
                    <Wand2 size={10} strokeWidth={3} className={generatingPhonetic ? "animate-spin" : ""} />
                    {generatingPhonetic ? "Generating..." : "Generate phonetic guide"}
                  </button>
                </div>
                <Input
                  value={form.phoneticGuide}
                  onChange={(e) => setForm({ ...form, phoneticGuide: e.target.value })}
                  placeholder="e.g. Dr. GOOP-ta"
                  className="!h-9 !text-xs bg-neo-secondary/15"
                />
              </div>
            </div>

            {/* Start Time, Duration, Session Type */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider mb-1">
                  Start (HH:mm) *
                </label>
                <Input
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  placeholder="09:30"
                  className="!h-9 !text-xs"
                />
                {formErrors.startTime && (
                  <p className="text-[10px] font-bold text-neo-accent mt-0.5">{formErrors.startTime}</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider mb-1">
                  Duration (min) *
                </label>
                <Input
                  type="number"
                  min="5"
                  max="300"
                  value={form.durationMinutes}
                  onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                  className="!h-9 !text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider mb-1">
                  Type *
                </label>
                <select
                  value={form.sessionType}
                  onChange={(e) => setForm({ ...form, sessionType: e.target.value })}
                  className="w-full h-9 px-2 bg-neo-white border-4 border-neo-ink text-xs font-bold text-neo-ink focus:bg-neo-secondary focus:outline-none"
                >
                  <option value="flexible">Flexible</option>
                  <option value="fixed">Fixed (Anchor)</option>
                </select>
              </div>
            </div>

            {/* Speaker Bio */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider mb-1">
                Speaker Bio / Stage Notes
              </label>
              <Input
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Key achievements, credentials, or intro notes"
                className="!h-9 !text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingId(null);
                }}
                className="!h-8 !text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                disabled={saving}
                className="!h-8 !text-xs"
              >
                {saving ? "Saving..." : isAdding ? "Create Session" : "Save Changes"}
              </Button>
            </div>
          </form>
        )}

        {/* Sessions List */}
        <div className="divide-y-2 border-4 border-neo-ink bg-neo-white max-h-96 overflow-y-auto shadow-inner">
          {sortedSessions.length === 0 ? (
            <p className="p-8 text-center font-bold text-xs uppercase text-neo-ink/40">
              No sessions found. Click "+ Add Session" to create one.
            </p>
          ) : (
            sortedSessions.map((session, index) => (
              <div
                key={session.id}
                className={[
                  "flex items-center gap-3 p-3 transition-colors",
                  session.status === "live" ? "bg-neo-accent/10" : "hover:bg-neo-bg",
                ].join(" ")}
              >
                {/* Reorder up/down buttons */}
                <div className="flex flex-col gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    aria-label="Move session earlier"
                    className="w-5 h-5 flex items-center justify-center border border-neo-ink bg-neo-white hover:bg-neo-secondary disabled:opacity-20 cursor-pointer"
                  >
                    <ArrowUp size={10} strokeWidth={3} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === sortedSessions.length - 1}
                    aria-label="Move session later"
                    className="w-5 h-5 flex items-center justify-center border border-neo-ink bg-neo-white hover:bg-neo-secondary disabled:opacity-20 cursor-pointer"
                  >
                    <ArrowDown size={10} strokeWidth={3} />
                  </button>
                </div>

                {/* Time & Type Badge */}
                <div className="w-16 shrink-0 text-center">
                  <div className="font-black text-xs text-neo-ink">{session.startTime}</div>
                  <div className="text-[9px] font-bold text-neo-ink/50 uppercase">
                    {session.durationMinutes}m
                  </div>
                </div>

                {/* Title, Speaker & Phonetic */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-xs text-neo-ink truncate">
                      {session.title}
                    </span>
                    <Badge
                      color={session.sessionType === "fixed" ? "accent" : "muted"}
                      className="!text-[8px] !px-1.5 !py-0 !border"
                    >
                      {session.sessionType.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="text-[10px] font-bold text-neo-ink/70 flex items-center gap-2 mt-0.5">
                    {session.speaker && <span>{session.speaker}</span>}
                    {session.phoneticGuide && (
                      <span className="bg-neo-secondary/50 px-1 border border-neo-ink/40 text-neo-ink">
                        🗣️ {session.phoneticGuide}
                      </span>
                    )}
                  </div>
                </div>

                {/* Edit & Delete Action Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(session)}
                    aria-label={`Edit session ${session.title}`}
                    className="w-7 h-7 flex items-center justify-center border-2 border-neo-ink bg-neo-white hover:bg-neo-secondary cursor-pointer shadow-[1px_1px_0_#000]"
                  >
                    <Edit2 size={12} strokeWidth={3} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(session.id)}
                    aria-label={`Delete session ${session.title}`}
                    className="w-7 h-7 flex items-center justify-center border-2 border-neo-ink bg-neo-white hover:bg-neo-accent hover:text-neo-white cursor-pointer shadow-[1px_1px_0_#000]"
                  >
                    <Trash2 size={12} strokeWidth={3} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
