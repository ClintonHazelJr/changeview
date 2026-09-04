/** Encrypt/decrypt integration tokens via DB helpers + INTEGRATION_TOKEN_ENCRYPTION_KEY. */

export function integrationEncryptionKey() {
  const key = process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY;
  if (!key || String(key).length < 16) {
    throw new Error('INTEGRATION_TOKEN_ENCRYPTION_KEY is not configured (min 16 chars)');
  }
  return String(key);
}

export async function encryptIntegrationToken(admin, plaintext) {
  if (!plaintext) return null;
  const { data, error } = await admin.rpc('encrypt_integration_token', {
    p_plaintext: String(plaintext),
    p_key: integrationEncryptionKey(),
  });
  if (error) throw new Error(error.message || 'Token encrypt failed');
  return data;
}

export async function decryptIntegrationToken(admin, ciphertext) {
  if (!ciphertext) return null;
  const { data, error } = await admin.rpc('decrypt_integration_token', {
    p_ciphertext: String(ciphertext),
    p_key: integrationEncryptionKey(),
  });
  if (error) throw new Error(error.message || 'Token decrypt failed');
  return data;
}
