/** AES-256-GCM encryption for BYOK API keys (Phase 2). Requires ENCRYPTION_SECRET. */
import crypto from "crypto";

function deriveKey(secret: string): Buffer {
  return crypto.createHash("sha256").update(secret).digest();
}

function requireSecret(secret?: string): string {
  const value = secret ?? process.env.ENCRYPTION_SECRET;
  if (!value) throw new Error("ENCRYPTION_SECRET is not set — BYOK key storage requires it.");
  return value;
}

export function encrypt(plaintext: string, secret?: string): { encrypted: string; iv: string } {
  const key = deriveKey(requireSecret(secret));
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    encrypted: Buffer.concat([ciphertext, tag]).toString("base64"),
    iv: iv.toString("base64"),
  };
}

export function decrypt(encrypted: string, iv: string, secret?: string): string {
  const key = deriveKey(requireSecret(secret));
  const raw = Buffer.from(encrypted, "base64");
  const ciphertext = raw.subarray(0, raw.length - 16);
  const tag = raw.subarray(raw.length - 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function maskKey(key: string): string {
  if (key.length <= 8) return "••••";
  return `${key.slice(0, 3)}...${key.slice(-4)}`;
}
