import { useState } from "react";
import { Brain, Activity, Columns3, Clock, Wand2, Star } from "lucide-react";
import Header from "../components/Header";
import SubHeader from "../components/SubHeader";
import IntelligenceCard from "../components/IntelligenceCard";
import HealthRadar from "../components/HealthRadar";
import KanbanBoard from "../components/KanbanBoard";
import LiveFlowPreview from "../components/LiveFlowPreview";
import QuickAITools from "../components/QuickAITools";
import { Badge } from "../components/ui";

const MOBILE_TABS = [
  { key: "left", label: "Intel", icon: Brain },
  { key: "center", label: "Tasks", icon: Columns3 },
  { key: "right", label: "Live", icon: Clock },
];

export default function Dashboard() {
  const [mobileTab, setMobileTab] = useState("center");

  return (
    <div className="min-h-screen bg-neo-bg relative">
      {/* Background textures */}
      <div className="fixed inset-0 texture-halftone" />
      <div className="fixed inset-0 texture-grid" />
      <div className="fixed inset-0 texture-noise" />

      {/* Sticky header */}
      <div className="relative z-40">
        <Header />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <SubHeader />

        {/* ─── Mobile tab switcher (lg:hidden) ─── */}
        <div className="lg:hidden px-4 mb-4 sm:px-6">
          <div className="flex border-4 border-neo-ink bg-neo-white shadow-neo-sm">
            {MOBILE_TABS.map((tab) => {
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.key}
                  role="tab"
                  aria-selected={mobileTab === tab.key}
                  onClick={() => setMobileTab(tab.key)}
                  className={[
                    "flex-1 flex items-center justify-center gap-2 py-3",
                    "font-bold text-xs uppercase tracking-wider cursor-pointer border-0",
                    "transition-all duration-100 ease-linear",
                    mobileTab === tab.key
                      ? "bg-neo-ink text-neo-white"
                      : "bg-neo-white text-neo-ink hover:bg-neo-bg",
                  ].join(" ")}
                >
                  <TabIcon size={14} strokeWidth={3} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Three-column grid ─── */}
        <div className="max-w-[1440px] mx-auto px-4 pb-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] xl:grid-cols-[320px_1fr_320px] gap-6">
            {/* Left column: Intelligence + Health */}
            <div
              className={[
                "space-y-6",
                mobileTab !== "left" ? "hidden lg:block" : "",
              ].join(" ")}
            >
              {/* Decorative sticker */}
              <div className="hidden lg:flex items-center gap-2 -mb-2">
                <Star
                  size={16}
                  strokeWidth={3}
                  className="text-neo-secondary animate-spin-slow"
                />
                <Badge color="muted" rotate className="!text-[9px] !px-2 !py-0 !border-2">
                  AI-Powered
                </Badge>
              </div>
              <IntelligenceCard />
              <HealthRadar />
            </div>

            {/* Center column: Kanban */}
            <div
              className={[
                "min-w-0",
                mobileTab !== "center" ? "hidden lg:block" : "",
              ].join(" ")}
            >
              <KanbanBoard />
            </div>

            {/* Right column: Live Flow + Quick AI */}
            <div
              className={[
                "space-y-6",
                mobileTab !== "right" ? "hidden lg:block" : "",
              ].join(" ")}
            >
              {/* Decorative sticker */}
              <div className="hidden lg:flex items-center gap-2 -mb-2 justify-end">
                <Badge color="accent" rotate className="!text-[9px] !px-2 !py-0 !border-2">
                  Real-Time
                </Badge>
                <Star
                  size={16}
                  strokeWidth={3}
                  className="text-neo-accent animate-spin-slow"
                />
              </div>
              <LiveFlowPreview />
              <QuickAITools />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
