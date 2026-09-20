import { useState, useMemo, useEffect } from "react";
import {
  Users,
  Sparkles,
  Plus,
  Mail,
  CheckCircle2,
  Clock,
  UserCheck,
  UserX,
  Trash2,
  AlertCircle,
  Briefcase,
  X,
  ExternalLink,
  Layers,
  AlertTriangle,
} from "lucide-react";
import { Badge, Modal, Input } from "./ui";
import Button from "./ui/Button";
import { useNotifications } from "../hooks/useNotifications";
import VolunteerEmailModal from "./VolunteerEmailModal";
import {
  getStoredVolunteers,
  saveStoredVolunteers,
  getStoredEvents,
  getActiveEventId,
  getStoredTasks,
  saveStoredTasks,
} from "../lib/storage";

/**
 * Checks if a task's deadline is approaching / urgent (due within 24h, overdue, or high priority).
 */
function isDeadlineNear(task) {
  if (!task || task.status === "done") return false;
  // High priority tasks are critical and time-sensitive
  if (task.priority === "high") return true;

  if (task.dueDate) {
    const due = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate);
    if (!isNaN(due.getTime())) {
      const now = new Date();
      const diffMs = due.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      if (diffHours <= 24) return true;
    }
  }
  return false;
}

/**
 * Finds the candidate volunteer to assign a task according to the rule:
 * 1. Volunteers with status "Available" are strictly prioritized. An "Active" person
 *    MUST NOT be assigned if an "Available" person is available.
 * 2. Only if no "Available" person is available, "Active" volunteers can be assigned.
 * 3. "Off Duty" volunteers are never assigned.
 * 4. Within the eligible pool, the person with the LEAST tasks is chosen (with skill matching as tie-breaker).
 */
export function findLeastLoadedCandidate(task, candidateVolunteers, taskCounts = {}) {
  if (!candidateVolunteers || candidateVolunteers.length === 0) return null;

  // 1. Exclude any Off Duty volunteers
  const notOffDuty = candidateVolunteers.filter((v) => v.status !== "Off Duty");
  if (notOffDuty.length === 0) return null;

  // 2. Strict Priority: "Available" volunteers first
  const strictlyAvailable = notOffDuty.filter((v) => v.status === "Available");

  // If there is an available person available, strictly use available pool;
  // otherwise fallback to active volunteers.
  const pool = strictlyAvailable.length > 0 ? strictlyAvailable : notOffDuty;

  // 3. Sort within the selected pool by least tasks ascending
  const sorted = [...pool].sort((a, b) => {
    const countA = taskCounts[a.name.toLowerCase().trim()] || 0;
    const countB = taskCounts[b.name.toLowerCase().trim()] || 0;
    if (countA !== countB) return countA - countB;

    // Tie-breaker: if task counts are identical, prefer candidate with matching skills
    if (task) {
      const taskText = `${task.title} ${task.description || ""}`.toLowerCase();
      const aSkills = (a.skills || "").toLowerCase().split(",").map((s) => s.trim());
      const bSkills = (b.skills || "").toLowerCase().split(",").map((s) => s.trim());
      const aMatch = aSkills.some((s) => s && taskText.includes(s.toLowerCase()));
      const bMatch = bSkills.some((s) => s && taskText.includes(s.toLowerCase()));
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
    }
    return a.name.localeCompare(b.name);
  });

  return sorted[0];
}

const INITIAL_VOLUNTEERS = [
  {
    id: "vol-1",
    name: "Rahul",
    email: "rahul.design@chronops.io",
    role: "Design Team",
    skills: "UI/UX, Badges & Lanyards, Stage Branding",
    status: "Active", // "Active" | "Available" | "Off Duty"
  },
  {
    id: "vol-2",
    name: "Priya",
    email: "priya.ops@chronops.io",
    role: "Operations",
    skills: "Stage Coordination, AV Support, Crowd Flow",
    status: "Available",
  },
  {
    id: "vol-3",
    name: "Arjun",
    email: "arjun.tech@chronops.io",
    role: "Technical Track",
    skills: "Judging Rubrics, Bot Verification, Wi-Fi Support",
    status: "Active",
  },
  {
    id: "vol-4",
    name: "Kavya",
    email: "kavya.logistics@chronops.io",
    role: "Logistics",
    skills: "Catering, Speaker Hospitality, Equipment",
    status: "Available",
  },
  {
    id: "vol-5",
    name: "Neha",
    email: "neha.pr@chronops.io",
    role: "PR & Communications",
    skills: "Announcements, Social Media, Registration",
    status: "Available",
  },
];

function loadSavedVolunteers() {
  const stored = getStoredVolunteers();
  if (stored && stored.length > 0) return stored;
  saveStoredVolunteers(INITIAL_VOLUNTEERS);
  return INITIAL_VOLUNTEERS;
}

