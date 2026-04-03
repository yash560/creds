'use client';

import { useState, useMemo } from 'react';
import { Plus, FileText, Menu, X } from 'lucide-react';
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
  const { items, addItem, updateItem, deleteItem, folders, members, searchQuery } = useVault();
  const [addOpen, setAddOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<VaultItem | null>(null);
  const [editItem, setEditItem] = useState<VaultItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [category, setCategory] = useState('All');
  const [folderId, setFolderId] = useState<string | null | undefined>(undefined);
  const [folderPanelOpen, setFolderPanelOpen] = useState(false);

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

  const handleFolderSelect = (next: string | null) => {
    setFolderId(next);
    setFolderPanelOpen(false);
  };

  return (
    <div className="page-layout animate-fadeIn">
      {/* Refined Header */}
      <header className="page-header-new">
        <div className="header-main-row">
          <div className="title-with-icon">
            <div className="item-type-icon icon-document">
              <FileText size={20} />
            </div>
            <div>
              <h1 className="page-title">Documents</h1>
              <p className="page-subtitle">{filtered.length} document{filtered.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          
          <div className="header-actions">
            <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
              <Plus size={16} /> Add Document
            </button>
            <button
              type="button"
              className="panel-toggle mobile-only"
              onClick={() => setFolderPanelOpen((p) => !p)}
            >
              <Menu size={16} />
            </button>
          </div>
        </div>

        <nav className="breadcrumb-nav" aria-label="Breadcrumb">
          <Link href="/" className="breadcrumb-item">Vault</Link>
          <span className="breadcrumb-divider">/</span>
          <span className="breadcrumb-item active">Documents</span>
        </nav>
      </header>

      <div className="page-content-grid">
        {/* Sidebar for Desktop */}
        <aside className={`folder-sidebar-new ${folderPanelOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            <h3>Folders</h3>
            <button className="mobile-only close-btn" onClick={() => setFolderPanelOpen(false)}>
              <X size={20} />
            </button>
          </div>
          <div className="folder-tree-container">
            <FolderTree activeFolderId={folderId} onSelect={handleFolderSelect} />
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content-area">
          <div className="category-scroll-wrapper">
            <div className="category-pills" role="toolbar">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  className={`pill-btn ${category === c ? 'active' : ''}`}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state-card">
              <div className="empty-icon">📂</div>
              <h3>No documents found</h3>
              <p>Organize your IDs, certificates, and records securely.</p>
              <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
                <Plus size={16} /> Add Document
              </button>
            </div>
          ) : (
            <div className="item-grid">
              {filtered.map((item) => (
                <ItemCard
                  key={item._id}
                  item={item}
                  members={members}
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
        </main>
      </div>

      {/* Backdrop & Modals */}
      {folderPanelOpen && (
        <div className="sidebar-backdrop-new" onClick={() => setFolderPanelOpen(false)} />
      )}

      <AddItemModal open={addOpen} onClose={() => setAddOpen(false)} initialType="document" folders={folders} members={members} onSave={async (p) => { await addItem(p); }} />
      <AddItemModal open={!!editItem} onClose={() => setEditItem(null)} existing={editItem} folders={folders} members={members} onSave={async (p) => { await updateItem(editItem!._id, p); }} />
      <ItemDetailModal item={detailItem} onClose={() => setDetailItem(null)} onEdit={() => { setEditItem(detailItem); setDetailItem(null); }} />
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { deleteItem(deleteId!); setDeleteId(null); }} message="Delete this document permanently?" />
    </div>
  );
}
