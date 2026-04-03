'use client';

import React from 'react';

export function CardSkeleton() {
  return (
    <div className="skeleton skeleton-card" style={{ padding: 20 }}>
      <div className="skeleton skeleton-title" style={{ width: '40%' }}></div>
      <div className="skeleton skeleton-text" style={{ width: '80%' }}></div>
      <div className="skeleton skeleton-text" style={{ width: '60%' }}></div>
    </div>
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="item-grid animate-fadeIn">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 64, borderRadius: 12 }}></div>
      ))}
    </div>
  );
}
