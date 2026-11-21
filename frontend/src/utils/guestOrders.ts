const GUEST_TOKENS_KEY = 'eticket_guest_order_tokens';

function readTokenMap(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(GUEST_TOKENS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === 'object' && parsed !== null
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

export function saveGuestOrderToken(orderId: string, token: string): void {
  if (typeof window === 'undefined' || !orderId || !token) return;
  try {
    const map = readTokenMap();
    map[orderId] = token;
    window.localStorage.setItem(GUEST_TOKENS_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function getGuestOrderToken(orderId?: string): string | null {
  if (!orderId || typeof window === 'undefined') return null;
  const map = readTokenMap();
  return map[orderId] ?? null;
}
