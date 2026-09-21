import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionCookie } from "@/lib/auth";
import { executeSettlement } from "@/lib/settlement/execute";
import { settlementJson, settlementError } from "@/lib/settlement/response";

/**
 * POST /api/v1/settlement/manual — trigger on-contract settlement for the
 * logged-in user's own project events only (scoped, unlike the global cron).
 */
export async function POST() {
  const userId = await getSessionCookie();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const { data: projects } = await supabase
      .from("projects_pactum")
      .select("id")
      .eq("user_id", userId);

    if (!projects || projects.length === 0) {
      return NextResponse.json({ error: "No project found" }, { status: 404 });
    }

    const result = await executeSettlement({
      projectIds: projects.map((p) => p.id),
    });

    return settlementJson(result);
  } catch (e: unknown) {
    return settlementError(e, "manual settlement error");
  }
}
