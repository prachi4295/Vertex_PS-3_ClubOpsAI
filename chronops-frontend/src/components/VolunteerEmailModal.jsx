import { useState, useEffect } from "react";
import { Mail, Send, Check, Sparkles, ExternalLink, X } from "lucide-react";
import { Modal, Input, Textarea } from "./ui";
import Button from "./ui/Button";
import { draftVolunteerEmail } from "../services/gemini";
import { useNotifications } from "../hooks/useNotifications";

const VOLUNTEER_GROUPS = [
  {
    id: "all",
    label: "All Volunteers & Crew (5)",
    emails: "rahul.design@chronops.io, priya.ops@chronops.io, arjun.tech@chronops.io, kavya.logistics@chronops.io, neha.pr@chronops.io",
  },
  {
    id: "stage",
    label: "Stage & AV Crew (2)",
    emails: "priya.ops@chronops.io, arjun.tech@chronops.io",
  },
  {
    id: "registration",
    label: "Registration & Desk (2)",
    emails: "neha.pr@chronops.io, rahul.design@chronops.io",
  },
  {
    id: "runners",
    label: "Logistics & Runners (2)",
    emails: "kavya.logistics@chronops.io, priya.ops@chronops.io",
  },
];

const TEMPLATES = [
  {
    id: "urgent",
    title: "Urgent Shift Reinforcements",
    subject: "URGENT: Volunteer Reinforcements Needed at Main Stage",
    body: "Team, we have a surge in attendees at the Main Stage. We need available volunteers to report to Stage Left immediately for runner and microphone support. Please acknowledge upon receipt.",
  },
  {
    id: "delay",
    title: "Schedule Reflow & Delay",
    subject: "OPERATIONAL UPDATE: Stage Schedule Shift (+15m)",
    body: "Volunteers: A 15-minute delay has occurred on the live stage due to keynote Q&A. All upcoming sessions have been reflowed. Ushers please notify auditorium doors and adjust hall signage.",
  },
  {
    id: "live",
    title: "Keynote Commencing",
    subject: "STAGE ALERT: Keynote Session is Going Live Now",
    body: "Volunteers: The upcoming keynote session is commencing on the main stage right now. Ensure aisle ways are clear, water is stationed at the anchor lectern, and recording lights are active.",
  },
  {
    id: "standup",
    title: "Shift Handover & Lunch",
    subject: "ChronOps Shift Handover & Daily Briefing",
    body: "Hi team, great job keeping operations smooth today. Please sync with your shift leads at the SAC plaza for midday check-in and lunch distribution. Keep up the high energy!",
  },
];

import { getStoredDispatches, saveStoredDispatches } from "../lib/storage";

