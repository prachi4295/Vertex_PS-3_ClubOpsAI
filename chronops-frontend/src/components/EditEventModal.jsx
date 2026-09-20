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
  "Other",
];

import { getStoredEvents, saveStoredEvents } from "../lib/storage";

/**
 * EditEventModal: Allows organizers to change event name, date, location, category (with Other option), and tagline.
 */
export default function EditEventModal({ open, onClose, event, onEventUpdated }) {
  const [form, setForm] = useState({
    name: "",
    category: "Flagship Hackathon",
    tagline: "",
    date: "",
    location: "",
  });
  const [customCategory, setCustomCategory] = useState("");
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (event) {
      const isStandardCat = CATEGORY_OPTIONS.includes(event.category) && event.category !== "Other";
      setForm({
        name: event.name || "",
        category: isStandardCat ? event.category : "Other",
        tagline: event.tagline || "",
        date: event.date || new Date().toISOString().split("T")[0],
        location: event.location || "",
      });
      setCustomCategory(!isStandardCat ? event.category || "" : "");
    }
    setErrors({});
  }, [event, open]);

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = "Event name is required";
    if (!form.date) e.date = "Event date is required";
    if (!form.location.trim()) e.location = "Location/Venue is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    try {
      const effectiveCategory = form.category === "Other"
        ? (customCategory.trim() || "Other")
        : form.category;

      const updatedEvent = {
        ...event,
        name: form.name.trim(),
        category: effectiveCategory,
        tagline: form.tagline.trim(),
        date: form.date,
        location: form.location.trim(),
      };

      // Save to user-scoped storage
      const eventsList = getStoredEvents();
      const updatedList = eventsList.map((ev) =>
        ev.id === event.id ? updatedEvent : ev
      );
      saveStoredEvents(updatedList);

      if (onEventUpdated) {
        onEventUpdated(updatedEvent);
      }

      onClose();
    } catch (err) {
      console.error("Failed to update event:", err);
      setErrors({ submit: "Failed to save event details." });
    } finally {
      setSaving(false);
    }
  };

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
            placeholder="e.g. ChronOps Tech Summit 2026"
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

        {/* Category with "Other" option (Item 15) */}
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

          {form.category === "Other" && (
            <div className="mt-2">
              <Input
                placeholder="Enter custom category (e.g. Design Sprint, Esports)"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="!h-10 text-xs font-bold"
              />
            </div>
          )}
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

        {errors.submit && (
          <p className="font-bold text-xs text-neo-accent">{errors.submit}</p>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t-2 border-neo-ink">
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
            {saving ? "Saving..." : "Save Details"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
