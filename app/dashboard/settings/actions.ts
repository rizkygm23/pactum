"use server";

import { getSessionCookie } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function updateWalletAddress(projectId: string, address: string) {
  const userId = await getSessionCookie();
  if (!userId) {
    throw new Error("Unauthorized");
  }

  const supabase = createAdminClient();

  // Verify ownership
  const { data: project } = await supabase
    .from("projects_pactum")
    .select("user_id")
    .eq("id", projectId)
    .single();

  if (!project || project.user_id !== userId) {
    throw new Error("Unauthorized");
  }

  const { error } = await supabase
    .from("projects_pactum")
    .update({ merchant_wallet_address: address })
    .eq("id", projectId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/settings");
}
