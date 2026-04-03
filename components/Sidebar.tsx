"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  KeyRound,
  CreditCard,
  FileText,
  Users,
  FolderOpen,
  ScanLine,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
  Lock,
  CircleHelp,
  User,
} from "lucide-react";
import HelpGuideModal from "./HelpGuideModal";
import { useAuth } from "@/context/AuthContext";
import Tooltip from "./Tooltip";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onClose?: () => void;
}

const NAV = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Passwords", href: "/passwords", icon: KeyRound },
  { label: "Cards", href: "/cards", icon: CreditCard },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "People", href: "/family", icon: Users },
  { label: "Folders", href: "/folders", icon: FolderOpen },
  { label: "Scan", href: "/scan", icon: ScanLine },
];

const SETTINGS_NAV = [
  { label: "Profile", href: "/profile", icon: User },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar({
  collapsed,
  onToggle,
  mobileOpen = false,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const { lock, vaultName } = useAuth();
  const [helpOpen, setHelpOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <aside
        className={`sidebar ${collapsed ? "collapsed" : ""} ${
          mobileOpen ? "mobile-open" : ""
        }`}
      >
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <Shield size={16} color="white" />
          </div>
          {!collapsed && <span className="sidebar-logo-text">{vaultName}</span>}
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {!collapsed && <div className="sidebar-section-label">Vault</div>}

          {NAV.map(({ label, href, icon: Icon }) => (
            <Tooltip key={href} label={collapsed ? label : ""}>
              <Link
                href={href}
                className={`nav-item ${isActive(href) ? "active" : ""}`}
                style={{ justifyContent: collapsed ? "center" : undefined }}
              >
                <Icon size={18} className="nav-icon" />
                {!collapsed && <span>{label}</span>}
              </Link>
            </Tooltip>
          ))}

          <div className="divider" />
          {!collapsed && <div className="sidebar-section-label">Account</div>}

          {SETTINGS_NAV.map(({ label, href, icon: Icon }) => (
            <Tooltip key={href} label={collapsed ? label : ""}>
              <Link
                href={href}
                className={`nav-item ${isActive(href) ? "active" : ""}`}
                style={{ justifyContent: collapsed ? "center" : undefined }}
              >
                <Icon size={18} className="nav-icon" />
                {!collapsed && <span>{label}</span>}
              </Link>
            </Tooltip>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <Tooltip label={collapsed ? "How to use" : ""}>
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="nav-item"
              style={{
                width: "100%",
                background: "none",
                border: "none",
                justifyContent: collapsed ? "center" : undefined,
                cursor: "pointer",
                color: "var(--accent-cyan)",
              }}
            >
              <CircleHelp size={18} className="nav-icon" />
              {!collapsed && <span>How to use</span>}
            </button>
          </Tooltip>

          <Tooltip label={collapsed ? "Lock vault" : ""}>
            <button
              onClick={() => lock()}
              className="nav-item"
              style={{
                width: "100%",
                background: "none",
                border: "none",
                justifyContent: collapsed ? "center" : undefined,
                cursor: "pointer",
              }}
            >
              <Lock
                size={18}
                className="nav-icon"
                style={{ color: "var(--accent-rose)" }}
              />
              {!collapsed && (
                <span style={{ color: "var(--accent-rose)" }}>Lock Vault</span>
              )}
            </button>
          </Tooltip>

          <Tooltip label={collapsed ? "Expand sidebar" : ""}>
            <button
              onClick={onToggle}
              className="nav-item"
              style={{
                width: "100%",
                background: "none",
                border: "none",
                justifyContent: collapsed ? "center" : undefined,
                cursor: "pointer",
                marginTop: 4,
              }}
            >
              {collapsed ? (
                <ChevronRight size={18} className="nav-icon" />
              ) : (
                <>
                  <ChevronLeft size={18} className="nav-icon" />
                  <span>Collapse</span>
                </>
              )}
            </button>
          </Tooltip>
        </div>
      </aside>
      {mobileOpen && onClose && (
        <div className="sidebar-backdrop" onClick={onClose} />
      )}
      <HelpGuideModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
