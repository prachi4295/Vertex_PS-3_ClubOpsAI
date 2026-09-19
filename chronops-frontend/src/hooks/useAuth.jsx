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

const LOCAL_AUTH_KEY = "clubops_demo_auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 1. If Firebase Auth is configured and active, listen to auth state changes
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(
        auth,
        (firebaseUser) => {
          if (firebaseUser) {
            const mapped = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || (firebaseUser.isAnonymous ? "demo@hackgenesis.io" : ""),
              displayName: firebaseUser.displayName || (firebaseUser.isAnonymous ? "Demo Organizer" : "User"),
              photoURL: firebaseUser.photoURL || null,
              isAnonymous: firebaseUser.isAnonymous,
            };
            setUser(mapped);
            try {
              localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(mapped));
            } catch (e) {}
          } else {
            // Check if there is an active local demo session before wiping to null!
            try {
              const savedUser = localStorage.getItem(LOCAL_AUTH_KEY);
              if (savedUser) {
                setUser(JSON.parse(savedUser));
                setLoading(false);
                return;
              }
            } catch (e) {}
            setUser(null);
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

    // 2. If Firebase is not configured, check localStorage for persistent demo user
    try {
      const savedUser = localStorage.getItem(LOCAL_AUTH_KEY);
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.warn("Could not parse saved auth from localStorage:", e);
    }
    setLoading(false);
  }, []);

  // ─── Google Sign-In ───
  const signInWithGoogle = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      if (isFirebaseConfigured && auth && googleProvider) {
        try {
          const result = await signInWithPopup(auth, googleProvider);
          const fbUser = result.user;
          const mapped = {
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName || "Google User",
            photoURL: fbUser.photoURL,
            isAnonymous: false,
          };
          localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(mapped));
          setUser(mapped);
          return mapped;
        } catch (fbErr) {
          console.warn("Firebase Google Auth failed (falling back to local session):", fbErr);
          if (fbErr.code === "auth/popup-closed-by-user") {
            throw fbErr;
          }
          // Fall back to local Google user simulation
          const mockUser = {
            uid: "google-lead-" + Date.now().toString(36),
            email: "lead@clubops.studio",
            displayName: "Hack Lead (Google Demo)",
            photoURL: null,
            isAnonymous: false,
          };
          localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(mockUser));
          setUser(mockUser);
          return mockUser;
        }
      } else {
        // Local simulation for Google sign-in
        const mockUser = {
          uid: "google-lead-" + Date.now().toString(36),
          email: "lead@clubops.studio",
          displayName: "Hack Lead (Google Demo)",
          photoURL: null,
          isAnonymous: false,
        };
        localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(mockUser));
        setUser(mockUser);
        return mockUser;
      }
    } catch (err) {
      console.error("Google sign in failed:", err);
      setError(err.message || "Failed to sign in with Google.");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Continue as Demo (Anonymous) ───
  const signInDemo = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      if (isFirebaseConfigured && auth) {
        try {
          const result = await signInAnonymously(auth);
          const fbUser = result.user;
          const mapped = {
            uid: fbUser.uid,
            email: "demo@hackgenesis.io",
            displayName: "HackGenesis Lead (Demo)",
            photoURL: null,
            isAnonymous: true,
          };
          localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(mapped));
          setUser(mapped);
          return mapped;
        } catch (fbErr) {
          console.warn("Firebase Anonymous Auth not enabled in console, using local demo:", fbErr);
          // Fall back seamlessly to local demo user
          const demoUser = {
            uid: "demo-lead-uid",
            email: "demo@hackgenesis.io",
            displayName: "HackGenesis Lead (Demo)",
            photoURL: null,
            isAnonymous: true,
          };
          localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(demoUser));
          setUser(demoUser);
          return demoUser;
        }
      } else {
        // Local simulation for demo anonymous user
        const demoUser = {
          uid: "demo-lead-uid",
          email: "demo@hackgenesis.io",
          displayName: "HackGenesis Lead (Demo)",
          photoURL: null,
          isAnonymous: true,
        };
        localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(demoUser));
        setUser(demoUser);
        return demoUser;
      }
    } catch (err) {
      console.error("Demo sign in failed:", err);
      setError(err.message || "Failed to continue as demo.");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Sign Out ───
  const signOutUser = useCallback(async () => {
    setError(null);
    try {
      if (isFirebaseConfigured && auth && auth.currentUser) {
        await signOut(auth);
      }
      localStorage.removeItem(LOCAL_AUTH_KEY);
      setUser(null);
    } catch (err) {
      console.error("Sign out failed:", err);
      setError(err.message || "Failed to sign out.");
    }
  }, []);

  const value = {
    user,
    loading,
    error,
    signInWithGoogle,
    signInDemo,
    signOutUser,
    isDemo: user?.isAnonymous || user?.uid === "demo-lead-uid" || !isFirebaseConfigured,
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
