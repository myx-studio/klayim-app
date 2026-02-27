import * as crypto from "crypto";

// Constants for AES-256-GCM encryption
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits for GCM (recommended)
const SALT_LENGTH = 32; // 256 bits
const KEY_LENGTH = 32; // 256 bits for AES-256
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Structure for encrypted data with all components needed for decryption
 */
export interface EncryptedData {
  ciphertext: string; // Base64 encoded
  iv: string; // Base64 encoded
  authTag: string; // Base64 encoded (GCM authentication tag)
  salt: string; // Base64 encoded (for key derivation)
  keyVersion: number; // For future key rotation support
}

/**
 * Get current encryption key version from environment
 * Supports key rotation by incrementing version when rotating keys
 */
export function getCurrentKeyVersion(): number {
  const version = process.env.ENCRYPTION_KEY_VERSION;
  return version ? parseInt(version, 10) : 1;
}

/**
 * Derive a 256-bit encryption key from master key and salt using scrypt
 * scrypt is memory-hard making it resistant to GPU/ASIC attacks
 */
async function deriveKey(masterKey: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(masterKey, salt, KEY_LENGTH, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

/**
 * Encrypt plaintext using AES-256-GCM with scrypt key derivation
 *
 * Security features:
 * - Fresh random IV for each encryption (never reused)
 * - Fresh random salt for key derivation
 * - GCM provides authenticated encryption (integrity + confidentiality)
 * - scrypt key derivation is memory-hard
 *
 * @param plaintext - The string to encrypt
 * @param masterKey - The master encryption key (from environment)
 * @returns Promise<EncryptedData> - All components needed for decryption
 */
export async function encrypt(
  plaintext: string,
  masterKey: string
): Promise<EncryptedData> {
  // Generate fresh IV and salt (never reuse)
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);

  // Derive encryption key from master key + salt
  const key = await deriveKey(masterKey, salt);

  // Create cipher with AES-256-GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  // Encrypt the plaintext
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  // Get authentication tag (GCM provides this)
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: authTag.toString("base64"),
    salt: salt.toString("base64"),
    keyVersion: getCurrentKeyVersion(),
  };
}

/**
 * Decrypt ciphertext using AES-256-GCM with scrypt key derivation
 *
 * @param data - The EncryptedData object from encrypt()
 * @param masterKey - The master encryption key (must match the one used for encryption)
 * @returns Promise<string> - The original plaintext
 * @throws Error if decryption fails (wrong key, tampered data, etc.)
 */
export async function decrypt(
  data: EncryptedData,
  masterKey: string
): Promise<string> {
  // Decode all components from base64
  const iv = Buffer.from(data.iv, "base64");
  const salt = Buffer.from(data.salt, "base64");
  const authTag = Buffer.from(data.authTag, "base64");
  const ciphertext = Buffer.from(data.ciphertext, "base64");

  // Derive the same key using the same salt
  const key = await deriveKey(masterKey, salt);

  // Create decipher with AES-256-GCM
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  // Set the authentication tag for verification
  decipher.setAuthTag(authTag);

  // Decrypt and return plaintext
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
