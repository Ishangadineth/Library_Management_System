import CryptoJS from 'crypto-js';

// Fallback key purely for development if env is not set. 
// In production, MUST rely on process.env.NEXT_PUBLIC_ENCRYPTION_KEY
const SECRET_KEY = (process.env as any).NEXT_PUBLIC_ENCRYPTION_KEY || 'default_secret_key_123!';

/**
 * Encrypts a plain text string.
 * @param text The plain text to encrypt
 * @returns Encrypted base64 encoded string, or empty string if input is falsy.
 */
export const encryptData = (text: string | null | undefined): string => {
  if (!text) return '';
  try {
    return CryptoJS.AES.encrypt(text, SECRET_KEY).toString();
  } catch (err) {
    console.error('Encryption failed:', err);
    return '';
  }
};

/**
 * Decrypts an encrypted string back to plain text.
 * @param cipherText The encrypted base64 string
 * @returns Plain text string, or empty string if input is falsy or decryption fails.
 */
export const decryptData = (cipherText: string | null | undefined): string => {
  if (!cipherText) return '';
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    // If decryption yields empty string, it might be an unencrypted legacy string
    // Let's just return it as is if it fails decoding.
    if (!decrypted && cipherText.length > 0) {
      return cipherText;
    }
    return decrypted;
  } catch (err) {
    console.warn('Decryption failed, assuming plain text fallback:', err);
    return cipherText || '';
  }
};
