export const AUTH_COOKIE_NAME = 'eticket_access_token';

/**
 * Converts JWT expiry string (e.g. "7d", "12h", "30m") into milliseconds for cookie maxAge.
 */
export function parseDurationMs(expiresIn: string): number {
  const match = /^(\d+)([smhd])$/i.exec(expiresIn.trim());
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * (multipliers[unit] ?? 86400000);
}
