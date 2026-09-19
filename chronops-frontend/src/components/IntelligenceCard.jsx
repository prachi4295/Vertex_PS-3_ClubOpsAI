import { useState, useRef, useEffect, useCallback } from "react";
import {
  Brain,
  Wand2,
  Mic,
  MicOff,
  Sparkles,
  FileText,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Globe,
  RefreshCw,
  Layers,
  Calendar,
  Check,
  ArrowRight,
  HelpCircle,
  Plus,
} from "lucide-react";
import { Card, Badge, Textarea, Toast, Modal } from "./ui";
import Button from "./ui/Button";
import {
  useTasks,
  addTasksBatchToEvent,
  deleteTasksBatchFromEvent,
} from "../hooks/useTasks";
import {
  extractTasksFromNotes,
  formatGeminiError,
  detectMissingTranscriptDetails,
} from "../services/gemini";
import { INITIAL_EVENTS } from "../data/multiEvents";

const LOCAL_EVENTS_STORAGE_KEY = "clubops_all_events_list";

const SAMPLE_TRANSCRIPT = `HackGenesis 2026 Core Team Standup:
1. Arjun, finalize the technical track judging rubric with lead mentors by September 21st. High priority.
2. Priya, coordinate with the auditorium AV team for live multi-camera streaming before September 22nd.
3. We need 15 heavy-duty extension power strips for the hacking arena. Someone needs to purchase these urgently.
4. Meera, send the confirmation emails and dietary requirement forms to all keynote speakers by September 20th.
5. Setup the Discord bot verification channel for hackathon participants.`;

// Demo fallback tasks for testing when Gemini API key is not configured
const DEMO_EXTRACTED_TASKS = [
  {
    title: "Finalize technical track judging rubric with lead mentors",
    assignee: "Arjun",
    dueDate: "2026-09-21",
    priority: "high",
  },
  {
    title: "Coordinate with auditorium AV team for live multi-camera streaming",
    assignee: "Priya",
    dueDate: "2026-09-22",
    priority: "high",
  },
  {
    title: "Purchase 15 heavy-duty extension power strips for hacking arena",
    assignee: "",
    dueDate: "2026-09-20",
    priority: "high",
  },
  {
    title: "Send confirmation emails and dietary forms to keynote speakers",
    assignee: "Meera",
    dueDate: "2026-09-20",
    priority: "medium",
  },
  {
    title: "Setup Discord bot verification channel for hackathon participants",
    assignee: "",
    dueDate: null,
    priority: "medium",
  },
];

/**
 * Intelligent detector to match an event name from transcript text.
 * Returns the matching event object, or null if ambiguous / unknown.
 */
function detectEventFromTranscript(text, eventList) {
  if (!text) return null;
  const lower = text.toLowerCase();

  for (const ev of eventList) {
    const evName = ev.name.toLowerCase();
    // Direct name match
    if (lower.includes(evName)) return ev;

    // Direct ID match
    if (lower.includes(ev.id.toLowerCase())) return ev;

    // Distinctive keywords per event
    if (ev.id === "hackgenesis-2026" && (lower.includes("hackgenesis") || lower.includes("genesis"))) {
      return ev;
    }
    if (ev.id === "ai-summit-2026" && (lower.includes("ai summit") || lower.includes("web3 summit") || lower.includes("web3"))) {
      return ev;
    }
    if (ev.id === "club-orientation-2026" && (lower.includes("orientation") || lower.includes("recruitment") || lower.includes("showcase"))) {
      return ev;
    }
  }

  return null;
}

