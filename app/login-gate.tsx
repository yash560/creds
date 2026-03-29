'use client';

import { useState } from 'react';
import { Shield, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function LoginGate() {
  const { unlock, setup, needsSetup } = useAuth();
  const [pin, setPin] = useState('');
  const [vaultName, setVaultName] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const addDigit = (d: string) => {
    if (pin.length < 8) setPin(p => p + d);
  };

  const removeDigit = () => setPin(p => p.slice(0, -1));

  const handleSubmit = async () => {
    if (pin.length < 4) { setError('PIN must be at least 4 digits'); return; }
    if (needsSetup && pin !== confirmPin) { setError('PINs do not match'); return; }
    setError('');
    setLoading(true);
    try {
      const result = needsSetup ? await setup(pin, vaultName || 'My Vault') : await unlock(pin);
      if (!result.ok) setError(result.error || 'Incorrect PIN');
    } finally {
      setLoading(false);
    }
  };

  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15) 0%, var(--bg-base) 60%)',
      padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 40px rgba(99,102,241,0.4)',
          }}>
            <Shield size={36} color="white" />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>
            {needsSetup ? 'Create Vault' : 'Welcome Back'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            {needsSetup ? 'Set a master PIN to secure your vault' : 'Enter your PIN to unlock the vault'}
          </p>
        </div>

        {/* Setup: vault name */}
        {needsSetup && (
          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">Vault Name</label>
            <input
              className="form-input"
              value={vaultName}
              onChange={e => setVaultName(e.target.value)}
              placeholder="My Family Vault"
              style={{ textAlign: 'center' }}
            />
          </div>
        )}

        {/* PIN dots */}
        <div className={`pin-ring ${pin.length > 0 ? 'active' : ''}`}>
          <Shield size={32} style={{ color: 'var(--accent-primary)', opacity: 0.7 }} />
        </div>

        <div className="pin-dots">
          {Array.from({ length: needsSetup ? 8 : 8 }).map((_, i) => (
            <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`} />
          ))}
        </div>

        {/* Confirm PIN (setup only) */}
        {needsSetup && pin.length >= 4 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              Confirm PIN
            </div>
            <div className="pin-dots">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={`pin-dot ${i < confirmPin.length ? 'filled' : ''}`} />
              ))}
            </div>
          </div>
        )}

        {/* Keypad */}
        <div className="keypad" style={{ marginBottom: 20 }}>
          {keys.map((k, i) => (
            <button
              key={i}
              className={`key-btn ${k === '' ? 'invisible' : ''}`}
              style={{ visibility: k === '' ? 'hidden' : 'visible' }}
              onClick={() => {
                if (k === '⌫') {
                  if (needsSetup && pin.length >= 4) setConfirmPin(p => p.slice(0,-1));
                  else removeDigit();
                } else if (k !== '') {
                  if (needsSetup && pin.length >= 4) {
                    if (confirmPin.length < 8) setConfirmPin(p => p + k);
                  } else {
                    addDigit(k);
                  }
                }
              }}
            >
              {k === '⌫' ? '⌫' : k}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div style={{ textAlign: 'center', color: 'var(--accent-rose)', fontSize: 13, marginBottom: 16, animation: 'slideUp 0.2s ease' }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          className="btn btn-primary"
          style={{ width: '100%', padding: '14px', fontSize: 15, justifyContent: 'center' }}
          onClick={handleSubmit}
          disabled={loading || pin.length < 4}
        >
          {loading ? (
            <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          ) : (
            <>{needsSetup ? 'Create Vault' : 'Unlock'} <ArrowRight size={16} /></>
          )}
        </button>
      </div>
    </div>
  );
}
