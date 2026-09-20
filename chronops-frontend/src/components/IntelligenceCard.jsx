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
  UploadCloud,
  FolderPlus,
  MapPin,
  Clock,
  X,
} from "lucide-react";
import { Card, Badge, Textarea, Toast, Modal } from "./ui";
import Button from "./ui/Button";
import {
  useTasks,
  addTasksBatchToEvent,
  deleteTasksBatchFromEvent,
} from "../hooks/useTasks";
import { useNotifications } from "../hooks/useNotifications";
import {
  extractTasksFromNotes,
  formatGeminiError,
  detectMissingTranscriptDetails,
  reframeTranscriptWithAI,
} from "../services/gemini";
import { setSessionsBatchForEvent } from "../hooks/useSessions";
import { INITIAL_EVENTS } from "../data/multiEvents";
import {
  getStoredEvents,
  saveStoredEvents,
  saveActiveEventId,
  getActiveUserEmail,
} from "../lib/storage";

const DEMO_EVENT_IDS = ["chronops-summit-2026", "ai-summit-2026", "club-orientation-2026"];

const SAMPLE_TRANSCRIPT = `Operations Standup:
1. Dr. Ananya Mukherjee will deliver the Keynote on Next-Gen Autonomous AI Agents at 09:30 in the Main Auditorium.
2. Arjun, finalize the technical track judging rubric with lead mentors by September 21st at 09:00. High priority.
3. Priya, coordinate with the auditorium AV team for live multi-camera streaming before 10:00.
4. We need 15 heavy-duty extension power strips for the hacking arena in Hall B. Someone needs to purchase these urgently.
5. Meera, send confirmation emails and dietary requirement forms to all keynote speakers by September 20th.
6. Setup the Discord bot verification channel for summit participants.`;

