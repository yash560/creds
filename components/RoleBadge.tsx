'use client';

import type { Role } from '@/lib/types';

export default function RoleBadge({ role }: { role: Role }) {
  return (
    <span className={`role-badge role-${role}`}>{role}</span>
  );
}
