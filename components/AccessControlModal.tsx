'use client';

import { useState, useEffect } from 'react';
import { Lock, Loader2 } from 'lucide-react';
import Modal from './Modal';
import type { FamilyMember } from '@/lib/types';

interface AccessControlModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  members: FamilyMember[];
  initialRestrictedTo: string[];
  onSave: (restrictedTo: string[]) => Promise<void>;
  description?: string;
}

export default function AccessControlModal({
  open,
  onClose,
  title,
  members,
  initialRestrictedTo,
  onSave,
  description
}: AccessControlModalProps) {
  const [restrictedTo, setRestrictedTo] = useState<string[]>(initialRestrictedTo);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setRestrictedTo(initialRestrictedTo);
    }
  }, [open, initialRestrictedTo]);

  const handleToggle = (memberId: string) => {
    setRestrictedTo(prev => {
      if (prev.includes(memberId)) {
        return prev.filter(id => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  };

  const handleToggleEveryone = () => {
    if (restrictedTo.length === members.length) {
      setRestrictedTo([]);
    } else {
      setRestrictedTo(members.map(m => m._id));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button 
            className="btn btn-primary" 
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try {
                // Return empty array for "Private to Owner"
                await onSave(restrictedTo);
                onClose();
              } catch (err) {
                console.error(err);
              } finally {
                setLoading(false);
              }
            }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : "Save Changes"}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {description && (
          <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: 10, display: 'flex', gap: 12, alignItems: 'center' }}>
            <Lock size={18} color="var(--accent-primary)" strokeWidth={2.5} />
            <div style={{ fontSize: 13, lineHeight: 1.4 }}>{description}</div>
          </div>
        )}

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <label className="form-label" style={{ marginBottom: 0 }}>Who can access this?</label>
            <button 
              className="text-link" 
              style={{ fontSize: 11, border: 'none', background: 'none' }}
              onClick={handleToggleEveryone}
            >
              {restrictedTo.length === members.length ? 'Revoke All' : 'Grant All'}
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {members.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                No members added yet. Add members in the Family section to manage access.
              </p>
            ) : (
              members.map(m => (
                <label key={m._id} style={{ 
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', 
                  background: 'var(--bg-card)', borderRadius: 10, cursor: 'pointer',
                  border: restrictedTo.includes(m._id) ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
                  transition: 'all 0.2s ease'
                }}>
                  <input 
                    type="checkbox" 
                    checked={restrictedTo.includes(m._id)} 
                    onChange={() => handleToggle(m._id)}
                  />
                  <div style={{ fontSize: 20 }}>{m.emoji}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.role}</div>
                  </div>
                </label>
              ))
            )}
          </div>
          {restrictedTo.length === 0 && (
            <p style={{ marginTop: 12, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
              Only you (Vault Owner) and Admins can see this item currently.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
