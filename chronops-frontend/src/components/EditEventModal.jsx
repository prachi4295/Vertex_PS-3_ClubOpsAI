import { useState, useEffect } from "react";
import { Edit3, Calendar, MapPin, Tag } from "lucide-react";
import { Modal, Input } from "./ui";
import Button from "./ui/Button";

const CATEGORY_OPTIONS = [
  "Flagship Hackathon",
  "Tech Conference",
  "Campus Drive",
  "Workshop & Bootcamp",
  "Meetup & Demo Day",
  "Competition",
];

const LOCAL_EVENTS_STORAGE_KEY = "clubops_all_events_list";

/**
 * EditEventModal: Allows organizers to change event name, date, location, category, and tagline.
 */
export default function EditEventModal({ open, onClose, event, onEventUpdated }) {
  const [form, setForm] = useState({
    name: "",
    category: "Flagship Hackathon",
    tagline: "",
    date: "",
    location: "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (event) {
      setForm({
        name: event.name || "",
        category: event.category || "Flagship Hackathon",
        tagline: event.tagline || "",
        date: event.date || new Date().toISOString().split("T")[0],
        location: event.location || "",
      });
    }
    setErrors({});
  }, [event, open]);

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Event name is required";
    if (!form.date) errs.date = "Event date is required";
    if (!form.location.trim()) errs.location = "Venue / Location is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const updatedEvent = {
        ...event,
        name: form.name.trim(),
        category: form.category,
        tagline: form.tagline.trim(),
        date: form.date,
        location: form.location.trim(),
      };

      // Update in localStorage
      try {
        const saved = localStorage.getItem(LOCAL_EVENTS_STORAGE_KEY);
        if (saved) {
          const list = JSON.parse(saved);
          const updatedList = list.map((ev) =>
            ev.id === event.id ? updatedEvent : ev
          );
          localStorage.setItem(
            LOCAL_EVENTS_STORAGE_KEY,
            JSON.stringify(updatedList)
          );
        }
      } catch (err) {
        console.warn("Failed to persist updated event to localStorage:", err);
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("clubops-data-updated"));
      }

      onEventUpdated?.(updatedEvent);
      onClose();
    } catch (err) {
      setErrors({ submit: err.message || "Failed to update event" });
    } finally {
      setSaving(false);
    }
  };

  if (!event) return null;

  return (
    <Modal open={open} onClose={onClose} title="Edit Event Board Details">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label
            htmlFor="edit-event-name"
            className="block font-bold text-xs uppercase tracking-wider mb-1"
          >
            Event Name *
          </label>
          <Input
            id="edit-event-name"
            placeholder="e.g. HackGenesis 2026"
            value={form.name}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, name: e.target.value }));
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            className={errors.name ? "!border-neo-accent" : ""}
          />
          {errors.name && (
            <p className="mt-1 font-bold text-xs text-neo-accent">{errors.name}</p>
          )}
        </div>

        {/* Date & Location row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="edit-event-date"
              className="block font-bold text-xs uppercase tracking-wider mb-1"
            >
              Event Date *
            </label>
            <Input
              id="edit-event-date"
              type="date"
              value={form.date}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, date: e.target.value }));
                if (errors.date) setErrors((prev) => ({ ...prev, date: undefined }));
              }}
              className={errors.date ? "!border-neo-accent" : ""}
            />
            {errors.date && (
              <p className="mt-1 font-bold text-xs text-neo-accent">{errors.date}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="edit-event-location"
              className="block font-bold text-xs uppercase tracking-wider mb-1"
            >
              Location / Venue *
            </label>
            <Input
              id="edit-event-location"
              placeholder="e.g. Main Auditorium & Hall B"
              value={form.location}
              onChange={(e) => {
                setForm((prev) => ({ ...prev, location: e.target.value }));
                if (errors.location) setErrors((prev) => ({ ...prev, location: undefined }));
              }}
              className={errors.location ? "!border-neo-accent" : ""}
            />
            {errors.location && (
              <p className="mt-1 font-bold text-xs text-neo-accent">
                {errors.location}
              </p>
            )}
          </div>
        </div>

        {/* Category */}
        <div>
          <label
            htmlFor="edit-event-category"
            className="block font-bold text-xs uppercase tracking-wider mb-1"
          >
            Category
          </label>
          <select
            id="edit-event-category"
            value={form.category}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, category: e.target.value }))
            }
            className="w-full h-12 px-3 bg-neo-white text-neo-ink font-bold border-4 border-neo-ink rounded-none cursor-pointer focus:bg-neo-secondary focus:shadow-neo-sm focus:outline-none"
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Tagline */}
        <div>
          <label
            htmlFor="edit-event-tagline"
            className="block font-bold text-xs uppercase tracking-wider mb-1"
          >
            Tagline / Subtitle
          </label>
          <Input
            id="edit-event-tagline"
            placeholder="e.g. 36-Hour National AI Hackathon"
            value={form.tagline}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, tagline: e.target.value }))
            }
          />
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="bg-neo-accent/10 border-4 border-neo-accent p-3">
            <p className="font-bold text-xs text-neo-accent">{errors.submit}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 pt-3 border-t-2 border-neo-ink/20">
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
            {saving ? "Saving Changes..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
