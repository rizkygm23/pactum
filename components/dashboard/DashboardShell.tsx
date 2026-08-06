"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: "◈" },
  { href: "/dashboard/usage", label: "Usage", icon: "▤" },
  { href: "/dashboard/payouts", label: "Payouts", icon: "▧" },
  { href: "/dashboard/settings", label: "Settings", icon: "⚙" },
  { href: "/docs", label: "Documentation", icon: "◩" },
];

interface DashboardShellProps {
  email: string;
  companyName: string | null;
  children: React.ReactNode;
}

/**
 * Dashboard chrome. The rail is a permanent column from `lg` up and a
 * dismissable drawer below it — at 320px a fixed 240px rail would leave
 * the content column unusable.
 */
export function DashboardShell({
  email,
  companyName,
  children,
}: DashboardShellProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const rail = (
    <>
      {/* Brand */}
      <div className="p-5 border-b border-border flex items-center gap-2">
        <img src="/pactum-logo.png" alt="Pactum" className="w-7 h-7 object-contain" />
        <h1
          className="text-xl font-semibold text-parchment tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Pactum
        </h1>
        {companyName && (
          <p className="text-xs text-foreground-dim mt-0.5 truncate">
            {companyName}
          </p>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                active
                  ? "bg-ink-navy/60 text-parchment"
                  : "text-parchment/70 hover:text-parchment hover:bg-ink-navy/50"
              }`}
            >
              <span className="text-base opacity-60 shrink-0">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 shrink-0 rounded-full bg-brass/20 flex items-center justify-center">
            <span className="text-brass text-xs font-semibold">
              {email?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-parchment truncate">{email}</p>
          </div>
        </div>
        <form action="/api/auth/signout" method="post" className="mt-3">
          <button
            type="submit"
            className="focus-ring text-xs text-foreground-dim hover:text-rust transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Permanent rail — lg and up */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col bg-graphite border-r border-border">
        {rail}
      </aside>

      {/* Drawer — below lg */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink-navy/70"
          />
          <aside className="relative flex w-[17rem] max-w-[85vw] flex-col bg-graphite border-r border-border">
            {rail}
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="lg:hidden flex items-center gap-3 border-b border-border bg-graphite px-4 py-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            aria-expanded={open}
            className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border-strong text-parchment"
          >
            <span aria-hidden="true" className="text-base leading-none">
              ☰
            </span>
          </button>
          <div className="flex items-center gap-2">
            <img src="/pactum-logo.png" alt="Pactum" className="w-6 h-6 object-contain" />
            <span
              className="text-base font-semibold text-parchment tracking-tight truncate"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Pactum
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-ink-navy">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
