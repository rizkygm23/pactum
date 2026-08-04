import { getSessionCookie } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { KeysClient } from "./keys-client";
import { WalletSettings } from "./wallet-settings";

export default async function SettingsPage() {
  const userId = await getSessionCookie();

  if (!userId) {
    redirect("/login");
  }

  const supabase = createAdminClient();

  const { data: project } = await supabase
    .from("projects_pactum")
    .select("*")
    .eq("user_id", userId)
    .limit(1)
    .single();

  const { data: keys } = await supabase
    .from("api_keys_pactum")
    .select("id, key_prefix, name, status, created_at")
    .eq("project_id", project?.id ?? "")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-8">
        <h1
          className="text-2xl font-semibold text-parchment"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Settings
        </h1>
        <p className="text-sm text-foreground-dim mt-1">
          Manage API keys and settlement configuration
        </p>
      </div>

      <div className="space-y-8">
        {/* Merchant Wallet Settings */}
        <section className="card">
          <h2 className="text-sm font-medium text-parchment uppercase tracking-wider mb-6">
            Settlement Wallet
          </h2>
          <WalletSettings initialWallet={project?.merchant_wallet_address || ""} projectId={project?.id || ""} />
        </section>

        {/* API Keys */}
        <section className="card">
          <h2 className="text-sm font-medium text-parchment uppercase tracking-wider mb-6">
            API Keys
          </h2>
          <KeysClient initialKeys={keys || []} />
        </section>
      </div>
    </div>
  );
}
