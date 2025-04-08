import * as crypto from 'crypto';

const ENC_ALGO = 'aes-256-cbc';
const RAW_KEY = process.env.BIOMETRIC_ENCRYPTION_KEY || '';
const HMAC_SECRET = process.env.BIOMETRIC_HMAC_SECRET || '';
const IV_LENGTH = 16;

// Ensure the key is 32 bytes (256 bits) long
const ENC_KEY = Buffer.from(RAW_KEY.padEnd(32, '0')).subarray(0, 32);

export function encrypt(text: string): string {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ENC_ALGO, ENC_KEY, iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

export function decrypt(encrypted: string): string {
  try {
    const [ivHex, encryptedHex] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv(ENC_ALGO, ENC_KEY, iv);
    const decrypted = Buffer.concat([
      decipher.update(encryptedText),
      decipher.final(),
    ]);
    return decrypted.toString();
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

export function hmacFingerprint(text: string): string {
  return crypto.createHmac('sha256', HMAC_SECRET).update(text).digest('hex');
}
