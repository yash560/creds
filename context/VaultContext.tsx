"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import type { VaultItem, Folder, FamilyMember } from "@/lib/types";
import { useAuth } from "./AuthContext";
import { getEncryptedCache, setEncryptedCache } from "@/lib/crypto-vault";

interface VaultContextValue {
  items: VaultItem[];
  folders: Folder[];
  members: FamilyMember[];
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  refresh: () => Promise<void>;
  addItem: (payload: Partial<VaultItem>) => Promise<VaultItem>;
  addItemsBulk: (payloads: Partial<VaultItem>[]) => Promise<void>;
  updateItem: (id: string, payload: Partial<VaultItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  addFolder: (
    name: string,
    parentId?: string | null,
    icon?: string,
  ) => Promise<Folder>;
  deleteFolder: (id: string) => Promise<void>;
  renameFolder: (id: string, name: string) => Promise<void>;
  addMember: (payload: Partial<FamilyMember>) => Promise<FamilyMember>;
  updateMember: (id: string, payload: Partial<FamilyMember>) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: ReactNode }) {
  const { cryptoKey, isAuthenticated } = useAuth();
  const [items, setItems] = useState<VaultItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const [ir, fr, mr] = await Promise.all([
        fetch("/api/items").then((r) => r.json()),
        fetch("/api/folders").then((r) => r.json()),
        fetch("/api/members").then((r) => r.json()),
      ]);

      console.log("API Responses:", { ir, fr, mr }); // Debug log

      if (ir?.ok) {
        setItems(ir.data || []);
        if (cryptoKey) setEncryptedCache("items", ir.data || [], cryptoKey);
      } else {
        console.error("Items fetch failed:", ir?.error);
      }
      if (fr?.ok) {
        setFolders(fr.data || []);
        if (cryptoKey) setEncryptedCache("folders", fr.data || [], cryptoKey);
      } else {
        console.error("Folders fetch failed:", fr?.error);
      }
      if (mr?.ok) {
        setMembers(mr.data || []);
        if (cryptoKey) setEncryptedCache("members", mr.data || [], cryptoKey);
      } else {
        console.error("Members fetch failed:", mr?.error);
      }
    } catch (err) {
      console.error("Vault refresh error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, cryptoKey]);

  useEffect(() => {
    console.log(
      "VaultContext effect - isAuthenticated:",
      isAuthenticated,
      "cryptoKey:",
      !!cryptoKey,
    ); // Debug log
    if (!isAuthenticated || !cryptoKey) {
      console.log("Clearing vault data"); // Debug log
      setItems([]);
      setFolders([]);
      setMembers([]);
      return;
    }

    const loadCache = async () => {
      console.log("Loading cache and refreshing vault data"); // Debug log
      const [cItems, cFolders, cMembers] = await Promise.all([
        getEncryptedCache<VaultItem[]>("items", cryptoKey),
        getEncryptedCache<Folder[]>("folders", cryptoKey),
        getEncryptedCache<FamilyMember[]>("members", cryptoKey),
      ]);
      if (cItems) setItems(cItems);
      if (cFolders) setFolders(cFolders);
      if (cMembers) setMembers(cMembers);

      refresh();
    };

    loadCache();
  }, [isAuthenticated, cryptoKey, refresh]);

  const addItem = useCallback(
    async (payload: Partial<VaultItem>): Promise<VaultItem> => {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      // Log duplicate detection
      if (data.isDuplicate) {
        console.warn(
          `Duplicate detected: "${data.data.title}" (${data.data.type}) already exists. Using existing item.`,
        );
        return data.data;
      }

      setItems((prev) => {
        const next = [data.data, ...prev];
        if (cryptoKey) setEncryptedCache("items", next, cryptoKey);
        return next;
      });
      return data.data;
    },
    [cryptoKey],
  );

  const addItemsBulk = useCallback(
    async (payloads: Partial<VaultItem>[]): Promise<void> => {
      // We'll add them one by one to use the existing server logic and encryption,
      // but we'll only update the local state once at the end for performance.
      const newItems: VaultItem[] = [];
      let duplicateCount = 0;

      for (const p of payloads) {
        try {
          const res = await fetch("/api/items", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(p),
          });
          const data = await res.json();
          if (data.ok) {
            newItems.push(data.data);
            if (data.isDuplicate) {
              duplicateCount++;
              console.warn(
                `Duplicate detected: "${data.data.title}" (${data.data.type}) already exists.`,
              );
            }
          }
        } catch (err) {
          console.error("Batch item failed", err);
        }
      }

      if (duplicateCount > 0) {
        console.warn(
          `Skipped ${duplicateCount} duplicate item(s) during bulk import`,
        );
      }

      if (newItems.length > 0) {
        setItems((prev) => {
          const next = [...newItems, ...prev];
          if (cryptoKey) setEncryptedCache("items", next, cryptoKey);
          return next;
        });
      }
    },
    [cryptoKey],
  );

  const updateItem = useCallback(
    async (id: string, payload: Partial<VaultItem>) => {
      await fetch(`/api/items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setItems((prev) => {
        const next = prev.map((it) =>
          it._id === id ? { ...it, ...payload } : it,
        );
        if (cryptoKey) setEncryptedCache("items", next, cryptoKey);
        return next;
      });
    },
    [cryptoKey],
  );

  const deleteItem = useCallback(
    async (id: string) => {
      await fetch(`/api/items/${id}`, { method: "DELETE" });
      setItems((prev) => {
        const next = prev.filter((it) => it._id !== id);
        if (cryptoKey) setEncryptedCache("items", next, cryptoKey);
        return next;
      });
    },
    [cryptoKey],
  );

  const addFolder = useCallback(
    async (
      name: string,
      parentId?: string | null,
      icon?: string,
    ): Promise<Folder> => {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parentId, icon }),
      });
      const data = await res.json();
      setFolders((prev) => {
        const next = [...prev, data.data];
        if (cryptoKey) setEncryptedCache("folders", next, cryptoKey);
        return next;
      });
      return data.data;
    },
    [cryptoKey],
  );

  const renameFolder = useCallback(
    async (id: string, name: string) => {
      await fetch(`/api/folders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      setFolders((prev) => {
        const next = prev.map((f) => (f._id === id ? { ...f, name } : f));
        if (cryptoKey) setEncryptedCache("folders", next, cryptoKey);
        return next;
      });
    },
    [cryptoKey],
  );

  const deleteFolder = useCallback(
    async (id: string) => {
      await fetch(`/api/folders/${id}`, { method: "DELETE" });
      setFolders((prev) => {
        const next = prev.filter((f) => f._id !== id);
        if (cryptoKey) setEncryptedCache("folders", next, cryptoKey);
        return next;
      });
    },
    [cryptoKey],
  );

  const addMember = useCallback(
    async (payload: Partial<FamilyMember>): Promise<FamilyMember> => {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setMembers((prev) => {
        const next = [...prev, data.data];
        if (cryptoKey) setEncryptedCache("members", next, cryptoKey);
        return next;
      });
      return data.data;
    },
    [cryptoKey],
  );

  const updateMember = useCallback(
    async (id: string, payload: Partial<FamilyMember>) => {
      await fetch(`/api/members/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setMembers((prev) => {
        const next = prev.map((m) => (m._id === id ? { ...m, ...payload } : m));
        if (cryptoKey) setEncryptedCache("members", next, cryptoKey);
        return next;
      });
    },
    [cryptoKey],
  );

  const deleteMember = useCallback(
    async (id: string) => {
      await fetch(`/api/members/${id}`, { method: "DELETE" });
      setMembers((prev) => {
        const next = prev.filter((m) => m._id !== id);
        if (cryptoKey) setEncryptedCache("members", next, cryptoKey);
        return next;
      });
    },
    [cryptoKey],
  );

  return (
    <VaultContext.Provider
      value={{
        items,
        folders,
        members,
        isLoading,
        searchQuery,
        setSearchQuery,
        refresh,
        addItem,
        addItemsBulk,
        updateItem,
        deleteItem,
        addFolder,
        renameFolder,
        deleteFolder,
        addMember,
        updateMember,
        deleteMember,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within VaultProvider");
  return ctx;
}
