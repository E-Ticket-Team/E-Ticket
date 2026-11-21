import {
  generateTicketCode,
  hashCredential,
  parseTicketInput,
  signTicketCredential,
  verifySignedCredential,
} from './qr-credential.util';

describe('qr-credential.util', () => {
  const secret = 'test-qr-secret-12345';

  it('generates unique non-sequential ticket codes', () => {
    const codeA = generateTicketCode();
    const codeB = generateTicketCode();
    expect(codeA).toMatch(/^TKT-[A-F0-9]{6}-[A-F0-9]{6}$/);
    expect(codeA).not.toBe(codeB);
  });

  it('signs, hashes, parses, and verifies QR credentials safely', () => {
    const ticketId = 'e0000000-0000-0000-0000-000000000001';
    const ticketCode = 'TKT-AABBCC-112233';
    const token = signTicketCredential(ticketId, ticketCode, secret);
    const hash = hashCredential(token);

    expect(token.startsWith('ETK1.')).toBe(true);
    const parsed = parseTicketInput(token);
    expect(parsed.isSignedToken).toBe(true);
    expect(parsed.ticketCode).toBe(ticketCode);

    expect(
      verifySignedCredential(token, ticketId, ticketCode, hash, secret),
    ).toBe(true);
    expect(
      verifySignedCredential(
        `${token}tampered`,
        ticketId,
        ticketCode,
        hash,
        secret,
      ),
    ).toBe(false);
    expect(
      verifySignedCredential(token, ticketId, ticketCode, hash, 'wrong-secret'),
    ).toBe(false);
  });

  it('parses raw ticket codes for manual gate lookup', () => {
    const parsed = parseTicketInput('  TKT-2026-VIP-001  ');
    expect(parsed.isSignedToken).toBe(false);
    expect(parsed.ticketCode).toBe('TKT-2026-VIP-001');
  });
});
