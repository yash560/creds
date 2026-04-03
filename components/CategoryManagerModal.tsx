'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, Tag } from 'lucide-react';
import Modal from './Modal';
import { useVault } from '@/context/VaultContext';

interface CategoryManagerModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CategoryManagerModal({ open, onClose }: CategoryManagerModalProps) {
  const { categories, addCategory, updateCategory, deleteCategory } = useVault();
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    await addCategory(newName.trim());
    setNewName('');
  };

  const handleUpdate = async (id: string) => {
    if (!editText.trim()) return;
    await updateCategory(id, editText.trim());
    setEditId(null);
  };

  return (
    <Modal 
      open={open} 
      onClose={onClose} 
      title="Manage Categories"
      footer={<button className="btn btn-primary" onClick={onClose}>Done</button>}
    >
      <div className="category-manager-container" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <input 
              className="form-input" 
              placeholder="New category name..." 
              value={newName} 
              onChange={e => setNewName(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={!newName.trim()}>
            <Plus size={16} /> Add
          </button>
        </form>

        <div className="category-list" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Existing Categories ({categories.length})
          </div>
          
          {categories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: 12, border: '1px dashed var(--border-subtle)' }}>
               No custom categories yet.
            </div>
          ) : (
            categories.map(cat => (
              <div key={cat._id} className="category-item-row" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
                <Tag size={16} color="var(--accent-primary)" />
                
                {editId === cat._id ? (
                  <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                    <input 
                      className="form-input" 
                      style={{ padding: '4px 8px', height: 32 }}
                      value={editText} 
                      onChange={e => setEditText(e.target.value)}
                      autoFocus
                    />
                    <button className="btn btn-ghost" onClick={() => handleUpdate(cat._id)} style={{ padding: 4 }}>
                      <Check size={16} color="var(--accent-green)" />
                    </button>
                    <button className="btn btn-ghost" onClick={() => setEditId(null)} style={{ padding: 4 }}>
                      <X size={16} color="var(--accent-rose)" />
                    </button>
                  </div>
                ) : (
                  <>
                    <span style={{ flex: 1, fontWeight: 500 }}>{cat.name}</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost" onClick={() => { setEditId(cat._id); setEditText(cat.name); }} style={{ padding: 4 }}>
                        <Edit2 size={14} />
                      </button>
                      <button className="btn btn-ghost danger" onClick={() => deleteCategory(cat._id)} style={{ padding: 4 }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>
        
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          <Tag size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
          Tip: Names added here will be automatically matched during ZIP imports.
        </p>
      </div>
    </Modal>
  );
}
