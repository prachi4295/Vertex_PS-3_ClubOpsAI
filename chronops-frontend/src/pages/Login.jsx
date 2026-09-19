import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  Zap,
  ArrowRight,
  ShieldCheck,
  Radio,
  Layers,
  Star,
  Terminal,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { Badge, Card } from "../components/ui";

export default function Login() {
  const { signInWithGoogle, signInDemo, loading, error } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState("");
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setAuthError("");
    setSubmitting(true);
    try {
      await signInWithGoogle();
      navigate("/");
    } catch (err) {
      setAuthError(err.message || "Failed to sign in with Google.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoSignIn = async () => {
    setAuthError("");
    setSubmitting(true);
    try {
      await signInDemo();
      navigate("/");
    } catch (err) {
      setAuthError(err.message || "Failed to continue as demo.");
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
      <header className="relative z-10 w-full border-b-4 border-neo-ink bg-neo-white px-6 py-4 flex items-center justify-between shadow-neo-sm">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-neo-ink text-neo-white px-3 py-1 font-black tracking-wider text-sm border-2 border-neo-ink">
            <span className="w-2.5 h-2.5 bg-neo-accent rounded-full animate-pulse" />
            ChronOpsAI
          </div>
          <Badge color="secondary" rotate className="hidden sm:inline-flex !text-[10px]">
            v2.4
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Star size={16} strokeWidth={3} className="text-neo-secondary animate-spin-slow" />
        </div>
      </header>

      {/* ─── Main Hero Content ─── */}
      <main className="relative z-10 max-w-4xl mx-auto w-full px-4 py-8 sm:py-14 flex flex-col items-center">
        {/* Floating Decorative Badges */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          <Badge color="accent" rotate className="!text-xs !px-3 !py-1">
            ⚡ HACKGENESIS 2026
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

        {/* ─── Neo-Brutalist Auth Box ─── */}
        <div className="w-full max-w-md">
          <div className="bg-neo-white border-4 border-neo-ink shadow-neo-lg p-6 sm:p-8 relative">
            {/* Corner sticker */}
            <div className="absolute -top-4 -right-3 rotate-3">
              <Badge color="accent" className="!text-xs !px-3 !py-1 !border-2 shadow-[2px_2px_0_#000]">
                LOGIN REQUIRED
              </Badge>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-black uppercase tracking-wider text-neo-ink flex items-center gap-2">
                <ShieldCheck size={22} strokeWidth={3} className="text-neo-ink" />
                Organizer Portal
              </h2>
              <p className="text-xs font-bold text-neo-ink/60 uppercase tracking-wider mt-1">
                Sign in to manage tasks, anchor scripts & live stage run-sheets.
              </p>
            </div>

            {/* Error Message */}
            {(authError || error) && (
              <div className="mb-6 p-3 bg-neo-accent/20 border-4 border-neo-accent text-neo-ink font-bold text-xs">
                ⚠️ {authError || error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-4">
              {/* Google Sign In */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={submitting || loading}
                className={[
                  "w-full h-14 bg-neo-white text-neo-ink border-4 border-neo-ink",
                  "font-black text-sm uppercase tracking-wider",
                  "shadow-neo-sm hover:shadow-neo transition-all duration-100 ease-linear",
                  "active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
                  "flex items-center justify-center gap-3 cursor-pointer",
                  submitting ? "opacity-60 cursor-not-allowed" : "",
                ].join(" ")}
              >
                {/* Google "G" SVG Icon */}
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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

              {/* Divider */}
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-1 bg-neo-ink/20" />
                <span className="text-[11px] font-black uppercase text-neo-ink/50 tracking-widest">
                  OR FAST TRACK
                </span>
                <div className="flex-1 h-1 bg-neo-ink/20" />
              </div>

              {/* Anonymous Demo Sign In */}
              <button
                type="button"
                onClick={handleDemoSignIn}
                disabled={submitting || loading}
                className={[
                  "w-full h-14 bg-neo-secondary text-neo-ink border-4 border-neo-ink",
                  "font-black text-sm uppercase tracking-wider",
                  "shadow-neo hover:shadow-neo-lg transition-all duration-100 ease-linear",
                  "active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
                  "flex items-center justify-center gap-3 cursor-pointer",
                  submitting ? "opacity-60 cursor-not-allowed" : "",
                ].join(" ")}
              >
                <Zap size={20} strokeWidth={3} className="fill-neo-ink text-neo-ink shrink-0" />
                <span>Continue as Demo</span>
                <ArrowRight size={18} strokeWidth={3} className="shrink-0" />
              </button>
            </div>

            {/* Note info */}
            <div className="mt-6 pt-4 border-t-2 border-neo-ink/10 text-center">
              <p className="text-[11px] font-bold text-neo-ink/60 uppercase tracking-wider">
                Demo mode enables full local access to HackGenesis 2026 data.
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
        <span>ChronOpsAI • HackGenesis 2026</span>
        <span>Firebase Auth & Firestore</span>
      </footer>
    </div>
  );
}
