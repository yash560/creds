'use client';

import { useState, useMemo } from 'react';
import { Plus, FileText } from 'lucide-react';
import Link from 'next/link';
import { useVault } from '@/context/VaultContext';
import ItemCard from '@/components/ItemCard';
import AddItemModal from '@/components/AddItemModal';
import ItemDetailModal from '@/components/ItemDetailModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import FolderTree from '@/components/FolderTree';
import type { VaultItem } from '@/lib/types';

const CATEGORIES = [
  "All",
  "Aadhaar",
  "PAN",
  "Passport",
  "Visa",
  "Driving Licence",
  "Vehicle RC",
  "Insurance",
  "Medical",
  "Bank",
  "Other",
];

export default function DocumentsPage() {
  const { items, addItem, updateItem, deleteItem, folders, searchQuery } = useVault();
  const [addOpen, setAddOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<VaultItem | null>(null);
  const [editItem, setEditItem] = useState<VaultItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [category, setCategory] = useState('All');
  const [folderId, setFolderId] = useState<string | null | undefined>(undefined);

  const filtered = useMemo(() => {
    let list = items.filter(i => i.type === 'document');
    if (folderId !== undefined) list = list.filter(i => i.folderId === folderId);
    if (category !== 'All') list = list.filter(i => i.fields.category === category);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i => i.title.toLowerCase().includes(q) || i.tags?.some(t => t.toLowerCase().includes(q)));
    }
    return list;
  }, [items, folderId, category, searchQuery]);

  return (
    <>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="item-type-icon icon-document" style={{ width: 36, height: 36 }}><FileText size={17} /></div>
            <h1 className="page-title">Documents</h1>
          </div>
          <p className="page-subtitle">{filtered.length} document{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus size={15} /> Add Document</button>
      </div>

      <nav className="breadcrumb-row" aria-label="Breadcrumb">
        <Link href="/" className="breadcrumb-link">
          Vault
        </Link>
        <span className="breadcrumb-separator">/</span>
        <Link href="/documents" className="breadcrumb-link active">
          Documents
        </Link>
      </nav>

      {/* Category filter pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className={`btn ${category === c ? "btn-primary" : "btn-ghost"}`}
            style={{ padding: "5px 14px", fontSize: 12 }}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="documents-shell">
        <aside className="folder-sidebar">
          <FolderTree activeFolderId={folderId} onSelect={setFolderId} />
        </aside>
        <section className="documents-main">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📄</div>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>No documents</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Store Aadhaar, PAN, Passport and more</p>
              <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
                <Plus size={14} /> Add Document
              </button>
            </div>
          ) : (
            <div className="item-grid">
              {filtered.map((item) => (
                <ItemCard
                  key={item._id}
                  item={item}
                  onClick={setDetailItem}
                  onEdit={setEditItem}
                  onDelete={setDeleteId}
                  onToggleFav={(it) =>
                    updateItem(it._id, { isFavourite: !it.isFavourite })
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <button className="fab" onClick={() => setAddOpen(true)} title="Add document">+</button>
      <AddItemModal open={addOpen} onClose={() => setAddOpen(false)} initialType="document" folders={folders} onSave={async (p) => { await addItem(p); }} />
      <AddItemModal open={!!editItem} onClose={() => setEditItem(null)} existing={editItem} folders={folders} onSave={async (p) => { await updateItem(editItem!._id, p); }} />
      <ItemDetailModal item={detailItem} onClose={() => setDetailItem(null)} onEdit={() => { setEditItem(detailItem); setDetailItem(null); }} />
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { deleteItem(deleteId!); setDeleteId(null); }} message="Delete this document permanently?" />
    </>
  );
}