export default function VolunteerManagement() {
  const [volunteers, setVolunteers] = useState(loadSavedVolunteers);
  const [dataRevision, setDataRevision] = useState(0);
  const [isAssigning, setIsAssigning] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailTargetContext, setEmailTargetContext] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Selected volunteer for task assignment modal
  const [assignModalVolunteer, setAssignModalVolunteer] = useState(null);

  // New task form inside assignment modal
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskEventId, setNewTaskEventId] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState("medium");
  const [newTaskStatus, setNewTaskStatus] = useState("todo");

  // Prompt modal when a volunteer goes off duty with assigned tasks
  const [offDutyPrompt, setOffDutyPrompt] = useState(null);
  const [reassignSelections, setReassignSelections] = useState({});

  const [newVolunteer, setNewVolunteer] = useState({
    name: "",
    email: "",
    role: "Operations",
    skills: "",
    status: "Available",
  });

  const { addNotification } = useNotifications();

  // Sync with global updates and multi-user storage
  useEffect(() => {
    const handleUpdate = () => {
      setVolunteers(loadSavedVolunteers());
      setDataRevision((v) => v + 1);
    };
    window.addEventListener("clubops-data-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("clubops-data-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // Save volunteers to user-scoped storage
  const saveVolunteers = (updated) => {
    setVolunteers(updated);
    saveStoredVolunteers(updated);
  };

  // Get all active events for the current user
  const eventsList = useMemo(() => {
    const stored = getStoredEvents();
    if (stored && stored.length > 0) return stored;
    const activeId = getActiveEventId() || "main-event";
    return [{ id: activeId, name: "Main Event Taskboard" }];
  }, [dataRevision]);

  // Set default eventId for new tasks
  useEffect(() => {
    if (eventsList.length > 0 && !newTaskEventId) {
      setNewTaskEventId(eventsList[0].id);
    }
  }, [eventsList, newTaskEventId]);

  // Load all tasks across all events
  const allTasks = useMemo(() => {
    const tasks = [];
    eventsList.forEach((ev) => {
      const evTasks = getStoredTasks(ev.id);
      evTasks.forEach((t) => {
        tasks.push({
          ...t,
          eventId: ev.id,
          eventTitle: ev.name || ev.title || ev.id,
        });
      });
    });
    return tasks;
  }, [eventsList, dataRevision]);

  // Map task counts per volunteer across all events
  const volunteerTaskCounts = useMemo(() => {
    const map = {};
    volunteers.forEach((v) => {
      map[v.name.toLowerCase().trim()] = 0;
    });

    allTasks.forEach((t) => {
      if (t.assignee) {
        const key = t.assignee.toLowerCase().trim();
        if (map[key] !== undefined) {
          map[key] += 1;
        }
      }
    });
    return map;
  }, [volunteers, allTasks]);

  // Filter volunteers by status
  const filteredVolunteers = useMemo(() => {
    if (statusFilter === "all") return volunteers;
    return volunteers.filter((v) => v.status.toLowerCase() === statusFilter.toLowerCase());
  }, [volunteers, statusFilter]);

  // Unassigned tasks across all boards
  const unassignedTasks = useMemo(() => {
    return allTasks.filter((t) => !t.assignee || t.assignee.trim() === "");
  }, [allTasks]);

  // Tasks assigned to the currently selected volunteer in the modal
  const selectedVolunteerTasks = useMemo(() => {
    if (!assignModalVolunteer) return [];
    const name = assignModalVolunteer.name.toLowerCase().trim();
    return allTasks.filter((t) => t.assignee && t.assignee.toLowerCase().trim() === name);
  }, [assignModalVolunteer, allTasks]);

  // Create & assign a new task to the selected volunteer
  const handleCreateAndAssignTask = (e) => {
    e.preventDefault();
    if (!assignModalVolunteer || !newTaskTitle.trim()) return;

    const evId = newTaskEventId || eventsList[0]?.id;
    if (!evId) return;

    const currentTasks = getStoredTasks(evId);
    const newTask = {
      id: "task-" + Date.now(),
      title: newTaskTitle.trim(),
      assignee: assignModalVolunteer.name,
      priority: newTaskPriority,
      status: newTaskStatus,
      eventId: evId,
      source: "manual",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveStoredTasks(evId, [newTask, ...currentTasks]);
    setNewTaskTitle("");

    // If volunteer was Available, mark them as Active
    if (assignModalVolunteer.status === "Available") {
      const updated = volunteers.map((v) =>
        v.id === assignModalVolunteer.id ? { ...v, status: "Active" } : v
      );
      saveVolunteers(updated);
    }

    addNotification({
      message: `Task "${newTask.title}" created & assigned to ${assignModalVolunteer.name}.`,
      type: "action",
    });
    setDataRevision((v) => v + 1);
  };

  // Quick-assign an existing unassigned task
  const handleQuickAssign = (task) => {
    if (!assignModalVolunteer) return;
    const currentTasks = getStoredTasks(task.eventId);
    const updated = currentTasks.map((t) =>
      t.id === task.id
        ? { ...t, assignee: assignModalVolunteer.name, updatedAt: new Date().toISOString() }
        : t
    );
    saveStoredTasks(task.eventId, updated);

    if (assignModalVolunteer.status === "Available") {
      const updatedVols = volunteers.map((v) =>
        v.id === assignModalVolunteer.id ? { ...v, status: "Active" } : v
      );
      saveVolunteers(updatedVols);
    }

    addNotification({
      message: `Assigned "${task.title}" to ${assignModalVolunteer.name}.`,
      type: "action",
    });
    setDataRevision((v) => v + 1);
  };

  // Unassign a task
  const handleUnassignTask = (task) => {
    const currentTasks = getStoredTasks(task.eventId);
    const updated = currentTasks.map((t) =>
      t.id === task.id ? { ...t, assignee: "", updatedAt: new Date().toISOString() } : t
    );
    saveStoredTasks(task.eventId, updated);
    addNotification({
      message: `Unassigned "${task.title}".`,
      type: "action",
    });
    setDataRevision((v) => v + 1);
  };

  // AI Auto-Assign Algorithm across all boards (strictly assigns to Available volunteers before Active ones)
  const handleAutoAssign = async () => {
    setIsAssigning(true);
    let assignedCount = 0;
    let offDutyReassignedCount = 0;

    try {
      const availableVolunteers = volunteers.filter((v) => v.status !== "Off Duty");

      if (availableVolunteers.length === 0) {
        alert("No active or available volunteers to assign tasks to.");
        setIsAssigning(false);
        return;
      }

      const offDutyVolunteerNames = new Set(
        volunteers
          .filter((v) => v.status === "Off Duty")
          .map((v) => v.name.toLowerCase().trim())
      );

      // Track live volunteers and counts so Available volunteers are strictly exhausted
      // before assigning tasks to Active volunteers
      let liveVolunteers = availableVolunteers.map((v) => ({ ...v }));
      const liveCounts = { ...volunteerTaskCounts };

      eventsList.forEach((ev) => {
        const evTasks = getStoredTasks(ev.id);
        let modified = false;

        const updatedEvTasks = evTasks.map((task) => {
          if (task.status === "done") return task;

          const isUnassigned = !task.assignee || task.assignee.trim() === "";
          const isOffDutyAssignee =
            task.assignee && offDutyVolunteerNames.has(task.assignee.toLowerCase().trim());

          if (isUnassigned || isOffDutyAssignee) {
            // Strictly prioritizes Available volunteers before Active ones
            const candidate = findLeastLoadedCandidate(task, liveVolunteers, liveCounts);

            if (candidate) {
              const candKey = candidate.name.toLowerCase().trim();
              liveCounts[candKey] = (liveCounts[candKey] || 0) + 1;

              // Transition candidate status to Active in live pool so remaining Available volunteers get subsequent tasks
              liveVolunteers = liveVolunteers.map((v) =>
                v.id === candidate.id ? { ...v, status: "Active" } : v
              );

              if (isOffDutyAssignee) {
                offDutyReassignedCount++;
              } else {
                assignedCount++;
              }
              modified = true;
              return {
                ...task,
                assignee: candidate.name,
                updatedAt: new Date().toISOString(),
              };
            }
          }
          return task;
        });

        if (modified) {
          saveStoredTasks(ev.id, updatedEvTasks);
        }
      });

      // Mark assigned volunteers as Active in storage
      const updatedVolunteers = volunteers.map((v) => {
        const key = v.name.toLowerCase().trim();
        const count = liveCounts[key] || 0;
        return {
          ...v,
          status: count > 0 && v.status !== "Off Duty" ? "Active" : v.status,
        };
      });
      saveVolunteers(updatedVolunteers);
      setDataRevision((v) => v + 1);

      const totalAssigned = assignedCount + offDutyReassignedCount;
      const details =
        offDutyReassignedCount > 0
          ? ` (${offDutyReassignedCount} reallocated from off-duty volunteers)`
          : "";

      addNotification({
        message: `AI Auto-Assignment complete: ${totalAssigned} tasks assigned${details} (Available volunteers prioritized).`,
        type: "ai",
      });
    } catch (err) {
      console.error("Auto-assign error:", err);
      alert("Failed to auto-assign volunteers: " + err.message);
    } finally {
      setIsAssigning(false);
    }
  };

  // Toggle volunteer status (handles off-duty transitions by strictly prioritizing Available volunteers over Active ones)
  const handleToggleStatus = (volId) => {
    const vol = volunteers.find((v) => v.id === volId);
    if (!vol) return;

    const statusCycle = ["Active", "Available", "Off Duty"];
    const currentIdx = statusCycle.indexOf(vol.status);
    const nextStatus = statusCycle[(currentIdx + 1) % statusCycle.length];

    if (nextStatus === "Off Duty") {
      const volName = vol.name.toLowerCase().trim();
      const assignedTasks = allTasks.filter(
        (t) => t.assignee && t.assignee.toLowerCase().trim() === volName && t.status !== "done"
      );

      if (assignedTasks.length > 0) {
        const availableCandidates = volunteers.filter(
          (v) => v.id !== vol.id && v.status !== "Off Duty"
        );

        if (availableCandidates.length === 0) {
          alert("Cannot reassign tasks: no other volunteers are available or active.");
          return;
        }

        // Live workload and status tracker
        let liveCandidates = availableCandidates.map((v) => ({ ...v }));
        const liveCounts = { ...volunteerTaskCounts };
        delete liveCounts[volName];

        // Separate urgent tasks (deadline near) vs normal tasks
        const urgentTasks = assignedTasks.filter((t) => isDeadlineNear(t));
        const normalTasks = assignedTasks.filter((t) => !isDeadlineNear(t));
        const autoReassigned = [];

        // If deadline is near: do it automatically, strictly assigning to Available volunteers first!
        if (urgentTasks.length > 0) {
          urgentTasks.forEach((task) => {
            const candidate = findLeastLoadedCandidate(task, liveCandidates, liveCounts);
            if (candidate) {
              const candKey = candidate.name.toLowerCase().trim();
              liveCounts[candKey] = (liveCounts[candKey] || 0) + 1;

              liveCandidates = liveCandidates.map((v) =>
                v.id === candidate.id ? { ...v, status: "Active" } : v
              );

              const evTasks = getStoredTasks(task.eventId);
              const updated = evTasks.map((t) =>
                t.id === task.id
                  ? { ...t, assignee: candidate.name, updatedAt: new Date().toISOString() }
                  : t
              );
              saveStoredTasks(task.eventId, updated);
              autoReassigned.push({
                taskId: task.id,
                title: task.title,
                newAssignee: candidate.name,
                newAssigneeTasks: liveCounts[candKey],
              });
            }
          });

          addNotification({
            message: `⚡ Urgent deadline! ${autoReassigned.length} task(s) automatically reassigned to available volunteers because ${vol.name} went Off Duty.`,
            type: "ai",
          });
        }

        // Set volunteer status to Off Duty
        const updatedVolunteers = volunteers.map((v) =>
          v.id === vol.id ? { ...v, status: "Off Duty" } : v
        );
        saveVolunteers(updatedVolunteers);
        setDataRevision((v) => v + 1);

        // If there are non-urgent tasks remaining: prompt user to assign to other available person!
        if (normalTasks.length > 0) {
          const initialSelections = {};
          normalTasks.forEach((task) => {
            // Default recommendation strictly prioritizes Available volunteers before Active ones
            const candidate = findLeastLoadedCandidate(task, liveCandidates, liveCounts);
            if (candidate) {
              initialSelections[task.id] = candidate.name;
              const candKey = candidate.name.toLowerCase().trim();
              liveCounts[candKey] = (liveCounts[candKey] || 0) + 1;
              liveCandidates = liveCandidates.map((v) =>
                v.id === candidate.id ? { ...v, status: "Active" } : v
              );
            } else {
              initialSelections[task.id] = "";
            }
          });
          setReassignSelections(initialSelections);
          setOffDutyPrompt({
            volunteer: vol,
            tasks: normalTasks,
            autoReassigned,
          });
          return;
        }

        return;
      }
    }

    // Normal status toggle
    const updated = volunteers.map((v) =>
      v.id === volId ? { ...v, status: nextStatus } : v
    );
    saveVolunteers(updated);
  };

  // Confirm custom user selections from off-duty prompt modal
  const handleConfirmOffDutyReassignments = () => {
    if (!offDutyPrompt) return;
    let count = 0;

    offDutyPrompt.tasks.forEach((task) => {
      const selectedAssignee = reassignSelections[task.id];
      if (selectedAssignee !== undefined) {
        const evTasks = getStoredTasks(task.eventId);
        const updated = evTasks.map((t) =>
          t.id === task.id
            ? { ...t, assignee: selectedAssignee, updatedAt: new Date().toISOString() }
            : t
        );
        saveStoredTasks(task.eventId, updated);
        if (selectedAssignee) count++;
      }
    });

    addNotification({
      message: `Reassigned ${count} task(s) from ${offDutyPrompt.volunteer.name}.`,
      type: "action",
    });
    setOffDutyPrompt(null);
    setDataRevision((v) => v + 1);
  };

  // 1-click AI auto reassign all tasks in off-duty prompt (Available volunteers prioritized)
  const handleAiAutoReassignInPrompt = () => {
    if (!offDutyPrompt) return;
    const availableCandidates = volunteers.filter(
      (v) => v.id !== offDutyPrompt.volunteer.id && v.status !== "Off Duty"
    );

    if (availableCandidates.length === 0) {
      alert("No available volunteers to reassign tasks to.");
      return;
    }

    let liveCandidates = availableCandidates.map((v) => ({ ...v }));
    const liveCounts = { ...volunteerTaskCounts };
    let count = 0;
    offDutyPrompt.tasks.forEach((task) => {
      // Prioritizes Available volunteers over Active ones
      const candidate = findLeastLoadedCandidate(task, liveCandidates, liveCounts);
      if (candidate) {
        const candKey = candidate.name.toLowerCase().trim();
        liveCounts[candKey] = (liveCounts[candKey] || 0) + 1;
        liveCandidates = liveCandidates.map((v) =>
          v.id === candidate.id ? { ...v, status: "Active" } : v
        );

        const evTasks = getStoredTasks(task.eventId);
        const updated = evTasks.map((t) =>
          t.id === task.id
            ? { ...t, assignee: candidate.name, updatedAt: new Date().toISOString() }
            : t
        );
        saveStoredTasks(task.eventId, updated);
        count++;
      }
    });

    addNotification({
      message: `Auto-reassigned ${count} task(s) from ${offDutyPrompt.volunteer.name} (Available volunteers prioritized).`,
      type: "ai",
    });
    setOffDutyPrompt(null);
    setDataRevision((v) => v + 1);
  };

  // Unassign tasks to backlog in off-duty prompt
  const handleUnassignAllInPrompt = () => {
    if (!offDutyPrompt) return;
    offDutyPrompt.tasks.forEach((task) => {
      const evTasks = getStoredTasks(task.eventId);
      const updated = evTasks.map((t) =>
        t.id === task.id
          ? { ...t, assignee: "", updatedAt: new Date().toISOString() }
          : t
      );
      saveStoredTasks(task.eventId, updated);
    });

    addNotification({
      message: `Moved ${offDutyPrompt.tasks.length} task(s) to unassigned backlog.`,
      type: "action",
    });
    setOffDutyPrompt(null);
    setDataRevision((v) => v + 1);
  };

  // Delete volunteer
  const handleDeleteVolunteer = (volId, name) => {
    if (confirm(`Remove ${name} from the volunteer roster?`)) {
      const updated = volunteers.filter((v) => v.id !== volId);
      saveVolunteers(updated);
      addNotification({
        message: `Removed volunteer ${name}.`,
        type: "action",
      });
    }
  };

  // Add volunteer
  const handleAddVolunteerSubmit = (e) => {
    e.preventDefault();
    if (!newVolunteer.name.trim()) return;

    const email =
      newVolunteer.email.trim() ||
      `${newVolunteer.name.toLowerCase().replace(/\s+/g, ".")}@chronops.io`;

    const vol = {
      id: "vol-" + Date.now(),
      name: newVolunteer.name.trim(),
      email: email,
      role: newVolunteer.role.trim() || "Operations",
      skills: newVolunteer.skills.trim() || "General Event Operations",
      status: newVolunteer.status || "Available",
    };

    saveVolunteers([...volunteers, vol]);
    setNewVolunteer({
      name: "",
      email: "",
      role: "Operations",
      skills: "",
      status: "Available",
    });
    setAddModalOpen(false);

    addNotification({
      message: `Added new volunteer ${vol.name} (${vol.role}).`,
      type: "action",
    });
  };

  const handleSendIndividualEmail = (vol) => {
    setEmailTargetContext(`Briefing for ${vol.name} (${vol.role}): `);
    setEmailModalOpen(true);
  };

  return (
    <div className="bg-neo-white border-4 border-neo-ink shadow-neo p-5 sm:p-6 space-y-5">
      {/* ─── Header: Volunteer Management ─── */}
      <div className="border-b-2 border-neo-ink/20 pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users size={20} strokeWidth={2.5} className="text-neo-accent" />
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-neo-ink">
              Volunteer Management
            </h2>
          </div>
          <p className="text-xs text-neo-ink/70 mt-1 font-medium">
            Manage volunteer roster, track workloads, and assign tasks across event boards.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAutoAssign}
            disabled={isAssigning}
            className="!h-9 !text-xs !px-3 font-bold flex items-center gap-1.5 shadow-[2px_2px_0_#0F172A]"
            title="Automatically assign open tasks using skills and availability"
          >
            <Sparkles size={13} strokeWidth={2.5} className="animate-spin-slow" />
            {isAssigning ? "Assigning..." : "AI Auto-Assign"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEmailTargetContext("");
              setEmailModalOpen(true);
            }}
            className="!h-9 !text-xs !px-3 font-bold flex items-center gap-1.5 shadow-[2px_2px_0_#0F172A] hover:bg-neo-secondary"
            title="Send actual email to volunteers"
          >
            <Mail size={13} strokeWidth={2.5} />
            Send Email
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddModalOpen(true)}
            className="!h-9 !text-xs !px-3 font-bold flex items-center gap-1.5 shadow-[2px_2px_0_#0F172A]"
          >
            <Plus size={13} strokeWidth={2.5} />
            Add Volunteer
          </Button>
        </div>
      </div>

      {/* ─── Stats & Filter Bar ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-neo-bg p-3 border-2 border-neo-ink">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-neo-ink/70">Filter Status:</span>
          {["all", "Active", "Available", "Off Duty"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={[
                "px-2.5 py-1 text-xs font-bold border border-neo-ink transition-colors cursor-pointer",
                statusFilter.toLowerCase() === st.toLowerCase()
                  ? "bg-neo-ink text-neo-white"
                  : "bg-neo-white text-neo-ink hover:bg-neo-secondary",
              ].join(" ")}
            >
              {st === "all" ? "All" : st}
            </button>
          ))}
        </div>

        <div className="text-xs font-bold text-neo-ink/80 flex items-center gap-3">
          <span>Total: {volunteers.length}</span>
          <span>•</span>
          <span className="text-green-700">
            Active: {volunteers.filter((v) => v.status === "Active").length}
          </span>
          <span>•</span>
          <span className="text-blue-700">
            Available: {volunteers.filter((v) => v.status === "Available").length}
          </span>
          <span>•</span>
          <span className="text-neo-ink/60">
            Open Tasks: {unassignedTasks.length}
          </span>
        </div>
      </div>

      {/* ─── Volunteer Table ─── */}
      <div className="overflow-x-auto border-3 border-neo-ink shadow-[3px_3px_0_#0F172A]">
        <table className="w-full text-left border-collapse bg-neo-white">
          <thead>
            <tr className="bg-neo-ink text-neo-white text-xs font-bold border-b-2 border-neo-ink">
              <th className="p-3">Name</th>
              <th className="p-3">Role</th>
              <th className="p-3">Email Address</th>
              <th className="p-3 hidden md:table-cell">Skills</th>
              <th className="p-3 text-center">Tasks</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-neo-ink/15 text-xs font-medium text-neo-ink">
            {filteredVolunteers.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-6 text-center text-neo-ink/60 font-bold">
                  No volunteers found in this status filter.
                </td>
              </tr>
            ) : (
              filteredVolunteers.map((vol) => {
                const count = volunteerTaskCounts[vol.name.toLowerCase().trim()] || 0;
                const email =
                  vol.email || `${vol.name.toLowerCase().replace(/\s+/g, ".")}@chronops.io`;

                return (
                  <tr key={vol.id} className="hover:bg-neo-secondary/20 transition-colors">
                    {/* Name */}
                    <td className="p-3 font-bold text-sm text-neo-ink">{vol.name}</td>

                    {/* Role */}
                    <td className="p-3">
                      <span className="font-semibold text-neo-ink/90 bg-neo-bg px-2 py-0.5 border border-neo-ink/30">
                        {vol.role}
                      </span>
                    </td>

                    {/* Email */}
                    <td className="p-3 font-mono text-xs text-neo-ink/80">
                      <a
                        href={`mailto:${email}`}
                        className="hover:underline hover:text-neo-accent flex items-center gap-1"
                        title={`Send direct email to ${email}`}
                      >
                        {email}
                        <ExternalLink size={10} strokeWidth={2} />
                      </a>
                    </td>

                    {/* Skills */}
                    <td className="p-3 hidden md:table-cell text-xs text-neo-ink/75 max-w-xs truncate">
                      {vol.skills}
                    </td>

                    {/* Assigned Tasks Badge / Direct Assignment Trigger */}
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => setAssignModalVolunteer(vol)}
                        className={[
                          "inline-flex items-center gap-1.5 font-bold text-xs px-2.5 py-1 border-2 border-neo-ink cursor-pointer shadow-[2px_2px_0_#0F172A] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_#0F172A] transition-all",
                          count > 0
                            ? "bg-neo-secondary text-neo-ink"
                            : "bg-neo-bg text-neo-ink hover:bg-neo-secondary/40",
                        ].join(" ")}
                        title={`Click to view or add tasks for ${vol.name}`}
                      >
                        <span>
                          {count} {count === 1 ? "task" : "tasks"}
                        </span>
                        <Plus size={11} strokeWidth={3} className="text-neo-ink/80" />
                      </button>
                    </td>

                    {/* Status */}
                    <td className="p-3">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(vol.id)}
                        className="cursor-pointer group flex items-center gap-1"
                        title="Click to toggle status (Active -> Available -> Off Duty)"
                      >
                        {vol.status === "Active" ? (
                          <Badge
                            color="accent"
                            className="!text-[11px] !px-2 !py-0.5 font-bold cursor-pointer hover:opacity-85"
                          >
                            Active
                          </Badge>
                        ) : vol.status === "Available" ? (
                          <Badge
                            color="secondary"
                            className="!text-[11px] !px-2 !py-0.5 font-bold cursor-pointer hover:opacity-85"
                          >
                            Available
                          </Badge>
                        ) : (
                          <Badge
                            color="muted"
                            className="!text-[11px] !px-2 !py-0.5 font-bold cursor-pointer hover:opacity-85"
                          >
                            Off Duty
                          </Badge>
                        )}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => handleDeleteVolunteer(vol.id, vol.name)}
                          className="h-7 w-7 bg-neo-white text-neo-ink border-2 border-neo-ink flex items-center justify-center shadow-[1px_1px_0_#0F172A] hover:bg-neo-accent hover:text-neo-white transition-colors cursor-pointer"
                          title={`Remove ${vol.name}`}
                        >
                          <Trash2 size={12} strokeWidth={2.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ─── Manage & Assign Tasks Modal ─── */}
      {assignModalVolunteer && (
        <Modal
          open={!!assignModalVolunteer}
          onClose={() => setAssignModalVolunteer(null)}
          title={`Assign & Manage Tasks — ${assignModalVolunteer.name}`}
        >
          <div className="space-y-4">
            {/* Volunteer Header Info */}
            <div className="bg-neo-bg p-3 border-2 border-neo-ink flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-neo-ink">
                    {assignModalVolunteer.name}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-neo-white border border-neo-ink font-semibold">
                    {assignModalVolunteer.role}
                  </span>
                  <Badge color={assignModalVolunteer.status === "Active" ? "accent" : "secondary"}>
                    {assignModalVolunteer.status}
                  </Badge>
                </div>
                <p className="text-xs text-neo-ink/70 mt-1">
                  <span className="font-bold">Skills:</span>{" "}
                  {assignModalVolunteer.skills || "General Operations"}
                </p>
              </div>
            </div>

            {/* ─── Form: Create & Assign New Task ─── */}
            <form
              onSubmit={handleCreateAndAssignTask}
              className="border-2 border-neo-ink p-3.5 space-y-3 bg-neo-white shadow-[2px_2px_0_#0F172A]"
            >
              <div className="flex items-center justify-between border-b border-neo-ink/20 pb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neo-ink flex items-center gap-1.5">
                  <Plus size={14} strokeWidth={3} className="text-neo-accent" />
                  Create & Assign New Task
                </h4>
                <span className="text-[11px] text-neo-ink/60 font-semibold">
                  Assigned directly to {assignModalVolunteer.name}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-neo-ink mb-1">
                  Task Title *
                </label>
                <Input
                  required
                  placeholder="e.g. Coordinate sound check and microphone handoff"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="!h-9 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-neo-ink mb-1">
                    Event Board
                  </label>
                  <select
                    value={newTaskEventId}
                    onChange={(e) => setNewTaskEventId(e.target.value)}
                    className="w-full h-8 text-xs font-semibold bg-neo-white border-2 border-neo-ink px-2 outline-none"
                  >
                    {eventsList.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.name || ev.title || ev.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-neo-ink mb-1">
                    Priority
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value)}
                    className="w-full h-8 text-xs font-semibold bg-neo-white border-2 border-neo-ink px-2 outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-neo-ink mb-1">
                    Status
                  </label>
                  <select
                    value={newTaskStatus}
                    onChange={(e) => setNewTaskStatus(e.target.value)}
                    className="w-full h-8 text-xs font-semibold bg-neo-white border-2 border-neo-ink px-2 outline-none"
                  >
                    <option value="todo">To Do</option>
                    <option value="backlog">Backlog</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="!h-8 !text-xs !bg-neo-accent font-bold shadow-[2px_2px_0_#0F172A]"
                >
                  <Plus size={13} strokeWidth={2.5} />
                  Assign Task
                </Button>
              </div>
            </form>

            {/* ─── Quick-Assign Open Unassigned Tasks ─── */}
            {unassignedTasks.length > 0 && (
              <div className="border-2 border-neo-ink p-3.5 space-y-2 bg-neo-white shadow-[2px_2px_0_#0F172A]">
                <div className="flex items-center justify-between border-b border-neo-ink/20 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neo-ink">
                    Quick-Assign Open Tasks
                  </h4>
                  <span className="text-[11px] font-semibold text-neo-ink/60">
                    {unassignedTasks.length} unassigned
                  </span>
                </div>
                <div className="max-h-40 overflow-y-auto divide-y divide-neo-ink/15 pr-1">
                  {unassignedTasks.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between gap-3 py-2 text-xs hover:bg-neo-bg/30 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-neo-ink truncate">{task.title}</div>
                        <div className="text-[10px] text-neo-ink/70 flex items-center gap-2 mt-0.5">
                          <span className="font-bold text-neo-ink">{task.eventTitle}</span>
                          <span>•</span>
                          <span className="uppercase font-semibold">{task.priority}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleQuickAssign(task)}
                        className="text-[11px] font-bold text-neo-accent hover:underline px-1 py-0.5 shrink-0 cursor-pointer"
                      >
                        + Assign
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── Currently Assigned Tasks List ─── */}
            <div className="border-2 border-neo-ink p-3.5 space-y-2 bg-neo-white shadow-[2px_2px_0_#0F172A]">
              <div className="flex items-center justify-between border-b border-neo-ink/20 pb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neo-ink">
                  Currently Assigned Tasks ({selectedVolunteerTasks.length})
                </h4>
              </div>
              {selectedVolunteerTasks.length === 0 ? (
                <p className="text-xs text-neo-ink/60 py-2 font-medium italic">
                  No tasks currently assigned to {assignModalVolunteer.name}.
                </p>
              ) : (
                <div className="max-h-48 overflow-y-auto divide-y divide-neo-ink/15 pr-1">
                  {selectedVolunteerTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between gap-3 py-2 text-xs hover:bg-neo-bg/30 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-neo-ink truncate">{task.title}</div>
                        <div className="text-[10px] text-neo-ink/70 flex items-center gap-2 mt-0.5">
                          <span className="font-bold text-neo-ink">
                            {task.eventTitle}
                          </span>
                          <span>•</span>
                          <span className="uppercase">{task.status?.replace("_", " ")}</span>
                          <span>•</span>
                          <span className="uppercase font-semibold">{task.priority}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUnassignTask(task)}
                        className="text-[11px] font-bold text-red-600 hover:text-red-800 hover:underline px-1 py-0.5 shrink-0 cursor-pointer"
                        title="Unassign task from volunteer"
                      >
                        Unassign
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t-2 border-neo-ink/20">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const vol = assignModalVolunteer;
                  setAssignModalVolunteer(null);
                  handleSendIndividualEmail(vol);
                }}
                className="!h-8 !text-xs font-bold flex items-center gap-1.5 shadow-[2px_2px_0_#0F172A] hover:bg-neo-secondary cursor-pointer"
                title={`Send briefing email to ${assignModalVolunteer.name}`}
              >
                <Mail size={13} strokeWidth={2.5} />
                Email
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setAssignModalVolunteer(null)}
                className="!h-8 !text-xs !bg-neo-accent font-bold shadow-[2px_2px_0_#0F172A] cursor-pointer"
              >
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── Volunteer Went Off Duty — Reassign Tasks Prompt Modal ─── */}
      {offDutyPrompt && (
        <Modal
          open={!!offDutyPrompt}
          onClose={() => setOffDutyPrompt(null)}
          title={`Reassign Tasks — ${offDutyPrompt.volunteer.name} Went Off Duty`}
        >
          <div className="space-y-4">
            {/* Urgent Auto-Reassigned Banner (if any) */}
            {offDutyPrompt.autoReassigned && offDutyPrompt.autoReassigned.length > 0 && (
              <div className="p-3 bg-emerald-50 border-2 border-emerald-600 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-900 uppercase">
                  <Sparkles size={14} className="text-emerald-700" />
                  ⚡ {offDutyPrompt.autoReassigned.length} Urgent Task(s) Automatically Reassigned!
                </div>
                <p className="text-[11px] text-emerald-800 font-medium">
                  Because deadlines are near, the following urgent tasks were automatically reassigned to available volunteers immediately:
                </p>
                <div className="space-y-0.5 text-xs font-bold text-emerald-950">
                  {offDutyPrompt.autoReassigned.map((ar, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <span>• "{ar.title}"</span>
                      <span className="text-emerald-700">➔ Reassigned to {ar.newAssignee}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prompt Notice */}
            <div className="p-3 bg-amber-50 border-2 border-amber-600 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900 uppercase">
                <AlertTriangle size={14} className="text-amber-800" />
                {offDutyPrompt.volunteer.name} is now Off Duty
              </div>
              <p className="text-xs text-amber-900 font-medium">
                {offDutyPrompt.volunteer.name} went off duty with{" "}
                <span className="font-bold">{offDutyPrompt.tasks.length} task(s)</span>.
                Select replacement volunteers below, or use 1-click AI Auto-Reassign:
              </p>
            </div>

            {/* Task Reassignment List */}
            <div className="border-2 border-neo-ink p-3 space-y-2.5 bg-neo-white shadow-[2px_2px_0_#0F172A] max-h-60 overflow-y-auto divide-y divide-neo-ink/15">
              {offDutyPrompt.tasks.map((task) => {
                const availableCandidates = volunteers.filter(
                  (v) => v.id !== offDutyPrompt.volunteer.id && v.status !== "Off Duty"
                );
                const recommended = findLeastLoadedCandidate(task, availableCandidates, volunteerTaskCounts);

                // Sort: "Available" status strictly first, then least tasks
                const sortedCandidates = [...availableCandidates].sort((a, b) => {
                  if (a.status === "Available" && b.status !== "Available") return -1;
                  if (a.status !== "Available" && b.status === "Available") return 1;
                  const countA = volunteerTaskCounts[a.name.toLowerCase().trim()] || 0;
                  const countB = volunteerTaskCounts[b.name.toLowerCase().trim()] || 0;
                  return countA - countB;
                });

                return (
                  <div key={task.id} className="pt-2.5 first:pt-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-bold text-xs text-neo-ink truncate flex-1">
                        {task.title}
                      </div>
                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 border border-neo-ink/40 bg-neo-bg shrink-0">
                        {task.eventTitle}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 text-[10px] text-neo-ink/70">
                        <span className="uppercase font-semibold">{task.priority} Priority</span>
                        {task.dueDate && (
                          <>
                            <span>•</span>
                            <span>
                              Due:{" "}
                              {task.dueDate instanceof Date
                                ? task.dueDate.toISOString().split("T")[0]
                                : String(task.dueDate).split("T")[0]}
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-neo-ink/70">Assign to:</span>
                        <select
                          value={reassignSelections[task.id] || ""}
                          onChange={(e) =>
                            setReassignSelections((prev) => ({
                              ...prev,
                              [task.id]: e.target.value,
                            }))
                          }
                          className="h-7 text-xs font-semibold bg-neo-white border-2 border-neo-ink px-1.5 outline-none shadow-[1px_1px_0_#0F172A]"
                        >
                          <option value="">Unassigned (Backlog)</option>
                          {sortedCandidates.map((c) => {
                            const cCount = volunteerTaskCounts[c.name.toLowerCase().trim()] || 0;
                            const isRec = recommended?.id === c.id;
                            return (
                              <option key={c.id} value={c.name}>
                                {c.name} — [{c.status}] ({cCount} {cCount === 1 ? "task" : "tasks"}){isRec ? " ★ (Recommended)" : ""}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t-2 border-neo-ink/20">
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnassignAllInPrompt}
                className="!text-xs text-neo-ink/70"
                title="Send tasks back to unassigned backlog"
              >
                Send to Backlog
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAiAutoReassignInPrompt}
                  className="!text-xs font-bold flex items-center gap-1 shadow-[2px_2px_0_#0F172A]"
                  title="Automatically match all tasks to best available volunteers"
                >
                  <Sparkles size={13} strokeWidth={2.5} />
                  AI Auto-Reassign All
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConfirmOffDutyReassignments}
                  className="!text-xs !bg-neo-accent font-bold shadow-[2px_2px_0_#0F172A]"
                >
                  Confirm Reassignment
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── Add Volunteer Modal ─── */}
      <Modal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Add Volunteer to Roster"
      >
        <form onSubmit={handleAddVolunteerSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-neo-ink mb-1">
              Volunteer Name *
            </label>
            <Input
              required
              placeholder="e.g. Sumanth Reddy"
              value={newVolunteer.name}
              onChange={(e) =>
                setNewVolunteer({ ...newVolunteer, name: e.target.value })
              }
              className="!h-9 text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-neo-ink mb-1">
              Email Address *
            </label>
            <Input
              type="email"
              placeholder="e.g. sumanth@chronops.io"
              value={newVolunteer.email}
              onChange={(e) =>
                setNewVolunteer({ ...newVolunteer, email: e.target.value })
              }
              className="!h-9 text-xs font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase text-neo-ink mb-1">
                Role / Track
              </label>
              <select
                value={newVolunteer.role}
                onChange={(e) =>
                  setNewVolunteer({ ...newVolunteer, role: e.target.value })
                }
                className="w-full h-9 text-xs font-semibold bg-neo-white border-2 border-neo-ink px-2 shadow-[2px_2px_0_#0F172A] outline-none"
              >
                <option value="Operations">Operations</option>
                <option value="Design Team">Design Team</option>
                <option value="Technical Track">Technical Track</option>
                <option value="Logistics">Logistics</option>
                <option value="PR & Communications">PR & Communications</option>
                <option value="Hospitality">Hospitality</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-neo-ink mb-1">
                Initial Status
              </label>
              <select
                value={newVolunteer.status}
                onChange={(e) =>
                  setNewVolunteer({ ...newVolunteer, status: e.target.value })
                }
                className="w-full h-9 text-xs font-semibold bg-neo-white border-2 border-neo-ink px-2 shadow-[2px_2px_0_#0F172A] outline-none"
              >
                <option value="Available">Available</option>
                <option value="Active">Active</option>
                <option value="Off Duty">Off Duty</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-neo-ink mb-1">
              Skills & Expertise (Comma-separated)
            </label>
            <Input
              placeholder="e.g. Wi-Fi setup, Mic handling, Badges"
              value={newVolunteer.skills}
              onChange={(e) =>
                setNewVolunteer({ ...newVolunteer, skills: e.target.value })
              }
              className="!h-9 text-xs font-bold"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t-2 border-neo-ink/20">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddModalOpen(false)}
              className="!text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              className="!text-xs !bg-neo-accent"
            >
              Add Volunteer
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── Volunteer Email Dispatch Modal ─── */}
      <VolunteerEmailModal
        open={emailModalOpen}
        onClose={() => setEmailModalOpen(false)}
        defaultContext={emailTargetContext}
      />
    </div>
  );
}
