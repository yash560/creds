"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  ChangeEvent,
  RefObject,
  useMemo,
  memo,
} from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Camera, X, Crop, Check, Image, AlertTriangle } from "lucide-react";
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

type CardSide = "front" | "back";

const CARD_SIDE_LABELS: Record<CardSide, string> = {
  front: "Card front",
  back: "Card back",
};

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

const ITEM_TYPES: ItemType[] = ["password", "card", "document", "scan"];

export default function AddItemModal({
  open,
  onClose,
  onSave,
  initialType = "password",
  existing,
  folders = [],
}: AddItemModalProps) {
  const [type, setType] = useState<ItemType>(
    existing?.type ?? initialType ?? "password",
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
  const frontFileRef = useRef<HTMLInputElement>(null);
  const backFileRef = useRef<HTMLInputElement>(null);
  const pendingCropRef = useRef<{ index: number; data: string } | null>(null);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicateWarning, setDuplicateWarning] = useState("");
  const cardCameraVideoRef = useRef<HTMLVideoElement>(null);
  const cardCameraStreamRef = useRef<MediaStream | null>(null);
  const [activeCardCameraSide, setActiveCardCameraSide] =
    useState<CardSide | null>(null);
  const [cardCameraError, setCardCameraError] = useState("");

  const cameraSupported = useMemo(
    () =>
      typeof navigator !== "undefined" &&
      typeof navigator.mediaDevices?.getUserMedia === "function",
    [],
  );

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

  const setField = useCallback(
    (key: string, val: string) =>
      setFields((prev) => ({ ...prev, [key]: val })),
    [],
  );

  const validate = useCallback((): boolean => {
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
  }, [type, title, fields]);

  const handleSave = useCallback(async () => {
    if (!validate()) return;
    setLoading(true);
    setDuplicateWarning("");
    try {
      let dedupeKey: string | undefined;

      // Generate dedupeKey based on item type
      if (type === "scan" && attachments.length > 0) {
        dedupeKey = await generateFileDedupeKey(attachments[0].data, type);
      } else if (type === "document" && attachments.length > 0) {
        dedupeKey = await generateFileDedupeKey(attachments[0].data, type);
      } else if (type === "password" && fields.url && fields.username) {
        dedupeKey = await generatePasswordDedupeKey(
          fields.url,
          fields.username,
        );
      } else if (type === "card" && fields.cardNumber) {
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
        payload.dedupeKey = dedupeKey;
      }

      await onSave(payload);
      onClose();
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setLoading(false);
    }
  }, [validate, type, attachments, fields, tags, folderId, onSave, onClose]);

  const addAttachment = useCallback(
    (data: string, mime: string, name: string) => {
      const newAtt: Attachment = {
        id: Math.random().toString(36).substring(2, 11),
        data,
        mimeType: mime,
        fileName: name,
        name: name || "attachment",
        label: "",
      };
      setAttachments((prev) => [...prev, newAtt]);
    },
    [],
  );

  const getCardAttachment = useCallback(
    (side: CardSide) => attachments.find((att) => att.side === side),
    [attachments],
  );

  const handleCardFileChange = useCallback(
    (side: CardSide) => async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";
      const reader = new FileReader();
      reader.onload = () => {
        const data = reader.result as string;
        upsertCardAttachment(side, data, file.type, file.name);
      };
      reader.readAsDataURL(file);
    },
    [],
  );

  const upsertCardAttachment = useCallback(
    (side: CardSide, data: string, mimeType: string, fileName: string) => {
      const newAtt: Attachment = {
        id: `card-${side}-${Math.random().toString(36).substring(2, 9)}`,
        data,
        mimeType,
        fileName,
        label: CARD_SIDE_LABELS[side],
        name: CARD_SIDE_LABELS[side],
        side,
      };
      setAttachments((prev) => {
        const filtered = prev.filter((att) => att.side !== side);
        const next = [...filtered, newAtt];
        pendingCropRef.current = { index: filtered.length, data };
        return next;
      });
      setTimeout(() => {
        if (pendingCropRef.current) {
          setCropTarget(pendingCropRef.current);
          pendingCropRef.current = null;
        }
      }, 0);
    },
    [],
  );

  const openCardCrop = useCallback(
    (side: CardSide) => {
      const idx = attachments.findIndex((att) => att.side === side);
      if (idx === -1) return;
      setCropTarget({ index: idx, data: attachments[idx].data });
    },
    [attachments],
  );

  const clearCardAttachment = useCallback((side: CardSide) => {
    setAttachments((prev) => prev.filter((att) => att.side !== side));
  }, []);

  const stopCardCamera = useCallback(() => {
    cardCameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cardCameraStreamRef.current = null;
    setCardCameraError("");
  }, []);

  const closeCardCamera = useCallback(() => {
    setActiveCardCameraSide(null);
    stopCardCamera();
  }, [stopCardCamera]);

  useEffect(() => {
    if (!open) {
      closeCardCamera();
    }
  }, [open, closeCardCamera]);

  useEffect(() => {
    if (!open) return;
    const resolvedType = existing?.type ?? initialType ?? "password";
    setType(resolvedType);
    setTitle(existing?.title ?? "");
    setTags((existing?.tags ?? []).join(", "));
    setFolderId(existing?.folderId ?? "");
    setFields(existing?.fields ? { ...existing.fields } : {});
    setAttachments(
      existing?.attachments
        ? existing.attachments.map((att) => ({ ...att }))
        : [],
    );
    pendingCropRef.current = null;
    setErrors({});
    setDuplicateWarning("");
    setCropTarget(null);
    setActiveCardCameraSide(null);
    stopCardCamera();
  }, [
    open,
    existing,
    initialType,
    stopCardCamera,
  ]);

  useEffect(() => {
    if (!activeCardCameraSide) return;
    let isActive = true;

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        if (isActive) {
          setCardCameraError("Camera is not supported in this browser.");
        }
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
          },
          audio: false,
        });
        if (!isActive) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        cardCameraStreamRef.current = stream;
        setCardCameraError("");
        if (cardCameraVideoRef.current) {
          cardCameraVideoRef.current.srcObject = stream;
          void cardCameraVideoRef.current.play().catch(() => {});
        }
      } catch (err) {
        if (isActive) {
          setCardCameraError(
            "Could not access the camera. Check permissions and HTTPS.",
          );
        }
        stopCardCamera();
      }
    };

    startCamera();

    return () => {
      isActive = false;
      stopCardCamera();
    };
  }, [activeCardCameraSide, stopCardCamera]);

  const captureCardSide = useCallback(
    (side: CardSide) => {
      const video = cardCameraVideoRef.current;
      if (!video || video.videoWidth < 2 || video.videoHeight < 2) return;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = `card-${side}-capture-${timestamp}.jpg`;
      upsertCardAttachment(side, dataUrl, "image/jpeg", fileName);
      closeCardCamera();
    },
    [closeCardCamera, upsertCardAttachment],
  );

  const getAttachmentName = useCallback(
    (att: Partial<Attachment>) =>
      att.name || att.fileName || att.label || "attachment",
    [],
  );

  const updateAttachmentLabel = useCallback((id: string, label: string) => {
    setAttachments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, label } : a)),
    );
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const handleApplyCrop = useCallback((id: string, croppedData: string) => {
    setAttachments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, data: croppedData } : a)),
    );
    setCropTarget(null);
  }, []);

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
        {!existing && <TypeSelector type={type} onChange={setType} />}

        {/* Duplicate Warning */}
        {duplicateWarning && (
          <DuplicateWarningBanner message={duplicateWarning} />
        )}

        {/* Title */}
        <TitleField value={title} onChange={setTitle} error={errors.title} />

        {/* Type-specific fields */}
        {type === "password" && (
          <PasswordFields fields={fields} setField={setField} errors={errors} />
        )}

        {type === "card" && (
          <CardFields
            fields={fields}
            setField={setField}
            errors={errors}
            cameraSupported={cameraSupported}
            attachments={attachments}
            frontFileRef={frontFileRef as React.RefObject<HTMLInputElement>}
            backFileRef={backFileRef as React.RefObject<HTMLInputElement>}
            getCardAttachment={getCardAttachment}
            handleCardFileChange={handleCardFileChange}
            setActiveCardCameraSide={setActiveCardCameraSide}
            openCardCrop={openCardCrop}
            clearCardAttachment={clearCardAttachment}
          />
        )}

        {type === "document" && (
          <DocumentFields
            fields={fields}
            setField={setField}
            attachments={attachments}
            setCropTarget={setCropTarget}
            updateAttachmentLabel={updateAttachmentLabel}
            removeAttachment={removeAttachment}
            addAttachment={addAttachment}
          />
        )}

        {type === "scan" && (
          <ScanFields
            attachments={attachments}
            setAttachments={setAttachments}
          />
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

      {activeCardCameraSide && (
        <CardCameraOverlay
          side={activeCardCameraSide}
          videoRef={cardCameraVideoRef as React.RefObject<HTMLVideoElement>}
          error={cardCameraError}
          onCancel={closeCardCamera}
          onCapture={captureCardSide}
        />
      )}

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

// ============================================================================
// SUB-COMPONENTS (Memoized for performance)
// ============================================================================

const TypeSelector = memo(function TypeSelector({
  type,
  onChange,
}: {
  type: ItemType;
  onChange: (type: ItemType) => void;
}) {
  return (
    <div>
      <div className="form-label">Type</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 8,
        }}
      >
        {ITEM_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => onChange(t)}
            className={`btn ${type === t ? "btn-primary" : "btn-ghost"}`}
            style={{
              padding: "8px 4px",
              fontSize: 12,
              textTransform: "capitalize",
            }}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
});

const DuplicateWarningBanner = memo(function DuplicateWarningBanner({
  message,
}: {
  message: string;
}) {
  return (
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
        {message}
      </div>
    </div>
  );
});

const TitleField = memo(function TitleField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (val: string) => void;
  error?: string;
}) {
  return (
    <div className="form-group" style={{ marginBottom: 0 }}>
      <label className="form-label">Title *</label>
      <input
        className={`form-input ${error ? "border-red-500" : ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Gmail, Aadhaar"
      />
      {error && (
        <div
          style={{
            color: "var(--accent-rose)",
            fontSize: 12,
            marginTop: 4,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
});

const PasswordFields = memo(function PasswordFields({
  fields,
  setField,
  errors,
}: {
  fields: Record<string, string>;
  setField: (key: string, val: string) => void;
  errors: Record<string, string>;
}) {
  return (
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
  );
});

const CardFields = memo(function CardFields({
  fields,
  setField,
  errors,
  cameraSupported,
  attachments,
  frontFileRef,
  backFileRef,
  getCardAttachment,
  handleCardFileChange,
  setActiveCardCameraSide,
  openCardCrop,
  clearCardAttachment,
}: {
  fields: Record<string, string>;
  setField: (key: string, val: string) => void;
  errors: Record<string, string>;
  cameraSupported: boolean;
  attachments: Attachment[];
  frontFileRef: RefObject<HTMLInputElement>;
  backFileRef: RefObject<HTMLInputElement>;
  getCardAttachment: (side: CardSide) => Attachment | undefined;
  handleCardFileChange: (
    side: CardSide,
  ) => (e: ChangeEvent<HTMLInputElement>) => void;
  setActiveCardCameraSide: (side: CardSide | null) => void;
  openCardCrop: (side: CardSide) => void;
  clearCardAttachment: (side: CardSide) => void;
}) {
  return (
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
                inputMode="numeric"
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
                inputMode="numeric"
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
              setField("cvv", e.target.value.replace(/\D/g, "").slice(0, 4))
            }
            placeholder="123"
                maxLength={4}
                inputMode="numeric"
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
        <label className="form-label">Card Type</label>
        <select
          className="form-select"
          value={fields.cardMode || ""}
          onChange={(e) =>
            setField(
              "cardMode",
              (e.target.value as "debit" | "credit" | "") || "",
            )
          }
        >
          <option value="">Select card type</option>
          <option value="credit">Credit</option>
          <option value="debit">Debit</option>
        </select>
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label">
          Card Network
        </label>
        <select
          className="form-select"
          value={
            ['visa', 'mastercard', 'amex', 'discover', 'rupay', ''].includes(fields.cardType || '')
              ? (fields.cardType || '')
              : 'other'
          }
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'other') {
              setField("cardType", "other_value"); // Placeholder to trigger show other
            } else {
              setField("cardType", val);
            }
          }}
        >
          <option value="">Select network</option>
          <option value="visa">Visa</option>
          <option value="mastercard">Mastercard</option>
          <option value="amex">American Express</option>
          <option value="discover">Discover</option>
          <option value="rupay">RuPay</option>
          <option value="other">Other</option>
        </select>
        
        {(!['visa', 'mastercard', 'amex', 'discover', 'rupay', ''].includes(fields.cardType || '') || fields.cardType === 'other_value') && (
          <input
            className="form-input"
            style={{ marginTop: 8 }}
            value={fields.cardType === 'other_value' ? '' : (fields.cardType || "")}
            onChange={(e) => setField("cardType", e.target.value.toLowerCase())}
            placeholder="Enter custom network..."
            autoFocus
          />
        )}
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
          inputMode="numeric"
        />
      </div>
      <div className="form-group" style={{ marginBottom: 0 }}>
        <label className="form-label">Card Images</label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          {(["front", "back"] as CardSide[]).map((side) => (
            <CardImageUploader
              key={side}
              side={side}
              attachment={getCardAttachment(side)}
              fileRef={side === "front" ? frontFileRef : backFileRef}
              cameraSupported={cameraSupported}
              onFileChange={handleCardFileChange(side)}
              onCapture={setActiveCardCameraSide}
              onCrop={openCardCrop}
              onClear={clearCardAttachment}
            />
          ))}
        </div>
        <p
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            marginTop: 8,
          }}
        >
          Upload both sides to capture the front/back of your card. Tap crop to
          fine-tune the framing on mobile.
        </p>
      </div>
    </>
  );
});

const CardImageUploader = memo(function CardImageUploader({
  side,
  attachment,
  fileRef,
  cameraSupported,
  onFileChange,
  onCapture,
  onCrop,
  onClear,
}: {
  side: CardSide;
  attachment?: Attachment;
  fileRef: RefObject<HTMLInputElement>;
  cameraSupported: boolean;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onCapture: (side: CardSide) => void;
  onCrop: (side: CardSide) => void;
  onClear: (side: CardSide) => void;
}) {
  const sideLabel = side === "front" ? "Front" : "Back";
  return (
    <div
      className="glass-card"
      style={{ padding: 12, borderRadius: "var(--radius-md)" }}
    >
      <div
        style={{
          width: "100%",
          height: 140,
          borderRadius: "var(--radius-sm)",
          border: "1px dashed var(--border)",
          background:
            "linear-gradient(135deg, rgba(99,102,241,0.1), rgba(59,130,246,0.08))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {attachment ? (
          <img
            src={attachment.data}
            alt={`${sideLabel} of card`}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: 13,
            }}
          >
            {sideLabel} image
          </div>
        )}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          marginTop: 10,
        }}
      >
        <input
          ref={fileRef}
          type="file"
          hidden
          accept="image/*"
          capture="environment"
          onChange={onFileChange}
        />
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => fileRef.current?.click()}
        >
          {attachment ? "Replace" : "Upload"} {sideLabel}
        </button>
        {cameraSupported && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => onCapture(side)}
          >
            <Camera size={14} /> Capture {sideLabel}
          </button>
        )}
        {attachment && (
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => onCrop(side)}
            >
              Crop {sideLabel}
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => onClear(side)}
            >
              Remove {sideLabel}
            </button>
          </>
        )}
      </div>
    </div>
  );
});

const DocumentFields = memo(function DocumentFields({
  fields,
  setField,
  attachments,
  setCropTarget,
  updateAttachmentLabel,
  removeAttachment,
  addAttachment,
}: {
  fields: Record<string, string>;
  setField: (key: string, val: string) => void;
  attachments: Attachment[];
  setCropTarget: (target: { index: number; data: string } | null) => void;
  updateAttachmentLabel: (id: string, label: string) => void;
  removeAttachment: (id: string) => void;
  addAttachment: (data: string, mime: string, name: string) => void;
}) {
  return (
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
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {attachments.map((att, idx) => (
            <DocumentAttachmentItem
              key={att.id}
              attachment={att}
              index={idx}
              onCrop={() => setCropTarget({ index: idx, data: att.data })}
              onLabelChange={(label) => updateAttachmentLabel(att.id, label)}
              onRemove={() => removeAttachment(att.id)}
            />
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
  );
});

const DocumentAttachmentItem = memo(function DocumentAttachmentItem({
  attachment,
  index,
  onCrop,
  onLabelChange,
  onRemove,
}: {
  attachment: Attachment;
  index: number;
  onCrop: () => void;
  onLabelChange: (label: string) => void;
  onRemove: () => void;
}) {
  return (
    <div
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
          src={attachment.data}
          alt="thumb"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
        <button
          onClick={onCrop}
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
          value={attachment.label || ""}
          onChange={(e) => onLabelChange(e.target.value)}
        />
      </div>
      <button className="action-btn danger" onClick={onRemove}>
        <X size={14} />
      </button>
    </div>
  );
});

const ScanFields = memo(function ScanFields({
  attachments,
  setAttachments,
}: {
  attachments: Attachment[];
  setAttachments: (attachments: Attachment[]) => void;
}) {
  return (
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
  );
});

// ============================================================================
// CROP OVERLAY
// ============================================================================

type CropRect = { x: number; y: number; w: number; h: number };

function CropOverlay({
  data,
  onCancel,
  onApply,
}: {
  data: string;
  onCancel: () => void;
  onApply: (d: string) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const clampValue = useCallback((value: number, min: number, max: number) => {
    return Math.min(Math.max(value, min), max);
  }, []);
  const clampCropRect = useCallback(
    (value: CropRect): CropRect => {
      const width = clampValue(value.w, 10, 100);
      const height = clampValue(value.h, 10, 100);
      const x = clampValue(value.x, 0, 100 - width);
      const y = clampValue(value.y, 0, 100 - height);
      return { x, y, w: width, h: height };
    },
    [clampValue],
  );

  const [crop, setCrop] = useState<CropRect>({ x: 10, y: 10, w: 80, h: 80 });
  const dragRef = useRef<{
    mode: "move" | "resize";
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    originW: number;
    originH: number;
    edge?: "left" | "right" | "top" | "bottom";
  } | null>(null);

  const updateCrop = useCallback(
    (changes: Partial<CropRect>) => {
      setCrop((prev) => clampCropRect({ ...prev, ...changes }));
    },
    [clampCropRect],
  );

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const current = dragRef.current;
      if (!current) return;
      const bounds = frameRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const dx = ((event.clientX - current.startX) / bounds.width) * 100;
      const dy = ((event.clientY - current.startY) / bounds.height) * 100;
      setCrop((prev) => {
        if (current.mode === "move") {
          return clampCropRect({
            ...prev,
            x: current.originX + dx,
            y: current.originY + dy,
          });
        }

        const next: CropRect = {
          x: current.originX,
          y: current.originY,
          w: current.originW,
          h: current.originH,
        };

        if (current.edge === "left") {
          const newX = clampValue(
            current.originX + dx,
            0,
            current.originX + current.originW - 10,
          );
          const newW = clampValue(
            current.originW + (current.originX - newX),
            10,
            100 - newX,
          );
          next.x = newX;
          next.w = newW;
        } else if (current.edge === "right") {
          next.w = clampValue(
            current.originW + dx,
            10,
            100 - current.originX,
          );
        } else if (current.edge === "top") {
          const newY = clampValue(
            current.originY + dy,
            0,
            current.originY + current.originH - 10,
          );
          const newH = clampValue(
            current.originH + (current.originY - newY),
            10,
            100 - newY,
          );
          next.y = newY;
          next.h = newH;
        } else if (current.edge === "bottom") {
          next.h = clampValue(
            current.originH + dy,
            10,
            100 - current.originY,
          );
        }

        return clampCropRect(next);
      });
    };
    const handlePointerUp = () => {
      if (dragRef.current) dragRef.current = null;
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [clampCropRect, clampValue]);

  const handleRectPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragRef.current = {
      mode: "move",
      startX: event.clientX,
      startY: event.clientY,
      originX: crop.x,
      originY: crop.y,
      originW: crop.w,
      originH: crop.h,
    };
  };

  const createResizePointerDown =
    (edge: "left" | "right" | "top" | "bottom") =>
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      dragRef.current = {
        mode: "resize",
        edge,
        startX: event.clientX,
        startY: event.clientY,
        originX: crop.x,
        originY: crop.y,
        originW: crop.w,
        originH: crop.h,
      };
    };

  const handleApply = () => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const sx = (crop.x / 100) * img.width;
      const sy = (crop.y / 100) * img.height;
      const sw = (crop.w / 100) * img.width;
      const sh = (crop.h / 100) * img.height;
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      onApply(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.src = data;
  };

  const rangeRows = [
    {
      label: "Left",
      value: crop.x,
      min: 0,
      max: Math.max(0, 100 - crop.w),
      onChange: (val: number) => updateCrop({ x: val }),
    },
    {
      label: "Top",
      value: crop.y,
      min: 0,
      max: Math.max(0, 100 - crop.h),
      onChange: (val: number) => updateCrop({ y: val }),
    },
    {
      label: "Width",
      value: crop.w,
      min: 10,
      max: Math.max(10, 100 - crop.x),
      onChange: (val: number) => updateCrop({ w: val }),
    },
    {
      label: "Height",
      value: crop.h,
      min: 10,
      max: Math.max(10, 100 - crop.y),
      onChange: (val: number) => updateCrop({ h: val }),
    },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <div
        className="glass-card"
        style={{
          width: "100%",
          maxWidth: 520,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 18,
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
          ref={frameRef}
          style={{
            position: "relative",
            borderRadius: 12,
            overflow: "hidden",
            background: "var(--bg)",
            touchAction: "none",
          }}
        >
          <img
            src={data}
            alt="Crop preview"
            style={{ width: "100%", height: "auto", display: "block" }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.4)",
            }}
          />
          <div
            onPointerDown={handleRectPointerDown}
            style={{
              position: "absolute",
              left: `${crop.x}%`,
              top: `${crop.y}%`,
              width: `${crop.w}%`,
              height: `${crop.h}%`,
              borderRadius: 10,
              border: "2px solid var(--accent-primary)",
              boxShadow: "0 0 0 5000px rgba(0,0,0,0.4)",
              cursor: "move",
              touchAction: "none",
              background: "transparent",
            }}
          >
            <div
              onPointerDown={createResizePointerDown("top")}
              style={{
                position: "absolute",
                top: -6,
                left: "50%",
                transform: "translateX(-50%)",
                width: 40,
                height: 12,
                borderRadius: 999,
                background: "rgba(255,255,255,0.85)",
                cursor: "ns-resize",
              }}
            />
            <div
              onPointerDown={createResizePointerDown("bottom")}
              style={{
                position: "absolute",
                bottom: -6,
                left: "50%",
                transform: "translateX(-50%)",
                width: 40,
                height: 12,
                borderRadius: 999,
                background: "rgba(255,255,255,0.85)",
                cursor: "ns-resize",
              }}
            />
            <div
              onPointerDown={createResizePointerDown("left")}
              style={{
                position: "absolute",
                left: -6,
                top: "50%",
                transform: "translateY(-50%)",
                width: 12,
                height: 40,
                borderRadius: 999,
                background: "rgba(255,255,255,0.85)",
                cursor: "ew-resize",
              }}
            />
            <div
              onPointerDown={createResizePointerDown("right")}
              style={{
                position: "absolute",
                right: -6,
                top: "50%",
                transform: "translateY(-50%)",
                width: 12,
                height: 40,
                borderRadius: 999,
                background: "rgba(255,255,255,0.85)",
                cursor: "ew-resize",
              }}
            />
          </div>
        </div>

        <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>
          Drag the selector or adjust the sliders below to fine-tune the framed
          area.
        </p>

        <div style={{ display: "grid", gap: 12 }}>
          {rangeRows.map((row) => (
            <div
              key={row.label}
              style={{ display: "flex", flexDirection: "column", gap: 6 }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600 }}>
                  {row.label}
                </span>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {Math.round(row.value)}%
                </span>
              </div>
              <input
                type="range"
                min={row.min}
                max={row.max}
                value={row.value}
                onChange={(e) => row.onChange(Number(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button
            className="btn btn-ghost"
            onClick={() => updateCrop({ x: 10, y: 10, w: 80, h: 80 })}
          >
            Reset
          </button>
          <button className="btn btn-primary" onClick={handleApply}>
            <Check size={16} /> Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CARD CAMERA OVERLAY
// ============================================================================

type CardCameraOverlayProps = {
  side: CardSide;
  videoRef: RefObject<HTMLVideoElement>;
  error: string;
  onCancel: () => void;
  onCapture: (side: CardSide) => void;
};

function CardCameraOverlay({
  side,
  videoRef,
  error,
  onCancel,
  onCapture,
}: CardCameraOverlayProps) {
  const sideLabel = CARD_SIDE_LABELS[side];
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 320,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <div
        className="glass-card"
        style={{
          width: "100%",
          maxWidth: 520,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ fontSize: 16 }}>Capture {sideLabel}</h3>
          <button className="action-btn" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            background: "var(--bg)",
            height: 260,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          {error ? (
            <div
              style={{
                padding: 16,
                color: "var(--accent-amber)",
                fontSize: 13,
                textAlign: "center",
              }}
            >
              {error}
            </div>
          ) : (
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                background: "#000",
              }}
            />
          )}
        </div>

        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
          Line up the {sideLabel.toLowerCase()} inside the frame, keep the card
          steady, and tap capture when ready.
        </p>

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onCapture(side)}
            disabled={!!error}
          >
            <Camera size={16} /> Capture {sideLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
