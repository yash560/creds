/**
 * Heuristics to pull PAN-style fields from OCR text (no network; optional CVV if labeled).
 */

export interface ParsedCardOcr {
  cardNumber?: string;
  expiry?: string;
  cvv?: string;
}

export function luhnValid(digits: string): boolean {
  const n = digits.replace(/\D/g, '');
  if (n.length < 13 || n.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let v = parseInt(n[i], 10);
    if (Number.isNaN(v)) return false;
    if (alt) {
      v *= 2;
      if (v > 9) v -= 9;
    }
    sum += v;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/** Prefer 16-digit Visa/MC/Discover; otherwise first valid length 13–19. */
function pickBestPan(candidates: string[]): string | undefined {
  const valid = [...new Set(candidates)].filter(luhnValid);
  if (valid.length === 0) return undefined;
  const sixteen = valid.find((c) => c.length === 16);
  if (sixteen) return sixteen;
  valid.sort((a, b) => b.length - a.length);
  return valid[0];
}

function collectPanCandidates(raw: string): string[] {
  const out: string[] = [];
  const runs = raw.match(/\d{13,19}/g);
  if (runs) out.push(...runs);
  const grouped = raw.match(/(?:\d{4}[\s\-]?){3}\d{1,7}/g) || [];
  for (const g of grouped) {
    const d = g.replace(/\D/g, '');
    if (d.length >= 13 && d.length <= 19) out.push(d);
  }
  const digitsOnly = raw.replace(/\D/g, '');
  if (digitsOnly.length <= 800) {
    for (let len = 19; len >= 13; len--) {
      for (let i = 0; i + len <= digitsOnly.length; i++) {
        const sub = digitsOnly.slice(i, i + len);
        if (luhnValid(sub)) out.push(sub);
      }
    }
  }
  return out;
}

function extractExpiry(raw: string): string | undefined {
  const normalized = raw.replace(/[Oo]/g, '0').replace(/[Ll]/g, '1');
  const mmYy = /\b(0[1-9]|1[0-2])\s*[/\-.]\s*(\d{2})\b/;
  let m = normalized.match(mmYy);
  if (m) return `${m[1]}/${m[2]}`;
  const mmYyyy = /\b(0[1-9]|1[0-2])\s*[/\-.]\s*(20\d{2})\b/;
  m = normalized.match(mmYyyy);
  if (m) return `${m[1]}/${m[2].slice(-2)}`;
  const yyMm = /\b(\d{2})\s*[/\-.]\s*(0[1-9]|1[0-2])\b/;
  m = normalized.match(yyMm);
  if (m) return `${m[2]}/${m[1]}`;
  return undefined;
}

/** Only when OCR explicitly labels CVV/CVC — avoids random triplets from the PAN. */
function extractCvv(raw: string): string | undefined {
  const re =
    /(?:^|\s)(?:CVV|CVC|CID|C\.?V\.?V\.?|SECURITY\s*CODE|SEC\.?\s*CODE)\s*[:#.]?\s*(\d{3,4})(?:\s|$)/i;
  const m = raw.match(re);
  if (!m) return undefined;
  const v = m[1];
  if (v.length === 3 || v.length === 4) return v;
  return undefined;
}

export function parseCardFieldsFromOcrText(raw: string): ParsedCardOcr {
  const cardNumber = pickBestPan(collectPanCandidates(raw));
  const expiry = extractExpiry(raw);
  const cvv = extractCvv(raw);
  return { cardNumber, expiry, cvv };
}

/** Short title e.g. `Visa •••• 4242` when OCR fills the PAN. */
export function suggestCardTitleFromPan(pan: string): string {
  const d = pan.replace(/\D/g, '');
  if (d.length < 4) return 'Card';
  const last4 = d.slice(-4);
  let brand = 'Card';
  if (d.startsWith('4')) brand = 'Visa';
  else if (/^5[1-5]/.test(d)) brand = 'Mastercard';
  else if (/^3[47]/.test(d)) brand = 'Amex';
  else if (/^6(?:011|5)/.test(d)) brand = 'Discover';
  return `${brand} •••• ${last4}`;
}
