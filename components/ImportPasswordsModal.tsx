'use client';

import { useState, useMemo, useCallback } from 'react';
import { Download, FileSpreadsheet, AlertTriangle, CheckCircle2, Copy } from 'lucide-react';
import Modal from './Modal';
import type { VaultItem } from '@/lib/types';
import {
  parseChromePasswordCSV,
  classifyChromeRows,
  normalizeLoginKey,
  type ChromePasswordRow,
} from '@/lib/chrome-password-csv';

interface ImportPasswordsModalProps {
  open: boolean;
  onClose: () => void;
  items: VaultItem[];
  onImported: (count: number) => void;
  importRow: (row: ChromePasswordRow) => Promise<void>;
  onBulkImport?: (rows: ChromePasswordRow[]) => Promise<void>;
}

export default function ImportPasswordsModal({
  open,
  onClose,
  items,
  onImported,
  importRow,
  onBulkImport,
}: ImportPasswordsModalProps) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastError, setLastError] = useState('');

  const existingKeys = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) {
      if (it.type !== 'password') continue;
      if (it.dedupeKey) {
        set.add(it.dedupeKey);
        continue;
      }
      const f = it.fields as Record<string, string>;
      const url = f.url || '';
      const user = f.username || '';
      set.add(normalizeLoginKey(url, user));
    }
    return set;
  }, [items]);

  const analysis = useMemo(() => {
    if (!text.trim()) {
      return {
        parsedOk: null as boolean | null,
        total: 0,
        toImport: [] as ChromePasswordRow[],
        invalid: 0,
        dupInFile: 0,
        dupInVault: 0,
      };
    }
    const { headersOk, rows } = parseChromePasswordCSV(text);
    if (!headersOk) {
      return {
        parsedOk: false,
        total: 0,
        toImport: [],
        invalid: 0,
        dupInFile: 0,
        dupInVault: 0,
      };
    }
    const { toImport, counts } = classifyChromeRows(rows, existingKeys);
    return {
      parsedOk: true,
      total: rows.length,
      toImport,
      invalid: counts.invalid,
      dupInFile: counts.duplicateInFile,
      dupInVault: counts.duplicateInVault,
    };
  }, [text, existingKeys]);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setText(typeof reader.result === 'string' ? reader.result : '');
      setLastError('');
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  const runImport = useCallback(async () => {
    if (analysis.toImport.length === 0 || !analysis.parsedOk) return;
    setBusy(true);
    setLastError('');
    try {
      if (onBulkImport) {
        await onBulkImport(analysis.toImport);
        onImported(analysis.toImport.length);
      } else {
        let ok = 0;
        for (const row of analysis.toImport) {
          await importRow(row);
          ok++;
        }
        onImported(ok);
      }
      setText('');
    } catch (err) {
      console.error('Import error:', err);
      setLastError('Import failed partway. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }, [analysis, importRow, onBulkImport, onImported]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Import from Chrome (CSV)"
      maxWidth={600}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={runImport}
            disabled={busy || !analysis.parsedOk || analysis.toImport.length === 0}
          >
            {busy ? 'Importing…' : `Import ${analysis.toImport.length} password${analysis.toImport.length === 1 ? '' : 's'}`}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div
          className="glass-card"
          style={{ padding: 14, borderRadius: 'var(--radius-md)', display: 'flex', gap: 12, alignItems: 'flex-start' }}
        >
          <Download size={20} style={{ color: 'var(--accent-cyan)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Export passwords in Chrome</div>
            <ol style={{ fontSize: 13, color: 'var(--text-secondary)', paddingLeft: 18, lineHeight: 1.65, margin: 0 }}>
              <li>Open <code className="mono" style={{ fontSize: 12 }}>chrome://settings/passwords</code></li>
              <li>Click <strong>Google Password Manager</strong> (or Saved passwords)</li>
              <li>Open the <strong>Settings</strong> (gear) menu → <strong>Export passwords</strong></li>
              <li>Confirm with your computer password and save the <strong>.csv</strong> file</li>
              <li>Upload that file below — it must include columns:{' '}
                <span style={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}>name, url, username, password</span>
              </li>
            </ol>
          </div>
        </div>

        <div>
          <label className="form-label">CSV file</label>
          <input type="file" accept=".csv,text/csv" className="form-input" onChange={handleFile} />
        </div>

        <div>
          <label className="form-label">Or paste CSV contents</label>
          <textarea
            className="form-textarea"
            rows={5}
            value={text}
            onChange={(e) => { setText(e.target.value); setLastError(''); }}
            placeholder="name,url,username,password&#10;..."
            style={{ fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 12 }}
          />
        </div>

        {analysis.parsedOk === false && text.trim() && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-amber)', fontSize: 13 }}>
            <AlertTriangle size={16} /> Not a valid Chrome export. Expected header row: name, url, username, password.
          </div>
        )}

        {analysis.parsedOk === true && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, fontSize: 13 }}>
            <div className="glass-card" style={{ padding: 12, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileSpreadsheet size={16} color="var(--accent-cyan)" />
              <span><strong>{analysis.total}</strong> rows in file</span>
            </div>
            <div className="glass-card" style={{ padding: 12, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={16} color="var(--accent-emerald)" />
              <span><strong>{analysis.toImport.length}</strong> ready to import</span>
            </div>
            <div className="glass-card" style={{ padding: 12, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} color="var(--accent-amber)" />
              <span><strong>{analysis.invalid}</strong> invalid (missing username or password)</span>
            </div>
            <div className="glass-card" style={{ padding: 12, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Copy size={16} color="var(--text-muted)" />
              <span>
                <strong>{analysis.dupInVault + analysis.dupInFile}</strong> skipped duplicate
                {analysis.dupInVault > 0 && ` (${analysis.dupInVault} already in vault)`}
                {analysis.dupInFile > 0 && ` (${analysis.dupInFile} repeated in CSV)`}
              </span>
            </div>
          </div>
        )}

        {lastError && (
          <div style={{ color: 'var(--accent-rose)', fontSize: 13 }}>{lastError}</div>
        )}
      </div>
    </Modal>
  );
}
