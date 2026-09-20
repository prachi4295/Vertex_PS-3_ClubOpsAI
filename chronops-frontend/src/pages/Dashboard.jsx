import Header from "../components/Header";
import SubHeader from "../components/SubHeader";
import IntelligenceCard from "../components/IntelligenceCard";
import HealthRadar from "../components/HealthRadar";
import EventTaskboardsManager from "../components/EventTaskboardsManager";
import VolunteerManagement from "../components/VolunteerManagement";
import LiveFlowView from "../components/LiveFlowView";
import LiveStageView from "../components/LiveStageView";
import { useApp } from "../hooks/useApp";

export default function Dashboard() {
  const { mode } = useApp();

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

      {/* Main Content Areas */}
      <div className="relative z-10">
        {mode === "live" ? (
          <LiveStageView />
        ) : mode === "tasks" ? (
          <>
            <SubHeader />
            {/* Multi-Event Taskboards Directory */}
            <div className="max-w-[1536px] mx-auto px-4 pb-8 sm:px-6 lg:px-8">
              <EventTaskboardsManager />
            </div>
          </>
        ) : mode === "volunteers" ? (
          /* Dedicated Volunteer Management Tab */
          <div className="max-w-[1536px] mx-auto px-4 py-6 pb-8 sm:px-6 lg:px-8">
            <VolunteerManagement />
          </div>
        ) : (
          /* Homepage: 70% Left Area (Live Flow + Health Radar) & 30% Right Box (Transcript) */
          <div className="max-w-[1536px] mx-auto px-4 py-6 pb-8 sm:px-6 lg:px-8">
              <div className="flex flex-col lg:flex-row gap-6 items-start">
                {/* ─── 70% Left Area: Live Event Flow + Health Radar ─── */}
                <div className="w-full lg:w-[70%] space-y-6">
                  <LiveFlowView />
                  <HealthRadar />
                </div>

                {/* ─── 30% Right Box: Transcript / Club Intelligence (Moves with Live Flow) ─── */}
                <div className="w-full lg:w-[30%] space-y-4">
                  <IntelligenceCard />
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
