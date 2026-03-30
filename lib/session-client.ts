/**
 * Client-side session persistence using localStorage
 * Stores encrypted sessionKey with timestamp for 5-minute quick-access sessions
 */

const SESSION_KEY = 'vault_session_temp';
const SESSION_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

interface SessionData {
    sessionKey: string;
    timestamp: number;
    userId: string;
}

/**
 * Save session to localStorage
 */
export function saveSessionLocally(sessionKey: string, userId: string): void {
    try {
        const data: SessionData = {
            sessionKey,
            userId,
            timestamp: Date.now(),
        };
        // Simple obfuscation - not cryptographically secure but prevents casual inspection
        const encoded = btoa(JSON.stringify(data));
        localStorage.setItem(SESSION_KEY, encoded);
    } catch (error) {
        console.error('Failed to save session:', error);
    }
}

/**
 * Get session from localStorage if still valid (< 5 mins old)
 */
export function getSessionLocally(): SessionData | null {
    try {
        const encoded = localStorage.getItem(SESSION_KEY);
        if (!encoded) return null;

        const decoded = JSON.parse(atob(encoded)) as SessionData;
        const age = Date.now() - decoded.timestamp;

        // Session expired
        if (age > SESSION_TTL) {
            clearSessionLocally();
            return null;
        }

        return decoded;
    } catch (error) {
        console.error('Failed to retrieve session:', error);
        clearSessionLocally();
        return null;
    }
}

/**
 * Clear session from localStorage
 */
export function clearSessionLocally(): void {
    try {
        localStorage.removeItem(SESSION_KEY);
    } catch (error) {
        console.error('Failed to clear session:', error);
    }
}

/**
 * Check if valid session exists
 */
export function hasValidSession(): boolean {
    return getSessionLocally() !== null;
}

/**
 * Get remaining session time in milliseconds
 */
export function getSessionTimeRemaining(): number {
    const session = getSessionLocally();
    if (!session) return 0;
    const remaining = SESSION_TTL - (Date.now() - session.timestamp);
    return Math.max(0, remaining);
}
