import { Clock, Play, CheckCircle } from "lucide-react";
import { Card, Badge } from "./ui";
import { useApp } from "../hooks/useApp";

const SESSIONS = [
  { title: "Opening Keynote", speaker: "Dr. Priya Sharma", time: "09:00", duration: 30, status: "completed" },
  { title: "Workshop: Intro to AI", speaker: "Arjun Mehta", time: "09:30", duration: 60, status: "live" },
  { title: "Networking Break", speaker: "", time: "10:30", duration: 15, status: "upcoming" },
  { title: "Panel: Future of Tech", speaker: "Various", time: "10:45", duration: 45, status: "upcoming" },
  { title: "Closing Ceremony", speaker: "Event Team", time: "11:30", duration: 30, status: "upcoming" },
];

const statusConfig = {
  completed: { icon: CheckCircle, color: "dark", label: "Done" },
  live: { icon: Play, color: "accent", label: "Live" },
  upcoming: { icon: Clock, color: "secondary", label: "Upcoming" },
};

/**
 * Placeholder Live Flow Preview (run-sheet).
 */
export default function LiveFlowPreview() {
  const { searchQuery } = useApp();
  const query = searchQuery.toLowerCase();

  const filtered = SESSIONS.filter((s) =>
    query
      ? s.title.toLowerCase().includes(query) ||
        s.speaker.toLowerCase().includes(query)
      : true
  );

  return (
    <Card
      headerContent={
        <span className="flex items-center gap-2">
          <Clock size={16} strokeWidth={3} />
          Live Flow Preview
        </span>
      }
      headerColor="bg-neo-accent"
      noPadding
    >
      <div className="divide-y-4 divide-neo-ink">
        {filtered.length === 0 ? (
          <p className="py-8 text-center font-bold text-sm text-neo-ink/30">
            No matching sessions
          </p>
        ) : (
          filtered.map((session, i) => {
            const cfg = statusConfig[session.status];
            const StatusIcon = cfg.icon;
            return (
              <div
                key={i}
                className={[
                  "flex items-center gap-3 px-4 py-3",
                  session.status === "live" ? "bg-neo-accent/10" : "bg-neo-white",
                ].join(" ")}
              >
                <span className="font-black text-sm w-12 shrink-0 text-neo-ink/60">
                  {session.time}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{session.title}</p>
                  {session.speaker && (
                    <p className="font-bold text-xs text-neo-ink/50 truncate">
                      {session.speaker}
                    </p>
                  )}
                </div>
                <Badge color={cfg.color} className="!text-[9px] !px-2 !py-0 !border-2 shrink-0">
                  <StatusIcon size={10} strokeWidth={3} className="mr-1" />
                  {cfg.label}
                </Badge>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
