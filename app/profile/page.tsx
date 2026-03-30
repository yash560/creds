"use client";

import { useState } from "react";
import {
  User,
  Shield,
  Lock,
  Trash2,
  AlertTriangle,
  Eye,
  EyeOff,
  CheckCircle,
  Clock,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function ProfilePage() {
  const { user, cryptoKey, lock } = useAuth();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [deleteDataOpen, setDeleteDataOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Change password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>(
    {},
  );
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // Delete data state
  const [deletePassword, setDeletePassword] = useState("");
  const [deletePasswordError, setDeletePasswordError] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};

    if (!currentPassword) errs.current = "Current password is required";
    if (!newPassword) errs.new = "New password is required";
    if (newPassword.length < 8)
      errs.new = "Password must be at least 8 characters";
    if (newPassword !== confirmPassword)
      errs.confirm = "Passwords do not match";
    if (newPassword === currentPassword)
      errs.new = "New password must be different";

    setPasswordErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setPasswordLoading(true);
    setPasswordSuccess("");
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json();

      if (!data.ok) {
        setPasswordErrors({
          current: data.error || "Failed to change password",
        });
        return;
      }

      setPasswordSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordErrors({});

      setTimeout(() => {
        setChangePasswordOpen(false);
        setPasswordSuccess("");
      }, 2000);
    } catch (err) {
      setPasswordErrors({ submit: "An error occurred. Please try again." });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteData = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setDeletePasswordError("");

    if (!deletePassword) {
      setDeletePasswordError("Password is required");
      return;
    }

    setDeleteLoading(true);
    try {
      const res = await fetch("/api/auth/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();

      if (!data.ok) {
        setDeletePasswordError(data.error || "Failed to delete account");
        return;
      }

      // Account deleted, redirect to login
      await lock();
      window.location.href = "/";
    } catch (err) {
      setDeletePasswordError("An error occurred. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(99,102,241,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <User size={17} style={{ color: "var(--accent-primary)" }} />
            </div>
            <h1 className="page-title">Manage Profile</h1>
          </div>
        </div>
      </div>

      {/* Account Information */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
        <h2
          style={{
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Shield size={18} /> Account Information
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 24,
          }}
        >
          {/* Email */}
          <div>
            <div className="form-label" style={{ marginBottom: 8 }}>
              Email Address
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 500,
                padding: "12px 14px",
                background: "var(--bg-card)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {user?.email}
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                verified
              </span>
            </div>
          </div>

          {/* Vault Name */}
          <div>
            <div className="form-label" style={{ marginBottom: 8 }}>
              Vault Name
            </div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 500,
                padding: "12px 14px",
                background: "var(--bg-card)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
              }}
            >
              {user?.vaultName}
            </div>
          </div>

          {/* Security Status */}
          <div>
            <div className="form-label" style={{ marginBottom: 8 }}>
              Security Status
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderRadius: "var(--radius-md)",
                background: cryptoKey
                  ? "rgba(16,185,129,0.1)"
                  : "rgba(245,158,11,0.1)",
                border: cryptoKey
                  ? "1px solid rgba(16,185,129,0.3)"
                  : "1px solid rgba(245,158,11,0.3)",
                color: cryptoKey
                  ? "var(--accent-emerald)"
                  : "var(--accent-amber)",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {cryptoKey ? (
                <CheckCircle size={14} />
              ) : (
                <AlertTriangle size={14} />
              )}
              {cryptoKey ? "End-to-End Encrypted" : "Standard Security"}
            </div>
          </div>

          {/* Account Status */}
          <div>
            <div className="form-label" style={{ marginBottom: 8 }}>
              Account Status
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderRadius: "var(--radius-md)",
                background: "rgba(34,197,94,0.1)",
                border: "1px solid rgba(34,197,94,0.3)",
                color: "var(--accent-emerald)",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              <CheckCircle size={14} />
              Active
            </div>
          </div>

          {/* PIN Status */}
          <div>
            <div className="form-label" style={{ marginBottom: 8 }}>
              Quick Access PIN
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderRadius: "var(--radius-md)",
                background: user?.hasPinSet
                  ? "rgba(34,197,94,0.1)"
                  : "rgba(156,163,175,0.1)",
                border: user?.hasPinSet
                  ? "1px solid rgba(34,197,94,0.3)"
                  : "1px solid rgba(156,163,175,0.3)",
                color: user?.hasPinSet
                  ? "var(--accent-emerald)"
                  : "var(--text-secondary)",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {user?.hasPinSet ? <CheckCircle size={14} /> : <Lock size={14} />}
              {user?.hasPinSet ? "PIN Set" : "No PIN Set"}
            </div>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
        <h2
          style={{
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 6,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Lock size={18} /> Security Settings
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            marginBottom: 20,
          }}
        >
          Manage your password and security preferences
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button
            className="btn btn-ghost"
            onClick={() => setChangePasswordOpen(true)}
            style={{
              justifyContent: "flex-start",
              padding: "14px 16px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Lock size={16} />
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                Change Password
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  marginTop: 2,
                }}
              >
                Update your account password
              </div>
            </div>
          </button>

          <button
            className="btn btn-ghost"
            onClick={() => alert("Session management coming soon")}
            style={{
              justifyContent: "flex-start",
              padding: "14px 16px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Clock size={16} />
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                Active Sessions
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  marginTop: 2,
                }}
              >
                View and manage your login sessions
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div
        className="glass-card"
        style={{
          padding: 24,
          borderColor: "rgba(239,68,68,0.3)",
          background: "rgba(239,68,68,0.05)",
        }}
      >
        <h2
          style={{
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 6,
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "var(--accent-rose)",
          }}
        >
          <AlertTriangle size={18} /> Danger Zone
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            marginBottom: 20,
          }}
        >
          Irreversible actions. Use with extreme caution.
        </p>

        <button
          className="btn"
          onClick={() => setDeleteDataOpen(true)}
          style={{
            background: "rgba(239,68,68,0.1)",
            color: "var(--accent-rose)",
            border: "1px solid rgba(239,68,68,0.3)",
            justifyContent: "flex-start",
            padding: "14px 16px",
            borderRadius: "var(--radius-md)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Trash2 size={16} />
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Delete All Data</div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                marginTop: 2,
              }}
            >
              Permanently delete your vault and all data
            </div>
          </div>
        </button>
      </div>

      {/* Change Password Modal */}
      <Modal
        open={changePasswordOpen}
        onClose={() => {
          setChangePasswordOpen(false);
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          setPasswordErrors({});
          setPasswordSuccess("");
        }}
        title="Change Password"
        footer={
          <>
            <button
              className="btn btn-ghost"
              onClick={() => setChangePasswordOpen(false)}
              disabled={passwordLoading}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleChangePassword}
              disabled={passwordLoading}
            >
              {passwordLoading ? "Updating…" : "Update Password"}
            </button>
          </>
        }
      >
        <form
          onSubmit={handleChangePassword}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          {passwordSuccess && (
            <div
              style={{
                padding: 12,
                borderRadius: "var(--radius-md)",
                background: "rgba(34,197,94,0.1)",
                color: "var(--accent-emerald)",
                fontSize: 13,
              }}
            >
              ✓ {passwordSuccess}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Current Password *</label>
            <input
              type="password"
              className={`form-input ${passwordErrors.current ? "border-red-500" : ""}`}
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                if (passwordErrors.current) setPasswordErrors({});
              }}
              placeholder="Enter your current password"
              autoFocus
            />
            {passwordErrors.current && (
              <div
                style={{
                  color: "var(--accent-rose)",
                  fontSize: 12,
                  marginTop: 4,
                }}
              >
                {passwordErrors.current}
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">New Password *</label>
            <input
              type="password"
              className={`form-input ${passwordErrors.new ? "border-red-500" : ""}`}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                if (passwordErrors.new) setPasswordErrors({});
              }}
              placeholder="At least 8 characters"
            />
            {passwordErrors.new && (
              <div
                style={{
                  color: "var(--accent-rose)",
                  fontSize: 12,
                  marginTop: 4,
                }}
              >
                {passwordErrors.new}
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Confirm Password *</label>
            <input
              type="password"
              className={`form-input ${passwordErrors.confirm ? "border-red-500" : ""}`}
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (passwordErrors.confirm) setPasswordErrors({});
              }}
              placeholder="Re-enter new password"
            />
            {passwordErrors.confirm && (
              <div
                style={{
                  color: "var(--accent-rose)",
                  fontSize: 12,
                  marginTop: 4,
                }}
              >
                {passwordErrors.confirm}
              </div>
            )}
          </div>

          {passwordErrors.submit && (
            <div style={{ color: "var(--accent-rose)", fontSize: 12 }}>
              {passwordErrors.submit}
            </div>
          )}
        </form>
      </Modal>

      {/* Delete Data Modal - Password Confirmation */}
      <Modal
        open={deleteDataOpen}
        onClose={() => {
          setDeleteDataOpen(false);
          setDeletePassword("");
          setDeletePasswordError("");
          setShowDeletePassword(false);
        }}
        title="Delete All Data"
        maxWidth={500}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              padding: 14,
              borderRadius: "var(--radius-md)",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              color: "var(--accent-rose)",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            <div
              style={{
                fontWeight: 600,
                marginBottom: 6,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <AlertTriangle size={14} />
              This action cannot be undone
            </div>
            All your vault data, including passwords, documents, cards, and
            family members will be permanently deleted.
          </div>

          <form
            onSubmit={handleDeleteData}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Confirm with your password *</label>
              <div style={{ position: "relative" }}>
                <input
                  type={showDeletePassword ? "text" : "password"}
                  className={`form-input ${deletePasswordError ? "border-red-500" : ""}`}
                  value={deletePassword}
                  onChange={(e) => {
                    setDeletePassword(e.target.value);
                    if (deletePasswordError) setDeletePasswordError("");
                  }}
                  placeholder="Enter your password to confirm"
                  autoFocus
                />
                <button
                  type="button"
                  className="action-btn"
                  onClick={() => setShowDeletePassword(!showDeletePassword)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                  }}
                >
                  {showDeletePassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>
              {deletePasswordError && (
                <div
                  style={{
                    color: "var(--accent-rose)",
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  {deletePasswordError}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setDeleteDataOpen(false);
                  setDeletePassword("");
                  setDeletePasswordError("");
                }}
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn"
                onClick={() => setDeleteConfirmOpen(true)}
                style={{
                  background: "rgba(239,68,68,0.1)",
                  color: "var(--accent-rose)",
                  border: "1px solid rgba(239,68,68,0.3)",
                }}
                disabled={!deletePassword || deleteLoading}
              >
                {deleteLoading ? "Deleting…" : "Delete Everything"}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Final Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteData}
        message="Are you absolutely sure? This will permanently delete all your vault data and cannot be reversed."
        confirmLabel="Yes, delete everything"
        isDangerous
      />
    </>
  );
}
