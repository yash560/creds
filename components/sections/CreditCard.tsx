'use client';

import { useMemo, useState } from 'react';
import { Eye, EyeOff, Download } from 'lucide-react';
import type { CardItem } from '@/lib/types';
import CopyButton from '../CopyButton';
import Tooltip from '../Tooltip';
import { detectCardBrand } from '@/lib/card-ocr-parse';

interface CreditCardViewProps {
  item: CardItem;
}

function maskNumber(num: string) {
  const digits = num.replace(/\D/g, '');
  const last4 = digits.slice(-4);
  // Amex is 4-6-5
  if (digits.length === 15) return `•••• •••••• ${last4.padStart(5, '•').slice(-5)}`;
  // Standard 4-4-4-4
  const groups = digits.match(/.{1,4}/g) || [];
  return groups
    .map((g, i) => (i < groups.length - 1 ? '••••' : g))
    .join(' ');
}

/** Format a raw digit string as a spaced display number. */
function formatNumber(num: string): string {
  const digits = num.replace(/\D/g, '');
  if (digits.length === 15) {
    // Amex: 4-6-5
    return `${digits.slice(0, 4)} ${digits.slice(4, 10)} ${digits.slice(10)}`;
  }
  // Default: groups of 4
  return (digits.match(/.{1,4}/g) || []).join(' ');
}

