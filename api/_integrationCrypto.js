/**
 * Application-layer token encryption (AES-256-GCM via Node crypto).
 * Ciphertext is stored as text on integrations.*; the key never touches the DB.
 *
 * Format: `v1:` + base64( iv[12] || authTag[16] || ciphertext )
 * Key: SHA-256(INTEGRATION_TOKEN_ENCRYPTION_KEY) → 32-byte AES key.
 */
import crypto from 'crypto';

const PREFIX = 'v1:';

export function integrationEncryptionKey() {
  const key = process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY;
  if (!key || String(key).length < 16) {
    throw new Error('INTEGRATION_TOKEN_ENCRYPTION_KEY is not configured (min 16 chars)');
  }
  return String(key);
}

function aesKey() {
  return crypto.createHash('sha256').update(integrationEncryptionKey(), 'utf8').digest();
}

/** @returns {string|null} encrypted payload for a text column */
export function encryptIntegrationToken(plaintext) {
  if (plaintext == null || plaintext === '') return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', aesKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(String(plaintext), 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${Buffer.concat([iv, tag, encrypted]).toString('base64')}`;
}

/** @returns {string|null} plaintext */
export function decryptIntegrationToken(ciphertext) {
  if (ciphertext == null || ciphertext === '') return null;
  const raw = String(ciphertext);
  if (!raw.startsWith(PREFIX)) {
    throw new Error('Unsupported token ciphertext format (expected v1: AES-256-GCM)');
  }
  const buf = Buffer.from(raw.slice(PREFIX.length), 'base64');
  if (buf.length < 12 + 16 + 1) {
    throw new Error('Token ciphertext truncated');
  }
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}
