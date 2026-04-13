"use client";

import { useRef, useEffect, useState } from "react";
import { Menu, Search, Lock, User, LogOut, Settings, Volume2, VolumeX, Users, Check } from "lucide-react";
import { useVault } from "@/context/VaultContext";
import { useAuth } from "@/context/AuthContext";
import { useSound } from "@/context/SoundContext";
import { useRouter } from "next/navigation";
import Tooltip from "./Tooltip";

interface TopBarProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
}

export default function TopBar({ collapsed, onToggleSidebar }: TopBarProps) {
  const { searchQuery, setSearchQuery, members, memberFilter, setMemberFilter } = useVault();
  const { lock, signOut, vaultName, user } = useAuth();
  const { isMuted, toggleMute } = useSound();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localQ, setLocalQ] = useState(searchQuery);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const memberDropdownRef = useRef<HTMLDivElement>(null);

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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
      if (
        memberDropdownRef.current &&
        !memberDropdownRef.current.contains(e.target as Node)
      ) {
        setMemberDropdownOpen(false);
      }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    await signOut();
    router.push("/");
    setDropdownOpen(false);
  };

  return (
    <header className={`topbar ${collapsed ? "sidebar-collapsed" : ""}`}>
      {/* Left side */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          className="hamburger-btn"
          onClick={onToggleSidebar}
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>
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
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Right actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Member Quick Filters */}
        {members.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Tooltip label="All Members">
              <button
                onClick={() => setMemberFilter(null)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  cursor: "pointer",
                  border: !memberFilter 
                    ? "2px solid var(--accent-primary)" 
                    : "1px solid var(--border)",
                  backgroundColor: !memberFilter 
                    ? "rgba(var(--accent-primary-rgb), 0.1)" 
                    : "var(--bg-card)",
                  color: !memberFilter ? "var(--accent-primary)" : "var(--text-secondary)",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  transform: !memberFilter ? "scale(1.1)" : "scale(1)",
                }}
              >
                <Users size={16} />
              </button>
            </Tooltip>

            <div style={{ width: 1, height: 16, backgroundColor: "var(--border)", margin: "0 2px" }} />

            {members.slice(0, 5).map((member) => (
              <Tooltip key={member._id} label={member.name}>
                <button
                  onClick={() => setMemberFilter(memberFilter === member._id ? null : member._id)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    cursor: "pointer",
                    border: memberFilter === member._id 
                      ? "2px solid var(--accent-primary)" 
                      : "1px solid var(--border)",
                    backgroundColor: memberFilter === member._id 
                      ? "rgba(var(--accent-primary-rgb), 0.1)" 
                      : "var(--bg-card)",
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    transform: memberFilter === member._id ? "scale(1.1)" : "scale(1)",
                  }}
                  className={`topbar-member-btn ${memberFilter === member._id ? 'active' : ''}`}
                >
                  {member.emoji || "👤"}
                </button>
              </Tooltip>
            ))}

            {/* More Members Dropdown */}
            <div ref={memberDropdownRef} style={{ position: "relative" }}>
              {members.length > 5 && (
                <Tooltip label="More members">
                  <button
                    onClick={() => setMemberDropdownOpen(!memberDropdownOpen)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      border: memberDropdownOpen ? "2px solid var(--accent-primary)" : "1px solid var(--border)",
                      backgroundColor: memberDropdownOpen ? "rgba(var(--accent-primary-rgb), 0.1)" : "var(--bg-card)",
                      color: memberDropdownOpen ? "var(--accent-primary)" : "var(--text-muted)",
                      transition: "all 0.2s",
                    }}
                  >
                    +{members.length - 5}
                  </button>
                </Tooltip>
              )}

              {memberDropdownOpen && (
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
                    minWidth: 180,
                    zIndex: 10000,
                    overflow: "hidden",
                    padding: 4,
                  }}
                >
                  {members.map(member => (
                    <button
                      key={member._id}
                      onClick={() => {
                        setMemberFilter(member._id);
                        setMemberDropdownOpen(false);
                      }}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        textAlign: "left",
                        background: memberFilter === member._id ? "var(--bg-hover)" : "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 13,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        borderRadius: "var(--radius-sm)",
                        color: memberFilter === member._id ? "var(--accent-primary)" : "var(--text-primary)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 16 }}>{member.emoji || "👤"}</span>
                        <span>{member.name}</span>
                      </div>
                      {memberFilter === member._id && <Check size={14} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ width: 1, height: 20, backgroundColor: "var(--border)", margin: "0 4px" }} />
          </div>
        )}

        <Tooltip label={isMuted ? "Unmute" : "Mute interactions"}>
          <button
            className="btn btn-ghost btn-icon"
            onClick={toggleMute}
            aria-label="Toggle mute"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </Tooltip>

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
                className="topbar-dropdown-item"
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
                className="topbar-dropdown-item"
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
                  className="topbar-dropdown-item logout"
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
