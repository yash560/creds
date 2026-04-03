import { VaultItem, Folder, FamilyMember } from './types';

const SENSITIVE_FIELDS = ['password', 'pin', 'cvv', 'securityCode', 'cardNumber'];

export function filterItems(
  items: VaultItem[],
  query: string,
  folders: Folder[] = [],
  members: FamilyMember[] = []
): VaultItem[] {
  if (!query) return items;

  const q = query.toLowerCase().trim();
  if (!q) return items;

  return items.filter((item) => {
    // 1. Title match
    if (item.title.toLowerCase().includes(q)) return true;

    // 2. Tags match
    if (item.tags?.some((t) => t.toLowerCase().includes(q))) return true;

    // 3. Fields match (excluding sensitive ones)
    if (item.fields) {
      for (const [key, value] of Object.entries(item.fields)) {
        if (SENSITIVE_FIELDS.includes(key)) {
          // Special case for card numbers: match last 4 digits
          if (key === 'cardNumber' && value.length >= 4) {
             const last4 = value.slice(-4);
             if (last4.includes(q)) return true;
          }
          continue;
        }
        if (value && typeof value === 'string' && value.toLowerCase().includes(q)) {
          return true;
        }
      }
    }

    // 4. File name match
    if (item.fileName?.toLowerCase().includes(q)) return true;

    // 5. Folder name match
    if (item.folderId) {
      const folder = folders.find((f) => f._id === item.folderId);
      if (folder?.name.toLowerCase().includes(q)) return true;
    }

    // 6. Member name match
    if (item.memberId) {
      const member = members.find((m) => m._id === item.memberId);
      if (member?.name.toLowerCase().includes(q)) return true;
    }

    // 7. Special for documents/scans category
    if (item.type === 'document' && item.fields?.category?.toLowerCase().includes(q)) return true;

    return false;
  });
}
