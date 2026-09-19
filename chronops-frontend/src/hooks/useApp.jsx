import { createContext, useContext, useState, useCallback } from "react";

const AppContext = createContext(null);

/**
 * App-level state: current mode and global search string.
 */
export function AppProvider({ children }) {
  const [mode, setMode] = useState("operations"); // "operations" | "tasks" | "live"
  const [searchQuery, setSearchQuery] = useState("");

  const goLive = useCallback(() => setMode("live"), []);
  const goOperations = useCallback(() => setMode("operations"), []);
  const goTasks = useCallback(() => setMode("tasks"), []);

  return (
    <AppContext.Provider
      value={{
        mode,
        setMode,
        goLive,
        goOperations,
        goTasks,
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
