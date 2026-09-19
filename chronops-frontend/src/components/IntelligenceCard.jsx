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
import { useNotifications } from "../hooks/useNotifications";
import { extractTasksFromNotes, formatGeminiError } from "../services/gemini";
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

  // Load available events list
  const [events] = useState(() => {
    try {
      const saved = localStorage.getItem(LOCAL_EVENTS_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to load events for IntelligenceCard:", e);
    }
    return INITIAL_EVENTS;
  });

  const [notes, setNotes] = useState("");
  const [targetPreference, setTargetPreference] = useState("auto"); // "auto" or specific eventId
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showDemoOption, setShowDemoOption] = useState(false);

  // Modal state when transcript doesn't know which taskboard to choose
  const [chooseBoardModalOpen, setChooseBoardModalOpen] = useState(false);
  const [pendingExtractedTasks, setPendingExtractedTasks] = useState([]);
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

      // Check if user explicitly chose a destination board beforehand
      if (targetPreference !== "auto") {
        await commitTasksToEventBoard(targetPreference, extracted);
        return;
      }

      // Check if transcript mentions an event
      const detected = detectEventFromTranscript(notes, events);
      if (detected) {
        // Transcript clearly identified which taskboard!
        await commitTasksToEventBoard(detected.id, extracted);
      } else {
        // TRANSCRIPT DOES NOT SPECIFY AN EVENT -> ASK THE USER!
        setPendingExtractedTasks(extracted);
        setModalSelectedEventId(events[0]?.id || "hackgenesis-2026");
        setChooseBoardModalOpen(true);
      }
    } catch (err) {
      console.error("AI extraction error:", err);
      const friendly = formatGeminiError(err);
      setErrorMsg(friendly.message);
      if (friendly.message.includes("VITE_GEMINI_API_KEY")) {
        setShowDemoOption(true);
      }
    } finally {
      setProcessing(false);
    }
  };

  // Demo fallback action for testing when key is missing
  const handleProcessDemoMock = async () => {
    setProcessing(true);
    try {
      if (targetPreference !== "auto") {
        await commitTasksToEventBoard(targetPreference, DEMO_EXTRACTED_TASKS);
      } else {
        const detected = detectEventFromTranscript(notes, events);
        if (detected) {
          await commitTasksToEventBoard(detected.id, DEMO_EXTRACTED_TASKS);
        } else {
          setPendingExtractedTasks(DEMO_EXTRACTED_TASKS);
          setModalSelectedEventId(events[0]?.id || "hackgenesis-2026");
          setChooseBoardModalOpen(true);
        }
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setProcessing(false);
    }
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

      {/* ─── Choose Taskboard Modal (Triggered when transcript does NOT specify an event) ─── */}
      <Modal
        open={chooseBoardModalOpen}
        onClose={() => setChooseBoardModalOpen(false)}
        title="Select Target Event Taskboard"
      >
        <div className="space-y-4">
          {/* Prompt banner */}
          <div className="p-3 bg-neo-secondary/30 border-3 border-neo-ink flex items-start gap-2.5">
            <HelpCircle size={20} strokeWidth={3} className="text-neo-ink shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black uppercase text-neo-ink">
                Event Not Specified in Transcript
              </p>
              <p className="text-xs font-bold text-neo-ink/80 mt-0.5">
                We successfully extracted {pendingExtractedTasks.length} actionable task(s), but the notes didn't mention which event they belong to. Which taskboard should they be added to?
              </p>
            </div>
          </div>

          {/* Preview of extracted tasks */}
          <div className="border-2 border-neo-ink p-3 bg-neo-bg/50 max-h-36 overflow-y-auto space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-neo-ink/60">
              Extracted Tasks Preview ({pendingExtractedTasks.length})
            </span>
            {pendingExtractedTasks.map((t, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs bg-neo-white border border-neo-ink px-2.5 py-1"
              >
                <span className="font-bold text-neo-ink truncate flex-1 mr-2">
                  {t.title}
                </span>
                <Badge
                  color={
                    t.priority === "high"
                      ? "accent"
                      : t.priority === "medium"
                      ? "secondary"
                      : "muted"
                  }
                  className="!text-[9px] !px-1.5 !py-0 !border"
                >
                  {t.priority}
                </Badge>
              </div>
            ))}
          </div>

          {/* Selectable Event Taskboards List */}
          <div className="space-y-2">
            <span className="text-xs font-black uppercase tracking-wider text-neo-ink">
              Choose Destination Taskboard:
            </span>
            <div className="grid grid-cols-1 gap-2">
              {events.map((ev) => {
                const isSelected = modalSelectedEventId === ev.id;
                return (
                  <div
                    key={ev.id}
                    onClick={() => setModalSelectedEventId(ev.id)}
                    className={[
                      "p-3 border-3 border-neo-ink cursor-pointer flex items-center justify-between transition-all duration-100 ease-linear",
                      isSelected
                        ? "bg-neo-secondary shadow-neo-sm translate-x-[2px]"
                        : "bg-neo-white hover:bg-neo-bg shadow-[2px_2px_0_#000]",
                    ].join(" ")}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm uppercase text-neo-ink">
                          {ev.name}
                        </span>
                        <Badge
                          color="muted"
                          className="!text-[9px] !px-1.5 !py-0 !border"
                        >
                          {ev.category}
                        </Badge>
                      </div>
                      <p className="text-[11px] font-bold text-neo-ink/60 uppercase">
                        {ev.tagline || ev.location}
                      </p>
                    </div>

                    <div
                      className={[
                        "w-6 h-6 border-2 border-neo-ink flex items-center justify-center shrink-0",
                        isSelected ? "bg-neo-ink text-neo-white" : "bg-neo-white",
                      ].join(" ")}
                    >
                      {isSelected && <Check size={14} strokeWidth={3} />}
                    </div>
                  </div>
                );
              })}
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
                setChooseBoardModalOpen(false);
                setPendingExtractedTasks([]);
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
              onClick={() =>
                commitTasksToEventBoard(modalSelectedEventId, pendingExtractedTasks)
              }
              className="!text-xs"
            >
              <Plus size={16} strokeWidth={3} />
              {isCommitting ? "Adding Tasks..." : "Confirm & Add Tasks"}
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
