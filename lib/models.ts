import mongoose, { Schema, Model, Types } from 'mongoose';

// ─── User ─────────────────────────────────────────────────────────────────────

export interface IUser {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;       // bcrypt of full password
  pinHash: string | null;     // bcrypt of 4-digit quick PIN
  vaultName: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    pinHash: { type: String, default: null },
    vaultName: { type: String, default: 'My Vault' },
  },
  { timestamps: true }
);

export const UserModel: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

// ─── Item ─────────────────────────────────────────────────────────────────────

interface IItem {
  userId: string;   // owner
  type: string;
  title: string;
  tags: string[];
  folderId: string | null;
  fields: Map<string, string>;
  fileData?: string;
  filePublicId?: string;
  fileResourceType?: string;
  fileName?: string;
  fileMimeType?: string;
  attachments: {
    data: string;
    name: string;
    mimeType: string;
    label?: string;
    publicId?: string;
    resourceType?: string;
  }[];
  dedupeKey?: string;
  isFavourite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ItemSchema = new Schema<IItem>(
  {
    userId: { type: String, required: true, index: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    tags: [{ type: String }],
    folderId: { type: String, default: null },
    fields: { type: Map, of: String, default: {} },
    fileData: { type: String },
    filePublicId: { type: String },
    fileResourceType: { type: String },
    fileName: { type: String },
    fileMimeType: { type: String },
    attachments: [{
      data: { type: String, required: true },
      name: { type: String, required: true },
      mimeType: { type: String, required: true },
      label: { type: String },
      publicId: { type: String },
      resourceType: { type: String },
    }],
    dedupeKey: { type: String, index: true },
    isFavourite: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const ItemModel: Model<IItem> =
  mongoose.models.Item || mongoose.model<IItem>('Item', ItemSchema);

// ─── Folder ───────────────────────────────────────────────────────────────────

interface IFolder {
  userId: string;
  name: string;
  parentId: string | null;
  path: string[];
  icon?: string;
  createdAt: Date;
}

const FolderSchema = new Schema<IFolder>({
  userId: { type: String, required: true, index: true },
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
  userId: string;
  name: string;
  emoji: string;
  role: string;
  permissions: string[];
  createdAt: Date;
}

const FamilyMemberSchema = new Schema<IFamilyMember>({
  userId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  emoji: { type: String, default: '👤' },
  role: { type: String, default: 'viewer' },
  permissions: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
});

export const FamilyMemberModel: Model<IFamilyMember> =
  mongoose.models.FamilyMember ||
  mongoose.model<IFamilyMember>('FamilyMember', FamilyMemberSchema);

// ─── ShareLink ────────────────────────────────────────────────────────────────

export interface IShareLink {
  _id: Types.ObjectId;
  linkId: string;              // unique short ID for URL
  itemId: string;              // which item to share
  userId: string;              // who owns this link
  type: 'open' | 'semi-encrypted' | 'fully-encrypted';
  role: 'read' | 'download' | 'edit';
  pinHash?: string;            // bcrypt of PIN for semi-encrypted
  allowedEmails?: string[];    // for fully-encrypted access control
  expiresAt?: Date;
  accessLog?: {
    ip?: string;
    email?: string;
    accessedAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const ShareLinkSchema = new Schema<IShareLink>(
  {
    linkId: { type: String, required: true, unique: true, index: true },
    itemId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    type: { type: String, enum: ['open', 'semi-encrypted', 'fully-encrypted'], required: true },
    role: { type: String, enum: ['read', 'download', 'edit'], default: 'read' },
    pinHash: { type: String },
    allowedEmails: [{ type: String }],
    expiresAt: { type: Date },
    accessLog: [{
      ip: { type: String },
      email: { type: String },
      accessedAt: { type: Date, default: Date.now },
    }],
  },
  { timestamps: true }
);

export const ShareLinkModel: Model<IShareLink> =
  mongoose.models.ShareLink || mongoose.model<IShareLink>('ShareLink', ShareLinkSchema);
