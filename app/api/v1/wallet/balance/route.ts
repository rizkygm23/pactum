import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userAddress = searchParams.get("address");

  if (!userAddress) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Fetch pending off-chain usage
  const { data: pendingUsageData, error } = await supabase
    .from("usage_events_pactum")
    .select("cost")
    .eq("user_address", userAddress)
    .eq("status", "pending_settlement");

  if (error) {
    console.error("Error fetching pending usage:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  const pendingUsage = (pendingUsageData || []).reduce((sum, e) => sum + Number(e.cost), 0);

  return NextResponse.json({ pendingUsage });
}
