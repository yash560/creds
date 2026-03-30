'use client';

import { useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { useVault } from '@/context/VaultContext';
import Modal from '@/components/Modal';
import ItemCard from '@/components/ItemCard';
import ItemDetailModal from '@/components/ItemDetailModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import AddItemModal from '@/components/AddItemModal';
import RoleBadge from '@/components/RoleBadge';
import type { FamilyMember, VaultItem, Role } from '@/lib/types';

export default function FamilyPage() {
  const { members, addMember, items, addItem, updateItem, deleteItem, folders } = useVault();
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('👤');
  const [role, setRole] = useState<Role>('viewer');
  const [selected, setSelected] = useState<FamilyMember | null>(null);
  const [detailItem, setDetailItem] = useState<VaultItem | null>(null);
  const [editItem, setEditItem] = useState<VaultItem | null>(null);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const memberItems = selected ? items.filter(i => i.tags?.includes(selected.name)) : [];

  const EMOJIS = ['👤','👨','👩','👴','👵','👦','👧','🧑','👨‍💼','👩‍💼'];

  return (
    <>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="item-type-icon icon-family" style={{ width: 36, height: 36 }}><Users size={17} /></div>
            <h1 className="page-title">Family</h1>
          </div>
          <p className="page-subtitle">Person-wise document organisation</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAddMemberOpen(true)}><Plus size={15} /> Add Member</button>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* Member list */}
        <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {members.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 16px', fontSize: 13 }}>
              No family members yet
            </div>
          ) : members.map(m => (
            <div
              key={m._id}
              className={`glass-card`}
              style={{ padding: '14px 16px', cursor: 'pointer', border: selected?._id === m._id ? '1px solid var(--accent-primary)' : undefined }}
              onClick={() => setSelected(m._id === selected?._id ? null : m)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 26 }}>{m.emoji}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
                  <RoleBadge role={m.role} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Member content */}
        <div style={{ flex: 1 }}>
          {!selected ? (
            <div className="empty-state">
              <div className="empty-icon">👨‍👩‍👧‍👦</div>
              <p>Select a family member to view their documents</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 40 }}>{selected.emoji}</div>
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700 }}>{selected.name}</h2>
                    <RoleBadge role={selected.role} />
                  </div>
                </div>
                <button className="btn btn-primary" onClick={() => setAddItemOpen(true)}><Plus size={14} /> Add Doc</button>
              </div>
              {memberItems.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📄</div>
                  <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>No items tagged for {selected.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Add items and tag them with &quot;{selected.name}&quot;</p>
                </div>
              ) : (
                <div className="item-grid">
                  {memberItems.map(item => (
                    <ItemCard key={item._id} item={item} onClick={setDetailItem} onEdit={setEditItem} onDelete={setDeleteId} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      <Modal open={addMemberOpen} onClose={() => setAddMemberOpen(false)} title="Add Family Member"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setAddMemberOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={async () => {
              if (!name.trim()) return;
              await addMember({ name: name.trim(), emoji, role });
              setName(''); setEmoji('👤'); setRole('viewer');
              setAddMemberOpen(false);
            }}>Add Member</button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Name</label>
            <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Mom, Dad, Yash" autoFocus />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Avatar</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {EMOJIS.map(e => (
                <button key={e} onClick={() => setEmoji(e)} style={{ fontSize: 24, width: 40, height: 40, borderRadius: 10, border: emoji === e ? '2px solid var(--accent-primary)' : '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer' }}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Role</label>
            <select className="form-select" value={role} onChange={e => setRole(e.target.value as Role)}>
              <option value="admin">Admin (full access)</option>
              <option value="editor">Editor (add & edit)</option>
              <option value="viewer">Viewer (read only)</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Add item for member */}
      <AddItemModal open={addItemOpen} onClose={() => setAddItemOpen(false)} initialType="document" folders={folders}
        onSave={async (p) => { await addItem({ ...p, tags: [...(p.tags || []), selected?.name || ''] }); }}
      />
      <ItemDetailModal item={detailItem} onClose={() => setDetailItem(null)} onEdit={() => { setEditItem(detailItem); setDetailItem(null); }} />
      <AddItemModal open={!!editItem} onClose={() => setEditItem(null)} existing={editItem} folders={folders} onSave={async (p) => { await updateItem(editItem!._id, p); }} />
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { deleteItem(deleteId!); setDeleteId(null); }} />
    </>
  );
}
