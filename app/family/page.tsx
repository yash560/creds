"use client";

import { useState } from "react";
import { Plus, Users, Pencil, Trash2, Link as LinkIcon, Loader2, Copy, Check, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useVault } from "@/context/VaultContext";
import Modal from "@/components/Modal";
import ItemCard from "@/components/ItemCard";
import ItemDetailModal from "@/components/ItemDetailModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import AddItemModal from "@/components/AddItemModal";
import AccessControlModal from "@/components/AccessControlModal";
import RoleBadge from "@/components/RoleBadge";
import { GridSkeleton, ListSkeleton } from "@/components/SkeletonLoader";
import type { FamilyMember, VaultItem, Role } from "@/lib/types";

export default function FamilyPage() {
  const {
    members,
    addMember,
    updateMember,
    deleteMember,
    items,
    addItem,
    updateItem,
    deleteItem,
    updateItemAccess,
    folders,
    isLoading,
  } = useVault();
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [editMemberItem, setEditMemberItem] = useState<FamilyMember | null>(
    null,
  );
  const [memberToDelete, setMemberToDelete] = useState<FamilyMember | null>(
    null,
  );

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("👤");
  const [role, setRole] = useState<Role>("viewer");

  const [selected, setSelected] = useState<FamilyMember | null>(null);
  const [detailItem, setDetailItem] = useState<VaultItem | null>(null);
  const [editItem, setEditItem] = useState<VaultItem | null>(null);
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [accessItem, setAccessItem] = useState<VaultItem | null>(null);

  // Invitation state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("viewer");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);

  const memberItems = selected
    ? items.filter((i) => i.memberId === selected._id)
    : [];

  const EMOJIS = ["👤", "👨", "👩", "👴", "👵", "👦", "👧", "🧑", "👨‍💼", "👩‍💼"];

  return (
    <>
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              className="item-type-icon icon-family"
              style={{ width: 36, height: 36 }}
            >
              <Users size={17} />
            </div>
            <h1 className="page-title">Family</h1>
          </div>
          <p className="page-subtitle">Person-wise document organisation</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            className="btn btn-ghost"
            onClick={() => setInviteOpen(true)}
          >
            <LinkIcon size={15} /> Invite Member
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setAddMemberOpen(true)}
          >
            <Plus size={15} /> Add Profile
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 20 }}>
        {/* Member list */}
        <div
          style={{
            width: 220,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {isLoading ? (
            <ListSkeleton count={4} />
          ) : members.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: "var(--text-muted)",
                padding: "24px 16px",
                fontSize: 13,
              }}
            >
              No members yet
            </div>
          ) : (
            members.map((m) => (
              <div
                key={m._id}
                className={`glass-card member-card-new ${selected?._id === m._id ? "active" : ""}`}
                onClick={() => setSelected(m._id === selected?._id ? null : m)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ fontSize: 26 }}>{m.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="member-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {m.name}
                      {m.memberUserId && (
                        <div title="Linked to user account" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-emerald)' }} />
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <RoleBadge role={m.role} />
                      {m.memberUserId && (
                        <Link href={`/profile/${m.memberUserId}`} className="text-link" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 2 }}>
                          Profile <ExternalLink size={10} />
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="member-actions-hover">
                    <button
                      className="action-btn-new"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditMemberItem(m);
                        setName(m.name);
                        setEmoji(m.emoji || "👤");
                        setRole(m.role);
                      }}
                      title="Edit Member"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      className="action-btn-new danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMemberToDelete(m);
                      }}
                      title="Delete Member"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Member content */}
        <div style={{ flex: 1 }}>
          {!selected ? (
            <div className="empty-state">
              <div className="empty-icon">👨‍👩‍👧‍👦</div>
              <p>Select a family member to view their documents</p>
            </div>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 20,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 40 }}>{selected.emoji}</div>
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700 }}>
                      {selected.name}
                    </h2>
                    <RoleBadge role={selected.role} />
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => setAddItemOpen(true)}
                >
                  <Plus size={14} /> Add Doc
                </button>
              </div>
              {isLoading ? (
                <GridSkeleton count={4} />
              ) : memberItems.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📄</div>
                  <p style={{ fontSize: 14, color: "var(--text-muted)" }}>
                    No items assigned to {selected.name}
                  </p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Add items and assign them to {selected.name} using the
                    member field.
                  </p>
                </div>
              ) : (
                <div className="item-grid">
                  {memberItems.map((item) => (
                    <ItemCard
                      key={item._id}
                      item={item}
                      onClick={setDetailItem}
                      onEdit={setEditItem}
                      onDelete={setDeleteId}
                      members={members}
                      onManageAccess={setAccessItem}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Member Modal */}
      <Modal
        open={addMemberOpen}
        onClose={() => setAddMemberOpen(false)}
        title="Add Family Member"
        footer={
          <>
            <button
              className="btn btn-ghost"
              onClick={() => setAddMemberOpen(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={async () => {
                if (!name.trim()) return;
                await addMember({ name: name.trim(), emoji, role });
                setName("");
                setEmoji("👤");
                setRole("viewer");
                setAddMemberOpen(false);
              }}
            >
              Add Member
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Name</label>
            <input
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mom, Dad, Yash"
              autoFocus
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Avatar</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  style={{
                    fontSize: 24,
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    border:
                      emoji === e
                        ? "2px solid var(--accent-primary)"
                        : "1px solid var(--border)",
                    background: "var(--bg-card)",
                    cursor: "pointer",
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Role</label>
            <select
              className="form-select"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="admin">Admin (full access)</option>
              <option value="editor">Editor (add & edit)</option>
              <option value="viewer">Viewer (read only)</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Add item for member */}
      <AddItemModal
        open={addItemOpen}
        onClose={() => setAddItemOpen(false)}
        initialType="document"
        folders={folders}
        members={members}
        existing={{ memberId: selected?._id } as unknown as VaultItem}
        onSave={async (p) => {
          await addItem({ ...p, memberId: selected?._id });
        }}
      />
      <ItemDetailModal
        item={detailItem}
        onClose={() => setDetailItem(null)}
        onEdit={() => {
          setEditItem(detailItem);
          setDetailItem(null);
        }}
      />
      <AddItemModal
        open={!!editItem}
        onClose={() => setEditItem(null)}
        existing={editItem}
        folders={folders}
        members={members}
        onSave={async (p) => {
          await updateItem(editItem!._id, p);
        }}
      />
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          deleteItem(deleteId!);
          setDeleteId(null);
        }}
      />

      {/* Edit Member Modal */}
      <Modal
        open={!!editMemberItem}
        onClose={() => setEditMemberItem(null)}
        title="Edit Family Member"
        footer={
          <>
            <button
              className="btn btn-ghost"
              onClick={() => setEditMemberItem(null)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={async () => {
                if (!name.trim()) return;
                await updateMember(editMemberItem!._id, {
                  name: name.trim(),
                  emoji,
                  role,
                });
                setEditMemberItem(null);
              }}
            >
              Save Changes
            </button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Name</label>
            <input
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mom, Dad, Yash"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Avatar</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  style={{
                    fontSize: 24,
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    border:
                      emoji === e
                        ? "2px solid var(--accent-primary)"
                        : "1px solid var(--border)",
                    background: "var(--bg-card)",
                    cursor: "pointer",
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Role</label>
            <select
              className="form-select"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="admin">Admin (full access)</option>
              <option value="editor">Editor (add & edit)</option>
              <option value="viewer">Viewer (read only)</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Delete Member Confirm */}
      <ConfirmDialog
        open={!!memberToDelete}
        onClose={() => setMemberToDelete(null)}
        onConfirm={async () => {
          await deleteMember(memberToDelete!._id);
          if (selected?._id === memberToDelete?._id) setSelected(null);
          setMemberToDelete(null);
        }}
        message={`Delete ${memberToDelete?.name}? Associated documents will remain but lose their member link.`}
      />

      {/* Invite Member Modal */}
      <Modal
        open={inviteOpen}
        onClose={() => {
          setInviteOpen(false);
          setGeneratedLink("");
          setInviteName("");
        }}
        title="Invite Family Member"
        footer={
          !generatedLink ? (
            <>
              <button className="btn btn-ghost" onClick={() => setInviteOpen(false)}>Cancel</button>
              <button 
                className="btn btn-primary" 
                disabled={inviteLoading || !inviteName.trim()}
                onClick={async () => {
                  setInviteLoading(true);
                  try {
                    const res = await fetch('/api/invitations', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name: inviteName, role: inviteRole }),
                    });
                    const data = await res.json();
                    if (data.ok) {
                      const link = `${window.location.origin}/join/${data.data.token}`;
                      setGeneratedLink(link);
                    }
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setInviteLoading(false);
                  }
                }}
              >
                {inviteLoading ? <Loader2 size={16} className="animate-spin" /> : "Generate Link"}
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={() => { setInviteOpen(false); setGeneratedLink(""); setInviteName(""); }}>Done</button>
          )
        }
      >
        {!generatedLink ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Create an invitation link for a family member. They will be able to join your vault with the pre-filled name.
            </p>
            <div className="form-group">
              <label className="form-label">Member Name</label>
              <input 
                className="form-input" 
                value={inviteName} 
                onChange={e => setInviteName(e.target.value)} 
                placeholder="e.g. Yash Jain"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select 
                className="form-select" 
                value={inviteRole} 
                onChange={e => setInviteRole(e.target.value as Role)}
              >
                <option value="admin">Admin (Full Access)</option>
                <option value="editor">Editor (Can edit items)</option>
                <option value="viewer">Viewer (Read only)</option>
              </select>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ 
                width: 48, height: 48, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', 
                color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                margin: '0 auto 12px' 
              }}>
                <Check size={24} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Link Generated!</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Share this link with {inviteName}</p>
            </div>
            
            <div className="input-with-action">
              <input 
                className="form-input" 
                readOnly 
                value={generatedLink} 
                style={{ background: 'var(--bg-card)', fontSize: 12 }} 
              />
              <button 
                className="action-btn" 
                onClick={() => {
                  navigator.clipboard.writeText(generatedLink);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? <Check size={14} color="var(--accent-emerald)" /> : <Copy size={14} />}
              </button>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
              This link will expire in 7 days or after it is used.
            </p>
          </div>
        )}
      </Modal>

      {accessItem && (
        <AccessControlModal
          open={!!accessItem}
          onClose={() => setAccessItem(null)}
          title={`Manage Access: ${accessItem.title}`}
          members={members}
          initialRestrictedTo={accessItem.accessControl?.restrictedTo || []}
          onSave={async (restrictedTo) => {
            await updateItemAccess(accessItem._id, restrictedTo);
          }}
          description="Grant specific members access to this item."
        />
      )}
    </>
  );
}
