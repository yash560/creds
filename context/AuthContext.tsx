'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

interface AuthContextValue {
  isUnlocked: boolean;
  isLoading: boolean;
  needsSetup: boolean;
  vaultName: string;
  unlock: (pin: string) => Promise<{ ok: boolean; error?: string }>;
  setup: (pin: string, vaultName: string) => Promise<{ ok: boolean; error?: string }>;
  lock: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [vaultName, setVaultName] = useState('CredsHub');

  // Check vault status on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/verify');
        const data = await res.json();
        setNeedsSetup(!data.isSetup);
        if (data.vaultName) setVaultName(data.vaultName);
        // Try a protected route to see if cookie is valid
        if (data.isSetup) {
          const check = await fetch('/api/items?_check=1');
          setIsUnlocked(check.ok);
        }
      } catch {
        // Ignore
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const unlock = useCallback(async (pin: string) => {
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    const data = await res.json();
    if (data.ok) {
      setIsUnlocked(true);
      if (data.vaultName) setVaultName(data.vaultName);
    }
    return data;
  }, []);

  const setup = useCallback(async (pin: string, name: string) => {
    const res = await fetch('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, vaultName: name }),
    });
    const data = await res.json();
    if (data.ok) {
      setNeedsSetup(false);
      setIsUnlocked(true);
      setVaultName(name);
    }
    return data;
  }, []);

  const lock = useCallback(async () => {
    await fetch('/api/auth/lock', { method: 'POST' });
    setIsUnlocked(false);
  }, []);

  return (
    <AuthContext.Provider value={{ isUnlocked, isLoading, needsSetup, vaultName, unlock, setup, lock }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