export default function IntelligenceCard() {
  const { addNotification } = useNotifications();

  // Load available events list with auto-sync
  const [events, setEvents] = useState(() => getStoredEvents());

  useEffect(() => {
    const handleEventsUpdate = () => {
      setEvents(getStoredEvents());
    };
    window.addEventListener("clubops-data-updated", handleEventsUpdate);
    return () =>
      window.removeEventListener("clubops-data-updated", handleEventsUpdate);
  }, []);

  const [notes, setNotes] = useState("");
  const [uploadedFileInfo, setUploadedFileInfo] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showDemoOption, setShowDemoOption] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const fileInputRef = useRef(null);

  // AI Reframing & Event Creation Prompt Modal State
  const [reframedData, setReframedData] = useState(null);
  const [reframeModalOpen, setReframeModalOpen] = useState(false);
  const [confirmChoice, setConfirmChoice] = useState("create_new"); // "create_new" | "add_to_existing"
  const [selectedExistingEventId, setSelectedExistingEventId] = useState(
    events[0]?.id || "chronops-summit-2026"
  );
  const [reframeForm, setReframeForm] = useState({
    name: "",
    category: "Flagship Hackathon",
    tagline: "",
    date: "",
    location: "",
  });

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

  // Robust File Processor for text, markdown, json, csv transcripts
  const processSelectedFile = (file) => {
    if (!file) return;

    // Check size limit (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg(`File is too large (${Math.round(file.size / 1024 / 1024)}MB). Please choose a file smaller than 10MB.`);
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        let text = event.target?.result;
        if (typeof text !== "string") {
          text = text ? new TextDecoder("utf-8").decode(text) : "";
        }
        // Strip BOM if present
        if (text && text.charCodeAt(0) === 0xfeff) {
          text = text.slice(1);
        }

        const cleanText = (text || "").trim();
        if (!cleanText) {
          setErrorMsg(`The file "${file.name}" contains no readable text or is empty.`);
          return;
        }

        setNotes(cleanText);
        setUploadedFileInfo({
          name: file.name,
          chars: cleanText.length,
          sizeKb: Math.max(1, Math.round(file.size / 1024)),
        });
        setErrorMsg("");
        addNotification({
          message: `Loaded "${file.name}" (${cleanText.length} characters). Click 'Process with AI' to analyze!`,
          type: "action",
        });
      } catch (err) {
        console.error("Error decoding file contents:", err);
        setErrorMsg(`Failed to parse "${file.name}": ${err.message}`);
      }
    };

    reader.onerror = (err) => {
      console.error("FileReader error:", err);
      setErrorMsg(`Could not read "${file.name}". Please ensure it is a valid text file.`);
    };

    reader.readAsText(file, "UTF-8");
  };

  // Handle Transcript File Upload via input
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  // Main AI Processing Function: Actually calls AI, then opens confirmation prompt modal
  const handleProcessAI = async () => {
    if (!notes.trim()) {
      setErrorMsg("Please enter, upload, or record a transcript or meeting notes first.");
      return;
    }

    setProcessing(true);
    setErrorMsg("");
    setShowDemoOption(false);

    try {
      // 1. AI actually processes the transcript into structured event, sessions, tasks
      const result = await reframeTranscriptWithAI(notes);
      setReframedData(result);

      // 2. Prepopulate confirmation prompt form strictly with details from transcript (never invent details)
      setReframeForm({
        name: result.suggestedName || "",
        category: result.category || "Other",
        tagline: result.tagline || "",
        date: result.date || "", // Empty if missing from transcript
        location: (result.location && !/^(tbd|unknown|none|n\/a|null|undefined)$/i.test(result.location.trim())) ? result.location.trim() : "", // Empty if missing from transcript
      });

      // 3. Set default choice and open explicit confirmation prompt modal
      setConfirmChoice("create_new");
      setSelectedExistingEventId(events[0]?.id || "chronops-summit-2026");
      setReframeModalOpen(true);
    } catch (err) {
      console.error("AI transcript processing error:", err);
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

  // Explicit action 1: User confirms creating a new event board from the prompt modal
  const handleConfirmCreateNewEvent = async () => {
    if (!reframedData) return;
    setIsCommitting(true);

    try {
      const newEventId =
        reframeForm.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "") + `-${Date.now().toString(36).slice(-4)}`;

      const newEvent = {
        id: newEventId,
        ownerEmail: getActiveUserEmail(),
        name: reframeForm.name.trim(),
        category: reframeForm.category,
        tagline: reframeForm.tagline.trim(),
        date: reframeForm.date,
        location: reframeForm.location.trim(),
        status: "active",
        color: "accent",
      };

      // 1. Save new event to user-scoped storage
      const existingEvents = getStoredEvents();
      const updatedEvents = [newEvent, ...existingEvents];
      saveStoredEvents(updatedEvents);

      // Make this the active event in LiveFlowView
      saveActiveEventId(newEventId);

      // 2. Add extracted tasks to this board
      const tasksCount = reframedData.tasks?.length || 0;
      if (tasksCount > 0) {
        await addTasksBatchToEvent(newEventId, reframedData.tasks);
      }

      // 3. Add extracted sessions to this board
      const sessionsCount = reframedData.sessions?.length || 0;
      if (sessionsCount > 0) {
        await setSessionsBatchForEvent(newEventId, reframedData.sessions);
      }

      // 4. Notify & trigger live re-renders across the app
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("clubops-data-updated"));
      }

      addNotification({
        message: `Event "${newEvent.name}" created with ${sessionsCount} sessions and ${tasksCount} tasks!`,
        type: "ai",
      });

      setToastData({
        message: `🎉 Event "${newEvent.name}" successfully created with ${sessionsCount} sessions and ${tasksCount} tasks!`,
        type: "success",
      });

      // Clean up modal & input
      setReframeModalOpen(false);
      setNotes("");
      setUploadedFileInfo(null);
    } catch (err) {
      console.error("Failed to create board from transcript:", err);
      setErrorMsg(`Failed to create event: ${err.message}`);
    } finally {
      setIsCommitting(false);
    }
  };

  // Explicit action 2: User confirms adding extracted tasks to an existing board
  const handleConfirmAddToExistingEvent = async () => {
    if (!reframedData) return;
    setIsCommitting(true);

    try {
      const targetEvent =
        events.find((e) => e.id === selectedExistingEventId) || {
          name: "Selected Event",
          id: selectedExistingEventId,
        };

      const tasksToCreate = reframedData.tasks || [];
      const created = await addTasksBatchToEvent(
        selectedExistingEventId,
        tasksToCreate
      );

      // Make this target event active
      saveActiveEventId(selectedExistingEventId);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("clubops-data-updated"));
      }

      addNotification({
        message: `Added ${created.length} AI-extracted tasks into "${targetEvent.name}" Backlog`,
        type: "ai",
      });

      setToastData({
        message: `✅ Successfully added ${created.length} task(s) to "${targetEvent.name}"`,
        type: "success",
      });

      setReframeModalOpen(false);
      setNotes("");
      setUploadedFileInfo(null);
    } catch (err) {
      console.error("Failed to add tasks to existing board:", err);
      setErrorMsg(`Failed to add tasks: ${err.message}`);
    } finally {
      setIsCommitting(false);
    }
  };

  // Explicit action 3: User explicitly cancels in the prompt modal
  const handleCancelPrompt = () => {
    setReframeModalOpen(false);
    setToastData({
      message: "Event creation was cancelled. No event or tasks were created.",
      type: "info",
    });
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
          {/* Clean Top Action Bar: Sample • Upload • Language */}
          <div className="flex items-center justify-between text-xs font-semibold text-neo-ink/70">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setNotes(SAMPLE_TRANSCRIPT);
                  setUploadedFileInfo(null);
                  setErrorMsg("");
                }}
                className="text-[11px] font-bold text-neo-ink hover:text-neo-accent hover:underline flex items-center gap-1 cursor-pointer"
              >
                <FileText size={12} strokeWidth={2.5} />
                Try sample
              </button>

              <span className="text-neo-ink/30">•</span>

              <input
                type="file"
                ref={fileInputRef}
                accept=".txt,.md,.json,.csv,.text,text/plain,text/markdown,text/csv,application/json"
                className="hidden"
                onClick={(e) => {
                  e.target.value = "";
                }}
                onChange={handleFileUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-[11px] font-bold text-neo-ink hover:text-neo-accent hover:underline flex items-center gap-1 cursor-pointer"
              >
                <UploadCloud size={12} strokeWidth={2.5} />
                Upload file
              </button>
            </div>

            {isSpeechSupported && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={[
                    "text-[11px] font-bold px-2 py-0.5 border-2 border-neo-ink flex items-center gap-1 cursor-pointer transition-all shadow-[1px_1px_0_#000]",
                    isRecording
                      ? "bg-neo-accent text-neo-white animate-pulse"
                      : "bg-neo-white text-neo-ink hover:bg-neo-secondary",
                  ].join(" ")}
                  title={isRecording ? "Stop recording" : `Voice input (${speechLang})`}
                >
                  {isRecording ? <MicOff size={12} strokeWidth={2.5} /> : <Mic size={12} strokeWidth={2.5} />}
                  <span>{isRecording ? "Listening..." : "Dictate"}</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setSpeechLang((prev) => (prev === "en-IN" ? "hi-IN" : "en-IN"))
                  }
                  title="Switch voice language"
                  className="text-[11px] font-bold text-neo-ink/70 hover:text-neo-ink flex items-center gap-1 cursor-pointer"
                >
                  <Globe size={11} strokeWidth={2.5} />
                  {speechLang === "en-IN" ? "EN" : "HI"}
                </button>
              </div>
            )}
          </div>

          {/* Uploaded File Pill (if active) */}
          {uploadedFileInfo && (
            <div className="flex items-center justify-between px-3 py-2 bg-neo-secondary/30 border-2 border-neo-ink text-xs font-bold text-neo-ink shadow-[2px_2px_0_#000]">
              <span className="flex items-center gap-2 truncate">
                <FileText size={15} strokeWidth={2.5} className="text-neo-accent shrink-0" />
                <span className="truncate">
                  File: <strong className="underline">{uploadedFileInfo.name}</strong> ({uploadedFileInfo.chars} chars • {uploadedFileInfo.sizeKb} KB)
                </span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setUploadedFileInfo(null);
                  setNotes("");
                }}
                className="text-[10px] font-black uppercase bg-neo-white text-neo-accent px-2 py-0.5 border border-neo-ink hover:bg-neo-accent hover:text-neo-white transition-all shrink-0 ml-2 cursor-pointer shadow-[1px_1px_0_#000]"
                title="Clear uploaded file"
              >
                Clear
              </button>
            </div>
          )}

          {/* Transcript Textarea with Drag and Drop Support */}
          <div
            className={`transition-all ${
              isDragging ? "ring-4 ring-neo-accent" : ""
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(true);
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(false);
              const droppedFile = e.dataTransfer.files?.[0];
              if (droppedFile) {
                processSelectedFile(droppedFile);
              }
            }}
          >
            {/* Dedicated relative wrapper for Textarea + mic button to keep position strictly locked */}
            <div className="relative">
              {isDragging && (
                <div className="absolute inset-0 bg-neo-secondary/95 border-4 border-dashed border-neo-ink z-20 flex flex-col items-center justify-center p-4 pointer-events-none">
                  <UploadCloud size={36} strokeWidth={3} className="text-neo-ink animate-bounce" />
                  <span className="font-black text-sm uppercase text-neo-ink mt-2">
                    Drop text file to load transcript
                  </span>
                </div>
              )}

              <Textarea
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Paste standup notes or transcript. AI will extract event details, sessions, and tasks, then prompt to create the event..."
                className="!text-xs leading-relaxed !resize-none !pr-14 !pb-12"
              />

              {/* Voice Input Trigger Icon strictly locked to textarea inner bottom-right */}
              {isSpeechSupported && (
                <button
                  type="button"
                  onClick={toggleRecording}
                  className={[
                    "absolute right-3.5 bottom-3.5 z-10 w-8 h-8 flex items-center justify-center border-2 border-neo-ink cursor-pointer transition-all",
                    isRecording
                      ? "bg-neo-accent text-neo-white animate-pulse shadow-[2px_2px_0_#000]"
                      : "bg-neo-white text-neo-ink hover:bg-neo-secondary shadow-[2px_2px_0_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
                  ].join(" ")}
                  title={isRecording ? "Stop recording" : `Voice dictation (${speechLang})`}
                  aria-label={isRecording ? "Stop voice dictation" : "Start voice dictation"}
                >
                  {isRecording ? <MicOff size={15} strokeWidth={2.5} /> : <Mic size={15} strokeWidth={2.5} />}
                </button>
              )}
            </div>

            {/* Live speech feedback pill rendered cleanly below the textarea without displacing the mic */}
            {interimText && (
              <div className="mt-1.5 px-3 py-1.5 bg-amber-50 border-2 border-neo-ink text-xs font-bold text-neo-ink animate-pulse flex items-center gap-2 shadow-[2px_2px_0_#000]">
                <span className="w-2 h-2 bg-neo-accent rounded-full animate-ping shrink-0" />
                <span className="truncate">Listening: "{interimText}"</span>
              </div>
            )}
          </div>

          {/* Action: Process Transcript with AI */}
          <div>
            <Button
              variant="primary"
              size="md"
              onClick={handleProcessAI}
              disabled={processing || !notes.trim()}
              className="w-full !h-11 !text-xs font-bold"
            >
              {processing ? (
                <>
                  <RefreshCw size={14} strokeWidth={2.5} className="animate-spin" />
                  <span>AI Analyzing Transcript...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} strokeWidth={2.5} />
                  <span>Process with AI</span>
                </>
              )}
            </Button>
          </div>

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
                    API Unavailable?
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setNotes(SAMPLE_TRANSCRIPT);
                      handleProcessAI();
                    }}
                    className="text-[10px] font-black uppercase bg-neo-secondary border-2 border-neo-ink px-2 py-0.5 cursor-pointer shadow-[1px_1px_0_#000]"
                  >
                    Retry with Demo Sample
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* ─── Modal: AI Transcript Analysis & Event Creation Prompt ─── */}
      <Modal
        open={reframeModalOpen}
        onClose={() => {
          if (!isCommitting) {
            handleCancelPrompt();
          }
        }}
        title="✨ AI Transcript Analysis: Event Confirmation"
        size="lg"
      >
        <div className="space-y-4">
          {/* Explicit Confirmation Prompt Banner */}
          <div className="p-3.5 bg-neo-secondary/40 border-3 border-neo-ink space-y-1 shadow-[2px_2px_0_#000]">
            <div className="flex items-center gap-2">
              <Sparkles size={16} strokeWidth={3} className="text-neo-ink" />
              <span className="font-black text-xs uppercase tracking-wide text-neo-ink">
                AI Analysis Complete
              </span>
            </div>
            <p className="text-xs font-bold text-neo-ink leading-relaxed">
              AI has analyzed your transcript and extracted the event schedule and tasks below.
              <strong> Would you like to create a new Event from this transcript, or add tasks to an existing event?</strong>
            </p>
          </div>

          {/* Choice Selector: Create New Event vs Add to Existing */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setConfirmChoice("create_new")}
              className={`p-2.5 text-center border-3 border-neo-ink text-xs font-black uppercase tracking-wider transition-all cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 select-none ${
                confirmChoice === "create_new"
                  ? "bg-neo-secondary text-neo-ink shadow-[2px_2px_0_#000] translate-x-[1px] translate-y-[1px]"
                  : "bg-neo-white text-neo-ink hover:bg-neo-bg shadow-[2px_2px_0_#000]"
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <FolderPlus size={15} strokeWidth={3} />
                <span>Create New Event Board</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setConfirmChoice("add_to_existing")}
              className={`p-2.5 text-center border-3 border-neo-ink text-xs font-black uppercase tracking-wider transition-all cursor-pointer outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 select-none ${
                confirmChoice === "add_to_existing"
                  ? "bg-neo-secondary text-neo-ink shadow-[2px_2px_0_#000] translate-x-[1px] translate-y-[1px]"
                  : "bg-neo-white text-neo-ink hover:bg-neo-bg shadow-[2px_2px_0_#000]"
              }`}
            >
              <div className="flex items-center justify-center gap-1.5">
                <Layers size={15} strokeWidth={3} />
                <span>Add Tasks to Existing Event</span>
              </div>
            </button>
          </div>

          {/* Missing Details Warning Banner (if any) */}
          {reframedData?.missingDetails && reframedData.missingDetails.length > 0 && (
            <div className="p-2.5 bg-amber-100 border-3 border-neo-ink space-y-1.5">
              <div className="flex items-center gap-1.5">
                <AlertTriangle size={14} strokeWidth={3} className="text-amber-800 shrink-0" />
                <span className="font-black text-xs uppercase tracking-wider text-amber-900">
                  Missing Details:
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {reframedData.missingDetails.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 font-black text-[11px] text-amber-950 uppercase"
                  >
                    <span className="text-amber-800 font-black">•</span>
                    <span>{item}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* CHOICE 1: Create New Event Form & Details */}
          {confirmChoice === "create_new" ? (
            <div className="space-y-3 pt-1">
              <h4 className="font-black text-xs uppercase tracking-wider text-neo-ink flex items-center gap-1.5">
                <Sparkles size={14} strokeWidth={3} className="text-neo-secondary" />
                1. Event Details (from Transcript):
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-black uppercase text-neo-ink/70 mb-0.5">
                    Event Name <span className="text-red-600 font-bold text-xs">*</span>
                  </label>
                  <input
                    type="text"
                    value={reframeForm.name}
                    onChange={(e) =>
                      setReframeForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className={[
                      "w-full px-2 py-1.5 text-xs font-black border-2 bg-neo-white outline-none focus:bg-amber-50 transition-colors",
                      !reframeForm.name ? "border-red-500" : "border-neo-ink",
                    ].join(" ")}
                    placeholder="Enter event name (e.g. Leadership Summit)..."
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-neo-ink/70 mb-0.5">
                    Category
                  </label>
                  <select
                    value={reframeForm.category}
                    onChange={(e) =>
                      setReframeForm((prev) => ({ ...prev, category: e.target.value }))
                    }
                    className="w-full px-2 py-1.5 text-xs font-bold border-2 border-neo-ink bg-neo-white outline-none"
                  >
                    <option value="Flagship Hackathon">Flagship Hackathon</option>
                    <option value="Technical Workshop">Technical Workshop</option>
                    <option value="Keynote Conference">Keynote Conference</option>
                    <option value="Orientation & Recruiting">Orientation & Recruiting</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-neo-ink/70 mb-0.5">
                    Tagline / Subtitle
                  </label>
                  <input
                    type="text"
                    value={reframeForm.tagline}
                    onChange={(e) =>
                      setReframeForm((prev) => ({ ...prev, tagline: e.target.value }))
                    }
                    className="w-full px-2 py-1.5 text-xs font-bold border-2 border-neo-ink bg-neo-white outline-none"
                    placeholder="Optional subtitle or tagline"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-neo-ink/70 mb-0.5">
                    Event Date <span className="text-red-600 font-bold text-xs">*</span>
                  </label>
                  <input
                    type="date"
                    value={reframeForm.date || ""}
                    onChange={(e) =>
                      setReframeForm((prev) => ({ ...prev, date: e.target.value }))
                    }
                    className={[
                      "w-full px-2 py-1.5 text-xs font-bold border-2 outline-none transition-colors",
                      !reframeForm.date
                        ? "border-red-500 bg-neo-white focus:bg-red-50/40"
                        : "border-neo-ink bg-neo-white",
                    ].join(" ")}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-neo-ink/70 mb-0.5">
                    Venue / Location <span className="text-red-600 font-bold text-xs">*</span>
                  </label>
                  <input
                    type="text"
                    value={reframeForm.location || ""}
                    onChange={(e) =>
                      setReframeForm((prev) => ({ ...prev, location: e.target.value }))
                    }
                    placeholder="Enter venue or location..."
                    className={[
                      "w-full px-2 py-1.5 text-xs font-bold border-2 outline-none transition-colors",
                      !reframeForm.location
                        ? "border-red-500 bg-neo-white focus:bg-red-50/40"
                        : "border-neo-ink bg-neo-white",
                    ].join(" ")}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* CHOICE 2: Target Existing Event Board */
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-black uppercase tracking-wider text-neo-ink">
                Select Destination Event Board:
              </label>
              <div
                className={[
                  "grid gap-2.5",
                  events.length === 1
                    ? "grid-cols-1 max-w-md"
                    : events.length === 2
                    ? "grid-cols-1 sm:grid-cols-2"
                    : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3",
                ].join(" ")}
              >
                {events.map((ev) => {
                  const isSelected = selectedExistingEventId === ev.id;
                  return (
                    <button
                      type="button"
                      key={ev.id}
                      onClick={() => setSelectedExistingEventId(ev.id)}
                      className={[
                        "p-3 text-left border-3 border-neo-ink transition-all cursor-pointer flex flex-col justify-between min-w-0 w-full overflow-hidden",
                        isSelected
                          ? "bg-neo-secondary shadow-neo-sm font-black translate-x-[1px] translate-y-[1px]"
                          : "bg-neo-white hover:bg-neo-bg shadow-[2px_2px_0_#000]",
                      ].join(" ")}
                    >
                      <div className="flex items-center justify-between gap-2 w-full min-w-0 mb-1.5">
                        <span
                          className="text-xs font-black truncate block min-w-0"
                          title={ev.name}
                        >
                          {ev.name}
                        </span>
                        {isSelected && (
                          <Check size={14} strokeWidth={3} className="shrink-0 text-neo-ink" />
                        )}
                      </div>
                      {(ev.tagline || ev.category) && (
                        <span
                          className="block w-full min-w-0 text-[10px] font-bold text-neo-ink/70 uppercase truncate"
                          title={ev.tagline || ev.category}
                        >
                          {ev.tagline || ev.category}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Extracted Stage Sessions preview */}
          {reframedData?.sessions && (
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-neo-ink flex items-center justify-between">
                <span>
                  {confirmChoice === "create_new" ? "2. " : ""}Extracted Live Stage Schedule ({reframedData.sessions.length}):
                </span>
                <span className="text-[10px] text-neo-ink/70 font-bold">
                  {confirmChoice === "create_new" ? "Will populate Live Flow" : "Stage sessions (preview only)"}
                </span>
              </label>
              {reframedData.sessions.length === 0 ? (
                <div className="border-2 border-dashed border-neo-ink/40 bg-neo-bg/30 p-2.5 text-center text-xs font-bold text-neo-ink/60">
                  No schedule or sessions mentioned in transcript.
                </div>
              ) : (
                <div className="border-2 border-neo-ink bg-neo-white max-h-36 overflow-y-auto divide-y divide-neo-ink/15">
                  {reframedData.sessions.map((s, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs font-bold px-3 py-2 hover:bg-neo-bg/30 transition-colors"
                    >
                      <span className="truncate flex-1 text-neo-ink">
                        {s.title} {s.speaker ? `— ${s.speaker}` : ""}
                      </span>
                      <span className="text-[10px] font-black bg-neo-secondary px-2 py-0.5 border border-neo-ink ml-2 shrink-0">
                        {s.startTime || "TBD"} ({s.durationMinutes || 30}m)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* AI Extracted Tasks preview */}
          {reframedData?.tasks && (
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-neo-ink flex items-center justify-between">
                <span>
                  {confirmChoice === "create_new" ? "3. " : ""}Extracted Tasks ({reframedData.tasks.length}):
                </span>
                <span className="text-[10px] text-neo-ink/70 font-bold">
                  Will add to Kanban Backlog
                </span>
              </label>
              {reframedData.tasks.length === 0 ? (
                <div className="border-2 border-dashed border-neo-ink/40 bg-neo-bg/30 p-2.5 text-center text-xs font-bold text-neo-ink/60">
                  No actionable tasks mentioned in transcript. Add tasks below if needed.
                </div>
              ) : (
                <div className="border-2 border-neo-ink bg-neo-white max-h-40 overflow-y-auto divide-y divide-neo-ink/15">
                  {reframedData.tasks.map((t, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs font-bold px-3 py-2 hover:bg-neo-bg/30 transition-colors"
                    >
                      <span className="truncate flex-1 text-neo-ink">{t.title}</span>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {t.assignee && (
                          <span className="text-[10px] font-bold bg-neo-bg px-1.5 py-0.5 border border-neo-ink/40">
                            {t.assignee}
                          </span>
                        )}
                        <span className={[
                          "text-[9px] font-black uppercase px-1.5 py-0.5 border border-neo-ink/40",
                          t.priority === "high" ? "bg-neo-accent text-neo-white" : t.priority === "medium" ? "bg-neo-secondary text-neo-ink" : "bg-neo-muted text-neo-ink",
                        ].join(" ")}>
                          {t.priority}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setReframedData((prev) => ({
                              ...prev,
                              tasks: prev.tasks.filter((_, i) => i !== idx),
                            }));
                          }}
                          className="text-neo-accent hover:text-neo-ink cursor-pointer bg-transparent border-0 p-0.5 ml-0.5"
                          title="Remove task"
                        >
                          <X size={13} strokeWidth={3} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Task Inline Form */}
              <div className="flex items-end gap-1.5 pt-1">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Add a custom task..."
                    id="add-task-title-input"
                    className="w-full px-2 py-1.5 text-xs font-bold border-2 border-neo-ink bg-neo-white outline-none focus:bg-amber-50"
                  />
                </div>
                <div className="w-24">
                  <select
                    id="add-task-priority-input"
                    defaultValue="medium"
                    className="w-full px-1 py-1.5 text-[10px] font-bold uppercase border-2 border-neo-ink bg-neo-white outline-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const titleEl = document.getElementById("add-task-title-input");
                    const priorityEl = document.getElementById("add-task-priority-input");
                    const title = titleEl?.value?.trim();
                    if (!title) return;
                    setReframedData((prev) => ({
                      ...prev,
                      tasks: [
                        ...(prev.tasks || []),
                        {
                          title,
                          assignee: "",
                          dueDate: null,
                          dueTime: null,
                          priority: priorityEl?.value || "medium",
                          status: "backlog",
                        },
                      ],
                    }));
                    if (titleEl) titleEl.value = "";
                  }}
                  className="px-2.5 py-1.5 bg-neo-secondary text-neo-ink border-2 border-neo-ink font-black text-[10px] uppercase flex items-center gap-1 cursor-pointer shadow-[1px_1px_0_#000] active:translate-x-[1px] active:translate-y-[1px] hover:bg-neo-accent hover:text-neo-white"
                >
                  <Plus size={12} strokeWidth={3} />
                  Add
                </button>
              </div>
            </div>
          )}

          {/* Modal Action Buttons: Explicit Decisions */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t-2 border-neo-ink/20">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isCommitting}
              onClick={handleCancelPrompt}
            >
              Cancel / Do Not Create
            </Button>

            {confirmChoice === "create_new" ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={isCommitting || !reframeForm.name.trim()}
                onClick={handleConfirmCreateNewEvent}
                className="!text-xs"
              >
                <FolderPlus size={16} strokeWidth={3} />
                {isCommitting
                  ? "Creating Event..."
                  : "Confirm & Create New Event Board"}
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isCommitting || !selectedExistingEventId}
                onClick={handleConfirmAddToExistingEvent}
                className="!text-xs"
              >
                <Plus size={16} strokeWidth={3} />
                {isCommitting
                  ? "Adding Tasks..."
                  : "Confirm & Add Tasks to Selected Board"}
              </Button>
            )}
          </div>
        </div>
      </Modal>

      {/* Floating Toast with Notifications */}
      {toastData && (
        <Toast
          message={toastData.message}
          type={toastData.type}
          action={toastData.action}
          duration={7000}
          onClose={() => setToastData(null)}
        />
      )}
    </>
  );
}
