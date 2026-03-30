"use client";

import { useRef, useEffect, useState } from "react";
import { Search, Lock, User, LogOut, Settings } from "lucide-react";
import { useVault } from "@/context/VaultContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Tooltip from "./Tooltip";

interface TopBarProps {
  collapsed: boolean;
}

export default function TopBar({ collapsed }: TopBarProps) {
  const { searchQuery, setSearchQuery } = useVault();
  const { lock, vaultName, user } = useAuth();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localQ, setLocalQ] = useState(searchQuery);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(localQ), 300);
    return () => clearTimeout(t);
  }, [localQ, setSearchQuery]);

  // CMD+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/lock", { method: "POST" });
    router.push("/");
    setDropdownOpen(false);
  };

  return (
    <header className={`topbar ${collapsed ? "sidebar-collapsed" : ""}`}>
      {/* Search */}
      <div className="search-bar">
        <Search size={15} className="search-icon" />
        <input
          ref={inputRef}
          type="search"
          placeholder="Search vault… (⌘K)"
          value={localQ}
          onChange={(e) => setLocalQ(e.target.value)}
          className="search-input"
          id="global-search"
        />
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Right actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Tooltip label="Lock vault">
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => lock()}
            aria-label="Lock vault"
          >
            <Lock size={16} style={{ color: "var(--accent-rose)" }} />
          </button>
        </Tooltip>

        {/* Profile dropdown */}
        <div ref={dropdownRef} style={{ position: "relative", zIndex: 1001 }}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 700,
              color: "white",
              flexShrink: 0,
              cursor: "pointer",
              border: "none",
              padding: 0,
            }}
            aria-label="Profile menu"
          >
            {vaultName.charAt(0).toUpperCase()}
          </button>

          {/* Dropdown menu */}
          {dropdownOpen && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: 8,
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                boxShadow: "var(--shadow-lg)",
                minWidth: 200,
                zIndex: 10000,
                overflow: "visible",
              }}
            >
              {/* Email display */}
              {user && (
                <div
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--border)",
                    fontSize: 12,
                    opacity: 0.7,
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    {user.email}
                  </div>
                  <div style={{ fontSize: 11 }}>{vaultName}</div>
                </div>
              )}

              {/* Menu items */}
              <button
                onClick={() => {
                  router.push("/profile");
                  setDropdownOpen(false);
                }}
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  transition: "background-color 0.2s",
                  color: "var(--text-primary)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "var(--bg-hover)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                <User size={16} /> Profile
              </button>

              <button
                onClick={() => {
                  router.push("/settings");
                  setDropdownOpen(false);
                }}
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  transition: "background-color 0.2s",
                  color: "var(--text-primary)",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "var(--bg-hover)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                <Settings size={16} /> Settings
              </button>

              {/* Logout */}
              <div style={{ borderTop: "1px solid var(--border)" }}>
                <button
                  onClick={handleLogout}
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    transition: "background-color 0.2s",
                    color: "var(--accent-rose)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "var(--bg-hover)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
