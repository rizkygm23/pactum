import { parseUnits } from "viem";

/**
 * Exact money math for metered usage events.
 *
 * Prices arrive as JSON numbers; float arithmetic (0.1 + 0.2 …) would drift
 * against the 6-decimal USDC ledger. All cost math here is bigint on a
 * 12-decimal fixed-point basis, then floored to the ledger's 6 decimals so a
 * charge can never exceed what balance math expects.
 */

export const PRICE_DECIMALS = 12;
export const LEDGER_DECIMALS = 6;

export const MODEL_MAX_LENGTH = 200;
export const IDEMPOTENCY_MAX_LENGTH = 200;
export const METADATA_MAX_BYTES = 8192;
export const TOKENS_MAX = 1_000_000_000_000; // 1e12 tokens per event is beyond any real call
export const PRICE_MAX = 1_000_000; // per-token price sanity ceiling (USDC)
export const COST_MAX = 1_000_000_000; // per-event cost ceiling (USDC) — fits numeric(18,6)

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const INTEGER_RE = /^(0|[1-9][0-9]*)$/;

type Checked<T> = { value: T } | { error: string };

export interface UsageEventInput {
  model: unknown;
  prompt_tokens?: unknown;
  completion_tokens?: unknown;
  prompt_price_per_token?: unknown;
  completion_price_per_token?: unknown;
  user_address: unknown;
  idempotency_key: unknown;
  metadata?: unknown;
}

export interface NormalizedUsageEvent {
  model: string;
  idempotencyKey: string;
  /** lowercased — the canonical storage form for addresses */
  userAddress: string;
  promptTokens: number;
  completionTokens: number;
  promptPrice: number;
  completionPrice: number;
  /** exact 6-decimal string for the numeric(18,6) column */
  costString: string;
  /** same value as a JS number, for API responses and display */
  costNumber: number;
}

export type ValidationResult = { ok: true; value: NormalizedUsageEvent } | { ok: false; error: string };

function parsePrice(value: unknown, field: string): Checked<bigint> {
  const raw = value === undefined || value === null ? 0 : value;
  const num = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isFinite(num)) return { error: `${field} must be a finite number` };
  if (num < 0) return { error: `${field} must not be negative` };
  if (num >= PRICE_MAX) return { error: `${field} must be below ${PRICE_MAX}` };
  // toFixed normalizes exponent notation ("1e-7") that parseUnits rejects
  return { value: parseUnits(num.toFixed(PRICE_DECIMALS), PRICE_DECIMALS) };
}

function parseTokens(value: unknown, field: string): Checked<number> {
  const raw = value === undefined || value === null ? 0 : value;
  if (typeof raw === "string" && INTEGER_RE.test(raw)) {
    const n = Number(raw);
    return n <= TOKENS_MAX ? { value: n } : { error: `${field} exceeds the maximum of ${TOKENS_MAX}` };
  }
  if (typeof raw !== "number" || !Number.isInteger(raw)) {
    return { error: `${field} must be a non-negative integer` };
  }
  if (raw < 0) return { error: `${field} must not be negative` };
  if (raw > TOKENS_MAX) return { error: `${field} exceeds the maximum of ${TOKENS_MAX}` };
  return { value: raw };
}

/** Floor a 12-decimal bigint amount to an exact 6-decimal ledger string. */
export function toLedgerString(costUnits12: bigint): string {
  const scale = 10n ** BigInt(PRICE_DECIMALS);
  const whole = costUnits12 / scale;
  const frac6 = (costUnits12 % scale) / 10n ** BigInt(PRICE_DECIMALS - LEDGER_DECIMALS);
  return `${whole}.${frac6.toString().padStart(LEDGER_DECIMALS, "0")}`;
}

/**
 * Validate and normalize a /usage/track payload. Rejects anything that could
 * poison the ledger: negative or fractional tokens, overpriced calls,
 * oversized strings, malformed addresses, or metadata beyond 8 KB.
 * On success, cost is computed in exact integer arithmetic.
 */
export function validateUsageEvent(body: UsageEventInput): ValidationResult {
  if (typeof body.model !== "string" || body.model.length === 0) {
    return { ok: false, error: "model must be a non-empty string" };
  }
  if (body.model.length > MODEL_MAX_LENGTH) {
    return { ok: false, error: `model must be at most ${MODEL_MAX_LENGTH} characters` };
  }
  if (typeof body.idempotency_key !== "string" || body.idempotency_key.length === 0) {
    return { ok: false, error: "idempotency_key must be a non-empty string" };
  }
  if (body.idempotency_key.length > IDEMPOTENCY_MAX_LENGTH) {
    return { ok: false, error: `idempotency_key must be at most ${IDEMPOTENCY_MAX_LENGTH} characters` };
  }
  if (typeof body.user_address !== "string" || !ADDRESS_RE.test(body.user_address)) {
    return { ok: false, error: "Invalid user_address format" };
  }

  const promptTokens = parseTokens(body.prompt_tokens, "prompt_tokens");
  if ("error" in promptTokens) return { ok: false, error: promptTokens.error };
  const completionTokens = parseTokens(body.completion_tokens, "completion_tokens");
  if ("error" in completionTokens) return { ok: false, error: completionTokens.error };

  const promptUnits = parsePrice(body.prompt_price_per_token, "prompt_price_per_token");
  if ("error" in promptUnits) return { ok: false, error: promptUnits.error };
  const completionUnits = parsePrice(body.completion_price_per_token, "completion_price_per_token");
  if ("error" in completionUnits) return { ok: false, error: completionUnits.error };

  if (body.metadata !== undefined && body.metadata !== null) {
    if (typeof body.metadata !== "object") {
      return { ok: false, error: "metadata must be an object" };
    }
    const size = JSON.stringify(body.metadata)?.length ?? 0;
    if (size > METADATA_MAX_BYTES) {
      return { ok: false, error: `metadata must serialize to at most ${METADATA_MAX_BYTES} bytes` };
    }
  }

  const costUnits12 =
    BigInt(promptTokens.value) * promptUnits.value +
    BigInt(completionTokens.value) * completionUnits.value;

  const costCapUnits12 =
    parseUnits(String(COST_MAX), LEDGER_DECIMALS) * 10n ** BigInt(PRICE_DECIMALS - LEDGER_DECIMALS);
  if (costUnits12 > costCapUnits12) {
    return { ok: false, error: `cost exceeds the per-event maximum of ${COST_MAX} USDC` };
  }

  const costString = toLedgerString(costUnits12);

  return {
    ok: true,
    value: {
      model: body.model,
      idempotencyKey: body.idempotency_key,
      userAddress: body.user_address.toLowerCase(),
      promptTokens: promptTokens.value,
      completionTokens: completionTokens.value,
      promptPrice: Number(body.prompt_price_per_token ?? 0),
      completionPrice: Number(body.completion_price_per_token ?? 0),
      costString,
      costNumber: Number(costString),
    },
  };
}
