"use client";

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  KeyRound,
  CreditCard,
  FileText,
  ScanLine,
  FolderOpen,
  Users,
  Lock,
  BookOpen,
  Download,
} from "lucide-react";
import Modal from "./Modal";

const GUIDES: {
  icon: LucideIcon;
  title: string;
  body: string;
}[] = [
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    body: "Overview of your vault. Use the sidebar to jump to Passwords, Cards, Documents, and more. The top search bar filters items across the current section.",
  },
  {
    icon: KeyRound,
    title: "Passwords",
    body: "Save logins with username, password, and site URL. Organize with folders and tags. Import many at once from Chrome: Passwords → Import from Chrome (CSV). Rows without a username or password are skipped; duplicates against your vault or within the file are ignored.",
  },
  {
    icon: Download,
    title: "Chrome export (for import)",
    body: "In Chrome: Settings → Autofill and passwords → Google Password Manager → Settings (gear) → Export passwords. Choose the CSV file here in Vaultora. Your CSV is only processed in the browser for the import request.",
  },
  {
    icon: CreditCard,
    title: "Cards",
    body: "Store cardholder name, number, expiry, and CVV securely. Optionally attach a photo of the card using the camera or file upload when adding or editing.",
  },
  {
    icon: FileText,
    title: "Documents",
    body: "IDs and papers: category, numbers, dates, plus an optional scan. Use Take photo for live camera capture or upload a file.",
  },
  {
    icon: ScanLine,
    title: "Scan & upload",
    body: "Quick captures: open Add Scan, then Use camera to snap a document, or drag in images / PDFs. Good for receipts and papers you want kept private.",
  },
  {
    icon: FolderOpen,
    title: "Folders",
    body: "Group passwords (and filter by folder on the Passwords page). Create folders from the Folders screen and assign items when editing them.",
  },
  {
    icon: Users,
    title: "People",
    body: "Track household members and roles. Pair with settings to tune who sees what as you grow the product.",
  },
  {
    icon: Lock,
    title: "Lock & PIN",
    body: "Lock Vault clears the quick-unlock state; with a PIN set, you stay signed in and only re-enter the 4-digit PIN. Use full sign-out from the PIN screen if you need another account on this device.",
  },
];

interface HelpGuideModalProps {
  open: boolean;
  onClose: () => void;
}

export default function HelpGuideModal({ open, onClose }: HelpGuideModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="How to use Vaultora"
      maxWidth={560}
    >
      <p
        style={{
          fontSize: 14,
          color: "var(--text-secondary)",
          marginBottom: 18,
        }}
      >
        Short guides for each area. Icons match the sidebar where possible.
      </p>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          maxHeight: "min(62vh, 520px)",
          overflowY: "auto",
          paddingRight: 4,
        }}
      >
        {GUIDES.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="glass-card"
            style={{
              padding: 14,
              display: "flex",
              gap: 14,
              alignItems: "flex-start",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background:
                  "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon size={18} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>
                {title}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  lineHeight: 1.55,
                }}
              >
                {body}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 16,
          fontSize: 12,
          color: "var(--text-muted)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <BookOpen size={14} /> Open anytime from the sidebar:{" "}
        <strong style={{ color: "var(--text-secondary)" }}>How to use</strong>
      </div>
    </Modal>
  );
}
