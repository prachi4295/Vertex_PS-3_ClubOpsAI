import { createContext, useContext, useState, useCallback } from "react";

const NotificationsContext = createContext(null);

let _nextId = 1;

/**
 * Notifications context for logging AI actions and warnings.
 */
export function NotificationsProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  // Handles both addNotification({ message, type }) and addNotification(type, message)
  const addNotification = useCallback((arg1, arg2) => {
    let type = "info";
    let message = "";

    if (typeof arg1 === "object" && arg1 !== null) {
      type = arg1.type || "info";
      message = arg1.message || "";
    } else {
      type = arg1 || "info";
      message = arg2 || "";
    }

    if (!message || typeof message !== "string" || !message.trim()) return;

    const cleanMessage = message.trim();

    setNotifications((prev) => {
      // Prevent rapid duplicate notifications
      const isDuplicate = prev.some(
        (n) =>
          n.message === cleanMessage &&
          Date.now() - new Date(n.timestamp).getTime() < 5000
      );
      if (isDuplicate) return prev;

      return [
        {
          id: _nextId++,
          type,
          message: cleanMessage,
          timestamp: new Date(),
          read: false,
        },
        ...prev.slice(0, 49), // cap to latest 50 notifications
      ];
    });
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        addNotification,
        markAllRead,
        clearAll,
        removeNotification,
        unreadCount,
      }}
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
