import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionCookie } from "@/lib/auth";

/**
 * DELETE /api/v1/keys/[id] — Revoke an API key (soft delete).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = await getSessionCookie();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Verify ownership since RLS is disabled
  const { data: keyData } = await supabase
    .from("api_keys_pactum")
    .select("project_id, projects_pactum!inner(user_id)")
    .eq("id", id)
    .single();

  // @ts-ignore - Supabase types for joined tables are sometimes tricky, we know this shape
  if (!keyData || keyData.projects_pactum?.user_id !== userId) {
    return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
  }

  const { error } = await supabase
    .from("api_keys_pactum")
    .update({ status: "revoked" })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ revoked: true });
}
