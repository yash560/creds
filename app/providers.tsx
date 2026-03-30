"use client";

import { ReactNode, useState } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { VaultProvider } from "@/context/VaultContext";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import MobileNav from "@/components/MobileNav";
import LoginGate from "./login-gate";

function AppShell({ children }: { children: ReactNode }) {
  const { isAuthenticated, step } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  console.log(
    "AppShell render - isAuthenticated:",
    isAuthenticated,
    "step:",
    step,
  ); // Debug log

  // Still loading or auth step required
  if (!isAuthenticated || step !== "authenticated") {
    console.log("Showing LoginGate"); // Debug log
    return <LoginGate />;
  }

  console.log("Mounting VaultProvider"); // Debug log
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
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
