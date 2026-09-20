import { useState, useEffect } from "react";
import {
  Sparkles,
  Clock,
  User,
  Plus,
  Trash2,
  Check,
  Radio,
  Sliders,
  Calendar,
} from "lucide-react";
import { Modal, Input, Badge } from "./ui";
import Button from "./ui/Button";
import { configureSessionsWithAI } from "../services/gemini";
import { setSessionsBatchForEvent } from "../hooks/useSessions";
import { useNotifications } from "../hooks/useNotifications";
import { formatDuration } from "../lib/time";
import { INITIAL_EVENTS } from "../data/multiEvents";

import { getStoredEvents } from "../lib/storage";

const PRESET_PROMPTS = [
  {
    label: "36-Hour Hackathon",
    text: "Configure a run-of-show schedule for a national hackathon: 09:00 AM Inauguration & Lamp Lighting (fixed), 09:30 AM Keynote by Dr. Mukherjee (flexible), 10:30 AM Hands-on AI Workshop (flexible), 01:00 PM Lunch Break (fixed), 03:00 PM Mentor Check-in (flexible), and 06:00 PM Pitch Demos & Closing Ceremony (fixed).",
  },
  {
    label: "1-Day Tech Conference",
    text: "1-day tech summit from 10:00 AM to 5:00 PM: 10:00 AM Welcome Address, 10:30 AM Industry Keynote on Agentic AI, 11:30 AM VC & Founders Panel, 12:30 PM Networking Lunch (fixed), 02:00 PM Live Hack Showcase, and 04:30 PM Awards & Valedictory (fixed).",
  },
  {
    label: "Campus Club Orientation",
    text: "2-hour student recruitment and club orientation: 10:00 AM Welcome & Icebreaker, 10:30 AM Live Project Demos by Senior Leads, 11:15 AM Interactive Q&A, and 11:45 AM Registration & Member Enrollment.",
  },
];

