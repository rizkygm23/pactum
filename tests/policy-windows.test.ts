import { describe, it, expect } from "vitest";
import { getUtcDayRange, getUtcMonthRange } from "@/lib/policy";

describe("UTC spend windows", () => {
  it("day range covers exactly the UTC day", () => {
    // 2026-09-20 03:30 UTC → window must start at 00:00:00.000 UTC
    const now = new Date("2026-09-20T03:30:00.000Z");
    const { start, end } = getUtcDayRange(now);
    expect(start).toBe("2026-09-20T00:00:00.000Z");
    expect(end).toBe("2026-09-20T23:59:59.999Z");
  });

  it("month range covers the full UTC month incl. leap-day months", () => {
    const feb2028 = new Date("2028-02-10T12:00:00.000Z");
    const { start, end } = getUtcMonthRange(feb2028);
    expect(start).toBe("2028-02-01T00:00:00.000Z");
    expect(end).toBe("2028-02-29T23:59:59.999Z"); // 2028 is a leap year
  });

  it("day window near UTC midnight does not leak into the previous day", () => {
    const justAfterMidnight = new Date("2026-09-20T00:00:00.100Z");
    const { start } = getUtcDayRange(justAfterMidnight);
    expect(start).toBe("2026-09-20T00:00:00.000Z");
  });
});
