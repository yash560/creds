'use client';

import {
  createContext, useContext, useState, useEffect,
  ReactNode, useCallback
} from 'react';
import type { VaultItem, Folder, FamilyMember } from '@/lib/types';

interface VaultContextValue {
  items: VaultItem[];
  folders: Folder[];
  members: FamilyMember[];
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  refresh: () => Promise<void>;
  addItem: (payload: Partial<VaultItem>) => Promise<VaultItem>;
  updateItem: (id: string, payload: Partial<VaultItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  addFolder: (name: string, parentId?: string | null, icon?: string) => Promise<Folder>;
  deleteFolder: (id: string) => Promise<void>;
  renameFolder: (id: string, name: string) => Promise<void>;
  addMember: (payload: Partial<FamilyMember>) => Promise<FamilyMember>;
  updateMember: (id: string, payload: Partial<FamilyMember>) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const [ir, fr, mr] = await Promise.all([
        fetch('/api/items').then(r => r.json()),
        fetch('/api/folders').then(r => r.json()),
        fetch('/api/members').then(r => r.json()),
      ]);
      if (ir.ok) setItems(ir.data);
      if (fr.ok) setFolders(fr.data);
      if (mr.ok) setMembers(mr.data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const addItem = useCallback(async (payload: Partial<VaultItem>): Promise<VaultItem> => {
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setItems(prev => [data.data, ...prev]);
    return data.data;
  }, []);

  const updateItem = useCallback(async (id: string, payload: Partial<VaultItem>) => {
    await fetch(`/api/items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setItems(prev => prev.map(it => it._id === id ? { ...it, ...payload } : it));
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    await fetch(`/api/items/${id}`, { method: 'DELETE' });
    setItems(prev => prev.filter(it => it._id !== id));
  }, []);

  const addFolder = useCallback(async (name: string, parentId?: string | null, icon?: string): Promise<Folder> => {
    const res = await fetch('/api/folders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parentId, icon }),
    });
    const data = await res.json();
    setFolders(prev => [...prev, data.data]);
    return data.data;
  }, []);

  const renameFolder = useCallback(async (id: string, name: string) => {
    await fetch(`/api/folders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setFolders(prev => prev.map(f => f._id === id ? { ...f, name } : f));
  }, []);

  const deleteFolder = useCallback(async (id: string) => {
    await fetch(`/api/folders/${id}`, { method: 'DELETE' });
    setFolders(prev => prev.filter(f => f._id !== id));
  }, []);

  const addMember = useCallback(async (payload: Partial<FamilyMember>): Promise<FamilyMember> => {
    const res = await fetch('/api/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setMembers(prev => [...prev, data.data]);
    return data.data;
  }, []);

  const updateMember = useCallback(async (id: string, payload: Partial<FamilyMember>) => {
    await fetch(`/api/members/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setMembers(prev => prev.map(m => m._id === id ? { ...m, ...payload } : m));
  }, []);

  const deleteMember = useCallback(async (id: string) => {
    await fetch(`/api/members/${id}`, { method: 'DELETE' });
    setMembers(prev => prev.filter(m => m._id !== id));
  }, []);

  return (
    <VaultContext.Provider value={{
      items, folders, members, isLoading, searchQuery, setSearchQuery,
      refresh, addItem, updateItem, deleteItem,
      addFolder, renameFolder, deleteFolder,
      addMember, updateMember, deleteMember,
    }}>
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error('useVault must be used within VaultProvider');
  return ctx;
}
