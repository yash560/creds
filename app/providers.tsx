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

function AppShell({ children }: { children: ReactNode }) {
  const { isAuthenticated, step, hasUsers } = useAuth();
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

  // Still loading or auth step required
  if (!isAuthenticated || step !== "authenticated") {
    // If not on an auth page or share page, redirect to signin
    if (!isAuthPage && !isSharePage) {
      // If we're on root and not authenticated, redirect to signin/signup
      if (pathname === "/") {
        redirect(hasUsers ? "/signin" : "/signup");
      }
      // For any other page, redirect to signin
      redirect("/signin");
    }
    
    // If we ARE on an auth page, allow rendering LoginGate
    return <LoginGate />;
  }

  // Redirect away from auth pages if already authenticated
  if (isAuthPage && isAuthenticated && step === "authenticated") {
    redirect("/");
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
