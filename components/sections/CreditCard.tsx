'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { CardItem } from '@/lib/types';
import CopyButton from '../CopyButton';
import Tooltip from '../Tooltip';

interface CreditCardViewProps {
  item: CardItem;
}

function maskNumber(num: string) {
  const digits = num.replace(/\D/g, '');
  const last4 = digits.slice(-4);
  return `•••• •••• •••• ${last4}`;
}

function detectType(num: string): string {
  const d = num.replace(/\D/g, '');
  if (d.startsWith('4')) return 'visa';
  if (/^5[1-5]/.test(d)) return 'mastercard';
  if (/^3[47]/.test(d)) return 'amex';
  return 'default';
}

export default function CreditCardView({ item }: CreditCardViewProps) {
  const [showCvv, setShowCvv] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const { cardNumber = '', cardholderName = '', expiry = '', cvv = '', pin = '', notes = '', cardType } = item.fields;
  const type = cardType || detectType(cardNumber);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Visual card */}
      <div className={`credit-card-visual ${type}`}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="card-chip" />
          <div style={{ fontSize: 22, fontWeight: 700, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {type === 'visa' ? 'VISA' : type === 'mastercard' ? '●●' : type === 'amex' ? 'AMEX' : ''}
          </div>
        </div>
        <div className="card-number">{cardNumber ? maskNumber(cardNumber) : '•••• •••• •••• ••••'}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div className="card-expiry-label">Card Holder</div>
            <div className="card-holder">{cardholderName || 'YOUR NAME'}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="card-expiry-label">Expires</div>
            <div className="card-expiry-value">{expiry || 'MM/YY'}</div>
          </div>
        </div>
      </div>

      {item.fileData && item.fileMimeType?.startsWith('image/') && (
        <div>
          <div className="form-label">Card photo</div>
          <img
            src={item.fileData}
            alt=""
            style={{ maxWidth: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}
          />
        </div>
      )}

      {/* Fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Card Number */}
        <div style={{ gridColumn: '1 / -1' }}>
          <div className="form-label">Card Number</div>
          <div className="input-with-action">
            <div className="form-input mono" style={{ flex: 1 }}>{maskNumber(cardNumber)}</div>
            <CopyButton value={cardNumber} label="Copy number" />
          </div>
        </div>

        {/* Expiry */}
        <div>
          <div className="form-label">Expiry</div>
          <div className="input-with-action">
            <div className="form-input" style={{ flex: 1 }}>{expiry}</div>
            <CopyButton value={expiry} label="Copy expiry" />
          </div>
        </div>

        {/* CVV */}
        <div>
          <div className="form-label">CVV</div>
          <div className="input-with-action">
            <div className="form-input mono" style={{ flex: 1 }}>
              {showCvv ? cvv : '•'.repeat(cvv.length || 3)}
            </div>
            <Tooltip label={showCvv ? 'Hide CVV' : 'Show CVV'}>
              <button className="action-btn" onClick={() => setShowCvv(p => !p)} aria-label="Toggle CVV">
                {showCvv ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </Tooltip>
            <CopyButton value={cvv} label="Copy CVV" />
          </div>
        </div>

        {/* PIN */}
        {pin && (
          <div style={{ gridColumn: '1 / -1' }}>
            <div className="form-label">ATM PIN</div>
            <div className="input-with-action">
              <div className="form-input mono" style={{ flex: 1 }}>
                {showPin ? pin : '•'.repeat(pin.length || 4)}
              </div>
              <Tooltip label={showPin ? 'Hide PIN' : 'Show PIN'}>
                <button className="action-btn" onClick={() => setShowPin(p => !p)} aria-label="Toggle PIN">
                  {showPin ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </Tooltip>
              <CopyButton value={pin} label="Copy PIN" />
            </div>
          </div>
        )}

        {/* Notes */}
        {notes && (
          <div style={{ gridColumn: '1 / -1' }}>
            <div className="form-label">Notes</div>
            <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: 14 }}>
              {notes}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
