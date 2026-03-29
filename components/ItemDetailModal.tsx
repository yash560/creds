'use client';

import { useState } from 'react';
import type { VaultItem, PasswordItem, CardItem, DocumentItem, ScanItem } from '@/lib/types';
import Modal from './Modal';
import PasswordDetailView from './sections/PasswordCard';
import CreditCardView from './sections/CreditCard';
import DocumentCardView from './sections/DocumentCard';
import { Pencil } from 'lucide-react';

interface ItemDetailModalProps {
  item: VaultItem | null;
  onClose: () => void;
  onEdit: () => void;
}

export default function ItemDetailModal({ item, onClose, onEdit }: ItemDetailModalProps) {
  if (!item) return null;

  return (
    <Modal
      open={!!item}
      onClose={onClose}
      title={item.title}
      footer={
        <button className="btn btn-primary" onClick={onEdit}>
          <Pencil size={14} /> Edit
        </button>
      }
    >
      {item.type === 'password' && <PasswordDetailView item={item as PasswordItem} onEdit={onEdit} onDelete={onClose} />}
      {item.type === 'card' && <CreditCardView item={item as CardItem} />}
      {(item.type === 'document' || item.type === 'scan') && <DocumentCardView item={item as DocumentItem | ScanItem} />}
    </Modal>
  );
}
