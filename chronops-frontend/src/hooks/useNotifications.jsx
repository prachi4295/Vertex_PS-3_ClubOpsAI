import { createContext, useContext, useState, useCallback } from "react";

const NotificationsContext = createContext(null);

let _nextId = 1;

/**
 * Notifications context for logging AI actions and warnings.
 */
export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState([
    {
      id: _nextId++,
      type: "ai",
      message: "AI parsed 3 tasks from meeting notes",
      timestamp: new Date(Date.now() - 120_000),
      read: false,
    },
    {
      id: _nextId++,
      type: "warning",
      message: "Session \"Keynote\" has no phonetic guide",
      timestamp: new Date(Date.now() - 300_000),
      read: false,
    },
    {
      id: _nextId++,
      type: "ai",
      message: "Run-sheet reflowed: 2 sessions shifted",
      timestamp: new Date(Date.now() - 600_000),
      read: true,
    },
  ]);

  const addNotification = useCallback((type, message) => {
    setNotifications((prev) => [
      { id: _nextId++, type, message, timestamp: new Date(), read: false },
      ...prev,
    ]);
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider
      value={{ notifications, addNotification, markAllRead, unreadCount }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx)
    throw new Error(
      "useNotifications must be used within NotificationsProvider"
    );
  return ctx;
}
