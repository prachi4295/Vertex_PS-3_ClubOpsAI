import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Search,
  Plus,
  Bell,
  User,
  LogOut,
  Radio,
  ListTodo,
  CalendarPlus,
  Sparkles,
  AlertTriangle,
  Bot,
  Mail,
  Palette,
  Shield,
  Layers,
  X,
} from "lucide-react";
import { Badge, Input, Dropdown } from "./ui";
import { useApp } from "../hooks/useApp";
import { useNotifications } from "../hooks/useNotifications";
import { useAuth } from "../hooks/useAuth";
import Button from "./ui/Button";
import TaskModal from "./TaskModal";
import EditStageModal from "./EditStageModal";
import VolunteerEmailModal from "./VolunteerEmailModal";
import EventPosterModal from "./EventPosterModal";
import { useSessions } from "../hooks/useSessions";
import { INITIAL_EVENTS } from "../data/multiEvents";

export default function Header() {
  const { mode, setMode, goLive, searchQuery, setSearchQuery } = useApp();
  const {
    notifications,
    markAllRead,
    clearAll,
    removeNotification,
    unreadCount,
  } = useNotifications();
  const { user, signOutUser } = useAuth();
  const { sessions, startSession } = useSessions();
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [volunteerModalOpen, setVolunteerModalOpen] = useState(false);
  const [posterModalOpen, setPosterModalOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleTabClick = (targetMode) => {
    setMode(targetMode);
    if (location.pathname !== "/") {
      navigate("/");
    }
  };

  const handleBrandClick = () => {
    setMode("operations");
    navigate("/");
  };

  return (
    <>
      <header className="bg-neo-ink border-b-4 border-neo-ink sticky top-0 z-40">
        <div className="max-w-[1440px] mx-auto px-4 flex items-center h-14 gap-3">
          {/* ─── Brand ─── */}
          <button
            type="button"
            onClick={handleBrandClick}
            className="flex items-center shrink-0 cursor-pointer border-0 bg-transparent p-0 group"
            title="Go to ChronOps Home"
            aria-label="ChronOps Home"
          >
            <img
              src="/chronops-dark-logo.png"
              alt="ChronOps"
              className="h-8 sm:h-9 w-auto object-contain transition-transform group-hover:scale-105 active:scale-95"
            />
          </button>

          {/* ─── Mode tabs ─── */}
          <nav className="hidden md:flex items-center ml-4 gap-1" role="tablist" aria-label="App mode">
            <ModeTab
              label="Live Flow"
              active={location.pathname === "/" && mode === "operations"}
              onClick={() => handleTabClick("operations")}
            />
            <ModeTab
              label="Event Directory"
              active={
                (location.pathname === "/" && mode === "tasks") ||
                location.pathname.startsWith("/taskboards/")
              }
              onClick={() => handleTabClick("tasks")}
            />
            <ModeTab
              label="Stage Control"
              active={location.pathname === "/" && mode === "live"}
              onClick={() => handleTabClick("live")}
            />
            <ModeTab
              label="Volunteer Management"
              active={location.pathname === "/" && mode === "volunteers"}
              onClick={() => handleTabClick("volunteers")}
            />
          </nav>

          {/* ─── Spacer ─── */}
          <div className="flex-1" />

          {/* ─── Search ─── */}
          <div className="hidden sm:block relative w-48 lg:w-64">
            <Search
              size={16}
              strokeWidth={3}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neo-ink/40 pointer-events-none"
            />
            <Input
              type="search"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="!h-9 !pl-9 !text-sm !border-2"
              aria-label="Global search"
            />
          </div>

          {/* ─── Add New / Actions Menu (Item 14) ─── */}
          <Dropdown
            align="right"
            ariaLabel="Add new item"
            trigger={
              <span className="inline-flex items-center justify-center w-9 h-9 bg-neo-secondary border-2 border-neo-ink shadow-[2px_2px_0_#000] text-neo-ink hover:shadow-neo-sm transition-all duration-100 ease-linear active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer" title="Create or Manage">
                <Plus size={18} strokeWidth={3} />
              </span>
            }
            items={[
              { label: "New Task (Select Board)", icon: ListTodo, onClick: () => setTaskModalOpen(true) },
              { label: "New Stage Session", icon: CalendarPlus, onClick: () => setStageModalOpen(true) },
              {
                label: "Create Event Board",
                icon: Layers,
                onClick: () => {
                  handleTabClick("tasks");
                },
              },
              { label: "Email All Volunteers", icon: Mail, onClick: () => setVolunteerModalOpen(true) },
              { label: "Generate Event Poster", icon: Palette, onClick: () => setPosterModalOpen(true) },
            ]}
          />

          {/* ─── Notifications ─── */}
          <Dropdown
            align="right"
            ariaLabel="Notifications"
            trigger={
              <span className="relative inline-flex items-center justify-center w-9 h-9 bg-neo-white border-2 border-neo-ink shadow-[2px_2px_0_#000] text-neo-ink hover:shadow-neo-sm transition-all duration-100 ease-linear active:translate-x-[1px] active:translate-y-[1px] active:shadow-none">
                <Bell size={18} strokeWidth={3} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-neo-accent border-2 border-neo-ink rounded-full flex items-center justify-center text-[10px] font-black text-neo-ink">
                    {unreadCount}
                  </span>
                )}
              </span>
            }
          >
            {(close) => (
              <div className="w-84 max-h-80 overflow-y-auto">
                <div className="flex items-center justify-between px-4 py-2 border-b-2 border-neo-ink bg-neo-bg sticky top-0 z-10">
                  <span className="font-black text-xs uppercase tracking-wider">
                    Notifications
                  </span>
                  <div className="flex items-center gap-2">
                    {notifications.length > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            markAllRead();
                          }}
                          className="text-xs font-bold uppercase text-neo-ink/70 hover:text-neo-ink hover:underline cursor-pointer bg-transparent border-0"
                        >
                          Mark read
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            clearAll();
                          }}
                          className="text-xs font-bold uppercase text-neo-accent hover:underline cursor-pointer bg-transparent border-0"
                        >
                          Clear all
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={close}
                      aria-label="Close notifications"
                      className="p-1 hover:bg-neo-accent border border-neo-ink bg-neo-white text-neo-ink font-bold cursor-pointer transition-colors ml-1"
                      title="Close"
                    >
                      <X size={12} strokeWidth={3} />
                    </button>
                  </div>
                </div>
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-center font-bold text-sm text-neo-ink/50">
                    No notifications
                  </p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={[
                        "group px-4 py-3 border-b border-neo-ink/10 flex gap-3 items-start relative hover:bg-neo-bg/40 transition-colors",
                        n.read ? "opacity-60" : "",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "shrink-0 w-7 h-7 inline-flex items-center justify-center border-2 border-neo-ink mt-0.5",
                          n.type === "ai"
                            ? "bg-neo-muted text-neo-ink"
                            : n.type === "warning"
                            ? "bg-neo-accent text-neo-white"
                            : "bg-neo-secondary text-neo-ink",
                        ].join(" ")}
                      >
                        {n.type === "ai" ? (
                          <Bot size={14} strokeWidth={3} />
                        ) : n.type === "warning" ? (
                          <AlertTriangle size={14} strokeWidth={3} />
                        ) : (
                          <Sparkles size={14} strokeWidth={3} />
                        )}
                      </span>
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="font-bold text-xs text-neo-ink leading-snug">
                          {n.message}
                        </p>
                        <p className="text-[10px] font-bold text-neo-ink/40 mt-1">
                          {formatRelative(n.timestamp)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-neo-accent border border-neo-ink mt-1" />
                        )}
                        <button
                          type="button"
                          onClick={() => removeNotification(n.id)}
                          className="opacity-0 group-hover:opacity-100 hover:text-neo-accent p-0.5 text-neo-ink/50 transition-opacity"
                          title="Dismiss notification"
                        >
                          <X size={12} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </Dropdown>

          {/* ─── Avatar ─── */}
          <Dropdown
            align="right"
            ariaLabel="User profile and menu"
            trigger={
              user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || "User avatar"}
                  className="w-9 h-9 border-2 border-neo-ink shadow-[2px_2px_0_#000] rounded-full object-cover cursor-pointer hover:shadow-neo-sm transition-all duration-100 ease-linear active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                />
              ) : (
                <span
                  title={user?.displayName || "Demo User"}
                  className="inline-flex items-center justify-center w-9 h-9 bg-neo-muted border-2 border-neo-ink shadow-[2px_2px_0_#000] rounded-full text-neo-ink font-black text-sm hover:shadow-neo-sm transition-all duration-100 ease-linear active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer"
                >
                  {(user?.displayName || "D").charAt(0).toUpperCase()}
                </span>
              )
            }
          >
            {(close) => (
              <div className="min-w-[220px]">
                {/* User Info Header */}
                <div className="px-4 py-3 border-b-2 border-neo-ink bg-neo-white flex items-start gap-2.5">
                  <User size={16} strokeWidth={2.5} className="mt-0.5 shrink-0 text-neo-ink" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-neo-ink leading-snug truncate">
                      {user?.displayName || "Profile"}
                    </p>
                    {(user?.email || localStorage.getItem("clubops_current_user_email")) && (
                      <p
                        className="font-semibold text-xs text-neo-ink/60 truncate mt-0.5"
                        title={user?.email || localStorage.getItem("clubops_current_user_email")}
                      >
                        {user?.email || localStorage.getItem("clubops_current_user_email")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Sign Out Action */}
                <button
                  type="button"
                  role="menuitem"
                  onClick={async () => {
                    close();
                    await signOutUser();
                    navigate("/login");
                  }}
                  className="w-full text-left px-4 py-2.5 font-bold text-sm text-neo-ink hover:bg-neo-secondary cursor-pointer border-0 bg-transparent flex items-center gap-2 transition-colors"
                >
                  <LogOut size={16} strokeWidth={2.5} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </Dropdown>
        </div>

        {/* ─── Mobile mode tabs ─── */}
        <div className="md:hidden flex border-t-2 border-neo-ink/20">
          <MobileHeaderTab
            label="Live Flow"
            active={location.pathname === "/" && mode === "operations"}
            onClick={() => handleTabClick("operations")}
          />
          <MobileHeaderTab
            label="Directory"
            active={
              (location.pathname === "/" && mode === "tasks") ||
              location.pathname.startsWith("/taskboards/")
            }
            onClick={() => handleTabClick("tasks")}
          />
          <MobileHeaderTab
            label="Stage"
            active={location.pathname === "/" && mode === "live"}
            onClick={() => handleTabClick("live")}
          />
          <MobileHeaderTab
            label="Volunteers"
            active={location.pathname === "/" && mode === "volunteers"}
            onClick={() => handleTabClick("volunteers")}
          />
        </div>

        {/* ─── Mobile search (always visible on small) ─── */}
        <div className="sm:hidden px-4 py-2 border-t-2 border-neo-ink/20 bg-neo-ink">
          <div className="relative">
            <Search
              size={14}
              strokeWidth={3}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neo-ink/40 pointer-events-none"
            />
            <Input
              type="search"
              placeholder="Search tasks & sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="!h-9 !pl-9 !text-xs !border-2"
              aria-label="Global search"
            />
          </div>
        </div>
      </header>

      {/* Task modal for "Add New > New Task" */}
      <TaskModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        task={null}
      />

      {/* Stage modal for "Add New > New Session" */}
      <EditStageModal
        open={stageModalOpen}
        onClose={() => setStageModalOpen(false)}
      />

      {/* Volunteer Email Modal */}
      <VolunteerEmailModal
        open={volunteerModalOpen}
        onClose={() => setVolunteerModalOpen(false)}
      />

      {/* Event Poster Studio Modal */}
      <EventPosterModal
        open={posterModalOpen}
        onClose={() => setPosterModalOpen(false)}
        event={null}
      />
    </>
  );
}

/* ─── Sub-components ─── */

function ModeTab({ label, active, onClick }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        "px-3.5 py-1.5 font-semibold text-xs tracking-normal cursor-pointer",
        "border-2 transition-all duration-100 ease-linear",
        active
          ? "bg-neo-white text-neo-ink border-neo-ink shadow-[2px_2px_0_#0F172A]"
          : "bg-transparent text-neo-white/70 border-transparent hover:text-neo-white",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function MobileHeaderTab({ label, active, onClick }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={[
        "flex-1 h-10 font-semibold text-xs tracking-normal cursor-pointer border-0",
        "transition-all duration-100 ease-linear",
        active
          ? "bg-neo-white text-neo-ink"
          : "bg-neo-ink text-neo-white/70 hover:text-neo-white",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

/* ─── Helpers ─── */

function formatRelative(date) {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
