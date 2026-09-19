import { Brain, Sparkles } from "lucide-react";
import { Card, Badge } from "./ui";

/**
 * Placeholder card for the Club Intelligence panel.
 */
export default function IntelligenceCard() {
  return (
    <Card
      headerContent={
        <span className="flex items-center gap-2">
          <Brain size={16} strokeWidth={3} />
          Club Intelligence
        </span>
      }
      headerColor="bg-neo-muted"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-neo-secondary border-4 border-neo-ink flex items-center justify-center">
            <Sparkles size={18} strokeWidth={3} />
          </div>
          <div>
            <p className="font-bold text-sm">AI Task Parser</p>
            <p className="font-bold text-xs text-neo-ink/50">
              Paste meeting notes to generate tasks
            </p>
          </div>
        </div>

        <div className="border-4 border-neo-ink bg-neo-bg p-3">
          <p className="font-bold text-xs uppercase tracking-wider text-neo-ink/50 mb-2">
            Recent Insight
          </p>
          <p className="font-bold text-sm leading-relaxed">
            "3 high-priority tasks identified from today's standup. Suggest
            assigning venue booking to Ops team."
          </p>
          <Badge color="muted" className="mt-2 !text-[10px]">
            AI Generated
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <StatBlock label="Tasks Created" value="12" />
          <StatBlock label="AI Suggestions" value="5" />
        </div>
      </div>
    </Card>
  );
}

function StatBlock({ label, value }) {
  return (
    <div className="border-4 border-neo-ink p-2 text-center bg-neo-white">
      <p className="font-black text-xl">{value}</p>
      <p className="font-bold text-[10px] uppercase tracking-wider text-neo-ink/50">
        {label}
      </p>
    </div>
  );
}
