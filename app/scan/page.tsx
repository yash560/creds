'use client';

import { useState, useMemo } from 'react';
import { Plus, ScanLine } from 'lucide-react';
import { useVault } from '@/context/VaultContext';
import ItemCard from '@/components/ItemCard';
import AddItemModal from '@/components/AddItemModal';
import ItemDetailModal from '@/components/ItemDetailModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { filterItems } from '@/lib/search-utils';
import type { VaultItem } from '@/lib/types';

export default function ScanPage() {
  const { items, addItem, updateItem, deleteItem, folders, members, searchQuery } = useVault();
  const [addOpen, setAddOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<VaultItem | null>(null);
  const [editItem, setEditItem] = useState<VaultItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = items.filter(i => i.type === 'scan');
    return filterItems(list, searchQuery, folders, members);
  }, [items, searchQuery, folders, members]);

  return (
    <>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="item-type-icon icon-scan" style={{ width: 36, height: 36 }}><ScanLine size={17} /></div>
            <h1 className="page-title">Scan & Upload</h1>
          </div>
          <p className="page-subtitle">Use live camera or upload images and PDFs when adding a scan</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus size={15} /> Add Scan</button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📷</div>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>No scans yet</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Capture or upload document images to store them securely</p>
          <button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus size={14} /> Upload Scan</button>
        </div>
      ) : (
        <div className="item-grid">
          {filtered.map(item => (
            <ItemCard key={item._id} item={item} members={members} onClick={setDetailItem} onEdit={setEditItem} onDelete={setDeleteId} onToggleFav={(it) => updateItem(it._id, { isFavourite: !it.isFavourite })} />
          ))}
        </div>
      )}

      <button className="fab" onClick={() => setAddOpen(true)} title="Add scan">📷</button>
      <AddItemModal open={addOpen} onClose={() => setAddOpen(false)} initialType="scan" folders={folders} members={members} onSave={async (p) => { await addItem(p); }} />
      <AddItemModal open={!!editItem} onClose={() => setEditItem(null)} existing={editItem} folders={folders} members={members} onSave={async (p) => { await updateItem(editItem!._id, p); }} />
      <ItemDetailModal item={detailItem} onClose={() => setDetailItem(null)} onEdit={() => { setEditItem(detailItem); setDetailItem(null); }} />
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { deleteItem(deleteId!); setDeleteId(null); }} />
    </>
  );
}
