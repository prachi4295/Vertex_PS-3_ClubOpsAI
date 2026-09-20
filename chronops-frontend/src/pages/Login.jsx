import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  Radio,
  Terminal,
  Users,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { Badge, Input, Modal, Button } from "../components/ui";

export default function Login() {
  const {
    signInWithGoogle,
    signUpWithEmail,
    signInWithEmail,
    signInVolunteer,
    loading,
    error,
  } = useAuth();
  const [authMode, setAuthMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("organizer");

  const [volunteerName, setVolunteerName] = useState("");
  const [volunteerEmail, setVolunteerEmail] = useState("");
  const [volunteerExpanded, setVolunteerExpanded] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");
  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [googleName, setGoogleName] = useState("");
  const [googleEmail, setGoogleEmail] = useState("");
  const navigate = useNavigate();

  const handleEmailAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    setSubmitting(true);
    try {
      if (authMode === "signup") {
        await signUpWithEmail(email, password, name, role);
      } else {
        await signInWithEmail(email, password);
      }
      navigate("/");
    } catch (err) {
      setAuthError(err.message || `Failed to ${authMode === "signup" ? "sign up" : "log in"}.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError("");
    setSubmitting(true);
    try {
      await signInWithGoogle();
      navigate("/");
    } catch (err) {
      console.info("Native Firebase Google popup not configured or cancelled, opening Google account connector:", err);
      setGoogleModalOpen(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleModalSubmit = async (e) => {
    e.preventDefault();
    if (!googleEmail.trim()) {
      setAuthError("Please enter your Google account email.");
      return;
    }
    setSubmitting(true);
    try {
      const emailVal = googleEmail.trim();
      const displayName = googleName.trim() || emailVal.split("@")[0];
      const photoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4285F4&color=fff&bold=true`;
      await signInWithGoogle({
        email: emailVal,
        displayName,
        photoURL,
      });
      setGoogleModalOpen(false);
      navigate("/");
    } catch (err) {
      setAuthError(err.message || "Failed to sign in with Google.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVolunteerSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    setSubmitting(true);
    try {
      await signInVolunteer(volunteerName || "Event Volunteer", volunteerEmail || "volunteer@chronops.io");
      navigate("/");
    } catch (err) {
      setAuthError(err.message || "Failed to log in as volunteer.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-neo-bg relative flex flex-col justify-between overflow-x-hidden font-sans select-none">
      {/* Background textures */}
      <div className="fixed inset-0 texture-halftone pointer-events-none opacity-40" />
      <div className="fixed inset-0 texture-grid pointer-events-none opacity-50" />
      <div className="fixed inset-0 texture-noise pointer-events-none opacity-30" />

      {/* ─── Top Brand Bar ─── */}
      <header className="relative z-10 w-full border-b-4 border-neo-ink bg-neo-white px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-neo-sm">
        {/* Left spacer to ensure ChronOps is perfectly centered */}
        <div className="flex-1 flex items-center justify-start" />

        {/* Middle Brand Name */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2 bg-neo-ink text-neo-white px-4 py-1.5 font-black tracking-wider text-sm sm:text-base border-2 border-neo-ink shadow-[2px_2px_0_#000]">
            <span className="w-2.5 h-2.5 bg-neo-accent rounded-full animate-pulse" />
            ChronOps
          </div>
        </div>

        {/* Right Corner: Login / Sign Up options */}
        <div className="flex-1 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setAuthMode("login");
              setAuthError("");
              document.getElementById("auth-card")?.scrollIntoView({ behavior: "smooth" });
            }}
            className={[
              "px-3 py-1.5 font-black text-xs uppercase tracking-wider transition-all duration-100 cursor-pointer border-2 border-neo-ink",
              authMode === "login"
                ? "bg-neo-accent text-neo-ink shadow-[2px_2px_0_#000]"
                : "bg-neo-white text-neo-ink hover:bg-neo-bg shadow-[1px_1px_0_#000]",
            ].join(" ")}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode("signup");
              setAuthError("");
              document.getElementById("auth-card")?.scrollIntoView({ behavior: "smooth" });
            }}
            className={[
              "px-3 py-1.5 font-black text-xs uppercase tracking-wider transition-all duration-100 cursor-pointer border-2 border-neo-ink",
              authMode === "signup"
                ? "bg-neo-accent text-neo-ink shadow-[2px_2px_0_#000]"
                : "bg-neo-white text-neo-ink hover:bg-neo-bg shadow-[1px_1px_0_#000]",
            ].join(" ")}
          >
            Sign Up
          </button>
        </div>
      </header>

      {/* ─── Main Hero Content ─── */}
      <main className="relative z-10 max-w-4xl mx-auto w-full px-4 py-8 sm:py-14 flex flex-col items-center">
        {/* Floating Decorative Badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          <Badge color="accent" rotate className="!text-xs !px-3 !py-1">
            ⚡ CHRONOPS 2026
          </Badge>
          <Badge color="secondary" className="!text-xs !px-3 !py-1">
            LIVE STAGE & OPS
          </Badge>
          <Badge color="muted" rotate className="!text-xs !px-3 !py-1">
            AI RADAR READY
          </Badge>
        </div>

        {/* Hero Title */}
        <div className="text-center mb-8 sm:mb-10 max-w-2xl">
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-neo-ink uppercase leading-[1.05] mb-4">
            Unified Event <br />
            <span className="bg-neo-secondary px-3 py-0.5 border-4 border-neo-ink inline-block shadow-[4px_4px_0_#000] -rotate-1 mt-1">
              Command Center
            </span>
          </h1>
          <p className="text-base sm:text-lg font-bold text-neo-ink/80 max-w-xl mx-auto uppercase tracking-wide">
            Automate hackathon ops, sync live stage run-sheets, and eliminate stage overrun panic with Gemini & Firebase.
          </p>
        </div>

        {/* ─── Unified Auth Box ─── */}
        <div id="auth-card" className="w-full max-w-md">
          <div className="bg-neo-white border-4 border-neo-ink shadow-neo-lg p-6 sm:p-8 relative">
            {/* Corner sticker */}
            <div className="absolute -top-4 -right-3 rotate-3">
              <Badge
                color={authMode === "signup" ? "accent" : "secondary"}
                className="!text-xs !px-3 !py-1 !border-2 shadow-[2px_2px_0_#000]"
              >
                {authMode === "signup" ? "SIGN UP" : "LOG IN"}
              </Badge>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex border-3 border-neo-ink bg-neo-bg p-1 shadow-[2px_2px_0_#000] mb-5">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setAuthError("");
                }}
                className={[
                  "flex-1 py-2 font-black text-xs uppercase tracking-wider transition-all duration-100 cursor-pointer",
                  authMode === "login"
                    ? "bg-neo-accent text-neo-ink border-2 border-neo-ink shadow-[2px_2px_0_#000]"
                    : "text-neo-ink/70 hover:text-neo-ink bg-transparent",
                ].join(" ")}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signup");
                  setAuthError("");
                }}
                className={[
                  "flex-1 py-2 font-black text-xs uppercase tracking-wider transition-all duration-100 cursor-pointer",
                  authMode === "signup"
                    ? "bg-neo-accent text-neo-ink border-2 border-neo-ink shadow-[2px_2px_0_#000]"
                    : "text-neo-ink/70 hover:text-neo-ink bg-transparent",
                ].join(" ")}
              >
                Sign Up
              </button>
            </div>

            <div className="mb-5">
              <h2 className="text-xl font-black uppercase tracking-wider text-neo-ink flex items-center gap-2">
                <ShieldCheck size={22} strokeWidth={3} className="text-neo-ink" />
                {authMode === "signup" ? "Create Account" : "Welcome Back"}
              </h2>
              <p className="text-xs font-bold text-neo-ink/60 uppercase tracking-wider mt-1">
                {authMode === "signup"
                  ? "Register to manage events, automated timelines & volunteers."
                  : "Sign in to access your event taskboards, live stages & radar."}
              </p>
            </div>

            {/* Error Message */}
            {(authError || error) && (
              <div className="mb-5 p-3 bg-neo-accent/20 border-3 border-neo-accent text-neo-ink font-bold text-xs">
                ⚠️ {authError || error}
              </div>
            )}

            {/* Primary Email & Password Form */}
            <form onSubmit={handleEmailAuthSubmit} className="space-y-3">
              {authMode === "signup" && (
                <div>
                  <label className="block text-[11px] font-black uppercase text-neo-ink mb-1">
                    Full Name *
                  </label>
                  <Input
                    placeholder="e.g. Rahul Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="!h-10 text-xs font-bold"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-black uppercase text-neo-ink mb-1">
                  Email Address *
                </label>
                <Input
                  type="email"
                  placeholder={authMode === "signup" ? "e.g. rahul@clubops.io" : "e.g. organizer@chronops.io"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="!h-10 text-xs font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase text-neo-ink mb-1">
                  Password *
                </label>
                <Input
                  type="password"
                  placeholder={authMode === "signup" ? "Minimum 6 characters" : "Enter your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="!h-10 text-xs font-bold"
                  required
                />
              </div>

              {authMode === "signup" && (
                <div>
                  <label className="block text-[11px] font-black uppercase text-neo-ink mb-1">
                    Account Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full h-10 px-3 border-2 border-neo-ink bg-neo-white font-bold text-xs text-neo-ink focus:outline-none"
                  >
                    <option value="organizer">Club Lead / Organizer</option>
                    <option value="stage_host">Stage Host / MC</option>
                    <option value="crew">Operations Crew / Volunteer</option>
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || loading}
                className={[
                  "w-full h-12 bg-neo-accent text-neo-ink border-4 border-neo-ink",
                  "font-black text-xs uppercase tracking-wider",
                  "shadow-neo hover:shadow-neo-lg transition-all duration-100 ease-linear",
                  "active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
                  "flex items-center justify-center gap-2 cursor-pointer mt-2",
                  submitting ? "opacity-60 cursor-not-allowed" : "",
                ].join(" ")}
              >
                <span>{authMode === "signup" ? "Create Account & Sign Up" : "Sign In to ChronOps"}</span>
                <ArrowRight size={16} strokeWidth={3} className="shrink-0" />
              </button>
            </form>

            {/* Toggle switch between Login and Sign Up */}
            <div className="mt-3 text-center">
              {authMode === "login" ? (
                <p className="text-xs font-bold text-neo-ink/70">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("signup");
                      setAuthError("");
                    }}
                    className="font-black text-neo-ink underline hover:text-neo-accent cursor-pointer"
                  >
                    Sign Up
                  </button>
                </p>
              ) : (
                <p className="text-xs font-bold text-neo-ink/70">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("login");
                      setAuthError("");
                    }}
                    className="font-black text-neo-ink underline hover:text-neo-accent cursor-pointer"
                  >
                    Log In
                  </button>
                </p>
              )}
            </div>

            {/* Social / Divider */}
            <div className="flex items-center gap-3 py-3 mt-1">
              <div className="flex-1 h-1 bg-neo-ink/20" />
              <span className="text-[11px] font-black uppercase text-neo-ink/50 tracking-widest">
                OR
              </span>
              <div className="flex-1 h-1 bg-neo-ink/20" />
            </div>

            {/* Google Sign In */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={submitting || loading}
              className={[
                "w-full h-12 bg-neo-white text-neo-ink border-3 border-neo-ink",
                "font-black text-xs uppercase tracking-wider",
                "shadow-neo-sm hover:shadow-neo transition-all duration-100 ease-linear",
                "active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
                "flex items-center justify-center gap-3 cursor-pointer",
                submitting ? "opacity-60 cursor-not-allowed" : "",
              ].join(" ")}
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Volunteer Quick Login */}
            <div className="mt-4 pt-3 border-t-2 border-neo-ink/15">
              <button
                type="button"
                onClick={() => setVolunteerExpanded((v) => !v)}
                className="w-full flex items-center justify-between text-[11px] font-black uppercase text-neo-ink/70 hover:text-neo-ink py-1 cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Users size={14} strokeWidth={3} />
                  Volunteer Quick Pass
                </span>
                <span className="text-xs font-black">{volunteerExpanded ? "− Close" : "+ Expand"}</span>
              </button>

              {volunteerExpanded && (
                <form onSubmit={handleVolunteerSubmit} className="space-y-2.5 pt-2">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-neo-ink mb-0.5">
                      Volunteer Name
                    </label>
                    <Input
                      placeholder="e.g. Rahul Sharma"
                      value={volunteerName}
                      onChange={(e) => setVolunteerName(e.target.value)}
                      className="!h-9 text-xs font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-neo-ink mb-0.5">
                      Email Address
                    </label>
                    <Input
                      type="email"
                      placeholder="e.g. rahul@volunteer.org"
                      value={volunteerEmail}
                      onChange={(e) => setVolunteerEmail(e.target.value)}
                      className="!h-9 text-xs font-bold"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || loading}
                    className={[
                      "w-full h-10 bg-neo-muted text-neo-ink border-3 border-neo-ink",
                      "font-black text-xs uppercase tracking-wider",
                      "shadow-neo-sm hover:shadow-neo transition-all duration-100 ease-linear",
                      "active:translate-x-[1px] active:translate-y-[1px] active:shadow-none",
                      "flex items-center justify-center gap-2 cursor-pointer",
                      submitting ? "opacity-60 cursor-not-allowed" : "",
                    ].join(" ")}
                  >
                    <span>Enter as Volunteer</span>
                    <ArrowRight size={14} strokeWidth={3} className="shrink-0" />
                  </button>
                </form>
              )}
            </div>

            {/* Note info */}
            <div className="mt-4 pt-3 border-t-2 border-neo-ink/10 text-center">
              <p className="text-[10px] font-bold text-neo-ink/60 uppercase tracking-wider">
                Multi-Event Operations • Local & Firebase Scoped Security
              </p>
            </div>
          </div>
        </div>

        {/* ─── 3 Feature Highlights ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mt-12">
          <div className="bg-neo-white border-4 border-neo-ink p-4 shadow-neo-sm">
            <div className="flex items-center gap-2 mb-2">
              <Terminal size={18} strokeWidth={3} className="text-neo-ink" />
              <h3 className="font-black text-xs uppercase tracking-wider">Ops Radar</h3>
            </div>
            <p className="text-xs font-bold text-neo-ink/70 uppercase">
              Kanban + AI task extraction from meeting notes.
            </p>
          </div>

          <div className="bg-neo-white border-4 border-neo-ink p-4 shadow-neo-sm">
            <div className="flex items-center gap-2 mb-2">
              <Radio size={18} strokeWidth={3} className="text-neo-accent" />
              <h3 className="font-black text-xs uppercase tracking-wider">Live Run-Sheet</h3>
            </div>
            <p className="text-xs font-bold text-neo-ink/70 uppercase">
              Schedule reflows in real time when speakers overrun.
            </p>
          </div>

          <div className="bg-neo-white border-4 border-neo-ink p-4 shadow-neo-sm">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={18} strokeWidth={3} className="text-neo-ink" />
              <h3 className="font-black text-xs uppercase tracking-wider">Anchor Tools</h3>
            </div>
            <p className="text-xs font-bold text-neo-ink/70 uppercase">
              Phonetic name guides and emergency stage scripts.
            </p>
          </div>
        </div>
      </main>

      {/* ─── Footer ─── */}
      <footer className="relative z-10 w-full border-t-4 border-neo-ink bg-neo-white px-6 py-3 flex items-center justify-between text-xs font-black uppercase text-neo-ink tracking-wider">
        <span>ChronOps • Event Operations</span>
        <span>Powered by Gemini AI</span>
      </footer>

      {/* ─── Google Account Modal ─── */}
      <Modal
        open={googleModalOpen}
        onClose={() => setGoogleModalOpen(false)}
        title="Sign In with Google"
        size="md"
      >
        <form onSubmit={handleGoogleModalSubmit} className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-neo-bg border-2 border-neo-ink">
            <svg className="w-8 h-8 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <div>
              <p className="text-xs font-black uppercase text-neo-ink">
                Connect Google Account
              </p>
              <p className="text-[11px] font-bold text-neo-ink/70">
                Sign in to manage ChronOps live operations and tasks.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1">
              Your Name
            </label>
            <Input
              type="text"
              placeholder="e.g. Alex Morgan"
              value={googleName}
              onChange={(e) => setGoogleName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider mb-1">
              Google Email Address
            </label>
            <Input
              type="email"
              placeholder="e.g. alex.morgan@gmail.com"
              value={googleEmail}
              onChange={(e) => setGoogleEmail(e.target.value)}
              required
            />
          </div>

          <div className="p-2.5 bg-blue-50 border border-blue-300 text-blue-900 text-[11px] font-medium leading-relaxed">
            💡 <strong>Pro Tip:</strong> To enable the automatic browser popup directly without this prompt, toggle <strong>Google</strong> to enabled in Firebase Console → <em>Authentication → Sign-in method</em>.
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t-2 border-neo-ink/10">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setGoogleModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting || !googleEmail.trim()}
              className="flex items-center gap-2"
            >
              <span>{submitting ? "Signing in..." : "Continue with Google"}</span>
              <ArrowRight size={14} strokeWidth={3} />
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
