'use client';

import React, { useState, useRef } from 'react';
import JSZip from 'jszip';
import { 
  Upload, 
  FileArchive, 
  CheckCircle2, 
  Loader2,
  AlertCircle,
  Zap
} from 'lucide-react';
import Modal from './Modal';
import { useVault } from '@/context/VaultContext';
import { Attachment } from '@/lib/types';

interface ZipImportModalProps {
  open: boolean;
  onClose: () => void;
  targetFolderId?: string | null;
}

const CLOUDINARY_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const BATCH_SIZE = 5; 

export default function ZipImportModal({ open, onClose, targetFolderId: initialTargetId }: ZipImportModalProps) {
  const { folders, addItem, addFolder, categories } = useVault();
  const [file, setFile] = useState<File | null>(null);
  const [targetId, setTargetId] = useState<string>(initialTargetId || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' });
  const [isDone, setIsDone] = useState(false);
  const [skippedFiles, setSkippedFiles] = useState<{name: string, size: number, reason: string}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && selected.name.endsWith('.zip')) {
      setFile(selected);
    } else {
      alert('Please select a valid .zip file');
    }
  };

  const getMimeType = (fileName: string, dataUrl: string): string => {
    const match = dataUrl.match(/^data:([^;]+);/);
    if (match && match[1] !== 'application/octet-stream') return match[1];
    
    const ext = fileName.trim().split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return 'application/pdf';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'png': return 'image/png';
      case 'webp': return 'image/webp';
      case 'gif': return 'image/gif';
      case 'txt': return 'text/plain';
      default: return 'application/octet-stream';
    }
  };

  const getCategoryFromFileName = (fileName: string): string => {
    const name = fileName.toUpperCase();
    
    // Check dynamic categories first
    const match = categories.find(c => name.includes(c.name.toUpperCase()));
    if (match) return match.name;

    if (name.includes('PAN')) return 'PAN';
    if (name.includes('AADHAAR') || name.includes('ADHAR')) return 'Aadhaar';
    if (name.includes('PASSPORT')) return 'Passport';
    if (name.includes('VOTER')) return 'Voter ID';
    if (name.includes('DRIVING') || name.includes('LICENSE')) return 'Driving License';
    if (name.includes('INSURANCE')) return 'Insurance';
    if (name.includes('MARKSHEET') || name.includes('RESULT')) return 'Academic';
    if (name.includes('RESUME') || name.includes('CV')) return 'Resume';
    return 'Other';
  };

  const processZip = async () => {
    if (!file) return;
    setIsProcessing(true);
    setIsDone(false);
    setSkippedFiles([]);
    
    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      const entries = Object.values(contents.files);
      const total = entries.length;
      
      setProgress({ current: 0, total, message: 'Reconstructing Hierarchy...' });

      const folderMap = new Map<string, string | null>();
      folderMap.set('', targetId || null);

      const localSkipped: {name: string, size: number, reason: string}[] = [];

      const allPaths = new Set<string>();
      entries.forEach(e => {
        const parts = e.name.split('/');
        if (e.dir) {
          allPaths.add(e.name.replace(/\/$/, ''));
        } else {
          parts.pop();
          if (parts.length > 0) allPaths.add(parts.join('/'));
        }
      });

      const sortedPaths = Array.from(allPaths).sort((a, b) => a.split('/').length - b.split('/').length);

      for (const path of sortedPaths) {
        const parts = path.split('/');
        let currentPath = '';
        let currentParentId = targetId || null;

        for (const part of parts) {
          const nextPath = currentPath ? `${currentPath}/${part}` : part;
          if (!folderMap.has(nextPath)) {
            try {
              const created = await addFolder(part, currentParentId);
              folderMap.set(nextPath, created._id);
              currentParentId = created._id;
            } catch (err) {
              console.error(`Failed to create folder ${part}`, err);
            }
          } else {
            currentParentId = folderMap.get(nextPath)!;
          }
          currentPath = nextPath;
        }
      }

      const fileEntries = entries.filter(e => !e.dir && !e.name.split('/').pop()?.startsWith('.') && !e.name.includes('__MACOSX'));
      const fileTotal = fileEntries.length;
      let filesProcessed = 0;

      const processFile = async (entry: JSZip.JSZipObject) => {
        const parts = entry.name.split('/');
        const fileName = parts.pop()!;
        const parentPath = parts.join('/');
        const finalParentId = folderMap.get(parentPath) || targetId || null;

        try {
          const blob = await entry.async('blob');
          if (blob.size > CLOUDINARY_MAX_SIZE) {
            throw new Error('Exceeds 10MB limit');
          }

          const dataUrl = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });

          const mimeType = getMimeType(fileName, dataUrl);
          const category = getCategoryFromFileName(fileName);
          
          const attachment: Attachment = {
            id: `zip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            data: dataUrl,
            fileName: fileName,
            mimeType: mimeType,
            label: fileName,
            name: fileName
          };

          await addItem({
            type: 'document',
            title: fileName,
            folderId: finalParentId,
            fileName: fileName,
            fileMimeType: mimeType,
            fields: {
              category: category,
              notes: '',
            },
            createdAt: entry.date.toISOString(),
            updatedAt: entry.date.toISOString(),
            attachments: [attachment],
          });
        } catch (err: unknown) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          localSkipped.push({ 
            name: entry.name, 
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            size: (entry as any)._data?.uncompressedSize || 0,
            reason: errorMessage
          });
        } finally {
          filesProcessed++;
          setProgress(prev => ({ 
            ...prev, 
            current: prev.current + 1, 
            message: `Lightning Import: ${fileName} (${filesProcessed}/${fileTotal})` 
          }));
        }
      };

      for (let i = 0; i < fileEntries.length; i += BATCH_SIZE) {
        const batch = fileEntries.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(entry => processFile(entry)));
      }

      setSkippedFiles(localSkipped);
      setIsDone(true);
      setProgress({ current: total, total, message: 'All items imported flawlessly' });
    } catch (err) {
      console.error('ZIP process failed', err);
      alert('Failed to process ZIP file');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetModals = () => {
    setFile(null);
    setIsProcessing(false);
    setIsDone(false);
    setSkippedFiles([]);
    setProgress({ current: 0, total: 0, message: '' });
    onClose();
  };

  return (
    <Modal 
      open={open} 
      onClose={isProcessing ? () => {} : resetModals} 
      title="Import ZIP Archive"
      footer={
        !isProcessing && !isDone && (
          <>
            <button className="btn btn-ghost" onClick={resetModals}>Cancel</button>
            <button className="btn btn-primary" onClick={processZip} disabled={!file}>
               <Upload size={16} /> Start Lightning Import
            </button>
          </>
        )
      }
    >
      {!isProcessing && !isDone ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div 
            className="dropzone-modern"
            onClick={() => fileInputRef.current?.click()}
          >
            <input type="file" ref={fileInputRef} hidden accept=".zip" onChange={handleFileChange} />
            {file ? (
              <div className="file-preview-zip">
                <FileArchive size={32} color="var(--accent-primary)" />
                <div>
                  <div style={{ fontWeight: 600 }}>{file.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="upload-icon-circle"><Upload size={24} /></div>
                <h3>Bulk Import ZIP</h3>
                <p>Lightning fast multi-threaded uploads</p>
              </>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Destination Folder</label>
            <select className="form-select" value={targetId} onChange={(e) => setTargetId(e.target.value)}>
              <option value="">Vault Root</option>
              {folders.map(f => (
                <option key={f._id} value={f._id}>
                  {f.path.length > 0 ? `${'  '.repeat(f.path.length)} ∟ ` : ''} {f.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : isProcessing ? (
        <div className="import-progress-container">
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={48} className="animate-spin" color="var(--accent-primary)" />
            <Zap size={20} color="var(--accent-primary)" style={{ position: 'absolute' }} />
          </div>
          <div className="progress-details">
            <div className="progress-message">{progress.message}</div>
            <div className="progress-bar-bg" style={{ height: 6 }}>
              <div className="progress-bar-fill" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
            </div>
          </div>
        </div>
      ) : (
        <div className="import-success-state">
          <div className="success-icon-circle">
            {skippedFiles.length > 0 ? <AlertCircle size={40} color="var(--warning)" /> : <CheckCircle2 size={40} />}
          </div>
          <h3>Import Complete</h3>
          {skippedFiles.length > 0 ? (
            <div style={{ width: '100%', textAlign: 'left' }}>
              <p style={{ color: 'var(--warning)', fontWeight: 600, marginBottom: 12, fontSize: 13, lineHeight: 1.4 }}>
                The following {skippedFiles.length} item(s) could not be uploaded:
              </p>
              <div className="skipped-files-list">
                {skippedFiles.map((f, i) => (
                  <div key={i} className="skipped-item">
                    <div className="name-box">
                       <span className="name">{f.name}</span>
                       <span className="reason-tag" title={f.reason}>{f.reason}</span>
                    </div>
                    <span className="size">{(f.size / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p>All items were imported as native documents without data duplication.</p>
          )}
          <button className="btn btn-primary" style={{ marginTop: 24, width: '100%' }} onClick={resetModals}>Finish</button>
        </div>
      )}
    </Modal>
  );
}
