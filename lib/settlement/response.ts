import { NextResponse } from "next/server";
import type { SettlementResult } from "./execute";
import { log } from "@/lib/obs";

/** Shared response shaping for the cron and manual settlement routes. */
export function settlementJson(result: SettlementResult): NextResponse {
  return NextResponse.json({
    message:
      result.settledGroups > 0 ? "Settlement successful" : "No payable settlements.",
    ...result,
  });
}

/** Shared error shaping — logs server-side, returns a generic body. */
export function settlementError(e: unknown, context: string): NextResponse {
  const message = e instanceof Error ? e.message : "Unknown error";
  log("error", context, { error: message });
  return NextResponse.json(
    { error: "Settlement transaction failed", details: message },
    { status: 500 }
  );
}
