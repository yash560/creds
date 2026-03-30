"use client";

import Modal from "./Modal";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  loading?: boolean;
  isDangerous?: boolean;
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmLabel = "Delete",
  loading = false,
  isDangerous = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title=""
      maxWidth={400}
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
            className={isDangerous ? "btn btn-danger" : "btn btn-primary"}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Processing…" : confirmLabel}
          </button>
        </>
      }
    >
      <div style={{ textAlign: "center", padding: "8px 0" }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: isDangerous
              ? "rgba(244,63,94,0.12)"
              : "rgba(99,102,241,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <AlertTriangle
            size={22}
            style={{
              color: isDangerous
                ? "var(--accent-rose)"
                : "var(--accent-primary)",
            }}
          />
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
          {title}
        </h3>
        <p
          style={{
            fontSize: 14,
            color: "var(--text-secondary)",
            lineHeight: 1.6,
          }}
        >
          {message}
        </p>
      </div>
    </Modal>
  );
}
