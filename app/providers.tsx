"use client";

import { ReactNode, useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { VaultProvider } from "@/context/VaultContext";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import MobileNav from "@/components/MobileNav";
import LoginGate from "./login-gate";
import { usePathname, redirect } from "next/navigation";
import { SoundProvider } from "@/context/SoundContext";
import BulkActionBar from "@/components/BulkActionBar";

function AppShell({ children }: { children: ReactNode }) {
  const { isAuthenticated, step } = useAuth();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const isSharePage = pathname?.startsWith("/share");

  if (!mounted) {
    return null;
  }

  // Bypassing login gate for share results
  if (isSharePage) {
    return <main className="animate-fadeIn">{children}</main>;
  }

  const isAuthPage = pathname === "/signin" || pathname === "/signup";
  const isLandingPage = pathname === "/";

  // Case 1: NOT authenticated
  if (!isAuthenticated || step !== "authenticated") {
    // If user is at root but has a session (pin/setup-pin), redirect to signin
    if (isLandingPage && (step === "pin" || step === "setup-pin")) {
      redirect("/signin");
    }

    // Landing Page and Share Pages are public
    if (isLandingPage || isSharePage) {
      return <main className="animate-fadeIn">{children}</main>;
    }
    
    // While loading, show a smooth splash/loading screen instead of redirecting
    if (step === "loading") {
      return (
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh',
          background: 'var(--bg-base)',
          color: 'var(--text-primary)',
          flexDirection: 'column',
          gap: 16
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            border: '2px solid var(--border-subtle)',
            borderTopColor: 'var(--accent-primary)',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Securely loading your vault...</p>
        </div>
      );
    }
    
    // Auth pages show the LoginGate directly
    if (isAuthPage) {
      return <LoginGate />;
    }
    
    // Any other page redirects to signin
    redirect("/signin");
  }

  // Case 2: AUTHENTICATED
  // Redirect away from landing page or auth pages if already logged in
  if ((isLandingPage || isAuthPage) && isAuthenticated && step === "authenticated") {
    redirect("/dashboard");
  }

  return (
    <VaultProvider>
      <div className="app-shell">
        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileSidebarOpen}
          onToggle={() => setCollapsed((p: boolean) => !p)}
          onClose={() => setMobileSidebarOpen(false)}
        />
        <div className={`main-content ${collapsed ? "sidebar-collapsed" : ""}`}>
          <TopBar
            collapsed={collapsed}
            onToggleSidebar={() => setMobileSidebarOpen((p: boolean) => !p)}
          />
          <main className="page-body animate-fadeIn">{children}</main>
        </div>
        <MobileNav />
        <BulkActionBar />
      </div>
    </VaultProvider>
  );
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <SoundProvider>
        <AppShell>{children}</AppShell>
      </SoundProvider>
    </AuthProvider>
  );
}
