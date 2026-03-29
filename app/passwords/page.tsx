'use client';

import { useState, useMemo } from 'react';
import { Plus, KeyRound } from 'lucide-react';
import { useVault } from '@/context/VaultContext';
import ItemCard from '@/components/ItemCard';
import AddItemModal from '@/components/AddItemModal';
import ItemDetailModal from '@/components/ItemDetailModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import FolderTree from '@/components/FolderTree';
import type { VaultItem } from '@/lib/types';

export default function PasswordsPage() {
  const { items, addItem, updateItem, deleteItem, folders, searchQuery } = useVault();
  const [addOpen, setAddOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<VaultItem | null>(null);
  const [editItem, setEditItem] = useState<VaultItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [folderId, setFolderId] = useState<string | null | undefined>(undefined);

  const filtered = useMemo(() => {
    let list = items.filter(i => i.type === 'password');
    if (folderId !== undefined) list = list.filter(i => i.folderId === folderId);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i => i.title.toLowerCase().includes(q) || i.tags?.some(t => t.toLowerCase().includes(q)));
    }
    return list;
  }, [items, folderId, searchQuery]);

  return (
    <>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="item-type-icon icon-password" style={{ width: 36, height: 36 }}><KeyRound size={17} /></div>
            <h1 className="page-title">Passwords</h1>
          </div>
          <p className="page-subtitle">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus size={15} /> Add Password</button>
      </div>

      <div style={{ display: 'flex', gap: 20 }}>
        {/* Folder sidebar */}
        <div style={{ width: 200, flexShrink: 0 }}>
          <FolderTree activeFolderId={folderId} onSelect={setFolderId} />
        </div>

        {/* Cards */}
        <div style={{ flex: 1 }}>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔑</div>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>No passwords yet</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Store your logins securely</p>
              <button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus size={14} /> Add Password</button>
            </div>
          ) : (
            <div className="item-grid">
              {filtered.map(item => (
                <ItemCard key={item._id} item={item} onClick={setDetailItem} onEdit={setEditItem} onDelete={setDeleteId} onToggleFav={(it) => updateItem(it._id, { isFavourite: !it.isFavourite })} />
              ))}
            </div>
          )}
        </div>
      </div>

      <button className="fab" onClick={() => setAddOpen(true)} title="Add password">+</button>
      <AddItemModal open={addOpen} onClose={() => setAddOpen(false)} initialType="password" folders={folders} onSave={(p) => addItem(p)} />
      <AddItemModal open={!!editItem} onClose={() => setEditItem(null)} existing={editItem} folders={folders} onSave={(p) => updateItem(editItem!._id, p)} />
      <ItemDetailModal item={detailItem} onClose={() => setDetailItem(null)} onEdit={() => { setEditItem(detailItem); setDetailItem(null); }} />
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { deleteItem(deleteId!); setDeleteId(null); }} message="Delete this password permanently?" />
    </>
  );
}
