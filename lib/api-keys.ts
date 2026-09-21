import { randomBytes, createHash } from "crypto";

const API_KEY_PREFIX = "pactum_";
const KEY_LENGTH = 40; // 40 hex chars = 20 bytes of entropy

/**
 * Generate a new API key with the format: pactum_<40 hex chars>
 * Returns the full key — this is the only time it's available in plaintext.
 */
export function generateApiKey(): string {
  const bytes = randomBytes(KEY_LENGTH / 2);
  return `${API_KEY_PREFIX}${bytes.toString("hex")}`;
}

/**
 * Hash an API key using SHA-256 for storage.
 * We use SHA-256 instead of bcrypt because API keys need fast lookup
 * on every request, and the key itself has enough entropy (160 bits).
 */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/**
 * Extract the display prefix from a full API key.
 * e.g. "pactum_a1b2c3d4e5..." → "pactum_a1b2c3d4"
 */
export function getKeyPrefix(key: string): string {
  return key.substring(0, API_KEY_PREFIX.length + 8);
}

/**
 * Validate the format of an API key.
 */
export function isValidKeyFormat(key: string): boolean {
  return /^pactum_[a-f0-9]{40}$/.test(key);
}
