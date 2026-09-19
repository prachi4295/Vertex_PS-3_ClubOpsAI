import { Activity } from "lucide-react";
import { Card, Gauge } from "./ui";

/**
 * Placeholder card for the Event Health Radar panel.
 */
export default function HealthRadar() {
  return (
    <Card
      headerContent={
        <span className="flex items-center gap-2">
          <Activity size={16} strokeWidth={3} />
          Event Health Radar
        </span>
      }
      headerColor="bg-neo-secondary"
    >
      <div className="space-y-4">
        <div className="flex justify-around">
          <Gauge value={72} label="Tasks" size={80} />
          <Gauge value={45} label="Budget" size={80} />
        </div>
        <div className="flex justify-around">
          <Gauge value={88} label="Timeline" size={80} />
          <Gauge value={30} label="Risk" size={80} />
        </div>

        <div className="border-4 border-neo-ink bg-neo-accent/10 p-3">
          <p className="font-bold text-xs uppercase tracking-wider text-neo-accent mb-1">
            ⚠ Risk Alert
          </p>
          <p className="font-bold text-sm">
            Venue confirmation pending — 3 days until deadline.
          </p>
        </div>
      </div>
    </Card>
  );
}
