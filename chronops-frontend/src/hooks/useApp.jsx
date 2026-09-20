import { createContext, useContext, useState, useCallback } from "react";

const AppContext = createContext(null);

/**
 * App-level state: current mode and global search string.
 */
export function AppProvider({ children }) {
  const [mode, setMode] = useState("operations"); // "operations" | "transcript" | "tasks" | "live"
  const [searchQuery, setSearchQuery] = useState("");

  const goLive = useCallback(() => setMode("live"), []);
  const goOperations = useCallback(() => setMode("operations"), []);
  const goTranscript = useCallback(() => setMode("transcript"), []);
  const goTasks = useCallback(() => setMode("tasks"), []);
  const goVolunteers = useCallback(() => setMode("volunteers"), []);

  return (
    <AppContext.Provider
      value={{
        mode,
        setMode,
        goLive,
        goOperations,
        goTranscript,
        goTasks,
        goVolunteers,
        searchQuery,
        setSearchQuery,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
