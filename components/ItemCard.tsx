'use client';

import { useMemo } from 'react';
import { KeyRound, CreditCard, FileText, ScanLine, Star, Pencil, Trash2 } from 'lucide-react';
import type { VaultItem } from '@/lib/types';
import CopyButton from './CopyButton';
import Tooltip from './Tooltip';
import { detectCardBrand } from '@/lib/card-ocr-parse';

interface ItemCardProps {
  item: VaultItem;
  members?: { _id: string; name: string; emoji?: string }[];
  onEdit: (item: VaultItem) => void;
  onDelete: (id: string) => void;
  onToggleFav?: (item: VaultItem) => void;
  onClick?: (item: VaultItem) => void;
  isSelected?: boolean;
  selectable?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
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

function formatCardNumber(num: string) {
  const digits = num.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 15) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 10)} ${digits.slice(10)}`;
  }
  return (digits.match(/.{1,4}/g) || []).join(' ');
}

export default function ItemCard({ 
  item, 
  members = [], 
  onEdit, 
  onDelete, 
  onToggleFav, 
  onClick,
  isSelected,
  selectable,
  onSelect
}: ItemCardProps) {
  const { Icon, cls } = TYPE_ICONS[item.type] ?? TYPE_ICONS.document;

  const handleCardClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (selectable && onSelect) {
      e.stopPropagation();
      onSelect(item._id, !isSelected);
    } else {
      onClick?.(item);
    }
  };

  const subtitle = getSubtitle(item);
  const copyVal = getCopyValue(item);
  const { cardNumber = '', expiry = '', cvv = '', cardholderName = '', pin = '', cardType = '' } =
    (item.type === 'card' ? item.fields : {}) as Record<string, string>;
  const brandKey = (cardType || detectCardBrand(cardNumber) || 'default').toLowerCase();
  const brandLabel = brandKey === 'default' ? 'CARD' : brandKey.toUpperCase();

  const memberEmoji = useMemo(() => {
    if (!item.memberId || !members.length) return null;
    return members.find(m => m._id === item.memberId)?.emoji;
  }, [item.memberId, members]);

  const cardRows = useMemo(() => {
    const rows = [
      {
        label: 'Card Number',
        value: formatCardNumber(cardNumber) || '•••• •••• •••• ••••',
        copyValue: cardNumber,
      },
      {
        label: 'Card Holder',
        value: cardholderName || '—',
        copyValue: cardholderName,
      },
      {
        label: 'Expiry',
        value: expiry || 'MM/YY',
        copyValue: expiry,
      },
      {
        label: 'CVV',
        value: cvv ? '•••' : '—',
        copyValue: cvv,
      },
      {
        label: 'PIN',
        value: pin ? '••••' : '—',
        copyValue: pin,
      },
    ];
    return rows;
  }, [cardNumber, cardholderName, expiry, cvv, pin]);

  return (
    <div
      className={`item-card ${item.type} ${isSelected ? 'isSelected' : ''} ${selectable ? 'selectable-mode' : ''}`}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleCardClick(e)}
    >
      {selectable && (
        <div className={`selection-indicator ${isSelected ? 'active' : ''}`}>
          {isSelected && <Star size={10} fill="currentColor" />}
        </div>
      )}
      {item.type === 'card' ? (
        <>
          <div className="card-summary">
            <div className="card-summary-icon">
              <Icon size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="item-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {item.title}
                {memberEmoji && <span className="member-indicator" title="Assigned member">{memberEmoji}</span>}
              </div>
              {subtitle && <div className="item-subtitle">{subtitle}</div>}
            </div>
            <div className="item-card-actions">
              {onToggleFav && (
                <Tooltip label={item.isFavourite ? 'Unfavourite' : 'Favourite'}>
                  <button
                    className="action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFav(item);
                    }}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(item);
                  }}
                  aria-label="Edit"
                >
                  <Pencil size={13} />
                </button>
              </Tooltip>
              <Tooltip label="Delete">
                <button
                  className="action-btn danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item._id);
                  }}
                  aria-label="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </Tooltip>
            </div>
          </div>
          <div className={`card-preview ${brandKey}`}>
            <div className="card-preview-row">
              <div className="card-preview-chip" />
              <div className="card-preview-brand">{brandLabel}</div>
            </div>
            <div className="card-preview-number">{formatCardNumber(cardNumber) || '•••• •••• •••• ••••'}</div>
            <div className="card-preview-footer">
              <div>
                <div className="card-preview-label">Cardholder</div>
                <div className="card-preview-value">{cardholderName || '—'}</div>
              </div>
              <div>
                <div className="card-preview-label">Expiry</div>
                <div className="card-preview-value">{expiry || 'MM/YY'}</div>
              </div>
            </div>
          </div>
          {cardRows.length > 0 && (
            <div className="card-detail-rows">
              {cardRows.map((row) => (
                <div key={row.label} className="card-detail-row">
                  <div>
                    <div className="card-detail-label">{row.label}</div>
                    <div className="card-detail-value">{row.value}</div>
                  </div>
                  {row.copyValue && (
                    <CopyButton value={row.copyValue} label={`Copy ${row.label.toLowerCase()}`} />
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="item-card-header">
            <div className={`item-type-icon ${cls}`}>
              <Icon size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="item-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {item.title}
                {memberEmoji && <span className="member-indicator" title="Assigned member">{memberEmoji}</span>}
              </div>
              {subtitle && <div className="item-subtitle">{subtitle}</div>}
            </div>
            <div className="item-card-actions">
              {copyVal && <CopyButton value={copyVal} label="Copy main value" />}
              {onToggleFav && (
                <Tooltip label={item.isFavourite ? 'Unfavourite' : 'Favourite'}>
                  <button
                    className="action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFav(item);
                    }}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(item);
                  }}
                  aria-label="Edit"
                >
                  <Pencil size={13} />
                </button>
              </Tooltip>
              <Tooltip label="Delete">
                <button
                  className="action-btn danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item._id);
                  }}
                  aria-label="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </Tooltip>
            </div>
          </div>
          {item.tags?.length > 0 && (
            <div className="tags">
              {item.tags.map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
