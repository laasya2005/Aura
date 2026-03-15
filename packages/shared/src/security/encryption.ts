import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  scrypt as scryptCb,
} from "crypto";
import { promisify } from "util";

const scrypt = promisify(scryptCb);

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;

async function deriveKey(secret: string, salt: Buffer): Promise<Buffer> {
  return (await scrypt(secret, salt, KEY_LENGTH)) as Buffer;
}

function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 16) {
    throw new Error("ENCRYPTION_KEY must be set and at least 16 characters");
  }
  return key;
}

export async function encrypt(plaintext: string): Promise<string> {
  const secret = getEncryptionKey();
  const salt = randomBytes(SALT_LENGTH);
  const key = await deriveKey(secret, salt);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);

  const authTag = cipher.getAuthTag();

  // Format: salt:iv:authTag:encrypted (all base64)
  return [
    salt.toString("base64"),
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

export async function decrypt(ciphertext: string): Promise<string> {
  const secret = getEncryptionKey();
  const parts = ciphertext.split(":");

  if (parts.length !== 4) {
    throw new Error("Invalid ciphertext format");
  }

  const [saltB64, ivB64, authTagB64, encryptedB64] = parts as [string, string, string, string];

  const salt = Buffer.from(saltB64, "base64");
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const encrypted = Buffer.from(encryptedB64, "base64");

  const key = await deriveKey(secret, salt);

  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  return decrypted.toString("utf8");
}

export function hashForLookup(value: string): string {
  const pepper = process.env.ENCRYPTION_KEY ?? "";
  return createHmac("sha256", pepper).update(value).digest("hex");
}
