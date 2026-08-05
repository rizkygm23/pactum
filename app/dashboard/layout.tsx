import { redirect } from "next/navigation";
import { getSessionCookie } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getSessionCookie();

  if (!userId) {
    redirect("/login");
  }

  const supabase = createAdminClient();

  // Get user profile
  const { data: userProfile } = await supabase
    .from("users_pactum")
    .select("email, company_name")
    .eq("id", userId)
    .single();

  if (!userProfile) {
    redirect("/login");
  }

  return (
    <DashboardShell
      email={userProfile.email ?? ""}
      companyName={userProfile.company_name ?? null}
    >
      {children}
    </DashboardShell>
  );
}
