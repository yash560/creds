'use client';

import { useState } from 'react';
import { KeyRound, CreditCard, FileText, ScanLine, Star, Pencil, Trash2 } from 'lucide-react';
import type { VaultItem } from '@/lib/types';
import CopyButton from './CopyButton';
import Tooltip from './Tooltip';

interface ItemCardProps {
  item: VaultItem;
  onEdit: (item: VaultItem) => void;
  onDelete: (id: string) => void;
  onToggleFav?: (item: VaultItem) => void;
  onClick?: (item: VaultItem) => void;
}

const TYPE_ICONS = {
  password: { Icon: KeyRound, cls: 'icon-password' },
  card:     { Icon: CreditCard, cls: 'icon-card' },
  document: { Icon: FileText, cls: 'icon-document' },
  scan:     { Icon: ScanLine, cls: 'icon-scan' },
};

function getSubtitle(item: VaultItem): string {
  const f = item.fields;
  if (item.type === 'password') return f.username || f.url || '';
  if (item.type === 'card') return f.cardholderName || '';
  if (item.type === 'document') return f.documentNumber || f.category || '';
  return item.fileName || '';
}

function getCopyValue(item: VaultItem): string {
  if (item.type === 'password') return item.fields.password || '';
  if (item.type === 'card') return item.fields.cardNumber || '';
  if (item.type === 'document') return item.fields.documentNumber || '';
  return '';
}

export default function ItemCard({ item, onEdit, onDelete, onToggleFav, onClick }: ItemCardProps) {
  const { Icon, cls } = TYPE_ICONS[item.type] ?? TYPE_ICONS.document;
  const subtitle = getSubtitle(item);
  const copyVal = getCopyValue(item);

  return (
    <div
      className={`item-card ${item.type}`}
      onClick={() => onClick?.(item)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.(item)}
    >
      <div className="item-card-header">
        <div className={`item-type-icon ${cls}`}>
          <Icon size={18} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="item-title">{item.title}</div>
          {subtitle && <div className="item-subtitle">{subtitle}</div>}
        </div>

        <div className="item-card-actions">
          {copyVal && <CopyButton value={copyVal} label="Copy main value" />}
          {onToggleFav && (
            <Tooltip label={item.isFavourite ? 'Unfavourite' : 'Favourite'}>
              <button
                className="action-btn"
                onClick={(e) => { e.stopPropagation(); onToggleFav(item); }}
                aria-label="Toggle favourite"
              >
                <Star
                  size={13}
                  style={{ color: item.isFavourite ? 'var(--accent-amber)' : undefined }}
                  fill={item.isFavourite ? 'var(--accent-amber)' : 'none'}
                />
              </button>
            </Tooltip>
          )}
          <Tooltip label="Edit">
            <button
              className="action-btn"
              onClick={(e) => { e.stopPropagation(); onEdit(item); }}
              aria-label="Edit"
            >
              <Pencil size={13} />
            </button>
          </Tooltip>
          <Tooltip label="Delete">
            <button
              className="action-btn danger"
              onClick={(e) => { e.stopPropagation(); onDelete(item._id); }}
              aria-label="Delete"
            >
              <Trash2 size={13} />
            </button>
          </Tooltip>
        </div>
      </div>

      {item.tags?.length > 0 && (
        <div className="tags">
          {item.tags.map(t => <span key={t} className="tag">{t}</span>)}
        </div>
      )}
    </div>
  );
}
