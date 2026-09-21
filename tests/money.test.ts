import { describe, it, expect } from "vitest";
import { validateUsageEvent, toLedgerString } from "@/lib/money";

const validBase = {
  model: "gpt-4o",
  prompt_tokens: 1000,
  completion_tokens: 500,
  prompt_price_per_token: 0.000005,
  completion_price_per_token: 0.000015,
  user_address: "0x3813cB42a4376e4FaCB4b7F0fA3492CC0A5F727a",
  idempotency_key: "req_01HXYZ",
};

describe("validateUsageEvent — happy path", () => {
  it("computes cost exactly in integer arithmetic", () => {
    const r = validateUsageEvent(validBase);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // 1000×0.000005 + 500×0.000015 = 0.005 + 0.0075 = 0.0125 exactly
    expect(r.value.costString).toBe("0.012500");
    expect(r.value.costNumber).toBe(0.0125);
  });

  it("lowercases the user address for canonical storage", () => {
    const r = validateUsageEvent(validBase);
    if (!r.ok) throw new Error("expected ok");
    expect(r.value.userAddress).toBe("0x3813cb42a4376e4facb4b7f0fa3492cc0a5f727a");
  });

  it("defaults omitted tokens and prices to zero", () => {
    const r = validateUsageEvent({
      model: "m",
      user_address: "0x3813cB42a4376e4FaCB4b7F0fA3492CC0A5F727a",
      idempotency_key: "k",
    });
    if (!r.ok) throw new Error("expected ok");
    expect(r.value.costString).toBe("0.000000");
    expect(r.value.promptTokens).toBe(0);
  });

  it("accepts numeric strings for tokens", () => {
    const r = validateUsageEvent({ ...validBase, prompt_tokens: "250" });
    if (!r.ok) throw new Error("expected ok");
    expect(r.value.promptTokens).toBe(250);
  });
});

describe("validateUsageEvent — exactness against float drift", () => {
  it("avoids the 0.1 + 0.2 class of drift", () => {
    // 3 tokens at 0.1 → exactly 0.300000, not 0.30000000000000004
    const r = validateUsageEvent({
      ...validBase,
      prompt_tokens: 3,
      prompt_price_per_token: 0.1,
      completion_tokens: 0,
    });
    if (!r.ok) throw new Error("expected ok");
    expect(r.value.costString).toBe("0.300000");
  });

  it("floors sub-6-decimal price tails instead of rounding up", () => {
    // 1 token at 0.0000005123 → 12-dec product 5.123e-7; ledger keeps 0.000000 (floor)
    const r = validateUsageEvent({
      ...validBase,
      prompt_tokens: 1,
      prompt_price_per_token: 0.0000005123,
      completion_tokens: 0,
    });
    if (!r.ok) throw new Error("expected ok");
    expect(r.value.costString).toBe("0.000000");
  });

  it("preserves sub-cent costs that fit 6 decimals", () => {
    const r = validateUsageEvent({
      ...validBase,
      prompt_tokens: 1,
      prompt_price_per_token: 0.000001,
      completion_tokens: 0,
    });
    if (!r.ok) throw new Error("expected ok");
    expect(r.value.costString).toBe("0.000001");
  });
});

describe("validateUsageEvent — rejections", () => {
  const expectReject = (body: Record<string, unknown>, fragment: string) => {
    const r = validateUsageEvent(body as never);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain(fragment);
  };

  it("rejects negative tokens", () =>
    expectReject({ ...validBase, prompt_tokens: -5 }, "must not be negative"));
  it("rejects fractional tokens", () =>
    expectReject({ ...validBase, completion_tokens: 1.5 }, "non-negative integer"));
  it("rejects negative prices", () =>
    expectReject({ ...validBase, prompt_price_per_token: -0.001 }, "must not be negative"));
  it("rejects absurd prices", () =>
    expectReject({ ...validBase, completion_price_per_token: 5_000_000 }, "must be below"));
  it("rejects malformed addresses", () =>
    expectReject({ ...validBase, user_address: "0xDEADBEEF" }, "Invalid user_address"));
  it("rejects empty model", () => expectReject({ ...validBase, model: "" }, "non-empty string"));
  it("rejects empty idempotency key", () =>
    expectReject({ ...validBase, idempotency_key: "" }, "non-empty string"));
  it("rejects oversized metadata", () =>
    expectReject(
      { ...validBase, metadata: { blob: "x".repeat(10_000) } },
      "metadata"
    ));
  it("rejects non-object metadata", () =>
    expectReject({ ...validBase, metadata: "hello" }, "metadata must be an object"));
  it("rejects NaN prices", () =>
    expectReject({ ...validBase, prompt_price_per_token: "abc" }, "finite number"));
});

describe("toLedgerString", () => {
  it("formats whole units with a 6-decimal tail", () => {
    // 1 USDC expressed in 12-decimal units = 10^12
    expect(toLedgerString(10n ** 12n)).toBe("1.000000");
  });
  it("pads fractional digits", () => {
    // 5 micro-USDC in 12-decimal units = 5×10^6
    expect(toLedgerString(5n * 10n ** 6n)).toBe("0.000005");
  });
});
