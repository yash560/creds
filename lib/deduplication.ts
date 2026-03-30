/**
 * Client-side deduplication utilities
 * Generates dedupeKeys matching server implementation for consistency
 */

// Generate SHA256-like hash in browser (using simple approach)
async function hashContent(content: string): Promise<string> {
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
        const encoder = new TextEncoder();
        const data = encoder.encode(content);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex.slice(0, 16); // Match server's slice(0, 16)
    }
    // Fallback: simple hash for older browsers
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
}

export async function generateFileDedupeKey(fileData: string, type: string): Promise<string> {
    // For file-based items (documents, scans), hash the file data
    const hash = await hashContent(fileData);
    return `file_${type}_${hash}`;
}

export async function generatePasswordDedupeKey(url: string, username: string): Promise<string> {
    const content = `${url}|${username}`;
    const hash = await hashContent(content);
    return `pass_${hash}`;
}

export async function generateCardDedupeKey(cardNumber: string): Promise<string> {
    const hash = await hashContent(cardNumber);
    return `card_${hash}`;
}

export async function generateItemDedupeKey(title: string, type: string, fields: Record<string, string>): Promise<string> {
    const fieldStr = Object.entries(fields)
        .map(([k, v]) => `${k}=${v}`)
        .join('&');
    const content = `${title}|${fieldStr}`;
    const hash = await hashContent(content);
    return `item_${type}_${hash}`;
}
