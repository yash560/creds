"use client";

import { useState, useEffect, useRef } from "react";
import {
  ScanLine,
  Plus,
  X,
  Crop,
  Check,
  Image as ImageIcon,
  AlertTriangle,
} from "lucide-react";
import type { VaultItem, ItemType, Attachment } from "@/lib/types";
import Modal from "./Modal";
import ScanUploader from "./sections/ScanUploader";
import {
  generateFileDedupeKey,
  generatePasswordDedupeKey,
  generateCardDedupeKey,
} from "@/lib/deduplication";

interface AddItemModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (payload: Partial<VaultItem>) => Promise<void>;
  initialType?: ItemType;
  existing?: VaultItem | null;
  folders?: { _id: string; name: string }[];
}

const DOC_CATEGORIES = [
  "Aadhaar",
  "PAN",
  "Passport",
  "Visa",
  "Driving Licence",
  "Vehicle RC",
  "Insurance",
  "Medical",
  "Bank",
  "Other",
];

export default function AddItemModal({
  open,
  onClose,
  onSave,
  initialType = "password",
  existing,
  folders = [],
}: AddItemModalProps) {
  const [type, setType] = useState<ItemType>(
    existing?.type ?? (initialType === "card" ? "document" : initialType),
  );
  const [title, setTitle] = useState(existing?.title ?? "");
  const [tags, setTags] = useState((existing?.tags ?? []).join(", "));
  const [folderId, setFolderId] = useState(existing?.folderId ?? "");
  const [fields, setFields] = useState<Record<string, string>>(
    existing?.fields ?? {},
  );

  // Attachments state
  const [attachments, setAttachments] = useState<Attachment[]>(
    existing?.attachments ?? [],
  );

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicateWarning, setDuplicateWarning] = useState("");

  // Cropping state
  const [cropTarget, setCropTarget] = useState<{
    index: number;
    data: string;
  } | null>(null);

  useEffect(() => {
    if (!open) {
      setCropTarget(null);
      setDuplicateWarning("");
    }
  }, [open]);

  const setField = (key: string, val: string) =>
    setFields((prev) => ({ ...prev, [key]: val }));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "Title is required";
    if (type === "password" && !fields.password)
      e.password = "Password is required";
    if (type === "card") {
      if (!fields.cardholderName?.trim())
        e.cardholderName = "Cardholder name is required";
      if (!fields.cardNumber?.trim()) e.cardNumber = "Card number is required";
      else if (!/^\d{13,19}$/.test(fields.cardNumber.replace(/\D/g, "")))
        e.cardNumber = "Card number must be 13-19 digits";
      if (!fields.expiry?.trim()) e.expiry = "Expiry is required";
      else if (!/^\d{2}\/\d{2}$/.test(fields.expiry))
        e.expiry = "Format must be MM/YY";
      if (!fields.cvv?.trim()) e.cvv = "CVV is required";
      else if (!/^\d{3,4}$/.test(fields.cvv)) e.cvv = "CVV must be 3-4 digits";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    setDuplicateWarning("");
    try {
      let dedupeKey: string | undefined;

      // Generate dedupeKey based on item type
      if (type === "scan" && attachments.length > 0) {
        // For scans, use first attachment data
        dedupeKey = await generateFileDedupeKey(attachments[0].data, type);
      } else if (type === "document" && attachments.length > 0) {
        // For documents, use first attachment data
        dedupeKey = await generateFileDedupeKey(attachments[0].data, type);
      } else if (type === "password" && fields.url && fields.username) {
        // For passwords, use URL + username
        dedupeKey = await generatePasswordDedupeKey(
          fields.url,
          fields.username,
        );
      } else if (type === "card" && fields.cardNumber) {
        // For cards, use card number
        dedupeKey = await generateCardDedupeKey(fields.cardNumber);
      }

      const payload: Partial<VaultItem> = {
        type,
        title: title.trim(),
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        folderId: folderId || null,
        fields,
        attachments,
      };

      if (dedupeKey) {
        (payload as any).dedupeKey = dedupeKey;
      }

      await onSave(payload);
      onClose();
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setLoading(false);
    }
  };

  const addAttachment = (data: string, mime: string, name: string) => {
    const newAtt: Attachment = {
      id: Math.random().toString(36).substring(2, 11),
      data,
      mimeType: mime,
      fileName: name,
      label: "",
    };
    setAttachments((prev) => [...prev, newAtt]);
  };

  const updateAttachmentLabel = (id: string, label: string) => {
    setAttachments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, label } : a)),
    );
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleApplyCrop = (id: string, croppedData: string) => {
    setAttachments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, data: croppedData } : a)),
    );
    setCropTarget(null);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={existing ? `Edit: ${existing.title}` : "Add New Item"}
      footer={
        <>
          <button
            className="btn btn-ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? "Saving…" : existing ? "Save Changes" : "Add Item"}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Type selector */}
        {!existing && (
          <div>
            <div className="form-label">Type</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: 8,
              }}
            >
              {(["password", "card", "document", "scan"] as ItemType[]).map(
                (t) => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className={`btn ${type === t ? "btn-primary" : "btn-ghost"}`}
                    style={{
                      padding: "8px 4px",
                      fontSize: 12,
                      textTransform: "capitalize",
                    }}
                  >
                    {t}
                  </button>
                ),
              )}
            </div>
          </div>
        )}

        {/* Duplicate Warning */}
        {duplicateWarning && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              padding: 12,
              borderRadius: "var(--radius-md)",
              background: "rgba(251, 146, 60, 0.1)",
              border: "1px solid rgba(251, 146, 60, 0.3)",
            }}
          >
            <AlertTriangle
              size={16}
              style={{
                color: "var(--accent-amber)",
                flexShrink: 0,
                marginTop: 2,
              }}
            />
            <div style={{ fontSize: 13, color: "var(--accent-amber)" }}>
              {duplicateWarning}
            </div>
          </div>
        )}

        {/* Title */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Title *</label>
          <input
            className={`form-input ${errors.title ? "border-red-500" : ""}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Gmail, Aadhaar"
          />
          {errors.title && (
            <div
              style={{
                color: "var(--accent-rose)",
                fontSize: 12,
                marginTop: 4,
              }}
            >
              {errors.title}
            </div>
          )}
        </div>

        {/* Type-specific fields */}
        {type === "password" && (
          <>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Username / Email</label>
              <input
                className="form-input"
                value={fields.username || ""}
                onChange={(e) => setField("username", e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Password *</label>
              <input
                className={`form-input mono ${errors.password ? "border-red-500" : ""}`}
                type="text"
                value={fields.password || ""}
                onChange={(e) => setField("password", e.target.value)}
                placeholder="••••••••"
              />
              {errors.password && (
                <div
                  style={{
                    color: "var(--accent-rose)",
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  {errors.password}
                </div>
              )}
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Website URL</label>
              <input
                className="form-input"
                value={fields.url || ""}
                onChange={(e) => setField("url", e.target.value)}
                placeholder="https://example.com"
              />
            </div>
          </>
        )}

        {type === "card" && (
          <>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Cardholder Name *</label>
              <input
                className="form-input"
                value={fields.cardholderName || ""}
                onChange={(e) => setField("cardholderName", e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Card Number *</label>
              <input
                className={`form-input mono ${errors.cardNumber ? "border-red-500" : ""}`}
                value={fields.cardNumber || ""}
                onChange={(e) =>
                  setField("cardNumber", e.target.value.replace(/\D/g, ""))
                }
                placeholder="1234 5678 9012 3456"
              />
              {errors.cardNumber && (
                <div
                  style={{
                    color: "var(--accent-rose)",
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  {errors.cardNumber}
                </div>
              )}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Expiry (MM/YY) *</label>
                <input
                  className={`form-input mono ${errors.expiry ? "border-red-500" : ""}`}
                  value={fields.expiry || ""}
                  onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, "");
                    if (val.length >= 2) {
                      val = val.slice(0, 2) + "/" + val.slice(2, 4);
                    }
                    setField("expiry", val);
                  }}
                  placeholder="MM/YY"
                  maxLength={5}
                />
                {errors.expiry && (
                  <div
                    style={{
                      color: "var(--accent-rose)",
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  >
                    {errors.expiry}
                  </div>
                )}
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">CVV *</label>
                <input
                  className={`form-input mono ${errors.cvv ? "border-red-500" : ""}`}
                  type="text"
                  value={fields.cvv || ""}
                  onChange={(e) =>
                    setField(
                      "cvv",
                      e.target.value.replace(/\D/g, "").slice(0, 4),
                    )
                  }
                  placeholder="123"
                  maxLength={4}
                />
                {errors.cvv && (
                  <div
                    style={{
                      color: "var(--accent-rose)",
                      fontSize: 12,
                      marginTop: 4,
                    }}
                  >
                    {errors.cvv}
                  </div>
                )}
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">
                Card Type (Visa, Mastercard, Amex, etc.)
              </label>
              <input
                className="form-input"
                value={fields.cardType || ""}
                onChange={(e) =>
                  setField("cardType", e.target.value.toLowerCase())
                }
                placeholder="visa, mastercard, amex, discover, rupay"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">PIN (Optional)</label>
              <input
                className="form-input mono"
                type="text"
                value={fields.pin || ""}
                onChange={(e) =>
                  setField("pin", e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="1234"
                maxLength={6}
              />
            </div>
          </>
        )}

        {type === "document" && (
          <>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={fields.category || ""}
                onChange={(e) => setField("category", e.target.value)}
              >
                <option value="">Select category</option>
                {DOC_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Document Number</label>
              <input
                className="form-input mono"
                value={fields.documentNumber || ""}
                onChange={(e) => setField("documentNumber", e.target.value)}
                placeholder="XXXX-XXXX-XXXX"
              />
            </div>

            {/* Attachments List */}
            <div>
              <div className="form-label">Document Images</div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {attachments.map((att, idx) => (
                  <div
                    key={att.id}
                    className="glass-card"
                    style={{
                      padding: 12,
                      display: "flex",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        width: 60,
                        height: 60,
                        flexShrink: 0,
                        borderRadius: 4,
                        overflow: "hidden",
                        background: "#000",
                      }}
                    >
                      <img
                        src={att.data}
                        alt="thumb"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                      <button
                        onClick={() =>
                          setCropTarget({ index: idx, data: att.data })
                        }
                        className="action-btn"
                        style={{
                          position: "absolute",
                          bottom: 2,
                          right: 2,
                          width: 20,
                          height: 20,
                          padding: 0,
                          background: "rgba(0,0,0,0.6)",
                          color: "#fff",
                        }}
                      >
                        <Crop size={10} />
                      </button>
                    </div>
                    <div style={{ flex: 1 }}>
                      <input
                        className="form-input"
                        style={{ fontSize: 12, padding: "4px 8px" }}
                        placeholder="Image label (e.g. Front Side)"
                        value={att.label || ""}
                        onChange={(e) =>
                          updateAttachmentLabel(att.id, e.target.value)
                        }
                      />
                    </div>
                    <button
                      className="action-btn danger"
                      onClick={() => removeAttachment(att.id)}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}

                <div
                  style={{
                    border: "1px dashed var(--border)",
                    borderRadius: "var(--radius-md)",
                    padding: 12,
                  }}
                >
                  <ScanUploader onChange={addAttachment} allowCamera={true} />
                  <p
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      textAlign: "center",
                      marginTop: 8,
                    }}
                  >
                    Add front, back or other pages of the document
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {type === "scan" && (
          <div>
            <div className="form-label">Scan / Upload Document</div>
            <ScanUploader
              value={attachments[0]?.data}
              mimeType={attachments[0]?.mimeType}
              fileName={attachments[0]?.fileName}
              onChange={(d, m, n) => {
                const newAtt = {
                  id: "scan-1",
                  data: d,
                  mimeType: m,
                  fileName: n,
                };
                setAttachments([newAtt]);
              }}
              onClear={() => setAttachments([])}
            />
          </div>
        )}

        {/* Notes (all types) */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Notes</label>
          <textarea
            className="form-textarea"
            value={fields.notes || ""}
            onChange={(e) => setField("notes", e.target.value)}
            placeholder="Optional notes…"
            rows={2}
          />
        </div>

        {/* Tags */}
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Tags (comma-separated)</label>
          <input
            className="form-input"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="personal, work, important"
          />
        </div>

        {/* Folder */}
        {folders.length > 0 && (
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Folder</label>
            <select
              className="form-select"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
            >
              <option value="">No folder</option>
              {folders.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Basic Cropping Overlay */}
      {cropTarget && (
        <CropOverlay
          data={cropTarget.data}
          onCancel={() => setCropTarget(null)}
          onApply={(cropped) =>
            handleApplyCrop(attachments[cropTarget.index].id, cropped)
          }
        />
      )}
    </Modal>
  );
}

function CropOverlay({
  data,
  onCancel,
  onApply,
}: {
  data: string;
  onCancel: () => void;
  onApply: (d: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [crop, setCrop] = useState({ x: 10, y: 10, w: 80, h: 80 }); // percents
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const maxWidth = 400;
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Draw overlay
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cx = (crop.x / 100) * canvas.width;
      const cy = (crop.y / 100) * canvas.height;
      const cw = (crop.w / 100) * canvas.width;
      const ch = (crop.h / 100) * canvas.height;

      ctx.clearRect(cx, cy, cw, ch);
      ctx.drawImage(
        img,
        (crop.x / 100) * img.width,
        (crop.y / 100) * img.height,
        (crop.w / 100) * img.width,
        (crop.h / 100) * img.height,
        cx,
        cy,
        cw,
        ch,
      );

      ctx.strokeStyle = "#6366f1";
      ctx.lineWidth = 2;
      ctx.strokeRect(cx, cy, cw, ch);
    };
    img.src = data;
  }, [data, crop]);

  const handleApply = () => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = (crop.w / 100) * img.width;
      canvas.height = (crop.h / 100) * img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(
        img,
        (crop.x / 100) * img.width,
        (crop.y / 100) * img.height,
        (crop.w / 100) * img.width,
        (crop.h / 100) * img.height,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      onApply(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.src = data;
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        className="glass-card"
        style={{
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 20,
          maxWidth: "100%",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ fontSize: 16 }}>Crop Image</h3>
          <button className="action-btn" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            position: "relative",
            cursor: "crosshair",
            userSelect: "none",
          }}
        >
          <canvas
            ref={canvasRef}
            style={{ borderRadius: 8, display: "block", maxWidth: "100%" }}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onMouseMove={(e) => {
              if (!isDragging || !canvasRef.current) return;
              const rect = canvasRef.current.getBoundingClientRect();
              const x = ((e.clientX - rect.left) / rect.width) * 100;
              const y = ((e.clientY - rect.top) / rect.height) * 100;
              setCrop((prev) => ({
                ...prev,
                w: Math.max(10, x - prev.x),
                h: Math.max(10, y - prev.y),
              }));
            }}
          />
          <p
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              marginTop: 8,
            }}
          >
            Drag from top-left to bottom-right to adjust selection
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleApply}>
            <Check size={16} /> Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
}
