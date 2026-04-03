"use client";

import { useState, useRef, useEffect } from "react";
import {
  Shield,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ArrowRight,
  ChevronLeft,
  Keyboard,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

// ─── Sub-components ───────────────────────────────────────────────────────────

function InputField({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  icon: Icon,
  autoFocus = false,
  error,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  icon: React.ElementType;
  autoFocus?: boolean;
  error?: string;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div className="form-group" style={{ marginBottom: 0 }}>
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <div className="input-with-action">
        <div style={{ position: "relative", flex: 1 }}>
          <Icon
            size={15}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
              pointerEvents: "none",
            }}
          />
          <input
            id={id}
            type={isPassword ? (show ? "text" : "password") : type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className="form-input"
            style={{ paddingLeft: 36 }}
            autoComplete={isPassword ? "current-password" : id}
          />
        </div>
        {isPassword && (
          <button
            className="action-btn"
            type="button"
            onClick={() => setShow((p) => !p)}
            aria-label="Toggle visibility"
          >
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      {error && (
        <div
          style={{ color: "var(--accent-rose)", fontSize: 12, marginTop: 4 }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

// ─── PIN digit boxes (physical keyboard + paste) ─────────────────────────────

function PinDigitBoxes({
  pin,
  setPin,
  disabled,
}: {
  pin: string;
  setPin: (p: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);

  useEffect(() => {
    if (pin === "") refs.current[0]?.focus();
  }, [pin]);

  const handleChange = (i: number, raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
      setPin((pin.slice(0, i) + pin.slice(i + 1)).slice(0, 4));
      return;
    }
    const d = digits.slice(-1);
    const next = (pin.slice(0, i) + d + pin.slice(i + 1)).slice(0, 4);
    setPin(next);
    if (d && i < 3) refs.current[i + 1]?.focus();
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (pin[i]) {
        setPin(pin.slice(0, i) + pin.slice(i + 1));
      } else if (i > 0) {
        setPin(pin.slice(0, i - 1) + pin.slice(i));
        refs.current[i - 1]?.focus();
      }
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowLeft" && i > 0) {
      refs.current[i - 1]?.focus();
      e.preventDefault();
    }
    if (e.key === "ArrowRight" && i < 3) {
      refs.current[i + 1]?.focus();
      e.preventDefault();
    }
  };

  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const t = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    setPin(t);
    requestAnimationFrame(() => {
      refs.current[Math.min(Math.max(0, t.length), 3)]?.focus();
    });
  };

  return (
    <div
      style={{ display: "flex", gap: 10, justifyContent: "center" }}
      onPaste={onPaste}
    >
      {[0, 1, 2, 3].map((i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={pin[i] ?? ""}
          disabled={disabled}
          className="form-input pin-digit-box"
          style={{
            width: 44,
            height: 52,
            textAlign: "center",
            fontSize: 22,
            fontWeight: 700,
            padding: 0,
            marginBottom: 0,
          }}
          aria-label={`Digit ${i + 1} of 4`}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
        />
      ))}
    </div>
  );
}

// ─── PIN Pad ──────────────────────────────────────────────────────────────────

function PinPad({
  pin,
  setPin,
  title,
  subtitle,
  onSubmit,
  loading,
  error,
  onBack,
  onSkip,
}: {
  pin: string;
  setPin: (p: string) => void;
  title: string;
  subtitle: string;
  onSubmit: () => void;
  loading: boolean;
  error: string;
  onBack?: () => void;
  onSkip?: () => void;
}) {
  const [showKeypad, setShowKeypad] = useState(false);
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  const handleKey = (k: string) => {
    if (k === "⌫") {
      setPin(pin.slice(0, -1));
      return;
    }
    if (k && pin.length < 4) setPin(pin + k);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 20,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
          {title}
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          {subtitle}
        </p>
      </div>

      <PinDigitBoxes pin={pin} setPin={setPin} disabled={loading} />

      <button
        type="button"
        className="btn btn-ghost"
        style={{ fontSize: 13, gap: 8 }}
        onClick={() => setShowKeypad((s) => !s)}
        disabled={loading}
      >
        <Keyboard size={16} />
        {showKeypad ? "Hide number pad" : "Show number pad"}
      </button>

      {showKeypad && (
        <div className="keypad">
          {keys.map((k, i) => (
            <button
              key={i}
              type="button"
              className="key-btn"
              style={{
                visibility: k === "" ? "hidden" : "visible",
                opacity: loading ? 0.5 : 1,
              }}
              onClick={() => handleKey(k)}
              disabled={loading}
            >
              {k}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div
          style={{
            color: "var(--accent-rose)",
            fontSize: 13,
            textAlign: "center",
          }}
        >
          {error}
        </div>
      )}

      <button
        className="btn btn-primary"
        style={{
          width: "100%",
          maxWidth: 280,
          justifyContent: "center",
          padding: "13px",
        }}
        onClick={onSubmit}
        disabled={loading || pin.length < 4}
      >
        {loading ? (
          <div
            style={{
              width: 18,
              height: 18,
              border: "2px solid rgba(255,255,255,0.3)",
              borderTopColor: "white",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
        ) : (
          <>
            {title.includes("Unlock") ? "Unlock" : "Set PIN"}{" "}
            <ArrowRight size={15} />
          </>
        )}
      </button>

      <div style={{ display: "flex", gap: 20 }}>
        {onBack && (
          <button
            className="btn btn-ghost"
            style={{ fontSize: 13 }}
            onClick={onBack}
          >
            <ChevronLeft size={14} /> Sign in differently
          </button>
        )}
        {onSkip && (
          <button
            className="btn btn-ghost"
            style={{ fontSize: 13, color: "var(--text-muted)" }}
            onClick={onSkip}
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main LoginGate ───────────────────────────────────────────────────────────

export default function LoginGate() {
  const {
    step,
    user,
    hasUsers,
    error,
    register,
    signIn,
    verifyPin,
    setupPin,
    skipPin,
    goToRegister,
    goToSignIn,
    clearError,
  } = useAuth();

  // Registration state
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regVault, setRegVault] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});

  // Sign-in state
  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");
  const [siLoading, setSiLoading] = useState(false);

  // PIN state
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinStep, setPinStep] = useState<"enter" | "confirm">("enter");
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState("");

  const logo = (
    <div style={{ textAlign: "center", marginBottom: 32 }}>
      <div
        style={{
          width: 68,
          height: 68,
          borderRadius: 20,
          margin: "0 auto 14px",
          background:
            "linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 8px 40px rgba(99,102,241,0.4)",
        }}
      >
        <Shield size={34} color="white" />
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em" }}>
        Vaultora
      </div>
      <div
        style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}
      >
        Your super-private vault
      </div>
    </div>
  );

  // ── Register ──────────────────────────────────────────────────────────────────
  if (step === "register") {
    const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      const errs: Record<string, string> = {};
      if (!regEmail) errs.email = "Email is required";
      if (!regPassword || regPassword.length < 8)
        errs.password = "At least 8 characters";
      if (regPassword !== regConfirm) errs.confirm = "Passwords do not match";
      setRegErrors(errs);
      if (Object.keys(errs).length > 0) return;
      setRegLoading(true);
      try {
        await register(regEmail, regPassword, regVault);
      } finally {
        setRegLoading(false);
      }
    };

    return (
      <div className="auth-page">
        <div className="auth-card">
          {logo}
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
            Create your account
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: 14,
              marginBottom: 24,
            }}
          >
            Get started with your private vault
          </p>

          {error && (
            <div className="alert-error" style={{ marginBottom: 16 }}>
              {error}
            </div>
          )}

          <form
            onSubmit={handleRegister}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            <InputField
              id="reg-email"
              label="Email address"
              type="email"
              value={regEmail}
              onChange={(v) => {
                setRegEmail(v);
                clearError();
              }}
              placeholder="you@example.com"
              icon={Mail}
              autoFocus
              error={regErrors.email}
            />
            <InputField
              id="reg-password"
              label="Password"
              type="password"
              value={regPassword}
              onChange={(v) => {
                setRegPassword(v);
                clearError();
              }}
              placeholder="At least 8 characters"
              icon={Lock}
              error={regErrors.password}
            />
            <InputField
              id="reg-confirm"
              label="Confirm password"
              type="password"
              value={regConfirm}
              onChange={(v) => {
                setRegConfirm(v);
                clearError();
              }}
              placeholder="Repeat password"
              icon={Lock}
              error={regErrors.confirm}
            />
            <InputField
              id="reg-vault"
              label="Vault name (optional)"
              value={regVault}
              onChange={setRegVault}
              placeholder="e.g. Family Vault"
              icon={User}
            />

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: "100%",
                justifyContent: "center",
                padding: "13px",
                marginTop: 4,
              }}
              disabled={regLoading}
            >
              {regLoading ? (
                <div
                  style={{
                    width: 18,
                    height: 18,
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "white",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
              ) : (
                <>
                  Create Vault <ArrowRight size={15} />
                </>
              )}
            </button>
            {hasUsers && (
              <p
                style={{
                  textAlign: "center",
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  marginTop: 16,
                }}
              >
                Already have an account?{" "}
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{
                    padding: "2px 6px",
                    fontSize: 13,
                    display: "inline",
                  }}
                  onClick={() => {
                    clearError();
                    goToSignIn();
                  }}
                >
                  Sign in
                </button>
              </p>
            )}
          </form>
        </div>
      </div>
    );
  }

  // ── Sign In ───────────────────────────────────────────────────────────────────
  if (step === "signin") {
    const handleSignIn = async (e: React.FormEvent) => {
      e.preventDefault();
      setSiLoading(true);
      try {
        await signIn(siEmail, siPassword);
      } finally {
        setSiLoading(false);
      }
    };

    return (
      <div className="auth-page">
        <div className="auth-card">
          {logo}
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
            Welcome back
          </h1>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: 14,
              marginBottom: 24,
            }}
          >
            Sign in to your vault
          </p>

          {error && (
            <div className="alert-error" style={{ marginBottom: 16 }}>
              {error}
            </div>
          )}

          <form
            onSubmit={handleSignIn}
            style={{ display: "flex", flexDirection: "column", gap: 14 }}
          >
            <InputField
              id="si-email"
              label="Email address"
              type="email"
              value={siEmail}
              onChange={(v) => {
                setSiEmail(v);
                clearError();
              }}
              placeholder="you@example.com"
              icon={Mail}
              autoFocus
            />
            <InputField
              id="si-password"
              label="Password"
              type="password"
              value={siPassword}
              onChange={(v) => {
                setSiPassword(v);
                clearError();
              }}
              placeholder="Your password"
              icon={Lock}
            />

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                width: "100%",
                justifyContent: "center",
                padding: "13px",
                marginTop: 4,
              }}
              disabled={siLoading}
            >
              {siLoading ? (
                <div
                  style={{
                    width: 18,
                    height: 18,
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "white",
                    borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
              ) : (
                <>
                  Sign In <ArrowRight size={15} />
                </>
              )}
            </button>
            <p
              style={{
                textAlign: "center",
                fontSize: 13,
                color: "var(--text-secondary)",
                marginTop: 16,
              }}
            >
              New here?{" "}
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: "2px 6px", fontSize: 13, display: "inline" }}
                onClick={() => {
                  clearError();
                  goToRegister();
                }}
              >
                Create an account
              </button>
            </p>
          </form>
        </div>
      </div>
    );
  }

  // ── Quick PIN unlock ──────────────────────────────────────────────────────────
  if (step === "pin") {
    const handleVerify = async (p: string) => {
      setPinLoading(true);
      setPinError("");
      try {
        await verifyPin(p);
      } catch {
        setPinError("Something went wrong");
      } finally {
        setPinLoading(false);
        setPin("");
      }
    };

    // Auto-verify when 4 digits are reached
    const onPinChange = (p: string) => {
      setPin(p);
      if (p.length === 4) {
        handleVerify(p);
      }
    };

    return (
      <div className="auth-page">
        <div className="auth-card" style={{ alignItems: "center" }}>
          {logo}
          <div
            style={{
              fontSize: 14,
              color: "var(--text-secondary)",
              marginBottom: 16,
            }}
          >
            Signed in as{" "}
            <strong style={{ color: "var(--text-primary)" }}>
              {user?.email}
            </strong>
          </div>
          <PinPad
            pin={pin}
            setPin={onPinChange}
            title="Unlock Vault"
            subtitle="Enter your 4-digit PIN"
            onSubmit={() => handleVerify(pin)}
            loading={pinLoading}
            error={pinError || error}
            onBack={async () => {
              await fetch("/api/auth/lock", { method: "POST" });
              window.location.reload();
            }}
          />
        </div>
      </div>
    );
  }

  // ── Set up PIN ────────────────────────────────────────────────────────────────
  if (step === "setup-pin") {
    const handleSetPin = async (p: string, cp?: string) => {
      if (pinStep === "enter") {
        if (p.length < 4) return;
        setConfirmPin("");
        setPinStep("confirm");
        return;
      }
      // confirm step
      const finalCp = cp ?? confirmPin;
      if (pin !== finalCp) {
        setPinError("PINs do not match — try again");
        setPin("");
        setConfirmPin("");
        setPinStep("enter");
        return;
      }
      setPinLoading(true);
      setPinError("");
      try {
        await setupPin(pin);
      } finally {
        setPinLoading(false);
      }
    };

    const confirmAndSet = (cp: string) => {
      setConfirmPin(cp);
      if (cp.length === 4) {
        handleSetPin(pin, cp);
      }
    };

    if (pinStep === "confirm") {
      return (
        <div className="auth-page">
          <div className="auth-card" style={{ alignItems: "center" }}>
            {logo}
            <PinPad
              pin={confirmPin}
              setPin={confirmAndSet}
              title="Confirm PIN"
              subtitle="Re-enter your 4-digit PIN to confirm"
              onSubmit={() => handleSetPin(pin, confirmPin)}
              loading={pinLoading}
              error={pinError}
              onBack={() => {
                setPinStep("enter");
                setPin("");
                setConfirmPin("");
                setPinError("");
              }}
              onSkip={skipPin}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="auth-page">
        <div className="auth-card" style={{ alignItems: "center" }}>
          {logo}
          <PinPad
            pin={pin}
            setPin={setPin}
            title="Set Quick PIN"
            subtitle="Create a 4-digit PIN for quick access"
            onSubmit={() => handleSetPin(pin)}
            loading={pinLoading}
            error={pinError || error}
            onSkip={skipPin}
          />
        </div>
      </div>
    );
  }

  // Loading spinner
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          border: "3px solid var(--border)",
          borderTopColor: "var(--accent-primary)",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Loading…</p>
    </div>
  );
}
