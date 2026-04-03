"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Eye,
  EyeOff,
  Copy,
  Check,
  AlertTriangle,
} from "lucide-react";
import type { VaultItem } from "@/lib/types";

interface ShareInfo {
  itemTitle: string;
  itemType: string;
  shareType: "open" | "semi-encrypted" | "fully-encrypted";
  role: "read" | "download" | "edit";
  requiresPin?: boolean;
  requiresEmail?: boolean;
}

interface VerifyPayload {
  pin?: string;
  email?: string;
}

export default function SharePage() {
  const params = useParams();
  const linkId = params.linkId as string;

  const [step, setStep] = useState<"loading" | "auth" | "view" | "error">(
    "loading",
  );
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [item, setItem] = useState<VaultItem | null>(null);
  const [pin, setPin] = useState("");
  const [email, setEmail] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState("");

  const withTimeout = async <T,>(
    promise: Promise<T>,
    ms = 8000,
  ): Promise<T> => {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out")), ms),
    );
    return Promise.race([promise, timeout]);
  };

  const verifyAccess = async (
    pinVal?: string,
    emailVal?: string,
    passedShareType?: string,
    skipVerification = false,
  ) => {
    setLoading(true);
    setError("");
    const type = passedShareType || shareInfo?.shareType;
    console.log("Verifying access...", { skipVerification, type, linkId });

    try {
      let token = "";
      if (
        !skipVerification &&
        (shareInfo?.requiresPin || type === "semi-encrypted")
      ) {
        const verifyPayload: VerifyPayload = { pin: pinVal };
        const verifyRes = await withTimeout(
          fetch(`/api/share/${linkId}/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(verifyPayload),
          }),
        );

        const verifyData = await verifyRes.json();
        if (!verifyData.ok) {
          setError(verifyData.error || "Verification failed");
          setLoading(false);
          return;
        }
        token = verifyData.data.accessToken;
      } else if (
        !skipVerification &&
        (shareInfo?.requiresEmail || type === "fully-encrypted")
      ) {
        const verifyPayload: VerifyPayload = { email: emailVal };
        const verifyRes = await withTimeout(
          fetch(`/api/share/${linkId}/verify`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(verifyPayload),
          }),
        );

        const verifyData = await verifyRes.json();
        if (!verifyData.ok) {
          setError(verifyData.error || "Verification failed");
          setLoading(false);
          return;
        }
        token = verifyData.data.accessToken;
      }

      // Get item content
      console.log("Fetching item content with token:", token || "open");
      const accessRes = await withTimeout(
        fetch(`/api/share/${linkId}/access`, {
          headers: { Authorization: `Bearer ${token || "open"}` },
        }),
      );

      const accessData = await accessRes.json();
      console.log("Item content response:", accessData);

      if (accessData.ok) {
        setItem(accessData.data);
        console.log("Setting step to view...");
        setStep("view");
      } else {
        console.warn("Item content error:", accessData.error);
        setError(accessData.error || "Failed to load item content");
        setStep("error");
      }
    } catch (err) {
      console.error("verifyAccess error:", err);
      setError(
        "Error accessing shared content: " + (err instanceof Error ? err.message : "Unknown error"),
      );
      setStep("error");
    } finally {
      setLoading(false);
    }
  };

  const fetchShareInfo = async () => {
    console.log("Fetching share info for:", linkId);
    try {
      const res = await withTimeout(fetch(`/api/share/${linkId}`));
      const data = await res.json();
      console.log("Share info response:", data);

      if (data.ok) {
        setShareInfo(data.data);
        if (data.data.shareType === "open") {
          console.log("Auto-verifying open share...");
          verifyAccess("", "", data.data.shareType, true);
        } else {
          setStep("auth");
        }
      } else {
        setError(data.error || "Link not found or expired");
        setStep("error");
      }
    } catch (err) {
      console.error("fetchShareInfo error:", err);
      setError(
        err instanceof Error && err.message === "Request timed out"
          ? "Server took too long to respond."
          : "Failed to load share",
      );
      setStep("error");
    }
  };

  useEffect(() => {
    console.log("SharePage mount - linkId:", linkId);
    if (linkId) {
      fetchShareInfo();
    } else {
      console.warn("No linkId found in params");
      setError("Invalid share URL");
      setStep("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkId]);

  const handlePinSubmit = () => {
    if (!pin || pin.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }
    verifyAccess(pin, "", "");
  };

  const handleEmailSubmit = () => {
    if (!email.includes("@")) {
      setError("Invalid email");
      return;
    }
    verifyAccess("", email, "");
  };

  const copyToClipboard = (value: string, field: string) => {
    navigator.clipboard.writeText(value);
    setCopied(field);
    setTimeout(() => setCopied(""), 2000);
  };

  console.log("SharePage Rendering:", { step, hasItem: !!item });

  if (step === "loading") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-base)",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div className="app-loader"></div>
        <div style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Loading share link information...
        </div>
      </div>
    );
  }

  if (step === "error") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-base)",
          padding: 20,
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <AlertTriangle
            size={48}
            color="var(--accent-rose)"
            style={{ margin: "0 auto 16px" }}
          />
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
            Access Problem
          </h1>
          <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>
            {error}
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary"
            >
              Try Again
            </button>
            <Link href="/" className="btn btn-ghost">
              Go Back
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (step === "auth") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-base)",
          padding: 20,
        }}
      >
        <div
          style={{ width: "100%", maxWidth: 400 }}
          className="glass-card p-6"
        >
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
            Secure Access
          </h1>
          <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>
            <strong style={{ color: "var(--text-primary)" }}>
              {shareInfo?.itemTitle}
            </strong>{" "}
            is protected.
          </p>

          {error && <div className="alert-error mb-4">{error}</div>}

          {shareInfo?.requiresPin && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Enter Access PIN</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type={showPin ? "text" : "password"}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••"
                    className="form-input flex-1"
                    onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
                  />
                  <button
                    onClick={() => setShowPin(!showPin)}
                    className="action-btn"
                  >
                    {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button
                onClick={handlePinSubmit}
                disabled={loading || pin.length < 4}
                className="btn btn-primary w-full justify-center"
              >
                {loading ? "Verifying..." : "Unlock"}
              </button>
            </div>
          )}

          {shareInfo?.requiresEmail && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Enter Authorized Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  placeholder="you@example.com"
                  className="form-input"
                  onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
                />
              </div>
              <button
                onClick={handleEmailSubmit}
                disabled={loading || !email.includes("@")}
                className="btn btn-primary w-full justify-center"
              >
                {loading ? "Checking..." : "Continue"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === "view" && item) {
    const isCard = item.type === "card";
    const f = item.fields || {};

    // Collect all documents/images
    const allFiles = [];
    if (item.fileData) {
      allFiles.push({
        data: item.fileData,
        name: item.fileName || "Primary File",
        mimeType: item.fileMimeType,
      });
    }
    if (item.attachments && item.attachments.length > 0) {
      allFiles.push(...item.attachments);
    }

    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg-base)",
          padding: "60px 20px",
        }}
      >
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginBottom: 40,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.05)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
              }}
            >
              {isCard ? "💳" : "🔐"}
            </div>
            <div>
              <h1
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "#fff",
                  marginBottom: 2,
                }}
              >
                {item.title}
              </h1>
              <p style={{ color: "#525c7a", fontSize: 14, fontWeight: 500 }}>
                {f.cardholderName || f.username || "Shared Item"}
              </p>
            </div>
          </div>

          {/* Visual Card (for card type only) */}
          {isCard && (
            <div className="visual-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div className="card-chip"></div>
                <div className="card-brand">
                  {f.cardNumber?.startsWith("4")
                    ? "VISA"
                    : f.cardNumber?.startsWith("5")
                    ? "MASTERCARD"
                    : "CARD"}
                </div>
              </div>

              <div className="card-number-display">
                {f.cardNumber
                  ? f.cardNumber.replace(/(\d{4})/g, "$1 ").trim()
                  : "•••• •••• •••• ••••"}
              </div>

              <div className="card-details-row">
                <div>
                  <div className="card-detail-label">Cardholder</div>
                  <div className="card-detail-value">
                    {f.cardholderName || "NAME"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="card-detail-label">Expiry</div>
                  <div className="card-detail-value">{f.expiry || "MM/YY"}</div>
                </div>
              </div>
            </div>
          )}

          {/* Field List */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {Object.entries(f).map(([label, value]) => {
              if (!value || label === "notes") return null;

              // Prettier labels
              const fieldLabel = label
                .replace(/([A-Z])/g, " $1")
                .replace(/^./, (str) => str.toUpperCase());

              return (
                <div key={label} className="field-entry">
                  <div className="field-entry-info">
                    <div className="field-entry-label">{fieldLabel}</div>
                    <div className="field-entry-value">
                      {label === "cvv" || label === "pin" ? (
                        <span style={{ letterSpacing: "0.2em" }}>
                          {showPin ? String(value) : "•••"}
                        </span>
                      ) : (
                        String(value)
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(label === "cvv" || label === "pin") && (
                      <button
                        onClick={() => setShowPin(!showPin)}
                        className="field-entry-copy"
                      >
                        {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    )}
                    <button
                      onClick={() => copyToClipboard(String(value), label)}
                      className="field-entry-copy"
                    >
                      {copied === label ? (
                        <Check size={18} color="var(--accent-emerald)" />
                      ) : (
                        <Copy size={18} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Notes Section if exists */}
            {f.notes && (
              <div
                style={{
                  marginTop: 8,
                  padding: "20px 24px",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px dashed #1e2433",
                  borderRadius: 16,
                }}
              >
                <div className="field-entry-label">Notes</div>
                <div
                  style={{ color: "#8892a8", fontSize: 14, lineHeight: 1.6 }}
                >
                  {f.notes}
                </div>
              </div>
            )}

            {/* Attachments Section */}
            {allFiles.length > 0 && (
              <div style={{ marginTop: 32 }}>
                <div
                  className="field-entry-label"
                  style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}
                >
                  Attachments ({allFiles.length})
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                  }}
                >
                  {allFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="glass-card"
                      style={{ padding: 12, overflow: "hidden" }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--text-muted)",
                          marginBottom: 8,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {file.name}
                      </div>
                      {file.mimeType?.startsWith("image/") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={file.data}
                          alt={file.name}
                          style={{
                            width: "100%",
                            height: "auto",
                            borderRadius: 8,
                            display: "block",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            padding: "32px 0",
                            background: "rgba(255,255,255,0.02)",
                            borderRadius: 8,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span style={{ fontSize: 32 }}>📄</span>
                          <div style={{ fontSize: 14 }}>
                            {file.mimeType?.includes("pdf") ? "PDF Document" : "Encrypted File"}
                          </div>
                          <a
                            href={file.data}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost"
                            style={{ fontSize: 12, height: 32 }}
                          >
                            Open in new tab
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <footer
            style={{
              marginTop: 60,
              textAlign: "center",
              color: "#3b4257",
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: "0.02em",
            }}
          >
            <p>🛡️ SECURE ONE-WAY SHARED LINK BY CREDSHUB</p>
          </footer>
        </div>
      </div>
    );
  }

  return null;
}