/** Brand logo / badge rendered on the card face. */
function BrandBadge({ brand }: { brand: string }) {
  switch (brand) {
    case 'visa':
      return (
        <span style={{ fontSize: 22, fontWeight: 900, color: 'rgba(255,255,255,0.9)', letterSpacing: '-0.02em', fontStyle: 'italic', fontFamily: 'serif' }}>
          VISA
        </span>
      );
    case 'mastercard':
      return (
        <span style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#EB001B', display: 'inline-block', opacity: 0.9 }} />
          <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#F79E1B', display: 'inline-block', marginLeft: -10, opacity: 0.9 }} />
        </span>
      );
    case 'amex':
      return (
        <span style={{ fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.1em' }}>
          AMERICAN EXPRESS
        </span>
      );
    case 'discover':
      return (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.05em' }}>DISCOVER</span>
          <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#F76F20', display: 'inline-block' }} />
        </span>
      );
    case 'rupay':
      return (
        <span style={{ fontSize: 17, fontWeight: 900, color: 'rgba(255,255,255,0.9)', letterSpacing: '0.05em' }}>
          Ru<span style={{ color: '#F4A020' }}>Pay</span>
        </span>
      );
    case 'maestro':
      return (
        <span style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#009BE1', display: 'inline-block' }} />
          <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#ED1C2E', display: 'inline-block', marginLeft: -10 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginLeft: 6 }}>maestro</span>
        </span>
      );
    default:
      return null;
  }
}

export default function CreditCardView({ item }: CreditCardViewProps) {
  const [showCvv, setShowCvv] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const {
    cardNumber = '',
    cardholderName = '',
    expiry = '',
    cvv = '',
    pin = '',
    notes = '',
    cardType,
    cardMode,
  } = item.fields;
  const brand = cardType || detectCardBrand(cardNumber);
  const attachments = item.attachments ?? [];
  const frontAttachment = attachments.find((att) => att.side === 'front');
  const backAttachment = attachments.find((att) => att.side === 'back');
  const formattedTags = item.tags ?? [];
  const createdLabel = useMemo(() => {
    if (!item.createdAt) return '—';
    return new Date(item.createdAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [item.createdAt]);
  const updatedLabel = useMemo(() => {
    if (!item.updatedAt) return '—';
    return new Date(item.updatedAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, [item.updatedAt]);
  const modeLabel =
    cardMode === 'credit'
      ? 'Credit'
      : cardMode === 'debit'
        ? 'Debit'
        : '—';
  const networkLabel = (cardType || brand || '—').toUpperCase();
  const attachmentCountLabel = `${attachments.length} image${attachments.length === 1 ? '' : 's'}`;

  const downloadAttachment = (att: { data: string; fileName?: string }) => {
    if (!att || !att.data) return;
    const anchor = document.createElement('a');
    anchor.href = att.data;
    anchor.download = att.fileName || item.title;
    anchor.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Visual card */}
      <div className={`credit-card-visual ${brand}`}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="card-chip" />
          <BrandBadge brand={brand} />
        </div>
        <div className="card-number">
          {cardNumber ? maskNumber(cardNumber) : '•••• •••• •••• ••••'}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div className="card-expiry-label">Card Holder</div>
            <div className="card-holder">{cardholderName || 'YOUR NAME'}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="card-expiry-label">Expires</div>
            <div className="card-expiry-value">{expiry || 'MM/YY'}</div>
          </div>
        </div>
      </div>

      <div className="card-meta-grid">
        <div className="card-meta-item">
          <span className="card-meta-label">Mode</span>
          {cardMode ? (
            <span className={`card-mode-badge card-mode-badge--${cardMode}`}>
              {modeLabel}
            </span>
          ) : (
            <span className="card-meta-value">—</span>
          )}
        </div>
        <div className="card-meta-item">
          <span className="card-meta-label">Network</span>
          <span className="card-meta-value">{networkLabel}</span>
        </div>
        <div className="card-meta-item">
          <span className="card-meta-label">Attachments</span>
          <span className="card-meta-value">{attachmentCountLabel}</span>
        </div>
        <div className="card-meta-item">
          <span className="card-meta-label">Created</span>
          <span className="card-meta-value">{createdLabel}</span>
        </div>
        <div className="card-meta-item">
          <span className="card-meta-label">Updated</span>
          <span className="card-meta-value">{updatedLabel}</span>
        </div>
        {formattedTags.length > 0 && (
          <div className="card-meta-item card-meta-item--tags">
            <span className="card-meta-label">Tags</span>
            <div className="tags" style={{ margin: 0 }}>
              {formattedTags.map((tag) => (
                <span key={`${item._id}-${tag}`} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {item.fileData && item.fileMimeType?.startsWith('image/') && (
        <div>
          <div className="form-label">Card photo</div>
          <img
            src={item.fileData}
            alt=""
            style={{ maxWidth: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}
          />
        </div>
      )}

      {(frontAttachment || backAttachment) && (
        <div>
          <div className="form-label">Card images</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: 12,
            }}
          >
            {[{ att: frontAttachment, label: 'Front' }, { att: backAttachment, label: 'Back' }]
              .filter((entry) => entry.att)
              .map(({ att, label }) => (
                <div
                  key={att!.id}
                  className="glass-card"
                  style={{
                    padding: 0,
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <img
                    src={att!.data}
                    alt={`${label} of card`}
                    style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      gap: 10,
                      borderTop: '1px solid var(--border-subtle)',
                    }}
                  >
                    <span style={{ fontSize: 13 }}>{att!.name || label}</span>
                    <button
                      className="btn btn-ghost"
                      style={{ height: 28, padding: '0 10px', fontSize: 11, gap: 6 }}
                      onClick={() => downloadAttachment(att!)}
                    >
                      <Download size={12} /> Download
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Card Number */}
        <div style={{ gridColumn: '1 / -1' }}>
          <div className="form-label">Card Number</div>
          <div className="input-with-action">
            <div className="form-input mono" style={{ flex: 1 }}>{formatNumber(cardNumber) || '—'}</div>
            <CopyButton value={cardNumber} label="Copy number" />
          </div>
        </div>

        {/* Expiry */}
        <div>
          <div className="form-label">Expiry</div>
          <div className="input-with-action">
            <div className="form-input" style={{ flex: 1 }}>{expiry || '—'}</div>
            <CopyButton value={expiry} label="Copy expiry" />
          </div>
        </div>

        {/* CVV */}
        <div>
          <div className="form-label">CVV / CVC</div>
          <div className="input-with-action">
            <div className="form-input mono" style={{ flex: 1 }}>
              {showCvv ? cvv : '•'.repeat(cvv.length || 3)}
            </div>
            <Tooltip label={showCvv ? 'Hide CVV' : 'Show CVV'}>
              <button className="action-btn" onClick={() => setShowCvv(p => !p)} aria-label="Toggle CVV">
                {showCvv ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </Tooltip>
            <CopyButton value={cvv} label="Copy CVV" />
          </div>
        </div>

        {/* PIN */}
        {pin && (
          <div style={{ gridColumn: '1 / -1' }}>
            <div className="form-label">ATM PIN</div>
            <div className="input-with-action">
              <div className="form-input mono" style={{ flex: 1 }}>
                {showPin ? pin : '•'.repeat(pin.length || 4)}
              </div>
              <Tooltip label={showPin ? 'Hide PIN' : 'Show PIN'}>
                <button className="action-btn" onClick={() => setShowPin(p => !p)} aria-label="Toggle PIN">
                  {showPin ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </Tooltip>
              <CopyButton value={pin} label="Copy PIN" />
            </div>
          </div>
        )}

        {/* Notes */}
        {notes && (
          <div style={{ gridColumn: '1 / -1' }}>
            <div className="form-label">Notes</div>
            <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: 14 }}>
              {notes}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
