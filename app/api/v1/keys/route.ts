import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateApiKey, hashApiKey, getKeyPrefix } from "@/lib/api-keys";
import { getSessionCookie } from "@/lib/auth";

/**
 * GET /api/v1/keys — List API keys for the user's project.
 * Returns key_prefix, name, status (never the full key or hash).
 */
export async function GET() {
  const userId = await getSessionCookie();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Get user's first project
  const { data: project } = await supabase
    .from("projects_pactum")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (!project) {
    return NextResponse.json({ error: "No project found" }, { status: 404 });
  }

  const { data: keys, error } = await supabase
    .from("api_keys_pactum")
    .select("id, key_prefix, name, status, created_at")
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ keys });
}

/**
 * POST /api/v1/keys — Generate a new API key.
 * Returns the full key ONCE — it cannot be retrieved again.
 */
export async function POST(request: Request) {
  const userId = await getSessionCookie();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const name = body.name || "Default";

  const supabase = createAdminClient();

  // Get user's first project
  const { data: project } = await supabase
    .from("projects_pactum")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (!project) {
    return NextResponse.json({ error: "No project found" }, { status: 404 });
  }

  // Generate the key
  const fullKey = generateApiKey();
  const keyHash = hashApiKey(fullKey);
  const keyPrefix = getKeyPrefix(fullKey);

  // Store using admin client (bypasses RLS for insert)
  const admin = createAdminClient();
  const { data: newKey, error } = await admin
    .from("api_keys_pactum")
    .insert({
      project_id: project.id,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      name,
    })
    .select("id, key_prefix, name, status, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    key: fullKey, // ⚠️ Only returned once
    ...newKey,
  }, { status: 201 });
}
