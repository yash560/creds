"use client";

import { useState, useEffect, useCallback } from "react";
import { Copy, Check, Eye, EyeOff, Trash2, Link as LinkIcon, Calendar } from "lucide-react";
import Modal from "./Modal";
import type { VaultItem } from "@/lib/types";

interface ActiveShareLink {
  linkId: string;
  type: string;
  role: string;
  expiresAt?: string;
  sharedFields?: string[];
  createdAt: string;
  isExpired: boolean;
}

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
  sharedFields?: string[];
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
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [activeLinks, setActiveLinks] = useState<ActiveShareLink[]>([]);
  const [fetchingLinks, setFetchingLinks] = useState(false);

  const fetchActiveLinks = useCallback(async () => {
    if (!item?._id) return;
    setFetchingLinks(true);
    try {
      const res = await fetch(`/api/share?itemId=${item._id}`);
      const data = await res.json();
      if (data.ok) {
        setActiveLinks(data.data);
      }
    } catch (_err) {
      console.error("Failed to fetch active links:", _err);
    } finally {
      setFetchingLinks(false);
    }
  }, [item?._id]);

  useEffect(() => {
    if (open && item) {
      // Default to all fields selected
      const fieldNames = Object.keys(item.fields || {});
      setSelectedFields(fieldNames);
      fetchActiveLinks();
    }
  }, [open, item, fetchActiveLinks]);

  if (!open || !item) return null;

  const handleCreateShare = async () => {
    setLoading(true);
    try {
      const payload: SharePayload = {
        itemId: item._id,
        type: shareType,
        role,
        expiresInDays: expiresInDays ? parseInt(expiresInDays) : undefined,
        sharedFields: selectedFields,
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
        fetchActiveLinks(); // Refresh active links list
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

  const handleCopyUrl = (url: string = shareUrl) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async (linkId: string) => {
    if (!confirm("Are you sure you want to revoke this share link?")) return;
    try {
      const res = await fetch(`/api/share?linkId=${linkId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.ok) {
        setActiveLinks((prev) => prev.filter((l) => l.linkId !== linkId));
      } else {
        alert("Failed to revoke: " + data.error);
      }
    } catch (err) {
      alert("Error revoking link");
    }
  };

  const toggleField = (field: string) => {
    setSelectedFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field],
    );
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
                fetchActiveLinks();
              }}
            >
              Back to Create
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

            {/* Field Selection */}
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <label className="form-label" style={{ marginBottom: 0 }}>
                  Shareable Fields
                </label>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: 11, padding: "2px 6px", height: "auto" }}
                  onClick={() => {
                    const keys = Object.keys(item.fields || {});
                    if (selectedFields.length === keys.length) {
                      setSelectedFields([]);
                    } else {
                      setSelectedFields(keys);
                    }
                  }}
                >
                  {selectedFields.length === Object.keys(item.fields || {}).length
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  padding: 12,
                  background: "var(--bg-card)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border)",
                }}
              >
                {Object.keys(item.fields || {}).map((field) => (
                  <label
                    key={field}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedFields.includes(field)}
                      onChange={() => toggleField(field)}
                      style={{
                        width: 16,
                        height: 16,
                        accentColor: "var(--accent-primary)",
                      }}
                    />
                    <span style={{ textTransform: "capitalize" }}>{field}</span>
                  </label>
                ))}
                {Object.keys(item.fields || {}).length === 0 && (
                  <div
                    style={{
                      gridColumn: "span 2",
                      fontSize: 12,
                      color: "var(--text-muted)",
                      textAlign: "center",
                    }}
                  >
                    No fields available for this item.
                  </div>
                )}
              </div>
            </div>

            {/* Link Expiry */}
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
                  onClick={() => handleCopyUrl()}
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

        {/* Existing Share Links for this item */}
        {!shareUrl && (
          <div
            style={{
              marginTop: 20,
              paddingTop: 20,
              borderTop: "1px solid var(--border)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <LinkIcon size={16} className="text-primary" />
              <h4 style={{ fontSize: 15, margin: 0 }}>Active Share Links</h4>
            </div>

            {fetchingLinks ? (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  textAlign: "center",
                  padding: "20px 0",
                }}
              >
                Loading links...
              </div>
            ) : activeLinks.length === 0 ? (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  textAlign: "center",
                  padding: "20px 0",
                  background: "var(--bg-card)",
                  borderRadius: "var(--radius-md)",
                  border: "1px dashed var(--border)",
                }}
              >
                No active share links for this item.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {activeLinks.map((link) => (
                  <div
                    key={link.linkId}
                    style={{
                      padding: 12,
                      borderRadius: "var(--radius-md)",
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 8,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              textTransform: "capitalize",
                            }}
                          >
                            {link.type === "semi-encrypted"
                              ? "PIN Protected"
                              : link.type}
                          </span>
                          <span
                            className="badge badge-outline"
                            style={{ fontSize: 10 }}
                          >
                            {link.role}
                          </span>
                          {link.isExpired && (
                            <span
                              style={{
                                fontSize: 10,
                                color: "var(--accent-rose)",
                                fontWeight: 600,
                              }}
                            >
                              EXPIRED
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--text-muted)",
                            marginTop: 4,
                          }}
                        >
                          Created {new Date(link.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className="action-btn"
                          onClick={() =>
                            handleCopyUrl(
                              `${window.location.origin}/share/${link.linkId}`,
                            )
                          }
                          title="Copy Link"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          className="action-btn danger"
                          onClick={() => handleRevoke(link.linkId)}
                          title="Revoke Permission"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        marginTop: 8,
                      }}
                    >
                      {link.sharedFields && link.sharedFields.length > 0 ? (
                        link.sharedFields.map((f) => (
                          <span
                            key={f}
                            style={{
                              fontSize: 10,
                              background: "rgba(99,102,241,0.08)",
                              color: "var(--accent-primary)",
                              padding: "2px 6px",
                              borderRadius: 4,
                              textTransform: "capitalize",
                            }}
                          >
                            {f}
                          </span>
                        ))
                      ) : (
                        <span
                          style={{
                            fontSize: 10,
                            color: "var(--text-muted)",
                            fontStyle: "italic",
                          }}
                        >
                          No specific fields shared
                        </span>
                      )}
                    </div>

                    {link.expiresAt && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 10,
                          color: "var(--text-muted)",
                          marginTop: 8,
                        }}
                      >
                        <Calendar size={10} />
                        Expires:{" "}
                        {new Date(link.expiresAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
