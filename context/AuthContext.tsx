'use client';

import {
  createContext, useContext, useState, useEffect, useCallback, ReactNode
} from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthStep =
  | 'loading'
  | 'register'       // no users exist → show register form
  | 'signin'         // users exist, not logged in → email + password
  | 'pin'            // logged in, PIN set → 4-digit quick unlock
  | 'setup-pin'      // logged in, no PIN yet → ask to set a PIN
  | 'authenticated'; // fully unlocked

interface AuthUser {
  email: string;
  vaultName: string;
  hasPinSet: boolean;
}

interface AuthContextValue {
  step: AuthStep;
  user: AuthUser | null;
  /** Display name for the vault (from `user`, with a safe default). */
  vaultName: string;
  /** True if at least one account exists (used for register vs sign-in messaging). */
  hasUsers: boolean;
  error: string;
  isAuthenticated: boolean;

  // Actions
  register: (email: string, password: string, vaultName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  verifyPin: (pin: string) => Promise<void>;
  setupPin: (pin: string) => Promise<void>;
  skipPin: () => void;
  lock: () => Promise<void>;
  goToRegister: () => void;
  goToSignIn: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<AuthStep>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hasUsers, setHasUsers] = useState(false);
  const [error, setError] = useState('');

  // ── Bootstrap ────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/verify');
        const data = await res.json();

        if (data.isLoggedIn && data.user) {
          setUser(data.user);
          setHasUsers(true);
          // If PIN is set, ask for quick PIN; otherwise offer PIN setup
          setStep(data.user.hasPinSet ? 'pin' : 'setup-pin');
        } else {
          setHasUsers(!!data.hasUsers);
          // No valid session — show register or sign-in
          setStep(data.hasUsers ? 'signin' : 'register');
        }
      } catch {
        setStep('signin');
      }
    })();
  }, []);

  // ── Register ──────────────────────────────────────────────────────────────────
  const register = useCallback(async (email: string, password: string, vaultName: string) => {
    setError('');
    const res = await fetch('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, vaultName }),
    });
    const data = await res.json();
    if (!data.ok) { setError(data.error || 'Registration failed'); return; }
    setUser(data.user);
    setHasUsers(true);
    setStep('setup-pin'); // new users always set up a PIN
  }, []);

  // ── Sign In ───────────────────────────────────────────────────────────────────
  const signIn = useCallback(async (email: string, password: string) => {
    setError('');
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!data.ok) { setError(data.error || 'Sign in failed'); return; }
    setUser(data.user);
    setHasUsers(true);
    setStep(data.user.hasPinSet ? 'pin' : 'setup-pin');
  }, []);

  // ── Verify quick PIN ──────────────────────────────────────────────────────────
  const verifyPin = useCallback(async (pin: string) => {
    setError('');
    const res = await fetch('/api/auth/pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'verify', pin }),
    });
    const data = await res.json();
    if (!data.ok) {
      if (data.needsPinSetup) { setStep('setup-pin'); return; }
      setError(data.error || 'Incorrect PIN');
      return;
    }
    setStep('authenticated');
  }, []);

  // ── Setup PIN ─────────────────────────────────────────────────────────────────
  const setupPin = useCallback(async (pin: string) => {
    setError('');
    const res = await fetch('/api/auth/pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set', pin }),
    });
    const data = await res.json();
    if (!data.ok) { setError(data.error || 'Could not set PIN'); return; }
    if (user) setUser({ ...user, hasPinSet: true });
    setStep('authenticated');
  }, [user]);

  // ── Skip PIN setup ────────────────────────────────────────────────────────────
  const skipPin = useCallback(() => {
    setStep('authenticated');
  }, []);

  // ── Lock ─────────────────────────────────────────────────────────────────────
  /** With a PIN, keep the session cookie and only return to PIN unlock. Without a PIN, clear session. */
  const lock = useCallback(async () => {
    if (user?.hasPinSet) {
      setStep('pin');
      return;
    }
    await fetch('/api/auth/lock', { method: 'POST' });
    setUser(null);
    setStep('signin');
    try {
      const r = await fetch('/api/auth/verify');
      const d = await r.json();
      if (!d.isLoggedIn) setHasUsers(!!d.hasUsers);
    } catch { /* ignore */ }
  }, [user]);

  const goToRegister = useCallback(() => {
    setError('');
    setStep('register');
  }, []);

  const goToSignIn = useCallback(() => {
    setError('');
    setStep('signin');
  }, []);

  return (
    <AuthContext.Provider value={{
      step,
      user,
      vaultName: user?.vaultName?.trim() || 'My Vault',
      hasUsers,
      error,
      isAuthenticated: step === 'authenticated',
      register, signIn, verifyPin, setupPin, skipPin, lock,
      goToRegister, goToSignIn,
      clearError: () => setError(''),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
