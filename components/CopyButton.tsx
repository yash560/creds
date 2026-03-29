'use client';

import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';
import Tooltip from './Tooltip';

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
}

export default function CopyButton({ value, label = 'Copy', className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = value;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  }, [value]);

  return (
    <Tooltip label={copied ? 'Copied!' : label}>
      <button
        onClick={handleCopy}
        className={`action-btn ${className}`}
        aria-label={label}
      >
        {copied
          ? <Check size={13} style={{ color: 'var(--accent-emerald)', animation: 'checkmark 0.3s ease' }} />
          : <Copy size={13} />
        }
      </button>
    </Tooltip>
  );
}
