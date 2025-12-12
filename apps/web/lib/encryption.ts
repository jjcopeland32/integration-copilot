import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Get the encryption key from environment variable or derive from AUTH_SECRET.
 * The key must be 32 bytes (256 bits) for AES-256.
 */
function getEncryptionKey(): Buffer {
  const keyEnv = process.env.CREDENTIALS_ENCRYPTION_KEY;
  
  if (keyEnv) {
    // If key is provided as hex, decode it
    if (keyEnv.length === 64) {
      return Buffer.from(keyEnv, 'hex');
    }
    // Otherwise, hash it to get exactly 32 bytes
    return crypto.createHash('sha256').update(keyEnv).digest();
  }
  
  // Fallback to AUTH_SECRET
  const authSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!authSecret) {
    throw new Error(
      'No encryption key available. Set CREDENTIALS_ENCRYPTION_KEY or AUTH_SECRET environment variable.'
    );
  }
  
  // Derive a 32-byte key from AUTH_SECRET using SHA-256
  return crypto.createHash('sha256').update(authSecret).digest();
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a base64-encoded string containing: IV + AuthTag + Ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  
  const authTag = cipher.getAuthTag();
  
  // Combine IV + AuthTag + Encrypted data
  const combined = Buffer.concat([iv, authTag, encrypted]);
  
  return combined.toString('base64');
}

/**
 * Decrypt a ciphertext string that was encrypted with encrypt().
 * Expects a base64-encoded string containing: IV + AuthTag + Ciphertext
 */
export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(ciphertext, 'base64');
  
  if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Invalid ciphertext: too short');
  }
  
  // Extract IV, AuthTag, and encrypted data
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  
  return decrypted.toString('utf8');
}

/**
 * Encrypt credentials object for storage.
 * Handles null/undefined gracefully.
 */
export function encryptCredentials(credentials: Record<string, unknown> | null | undefined): string | null {
  if (!credentials || Object.keys(credentials).length === 0) {
    return null;
  }
  return encrypt(JSON.stringify(credentials));
}

/**
 * Decrypt credentials from storage.
 * Returns null if input is null/undefined or decryption fails.
 */
export function decryptCredentials(encryptedCredentials: string | null | undefined): Record<string, unknown> | null {
  if (!encryptedCredentials) {
    return null;
  }
  try {
    const decrypted = decrypt(encryptedCredentials);
    return JSON.parse(decrypted) as Record<string, unknown>;
  } catch {
    // If decryption fails, return null rather than throwing
    console.error('Failed to decrypt credentials');
    return null;
  }
}

/**
 * Check if a value appears to be encrypted (base64-encoded with proper length).
 */
export function isEncrypted(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  try {
    const decoded = Buffer.from(value, 'base64');
    // Minimum length: IV + AuthTag + at least 1 byte of data
    return decoded.length >= IV_LENGTH + AUTH_TAG_LENGTH + 1;
  } catch {
    return false;
  }
}



