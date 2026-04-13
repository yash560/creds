"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Shield, ArrowRight, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import type { Invitation } from "@/lib/types";

export default function JoinPage() {
  const { token } = useParams() as { token: string };
  const { step, isAuthenticated } = useAuth();
  const authLoading = step === "loading";
  const router = useRouter();
  
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    async function fetchInvitation() {
      try {
        const res = await fetch(`/api/invitations/${token}`);
        const data = await res.json();
        if (data.ok) {
          setInvitation(data.data);
        } else {
          setError(data.error || "Invalid invitation link");
        }
      } catch {
        setError("Failed to load invitation");
      } finally {
        setLoading(false);
      }
    }
    if (token) fetchInvitation();
  }, [token]);

  const handleJoin = async () => {
    if (!isAuthenticated) {
      router.push(`/signup?invitation=${token}`);
      return;
    }

    setJoining(true);
    try {
      const res = await fetch(`/api/invitations/${token}/join`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.ok) {
        setJoined(true);
        setTimeout(() => router.push("/dashboard"), 2000);
      } else {
        setError(data.error || "Failed to join vault");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="auth-page">
        <Loader2 className="animate-spin text-accent-primary" size={40} />
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 400, textAlign: "center" }}>
        <div style={{ marginBottom: 32 }}>
          <div className="logo-icon" style={{ margin: "0 auto 16px" }}>
            <Shield size={32} color="white" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Join Vault</h1>
          <p style={{ color: "var(--text-secondary)", marginTop: 4 }}>
            Securely collaborate on passwords and documents
          </p>
        </div>

        {error ? (
          <div style={{ padding: 20 }}>
            <XCircle size={48} color="var(--accent-rose)" style={{ margin: "0 auto 16px" }} />
            <p style={{ color: "var(--accent-rose)", fontWeight: 600 }}>{error}</p>
            <button className="btn btn-ghost" style={{ marginTop: 16 }} onClick={() => router.push("/")}>
              Back to Home
            </button>
          </div>
        ) : joined ? (
          <div style={{ padding: 20 }}>
            <CheckCircle2 size={48} color="var(--accent-emerald)" style={{ margin: "0 auto 16px" }} />
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Success!</h2>
            <p style={{ color: "var(--text-secondary)" }}>You have joined the vault.</p>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>Redirecting to dashboard...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="glass-card" style={{ padding: 20, textAlign: 'left', background: 'rgba(255,255,255,0.03)' }}>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Invitation from</p>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>{invitation?.ownerName}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{invitation?.vaultName}</p>
              <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--bg-card)', borderRadius: 8, fontSize: 12, border: '1px solid var(--border)' }}>
                Role: <span style={{ textTransform: 'capitalize', fontWeight: 600, color: 'var(--accent-primary)' }}>{invitation?.role}</span>
              </div>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: 14, justifyContent: 'center' }}
              onClick={handleJoin}
              disabled={joining}
            >
              {joining ? <Loader2 className="animate-spin" size={18} /> : (
                <>
                  {isAuthenticated ? "Join Vault" : "Sign up to Join"} <ArrowRight size={16} />
                </>
              )}
            </button>

            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              By joining, you will have access to items shared with the &quot;{invitation?.role}&quot; role in this vault.
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        .logo-icon {
          width: 64,
          height: 64,
          border-radius: 18px;
          background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 8px 30px rgba(99, 102, 241, 0.3);
        }
      `}</style>
    </div>
  );
}
