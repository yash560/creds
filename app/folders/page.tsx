'use client';

import { useState } from 'react';
import { Plus, FolderOpen, Pencil, Trash2 } from 'lucide-react';
import { useVault } from '@/context/VaultContext';
import Modal from '@/components/Modal';
import ItemCard from '@/components/ItemCard';
import AddItemModal from '@/components/AddItemModal';
import ItemDetailModal from '@/components/ItemDetailModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import type { Folder, VaultItem } from '@/lib/types';

export default function FoldersPage() {
  const { folders, addFolder, renameFolder, deleteFolder, items, addItem, updateItem, deleteItem } = useVault();
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [addFolderOpen, setAddFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [parentId, setParentId] = useState('');
  const [editFolder, setEditFolder] = useState<Folder | null>(null);
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<VaultItem | null>(null);
  const [editItem, setEditItem] = useState<VaultItem | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  const rootFolders = folders.filter(f => !f.parentId);
  const folderItems = selectedFolderId ? items.filter(i => i.folderId === selectedFolderId) : [];
  const selectedFolder = folders.find(f => f._id === selectedFolderId);
  const childFolders = selectedFolderId ? folders.filter(f => f.parentId === selectedFolderId) : rootFolders;

  return (
    <>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="item-type-icon icon-folder" style={{ width: 36, height: 36 }}><FolderOpen size={17} /></div>
            <h1 className="page-title">{selectedFolder ? selectedFolder.name : 'Folders'}</h1>
          </div>
          {selectedFolder && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4, fontSize: 13, color: 'var(--text-secondary)' }}>
              <span style={{ cursor: 'pointer', color: 'var(--accent-primary)' }} onClick={() => setSelectedFolderId(null)}>All Folders</span>
              <span>›</span>
              <span>{selectedFolder.name}</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {selectedFolderId && <button className="btn btn-ghost" onClick={() => setAddItemOpen(true)}><Plus size={14} /> Add Item</button>}
          <button className="btn btn-primary" onClick={() => setAddFolderOpen(true)}><Plus size={14} /> New Folder</button>
        </div>
      </div>

      {/* Sub-folders grid */}
      {childFolders.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>Folders</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px,1fr))', gap: 12 }}>
            {childFolders.map(f => (
              <div key={f._id} className="glass-card" style={{ padding: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8 }}
                onClick={() => setSelectedFolderId(f._id)}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div className="item-type-icon icon-folder" style={{ width: 36, height: 36 }}>
                    <FolderOpen size={16} />
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="action-btn" onClick={e => { e.stopPropagation(); setEditFolder(f); }} aria-label="Rename"><Pencil size={12} /></button>
                    <button className="action-btn danger" onClick={e => { e.stopPropagation(); setDeleteFolderId(f._id); }} aria-label="Delete"><Trash2 size={12} /></button>
                  </div>
                </div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{f.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{items.filter(i => i.folderId === f._id).length} items</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Items in selected folder */}
      {selectedFolderId && (
        <div>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>Items in this folder</h2>
          {folderItems.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📂</div>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No items in this folder</p>
              <button className="btn btn-primary" onClick={() => setAddItemOpen(true)}><Plus size={14} /> Add Item</button>
            </div>
          ) : (
            <div className="item-grid">
              {folderItems.map(item => (
                <ItemCard key={item._id} item={item} onClick={setDetailItem} onEdit={setEditItem} onDelete={setDeleteItemId} />
              ))}
            </div>
          )}
        </div>
      )}

      {!selectedFolderId && childFolders.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📁</div>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>No folders yet</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Create folders to organise your vault</p>
          <button className="btn btn-primary" onClick={() => setAddFolderOpen(true)}><Plus size={14} /> New Folder</button>
        </div>
      )}

      {/* Add folder modal */}
      <Modal open={addFolderOpen} onClose={() => setAddFolderOpen(false)} title="New Folder"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setAddFolderOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={async () => { if (newFolderName.trim()) { await addFolder(newFolderName.trim(), parentId || selectedFolderId || null); setNewFolderName(''); setParentId(''); setAddFolderOpen(false); } }}>Create</button>
        </>}>
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Name</label>
          <input className="form-input" autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)} onKeyDown={e => e.key === 'Enter' && newFolderName.trim() && addFolder(newFolderName.trim(), selectedFolderId).then(() => { setNewFolderName(''); setAddFolderOpen(false); })} placeholder="Family, Vehicle, Work…" />
        </div>
      </Modal>

      {/* Rename folder */}
      <Modal open={!!editFolder} onClose={() => setEditFolder(null)} title="Rename Folder"
        footer={<>
          <button className="btn btn-ghost" onClick={() => setEditFolder(null)}>Cancel</button>
          <button className="btn btn-primary" onClick={async () => { if (editFolder && newFolderName.trim()) { await renameFolder(editFolder._id, newFolderName.trim()); setEditFolder(null); setNewFolderName(''); } }}>Save</button>
        </>}>
        <input className="form-input" value={editFolder ? (newFolderName || editFolder.name) : ''} onChange={e => setNewFolderName(e.target.value)} autoFocus />
      </Modal>

      <ConfirmDialog open={!!deleteFolderId} onClose={() => setDeleteFolderId(null)} onConfirm={async () => { await deleteFolder(deleteFolderId!); setDeleteFolderId(null); if (selectedFolderId === deleteFolderId) setSelectedFolderId(null); }} message="Delete this folder? Items inside will not be deleted." />
      <AddItemModal open={addItemOpen} onClose={() => setAddItemOpen(false)} folders={folders} onSave={async p => { await addItem({ ...p, folderId: selectedFolderId }); }} />
      <ItemDetailModal item={detailItem} onClose={() => setDetailItem(null)} onEdit={() => { setEditItem(detailItem); setDetailItem(null); }} />
      <AddItemModal open={!!editItem} onClose={() => setEditItem(null)} existing={editItem} folders={folders} onSave={p => updateItem(editItem!._id, p)} />
      <ConfirmDialog open={!!deleteItemId} onClose={() => setDeleteItemId(null)} onConfirm={() => { deleteItem(deleteItemId!); setDeleteItemId(null); }} />
    </>
  );
}