export default function VolunteerEmailModal({ open, onClose, defaultContext = "" }) {
  const { addNotification } = useNotifications();

  const [selectedGroup, setSelectedGroup] = useState("all");
  const [recipientEmails, setRecipientEmails] = useState(VOLUNTEER_GROUPS[0].emails);
  const [subject, setSubject] = useState("ChronOps Volunteer Operational Announcement");
  const [body, setBody] = useState(
    defaultContext ||
      "Team, please ensure all stage positions and timecards are synchronized for the upcoming session."
  );
  const [isDraftingAI, setIsDraftingAI] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  useEffect(() => {
    if (defaultContext) {
      setBody(defaultContext);
    }
  }, [defaultContext]);

  const handleGroupChange = (e) => {
    const val = e.target.value;
    setSelectedGroup(val);
    const grp = VOLUNTEER_GROUPS.find((g) => g.id === val);
    if (grp) {
      setRecipientEmails(grp.emails);
    }
  };

  const handleTemplateChange = (e) => {
    const tmplId = e.target.value;
    if (!tmplId) return;
    const tmpl = TEMPLATES.find((t) => t.id === tmplId);
    if (tmpl) {
      setSubject(tmpl.subject);
      setBody(tmpl.body);
    }
  };

  const handleDraftWithAI = async () => {
    setIsDraftingAI(true);
    try {
      const promptContext = `Operational update for volunteers: ${body || subject}`;
      const aiResult = await draftVolunteerEmail(promptContext);
      if (aiResult) {
        const lines = aiResult.split("\n");
        const subjLine = lines.find((l) => l.toLowerCase().startsWith("subject:"));
        if (subjLine) {
          setSubject(subjLine.replace(/^subject:\s*/i, "").trim());
          setBody(lines.filter((l) => !l.toLowerCase().startsWith("subject:")).join("\n").trim());
        } else {
          setBody(aiResult);
        }
      }
    } catch (err) {
      console.warn("AI drafting error:", err);
    } finally {
      setIsDraftingAI(false);
    }
  };

  const cleanRecipients = recipientEmails
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean)
    .join(",");

  const mailtoUrl = `mailto:${cleanRecipients}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const gmailWebUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(cleanRecipients)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const handleSendEmail = () => {
    if (!subject.trim() || !body.trim() || !cleanRecipients) return;

    setIsSending(true);

    try {
      window.open(mailtoUrl, "_blank");
    } catch (e) {
      window.location.href = mailtoUrl;
    }

    const dispatchRecord = {
      id: "dispatch-" + Date.now(),
      recipients: cleanRecipients,
      count: cleanRecipients.split(",").length,
      subject,
      body,
      timestamp: new Date().toISOString(),
    };

    try {
      const saved = getStoredDispatches();
      saved.unshift(dispatchRecord);
      saveStoredDispatches(saved);
    } catch (e) {}

    addNotification({
      message: `Dispatched email to ${cleanRecipients}: "${subject}"`,
      type: "action",
    });

    setIsSending(false);
    setSentSuccess(true);
    setTimeout(() => {
      setSentSuccess(false);
      onClose();
    }, 1800);
  };

  return (
    <Modal open={open} onClose={onClose} title="Compose Volunteer Email" size="lg">
      <div className="space-y-3.5">
        {/* Success Toast */}
        {sentSuccess && (
          <div className="p-3 bg-emerald-50 border-2 border-emerald-600 text-emerald-900 font-bold text-xs flex items-center gap-2">
            <Check size={16} strokeWidth={3} className="text-emerald-700 shrink-0" />
            <span>Email successfully dispatched to {cleanRecipients.split(",").length} recipient(s)!</span>
          </div>
        )}

        {/* Clean Standard Email Form Layout */}
        <div className="border-2 border-neo-ink bg-neo-white">
          {/* TO Field */}
          <div className="flex flex-col sm:flex-row sm:items-center border-b border-neo-ink/20 px-3 py-2 gap-2 text-xs">
            <span className="font-bold text-neo-ink/60 uppercase text-[11px] w-14 shrink-0">
              To:
            </span>
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={recipientEmails}
                onChange={(e) => setRecipientEmails(e.target.value)}
                placeholder="Enter email addresses separated by commas..."
                className="w-full text-xs font-medium text-neo-ink bg-transparent outline-none"
              />
              <select
                value={selectedGroup}
                onChange={handleGroupChange}
                className="text-[10px] font-bold uppercase bg-neo-bg border border-neo-ink px-2 py-1 shrink-0 cursor-pointer focus:outline-none"
                title="Select a volunteer team"
              >
                {VOLUNTEER_GROUPS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SUBJECT Field */}
          <div className="flex items-center border-b border-neo-ink/20 px-3 py-2 gap-2 text-xs">
            <span className="font-bold text-neo-ink/60 uppercase text-[11px] w-14 shrink-0">
              Subject:
            </span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Schedule Update or Volunteer Briefing"
              className="w-full text-xs font-bold text-neo-ink bg-transparent outline-none"
            />
          </div>

          {/* BODY Area - Spacious and Natural */}
          <div className="p-3">
            <textarea
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email message here..."
              className="w-full text-xs font-normal text-neo-ink leading-relaxed bg-transparent outline-none resize-y min-h-[160px]"
            />
          </div>

          {/* Quick Helper Bar */}
          <div className="border-t border-neo-ink/20 px-3 py-2 bg-neo-bg/40 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDraftWithAI}
                disabled={isDraftingAI}
                className="text-[11px] font-bold text-neo-accent hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sparkles size={13} strokeWidth={2.5} />
                <span>{isDraftingAI ? "AI Drafting..." : "Draft / Polish with AI"}</span>
              </button>

              <span className="text-neo-ink/30">•</span>

              <select
                onChange={handleTemplateChange}
                defaultValue=""
                className="text-[11px] font-semibold text-neo-ink/80 bg-transparent border-none cursor-pointer focus:outline-none"
              >
                <option value="" disabled>
                  Insert template...
                </option>
                {TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="!text-xs">
            Cancel
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => window.open(gmailWebUrl, "_blank")}
            disabled={!subject.trim() || !body.trim() || !cleanRecipients}
            className="!text-xs flex items-center gap-1.5"
            title="Open email draft directly in Gmail"
          >
            <ExternalLink size={13} strokeWidth={2.5} />
            <span>Open in Gmail</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSendEmail}
            disabled={isSending || !subject.trim() || !body.trim() || !cleanRecipients}
            className="!text-xs flex items-center gap-1.5"
          >
            <Send size={13} strokeWidth={2.5} />
            <span>{isSending ? "Sending..." : "Send Email"}</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
