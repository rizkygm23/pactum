"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Activity, Wallet, Settings2,
  BookOpen, Menu, X, LogOut, ChevronRight,
} from "lucide-react";

const navItems = [
  { href: "/dashboard",          label: "Overview",      icon: LayoutDashboard },
  { href: "/dashboard/usage",    label: "Usage",         icon: Activity },
  { href: "/dashboard/payouts",  label: "Payouts",       icon: Wallet },
  { href: "/dashboard/settings", label: "Settings",      icon: Settings2 },
  { href: "/docs",               label: "Documentation", icon: BookOpen },
];

interface DashboardShellProps {
  email: string;
  companyName: string | null;
  children: React.ReactNode;
}

function getInitials(email: string): string {
  if (!email) return "?";
  const local = email.split("@")[0];
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

export function DashboardShell({ email, companyName, children }: DashboardShellProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const rail = (
    <>
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#e7eaf0]">
        <img src="/pactum-logo.png" alt="Pactum" className="h-7 w-7 object-contain shrink-0" />
        <span className="text-base font-semibold tracking-tight text-[#030303]">pactum</span>
        <span className="ml-auto text-[9px] font-semibold px-2 py-0.5 rounded-full bg-[#fffbeb] border border-[#fde68a] text-[#b45309]">
          testnet
        </span>
      </div>

      {companyName && (
        <p className="px-5 pt-3 pb-1 text-[10px] font-semibold tracking-widest uppercase text-[#939393]">
          {companyName}
        </p>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 ${
                active
                  ? "bg-[#030303] text-white font-semibold shadow-sm"
                  : "text-[#404040] hover:bg-[#e7eaf0] hover:text-[#030303]"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? "text-white" : "text-[#939393]"}`} strokeWidth={active ? 2.5 : 2} />
              <span className="truncate">{item.label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 ml-auto text-white/50" />}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-[#e7eaf0] p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#e7eaf0] border border-[#c9ccd1] text-xs font-semibold text-[#030303] shrink-0 uppercase select-none">
            {getInitials(email)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-[#030303] truncate">{email}</p>
            <p className="text-[10px] text-[#939393]">Merchant</p>
          </div>
          <form action="/api/auth/signout" method="post">
            <button type="submit" title="Sign out"
              className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-[#e7eaf0] transition-colors text-[#939393] hover:text-[#030303]">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-[#f9fafb]">
      {/* Permanent sidebar */}
      <aside className="hidden w-[220px] shrink-0 flex-col border-r border-[#e7eaf0] bg-white lg:flex">
        {rail}
      </aside>

      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Mobile drawer */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col w-[220px] max-w-[85vw] border-r border-[#e7eaf0] bg-white transition-transform duration-300 ease-out lg:hidden ${open ? "translate-x-0" : "-translate-x-full"}`}>
        {rail}
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between gap-3 border-b border-[#e7eaf0] bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setOpen(!open)}
              aria-label={open ? "Close navigation" : "Open navigation"}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#e7eaf0] text-[#030303] hover:bg-[#f9fafb] transition-colors">
              {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <div className="flex items-center gap-2">
              <img src="/pactum-logo.png" alt="Pactum" className="h-6 w-6 object-contain" />
              <span className="text-base font-semibold tracking-tight text-[#030303]">pactum</span>
            </div>
          </div>
          <Link href="/" className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[#e7eaf0] text-[#676f7b] hover:bg-[#f9fafb] transition-colors">
            Exit
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
