'use client';

import { ReactNode, useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { VaultProvider } from '@/context/VaultContext';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import MobileNav from '@/components/MobileNav';
import LoginGate from './login-gate';

function AppShell({ children }: { children: ReactNode }) {
  const { isAuthenticated, step } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  // Still loading or auth step required
  if (!isAuthenticated || step !== 'authenticated') {
    return <LoginGate />;
  }

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
