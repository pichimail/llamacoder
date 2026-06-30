import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const KEY_LEN = 32;

function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "dev-encryption-secret-do-not-use-in-prod";
  if (process.env.NODE_ENV === "production" && (!process.env.ENCRYPTION_SECRET && !process.env.AUTH_SECRET)) {
    throw new Error("ENCRYPTION_SECRET or AUTH_SECRET required in production for env encryption");
  }
  // Derive 32 byte key
  return scryptSync(secret, "llamacoder-env-salt", KEY_LEN);
}

export function encryptEnvValue(plain: string): string {
  if (!plain) return "";
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // format: base64(iv):base64(tag):base64(ciphertext)
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

export function decryptEnvValue(ciphertext: string): string {
  if (!ciphertext) return "";
  // If not encrypted format (legacy plaintext), return as-is
  if (!ciphertext.includes(":") || ciphertext.split(":").length !== 3) {
    return ciphertext;
  }
  try {
    const [ivB64, tagB64, dataB64] = ciphertext.split(":");
    const key = getEncryptionKey();
    const iv = Buffer.from(ivB64, "base64");
    const tag = Buffer.from(tagB64, "base64");
    const data = Buffer.from(dataB64, "base64");
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return dec.toString("utf8");
  } catch {
    // On failure, treat as legacy plaintext (back compat)
    return ciphertext;
  }
}

export function maskEnvValue(value: string): string {
  if (!value) return "";
  if (value.length <= 4) return "••••";
  return "••••" + value.slice(-4);
}
