import { useState } from "react";
import { Brain, Clock, Star } from "lucide-react";
import Header from "../components/Header";
import SubHeader from "../components/SubHeader";
import IntelligenceCard from "../components/IntelligenceCard";
import HealthRadar from "../components/HealthRadar";
import EventTaskboardsManager from "../components/EventTaskboardsManager";
import LiveFlowPreview from "../components/LiveFlowPreview";
import QuickAITools from "../components/QuickAITools";
import LiveStageView from "../components/LiveStageView";
import DebugDataPanel from "../components/DebugDataPanel";
import { Badge } from "../components/ui";
import { useApp } from "../hooks/useApp";

export default function Dashboard() {
  const { mode } = useApp();
  const [operationsTab, setOperationsTab] = useState("intel"); // "intel" | "stage"

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
        {mode === "live" ? (
          <LiveStageView />
        ) : mode === "tasks" ? (
          <>
            <SubHeader />
            {/* Multi-Event Taskboards Directory & Expander */}
            <div className="max-w-[1440px] mx-auto px-4 pb-8 sm:px-6 lg:px-8">
              <EventTaskboardsManager />
            </div>
          </>
        ) : (
          <>
            <SubHeader />

            {/* ─── Mobile tab switcher for Operations (lg:hidden) ─── */}
            <div className="lg:hidden px-4 mb-4 sm:px-6">
              <div className="flex border-4 border-neo-ink bg-neo-white shadow-neo-sm">
                <button
                  role="tab"
                  aria-selected={operationsTab === "intel"}
                  onClick={() => setOperationsTab("intel")}
                  className={[
                    "flex-1 flex items-center justify-center gap-2 py-3",
                    "font-bold text-xs uppercase tracking-wider cursor-pointer border-0",
                    "transition-all duration-100 ease-linear",
                    operationsTab === "intel"
                      ? "bg-neo-ink text-neo-white"
                      : "bg-neo-white text-neo-ink hover:bg-neo-bg",
                  ].join(" ")}
                >
                  <Brain size={14} strokeWidth={3} />
                  Intel & Health
                </button>
                <button
                  role="tab"
                  aria-selected={operationsTab === "stage"}
                  onClick={() => setOperationsTab("stage")}
                  className={[
                    "flex-1 flex items-center justify-center gap-2 py-3",
                    "font-bold text-xs uppercase tracking-wider cursor-pointer border-0",
                    "transition-all duration-100 ease-linear",
                    operationsTab === "stage"
                      ? "bg-neo-ink text-neo-white"
                      : "bg-neo-white text-neo-ink hover:bg-neo-bg",
                  ].join(" ")}
                >
                  <Clock size={14} strokeWidth={3} />
                  Stage Flow & Tools
                </button>
              </div>
            </div>

            {/* ─── Two-column Operations Grid ─── */}
            <div className="max-w-[1440px] mx-auto px-4 pb-8 sm:px-6 lg:px-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Column 1: Intelligence + Health Radar */}
                <div
                  className={[
                    "space-y-6",
                    operationsTab !== "intel" ? "hidden lg:block" : "",
                  ].join(" ")}
                >
                  <div className="hidden lg:flex items-center gap-2 -mb-2">
                    <Star
                      size={16}
                      strokeWidth={3}
                      className="text-neo-secondary animate-spin-slow"
                    />
                    <Badge color="muted" rotate className="!text-[9px] !px-2 !py-0 !border-2">
                      AI Operations & Risk
                    </Badge>
                  </div>
                  <IntelligenceCard />
                  <HealthRadar />
                </div>

                {/* Column 2: Live Flow Preview + Quick AI Tools */}
                <div
                  className={[
                    "space-y-6",
                    operationsTab !== "stage" ? "hidden lg:block" : "",
                  ].join(" ")}
                >
                  <div className="hidden lg:flex items-center gap-2 -mb-2 justify-end">
                    <Badge color="accent" rotate className="!text-[9px] !px-2 !py-0 !border-2">
                      Live Reflow & Stage Tools
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
          </>
        )}

        {/* ─── Temporary Debug & Live Reseed Bar ─── */}
        <DebugDataPanel />
      </div>
    </div>
  );
}
