import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { executeSettlement } from "@/lib/settlement/execute";
import { settlementJson, settlementError } from "@/lib/settlement/response";

export async function POST(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  // Constant-time comparison (digest both sides to equal length first)
  const authHeader = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  const given = createHash("sha256").update(authHeader).digest();
  const wanted = createHash("sha256").update(expected).digest();
  if (!timingSafeEqual(given, wanted)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await executeSettlement();

    return settlementJson(result);
  } catch (e: unknown) {
    return settlementError(e, "batch settle error");
  }
}
