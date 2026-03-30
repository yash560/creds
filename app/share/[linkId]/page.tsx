"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Eye,
  EyeOff,
  Copy,
  Check,
  Lock,
  Mail,
  AlertTriangle,
} from "lucide-react";
import type { VaultItem, PasswordItem, CardItem } from "@/lib/types";

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

  // Load share link info
  useEffect(() => {
    fetchShareInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkId]);

  const fetchShareInfo = async () => {
    try {
      const res = await fetch(`/api/share/${linkId}`);
      const data = await res.json();
      if (data.ok) {
        setShareInfo(data.data);
        if (data.data.shareType === "open") {
          // Auto-complete for open shares
          verifyAccess("", "", "", true);
        } else {
          setStep("auth");
        }
      } else {
        setError(data.error || "Link not found or expired");
        setStep("error");
      }
    } catch (err: unknown) {
      setError("Failed to load share");
      setStep("error");
    }
  };

  const verifyAccess = async (
    pinVal?: string,
    emailVal?: string,
    token?: string,
    skipVerification = false,
  ) => {
    setLoading(true);
    try {
      const verifyPayload: VerifyPayload = {};
      if (pinVal) verifyPayload.pin = pinVal;
      if (emailVal) verifyPayload.email = emailVal;

      if (!skipVerification && shareInfo?.requiresPin) {
        const verifyRes = await fetch(`/api/share/${linkId}/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(verifyPayload),
        });

        const verifyData = await verifyRes.json();
        if (!verifyData.ok) {
          setError(verifyData.error || "Verification failed");
          return;
        }
        token = verifyData.data.accessToken;
      }

      // Get item content
      const accessRes = await fetch(`/api/share/${linkId}/access`, {
        headers: { Authorization: `Bearer ${token || "open"}` },
      });

      const accessData = await accessRes.json();
      if (accessData.ok) {
        setItem(accessData.data);
        setStep("view");
        setError("");
      } else {
        setError(accessData.error || "Failed to load item");
      }
    } catch (err: unknown) {
      setError("Error verifying access");
    } finally {
      setLoading(false);
    }
  };

  const handlePinSubmit = () => {
    if (!pin || pin.length < 4) {
      setError("PIN must be at least 4 digits");
      return;
    }
    setError("");
    verifyAccess(pin, "", "");
  };

  const handleEmailSubmit = () => {
    if (!email.includes("@")) {
      setError("Invalid email");
      return;
    }
    setError("");
    verifyAccess("", email, "");
  };

  const copyToClipboard = (value: string, field: string) => {
    navigator.clipboard.writeText(value);
    setCopied(field);
    setTimeout(() => setCopied(""), 2000);
  };

  if (step === "loading") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-base)",
        }}
      >
        <div style={{ textAlign: "center", color: "var(--text-secondary)" }}>
          <div style={{ fontSize: 24, marginBottom: 16 }}>⏳</div>
          <div>Loading share...</div>
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
        }}
      >
        <div
          style={{
            textAlign: "center",
            maxWidth: 400,
            color: "var(--text-primary)",
          }}
        >
          <AlertTriangle
            size={48}
            style={{
              color: "var(--accent-rose)",
              marginBottom: 16,
              marginLeft: "auto",
              marginRight: "auto",
              display: "block",
            }}
          />
          <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
            Share Link Error
          </h1>
          <p style={{ color: "var(--text-muted)", marginBottom: 16 }}>
            {error}
          </p>
          <Link
            href="/"
            style={{ color: "var(--accent-primary)", textDecoration: "none" }}
          >
            ← Back Home
          </Link>
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
        <div style={{ width: "100%", maxWidth: 400 }}>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              marginBottom: 8,
              color: "var(--text-primary)",
            }}
          >
            Share Access
          </h1>
          <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>
            <strong style={{ color: "var(--text-primary)" }}>
              {shareInfo?.itemTitle}
            </strong>{" "}
            is shared with you
          </p>

          {error && (
            <div
              style={{
                padding: 12,
                marginBottom: 16,
                background: "rgba(244, 63, 94, 0.1)",
                border: "1px solid rgba(244, 63, 94, 0.3)",
                borderRadius: 8,
                color: "var(--accent-rose)",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          {shareInfo?.requiresPin && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 8,
                    color: "var(--text-primary)",
                  }}
                >
                  <Lock
                    size={14}
                    style={{ display: "inline", marginRight: 6 }}
                  />
                  Enter PIN
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type={showPin ? "text" : "password"}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.slice(0, 8))}
                    placeholder="••••"
                    onKeyDown={(e) => e.key === "Enter" && handlePinSubmit()}
                    style={{
                      flex: 1,
                      padding: "10px 12px",
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      color: "var(--text-primary)",
                      fontSize: 14,
                      fontFamily: "monospace",
                      outline: "none",
                      transition: "border-color 0.2s",
                    }}
                    onFocus={(e) =>
                      (e.currentTarget.style.borderColor =
                        "var(--accent-primary)")
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor = "var(--border)")
                    }
                  />
                  <button
                    onClick={() => setShowPin(!showPin)}
                    style={{
                      padding: "10px 12px",
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor =
                        "var(--accent-primary)";
                      e.currentTarget.style.color = "var(--text-primary)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border)";
                      e.currentTarget.style.color = "var(--text-secondary)";
                    }}
                  >
                    {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button
                onClick={handlePinSubmit}
                disabled={loading || pin.length < 4}
                style={{
                  padding: "10px 16px",
                  background:
                    pin.length < 4
                      ? "var(--text-muted)"
                      : "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: pin.length < 4 ? "default" : "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Verifying..." : "Unlock"}
              </button>
            </div>
          )}

          {shareInfo?.requiresEmail && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 8,
                    color: "var(--text-primary)",
                  }}
                >
                  <Mail
                    size={14}
                    style={{ display: "inline", marginRight: 6 }}
                  />
                  Enter Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  placeholder="you@example.com"
                  onKeyDown={(e) => e.key === "Enter" && handleEmailSubmit()}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text-primary)",
                    fontSize: 14,
                    outline: "none",
                    transition: "border-color 0.2s",
                    marginBottom: 12,
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor =
                      "var(--accent-primary)")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "var(--border)")
                  }
                />
              </div>
              <button
                onClick={handleEmailSubmit}
                disabled={loading || !email.includes("@")}
                style={{
                  padding: "10px 16px",
                  background: !email.includes("@")
                    ? "var(--text-muted)"
                    : "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: !email.includes("@") ? "default" : "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Verifying..." : "Continue"}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === "view" && item) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg-base)",
          padding: 20,
        }}
      >
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 700,
                marginBottom: 8,
                color: "var(--text-primary)",
              }}
            >
              {item.title}
            </h1>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
              <span style={{ textTransform: "capitalize", fontWeight: 600 }}>
                {item.type}
              </span>{" "}
              • Access Level:{" "}
              <span style={{ textTransform: "capitalize", fontWeight: 600 }}>
                {shareInfo?.role}
              </span>
            </div>
          </div>

          {/* Item Content */}
          <div className="glass-card" style={{ padding: 24 }}>
            {item.type === "password" && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                {(item as PasswordItem).fields.username && (
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        marginBottom: 8,
                        color: "var(--text-muted)",
                      }}
                    >
                      Username
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <div
                        style={{
                          flex: 1,
                          padding: "10px 12px",
                          background: "var(--bg-card)",
                          borderRadius: 6,
                          fontFamily: "monospace",
                          fontSize: 14,
                        }}
                      >
                        {(item as PasswordItem).fields.username}
                      </div>
                      <button
                        onClick={() =>
                          copyToClipboard(
                            (item as PasswordItem).fields.username,
                            "username",
                          )
                        }
                        style={{
                          padding: 8,
                          background: "var(--bg-card)",
                          border: "none",
                          borderRadius: 4,
                          cursor: "pointer",
                          display: "flex",
                        }}
                      >
                        {copied === "username" ? (
                          <Check
                            size={14}
                            style={{ color: "var(--accent-emerald)" }}
                          />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                )}
                {(item as PasswordItem).fields.password && (
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        marginBottom: 8,
                        color: "var(--text-muted)",
                      }}
                    >
                      Password
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <div
                        style={{
                          flex: 1,
                          padding: "10px 12px",
                          background: "var(--bg-card)",
                          borderRadius: 6,
                          fontFamily: "monospace",
                          fontSize: 14,
                        }}
                      >
                        {(item as PasswordItem).fields.password}
                      </div>
                      <button
                        onClick={() =>
                          copyToClipboard(
                            (item as PasswordItem).fields.password,
                            "password",
                          )
                        }
                        style={{
                          padding: 8,
                          background: "var(--bg-card)",
                          border: "none",
                          borderRadius: 4,
                          cursor: "pointer",
                          display: "flex",
                        }}
                      >
                        {copied === "password" ? (
                          <Check
                            size={14}
                            style={{ color: "var(--accent-emerald)" }}
                          />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                )}
                {(item as PasswordItem).fields.url && (
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        marginBottom: 8,
                        color: "var(--text-muted)",
                      }}
                    >
                      Website
                    </div>
                    <a
                      href={(item as PasswordItem).fields.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "var(--accent-primary)",
                        textDecoration: "none",
                        wordBreak: "break-all",
                      }}
                    >
                      {(item as PasswordItem).fields.url}
                    </a>
                  </div>
                )}
              </div>
            )}

            {item.type === "card" && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 16 }}
              >
                {(item as CardItem).fields.cardholderName && (
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        marginBottom: 8,
                        color: "var(--text-muted)",
                      }}
                    >
                      Cardholder
                    </div>
                    <div
                      style={{
                        padding: "10px 12px",
                        background: "var(--bg-card)",
                        borderRadius: 6,
                        fontSize: 14,
                      }}
                    >
                      {(item as CardItem).fields.cardholderName}
                    </div>
                  </div>
                )}
                {(item as CardItem).fields.cardNumber && (
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        marginBottom: 8,
                        color: "var(--text-muted)",
                      }}
                    >
                      Card Number
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <div
                        style={{
                          flex: 1,
                          padding: "10px 12px",
                          background: "var(--bg-card)",
                          borderRadius: 6,
                          fontFamily: "monospace",
                          fontSize: 14,
                        }}
                      >
                        {(item as CardItem).fields.cardNumber}
                      </div>
                      <button
                        onClick={() =>
                          copyToClipboard(
                            (item as CardItem).fields.cardNumber,
                            "cardNumber",
                          )
                        }
                        style={{
                          padding: 8,
                          background: "var(--bg-card)",
                          border: "none",
                          borderRadius: 4,
                          cursor: "pointer",
                          display: "flex",
                        }}
                      >
                        {copied === "cardNumber" ? (
                          <Check
                            size={14}
                            style={{ color: "var(--accent-emerald)" }}
                          />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                )}
                {(item as CardItem).fields.expiry && (
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        marginBottom: 8,
                        color: "var(--text-muted)",
                      }}
                    >
                      Expiry
                    </div>
                    <div
                      style={{
                        padding: "10px 12px",
                        background: "var(--bg-card)",
                        borderRadius: 6,
                        fontFamily: "monospace",
                        fontSize: 14,
                      }}
                    >
                      {(item as CardItem).fields.expiry}
                    </div>
                  </div>
                )}
                {(item as CardItem).fields.cvv && (
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        marginBottom: 8,
                        color: "var(--text-muted)",
                      }}
                    >
                      CVV
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <div
                        style={{
                          flex: 1,
                          padding: "10px 12px",
                          background: "var(--bg-card)",
                          borderRadius: 6,
                          fontFamily: "monospace",
                          fontSize: 14,
                        }}
                      >
                        {(item as CardItem).fields.cvv}
                      </div>
                      <button
                        onClick={() =>
                          copyToClipboard((item as CardItem).fields.cvv, "cvv")
                        }
                        style={{
                          padding: 8,
                          background: "var(--bg-card)",
                          border: "none",
                          borderRadius: 4,
                          cursor: "pointer",
                          display: "flex",
                        }}
                      >
                        {copied === "cvv" ? (
                          <Check
                            size={14}
                            style={{ color: "var(--accent-emerald)" }}
                          />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {item.type === "document" && (
              <div>
                <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
                  Document shared with you
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: 24,
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: 12,
            }}
          >
            <p>
              🔒 This is a secure shared link. Do not share this URL with
              others.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
