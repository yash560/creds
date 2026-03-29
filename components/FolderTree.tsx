'use client';

import { useState } from 'react';
import { Plus, FolderPlus, ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react';
import type { Folder as FolderType } from '@/lib/types';
import { useVault } from '@/context/VaultContext';
import Modal from './Modal';
import Tooltip from './Tooltip';

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
}: {
  folder: FolderType;
  allFolders: FolderType[];
  activeFolderId?: string | null;
  onSelect: (id: string | null) => void;
  depth: number;
}) {
  const [open, setOpen] = useState(false);
  const children = allFolders.filter(f => f.parentId === folder._id);
  const isActive = activeFolderId === folder._id;

  return (
    <div>
      <div
        className={`folder-item ${isActive ? 'active' : ''}`}
        style={{ paddingLeft: 12 + depth * 16 }}
        onClick={() => { onSelect(folder._id); setOpen(true); }}
      >
        {children.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); setOpen(p => !p); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0, display: 'flex' }}
          >
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        )}
        {open ? <FolderOpen size={16} /> : <Folder size={16} />}
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {folder.name}
        </span>
      </div>
      {open && children.map(child => (
        <FolderNode key={child._id} folder={child} allFolders={allFolders} activeFolderId={activeFolderId} onSelect={onSelect} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function FolderTree({ activeFolderId, onSelect }: FolderTreeProps) {
  const { folders, addFolder, deleteFolder } = useVault();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [parentId, setParentId] = useState<string>('');

  const rootFolders = folders.filter(f => !f.parentId);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await addFolder(newName.trim(), parentId || null);
    setNewName('');
    setParentId('');
    setShowAdd(false);
  };

  return (
    <div>
      {/* All items */}
      <div
        className={`folder-item ${activeFolderId === null || activeFolderId === undefined ? 'active' : ''}`}
        onClick={() => onSelect(null)}
      >
        <FolderOpen size={16} />
        <span>All Items</span>
      </div>

      {rootFolders.map(f => (
        <FolderNode key={f._id} folder={f} allFolders={folders} activeFolderId={activeFolderId} onSelect={onSelect} depth={0} />
      ))}

      <Tooltip label="New folder">
        <button
          className="nav-item"
          onClick={() => setShowAdd(true)}
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4, fontSize: 13, color: 'var(--text-muted)' }}
        >
          <FolderPlus size={15} />
          <span>New folder</span>
        </button>
      </Tooltip>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Folder"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAdd}>Create</button>
          </>
        }
      >
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Folder name</label>
          <input className="form-input" autoFocus value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder="e.g. Family, Work, Vehicle" />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Parent folder (optional)</label>
          <select className="form-select" value={parentId} onChange={e => setParentId(e.target.value)}>
            <option value="">None (root)</option>
            {folders.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
          </select>
        </div>
      </Modal>
    </div>
  );
}
