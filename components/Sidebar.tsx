'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, KeyRound, CreditCard, FileText,
  Users, FolderOpen, ScanLine, Settings,
  Shield, ChevronLeft, ChevronRight, Lock
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Tooltip from './Tooltip';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const NAV = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Passwords', href: '/passwords', icon: KeyRound },
  { label: 'Cards', href: '/cards', icon: CreditCard },
  { label: 'Documents', href: '/documents', icon: FileText },
  { label: 'Family', href: '/family', icon: Users },
  { label: 'Folders', href: '/folders', icon: FolderOpen },
  { label: 'Scan', href: '/scan', icon: ScanLine },
];

const SETTINGS_NAV = [
  { label: 'Roles & Members', href: '/settings/roles', icon: Shield },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { lock, vaultName } = useAuth();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
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
          <Tooltip key={href} label={collapsed ? label : ''}>
            <Link
              href={href}
              className={`nav-item ${isActive(href) ? 'active' : ''}`}
              style={{ justifyContent: collapsed ? 'center' : undefined }}
            >
              <Icon size={18} className="nav-icon" />
              {!collapsed && <span>{label}</span>}
            </Link>
          </Tooltip>
        ))}

        <div className="divider" />
        {!collapsed && <div className="sidebar-section-label">Account</div>}

        {SETTINGS_NAV.map(({ label, href, icon: Icon }) => (
          <Tooltip key={href} label={collapsed ? label : ''}>
            <Link
              href={href}
              className={`nav-item ${isActive(href) ? 'active' : ''}`}
              style={{ justifyContent: collapsed ? 'center' : undefined }}
            >
              <Icon size={18} className="nav-icon" />
              {!collapsed && <span>{label}</span>}
            </Link>
          </Tooltip>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <Tooltip label="Lock vault">
          <button
            onClick={() => lock()}
            className="nav-item"
            style={{ width: '100%', background: 'none', border: 'none', justifyContent: collapsed ? 'center' : undefined, cursor: 'pointer' }}
          >
            <Lock size={18} className="nav-icon" style={{ color: 'var(--accent-rose)' }} />
            {!collapsed && <span style={{ color: 'var(--accent-rose)' }}>Lock Vault</span>}
          </button>
        </Tooltip>

        <Tooltip label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <button
            onClick={onToggle}
            className="nav-item"
            style={{ width: '100%', background: 'none', border: 'none', justifyContent: collapsed ? 'center' : undefined, cursor: 'pointer', marginTop: 4 }}
          >
            {collapsed
              ? <ChevronRight size={18} className="nav-icon" />
              : <><ChevronLeft size={18} className="nav-icon" /><span>Collapse</span></>
            }
          </button>
        </Tooltip>
      </div>
    </aside>
  );
}
