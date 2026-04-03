'use client';

import React, { useState, useMemo } from 'react';
import { Plus, FileText, Menu, X, Folder, Package, Tag } from 'lucide-react';
import Link from 'next/link';
import { useVault } from '@/context/VaultContext';
import ItemCard from '@/components/ItemCard';
import AddItemModal from '@/components/AddItemModal';
import ItemDetailModal from '@/components/ItemDetailModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import FolderTree from '@/components/FolderTree';
import ZipImportModal from '@/components/ZipImportModal';
import CategoryManagerModal from '@/components/CategoryManagerModal';
import type { VaultItem } from '@/lib/types';

export default function DocumentsPage() {
  const {
    items,
    addItem,
    updateItem,
    deleteItem,
    folders,
    members,
    categories,
    mergeItems,
    searchQuery,
  } = useVault();
  const [addOpen, setAddOpen] = useState(false);
  const [zipOpen, setZipOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<VaultItem | null>(null);
  const [editItem, setEditItem] = useState<VaultItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [category, setCategory] = useState("All");
  const [folderId, setFolderId] = useState<string | null | undefined>(undefined);
  const [folderPanelOpen, setFolderPanelOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Derive subfolders of currently selected folder
  const subFolders = useMemo(() => {
    return folders.filter((f) => {
      if (folderId === undefined || folderId === null) return !f.parentId;
      return f.parentId === folderId;
    });
  }, [folders, folderId]);

  const dynamicCategories = useMemo(() => {
    const existing = new Set(
      items
        .filter((i) => i.type === "document" && i.fields?.category)
        .map((i) => i.fields.category)
    );
    const defaults = categories.map(c => c.name);
    if (defaults.length === 0) {
      defaults.push("Aadhaar", "PAN", "Passport", "Visa", "Driving Licence", "Vehicle RC", "Insurance", "Medical", "Bank", "Other");
    }
    const combined = Array.from(new Set([...defaults, ...Array.from(existing)]));
    return ["All", ...combined.sort()];
  }, [items, categories]);

  const filtered = useMemo(() => {
    let list = items.filter((i) => i.type === "document");
    if (folderId !== undefined)
      list = list.filter((i) => i.folderId === folderId);
    if (category !== "All")
      list = list.filter((i) => i.fields.category === category);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [items, folderId, category, searchQuery]);

  const handleFolderSelect = (next: string | null) => {
    setFolderId(next);
    setFolderPanelOpen(false);
    setSelectedIds(new Set());
    setIsSelectionMode(false);
  };

  const toggleSelection = (id: string, selected: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (selected) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleMergeItems = async () => {
    if (selectedIds.size < 2) return;
    const ids = Array.from(selectedIds);
    const targetId = ids[0];
    const sourceIds = ids.slice(1);
    
    if (confirm(`Merge ${ids.length} documents into one? The metadata from the first selected item ("${items.find(i => i._id === targetId)?.title}") will be kept.`)) {
      await mergeItems(targetId, sourceIds);
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    }
  };

  const activeFolderName = useMemo(() => {
    if (folderId === null || folderId === undefined) return "All Documents";
    return folders.find((f) => f._id === folderId)?.name || "Folder";
  }, [folders, folderId]);

  return (
    <div className="page-layout animate-fadeIn">
      <header className="page-header-new">
        <div className="header-main-row">
          <div className="title-with-icon">
            <div className="item-type-icon icon-document">
              <FileText size={20} />
            </div>
            <div>
              <h1 className="page-title">{activeFolderName}</h1>
              <p className="page-subtitle">
                {filtered.length} document{filtered.length !== 1 ? "s" : ""}
                {subFolders.length > 0 && ` • ${subFolders.length} folder${subFolders.length !== 1 ? 's' : ''}`}
              </p>
            </div>
          </div>

          <div className="header-actions">
            {isSelectionMode ? (
              <>
                <div style={{ marginRight: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                  {selectedIds.size} selected
                </div>
                <button className="btn btn-primary" onClick={handleMergeItems} disabled={selectedIds.size < 2}>
                  Merge Selected
                </button>
                <button className="btn btn-ghost" onClick={() => { setIsSelectionMode(false); setSelectedIds(new Set()); }}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-ghost" onClick={() => setIsSelectionMode(true)} title="Bulk actions">
                  Select
                </button>
                <button className="btn btn-ghost" onClick={() => setCategoriesOpen(true)} title="Manage Categories">
                  <Tag size={16} /> Manage Categories
                </button>
                <button className="btn btn-ghost" onClick={() => setZipOpen(true)} title="Import from ZIP">
                  <Package size={16} /> Import ZIP
                </button>
                <button className="btn btn-primary" onClick={() => setAddOpen(true)}>
                  <Plus size={16} /> Add Document
                </button>
              </>
            )}
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
          <span className="breadcrumb-item" style={{ cursor: "pointer" }} onClick={() => setFolderId(null)}>Documents</span>
          {folderId && folders.find(f => f._id === folderId)?.path.map(pid => {
            const f = folders.find(folder => folder._id === pid);
            return f ? (
              <React.Fragment key={f._id}>
                <span className="breadcrumb-divider">/</span>
                <span className="breadcrumb-item" style={{ cursor: 'pointer' }} onClick={() => setFolderId(f._id)}>{f.name}</span>
              </React.Fragment>
            ) : null;
          })}
          {folderId && folders.find(f => f._id === folderId) && (
            <>
              <span className="breadcrumb-divider">/</span>
              <span className="breadcrumb-item active">{folders.find(f => f._id === folderId)?.name}</span>
            </>
          )}
        </nav>
      </header>

      <div className="page-content-grid">
        <aside className={`folder-sidebar-new ${folderPanelOpen ? "open" : ""}`}>
          <div className="sidebar-header">
            <h3>Explorer</h3>
            <button className="mobile-only close-btn" onClick={() => setFolderPanelOpen(false)}>
              <X size={20} />
            </button>
          </div>
          <div className="folder-tree-container">
            <FolderTree activeFolderId={folderId} onSelect={handleFolderSelect} />
          </div>
        </aside>

        <main className="main-content-area">
          <div className="category-pills-row">
            <div className="category-pills" role="toolbar">
              {dynamicCategories.map((c) => (
                <button
                  key={c}
                  className={`pill-btn ${category === c ? "active" : ""}`}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: "0 4px" }}>
            {subFolders.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, color: "var(--text-muted)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Folders
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
                  {subFolders.map((f) => (
                    <div key={f._id} className="glass-card folder-card-interactive" onClick={() => setFolderId(f._id)}>
                      <div className="folder-card-icon">
                        <Folder size={20} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="folder-card-name">{f.name}</div>
                        <div className="folder-card-meta">
                          {folders.filter((cf) => cf.parentId === f._id).length} folders
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              {filtered.length > 0 && subFolders.length > 0 && (
                 <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, color: "var(--text-muted)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                   Documents
                 </div>
              )}
              {filtered.length === 0 && subFolders.length === 0 ? (
                <div className="empty-state-card">
                  <div className="empty-icon">📂</div>
                  <h3>No items found</h3>
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
                      onToggleFav={(it) => updateItem(it._id, { isFavourite: !it.isFavourite })}
                      isSelected={selectedIds.has(item._id)}
                      selectable={isSelectionMode}
                      onSelect={toggleSelection}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {folderPanelOpen && <div className="sidebar-backdrop-new" onClick={() => setFolderPanelOpen(false)} />}
      <ZipImportModal open={zipOpen} onClose={() => setZipOpen(false)} targetFolderId={folderId} />
      <AddItemModal open={addOpen} onClose={() => setAddOpen(false)} initialType="document" folders={folders} members={members} onSave={async (p) => { await addItem(p); }} />
      <AddItemModal open={!!editItem} onClose={() => setEditItem(null)} existing={editItem} folders={folders} members={members} onSave={async (p) => { await updateItem(editItem!._id, p); }} />
      <ItemDetailModal item={detailItem} onClose={() => setDetailItem(null)} onEdit={() => { setEditItem(detailItem); setDetailItem(null); }} />
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { deleteItem(deleteId!); setDeleteId(null); }} message="Delete this document permanently?" />
      <CategoryManagerModal open={categoriesOpen} onClose={() => setCategoriesOpen(false)} />
    </div>
  );
}
