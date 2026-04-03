'use client';

import { ReactNode, useRef, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  label: string;
  children: ReactNode;
}

export default function Tooltip({ label, children }: TooltipProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const trimmed = (label ?? '').trim();

  const reposition = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const margin = 8;
    setPos({
      top: r.bottom + margin,
      left: r.left + r.width / 2,
    });
  }, []);

  const show = useCallback(() => {
    reposition();
    setOpen(true);
  }, [reposition]);

  const hide = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, reposition]);

  const floating =
    open && typeof document !== 'undefined'
      ? createPortal(
          <span
            role="tooltip"
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              transform: 'translateX(-50%)',
              zIndex: 200000,
              pointerEvents: 'none',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              fontSize: 12,
              fontWeight: 500,
              padding: '6px 10px',
              borderRadius: 6,
              whiteSpace: 'nowrap',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {trimmed}
          </span>,
          document.body
        )
      : null;
  if (!trimmed) return <>{children}</>;

  return (
    <>
      <div
        ref={wrapRef}
        className="tooltip-wrap"
        style={{ display: 'inline-flex', maxWidth: '100%' }}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocusCapture={show}
        onBlurCapture={hide}
      >
        {children}
      </div>
      {floating}
    </>
  );
}
