/**
 * Canonical 8-4-4-4-12 PostgreSQL UUID format (covers RFC-4122 and deterministic seeded UUIDs).
 */
export const CANONICAL_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
