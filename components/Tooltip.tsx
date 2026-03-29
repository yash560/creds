'use client';

import { ReactNode } from 'react';

interface TooltipProps {
  label: string;
  children: ReactNode;
}

export default function Tooltip({ label, children }: TooltipProps) {
  return (
    <div className="tooltip-wrap">
      {children}
      <span className="tooltip-label">{label}</span>
    </div>
  );
}