export default function IntelligenceCard() {
  const { addNotification } = useNotifications();

  // Load available events list with auto-sync
  const [events, setEvents] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_EVENTS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to load events for IntelligenceCard:", e);
    }
    return INITIAL_EVENTS;
  });

  useEffect(() => {
    const handleEventsUpdate = () => {
      try {
        const saved = localStorage.getItem(LOCAL_EVENTS_STORAGE_KEY);
        if (saved) setEvents(JSON.parse(saved));
      } catch (e) {}
    };
    window.addEventListener("clubops-data-updated", handleEventsUpdate);
    return () =>
      window.removeEventListener("clubops-data-updated", handleEventsUpdate);
  }, []);

  const [notes, setNotes] = useState("");
  const [targetPreference, setTargetPreference] = useState("auto"); // "auto" or specific eventId
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showDemoOption, setShowDemoOption] = useState(false);

  // Missing details state & prompt modal
  const [missingDetailsModalOpen, setMissingDetailsModalOpen] = useState(false);
  const [missingDetailsAnalysis, setMissingDetailsAnalysis] = useState(null);
  const [editableTasks, setEditableTasks] = useState([]);
  const [modalSelectedEventId, setModalSelectedEventId] = useState(
    events[0]?.id || "hackgenesis-2026"
  );
  const [isCommitting, setIsCommitting] = useState(false);

  // Web Speech API state
  const [isRecording, setIsRecording] = useState(false);
  const [speechLang, setSpeechLang] = useState("en-IN"); // "en-IN" or "hi-IN"
  const [interimText, setInterimText] = useState("");
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);

  // Toast state with Undo
  const [toastData, setToastData] = useState(null); // { message, type, action }

  const recognitionRef = useRef(null);

  // Feature detection for Web Speech API
  useEffect(() => {
    const SpeechRecognition =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      setIsSpeechSupported(false);
    }
  }, []);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  // Start / Stop speech recognition
  const toggleRecording = useCallback(() => {
    if (!isSpeechSupported) return;

    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechLang;

      recognition.onstart = () => {
        setIsRecording(true);
        setErrorMsg("");
      };

      recognition.onresult = (event) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript + " ";
          } else {
            interim += transcript;
          }
        }

        if (final) {
          setNotes((prev) => (prev ? `${prev.trim()} ${final.trim()}` : final.trim()));
        }
        setInterimText(interim);
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        if (event.error !== "no-speech") {
          setErrorMsg(`Voice input error: ${event.error}`);
        }
        setIsRecording(false);
        setInterimText("");
      };

      recognition.onend = () => {
        setIsRecording(false);
        setInterimText("");
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setErrorMsg("Could not access microphone.");
      setIsRecording(false);
    }
  }, [isRecording, isSpeechSupported, speechLang]);

  // Actually commit extracted tasks to a specific target event board
  const commitTasksToEventBoard = async (targetEventId, tasksToCreate) => {
    setIsCommitting(true);
    try {
      const targetEvent =
        events.find((e) => e.id === targetEventId) || {
          name: "Event",
          id: targetEventId,
        };

      const created = await addTasksBatchToEvent(targetEventId, tasksToCreate);
      const createdIds = created.map((t) => t.id);

      // Add entry to notifications
      addNotification({
        type: "ai",
        message: `AI extracted ${created.length} tasks into "${targetEvent.name}" Backlog`,
      });

      // Clear textarea and state on success
      setNotes("");
      setErrorMsg("");
      setShowDemoOption(false);
      setPendingExtractedTasks([]);
      setChooseBoardModalOpen(false);

      // Show Toast with Undo action
      setToastData({
        message: `AI added ${created.length} task(s) to "${targetEvent.name}"`,
        type: "success",
        action: {
          label: "Undo",
          onClick: async () => {
            await deleteTasksBatchFromEvent(targetEventId, createdIds);
            addNotification({
              type: "ai",
              message: `Undid AI task extraction for ${targetEvent.name} (deleted ${createdIds.length} tasks)`,
            });
            setToastData({
              message: `Undone: Removed ${createdIds.length} task(s) from "${targetEvent.name}"`,
              type: "info",
            });
          },
        },
      });
    } catch (err) {
      console.error("Failed to commit tasks to event board:", err);
      setErrorMsg(`Could not create tasks: ${err.message}`);
    } finally {
      setIsCommitting(false);
      setProcessing(false);
      setChooseBoardModalOpen(false);
    }
  };

  // Process with live Gemini AI (or intelligent fallback)
  // Process tasks with missing details check
  const processExtractedTasksWithDetailsCheck = async (extracted) => {
    // 1. Check if user explicitly set a target board
    const explicitTarget = targetPreference !== "auto" ? targetPreference : null;
    const detectedEvent = detectEventFromTranscript(notes, events);
    const resolvedEvent = explicitTarget
      ? events.find((e) => e.id === explicitTarget)
      : detectedEvent;

    // 2. Run missing details analysis
    const analysis = detectMissingTranscriptDetails(notes, extracted, events);

    // If event is already resolved, don't flag event as missing
    if (resolvedEvent) {
      analysis.missingEvent = false;
      analysis.missingDetailsList = analysis.missingDetailsList.filter(
        (item) => item.type !== "event"
      );
      analysis.hasMissing = analysis.missingDetailsList.length > 0;
    }

    // Prompt user if ANY specific operational detail is missing
    if (analysis.hasMissing || !resolvedEvent) {
      setMissingDetailsAnalysis(analysis);
      setEditableTasks(
        extracted.map((t, idx) => ({
          id: `task-preview-${idx}`,
          title: t.title || "Untitled Task",
          assignee: t.assignee || "",
          dueDate: t.dueDate || "",
          priority: t.priority || "medium",
          wasAssigneeMissing: !t.assignee || t.assignee.trim() === "",
          wasDueDateMissing: !t.dueDate,
        }))
      );
      setModalSelectedEventId(
        resolvedEvent ? resolvedEvent.id : (events[0]?.id || "hackgenesis-2026")
      );
      setMissingDetailsModalOpen(true);
      setProcessing(false);
    } else {
      // Transcript is comprehensive and specifies all details! Commit directly.
      await commitTasksToEventBoard(resolvedEvent.id, extracted);
    }
  };

  // Process with live Gemini AI
  const handleProcessAI = async () => {
    if (!notes.trim()) {
      setErrorMsg("Please paste or record meeting notes first.");
      return;
    }

    setProcessing(true);
    setErrorMsg("");
    setShowDemoOption(false);

    try {
      const extracted = await extractTasksFromNotes(notes);
      await processExtractedTasksWithDetailsCheck(extracted);
    } catch (err) {
      console.error("AI extraction error:", err);
      const friendly = formatGeminiError(err);
      setErrorMsg(friendly.message);
      if (
        friendly.message.includes("VITE_GEMINI_API_KEY") ||
        friendly.message.includes("API key")
      ) {
        setShowDemoOption(true);
      }
    } finally {
      setProcessing(false);
    }
  };

  // Demo fallback action for testing when key is missing
  const handleProcessDemoMock = async () => {
    setProcessing(true);
    setErrorMsg("");
    setShowDemoOption(false);
    try {
      await processExtractedTasksWithDetailsCheck(DEMO_EXTRACTED_TASKS);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // Commit from the Missing Details Prompt Modal
  const handleConfirmFromModal = async () => {
    const tasksToCommit = editableTasks.map((t) => ({
      title: t.title,
      assignee: t.assignee.trim(),
      dueDate: t.dueDate || null,
      priority: t.priority,
    }));
    await commitTasksToEventBoard(modalSelectedEventId, tasksToCommit);
    setMissingDetailsModalOpen(false);
  };

  return (
    <>
      <Card
        headerContent={
          <span className="flex items-center justify-between w-full">
            <span className="flex items-center gap-2">
              <Brain size={16} strokeWidth={3} />
              Club Intelligence
            </span>
            <Badge color="muted" className="!text-[9px] !px-2 !py-0 !border-2">
              POWERED BY AI
            </Badge>
          </span>
        }
        headerColor="bg-neo-muted"
      >
        <div className="space-y-3">
          {/* Controls Bar: Sample button + Language toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setNotes(SAMPLE_TRANSCRIPT);
                setErrorMsg("");
              }}
              className="text-[11px] font-black uppercase text-neo-ink bg-neo-secondary border-2 border-neo-ink px-2.5 py-1 shadow-[2px_2px_0_#000] hover:shadow-neo-sm transition-all duration-100 ease-linear active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer flex items-center gap-1"
            >
              <FileText size={12} strokeWidth={3} />
              Try sample transcript
            </button>

            {/* Language toggle for Speech */}
            {isSpeechSupported && (
              <button
                type="button"
                onClick={() =>
                  setSpeechLang((prev) => (prev === "en-IN" ? "hi-IN" : "en-IN"))
                }
                title="Switch voice input language (English / Hindi)"
                className="text-[10px] font-black uppercase tracking-wider bg-neo-white border-2 border-neo-ink px-2 py-1 shadow-[1px_1px_0_#000] hover:bg-neo-bg cursor-pointer flex items-center gap-1"
              >
                <Globe size={11} strokeWidth={3} />
                {speechLang === "en-IN" ? "EN-IN (Indian)" : "HI-IN (Hindi)"}
              </button>
            )}
          </div>

          {/* Destination Board Selector */}
          <div className="flex items-center justify-between gap-2 bg-neo-white border-2 border-neo-ink p-1.5 shadow-[2px_2px_0_#000]">
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-neo-ink">
              <Layers size={13} strokeWidth={3} className="text-neo-ink" />
              <span>Target:</span>
            </span>
            <select
              value={targetPreference}
              onChange={(e) => setTargetPreference(e.target.value)}
              className="h-6 px-1.5 border border-neo-ink bg-neo-bg font-black text-[10px] uppercase tracking-wide focus:outline-none cursor-pointer"
            >
              <option value="auto">Auto-Detect / Ask Me</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
          </div>

          {/* Textarea for transcript or notes */}
          <div className="relative">
            <Textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Paste meeting standup notes or record voice transcript to automatically parse into Kanban tasks..."
              className="!text-xs leading-relaxed"
            />

            {/* Interim voice recognition overlay */}
            {interimText && (
              <div className="mt-1 px-2 py-1 bg-neo-secondary/30 border-2 border-neo-ink text-[10px] font-bold text-neo-ink animate-pulse flex items-center gap-1">
                <span className="w-2 h-2 bg-neo-accent rounded-full animate-ping" />
                <span className="truncate">Hearing: "{interimText}"</span>
              </div>
            )}
          </div>

          {/* Voice Input Button & Fallback Notice */}
          <div className="flex items-center gap-2">
            {isSpeechSupported ? (
              <button
                type="button"
                onClick={toggleRecording}
                className={[
                  "flex-1 h-10 border-3 border-neo-ink font-black text-xs uppercase tracking-wider",
                  "flex items-center justify-center gap-2 cursor-pointer shadow-neo-sm hover:shadow-neo",
                  "transition-all duration-100 ease-linear active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
                  isRecording
                    ? "bg-neo-accent text-neo-white animate-pulse"
                    : "bg-neo-white text-neo-ink hover:bg-neo-bg",
                ].join(" ")}
              >
                {isRecording ? (
                  <>
                    <MicOff size={16} strokeWidth={3} />
                    <span>Stop Recording</span>
                  </>
                ) : (
                  <>
                    <Mic size={16} strokeWidth={3} />
                    <span>Voice Input ({speechLang})</span>
                  </>
                )}
              </button>
            ) : (
              <div className="flex-1 p-2 bg-neo-bg border-2 border-neo-ink text-[10px] font-bold text-neo-ink/60 text-center uppercase">
                Voice input supported in Google Chrome
              </div>
            )}
          </div>

          {/* Primary Action Button: PROCESS WITH AI */}
          <Button
            variant="primary"
            size="md"
            onClick={handleProcessAI}
            disabled={processing || !notes.trim()}
            className="w-full !h-12 !text-sm tracking-wider"
          >
            {processing ? (
              <>
                <RefreshCw size={16} strokeWidth={3} className="animate-spin" />
                <span>EXTRACTING TASKS WITH AI...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} strokeWidth={3} />
                <span>PROCESS WITH AI</span>
              </>
            )}
          </Button>

          {/* Error Banner with Optional Demo Fallback Button */}
          {errorMsg && (
            <div className="p-3 bg-neo-accent/20 border-3 border-neo-accent space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle
                  size={16}
                  strokeWidth={3}
                  className="text-neo-accent shrink-0 mt-0.5"
                />
                <p className="font-bold text-xs text-neo-ink leading-tight">
                  {errorMsg}
                </p>
              </div>

              {showDemoOption && (
                <div className="pt-2 border-t border-neo-accent/30 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-neo-ink/70 uppercase">
                    Testing without Gemini key?
                  </span>
                  <button
                    type="button"
                    onClick={handleProcessDemoMock}
                    className="text-[10px] font-black uppercase bg-neo-secondary border-2 border-neo-ink px-2 py-0.5 cursor-pointer shadow-[1px_1px_0_#000]"
                  >
                    Parse as Demo Sample
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* ─── Modal: Missing Transcript Details Prompt ─── */}
      <Modal
        isOpen={missingDetailsModalOpen}
        onClose={() => {
          if (!isCommitting) {
            setMissingDetailsModalOpen(false);
            setEditableTasks([]);
            setProcessing(false);
          }
        }}
        title="⚠️ Missing Details in Transcript Detected"
        size="lg"
      >
        <div className="space-y-4">
          {/* Missing details breakdown banner */}
          <div className="p-3.5 bg-[#FFF9D2] border-3 border-neo-ink space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} strokeWidth={3} className="text-neo-ink shrink-0" />
              <span className="font-black text-xs uppercase tracking-wider text-neo-ink">
                Please provide or confirm the following missing operational details:
              </span>
            </div>
            <ul className="space-y-1 pl-6 list-disc text-xs font-bold text-neo-ink/90">
              {missingDetailsAnalysis?.missingEvent && (
                <li>
                  <span className="text-red-700 font-black">Target Event Board:</span> The transcript did not specify which event these tasks belong to.
                </li>
              )}
              {missingDetailsAnalysis?.unassignedTasks?.length > 0 && (
                <li>
                  <span className="text-amber-800 font-black">Unassigned Tasks:</span> {missingDetailsAnalysis.unassignedTasks.length} task(s) do not have an assigned person or volunteer.
                </li>
              )}
              {missingDetailsAnalysis?.missingTimingTasks?.length > 0 && (
                <li>
                  <span className="text-amber-800 font-black">Missing Deadlines:</span> {missingDetailsAnalysis.missingTimingTasks.length} task(s) do not have a due date or timing mentioned.
                </li>
              )}
            </ul>
          </div>

          {/* Selectable Event Taskboards */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-neo-ink">
                1. Destination Event Board:
              </label>
              {missingDetailsAnalysis?.missingEvent ? (
                <span className="text-[10px] font-black uppercase text-red-600 bg-neo-white px-1.5 py-0.5 border border-neo-ink">
                  Required Choice
                </span>
              ) : (
                <span className="text-[10px] font-black uppercase text-emerald-700 bg-neo-white px-1.5 py-0.5 border border-neo-ink">
                  Detected / Selected
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {events.map((ev) => {
                const isSelected = modalSelectedEventId === ev.id;
                return (
                  <button
                    type="button"
                    key={ev.id}
                    onClick={() => setModalSelectedEventId(ev.id)}
                    className={[
                      "p-2.5 text-left border-3 border-neo-ink transition-all cursor-pointer flex flex-col justify-between",
                      isSelected
                        ? "bg-neo-secondary shadow-neo-sm font-black translate-x-[1px] translate-y-[1px]"
                        : "bg-neo-white hover:bg-neo-bg shadow-[2px_2px_0_#000]",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-1 w-full mb-1">
                      <span className="text-xs font-black truncate">{ev.name}</span>
                      {isSelected && <Check size={14} strokeWidth={3} className="shrink-0" />}
                    </div>
                    <span className="text-[10px] font-bold text-neo-ink/70 uppercase truncate">
                      {ev.tagline || ev.category}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Inline Tasks Editor for Missing Fields */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-neo-ink">
                2. Review Tasks & Fill Missing Details ({editableTasks.length}):
              </label>
              <span className="text-[10px] font-bold text-neo-ink/70">
                Highlighted fields were missing from notes
              </span>
            </div>

            <div className="border-3 border-neo-ink bg-neo-bg/40 p-2.5 max-h-60 overflow-y-auto space-y-2">
              {editableTasks.map((task, idx) => (
                <div
                  key={task.id}
                  className="bg-neo-white border-2 border-neo-ink p-2.5 shadow-[2px_2px_0_#000] space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <input
                      type="text"
                      value={task.title}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditableTasks((prev) =>
                          prev.map((t, i) => (i === idx ? { ...t, title: val } : t))
                        );
                      }}
                      className="font-black text-xs text-neo-ink bg-transparent border-b-2 border-neo-ink/30 focus:border-neo-ink outline-none flex-1 pb-0.5"
                    />
                    <select
                      value={task.priority}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditableTasks((prev) =>
                          prev.map((t, i) => (i === idx ? { ...t, priority: val } : t))
                        );
                      }}
                      className="text-[10px] font-black border border-neo-ink bg-neo-bg px-1 py-0.5"
                    >
                      <option value="low">LOW</option>
                      <option value="medium">MEDIUM</option>
                      <option value="high">HIGH</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {/* Assignee Input */}
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-bold uppercase text-neo-ink/70">
                          Assignee:
                        </span>
                        {task.wasAssigneeMissing && !task.assignee && (
                          <span className="text-[9px] font-black uppercase text-amber-800 bg-amber-100 px-1 border border-amber-400">
                            Missing in Notes
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. Arjun, Priya, Core Team"
                        value={task.assignee}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditableTasks((prev) =>
                            prev.map((t, i) => (i === idx ? { ...t, assignee: val } : t))
                          );
                        }}
                        className={[
                          "w-full px-2 py-1 text-xs font-bold border-2 outline-none",
                          task.wasAssigneeMissing && !task.assignee
                            ? "border-amber-500 bg-amber-50/50"
                            : "border-neo-ink bg-neo-white",
                        ].join(" ")}
                      />
                    </div>

                    {/* Due Date Input */}
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] font-bold uppercase text-neo-ink/70">
                          Due Date:
                        </span>
                        {task.wasDueDateMissing && !task.dueDate && (
                          <span className="text-[9px] font-black uppercase text-amber-800 bg-amber-100 px-1 border border-amber-400">
                            Missing in Notes
                          </span>
                        )}
                      </div>
                      <input
                        type="date"
                        value={task.dueDate}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditableTasks((prev) =>
                            prev.map((t, i) => (i === idx ? { ...t, dueDate: val } : t))
                          );
                        }}
                        className={[
                          "w-full px-2 py-1 text-xs font-bold border-2 outline-none",
                          task.wasDueDateMissing && !task.dueDate
                            ? "border-amber-500 bg-amber-50/50"
                            : "border-neo-ink bg-neo-white",
                        ].join(" ")}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t-2 border-neo-ink/20">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isCommitting}
              onClick={() => {
                setMissingDetailsModalOpen(false);
                setEditableTasks([]);
                setProcessing(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isCommitting}
              onClick={handleConfirmFromModal}
              className="!text-xs"
            >
              <Plus size={16} strokeWidth={3} />
              {isCommitting ? "Creating Tasks..." : "Apply Details & Create Tasks"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Floating Toast with Undo Action */}
      {toastData && (
        <Toast
          message={toastData.message}
          type={toastData.type}
          action={toastData.action}
          duration={8000}
          onClose={() => setToastData(null)}
        />
      )}
    </>
  );
}
