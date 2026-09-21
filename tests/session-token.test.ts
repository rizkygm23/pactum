import { describe, it, expect } from "vitest";
import { createSessionToken, verifySessionToken } from "@/lib/session-token";

const SECRET = "test-secret-at-least-32-chars-long!!";
const USER = "10c752b8-2c2d-4e15-ba55-b3057433ef4e";

describe("session tokens", () => {
  it("round-trips a valid token", async () => {
    const token = await createSessionToken(USER, SECRET);
    expect(await verifySessionToken(token, SECRET)).toBe(USER);
  });

  it("rejects a tampered payload", async () => {
    const token = await createSessionToken(USER, SECRET);
    const [userId, exp] = token.split(".");
    const tampered = `${"99999999-9999-9999-9999-999999999999"}.${exp}.${token.split(".")[2]}`;
    expect(await verifySessionToken(tampered, SECRET)).toBeNull();
  });

  it("rejects a signature made with a different secret", async () => {
    const token = await createSessionToken(USER, SECRET);
    expect(await verifySessionToken(token, "another-secret-32-chars-long!!!!!!!")).toBeNull();
  });

  it("rejects an expired token", async () => {
    // Craft an already-expired token by monkey-patching Date.now during creation
    const realNow = Date.now;
    Date.now = () => realNow() - 8 * 24 * 60 * 60 * 1000; // 8 days ago (TTL is 7 days)
    const expired = await createSessionToken(USER, SECRET);
    Date.now = realNow;
    expect(await verifySessionToken(expired, SECRET)).toBeNull();
  });

  it("rejects garbage tokens", async () => {
    expect(await verifySessionToken("garbage", SECRET)).toBeNull();
    expect(await verifySessionToken("a.b", SECRET)).toBeNull();
    expect(await verifySessionToken("", SECRET)).toBeNull();
    expect(await verifySessionToken("a.b.c", SECRET)).toBeNull();
  });
});
