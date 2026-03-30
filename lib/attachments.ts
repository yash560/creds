import type { Attachment } from '@/lib/types';

function ensureName(value: Partial<Attachment> | undefined, index: number) {
  if (!value) return undefined;
  return (
    value.name ||
    value.fileName ||
    value.label ||
    `attachment-${index + 1}`
  );
}

export function normalizeAttachments(attachments?: Partial<Attachment>[] | null) {
  if (!attachments || attachments.length === 0) return attachments;
  return attachments.map((att, idx) => ({
    ...att,
    name: ensureName(att, idx),
  }));
}
