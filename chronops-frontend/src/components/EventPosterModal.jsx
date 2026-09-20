import { useState, useMemo, useRef } from "react";
import {
  Sparkles,
  AlertTriangle,
  Download,
  Copy,
  Check,
  Calendar,
  MapPin,
  QrCode,
  Tag,
  Palette,
} from "lucide-react";
import { Modal, Badge } from "./ui";
import Button from "./ui/Button";
import { formatDateDMY } from "../lib/time";

const POSTER_THEMES = [
  { id: "clean-mono", name: "Clean Minimal", bg: "bg-[#F8FAFC]", text: "text-slate-900", accent: "bg-[#0F172A] text-white" },
  { id: "warm-terracotta", name: "Warm Terracotta", bg: "bg-[#E26D5C]", text: "text-slate-900", accent: "bg-[#FDE68A]" },
  { id: "soft-amber", name: "Soft Amber", bg: "bg-[#FDE68A]", text: "text-slate-900", accent: "bg-[#E26D5C]" },
  { id: "slate-modern", name: "Modern Slate", bg: "bg-[#E2E8F0]", text: "text-slate-900", accent: "bg-[#E26D5C]" },
];

export default function EventPosterModal({ open, onClose, event }) {
  const posterRef = useRef(null);
  const [selectedTheme, setSelectedTheme] = useState(POSTER_THEMES[0]);
  const [copiedText, setCopiedText] = useState(false);

  // Check if sufficient information is provided
  const validation = useMemo(() => {
    if (!event) return { valid: false, missing: ["Event Data"] };

    const missing = [];
    if (!event.name || event.name.trim().length < 3) {
      missing.push("Event Name");
    }
    if (!event.date || !/^\d{4}-\d{2}-\d{2}$/.test(event.date)) {
      missing.push("Confirmed Event Date");
    }
    if (!event.location || event.location.trim().length < 3 || event.location.toLowerCase() === "tbd") {
      missing.push("Venue / Location");
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }, [event]);

  const handleCopyPosterText = async () => {
    if (!event) return;
    const text = `📢 ${event.name.toUpperCase()}
🏷️ Category: ${event.category || "Hackathon"}
📅 Date: ${formatDateDMY(event.date)}
📍 Venue: ${event.location}
✨ ${event.tagline || "Join us for an extraordinary day of innovation & live tech!"}
👉 Register and join the live stage run-sheet on ChronOps!`;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch (e) {
      console.warn("Clipboard copy failed:", e);
    }
  };

  const handleDownloadSVG = () => {
    if (!posterRef.current || !event) return;

    const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1100" viewBox="0 0 800 1100">
  <rect width="800" height="1100" fill="#FFFDF5" stroke="#000" stroke-width="12"/>
  <rect x="24" y="24" width="752" height="1052" fill="#FFD93D" stroke="#000" stroke-width="8"/>
  <rect x="50" y="50" width="700" height="140" fill="#000"/>
  <text x="400" y="135" fill="#FFFDF5" font-family="Space Grotesk, sans-serif" font-size="44" font-weight="900" text-anchor="middle" letter-spacing="4">CHRONOPS PRESENTS</text>
  <rect x="50" y="230" width="700" height="360" fill="#FFF" stroke="#000" stroke-width="8"/>
  <text x="400" y="360" fill="#000" font-family="Space Grotesk, sans-serif" font-size="52" font-weight="900" text-anchor="middle">${event.name.toUpperCase()}</text>
  <text x="400" y="440" fill="#FF6B6B" font-family="Space Grotesk, sans-serif" font-size="28" font-weight="700" text-anchor="middle">${event.tagline || "INNOVATION & LIVE STAGE SUMMIT"}</text>
  <rect x="50" y="630" width="330" height="200" fill="#FF6B6B" stroke="#000" stroke-width="8"/>
  <text x="80" y="700" fill="#000" font-family="Space Grotesk, sans-serif" font-size="24" font-weight="900">DATE</text>
  <text x="80" y="770" fill="#000" font-family="Space Grotesk, sans-serif" font-size="34" font-weight="900">${formatDateDMY(event.date)}</text>
  <rect x="420" y="630" width="330" height="200" fill="#C4B5FD" stroke="#000" stroke-width="8"/>
  <text x="450" y="700" fill="#000" font-family="Space Grotesk, sans-serif" font-size="24" font-weight="900">VENUE</text>
  <text x="450" y="760" fill="#000" font-family="Space Grotesk, sans-serif" font-size="24" font-weight="900">${event.location.slice(0, 20)}</text>
  <rect x="50" y="870" width="700" height="150" fill="#000"/>
  <text x="400" y="960" fill="#FFD93D" font-family="Space Grotesk, sans-serif" font-size="30" font-weight="900" text-anchor="middle">LIVE EVENT RUN-SHEET ON CHRONOPS</text>
</svg>`;

    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${(event.name || "event").toLowerCase().replace(/[^a-z0-9]/g, "-")}-poster.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal open={open} onClose={onClose} title="Official Event Poster Studio">
      <div className="space-y-4">
        {/* Validation Check */}
        {!validation.valid ? (
          <div className="p-5 bg-neo-accent/20 border-4 border-neo-accent text-neo-ink space-y-3">
            <div className="flex items-center gap-2 text-neo-accent font-black text-sm uppercase">
              <AlertTriangle size={18} strokeWidth={3} />
              <span>Insufficient Event Information</span>
            </div>
            <p className="text-xs font-bold leading-relaxed">
              ChronOps requires verified core event details before generating an official promotional poster.
              The following essential fields are currently missing or unconfirmed:
            </p>
            <ul className="list-disc list-inside text-xs font-black space-y-1 text-neo-ink">
              {validation.missing.map((m) => (
                <li key={m}>Missing: {m}</li>
              ))}
            </ul>
            <p className="text-[11px] font-bold text-neo-ink/70">
              👉 Please edit the event board to supply these details before generating a poster.
            </p>
            <div className="pt-2">
              <Button variant="outline" size="sm" onClick={onClose} className="!text-xs">
                Close & Return
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Theme Selector */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-black uppercase text-neo-ink flex items-center gap-1.5">
                <Palette size={14} strokeWidth={3} />
                Poster Theme Palette
              </span>
              <div className="flex items-center gap-1.5">
                {POSTER_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setSelectedTheme(theme)}
                    className={[
                      "px-2.5 py-1 text-[11px] font-black uppercase border-2 border-neo-ink transition-all cursor-pointer",
                      selectedTheme.id === theme.id
                        ? "bg-neo-ink text-neo-white shadow-[2px_2px_0_#FFD93D] -translate-y-0.5"
                        : "bg-neo-white text-neo-ink hover:bg-neo-bg",
                    ].join(" ")}
                  >
                    {theme.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Poster Preview Card */}
            <div
              ref={posterRef}
              className={[
                "border-4 border-neo-ink shadow-neo-lg p-6 sm:p-8 space-y-6 text-neo-ink relative transition-colors duration-200",
                selectedTheme.bg,
              ].join(" ")}
            >
              {/* Top Banner */}
              <div className="flex items-center justify-between border-b-4 border-neo-ink pb-3">
                <div className="bg-neo-ink text-neo-white px-3 py-1 font-black text-xs uppercase tracking-widest border-2 border-neo-ink">
                  CHRONOPS LIVE STAGE
                </div>
                <Badge color="accent" rotate className="!text-xs !px-3 !py-1 !border-2">
                  {event.category || "FLAGSHIP EVENT"}
                </Badge>
              </div>

              {/* Main Headline */}
              <div className="bg-neo-white border-4 border-neo-ink p-5 shadow-[4px_4px_0_#000] text-center space-y-2">
                <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-neo-ink leading-none">
                  {event.name}
                </h2>
                {event.tagline && (
                  <p className="text-xs sm:text-sm font-bold text-neo-accent uppercase tracking-wide">
                    {event.tagline}
                  </p>
                )}
              </div>

              {/* Date & Location Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-neo-white border-3 border-neo-ink p-3 shadow-[3px_3px_0_#000] flex items-center gap-3">
                  <div className="w-10 h-10 bg-neo-secondary border-2 border-neo-ink flex items-center justify-center shrink-0">
                    <Calendar size={20} strokeWidth={3} />
                  </div>
                  <div>
                    <span className="block text-[10px] font-black uppercase text-neo-ink/70">
                      SCHEDULE DATE
                    </span>
                    <span className="text-sm font-black text-neo-ink uppercase">
                      {formatDateDMY(event.date)}
                    </span>
                  </div>
                </div>

                <div className="bg-neo-white border-3 border-neo-ink p-3 shadow-[3px_3px_0_#000] flex items-center gap-3">
                  <div className="w-10 h-10 bg-neo-accent border-2 border-neo-ink flex items-center justify-center shrink-0">
                    <MapPin size={20} strokeWidth={3} />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] font-black uppercase text-neo-ink/70">
                      OFFICIAL VENUE
                    </span>
                    <span className="text-sm font-black text-neo-ink uppercase truncate block">
                      {event.location}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Call to Action & QR Mock */}
              <div className="bg-neo-ink text-neo-white p-3.5 border-3 border-neo-ink flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="font-black text-xs uppercase tracking-wider text-neo-secondary block">
                    LIVE RUN-SHEET & TIME SYNC
                  </span>
                  <p className="text-[10px] font-bold text-neo-white/80 uppercase">
                    Scan or open ChronOps to track sessions & taskboards
                  </p>
                </div>
                <div className="w-10 h-10 bg-neo-white border-2 border-neo-white flex items-center justify-center shrink-0 text-neo-ink">
                  <QrCode size={24} strokeWidth={2.5} />
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-2 border-t-2 border-neo-ink/20">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyPosterText}
                className="!text-xs flex items-center gap-1.5"
              >
                {copiedText ? <Check size={13} strokeWidth={3} className="text-green-700" /> : <Copy size={13} strokeWidth={3} />}
                <span>{copiedText ? "Copied" : "Copy Poster Text"}</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={onClose} className="!text-xs">
                  Close
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDownloadSVG}
                  className="!text-xs !bg-neo-accent !text-neo-ink flex items-center gap-1.5"
                >
                  <Download size={13} strokeWidth={3} />
                  <span>Download SVG Poster</span>
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
