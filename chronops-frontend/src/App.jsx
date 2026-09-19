import { Routes, Route, Navigate } from "react-router-dom";
import { AppProvider } from "./hooks/useApp";
import { NotificationsProvider } from "./hooks/useNotifications";
import { TasksProvider } from "./hooks/useTasks";
import Dashboard from "./pages/Dashboard";
import StyleGuide from "./pages/StyleGuide";

export default function App() {
  return (
    <AppProvider>
      <NotificationsProvider>
        <TasksProvider>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/styleguide" element={<StyleGuide />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </TasksProvider>
      </NotificationsProvider>
    </AppProvider>
  );
}