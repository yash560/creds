'use client';

import { useState, useMemo, useCallback } from 'react';
import { Plus, KeyRound, Download, Menu, X } from 'lucide-react';
import Link from 'next/link';
import ImportPasswordsModal from '@/components/ImportPasswordsModal';
import { ChromePasswordRow, normalizeLoginKey } from '@/lib/chrome-password-csv';
import { useVault } from '@/context/VaultContext';
import ItemCard from '@/components/ItemCard';
import AddItemModal from '@/components/AddItemModal';
import ItemDetailModal from '@/components/ItemDetailModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import FolderTree from '@/components/FolderTree';
import type { VaultItem } from '@/lib/types';

function titleFromChromeRow(row: ChromePasswordRow): string {
  const n = row.name.trim();
  if (n) return n;
  try {
    const u = new URL(row.url.includes('://') ? row.url : `https://${row.url}`);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return row.url.trim() || 'Imported login';
  }
}

export default function PasswordsPage() {
  const { items, addItem, addItemsBulk, updateItem, deleteItem, folders, searchQuery } = useVault();
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<VaultItem | null>(null);
  const [editItem, setEditItem] = useState<VaultItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [folderId, setFolderId] = useState<string | null | undefined>(undefined);
  const [folderPanelOpen, setFolderPanelOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = items.filter(i => i.type === 'password');
    // If folderId is undefined, we show everything (global view).
    // If it's null, we show items in the root (no folder).
    // If it's a string, we show that specific folder.
    if (folderId !== undefined) {
      list = list.filter(i => i.folderId === folderId);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i => i.title.toLowerCase().includes(q) || i.tags?.some(t => t.toLowerCase().includes(q)));
    }
    return list;
  }, [items, folderId, searchQuery]);

  const handleBulkImport = useCallback(async (rows: ChromePasswordRow[]) => {
    const payloads = rows.map(row => ({
      type: 'password' as const,
      title: titleFromChromeRow(row),
      tags: ['imported', 'chrome'],
      folderId: null,
      dedupeKey: normalizeLoginKey(row.url, row.username),
      fields: {
        username: row.username,
        password: row.password,
        url: row.url,
        notes: '',
      },
    }));
    await addItemsBulk(payloads);
  }, [addItemsBulk]);

  const handleFolderSelect = (next: string | null) => {
    setFolderId(next);
    setFolderPanelOpen(false);
  };

  return (
    <div className="page-layout">
      <div className="page-header-grid">
        <button
          type="button"
          className="panel-toggle"
          onClick={() => setFolderPanelOpen((p) => !p)}
          aria-label="Toggle folders"
        >
          <Menu size={16} /> Folders
        </button>
        <div className="title-block">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="item-type-icon icon-password" style={{ width: 36, height: 36 }}><KeyRound size={17} /></div>
            <h1 className="page-title">Passwords</h1>
          </div>
          <p className="page-subtitle">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <nav className="breadcrumb-row" aria-label="Breadcrumb">
          <Link href="/" className="breadcrumb-link">
            Vault
          </Link>
          <span className="breadcrumb-separator">/</span>
          <Link href="/passwords" className="breadcrumb-link active">
            Passwords
          </Link>
        </nav>
      </div>

      <div className="primary-action-row">
        <button type="button" className="btn btn-ghost" onClick={() => setImportOpen(true)}>
          <Download size={15} /> Import from Chrome
        </button>
        <button type="button" className="btn btn-primary" onClick={() => setAddOpen(true)}>
          <Plus size={15} /> Add Password
        </button>
      </div>

      <div className="page-grid">
        <aside className={`folder-panel ${folderPanelOpen ? 'open' : ''}`}>
          <div className="panel-header">
            <span>Folders</span>
            <button
              type="button"
              className="panel-close"
              onClick={() => setFolderPanelOpen(false)}
              aria-label="Close folders"
            >
              <X size={18} />
            </button>
          </div>
          <FolderTree activeFolderId={folderId} onSelect={handleFolderSelect} />
        </aside>

        <section className="content-panel">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔑</div>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>No passwords yet</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Store your logins securely</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 16 }}>
                <button type="button" className="btn btn-ghost" onClick={() => setImportOpen(true)}><Download size={14} /> Import from Chrome</button>
                <button type="button" className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus size={14} /> Add Password</button>
              </div>
            </div>
          ) : (
            <div className="item-grid">
              {filtered.map(item => (
                <ItemCard 
                  key={item._id} 
                  item={item} 
                  onClick={setDetailItem} 
                  onEdit={setEditItem} 
                  onDelete={setDeleteId} 
                  onToggleFav={(it) => updateItem(it._id, { isFavourite: !it.isFavourite })} 
                />
              ))}
            </div>
          )}
        </section>

        {folderPanelOpen && (
          <div
            className="panel-backdrop"
            role="presentation"
            onClick={() => setFolderPanelOpen(false)}
          />
        )}
      </div>

      <ImportPasswordsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        items={items}
        onImported={(count) => { setImportOpen(false); }}
        importRow={async () => {}} 
        onBulkImport={handleBulkImport}
      />

      <AddItemModal open={addOpen} onClose={() => setAddOpen(false)} initialType="password" folders={folders} onSave={async (p) => { await addItem(p); }} />
      <AddItemModal open={!!editItem} onClose={() => setEditItem(null)} existing={editItem} folders={folders} onSave={async (p) => { await updateItem(editItem!._id, p); }} />
      <ItemDetailModal item={detailItem} onClose={() => setDetailItem(null)} onEdit={() => { setEditItem(detailItem); setDetailItem(null); }} />
      <ConfirmDialog open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={() => { deleteItem(deleteId!); setDeleteId(null); }} message="Delete this password permanently?" />
    </div>
  );
}
