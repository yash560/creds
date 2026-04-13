'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  X, Trash2, Star, UserPlus, Combine 
} from 'lucide-react';
import { useVault } from '@/context/VaultContext';
import Tooltip from './Tooltip';
import ConfirmDialog from './ConfirmDialog';

export default function BulkActionBar() {
  const { 
    selectedIds, 
    clearSelection, 
    deleteItemsBulk, 
    updateItemsBulk, 
    mergeItems,
    members,
    items
  } = useVault();

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showMemberPicker, setShowMemberPicker] = useState(false);
  const memberPickerRef = useRef<HTMLDivElement>(null);

  const count = selectedIds.length;
  const isVisible = count > 0;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (memberPickerRef.current && !memberPickerRef.current.contains(e.target as Node)) {
        setShowMemberPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!count && !isVisible) return null;

  const handleMerge = async () => {
    if (count < 2) return;
    // For simplicity, we merge into the first selected item
    const targetId = selectedIds[0];
    const sourceIds = selectedIds.slice(1);
    await mergeItems(targetId, sourceIds);
    clearSelection();
  };

  const handleBulkFav = async () => {
    // Toggle fav based on the first item's state
    const firstItem = items.find(i => i._id === selectedIds[0]);
    const nextState = !firstItem?.isFavourite;
    await updateItemsBulk(selectedIds, { isFavourite: nextState });
    clearSelection();
  };

  const handleAssignMember = async (memberId: string | null) => {
    await updateItemsBulk(selectedIds, { memberId: memberId as string | undefined });
    setShowMemberPicker(false);
    clearSelection();
  };

  const handleDelete = async () => {
    await deleteItemsBulk(selectedIds);
    setConfirmDelete(false);
    clearSelection();
  };

  return (
    <>
      <div className={`bulk-action-bar ${isVisible ? 'visible' : ''}`}>
        <div className="bulk-count">
          <div className="bulk-count-badge">{count}</div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Selected</span>
        </div>

        <div className="bulk-actions">
          <Tooltip label="Favorite / Unfavorite">
            <button className="bulk-action-btn" onClick={handleBulkFav}>
              <Star size={18} />
              <span>Fav</span>
            </button>
          </Tooltip>

          <div style={{ position: 'relative' }} ref={memberPickerRef}>
            <Tooltip label="Assign to member">
              <button 
                className="bulk-action-btn" 
                onClick={() => setShowMemberPicker(!showMemberPicker)}
              >
                <UserPlus size={18} />
                <span>Assign</span>
              </button>
            </Tooltip>

            {showMemberPicker && (
              <div className="glass-card" style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginBottom: 12,
                minWidth: 180,
                padding: 8,
                zIndex: 1001,
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', padding: '4px 8px' }}>Assign to</div>
                <button 
                  className="pill-btn" 
                  onClick={() => handleAssignMember(null)}
                  style={{ justifyContent: 'flex-start', width: '100%', textAlign: 'left' }}
                >
                  None
                </button>
                {members.map(m => (
                  <button 
                    key={m._id} 
                    className="pill-btn" 
                    onClick={() => handleAssignMember(m._id)}
                    style={{ justifyContent: 'flex-start', width: '100%', textAlign: 'left', gap: 8 }}
                  >
                    <span>{m.emoji}</span>
                    <span>{m.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Tooltip label="Merge into one (keeps first selected)">
            <button 
              className="bulk-action-btn" 
              onClick={handleMerge}
              disabled={count < 2}
              style={{ opacity: count < 2 ? 0.4 : 1 }}
            >
              <Combine size={18} />
              <span>Merge</span>
            </button>
          </Tooltip>

          <Tooltip label="Delete selected">
            <button className="bulk-action-btn danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={18} />
              <span>Delete</span>
            </button>
          </Tooltip>

          <div style={{ width: 1, height: 24, backgroundColor: 'var(--border)', margin: '0 8px' }} />

          <Tooltip label="Deselect All">
            <button className="bulk-action-btn" onClick={clearSelection}>
              <X size={18} />
              <span>Deselect</span>
            </button>
          </Tooltip>
        </div>
      </div>

      <ConfirmDialog 
        open={confirmDelete} 
        onClose={() => setConfirmDelete(false)} 
        onConfirm={handleDelete} 
        message={`This will permanently delete ${count} items. Continue?`} 
      />
    </>
  );
}
