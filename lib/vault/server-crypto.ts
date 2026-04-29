import crypto from 'crypto';

// Get the key from environment variables (must be 32 bytes / 64 hex characters)
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
  console.warn('WARNING: ENCRYPTION_KEY is missing or invalid in environment variables. Server-side encryption will fail.');
}

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits standard for GCM

export interface ServerEncryptedFields {
  encryptedPassword?: string | null;
  encryptedUsername?: string | null;
  encryptedContent?: string | null;
  encryptedPlainText?: string | null;
  encryptionIv: string;
}

export interface ServerDecryptedFields {
  password?: string | null;
  username?: string | null;
  content?: string | null;
  plainText?: string | null;
}

/**
 * Encrypts a string using AES-256-GCM.
 * Returns the hex-encoded ciphertext and auth tag combined (ciphertext + tag).
 */
export function encryptText(text: string, ivHex: string): string {
  if (!ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY is not defined');
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  
  // Append the auth tag to the end of the ciphertext
  return Buffer.concat([encrypted, tag]).toString('hex');
}

/**
 * Decrypts a string using AES-256-GCM.
 * The input text is expected to be the combined hex string of ciphertext + auth tag.
 */
export function decryptText(encryptedHex: string, ivHex: string): string {
  if (!ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY is not defined');
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedBuffer = Buffer.from(encryptedHex, 'hex');
  
  // The last 16 bytes are the auth tag
  const authTagLength = 16;
  const tag = encryptedBuffer.subarray(encryptedBuffer.length - authTagLength);
  const ciphertext = encryptedBuffer.subarray(0, encryptedBuffer.length - authTagLength);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Encrypts multiple item fields, generating a single unique IV.
 */
export function encryptItemFieldsServer(fields: ServerDecryptedFields): ServerEncryptedFields {
  const iv = crypto.randomBytes(IV_LENGTH);
  const ivHex = iv.toString('hex');
  
  const result: ServerEncryptedFields = {
    encryptionIv: ivHex,
    encryptedPassword: fields.password ? encryptText(fields.password, ivHex) : null,
    encryptedUsername: fields.username ? encryptText(fields.username, ivHex) : null,
    encryptedContent: fields.content ? encryptText(fields.content, ivHex) : null,
    encryptedPlainText: fields.plainText ? encryptText(fields.plainText, ivHex) : null,
  };
  
  return result;
}

/**
 * Decrypts multiple item fields using the provided IV.
 */
export function decryptItemFieldsServer(fields: ServerEncryptedFields): ServerDecryptedFields {
  const ivHex = fields.encryptionIv;
  if (!ivHex) throw new Error('Missing encryption IV');
  
  const result: ServerDecryptedFields = {
    password: fields.encryptedPassword ? decryptText(fields.encryptedPassword, ivHex) : null,
    username: fields.encryptedUsername ? decryptText(fields.encryptedUsername, ivHex) : null,
    content: fields.encryptedContent ? decryptText(fields.encryptedContent, ivHex) : null,
    plainText: fields.encryptedPlainText ? decryptText(fields.encryptedPlainText, ivHex) : null,
  };
  
  return result;
}
