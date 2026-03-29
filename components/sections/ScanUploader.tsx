'use client';

import { useRef, useState, useCallback } from 'react';
import { Camera, Upload, X } from 'lucide-react';

interface ScanUploaderProps {
  value?: string;
  mimeType?: string;
  fileName?: string;
  onChange: (data: string, mimeType: string, fileName: string) => void;
  onClear?: () => void;
}

export default function ScanUploader({ value, mimeType, fileName, onChange, onClear }: ScanUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const processFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      onChange(e.target?.result as string, file.type, file.name);
    };
    reader.readAsDataURL(file);
  }, [onChange]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  if (value) {
    return (
      <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
        {mimeType?.startsWith('image/') ? (
          <img src={value} alt="Scan" style={{ width: '100%', maxHeight: 240, objectFit: 'contain', background: 'var(--bg-card)', display: 'block' }} />
        ) : (
          <div style={{ padding: 24, textAlign: 'center', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 14 }}>
            📄 {fileName || 'Attached file'}
          </div>
        )}
        {onClear && (
          <button
            className="btn btn-danger"
            onClick={onClear}
            style={{ position: 'absolute', top: 8, right: 8, padding: '4px 10px', fontSize: 12 }}
          >
            <X size={12} /> Remove
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`scan-dropzone ${drag ? 'drag' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
      onClick={() => fileRef.current?.click()}
    >
      <input ref={fileRef} type="file" hidden accept="image/*,.pdf" onChange={handleFile} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: 'var(--text-secondary)' }}>
        <Upload size={32} style={{ opacity: 0.4 }} />
        <div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Drop file or click to upload</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Images (JPG, PNG, HEIC) or PDF</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <span className="btn btn-ghost" style={{ fontSize: 13, padding: '6px 14px' }}>
            <Upload size={14} /> Browse Files
          </span>
        </div>
      </div>
    </div>
  );
}
