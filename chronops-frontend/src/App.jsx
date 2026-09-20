import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { AppProvider } from "./hooks/useApp";
import { NotificationsProvider } from "./hooks/useNotifications";
import { TasksProvider } from "./hooks/useTasks";
import { SessionsProvider } from "./hooks/useSessions";
import { ClockProvider } from "./hooks/useClock";
import Dashboard from "./pages/Dashboard";
import EventTaskboardPage from "./pages/EventTaskboardPage";
import Login from "./pages/Login";
import StyleGuide from "./pages/StyleGuide";
import ErrorBoundary from "./components/ErrorBoundary";
import EventAutoStartWatcher from "./components/EventAutoStartWatcher";
import { Star } from "lucide-react";

/**
 * Gatekeeper component: Protects authenticated routes and redirects to Login if unauthenticated.
 */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-neo-bg flex flex-col items-center justify-center p-4">
        <div className="bg-neo-white border-4 border-neo-ink p-8 shadow-neo-lg text-center max-w-sm w-full">
          <Star size={36} strokeWidth={3} className="text-neo-secondary animate-spin-slow mx-auto mb-4" />
          <img
            src="/chronops-logo.png"
            alt="ChronOps"
            className="h-10 w-auto object-contain mx-auto mb-3"
          />
          <p className="text-xs font-bold text-neo-ink/60 uppercase tracking-wide">
            Authenticating organizer session...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

/**
 * Login route redirector: If user is already authenticated, forward them to the Dashboard.
 */
function PublicLoginRoute() {
  const { user, loading } = useAuth();

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  return <Login />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <NotificationsProvider>
            <TasksProvider>
              <SessionsProvider>
                <ClockProvider>
                  <EventAutoStartWatcher />
                  <Routes>
                    <Route
                      path="/"
                      element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/taskboards/:eventId"
                      element={
                        <ProtectedRoute>
                          <EventTaskboardPage />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="/login" element={<PublicLoginRoute />} />
                    {import.meta.env.DEV && <Route path="/styleguide" element={<StyleGuide />} />}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </ClockProvider>
              </SessionsProvider>
            </TasksProvider>
          </NotificationsProvider>
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}