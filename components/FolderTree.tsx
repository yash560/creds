'use client';

import React, { useState } from 'react';
import { 
  Plus, 
  ChevronRight, 
  ChevronDown, 
  Folder, 
  FolderOpen, 
  Edit2,
  Trash2
} from 'lucide-react';
import type { Folder as FolderType } from '@/lib/types';
import { useVault } from '@/context/VaultContext';
import Modal from './Modal';
import ConfirmDialog from './ConfirmDialog';

interface FolderTreeProps {
  activeFolderId?: string | null;
  onSelect: (folderId: string | null) => void;
}

function FolderNode({
  folder,
  allFolders,
  activeFolderId,
  onSelect,
  depth,
  onEdit,
  onDelete,
  onMove,
  draggedFolderId,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  folder: FolderType;
  allFolders: FolderType[];
  activeFolderId?: string | null;
  onSelect: (id: string | null) => void;
  depth: number;
  onEdit: (f: FolderType) => void;
  onDelete: (id: string) => void;
  onMove: (f: FolderType) => void;
  draggedFolderId: string | null;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, targetId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const children = allFolders.filter(f => f.parentId === folder._id);
  const isActive = activeFolderId === folder._id;
  const isDragged = draggedFolderId === folder._id;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('folderId', folder._id);
    onDragStart(folder._id);
  };

  return (
    <div 
      className={`folder-node-wrapper ${isDragged ? 'is-dragging' : ''}`}
      draggable
      onDragStart={handleDragStart}
      onDragOver={(e) => onDragOver(e, folder._id)}
      onDrop={(e) => onDrop(e, folder._id)}
      onDragEnd={() => onDragStart('')} // Reset
    >
      <div
        className={`folder-item-new ${isActive ? 'active' : ''}`}
        style={{ paddingLeft: 12 + depth * 12 }}
        onClick={() => { onSelect(folder._id); setOpen(true); }}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div style={{ width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {children.length > 0 ? (
            <button
              className="collapse-btn"
              onClick={(e) => { e.stopPropagation(); setOpen(p => !p); }}
            >
              {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <div style={{ width: 14 }} />
          )}
        </div>
        
        <div className={`node-icon ${isActive ? 'active' : ''}`}>
          {open ? <FolderOpen size={16} /> : <Folder size={16} />}
        </div>
        
        <span className="node-name">
          {folder.name}
        </span>

        {showActions && (
          <div className="node-actions" onClick={e => e.stopPropagation()}>
            <button onClick={() => onEdit(folder)} title="Rename"><Edit2 size={12} /></button>
            <button onClick={() => onDelete(folder._id)} className="danger" title="Delete"><Trash2 size={12} /></button>
          </div>
        )}
      </div>
      
      {open && children.length > 0 && (
        <div className="node-children">
          {children.map(child => (
            <FolderNode 
              key={child._id} 
              folder={child} 
              allFolders={allFolders} 
              activeFolderId={activeFolderId} 
              onSelect={onSelect} 
              depth={depth + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onMove={onMove}
              draggedFolderId={draggedFolderId}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FolderTree({ activeFolderId, onSelect }: FolderTreeProps) {
  const { folders, addFolder, updateFolder, deleteFolder } = useVault();
  const [showAdd, setShowAdd] = useState(false);
  const [editFolder, setEditFolder] = useState<FolderType | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const rootFolders = folders.filter(f => !f.parentId);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await addFolder(newName.trim(), parentId || null);
    setNewName('');
    setParentId('');
    setShowAdd(false);
  };

  const handleUpdate = async () => {
    if (!editFolder || !newName.trim()) return;
    await updateFolder(editFolder._id, { name: newName.trim(), parentId: parentId || null });
    setEditFolder(null);
    setNewName('');
    setParentId('');
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = async (e: React.DragEvent, targetId: string | null) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('folderId');
    if (!sourceId || sourceId === targetId) return;
    
    // Don't allow dropping into itself or its descendants
    const source = folders.find(f => f._id === sourceId);
    if (!source) return;
    
    try {
      await updateFolder(sourceId, { parentId: targetId });
    } catch (err) {
      console.error("Failed to move folder:", err);
      alert("Cannot move folder into its own descendant");
    }
  };

  return (
    <div className="folder-tree-ide">
      <div className="tree-header-actions">
        <span>Files</span>
        <button className="icon-btn-small" onClick={() => { setParentId(''); setShowAdd(true); }} title="New root folder">
          <Plus size={14} />
        </button>
      </div>

      <div className="tree-content">
        {/* All items root */}
        <div
          className={`folder-item-new ${activeFolderId === null || activeFolderId === undefined ? 'active' : ''}`}
          onClick={() => onSelect(null)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => onDrop(e, null)}
        >
          <div style={{ width: 20 }} />
          <div className={`node-icon ${activeFolderId === null ? 'active' : ''}`}>
             <FolderOpen size={16} />
          </div>
          <span className="node-name">All Documents</span>
        </div>

        {rootFolders.map(f => (
          <FolderNode 
            key={f._id} 
            folder={f} 
            allFolders={folders} 
            activeFolderId={activeFolderId} 
            onSelect={onSelect} 
            depth={0} 
            onEdit={(folder) => {
              setEditFolder(folder);
              setNewName(folder.name);
              setParentId(folder.parentId || '');
            }}
            onDelete={setDeleteId}
            onMove={(folder) => {
               setEditFolder(folder);
               setNewName(folder.name);
               setParentId(folder.parentId || '');
            }}
            draggedFolderId={draggedId}
            onDragStart={setDraggedId}
            onDragOver={onDragOver}
            onDrop={onDrop}
          />
        ))}
      </div>

      <ConfirmDialog 
        open={!!deleteId} 
        onClose={() => setDeleteId(null)} 
        onConfirm={async () => {
          if (deleteId) {
            await deleteFolder(deleteId);
            setDeleteId(null);
          }
        }}
        isDangerous
        title="Delete Folder?"
        message="This will permanently delete this folder and ALL items and subfolders inside it. This action cannot be undone."
        confirmLabel="Delete Everything"
      />

      <Modal open={showAdd || !!editFolder} onClose={() => { setShowAdd(false); setEditFolder(null); }} 
        title={editFolder ? "Edit Folder" : "New Folder"}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => { setShowAdd(false); setEditFolder(null); }}>Cancel</button>
            <button className="btn btn-primary" onClick={editFolder ? handleUpdate : handleAdd}>
              {editFolder ? "Save" : "Create"}
            </button>
          </>
        }
      >
        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="form-label">Folder name</label>
          <input className="form-input" autoFocus value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Finance, Legal" />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Parent folder</label>
          <select className="form-select" value={parentId} onChange={e => setParentId(e.target.value)}>
            <option value="">None (root)</option>
            {folders.filter(f => f._id !== editFolder?._id).map(f => (
              <option key={f._id} value={f._id}>{f.name}</option>
            ))}
          </select>
        </div>
      </Modal>
    </div>
  );
}
