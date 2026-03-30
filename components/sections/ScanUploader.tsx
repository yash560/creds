'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, Upload, X, Circle } from 'lucide-react';

interface ScanUploaderProps {
  value?: string;
  mimeType?: string;
  fileName?: string;
  onChange: (data: string, mimeType: string, fileName: string) => void;
  onClear?: () => void;
  /** Live camera capture for documents, cards, or scans. */
  allowCamera?: boolean;
}

export default function ScanUploader({
  value,
  mimeType,
  fileName,
  onChange,
  onClear,
  allowCamera = true,
}: ScanUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [drag, setDrag] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
    setCameraError('');
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

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

  const startCamera = useCallback(async () => {
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera is not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch {
      setCameraError('Could not access the camera. Check permissions and HTTPS.');
    }
  }, []);

  useEffect(() => {
    if (!cameraOpen || !streamRef.current || !videoRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    void videoRef.current.play().catch(() => {});
  }, [cameraOpen]);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth < 2) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const stamp = `capture-${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`;
    onChange(dataUrl, 'image/jpeg', stamp);
    stopCamera();
  }, [onChange, stopCamera]);

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
            type="button"
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

  if (cameraOpen) {
    return (
      <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}>
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          style={{ width: '100%', maxHeight: 280, objectFit: 'cover', display: 'block', background: '#000' }}
        />
        <div style={{ display: 'flex', gap: 10, padding: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="btn btn-primary" onClick={captureFrame}>
            <Circle size={14} style={{ fill: 'currentColor', opacity: 0.9 }} /> Capture photo
          </button>
          <button type="button" className="btn btn-ghost" onClick={stopCamera}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div
        className={`scan-dropzone ${drag ? 'drag' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        role="presentation"
      >
        <input ref={fileRef} type="file" hidden accept="image/*,.pdf" onChange={handleFile} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: 'var(--text-secondary)' }}>
          <Upload size={32} style={{ opacity: 0.4 }} />
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Drop file or click to upload</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Images (JPG, PNG, HEIC) or PDF</div>
          </div>
          <span className="btn btn-ghost" style={{ fontSize: 13, padding: '6px 14px', pointerEvents: 'none' }}>
            <Upload size={14} /> Browse files
          </span>
        </div>
      </div>

      {allowCamera && (
        <>
          <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>or</div>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ width: '100%', justifyContent: 'center', gap: 8 }}
            onClick={(e) => { e.stopPropagation(); startCamera(); }}
          >
            <Camera size={16} /> Use camera
          </button>
          {cameraError && (
            <div style={{ fontSize: 12, color: 'var(--accent-amber)', textAlign: 'center' }}>{cameraError}</div>
          )}
        </>
      )}
    </div>
  );
}
