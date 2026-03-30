"use client";

import { useState } from "react";
import { Copy, Check, Eye, EyeOff } from "lucide-react";
import Modal from "./Modal";
import type { VaultItem } from "@/lib/types";

interface ShareModalProps {
  open: boolean;
  item: VaultItem | null;
  onClose: () => void;
}

type ShareType = "open" | "semi-encrypted" | "fully-encrypted";
type ShareRole = "read" | "download" | "edit";

interface SharePayload {
  itemId: string;
  type: ShareType;
  role: ShareRole;
  pin?: string;
  allowedEmails?: string[];
  expiresInDays?: number;
}

export default function ShareModal({ open, item, onClose }: ShareModalProps) {
  const [shareType, setShareType] = useState<ShareType>("semi-encrypted");
  const [role, setRole] = useState<ShareRole>("read");
  const [pin, setPin] = useState("");
  const [allowedEmails, setAllowedEmails] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("30");
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [showPin, setShowPin] = useState(false);

  if (!open || !item) return null;

  const handleCreateShare = async () => {
    setLoading(true);
    try {
      const payload: SharePayload = {
        itemId: item._id,
        type: shareType,
        role,
        expiresInDays: expiresInDays ? parseInt(expiresInDays) : undefined,
      };

      if (shareType === "semi-encrypted" && pin) {
        payload.pin = pin;
      }

      if (shareType === "fully-encrypted" && allowedEmails) {
        payload.allowedEmails = allowedEmails
          .split(",")
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean);
      }

      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.ok) {
        setShareUrl(data.data.shareUrl);
      } else {
        alert(
          "Failed to create share link: " + (data.error || "Unknown error"),
        );
      }
    } catch (error) {
      alert("Error creating share link");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Share: ${item.title}`}
      footer={
        <>
          <button
            className="btn btn-ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          {!shareUrl ? (
            <button
              className="btn btn-primary"
              onClick={handleCreateShare}
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Share Link"}
            </button>
          ) : (
            <button
              className="btn btn-ghost"
              onClick={() => {
                setShareUrl("");
                setPin("");
                setAllowedEmails("");
              }}
            >
              Create Another
            </button>
          )}
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {!shareUrl ? (
          <>
            {/* Share Type */}
            <div>
              <label className="form-label">Share Type</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {["open", "semi-encrypted", "fully-encrypted"].map((type) => (
                  <label
                    key={type}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      cursor: "pointer",
                      padding: 10,
                      borderRadius: 8,
                      border:
                        shareType === type
                          ? "1px solid var(--accent-primary)"
                          : "1px solid var(--border)",
                      background:
                        shareType === type
                          ? "rgba(99,102,241,0.1)"
                          : "transparent",
                    }}
                  >
                    <input
                      type="radio"
                      value={type}
                      checked={shareType === type}
                      onChange={(e) =>
                        setShareType(e.target.value as ShareType)
                      }
                      style={{ cursor: "pointer" }}
                    />
                    <div>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          textTransform: "capitalize",
                        }}
                      >
                        {type === "semi-encrypted" ? "PIN Protected" : type}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {type === "open" && "Anyone with link can access"}
                        {type === "semi-encrypted" &&
                          "Requires PIN, choose access level"}
                        {type === "fully-encrypted" &&
                          "Account + email verification required"}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="form-label">Access Level</label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 8,
                }}
              >
                {["read", "download", "edit"].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRole(r as ShareRole)}
                    className={`btn ${role === r ? "btn-primary" : "btn-ghost"}`}
                    style={{
                      fontSize: 12,
                      textTransform: "capitalize",
                      padding: "8px 4px",
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <p
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  marginTop: 6,
                }}
              >
                {role === "read" && "📖 View only - cannot modify or download"}
                {role === "download" &&
                  "⬇️ Can view and download files/attachments"}
                {role === "edit" && "✏️ Can view, download, and make edits"}
              </p>
            </div>

            {/* PIN (for semi-encrypted) */}
            {shareType === "semi-encrypted" && (
              <div>
                <label className="form-label">PIN (4-8 digits)</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type={showPin ? "text" : "password"}
                    className="form-input"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.slice(0, 8))}
                    placeholder="1234"
                    style={{ flex: 1 }}
                  />
                  <button
                    className="action-btn"
                    onClick={() => setShowPin(!showPin)}
                    style={{
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            )}

            {/* Allowed Emails (for fully-encrypted) */}
            {shareType === "fully-encrypted" && (
              <div>
                <label className="form-label">
                  Allowed Emails (comma-separated)
                </label>
                <textarea
                  className="form-textarea"
                  value={allowedEmails}
                  onChange={(e) => setAllowedEmails(e.target.value)}
                  placeholder="john@example.com, jane@example.com"
                  rows={3}
                />
              </div>
            )}

            {/* Expiry */}
            <div>
              <label className="form-label">Link Expiry</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  max="365"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                  placeholder="30"
                  style={{ maxWidth: 100 }}
                />
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    color: "var(--text-muted)",
                    fontSize: 13,
                  }}
                >
                  days (leave empty for no expiry)
                </span>
              </div>
            </div>
          </>
        ) : (
          // Success state - show the share URL
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div
              style={{
                padding: 12,
                background: "rgba(16, 185, 129, 0.1)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginBottom: 8,
                }}
              >
                Share Link Created ✓
              </div>
              <div className="input-with-action">
                <input
                  type="text"
                  className="form-input"
                  value={shareUrl}
                  readOnly
                  style={{ flex: 1, fontSize: 12 }}
                />
                <button
                  className="action-btn"
                  onClick={handleCopyUrl}
                  title="Copy to clipboard"
                  style={{ display: "flex", alignItems: "center" }}
                >
                  {copied ? (
                    <Check
                      size={14}
                      style={{ color: "var(--accent-emerald)" }}
                    />
                  ) : (
                    <Copy size={14} />
                  )}
                </button>
              </div>
            </div>

            <div
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                padding: 12,
                background: "var(--bg-card)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  marginBottom: 8,
                  color: "var(--text-primary)",
                }}
              >
                Share Details:
              </div>
              <div>
                • Type:{" "}
                <strong style={{ textTransform: "capitalize" }}>
                  {shareType === "semi-encrypted" ? "PIN Protected" : shareType}
                </strong>
              </div>
              <div>
                • Access:{" "}
                <strong style={{ textTransform: "capitalize" }}>{role}</strong>
              </div>
              {expiresInDays && (
                <div>
                  • Expires: <strong>{expiresInDays} days</strong>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
