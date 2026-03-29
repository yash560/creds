// ─── Core Enums ───────────────────────────────────────────────────────────────

export type ItemType = 'password' | 'card' | 'document' | 'scan';
export type Role = 'admin' | 'editor' | 'viewer';

// ─── Vault Item ────────────────────────────────────────────────────────────────

export interface VaultItem {
  _id: string;
  type: ItemType;
  title: string;
  tags: string[];
  folderId: string | null;
  /** Fields are stored as plain strings (encrypted at rest in DB) */
  fields: Record<string, string>;
  /** Base64-encoded image/file data */
  fileData?: string;
  fileName?: string;
  fileMimeType?: string;
  isFavourite?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Typed Item Variants ───────────────────────────────────────────────────────

export interface PasswordItem extends VaultItem {
  type: 'password';
  fields: {
    username: string;
    password: string;
    url?: string;
    notes?: string;
  };
}

export interface CardItem extends VaultItem {
  type: 'card';
  fields: {
    cardholderName: string;
    cardNumber: string;
    expiry: string;
    cvv: string;
    cardType?: string; // visa | mastercard | amex | etc.
    pin?: string;
    notes?: string;
  };
}

export interface DocumentItem extends VaultItem {
  type: 'document';
  fields: {
    category?: string; // aadhaar | passport | pan | vehicle | insurance | etc.
    documentNumber?: string;
    issuedBy?: string;
    expiryDate?: string;
    notes?: string;
  };
}

export interface ScanItem extends VaultItem {
  type: 'scan';
  fields: {
    notes?: string;
  };
}

// ─── Folder ────────────────────────────────────────────────────────────────────

export interface Folder {
  _id: string;
  name: string;
  parentId: string | null;
  path: string[]; // array of ancestor _ids for breadcrumb
  icon?: string;
  createdAt: string;
}

// ─── Family Member ─────────────────────────────────────────────────────────────

export interface FamilyMember {
  _id: string;
  name: string;
  emoji?: string; // avatar emoji instead of image
  role: Role;
  /** tag IDs or folder IDs this member can access (empty = all for admin) */
  permissions: string[];
  createdAt: string;
}

// ─── Vault Config (single document) ───────────────────────────────────────────

export interface VaultConfig {
  masterPinHash: string;
  vaultName: string;
  createdAt: string;
}

// ─── API Responses ─────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

// ─── UI State ──────────────────────────────────────────────────────────────────

export type ViewMode = 'grid' | 'list';

export interface SearchState {
  query: string;
  type: ItemType | 'all';
}
