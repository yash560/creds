"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthStep =
  | "loading"
  | "register" // no users exist → show register form
  | "signin" // users exist, not logged in → email + password
  | "pin" // logged in, PIN set → 4-digit quick unlock
  | "setup-pin" // logged in, no PIN yet → ask to set a PIN
  | "authenticated"; // fully unlocked

interface AuthUser {
  email: string;
  vaultName: string;
  hasPinSet: boolean;
}

export interface AuthContextValue {
  step: AuthStep;
  user: AuthUser | null;
  /** Display name for the vault (from `user`, with a safe default). */
  vaultName: string;
  /** True if at least one account exists (used for register vs sign-in messaging). */
  hasUsers: boolean;
  error: string;
  isAuthenticated: boolean;
  /** Encryption key for the current session, derived from the server's sessionKey */
  cryptoKey: CryptoKey | null;

  // Actions
  register: (
    email: string,
    password: string,
    vaultName: string,
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  verifyPin: (pin: string) => Promise<void>;
  setupPin: (pin: string) => Promise<void>;
  skipPin: () => void;
  lock: () => Promise<void>;
  signOut: () => Promise<void>;
  goToRegister: () => void;
  goToSignIn: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

import { importKey, clearEncryptedCache } from "@/lib/crypto-vault";
import {
  saveSessionLocally,
  getSessionLocally,
  clearSessionLocally,
} from "@/lib/session-client";

// ... existing types ...

export function AuthProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<AuthStep>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [cryptoKey, setCryptoKey] = useState<CryptoKey | null>(null);
  const [hasUsers, setHasUsers] = useState(false);
  const [error, setError] = useState("");

  // ── Bootstrap ────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        // Check if there's a valid session in localStorage (within 5 min window)
        const localSession = getSessionLocally();
        if (localSession) {
          console.log("Restoring session from localStorage");
          // Verify this session is still valid on server
          const verifyRes = await fetch("/api/auth/verify");
          const verifyData = await verifyRes.json();

          if (verifyData.isLoggedIn && verifyData.user) {
            setUser(verifyData.user);
            setHasUsers(true);
            if (localSession.sessionKey) {
              const key = await importKey(localSession.sessionKey);
              setCryptoKey(key);
              setStep("authenticated");
              console.log("Session restored - skipping PIN");
              return;
            }
          }
        }

        // Normal flow - no valid session
        const res = await fetch("/api/auth/verify");
        const data = await res.json();

        if (data.isLoggedIn && data.user) {
          setUser(data.user);
          setHasUsers(true);
          if (data.sessionKey) {
            const key = await importKey(data.sessionKey);
            setCryptoKey(key);
          }
          // If PIN is set, ask for quick PIN; otherwise offer PIN setup
          setStep(data.user.hasPinSet ? "pin" : "setup-pin");
        } else {
          setHasUsers(!!data.hasUsers);
          setStep(data.hasUsers ? "signin" : "register");
        }
      } catch {
        setStep("signin");
      }
    })();
  }, []);

  // ── Save session to localStorage when authenticated ─────────────────────────
  useEffect(() => {
    if (step === "authenticated" && user && cryptoKey) {
      // Get sessionKey from server and save locally
      (async () => {
        try {
          const res = await fetch("/api/auth/verify");
          const data = await res.json();
          if (data.sessionKey && data.user) {
            saveSessionLocally(data.sessionKey, data.user.id || user.email);
          }
        } catch (error) {
          console.error("Failed to save session locally:", error);
        }
      })();
    } else if (step === "signin" || step === "register") {
      // Clear session when signing out
      clearSessionLocally();
    }
  }, [step, user]);

  // ── Register ──────────────────────────────────────────────────────────────────
  const register = useCallback(
    async (email: string, password: string, vaultName: string) => {
      setError("");
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, vaultName }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Registration failed");
        return;
      }

      if (data.sessionKey) {
        const key = await importKey(data.sessionKey);
        setCryptoKey(key);
      }

      setUser(data.user);
      setHasUsers(true);
      setStep("setup-pin");
    },
    [],
  );

  // ── Sign In ───────────────────────────────────────────────────────────────────
  const signIn = useCallback(async (email: string, password: string) => {
    setError("");
    const res = await fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!data.ok) {
      setError(data.error || "Sign in failed");
      return;
    }

    if (data.sessionKey) {
      const key = await importKey(data.sessionKey);
      setCryptoKey(key);
    }

    setUser(data.user);
    setHasUsers(true);
    setStep(data.user.hasPinSet ? "pin" : "setup-pin");
  }, []);

  // ── Verify quick PIN ──────────────────────────────────────────────────────────
  const verifyPin = useCallback(async (pin: string) => {
    setError("");
    const res = await fetch("/api/auth/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify", pin }),
    });
    const data = await res.json();
    console.log("PIN verify response:", data); // Debug log
    if (!data.ok) {
      if (data.needsPinSetup) {
        setStep("setup-pin");
        return;
      }
      setError(data.error || "Incorrect PIN");
      return;
    }

    if (data.sessionKey) {
      console.log("Setting crypto key from PIN response"); // Debug log
      const key = await importKey(data.sessionKey);
      setCryptoKey(key);
      console.log("Crypto key set:", !!key); // Debug log
      // Save session for 5-minute quick access
      if (user) {
        saveSessionLocally(data.sessionKey, user.email);
      }
    } else {
      console.warn("No sessionKey in PIN response"); // Debug log
    }

    console.log("Setting step to authenticated"); // Debug log
    setStep("authenticated");
  }, [user]);

  // ── Setup PIN ─────────────────────────────────────────────────────────────────
  const setupPin = useCallback(
    async (pin: string) => {
      setError("");
      const res = await fetch("/api/auth/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set", pin }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Could not set PIN");
        return;
      }

      if (data.sessionKey) {
        const key = await importKey(data.sessionKey);
        setCryptoKey(key);
        // Save session for 5-minute quick access
        if (user) {
          saveSessionLocally(data.sessionKey, user.email);
        }
      }

      if (user) setUser({ ...user, hasPinSet: true });
      setStep("authenticated");
    },
    [user],
  );

  // ── Skip PIN setup ────────────────────────────────────────────────────────────
  const skipPin = useCallback(() => {
    // Save session even when skipping PIN setup
    if (user && cryptoKey) {
      (async () => {
        try {
          const res = await fetch("/api/auth/verify");
          const data = await res.json();
          if (data.sessionKey && data.user) {
            saveSessionLocally(data.sessionKey, data.user.id || user.email);
          }
        } catch (error) {
          console.error("Failed to save session:", error);
        }
      })();
    }
    setStep("authenticated");
  }, [user, cryptoKey]);

  // ── Lock ─────────────────────────────────────────────────────────────────────
  const lock = useCallback(async () => {
    if (user?.hasPinSet) {
      clearSessionLocally(); // Clear 5-min session when locking
      setStep("pin");
      return;
    }
    await fetch("/api/auth/lock", { method: "POST" });
    setUser(null);
    setCryptoKey(null);
    clearEncryptedCache(); // Security enhancement
    clearSessionLocally(); // Clear session
    setStep("signin");
    try {
      const r = await fetch("/api/auth/verify");
      const d = await r.json();
      if (!d.isLoggedIn) setHasUsers(!!d.hasUsers);
    } catch {
      /* ignore */
    }
  }, [user]);

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/lock", { method: "POST" });
    } catch (error) {
      console.error("Sign out failed:", error);
    }
    setUser(null);
    setCryptoKey(null);
    clearEncryptedCache();
    clearSessionLocally();
    setStep("signin");
    try {
      const res = await fetch("/api/auth/verify");
      const data = await res.json();
      setHasUsers(!!data.hasUsers);
    } catch {
      /* ignore */
    }
  }, []);

  const goToRegister = useCallback(() => {
    setError("");
    setStep("register");
  }, []);

  const goToSignIn = useCallback(() => {
    setError("");
    setStep("signin");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        step,
        user,
        cryptoKey,
        vaultName: user?.vaultName?.trim() || "My Vault",
        hasUsers,
        error,
        isAuthenticated: step === "authenticated",
        register,
        signIn,
        verifyPin,
        setupPin,
        skipPin,
        lock,
        signOut,
        goToRegister,
        goToSignIn,
        clearError: () => setError(""),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
