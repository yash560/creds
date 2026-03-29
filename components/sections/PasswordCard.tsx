'use client';

import { useState } from 'react';
import { Eye, EyeOff, Copy, Check } from 'lucide-react';
import type { PasswordItem } from '@/lib/types';
import CopyButton from '../CopyButton';
import Tooltip from '../Tooltip';

interface PasswordCardProps {
  item: PasswordItem;
  onEdit: () => void;
  onDelete: () => void;
}

function strengthScore(pwd: string): number {
  let s = 0;
  if (pwd.length >= 8) s++;
  if (pwd.length >= 12) s++;
  if (/[A-Z]/.test(pwd)) s++;
  if (/[0-9]/.test(pwd)) s++;
  if (/[^A-Za-z0-9]/.test(pwd)) s++;
  return s;
}

const STRENGTH_LABELS = ['', 'Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];
const STRENGTH_COLORS = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];

export default function PasswordDetailView({ item, onEdit, onDelete }: PasswordCardProps) {
  const [showPwd, setShowPwd] = useState(false);
  const strength = strengthScore(item.fields.password || '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Username */}
      <div>
        <div className="form-label">Username / Email</div>
        <div className="input-with-action">
          <div className="form-input" style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
            {item.fields.username || <span style={{ color: 'var(--text-muted)' }}>—</span>}
          </div>
          {item.fields.username && <CopyButton value={item.fields.username} label="Copy username" />}
        </div>
      </div>

      {/* Password */}
      <div>
        <div className="form-label">Password</div>
        <div className="input-with-action">
          <div className="form-input mono" style={{ flex: 1, display: 'flex', alignItems: 'center', letterSpacing: showPwd ? '0.05em' : '0.2em' }}>
            {showPwd ? item.fields.password : '•'.repeat(Math.min(item.fields.password?.length || 0, 16))}
          </div>
          <Tooltip label={showPwd ? 'Hide' : 'Show'}>
            <button className="action-btn" onClick={() => setShowPwd((p) => !p)} aria-label="Toggle password visibility">
              {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </Tooltip>
          {item.fields.password && <CopyButton value={item.fields.password} label="Copy password" />}
        </div>

        {/* Strength meter */}
        {item.fields.password && (
          <div style={{ marginTop: 8 }}>
            <div className="strength-bar">
              <div
                className="strength-fill"
                style={{
                  width: `${(strength / 5) * 100}%`,
                  background: STRENGTH_COLORS[strength],
                }}
              />
            </div>
            <div style={{ fontSize: 11, color: STRENGTH_COLORS[strength], marginTop: 4 }}>
              {STRENGTH_LABELS[strength]}
            </div>
          </div>
        )}
      </div>

      {/* URL */}
      {item.fields.url && (
        <div>
          <div className="form-label">Website</div>
          <div className="input-with-action">
            <a
              href={item.fields.url.startsWith('http') ? item.fields.url : `https://${item.fields.url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="form-input"
              style={{ flex: 1, color: 'var(--accent-cyan)', textDecoration: 'none', display: 'flex', alignItems: 'center' }}
            >
              {item.fields.url}
            </a>
            <CopyButton value={item.fields.url} label="Copy URL" />
          </div>
        </div>
      )}

      {/* Notes */}
      {item.fields.notes && (
        <div>
          <div className="form-label">Notes</div>
          <div className="form-textarea" style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: 14, whiteSpace: 'pre-wrap' }}>
            {item.fields.notes}
          </div>
        </div>
      )}
    </div>
  );
}
