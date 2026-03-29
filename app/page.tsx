'use client';

import { useState, useMemo } from 'react';
import { KeyRound, CreditCard, FileText, ScanLine, Star, Plus, TrendingUp, Clock } from 'lucide-react';
import { useVault } from '@/context/VaultContext';
import Link from 'next/link';
import AddItemModal from '@/components/AddItemModal';
import ItemDetailModal from '@/components/ItemDetailModal';
import ItemCard from '@/components/ItemCard';
import ConfirmDialog from '@/components/ConfirmDialog';
import type { VaultItem } from '@/lib/types';

const STATS = [
  { label: 'Passwords', type: 'password', icon: KeyRound, color: 'var(--accent-primary)', bg: 'rgba(99,102,241,0.12)' },
  { label: 'Cards', type: 'card', icon: CreditCard, color: 'var(--accent-amber)', bg: 'rgba(245,158,11,0.12)' },
  { label: 'Documents', type: 'document', icon: FileText, color: 'var(--accent-emerald)', bg: 'rgba(16,185,129,0.12)' },
  { label: 'Scans', type: 'scan', icon: ScanLine, color: 'var(--accent-secondary)', bg: 'rgba(139,92,246,0.12)' },
];

export default function DashboardPage() {
  const { items, addItem, updateItem, deleteItem, folders } = useVault();
  const [addOpen, setAddOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<VaultItem | null>(null);
  const [editItem, setEditItem] = useState<VaultItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const recent = useMemo(() => [...items].sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 8), [items]);
  const favourites = useMemo(() => items.filter(i => i.isFavourite), [items]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Your personal credential vault</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
          <Plus size={16} /> Add Item
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {STATS.map(({ label, type, icon: Icon, color, bg }) => (
          <Link key={type} href={`/${type === 'password' ? 'passwords' : type + 's'}`} style={{ textDecoration: 'none' }}>
            <div className="stat-card" style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} style={{ color }} />
                </div>
                <div className="stat-label">{label}</div>
              </div>
              <div className="stat-value" style={{ color }}>{items.filter(i => i.type === type).length}</div>
            </div>
          </Link>
        ))}
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(244,63,94,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Star size={18} style={{ color: 'var(--accent-rose)' }} />
            </div>
            <div className="stat-label">Favourites</div>
          </div>
          <div className="stat-value" style={{ color: 'var(--accent-rose)' }}>{favourites.length}</div>
        </div>
      </div>

      {/* Favourites */}
      {favourites.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Star size={16} style={{ color: 'var(--accent-amber)' }} />
            <h2 style={{ fontSize: 16, fontWeight: 600 }}>Favourites</h2>
          </div>
          <div className="item-grid">
            {favourites.slice(0,4).map(item => (
              <ItemCard key={item._id} item={item} onClick={setDetailItem} onEdit={setEditItem} onDelete={setDeleteId} onToggleFav={(it) => updateItem(it._id, { isFavourite: !it.isFavourite })} />
            ))}
          </div>
        </div>
      )}

      {/* Recent */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Clock size={16} style={{ color: 'var(--text-secondary)' }} />
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>Recent</h2>
        </div>
        {recent.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔐</div>
            <h3 style={{ fontSize: 18, fontWeight: 600 }}>Vault is empty</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Add your first password, card, or document to get started.</p>
            <button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus size={15} /> Add Item</button>
          </div>
        ) : (
          <div className="item-grid">
            {recent.map(item => (
              <ItemCard key={item._id} item={item} onClick={setDetailItem} onEdit={setEditItem} onDelete={setDeleteId} onToggleFav={(it) => updateItem(it._id, { isFavourite: !it.isFavourite })} />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button className="fab" onClick={() => setAddOpen(true)} aria-label="Add item" title="Add item">+</button>

      {/* Modals */}
      <AddItemModal open={addOpen} onClose={() => setAddOpen(false)} folders={folders} onSave={(p) => addItem(p)} />
      <AddItemModal open={!!editItem} onClose={() => setEditItem(null)} existing={editItem} folders={folders} onSave={(p) => updateItem(editItem!._id, p)} />
      <ItemDetailModal item={detailItem} onClose={() => setDetailItem(null)} onEdit={() => { setEditItem(detailItem); setDetailItem(null); }} />
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { deleteItem(deleteId!); setDeleteId(null); }} message="Delete this item permanently?" />
    </>
  );
}
