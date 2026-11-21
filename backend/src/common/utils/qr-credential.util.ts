import * as crypto from 'crypto';

export const QR_TOKEN_PREFIX = 'ETK1';

/**
 * Generates a high-entropy, non-sequential ticket code safe for display and manual entry.
 */
export function generateTicketCode(): string {
  const partA = crypto.randomBytes(3).toString('hex').toUpperCase();
  const partB = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `TKT-${partA}-${partB}`;
}

/**
 * Computes an HMAC-SHA256 signed opaque QR credential without embedding personal data.
 */
export function signTicketCredential(
  ticketId: string,
  ticketCode: string,
  secret: string,
): string {
  const sig = crypto
    .createHmac('sha256', secret)
    .update(`${ticketId}:${ticketCode}`)
    .digest('base64url')
    .slice(0, 22);
  return `${QR_TOKEN_PREFIX}.${ticketCode}.${sig}`;
}

/**
 * Computes the SHA-256 hex digest stored in PostgreSQL instead of the raw QR bearer token.
 */
export function hashCredential(credential: string): string {
  return crypto.createHash('sha256').update(credential).digest('hex');
}

export interface ParsedCredential {
  ticketCode: string;
  rawCredential?: string;
  isSignedToken: boolean;
}

/**
 * Parses either a signed QR payload ("ETK1.<ticketCode>.<sig>") or a raw ticket code.
 */
export function parseTicketInput(rawInput: string): ParsedCredential {
  const trimmed = rawInput.trim();
  if (trimmed.startsWith(`${QR_TOKEN_PREFIX}.`)) {
    const parts = trimmed.split('.');
    if (parts.length !== 3 || !parts[1] || !parts[2]) {
      return { ticketCode: trimmed, rawCredential: trimmed, isSignedToken: true };
    }
    return {
      ticketCode: parts[1],
      rawCredential: trimmed,
      isSignedToken: true,
    };
  }
  return { ticketCode: trimmed, isSignedToken: false };
}

/**
 * Timing-safe verification of a signed QR credential against stored hash and HMAC secret.
 */
export function verifySignedCredential(
  rawCredential: string,
  ticketId: string,
  ticketCode: string,
  storedHash: string | null | undefined,
  secret: string,
): boolean {
  if (!storedHash) {
    return false;
  }
  const expectedToken = signTicketCredential(ticketId, ticketCode, secret);
  const expectedHash = hashCredential(expectedToken);
  const providedHash = hashCredential(rawCredential);

  const a = Buffer.from(providedHash, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  const c = Buffer.from(expectedHash, 'hex');

  if (a.length !== b.length || a.length !== c.length) {
    return false;
  }

  return crypto.timingSafeEqual(a, b) && crypto.timingSafeEqual(a, c);
}
