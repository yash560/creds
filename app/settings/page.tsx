'use client';

import { useState } from 'react';
import { Shield, Plus, Trash2, Pencil, Download, User, CheckCircle, Lock } from 'lucide-react';
import { useVault } from '@/context/VaultContext';
import { useAuth } from '@/context/AuthContext';
import RoleBadge from '@/components/RoleBadge';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import type { FamilyMember, Role } from '@/lib/types';

export default function SettingsPage() {
  const { user, cryptoKey } = useAuth();
  const { members, addMember, updateMember, deleteMember } = useVault();
  
  const [addOpen, setAddOpen] = useState(false);
  const [editMember, setEditMember] = useState<FamilyMember | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('👤');
  const [role, setRole] = useState<Role>('viewer');
  
  const EMOJIS = ['👤','👨','👩','👴','👵','👦','👧','🧑','👨‍💼','👩‍💼'];

  const handleExport = async () => {
    const res = await fetch('/api/export');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `creds-hub-${Date.now()}.json`;
    a.click();
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Shield size={17} style={{ color: 'var(--accent-primary)' }} /></div>
            <h1 className="page-title">Settings</h1>
          </div>
        </div>
      </div>

      {/* My Account */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <User size={18} /> My Account
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          <div>
            <div className="form-label" style={{ marginBottom: 4 }}>Email Address</div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>{user?.email}</div>
          </div>
          <div>
            <div className="form-label" style={{ marginBottom: 4 }}>Vault Name</div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>{user?.vaultName}</div>
          </div>
          <div>
            <div className="form-label" style={{ marginBottom: 4 }}>Security Status</div>
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: 6, 
              padding: '4px 10px', 
              borderRadius: 20, 
              background: cryptoKey ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
              color: cryptoKey ? 'var(--accent-emerald)' : 'var(--accent-amber)',
              fontSize: 12,
              fontWeight: 600
            }}>
              {cryptoKey ? <Lock size={12} /> : <Shield size={12} />}
              {cryptoKey ? 'End-to-End Encrypted' : 'Standard Security'}
              {cryptoKey && <CheckCircle size={12} />}
            </div>
          </div>
        </div>
      </div>

      {/* Roles & Members */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Family Members & Roles</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Manage who has access to your vault</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={async () => {
              if ('contacts' in navigator && 'ContactsManager' in window) {
                try {
                  const props = ['name', 'email'];
                  const opts = { multiple: true };
                  // @ts-expect-error - Contacts API is not in standard TS types yet
                  const contacts = await navigator.contacts.select(props, opts);
                  if (contacts.length > 0) {
                    for (const contact of contacts) {
                      await addMember({ name: contact.name[0], role: 'viewer' });
                    }
                  }
                } catch (err) {
                  console.error('Contact picker failed', err);
                }
              } else {
                alert('Contact picking is not supported on this device/browser.');
              }
            }}>
              Sync Contacts
            </button>
            <button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus size={14} /> Add Member</button>
          </div>
        </div>

        {members.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: 13 }}>No family members yet</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {members.map(m => (
              <div key={m._id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 28 }}>{m.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{m.name}</div>
                  <RoleBadge role={m.role} />
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="action-btn" onClick={() => { setEditMember(m); setName(m.name); setEmoji(m.emoji || '👤'); setRole(m.role); }} aria-label="Edit"><Pencil size={14} /></button>
                  <button className="action-btn danger" onClick={() => setDeleteId(m._id)} aria-label="Delete"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Export / Import */}
      <div className="glass-card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Export & Import</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>Transfer your vault data between devices</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-ghost" onClick={handleExport}>
            <Download size={14} /> Export Vault JSON
          </button>
        </div>
      </div>

      {/* Add Member Modal */}
      <Modal open={addOpen} onClose={() => { setAddOpen(false); setName(''); setEmoji('👤'); setRole('viewer'); }} title="Add Member"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setAddOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={async () => { if (!name.trim()) return; await addMember({ name: name.trim(), emoji, role }); setName(''); setEmoji('👤'); setRole('viewer'); setAddOpen(false); }}>Add</button>
        </>}>
        <MemberForm name={name} setName={setName} emoji={emoji} setEmoji={setEmoji} role={role} setRole={setRole} EMOJIS={EMOJIS} />
      </Modal>

      {/* Edit Member Modal */}
      <Modal open={!!editMember} onClose={() => setEditMember(null)} title="Edit Member"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setEditMember(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={async () => { if (editMember && name.trim()) { await updateMember(editMember._id, { name: name.trim(), emoji, role }); setEditMember(null); } }}>Save</button>
        </>}>
        <MemberForm name={name} setName={setName} emoji={emoji} setEmoji={setEmoji} role={role} setRole={setRole} EMOJIS={EMOJIS} />
      </Modal>

      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { deleteMember(deleteId!); setDeleteId(null); }} message="Remove this family member?" confirmLabel="Remove" />
    </>
  );
}

function MemberForm({ name, setName, emoji, setEmoji, role, setRole, EMOJIS }: {
  name: string; setName: (s: string) => void;
  emoji: string; setEmoji: (s: string) => void;
  role: Role; setRole: (r: Role) => void;
  EMOJIS: string[];
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label">Name</label>
        <input className="form-input" value={name} onChange={e => setName(e.target.value)} autoFocus placeholder="e.g. Mom, Dad" />
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label">Avatar</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {EMOJIS.map(e => <button key={e} onClick={() => setEmoji(e)} style={{ fontSize: 22, width: 38, height: 38, borderRadius: 10, border: emoji === e ? '2px solid var(--accent-primary)' : '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer' }}>{e}</button>)}
        </div>
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label">Role</label>
        <select className="form-select" value={role} onChange={e => setRole(e.target.value as Role)}>
          <option value="admin">Admin — full access</option>
          <option value="editor">Editor — add &amp; edit</option>
          <option value="viewer">Viewer — read only</option>
        </select>
      </div>
    </div>
  );
}
