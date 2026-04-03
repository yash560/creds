/**
 * Free card recognition — Canvas preprocessing + Tesseract.js (runs entirely in browser).
 * No API keys. No cost. No image ever leaves the device.
 *
 * Why raw Tesseract failed:
 *  - Metallic / gradient backgrounds confuse the OCR engine
 *  - Embossed fonts have low contrast against the card surface
 *  - Mixed content (name, number, date, logos) in one pass produces noise
 *
 * Fix: preprocess with Canvas (grayscale → contrast → sharpen → threshold),
 * then run TWO targeted Tesseract passes with the right PSM for each field type.
 */

import { parseCardFieldsFromOcrText, type ParsedCardOcr } from '@/lib/card-ocr-parse';

// ─────────────────────────────────────────────────────────────────────────────
// Image preprocessing via Canvas API
// ─────────────────────────────────────────────────────────────────────────────

interface PreprocessOptions {
  /** Scale factor before OCR — bigger = more detail for Tesseract (default 2.5) */
  scale?: number;
  /** Boost contrast before thresholding (default true) */
  contrast?: boolean;
}

/**
 * Draw the source image onto an off-screen canvas, apply:
 *   1. Upscale   (Tesseract likes ≥300 DPI equivalent)
 *   2. Grayscale
 *   3. Contrast stretch (auto levels)
 *   4. Unsharp mask (sharpen edges)
 *   5. Binarise  (Otsu's adaptive threshold)
 *
 * Returns a data URL of the cleaned image.
 */
async function preprocessImage(
  dataUrl: string,
  opts: PreprocessOptions = {}
): Promise<string> {
  const { scale = 2.5, contrast = true } = opts;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const w = Math.round(img.naturalWidth * scale);
      const h = Math.round(img.naturalHeight * scale);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;

      // Step 1 — draw upscaled
      ctx.drawImage(img, 0, 0, w, h);
      let imageData = ctx.getImageData(0, 0, w, h);
      let data = imageData.data;

      // Step 2 — grayscale
      for (let i = 0; i < data.length; i += 4) {
        const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        data[i] = data[i + 1] = data[i + 2] = gray;
      }

      // Step 3 — auto contrast (stretch histogram to 0–255)
      if (contrast) {
        let lo = 255, hi = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i] < lo) lo = data[i];
          if (data[i] > hi) hi = data[i];
        }
        const range = hi - lo || 1;
        for (let i = 0; i < data.length; i += 4) {
          const v = Math.round(((data[i] - lo) / range) * 255);
          data[i] = data[i + 1] = data[i + 2] = v;
        }
      }

      // Step 4 — sharpen (3×3 Laplacian unsharp kernel)
      ctx.putImageData(imageData, 0, 0);
      const sharpened = ctx.createImageData(w, h);
      const src = imageData.data;
      const dst = sharpened.data;
      const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = (y * w + x) * 4;
          let sum = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              sum += src[((y + ky) * w + (x + kx)) * 4] * kernel[(ky + 1) * 3 + (kx + 1)];
            }
          }
          const v = Math.max(0, Math.min(255, sum));
          dst[idx] = dst[idx + 1] = dst[idx + 2] = v;
          dst[idx + 3] = 255;
        }
      }
      // Copy border pixels unchanged
      for (let x = 0; x < w; x++) {
        const t = x * 4, b = ((h - 1) * w + x) * 4;
        for (let c = 0; c < 4; c++) { dst[t + c] = src[t + c]; dst[b + c] = src[b + c]; }
      }
      for (let y = 0; y < h; y++) {
        const l = y * w * 4, r = (y * w + w - 1) * 4;
        for (let c = 0; c < 4; c++) { dst[l + c] = src[l + c]; dst[r + c] = src[r + c]; }
      }
      imageData = sharpened;
      data = imageData.data;

      // Step 5 — Otsu's method: find optimal global threshold, then binarise
      const hist = new Array(256).fill(0);
      for (let i = 0; i < data.length; i += 4) hist[data[i]]++;
      const total = w * h;
      let sumAll = 0;
      for (let i = 0; i < 256; i++) sumAll += i * hist[i];
      let sumB = 0, wB = 0, bestBetween = 0, threshold = 128;
      for (let t = 0; t < 256; t++) {
        wB += hist[t];
        if (!wB) continue;
        const wF = total - wB;
        if (!wF) break;
        sumB += t * hist[t];
        const mB = sumB / wB;
        const mF = (sumAll - sumB) / wF;
        const between = wB * wF * (mB - mF) ** 2;
        if (between > bestBetween) { bestBetween = between; threshold = t; }
      }
      for (let i = 0; i < data.length; i += 4) {
        const v = data[i] > threshold ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = v;
        data[i + 3] = 255;
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Tesseract passes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PSM modes used:
 *   6  = single uniform block of text  → full-card layout
 *   11 = sparse text                   → card face with logos / non-text regions
 */
type PSM = '6' | '11';

async function runTesseractPass(imageUrl: string, psm: PSM, whitelist?: string): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng');
  try {
    await worker.setParameters({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tessedit_pageseg_mode: psm as any,
      ...(whitelist ? { tessedit_char_whitelist: whitelist } : {}),
    });
    const { data: { text } } = await worker.recognize(imageUrl);
    return text.trim();
  } finally {
    await worker.terminate();
  }
}

/**
 * Two passes run in parallel on the same preprocessed image:
 *
 *  Pass A — digits + separators only (PSM 6)
 *    Extracts card number and expiry with minimal noise.
 *    Whitelist keeps Tesseract focused; it won't confuse 'S' with '5' on a clean binary image.
 *
 *  Pass B — full character set (PSM 11)
 *    Extracts cardholder name, bank name, and any labeled fields (CVV, VALID THRU…).
 *    PSM 11 (sparse text) handles the mixed layout of logos + text blocks well.
 *
 * Both outputs are concatenated so the regex parser sees everything in one shot.
 */
async function multiPassOcr(preprocessedUrl: string): Promise<string> {
  const DIGIT_WHITELIST = '0123456789 -/.';

  const [passA, passB] = await Promise.all([
    runTesseractPass(preprocessedUrl, '6', DIGIT_WHITELIST),
    runTesseractPass(preprocessedUrl, '11'),
  ]);

  return `${passA}\n---\n${passB}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API — drop-in replacement for the Claude Vision version
// ─────────────────────────────────────────────────────────────────────────────

export interface RecognizeResult {
  /** Merged OCR text from both passes — useful for debug logging */
  text: string;
  parsed: ParsedCardOcr;
  /**
   * The binarised image used for OCR.
   * Render this in your UI during development to verify preprocessing quality.
   * Example: <img src={result.preprocessedUrl} style={{ filter: 'invert(1)' }} />
   */
  preprocessedUrl: string;
}

export async function recognizeCardImage(dataUrl: string): Promise<RecognizeResult> {
  // 1. Preprocess: upscale → grayscale → auto-contrast → sharpen → Otsu binarise
  const preprocessedUrl = await preprocessImage(dataUrl, {
    scale: 2.5,
    contrast: true,
  });

  // 2. Two parallel Tesseract passes with different configs
  const text = await multiPassOcr(preprocessedUrl);

  // 3. Regex parser extracts structured fields from merged OCR text
  const parsed = parseCardFieldsFromOcrText(text);

  return { text, parsed, preprocessedUrl };
}