import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  auth,
  googleProvider,
  isFirebaseConfigured,
  signInWithPopup,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
} from "../services/firebase";

const SESSION_AUTH_KEY = "clubops_session_auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Clear any stale legacy localStorage auth so user is prompted to login first
    try {
      localStorage.removeItem("clubops_demo_auth");
      localStorage.removeItem("clubops_user_role");
    } catch (e) {}

    // Check if user already logged in during this browser session
    try {
      const sessionUser = sessionStorage.getItem(SESSION_AUTH_KEY);
      if (sessionUser) {
        setUser(JSON.parse(sessionUser));
      }
    } catch (e) {}

    // If Firebase Auth is configured and active, listen to auth state changes
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(
        auth,
        (firebaseUser) => {
          if (firebaseUser) {
            const mapped = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || (firebaseUser.isAnonymous ? "volunteer@chronops.io" : ""),
              displayName:
                firebaseUser.displayName ||
                (firebaseUser.isAnonymous ? "ChronOps Volunteer" : "Google User"),
              photoURL:
                firebaseUser.photoURL ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  firebaseUser.displayName || "Google User"
                )}&background=4285F4&color=fff&bold=true`,
              isAnonymous: firebaseUser.isAnonymous,
              provider: firebaseUser.isAnonymous ? "demo" : "google.com",
            };
            setUser(mapped);
            try {
              sessionStorage.setItem(SESSION_AUTH_KEY, JSON.stringify(mapped));
              localStorage.setItem("clubops_current_user_email", mapped.email || mapped.uid);
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("clubops-data-updated"));
              }
            } catch (e) {}
          } else {
            // If Firebase has no user and sessionStorage has no user, ensure user is null
            try {
              const sessionUser = sessionStorage.getItem(SESSION_AUTH_KEY);
              if (sessionUser) {
                const parsed = JSON.parse(sessionUser);
                setUser(parsed);
                localStorage.setItem("clubops_current_user_email", parsed.email || parsed.uid);
                setLoading(false);
                return;
              }
            } catch (e) {}
            setUser(null);
            try {
              localStorage.removeItem("clubops_current_user_email");
            } catch (e) {}
          }
          setLoading(false);
        },
        (err) => {
          console.error("Auth state observer error:", err);
          setError(err.message);
          setLoading(false);
        }
      );
      return () => unsubscribe();
    }

    setLoading(false);
  }, []);

  // ─── Google Sign-In ───
  const signInWithGoogle = useCallback(async (customGoogleUser = null) => {
    setError(null);
    setLoading(true);

    try {
      // 1. If custom Google user provided (e.g. from Google Account modal or fallback)
      if (customGoogleUser && customGoogleUser.email) {
        const mapped = {
          uid: customGoogleUser.uid || "google-" + Date.now().toString(36),
          email: customGoogleUser.email,
          displayName: customGoogleUser.displayName || "Google User",
          photoURL:
            customGoogleUser.photoURL ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              customGoogleUser.displayName || "Google User"
            )}&background=4285F4&color=fff&bold=true`,
          isAnonymous: false,
          provider: "google.com",
        };
        sessionStorage.setItem(SESSION_AUTH_KEY, JSON.stringify(mapped));
        localStorage.setItem("clubops_current_user_email", mapped.email || mapped.uid);
        setUser(mapped);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("clubops-data-updated"));
        }
        return mapped;
      }

      // 2. Try Firebase Google Popup
      if (isFirebaseConfigured && auth && googleProvider) {
        try {
          const result = await signInWithPopup(auth, googleProvider);
          const fbUser = result.user;
          const mapped = {
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName || "Google User",
            photoURL:
              fbUser.photoURL ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                fbUser.displayName || "Google User"
              )}&background=4285F4&color=fff&bold=true`,
            isAnonymous: false,
            provider: "google.com",
          };
          sessionStorage.setItem(SESSION_AUTH_KEY, JSON.stringify(mapped));
          localStorage.setItem("clubops_current_user_email", mapped.email || mapped.uid);
          setUser(mapped);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("clubops-data-updated"));
          }
          return mapped;
        } catch (fbErr) {
          console.warn("Firebase Google Auth popup error:", fbErr);
          throw fbErr;
        }
      } else {
        throw new Error("Firebase Auth is not configured");
      }
    } catch (err) {
      console.error("Google sign in failed:", err);
      setError(err.message || "Failed to sign in with Google.");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Continue as Demo ───
  const signInDemo = useCallback(async () => {
    setError(null);
    setLoading(true);

    const displayName = "ChronOps Demo User";
    const email = "demo@chronops.io";
    const uid = "demo-user-uid";

    try {
      if (isFirebaseConfigured && auth) {
        try {
          const result = await signInAnonymously(auth);
          const fbUser = result.user;
          const mapped = {
            uid: fbUser.uid,
            email: email,
            displayName: displayName,
            photoURL: null,
            isAnonymous: true,
            provider: "demo",
          };
          sessionStorage.setItem(SESSION_AUTH_KEY, JSON.stringify(mapped));
          localStorage.setItem("clubops_current_user_email", email);
          setUser(mapped);
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("clubops-data-updated"));
          }
          return mapped;
        } catch (fbErr) {
          console.warn("Firebase Anonymous Auth not enabled in console, using local demo:", fbErr);
        }
      }

      const demoUser = {
        uid: uid,
        email: email,
        displayName: displayName,
        photoURL: null,
        isAnonymous: true,
        provider: "demo",
      };
      sessionStorage.setItem(SESSION_AUTH_KEY, JSON.stringify(demoUser));
      localStorage.setItem("clubops_current_user_email", email);
      setUser(demoUser);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("clubops-data-updated"));
      }
      return demoUser;
    } catch (err) {
      console.error("Demo sign in failed:", err);
      setError(err.message || "Failed to continue as demo.");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Volunteer / Participant Sign In ───
  const signInVolunteer = useCallback(async (name, email) => {
    setError(null);
    setLoading(true);

    const userObj = {
      uid: "volunteer-" + Date.now().toString(36),
      displayName: name || "Event Volunteer",
      email: email || "volunteer@chronops.io",
      photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(
        name || "Volunteer"
      )}&background=00E5FF&color=000&bold=true`,
      isAnonymous: false,
      provider: "volunteer",
    };
    sessionStorage.setItem(SESSION_AUTH_KEY, JSON.stringify(userObj));
    localStorage.setItem("clubops_current_user_email", userObj.email);
    setUser(userObj);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("clubops-data-updated"));
    }
    setLoading(false);
    return userObj;
  }, []);

  // ─── Sign Out ───
  const signOutUser = useCallback(async () => {
    setError(null);
    try {
      if (isFirebaseConfigured && auth && auth.currentUser) {
        await signOut(auth);
      }
    } catch (err) {
      console.warn("Firebase sign out error:", err);
    }
    sessionStorage.removeItem(SESSION_AUTH_KEY);
    try {
      localStorage.removeItem("clubops_current_user_email");
      localStorage.removeItem("clubops_demo_auth");
      localStorage.removeItem("clubops_user_role");
    } catch (e) {}
    setUser(null);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("clubops-data-updated"));
    }
  }, []);

  const value = {
    user,
    loading,
    error,
    signInWithGoogle,
    signInDemo,
    signInVolunteer,
    signOutUser,
    isDemo: user?.isAnonymous || user?.uid?.startsWith("demo-") || !isFirebaseConfigured,
    isFirebaseConfigured,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
