'use client';

import { ReactNode, useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { VaultProvider } from '@/context/VaultContext';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import MobileNav from '@/components/MobileNav';
import LoginGate from './login-gate';

function AppShell({ children }: { children: ReactNode }) {
  const { isUnlocked, isLoading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent-primary)', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading vault…</p>
      </div>
    );
  }

  if (!isUnlocked) return <LoginGate />;

  return (
    <VaultProvider>
      <div className="app-shell">
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(p => !p)} />
        <div className={`main-content ${collapsed ? 'sidebar-collapsed' : ''}`}>
          <TopBar collapsed={collapsed} />
          <main className="page-body animate-fadeIn">
            {children}
          </main>
        </div>
        <MobileNav />
      </div>
    </VaultProvider>
  );
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
