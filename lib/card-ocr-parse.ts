/**
 * Heuristics to pull PAN-style fields from OCR text (no network; optional CVV if labeled).
 * Supports: Visa, Mastercard, Amex, Discover, RuPay, Maestro, UnionPay, Diners, JCB
 */

export interface ParsedCardOcr {
  cardNumber?: string;
  expiry?: string;
  cvv?: string;
  cardholderName?: string;
  brand?: string;
}

// ─────────────────────────────────────────────
// Luhn Validation
// ─────────────────────────────────────────────

export function luhnValid(digits: string): boolean {
  const n = digits.replace(/\D/g, '');
  if (n.length < 12 || n.length > 19) return false;
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

// ─────────────────────────────────────────────
// Card Brand Detection
// ─────────────────────────────────────────────

/**
 * Detect card brand from PAN prefix.
 * Returns: 'visa' | 'mastercard' | 'amex' | 'discover' | 'rupay' |
 *          'maestro' | 'unionpay' | 'diners' | 'jcb' | 'default'
 */
export function detectCardBrand(pan: string): string {
  const d = pan.replace(/\D/g, '');

  // Amex: 34xx or 37xx (15 digits)
  if (/^3[47]/.test(d)) return 'amex';

  // Diners Club: 300–305, 36, 38 (14 digits)
  if (/^3(?:0[0-5]|[68])/.test(d)) return 'diners';

  // JCB: 3528–3589
  if (/^35(?:2[89]|[3-8]\d)/.test(d)) return 'jcb';

  // Visa: starts with 4 (13 or 16 digits)
  if (d.startsWith('4')) return 'visa';

  // Mastercard: 51–55, or 2221–2720
  if (/^5[1-5]/.test(d) || /^2(?:2[2-9][1-9]|[3-6]\d{2}|7[01]\d|720)/.test(d)) return 'mastercard';

  // Discover: 6011, 622126–622925, 644–649, 65
  if (/^6(?:011|22(?:12[6-9]|1[3-9]\d|[2-8]\d{2}|9(?:[01]\d|2[0-5]))|4[4-9]\d|5\d{2})/.test(d)) return 'discover';

  // UnionPay: 62xx (not already matched as Discover)
  if (/^62/.test(d)) return 'unionpay';

  // RuPay: 508xxx, 607xx, 608xx, 6096, 65xx
  if (/^(?:508[5-9]\d|6069[89]|607|608|6096|65[0-9]{2})/.test(d)) return 'rupay';

  // Maestro: 6304, 6759, 6761, 6763, 50xxxx, 56xxxx
  if (/^(?:6304|6759|676[13]|50\d{4}|56\d{4})/.test(d)) return 'maestro';

  return 'default';
}

// ─────────────────────────────────────────────
// PAN Extraction
// ─────────────────────────────────────────────

function normalizePanOcr(raw: string): string {
  // Common OCR misreads on card numbers
  return raw
    .replace(/[Oo]/g, '0')
    .replace(/[IlL]/g, '1')
    .replace(/[Ss]/g, '5')
    .replace(/[Bb]/g, '8')
    .replace(/[Zz]/g, '2')
    .replace(/[Gg]/g, '6');
}

interface PanCandidate {
  digits: string;
  luhn: boolean;
  source: 'grouped' | 'run' | 'brute';
}

function collectPanCandidates(raw: string): PanCandidate[] {
  const candidates: PanCandidate[] = [];
  const seen = new Set<string>();

  const add = (digits: string, source: PanCandidate['source']) => {
    const d = digits.replace(/\D/g, '');
    if (d.length < 12 || d.length > 19) return;
    if (seen.has(d)) return;
    seen.add(d);
    candidates.push({ digits: d, luhn: luhnValid(d), source });
  };

  // 1. Strict 4-4-4-4 (Visa/MC/Discover/RuPay)
  const groups4444 = raw.match(/\b\d{4}[\s\-·•_]{1,3}\d{4}[\s\-·•_]{1,3}\d{4}[\s\-·•_]{1,3}\d{4}\b/g) || [];
  groups4444.forEach(g => add(g, 'grouped'));

  // 2. Amex 4-6-5
  const amexGroups = raw.match(/\b\d{4}[\s\-·•_]{1,3}\d{6}[\s\-·•_]{1,3}\d{5}\b/g) || [];
  amexGroups.forEach(g => add(g, 'grouped'));

  // 3. Diners 4-6-4
  const dinersGroups = raw.match(/\b\d{4}[\s\-·•_]{1,3}\d{6}[\s\-·•_]{1,3}\d{4}\b/g) || [];
  dinersGroups.forEach(g => add(g, 'grouped'));

  // 4. JCB 4-4-4-4 (already covered by group 4-4-4-4)

  // 5. Flexible grouped: at least two 4-digit groups separated by a delimiter
  const flexGroups = raw.match(/\b\d{4}[^\d\n]{1,3}\d{4}(?:[^\d\n]{1,3}\d{4,7}){0,2}\b/g) || [];
  flexGroups.forEach(g => add(g, 'grouped'));

  // 6. Continuous digit runs (no spaces on card surface, e.g., embossed reads)
  const runs = raw.match(/\b\d{12,19}\b/g) || [];
  runs.forEach(r => add(r, 'run'));

  // 7. Brute-force: slide window over all digit chars (handles OCR gluing digits across fields)
  //    Only engage when NO grouped or run candidates exist at all —
  //    not just when none are Luhn-valid. A visible 4-4-4-4 group always
  //    beats a lucky Luhn hit from raw digit soup.
  const hasAnyCandidateSoFar = candidates.length > 0;
  if (!hasAnyCandidateSoFar) {
    const digitsOnly = raw.replace(/\D/g, '');
    if (digitsOnly.length >= 12 && digitsOnly.length <= 200) {
      for (let len = 19; len >= 12; len--) {
        for (let i = 0; i + len <= digitsOnly.length; i++) {
          const sub = digitsOnly.slice(i, i + len);
          if (luhnValid(sub)) add(sub, 'brute');
        }
      }
    }
  }

  return candidates;
}

function pickBestPan(candidates: PanCandidate[]): string | undefined {
  // Priority 1: Luhn-valid grouped (4-4-4-4 / Amex / Diners patterns)
  const luhnGrouped = candidates.filter(c => c.luhn && c.source === 'grouped');
  // Priority 2: Luhn-valid continuous runs (no spaces on surface)
  const luhnRuns = candidates.filter(c => c.luhn && c.source === 'run');
  // Priority 3: Non-Luhn grouped — sample/test cards & OCR-damaged checksums
  //             MUST rank above brute-force: a visible 4-4-4-4 group is far
  //             more reliable than a random digit sequence that passes Luhn.
  const nonLuhnGrouped = candidates.filter(c => !c.luhn && c.source === 'grouped');
  // Priority 4: Non-Luhn runs
  const nonLuhnRuns = candidates.filter(c => !c.luhn && c.source === 'run');
  // Priority 5 (last resort): Luhn-valid brute-force window
  const luhnBrute = candidates.filter(c => c.luhn && c.source === 'brute');

  const pool =
    luhnGrouped.length > 0 ? luhnGrouped :
      luhnRuns.length > 0 ? luhnRuns :
        nonLuhnGrouped.length > 0 ? nonLuhnGrouped :
          nonLuhnRuns.length > 0 ? nonLuhnRuns :
            luhnBrute;

  if (pool.length === 0) return undefined;

  // Prefer 16-digit (most common), then 15 (Amex), then longest
  const prefer = [16, 15, 19, 18, 17, 14, 13, 12];
  for (const len of prefer) {
    const match = pool.find(c => c.digits.length === len);
    if (match) return match.digits;
  }
  // Fallback: longest
  pool.sort((a, b) => b.digits.length - a.digits.length);
  return pool[0].digits;
}

function formatPan(digits: string): string {
  const brand = detectCardBrand(digits);
  if (brand === 'amex') {
    // 4-6-5
    return `${digits.slice(0, 4)} ${digits.slice(4, 10)} ${digits.slice(10)}`;
  }
  if (brand === 'diners') {
    // 4-6-4
    return `${digits.slice(0, 4)} ${digits.slice(4, 10)} ${digits.slice(10)}`;
  }
  // Default: 4-4-4-4 (or 4-4-4 for 12-digit)
  return digits.match(/.{1,4}/g)?.join(' ') ?? digits;
}

// ─────────────────────────────────────────────
// Expiry Extraction
// ─────────────────────────────────────────────

function extractExpiry(raw: string): string | undefined {
  // Normalise common OCR mis-reads
  const normalized = raw
    .replace(/[Oo]/g, '0')
    .replace(/[Ll]/g, '1')
    .replace(/['`'']/g, '/');  // OCR sometimes reads / as a quote

  // Labeled expiry: many label variants
  const labeledRe =
    /(?:expir(?:y|ing\s+on|es?|ation(?:\s+date?)?)|valid\s+(?:through|thru|to|till|until)|good\s+(?:thru|through)|valid\s+thru|thru|through|valid\s+from|valid)\s*[:\-]?\s*(0[1-9]|1[0-2])\s*[\/\-\.]\s*(\d{2,4})/gi;
  let m: RegExpExecArray | null;
  while ((m = labeledRe.exec(normalized)) !== null) {
    const month = m[1];
    const yr = m[2].length === 4 ? m[2].slice(-2) : m[2];
    return `${month}/${yr}`;
  }

  // Bare MM/YY or MM-YY (standalone, not part of a longer number)
  const mmYy = /(?<!\d)(0[1-9]|1[0-2])\s*[\/\-\.]\s*(\d{2})(?!\d)/;
  let m2 = normalized.match(mmYy);
  if (m2) return `${m2[1]}/${m2[2]}`;

  // Bare MM/YYYY
  const mmYyyy = /(?<!\d)(0[1-9]|1[0-2])\s*[\/\-\.]\s*(20\d{2})(?!\d)/;
  m2 = normalized.match(mmYyyy);
  if (m2) return `${m2[1]}/${m2[2].slice(-2)}`;

  // YYYY/MM
  const yyyyMm = /(?<!\d)(20\d{2})\s*[\/\-\.]\s*(0[1-9]|1[0-2])(?!\d)/;
  m2 = normalized.match(yyyyMm);
  if (m2) return `${m2[2]}/${m2[1].slice(-2)}`;

  // YY/MM fallback
  const yyMm = /(?<!\d)(\d{2})\s*[\/\-\.]\s*(0[1-9]|1[0-2])(?!\d)/;
  m2 = normalized.match(yyMm);
  if (m2) return `${m2[2]}/${m2[1]}`;

  return undefined;
}

// ─────────────────────────────────────────────
// CVV Extraction
// ─────────────────────────────────────────────

/**
 * Extract CVV only when OCR text explicitly labels it.
 * Covers: CVV, CVV2, CVC, CVC2, CID, Security Code, Sec Code,
 *         Card Verification Value / Number, CSC
 */
function extractCvv(raw: string): string | undefined {
  const re =
    /(?:^|[\s,;:\n])(?:CVV2?|CVC2?|CID|CSC|C\.?V\.?V\.?2?|C\.?V\.?C\.?2?|SECURITY\s*(?:CODE|NO\.?|NUMBER)|SEC(?:URITY)?\.?\s*CODE|CARD\s*VERIF(?:ICATION)?\s*(?:VALUE|NUMBER|CODE)?)\s*[:#.\-]?\s*(\d{3,4})(?=[\s,;$\n]|$)/im;
  const m = raw.match(re);
  if (!m) return undefined;
  const v = m[1];
  return (v.length === 3 || v.length === 4) ? v : undefined;
}

// ─────────────────────────────────────────────
// Cardholder Name Extraction
// ─────────────────────────────────────────────

// Common noise words found on cards (not name tokens)
const CARD_NOISE_WORDS = new Set([
  'VALID', 'THRU', 'THROUGH', 'EXPIRES', 'EXPIRY', 'GOOD', 'FROM', 'UNTIL',
  'MEMBER', 'SINCE', 'CREDIT', 'DEBIT', 'CARD', 'BANK', 'VISA', 'MASTERCARD',
  'AMEX', 'DISCOVER', 'RUPAY', 'MAESTRO', 'UNIONPAY', 'JCB', 'DINERS',
  'PLATINUM', 'GOLD', 'CLASSIC', 'SIGNATURE', 'INFINITE', 'WORLD', 'ELITE',
  'BUSINESS', 'CORPORATE', 'PREMIUM', 'REWARDS', 'CASH', 'BACK', 'TRAVEL',
  'INTERNATIONAL', 'GLOBAL', 'STANDARD', 'AUTHORIZED', 'USER', 'ACCOUNT',
  'THE', 'OF', 'AND', 'FOR', 'LTD', 'LLC', 'INC', 'PVT', 'LIMITED', 'BANK',
  'CVV', 'CVC', 'CVV2', 'CID', 'CSC', 'CODE', 'NUMBER', 'NO', 'SECURITY',
  'N/A', 'NA', 'NOT', 'APPLICABLE',
]);

/**
 * Extract cardholder name from OCR text.
 * Strategy:
 *  1. Look for explicit label "CARD HOLDER", "NAME", "Cardholder" etc.
 *  2. Look for ALL-CAPS name-like tokens (2–5 words, each 2–20 alpha chars)
 *     that appear near the expiry / card number lines but aren't noise words.
 */
function extractCardholderName(raw: string): string | undefined {
  // --- Pass 1: Labeled name ---
  const labeledRe =
    /(?:card\s*holder|cardholder|member\s*name|account\s*holder|name\s*on\s*card|name)\s*[:\-]?\s*([A-Z][A-Za-z\-'\.]{1,30}(?:\s+[A-Z][A-Za-z\-'\.]{1,30}){0,4})/im;
  const labeled = raw.match(labeledRe);
  if (labeled) {
    const candidate = labeled[1].trim().toUpperCase();
    if (isValidName(candidate)) return toTitleCase(candidate);
  }

  // --- Pass 2: Scan lines for ALL-CAPS name patterns ---
  // Cards typically print the name in ALL CAPS in 2–3 words
  const lines = raw.split(/\n/);
  const nameCandidates: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip lines that look like card numbers, dates, or CVV lines
    if (/\d{4}[\s\-]\d{4}[\s\-]\d{4}[\s\-]\d{4}/.test(trimmed)) continue;
    if (/\d{4}[\s\-]\d{6}[\s\-]\d{5}/.test(trimmed)) continue;
    if (/\b\d{12,19}\b/.test(trimmed)) continue;
    if (/(?:expir|valid|thru|cvv|cvc|cid|\bsecurity\b)/i.test(trimmed)) continue;
    if (/^\d+[\/\-]\d+$/.test(trimmed)) continue; // date-only line

    // Match ALL-CAPS tokens (2–5 words, alpha + hyphen/apostrophe)
    const allCapsRe = /^([A-Z][A-Z\-'\.]{1,24}(?:\s+[A-Z][A-Z\-'\.]{1,24}){1,4})$/;
    const capsMatch = trimmed.match(allCapsRe);
    if (capsMatch) {
      const candidate = capsMatch[1];
      if (isValidName(candidate)) {
        nameCandidates.push(candidate);
      }
    }

    // Also try: mixed-case full names like "John Smith" on personalised cards
    const mixedCaseRe = /\b([A-Z][a-z]{1,24}(?:\s+[A-Z][a-z]{1,24}){1,3})\b/;
    const mixedMatch = trimmed.match(mixedCaseRe);
    if (mixedMatch) {
      const candidate = mixedMatch[1].toUpperCase();
      if (isValidName(candidate)) {
        nameCandidates.push(candidate);
      }
    }
  }

  if (nameCandidates.length === 0) return undefined;

  // Prefer the candidate with 2 words (most common: FIRST LAST)
  const twoWord = nameCandidates.find(n => n.trim().split(/\s+/).length === 2);
  const chosen = twoWord ?? nameCandidates[0];
  return toTitleCase(chosen);
}

function isValidName(candidate: string): boolean {
  const tokens = candidate.trim().split(/\s+/);
  if (tokens.length < 2 || tokens.length > 5) return false;

  // Each token must be 2–24 alpha chars (allow hyphen/apostrophe)
  const validToken = (t: string) => /^[A-Z][A-Z\-'\.]{1,23}$/.test(t) && t.replace(/[^A-Z]/g, '').length >= 2;
  if (!tokens.every(validToken)) return false;

  // Must not be entirely noise words
  const nonNoise = tokens.filter(t => !CARD_NOISE_WORDS.has(t));
  return nonNoise.length >= 2;
}

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ─────────────────────────────────────────────
// Main Export
// ─────────────────────────────────────────────

export function parseCardFieldsFromOcrText(raw: string): ParsedCardOcr {
  const normalizedForPan = normalizePanOcr(raw);

  const panCandidates = collectPanCandidates(normalizedForPan);
  const rawDigits = pickBestPan(panCandidates);

  const cardNumber = rawDigits ? formatPan(rawDigits) : undefined;
  const brand = rawDigits ? detectCardBrand(rawDigits) : undefined;
  const expiry = extractExpiry(raw);
  const cvv = extractCvv(raw);
  const cardholderName = extractCardholderName(raw);

  return { cardNumber, expiry, cvv, cardholderName, brand };
}

// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────

/** Short title e.g. `Visa •••• 4242` when OCR fills the PAN. */
export function suggestCardTitleFromPan(pan: string): string {
  const d = pan.replace(/\D/g, '');
  if (d.length < 4) return 'Card';
  const last4 = d.slice(-4);
  const brand = detectCardBrand(pan);
  const brandName: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'Amex',
    discover: 'Discover',
    rupay: 'RuPay',
    maestro: 'Maestro',
    unionpay: 'UnionPay',
    diners: 'Diners Club',
    jcb: 'JCB',
  };
  return `${brandName[brand] ?? 'Card'} •••• ${last4}`;
}