"use client";

import { ReactNode, useState, useEffect } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { VaultProvider } from "@/context/VaultContext";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import MobileNav from "@/components/MobileNav";
import LoginGate from "./login-gate";
import { usePathname } from "next/navigation";
import { SoundProvider } from "@/context/SoundContext";

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

  // Keep logs minimal for production-like feel but helpful for debug
  if (mounted) {
    console.log("AppShell path:", pathname, "isShare:", isSharePage);
  }

  if (!mounted) {
    return null;
  }

  // Bypassing login gate for share results
  if (isSharePage) {
    return <main className="animate-fadeIn">{children}</main>;
  }

  // Still loading or auth step required
  if (!isAuthenticated || step !== "authenticated") {
    return <LoginGate />;
  }

  return (
    <VaultProvider>
      <div className="app-shell">
        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileSidebarOpen}
          onToggle={() => setCollapsed((p) => !p)}
          onClose={() => setMobileSidebarOpen(false)}
        />
        <div className={`main-content ${collapsed ? "sidebar-collapsed" : ""}`}>
          <TopBar
            collapsed={collapsed}
            onToggleSidebar={() => setMobileSidebarOpen((p) => !p)}
          />
          <main className="page-body animate-fadeIn">{children}</main>
        </div>
        <MobileNav />
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
