import { Wand2, FileText, Mic, StickyNote } from "lucide-react";
import { Card, IconBox } from "./ui";
import Button from "./ui/Button";

const tools = [
  {
    icon: Wand2,
    label: "Parse Notes",
    desc: "Turn meeting notes into tasks",
    color: "accent",
  },
  {
    icon: FileText,
    label: "Filler Script",
    desc: "Generate anchor talking points",
    color: "secondary",
  },
  {
    icon: Mic,
    label: "Phonetic Guide",
    desc: "Pronunciation help for names",
    color: "muted",
  },
  {
    icon: StickyNote,
    label: "Session Brief",
    desc: "Quick session summary for MC",
    color: "default",
  },
];

/**
 * Placeholder Quick AI Tools panel.
 */
export default function QuickAITools() {
  return (
    <Card
      headerContent={
        <span className="flex items-center gap-2">
          <Wand2 size={16} strokeWidth={3} />
          Quick AI Tools
        </span>
      }
      headerColor="bg-neo-muted"
    >
      <div className="space-y-3">
        {tools.map((tool, i) => (
          <button
            key={i}
            className="w-full flex items-center gap-3 p-3 bg-neo-white border-4 border-neo-ink shadow-[2px_2px_0_#000] hover:shadow-neo-sm hover:-translate-y-0.5 transition-all duration-200 ease-linear cursor-pointer text-left"
          >
            <IconBox icon={tool.icon} size="sm" color={tool.color} />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">{tool.label}</p>
              <p className="font-bold text-xs text-neo-ink/50">{tool.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}
