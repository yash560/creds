"use client";

import { useState } from "react";
import type {
  VaultItem,
  PasswordItem,
  CardItem,
  DocumentItem,
  ScanItem,
} from "@/lib/types";
import Modal from "./Modal";
import PasswordDetailView from "./sections/PasswordCard";
import CreditCardView from "./sections/CreditCard";
import DocumentCardView from "./sections/DocumentCard";
import ShareModal from "./ShareModal";
import { Pencil, Move, Share2, X } from "lucide-react";
import { useVault } from "@/context/VaultContext";

interface ItemDetailModalProps {
  item: VaultItem | null;
  onClose: () => void;
  onEdit: () => void;
}

export default function ItemDetailModal({
  item,
  onClose,
  onEdit,
}: ItemDetailModalProps) {
  const { folders, updateItem } = useVault();
  const [showMove, setShowMove] = useState(false);
  const [showShare, setShowShare] = useState(false);

  if (!item) return null;

  const handleMove = async (folderId: string | null) => {
    await updateItem(item._id, { folderId });
    setShowMove(false);
  };

  return (
    <>
      <Modal
        open={!!item}
        onClose={onClose}
        title={item.title}
        footer={
          <div style={{ display: "flex", gap: 8, width: "100%" }}>
            <button
              className="btn btn-ghost"
              onClick={() => setShowMove(!showMove)}
              title="Move to folder"
            >
              <Move size={14} /> Move
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => setShowShare(true)}
              title="Create shareable link"
            >
              <Share2 size={14} /> Share
            </button>
            <div style={{ flex: 1 }} />
            <button className="btn btn-primary" onClick={onEdit}>
              <Pencil size={14} /> Edit
            </button>
          </div>
        }
      >
        {showMove && (
          <div
            className="glass-card"
            style={{
              padding: 12,
              marginBottom: 16,
              border: "1px solid var(--accent-primary)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600 }}>
                Move to Folder
              </span>
              <button className="action-btn" onClick={() => setShowMove(false)}>
                <X size={14} />
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <button
                className={`btn btn-ghost ${item.folderId === null ? "bg-primary/10" : ""}`}
                style={{ fontSize: 12, padding: "6px 8px" }}
                onClick={() => handleMove(null)}
              >
                No Folder
              </button>
              {folders.map((f) => (
                <button
                  key={f._id}
                  className={`btn btn-ghost ${item.folderId === f._id ? "bg-primary/10" : ""}`}
                  style={{
                    fontSize: 12,
                    padding: "6px 8px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  onClick={() => handleMove(f._id)}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {item.type === "password" && (
          <PasswordDetailView
            item={item as PasswordItem}
            onEdit={onEdit}
            onDelete={onClose}
          />
        )}
        {item.type === "card" && <CreditCardView item={item as CardItem} />}
        {(item.type === "document" || item.type === "scan") && (
          <DocumentCardView item={item as DocumentItem | ScanItem} />
        )}
      </Modal>

      <ShareModal
        open={showShare}
        item={item}
        onClose={() => setShowShare(false)}
      />
    </>
  );
}
