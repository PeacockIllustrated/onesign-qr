/** Invite link validity window — 7 days from creation. */
export const INVITE_EXPIRY_SECONDS = 60 * 60 * 24 * 7;

/**
 * 256-bit random token encoded as URL-safe base64 (no padding).
 * Safe in both Node and Edge runtimes.
 */
export function generateInviteToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  // Convert to base64 then to base64url (-, _ instead of +, /, no padding).
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 =
    typeof btoa !== 'undefined'
      ? btoa(binary)
      : Buffer.from(binary, 'binary').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
