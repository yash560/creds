'use client';

import { Download, ExternalLink } from 'lucide-react';
import type { DocumentItem, ScanItem } from '@/lib/types';
import CopyButton from '../CopyButton';
import Tooltip from '../Tooltip';

interface DocumentCardViewProps {
  item: DocumentItem | ScanItem;
}

export default function DocumentCardView({ item }: DocumentCardViewProps) {
  const f = item.fields as Record<string, string>;

  const handleDownload = () => {
    if (!item.fileData) return;
    const a = document.createElement('a');
    a.href = item.fileData;
    a.download = item.fileName || `${item.title}.${item.fileMimeType?.split('/')[1] || 'bin'}`;
    a.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Image preview */}
      {item.fileData && (
        <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', position: 'relative' }}>
          {item.fileMimeType?.startsWith('image/') ? (
            <img
              src={item.fileData}
              alt={item.title}
              style={{ width: '100%', maxHeight: 300, objectFit: 'contain', background: 'var(--bg-card)' }}
            />
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 14 }}>
              📄 {item.fileName || 'Attached file'}
            </div>
          )}
          <Tooltip label="Download file">
            <button
              onClick={handleDownload}
              className="btn btn-ghost"
              style={{ position: 'absolute', top: 8, right: 8, gap: 6, padding: '6px 12px' }}
            >
              <Download size={14} /> Download
            </button>
          </Tooltip>
        </div>
      )}

      {/* Document fields */}
      {item.type === 'document' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {f.category && (
            <div>
              <div className="form-label">Category</div>
              <div className="form-input" style={{ display: 'flex', alignItems: 'center' }}>{f.category}</div>
            </div>
          )}
          {f.documentNumber && (
            <div>
              <div className="form-label">Document Number</div>
              <div className="input-with-action">
                <div className="form-input mono" style={{ flex: 1 }}>{f.documentNumber}</div>
                <CopyButton value={f.documentNumber} label="Copy number" />
              </div>
            </div>
          )}
          {f.issuedBy && (
            <div>
              <div className="form-label">Issued By</div>
              <div className="form-input" style={{ display: 'flex', alignItems: 'center' }}>{f.issuedBy}</div>
            </div>
          )}
          {f.expiryDate && (
            <div>
              <div className="form-label">Expiry Date</div>
              <div className="form-input" style={{ display: 'flex', alignItems: 'center' }}>{f.expiryDate}</div>
            </div>
          )}
          {f.notes && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div className="form-label">Notes</div>
              <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: 14, whiteSpace: 'pre-wrap' }}>
                {f.notes}
              </div>
            </div>
          )}
        </div>
      )}

      {item.type === 'scan' && f.notes && (
        <div>
          <div className="form-label">Notes</div>
          <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: 14 }}>{f.notes}</div>
        </div>
      )}
    </div>
  );
}
