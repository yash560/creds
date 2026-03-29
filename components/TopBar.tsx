'use client';

import { useRef, useEffect, useState } from 'react';
import { Search, Bell, Lock } from 'lucide-react';
import { useVault } from '@/context/VaultContext';
import { useAuth } from '@/context/AuthContext';
import Tooltip from './Tooltip';

interface TopBarProps {
  collapsed: boolean;
}

export default function TopBar({ collapsed }: TopBarProps) {
  const { searchQuery, setSearchQuery } = useVault();
  const { lock, vaultName } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localQ, setLocalQ] = useState(searchQuery);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(localQ), 300);
    return () => clearTimeout(t);
  }, [localQ, setSearchQuery]);

  // CMD+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <header className={`topbar ${collapsed ? 'sidebar-collapsed' : ''}`}>
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Tooltip label="Lock vault">
          <button className="btn btn-ghost btn-icon" onClick={() => lock()} aria-label="Lock vault">
            <Lock size={16} style={{ color: 'var(--accent-rose)' }} />
          </button>
        </Tooltip>

        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0,
          cursor: 'pointer'
        }}>
          {vaultName.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
