/**
 * Footer:
 * Minimal footer displaying email and contact number in the left corner
 * and "bit n build hackathon" in the right corner below a horizontal line.
 */
export default function Footer({ className = "" }) {
  return (
    <footer className={`w-full mt-auto py-3 px-4 sm:px-6 lg:px-8 border-t-2 border-neo-ink bg-neo-white/80 ${className}`}>
      <div className="max-w-[1536px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs font-semibold text-neo-ink">
        {/* Left Corner: Email & Contact Number in small font */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <a
            href="mailto:helpdesk@vertexops.org"
            className="hover:underline text-neo-ink text-xs"
          >
            helpdesk@vertexops.org
          </a>
          <span className="text-neo-ink/50">•</span>
          <a
            href="tel:+18005556772"
            className="hover:underline text-neo-ink text-xs"
          >
            +1 (800) 555-OPS-24
          </a>
        </div>

        {/* Right Corner: bit n build hackathon */}
        <div className="font-bold text-neo-ink tracking-wider text-[11px] sm:text-xs uppercase">
          bit n build hackathon
        </div>
      </div>
    </footer>
  );
}
