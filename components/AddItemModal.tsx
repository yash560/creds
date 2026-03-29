'use client';

import { useState } from 'react';
import type { VaultItem, ItemType } from '@/lib/types';
import Modal from './Modal';
import ScanUploader from './sections/ScanUploader';

interface AddItemModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (payload: Partial<VaultItem>) => Promise<void>;
  initialType?: ItemType;
  existing?: VaultItem | null;
  folders?: { _id: string; name: string }[];
}

const DOC_CATEGORIES = ['Aadhaar', 'PAN', 'Passport', 'Visa', 'Driving Licence', 'Vehicle RC', 'Insurance', 'Medical', 'Bank', 'Other'];

export default function AddItemModal({ open, onClose, onSave, initialType = 'password', existing, folders = [] }: AddItemModalProps) {
  const [type, setType] = useState<ItemType>(existing?.type ?? initialType);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [tags, setTags] = useState((existing?.tags ?? []).join(', '));
  const [folderId, setFolderId] = useState(existing?.folderId ?? '');
  const [fields, setFields] = useState<Record<string, string>>(existing?.fields ?? {});
  const [fileData, setFileData] = useState(existing?.fileData ?? '');
  const [fileMime, setFileMime] = useState(existing?.fileMimeType ?? '');
  const [fileName, setFileName] = useState(existing?.fileName ?? '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setField = (key: string, val: string) => setFields(prev => ({ ...prev, [key]: val }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Title is required';
    if (type === 'password' && !fields.password) e.password = 'Password is required';
    if (type === 'card' && !fields.cardNumber) e.cardNumber = 'Card number is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await onSave({
        type,
        title: title.trim(),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        folderId: folderId || null,
        fields,
        fileData: fileData || undefined,
        fileMimeType: fileMime || undefined,
        fileName: fileName || undefined,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? `Edit: ${existing.title}` : 'Add New Item'}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving…' : existing ? 'Save Changes' : 'Add Item'}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Type selector */}
        {!existing && (
          <div>
            <div className="form-label">Type</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {(['password', 'card', 'document', 'scan'] as ItemType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`btn ${type === t ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ padding: '8px 4px', fontSize: 12, textTransform: 'capitalize' }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Title */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Title *</label>
          <input className={`form-input ${errors.title ? 'border-red-500' : ''}`} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Gmail, HDFC Visa, Aadhaar" />
          {errors.title && <div style={{ color: 'var(--accent-rose)', fontSize: 12, marginTop: 4 }}>{errors.title}</div>}
        </div>

        {/* Type-specific fields */}
        {type === 'password' && (
          <>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Username / Email</label>
              <input className="form-input" value={fields.username || ''} onChange={e => setField('username', e.target.value)} placeholder="user@example.com" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Password *</label>
              <input className={`form-input mono ${errors.password ? 'border-red-500' : ''}`} type="text" value={fields.password || ''} onChange={e => setField('password', e.target.value)} placeholder="••••••••" />
              {errors.password && <div style={{ color: 'var(--accent-rose)', fontSize: 12, marginTop: 4 }}>{errors.password}</div>}
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Website URL</label>
              <input className="form-input" value={fields.url || ''} onChange={e => setField('url', e.target.value)} placeholder="https://example.com" />
            </div>
          </>
        )}

        {type === 'card' && (
          <>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Cardholder Name</label>
              <input className="form-input" value={fields.cardholderName || ''} onChange={e => setField('cardholderName', e.target.value)} placeholder="YASH JAIN" />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Card Number *</label>
              <input className={`form-input mono ${errors.cardNumber ? 'border-red-500' : ''}`} value={fields.cardNumber || ''} onChange={e => setField('cardNumber', e.target.value.replace(/\D/g,''))} placeholder="4111 1111 1111 1111" maxLength={19} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Expiry (MM/YY)</label>
                <input className="form-input" value={fields.expiry || ''} onChange={e => setField('expiry', e.target.value)} placeholder="12/27" maxLength={5} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">CVV</label>
                <input className="form-input mono" type="text" value={fields.cvv || ''} onChange={e => setField('cvv', e.target.value)} placeholder="•••" maxLength={4} />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">ATM PIN (optional)</label>
              <input className="form-input mono" type="text" value={fields.pin || ''} onChange={e => setField('pin', e.target.value)} placeholder="••••" maxLength={6} />
            </div>
          </>
        )}

        {type === 'document' && (
          <>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Category</label>
              <select className="form-select" value={fields.category || ''} onChange={e => setField('category', e.target.value)}>
                <option value="">Select category</option>
                {DOC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Document Number</label>
              <input className="form-input mono" value={fields.documentNumber || ''} onChange={e => setField('documentNumber', e.target.value)} placeholder="XXXX-XXXX-XXXX" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Issued By</label>
                <input className="form-input" value={fields.issuedBy || ''} onChange={e => setField('issuedBy', e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Expiry Date</label>
                <input className="form-input" type="date" value={fields.expiryDate || ''} onChange={e => setField('expiryDate', e.target.value)} />
              </div>
            </div>
            <div>
              <div className="form-label">Attach File / Image</div>
              <ScanUploader
                value={fileData}
                mimeType={fileMime}
                fileName={fileName}
                onChange={(d, m, n) => { setFileData(d); setFileMime(m); setFileName(n); }}
                onClear={() => { setFileData(''); setFileMime(''); setFileName(''); }}
              />
            </div>
          </>
        )}

        {type === 'scan' && (
          <div>
            <div className="form-label">Scan / Upload Document</div>
            <ScanUploader
              value={fileData}
              mimeType={fileMime}
              fileName={fileName}
              onChange={(d, m, n) => { setFileData(d); setFileMime(m); setFileName(n); }}
              onClear={() => { setFileData(''); setFileMime(''); setFileName(''); }}
            />
          </div>
        )}

        {/* Notes (all types) */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Notes</label>
          <textarea className="form-textarea" value={fields.notes || ''} onChange={e => setField('notes', e.target.value)} placeholder="Optional notes…" rows={2} />
        </div>

        {/* Tags */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Tags (comma-separated)</label>
          <input className="form-input" value={tags} onChange={e => setTags(e.target.value)} placeholder="personal, work, important" />
        </div>

        {/* Folder */}
        {folders.length > 0 && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Folder</label>
            <select className="form-select" value={folderId} onChange={e => setFolderId(e.target.value)}>
              <option value="">No folder</option>
              {folders.map(f => <option key={f._id} value={f._id}>{f.name}</option>)}
            </select>
          </div>
        )}
      </div>
    </Modal>
  );
}
