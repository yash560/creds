'use client';

import { useState, useMemo } from 'react';
import { Plus, CreditCard } from 'lucide-react';
import { useVault } from '@/context/VaultContext';
import ItemCard from '@/components/ItemCard';
import AddItemModal from '@/components/AddItemModal';
import ItemDetailModal from '@/components/ItemDetailModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { GridSkeleton } from '@/components/SkeletonLoader';
import type { VaultItem } from '@/lib/types';

export default function CardsPage() {
  const { items, addItem, updateItem, deleteItem, folders, members, searchQuery, isLoading } = useVault();
  const [addOpen, setAddOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<VaultItem | null>(null);
  const [editItem, setEditItem] = useState<VaultItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = items.filter(i => i.type === 'card');
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i => i.title.toLowerCase().includes(q));
    }
    return list;
  }, [items, searchQuery]);

  return (
    <>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="item-type-icon icon-card" style={{ width: 36, height: 36 }}><CreditCard size={17} /></div>
            <h1 className="page-title">Cards</h1>
          </div>
          <p className="page-subtitle">{filtered.length} card{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus size={15} /> Add Card</button>
      </div>

      {isLoading ? (
        <GridSkeleton count={6} />
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💳</div>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>No cards yet</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Store credit, debit, or prepaid cards</p>
          <button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus size={14} /> Add Card</button>
        </div>
      ) : (
        <div className="item-grid">
          {filtered.map(item => (
            <ItemCard key={item._id} item={item} members={members} onClick={setDetailItem} onEdit={setEditItem} onDelete={setDeleteId} onToggleFav={(it) => updateItem(it._id, { isFavourite: !it.isFavourite })} />
          ))}
        </div>
      )}

      <button className="fab" onClick={() => setAddOpen(true)} title="Add card">+</button>
      <AddItemModal open={addOpen} onClose={() => setAddOpen(false)} initialType="card" folders={folders} members={members} onSave={async (p) => { await addItem(p); }} />
      <AddItemModal open={!!editItem} onClose={() => setEditItem(null)} existing={editItem} folders={folders} members={members} onSave={async (p) => { await updateItem(editItem!._id, p); }} />
      <ItemDetailModal item={detailItem} onClose={() => setDetailItem(null)} onEdit={() => { setEditItem(detailItem); setDetailItem(null); }} />
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { deleteItem(deleteId!); setDeleteId(null); }} message="Delete this card permanently?" />
    </>
  );
}
