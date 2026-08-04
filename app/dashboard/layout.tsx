import { redirect } from "next/navigation";
import { getSessionCookie } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: "◈" },
  { href: "/dashboard/usage", label: "Usage", icon: "▤" },
  { href: "/dashboard/payouts", label: "Payouts", icon: "▧" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙" },
  { href: "/docs", label: "Documentation", icon: "◩" },
];

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
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-graphite border-r border-border flex flex-col shrink-0">
        {/* Brand */}
        <div className="p-5 border-b border-border">
          <h1
            className="text-xl font-semibold text-parchment tracking-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Pactum
          </h1>
          {userProfile.company_name && (
            <p className="text-xs text-foreground-dim mt-0.5 truncate">
              {userProfile.company_name}
            </p>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-parchment/70 hover:text-parchment hover:bg-ink-navy/50 transition-colors"
            >
              <span className="text-base opacity-60">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brass/20 flex items-center justify-center">
              <span className="text-brass text-xs font-semibold">
                {userProfile.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-parchment truncate">{userProfile.email}</p>
            </div>
          </div>
          <form action="/api/auth/signout" method="post" className="mt-3">
            <button
              type="submit"
              className="text-xs text-foreground-dim hover:text-rust transition-colors"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-ink-navy">
        <div className="max-w-6xl mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
