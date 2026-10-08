import { getSessionCookie } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { KeysClient } from "./keys-client";
import { WalletSettings } from "./wallet-settings";
import { PageHeader } from "@/components/ui/PageHeader";
import { Wallet2, Key, ShieldAlert } from "lucide-react";

export default async function SettingsPage() {
  const userId = await getSessionCookie();
  if (!userId) redirect("/login");

  const supabase = createAdminClient();
  const { data: project } = await supabase.from("projects_pactum").select("*").eq("user_id", userId).limit(1).single();
  const { data: keys } = await supabase.from("api_keys_pactum")
    .select("id, key_prefix, name, status, created_at")
    .eq("project_id", project?.id ?? "").order("created_at", { ascending: false });

  const sectionIconCls = "flex items-center justify-center w-8 h-8 rounded-lg bg-[#f9fafb] border border-[#e7eaf0]";

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage API keys and settlement configuration" />

      <div className="space-y-6">
        {/* Settlement Wallet */}
        <section className="rounded-xl border border-[#e7eaf0] bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-[#e7eaf0]">
            <div className={sectionIconCls}><Wallet2 className="w-4 h-4 text-[#404040]" strokeWidth={1.5} /></div>
            <div>
              <h2 className="text-sm font-semibold text-[#030303]">Settlement Wallet</h2>
              <p className="text-xs text-[#939393] mt-0.5">Arc Testnet · USDC payouts</p>
            </div>
          </div>
          <WalletSettings initialWallet={project?.merchant_wallet_address || ""} projectId={project?.id || ""} />
        </section>

        {/* API Keys */}
        <section className="rounded-xl border border-[#e7eaf0] bg-white p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-[#e7eaf0]">
            <div className={sectionIconCls}><Key className="w-4 h-4 text-[#404040]" strokeWidth={1.5} /></div>
            <div>
              <h2 className="text-sm font-semibold text-[#030303]">API Keys</h2>
              <p className="text-xs text-[#939393] mt-0.5">Authenticate SDK and API requests</p>
            </div>
          </div>
          <KeysClient initialKeys={keys || []} />
        </section>

        {/* Security notice */}
        <div className="flex items-start gap-3 rounded-xl border border-[#bfdbfe] bg-[#eff6ff] px-4 py-3.5 text-sm text-[#1d4ed8]">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Testnet environment</p>
            <p className="mt-0.5 text-xs text-[#2563eb]/80">
              All transactions settle on Arc Testnet. No real funds are at stake. API keys are hashed with SHA-256 and never stored in plain text.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