export default function ConfigureSessionsModal({
  open,
  onClose,
  initialEventId = "chronops-summit-2026",
  onSessionsSaved,
}) {
  const { addNotification } = useNotifications();

  // Load available events
  const [events, setEvents] = useState(() => {
    const list = getStoredEvents();
    return list.length > 0 ? list : INITIAL_EVENTS;
  });

  const [selectedEventId, setSelectedEventId] = useState(initialEventId);
  const [promptText, setPromptText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Generated sessions preview
  const [previewSessions, setPreviewSessions] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialEventId) {
      setSelectedEventId(initialEventId);
    }
    const list = getStoredEvents();
    if (list.length > 0) {
      setEvents(list);
    }
  }, [initialEventId, open]);

  const selectedEvent = events.find((e) => e.id === selectedEventId) || events[0] || {
    id: selectedEventId,
    name: "Event Stage",
  };

  const handleGenerate = async () => {
    if (!promptText.trim()) {
      setErrorMsg("Please specify session requirements or choose an agenda preset.");
      return;
    }

    setGenerating(true);
    setErrorMsg("");

    try {
      const generated = await configureSessionsWithAI(promptText, selectedEvent);
      setPreviewSessions(generated);
    } catch (err) {
      console.error("AI session generation error:", err);
      setErrorMsg(`Generation failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveToEvent = async () => {
    if (!previewSessions || previewSessions.length === 0) return;

    setSaving(true);
    setErrorMsg("");

    try {
      await setSessionsBatchForEvent(selectedEventId, previewSessions);

      addNotification({
        type: "ai",
        message: `Configured ${previewSessions.length} sessions for "${selectedEvent.name}" Live Stage!`,
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("clubops-data-updated"));
      }

      onSessionsSaved?.(selectedEventId, previewSessions);
      handleClose();
    } catch (err) {
      console.error("Failed to save sessions to event:", err);
      setErrorMsg(`Could not save sessions: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSession = (idx) => {
    setPreviewSessions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleClose = () => {
    setPreviewSessions(null);
    setErrorMsg("");
    setGenerating(false);
    setSaving(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Configure Live Stage Sessions with AI">
      <div className="space-y-4">
        {/* Event Selection */}
        <div>
          <label className="block font-bold text-xs uppercase tracking-wider mb-1 text-neo-ink">
            Target Event Board
          </label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            disabled={!!previewSessions}
            className="w-full h-12 px-3 bg-neo-white text-neo-ink font-bold border-4 border-neo-ink rounded-none cursor-pointer focus:bg-neo-secondary focus:outline-none"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name} ({ev.category})
              </option>
            ))}
          </select>
        </div>

        {!previewSessions ? (
          <>
            {/* Quick Presets */}
            <div>
              <span className="block font-bold text-xs uppercase tracking-wider mb-1.5 text-neo-ink">
                Quick Agenda Templates
              </span>
              <div className="flex flex-wrap gap-2">
                {PRESET_PROMPTS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setPromptText(p.text)}
                    className="border-2 border-neo-ink bg-neo-bg hover:bg-neo-secondary px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-neo-ink transition-colors"
                  >
                    + {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt input */}
            <div>
              <label className="block font-bold text-xs uppercase tracking-wider mb-1 text-neo-ink">
                Agenda Prompt / Session Requirements
              </label>
              <textarea
                rows={5}
                placeholder="Describe your desired event schedule, session durations, speaker topics, and fixed breaks..."
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                className="w-full p-3 font-mono text-xs border-4 border-neo-ink bg-neo-white focus:outline-none focus:bg-neo-secondary focus:shadow-neo-sm"
              />
            </div>

            {errorMsg && (
              <div className="bg-neo-accent/10 border-4 border-neo-accent p-3">
                <p className="font-bold text-xs text-neo-accent">{errorMsg}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t-2 border-neo-ink/20">
              <Button type="button" variant="outline" size="sm" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={generating}
                onClick={handleGenerate}
              >
                <Sparkles size={16} strokeWidth={3} />
                {generating ? "Generating Run of Show..." : "Configure Sessions with AI"}
              </Button>
            </div>
          </>
        ) : (
          /* Preview Mode */
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
            <div className="flex items-center justify-between border-b-2 border-neo-ink/20 pb-2">
              <div>
                <p className="font-black text-xs uppercase tracking-wider text-neo-ink">
                  Generated Run of Show for {selectedEvent.name}
                </p>
                <p className="text-[11px] font-bold text-neo-ink/60">
                  {previewSessions.length} sessions configured
                </p>
              </div>
              <Badge color="secondary">AI Generated</Badge>
            </div>

            {/* Sessions List */}
            <div className="space-y-2">
              {previewSessions.map((s, idx) => (
                <div
                  key={idx}
                  className="border-4 border-neo-ink bg-neo-white p-3 shadow-neo-sm flex items-start justify-between gap-2"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-black font-mono text-xs bg-neo-ink text-neo-white px-1.5 py-0.5 border border-neo-ink">
                        {s.startTime}
                      </span>
                      <Badge color={s.sessionType === "fixed" ? "accent" : "muted"} className="!text-[9px]">
                        {formatDuration(s.durationMinutes)} • {s.sessionType}
                      </Badge>
                      {s.phoneticGuide && (
                        <span className="text-[10px] font-bold text-neo-ink/60 italic">
                          "{s.phoneticGuide}"
                        </span>
                      )}
                    </div>
                    <p className="font-black text-sm text-neo-ink">{s.title}</p>
                    {s.speaker && (
                      <p className="text-xs font-bold text-neo-ink/70 mt-0.5">
                        <User size={12} className="inline mr-1" />
                        {s.speaker} {s.bio ? `— ${s.bio}` : ""}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveSession(idx)}
                    className="p-1 text-neo-ink/40 hover:text-neo-accent transition-colors"
                    title="Remove Session"
                  >
                    <Trash2 size={16} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
            </div>

            {errorMsg && (
              <div className="bg-neo-accent/10 border-4 border-neo-accent p-3">
                <p className="font-bold text-xs text-neo-accent">{errorMsg}</p>
              </div>
            )}

            {/* Save Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t-2 border-neo-ink/20">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={saving}
                onClick={() => setPreviewSessions(null)}
              >
                Back to Prompt
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={saving}
                onClick={handleSaveToEvent}
              >
                <Check size={16} strokeWidth={3} />
                {saving ? "Saving Sessions..." : "Apply & Save to Live Stage"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
