/**
 * Run OCR in the browser only (image data URL never sent to CredsHub API for recognition).
 */
import { parseCardFieldsFromOcrText, type ParsedCardOcr } from '@/lib/card-ocr-parse';

export async function recognizeCardImage(dataUrl: string): Promise<{ text: string; parsed: ParsedCardOcr }> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng');
  try {
    const {
      data: { text },
    } = await worker.recognize(dataUrl);
    const parsed = parseCardFieldsFromOcrText(text);
    return { text, parsed };
  } finally {
    await worker.terminate();
  }
}
