import mongoose, { Schema, Model } from 'mongoose';

// ─── VaultConfig ──────────────────────────────────────────────────────────────

interface IVaultConfig {
  masterPinHash: string;
  vaultName: string;
  createdAt: Date;
}

const VaultConfigSchema = new Schema<IVaultConfig>({
  masterPinHash: { type: String, required: true },
  vaultName: { type: String, default: 'My Vault' },
  createdAt: { type: Date, default: Date.now },
});

export const VaultConfigModel: Model<IVaultConfig> =
  mongoose.models.VaultConfig ||
  mongoose.model<IVaultConfig>('VaultConfig', VaultConfigSchema);

// ─── Item ─────────────────────────────────────────────────────────────────────

interface IItem {
  type: string;
  title: string;
  tags: string[];
  folderId: string | null;
  fields: Map<string, string>;
  fileData?: string;
  fileName?: string;
  fileMimeType?: string;
  isFavourite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ItemSchema = new Schema<IItem>(
  {
    type: { type: String, required: true },
    title: { type: String, required: true },
    tags: [{ type: String }],
    folderId: { type: String, default: null },
    fields: { type: Map, of: String, default: {} },
    fileData: { type: String },
    fileName: { type: String },
    fileMimeType: { type: String },
    isFavourite: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const ItemModel: Model<IItem> =
  mongoose.models.Item || mongoose.model<IItem>('Item', ItemSchema);

// ─── Folder ───────────────────────────────────────────────────────────────────

interface IFolder {
  name: string;
  parentId: string | null;
  path: string[];
  icon?: string;
  createdAt: Date;
}

const FolderSchema = new Schema<IFolder>({
  name: { type: String, required: true },
  parentId: { type: String, default: null },
  path: [{ type: String }],
  icon: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export const FolderModel: Model<IFolder> =
  mongoose.models.Folder || mongoose.model<IFolder>('Folder', FolderSchema);

// ─── FamilyMember ─────────────────────────────────────────────────────────────

interface IFamilyMember {
  name: string;
  emoji: string;
  role: string;
  permissions: string[];
  createdAt: Date;
}

const FamilyMemberSchema = new Schema<IFamilyMember>({
  name: { type: String, required: true },
  emoji: { type: String, default: '👤' },
  role: { type: String, default: 'viewer' },
  permissions: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

export const FamilyMemberModel: Model<IFamilyMember> =
  mongoose.models.FamilyMember ||
  mongoose.model<IFamilyMember>('FamilyMember', FamilyMemberSchema);
