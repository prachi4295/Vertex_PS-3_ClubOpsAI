import { useState } from "react";
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
} from "lucide-react";
import { Badge, Input, Dropdown } from "./ui";
import { useApp } from "../hooks/useApp";
import { useNotifications } from "../hooks/useNotifications";
import Button from "./ui/Button";
import TaskModal from "./TaskModal";

export default function Header() {
  const { mode, setMode, goLive, searchQuery, setSearchQuery } = useApp();
  const { notifications, markAllRead, unreadCount } = useNotifications();
  const [taskModalOpen, setTaskModalOpen] = useState(false);

  return (
    <>
      <header className="bg-neo-ink border-b-4 border-neo-ink sticky top-0 z-40">
        <div className="max-w-[1440px] mx-auto px-4 flex items-center h-14 gap-3">
          {/* ─── Brand ─── */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="bg-neo-accent border-4 border-neo-ink px-3 py-1 font-black text-sm tracking-tight text-neo-ink shadow-neo-sm">
              CLUBOPS STUDIO
            </span>
            <Badge color="muted" className="hidden sm:inline-flex !text-[10px] !px-2 !py-0.5 !border-2">
              Antigravity
            </Badge>
          </div>

          {/* ─── Mode tabs ─── */}
          <nav className="hidden md:flex items-center ml-4 gap-1" role="tablist" aria-label="App mode">
            <ModeTab
              label="Operations"
              active={mode === "operations"}
              onClick={() => setMode("operations")}
            />
            <ModeTab
              label="Live Stage"
              active={mode === "live"}
              onClick={() => setMode("live")}
            />
          </nav>

          {/* ─── GO LIVE button ─── */}
          <Button
            variant="primary"
            size="sm"
            onClick={goLive}
            className="hidden md:inline-flex ml-2 !h-9 !text-xs"
            aria-label="Switch to Live Stage mode"
          >
            <Radio size={14} strokeWidth={3} />
            GO LIVE
          </Button>

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

          {/* ─── Add New ─── */}
          <Dropdown
            align="right"
            trigger={
              <span className="inline-flex items-center justify-center w-9 h-9 bg-neo-secondary border-2 border-neo-ink shadow-[2px_2px_0_#000] text-neo-ink hover:shadow-neo-sm transition-all duration-100 ease-linear active:translate-x-[1px] active:translate-y-[1px] active:shadow-none">
                <Plus size={18} strokeWidth={3} />
              </span>
            }
            items={[
              { label: "New Task", icon: ListTodo, onClick: () => setTaskModalOpen(true) },
              { label: "New Session", icon: CalendarPlus, onClick: () => {} },
            ]}
          />

          {/* ─── Notifications ─── */}
          <Dropdown
            align="right"
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
              <div className="w-72 max-h-80 overflow-y-auto">
                <div className="flex items-center justify-between px-4 py-2 border-b-2 border-neo-ink bg-neo-bg">
                  <span className="font-black text-xs uppercase tracking-wider">
                    Notifications
                  </span>
                  <button
                    onClick={() => {
                      markAllRead();
                    }}
                    className="text-xs font-bold uppercase text-neo-accent hover:underline cursor-pointer bg-transparent border-0"
                  >
                    Mark all read
                  </button>
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
                        "px-4 py-3 border-b border-neo-ink/10 flex gap-3 items-start",
                        n.read ? "opacity-60" : "",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "shrink-0 w-7 h-7 inline-flex items-center justify-center border-2 border-neo-ink mt-0.5",
                          n.type === "ai"
                            ? "bg-neo-muted"
                            : n.type === "warning"
                            ? "bg-neo-accent"
                            : "bg-neo-secondary",
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
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-neo-ink leading-snug">
                          {n.message}
                        </p>
                        <p className="text-xs font-bold text-neo-ink/40 mt-1">
                          {formatRelative(n.timestamp)}
                        </p>
                      </div>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-neo-accent border border-neo-ink shrink-0 mt-2" />
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </Dropdown>

          {/* ─── Avatar ─── */}
          <Dropdown
            align="right"
            trigger={
              <span className="inline-flex items-center justify-center w-9 h-9 bg-neo-muted border-2 border-neo-ink shadow-[2px_2px_0_#000] rounded-full text-neo-ink font-black text-sm hover:shadow-neo-sm transition-all duration-100 ease-linear active:translate-x-[1px] active:translate-y-[1px] active:shadow-none">
                P
              </span>
            }
            items={[
              { label: "Profile", icon: User, onClick: () => {} },
              { label: "Sign Out", icon: LogOut, onClick: () => {} },
            ]}
          />
        </div>

        {/* ─── Mobile mode tabs ─── */}
        <div className="md:hidden flex border-t-2 border-neo-ink/20">
          <MobileHeaderTab
            label="Operations"
            active={mode === "operations"}
            onClick={() => setMode("operations")}
          />
          <MobileHeaderTab
            label="Live Stage"
            active={mode === "live"}
            onClick={() => setMode("live")}
          />
          <button
            onClick={goLive}
            className="flex-1 h-10 bg-neo-accent text-neo-ink font-bold text-xs uppercase tracking-wider border-0 cursor-pointer flex items-center justify-center gap-1"
            aria-label="Switch to Live Stage mode"
          >
            <Radio size={12} strokeWidth={3} />
            GO LIVE
          </button>
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
        "px-4 py-1.5 font-bold text-xs uppercase tracking-wider cursor-pointer",
        "border-2 transition-all duration-100 ease-linear",
        active
          ? "bg-neo-white text-neo-ink border-neo-ink shadow-[2px_2px_0_#000]"
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
        "flex-1 h-10 font-bold text-xs uppercase tracking-wider cursor-pointer border-0",
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
