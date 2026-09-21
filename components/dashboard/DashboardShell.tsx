"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/usage", label: "Usage" },
  { href: "/dashboard/payouts", label: "Payouts" },
  { href: "/dashboard/settings", label: "Settings" },
  { href: "/docs", label: "Documentation" },
];

interface DashboardShellProps {
  email: string;
  companyName: string | null;
  children: React.ReactNode;
}

/**
 * Dashboard chrome — editorial light: canvas rail, hairline divider,
 * ink navigation, black text link for sign-out. Permanent column from `lg`,
 * dismissable drawer below.
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
      <div className="flex items-center gap-2 border-b border-hairline p-5">
        <img src="/pactum-logo.png" alt="Pactum" className="h-7 w-7 object-contain" />
        <h1 className="text-lg font-semibold tracking-tight text-ink">
          pactum
        </h1>
      </div>
      {companyName && (
        <p className="micro-caps px-5 pt-3 text-stone">{companyName}</p>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
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
              className={`focus-ring flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-hairline font-semibold text-ink"
                  : "text-graphite hover:bg-canvas-warm hover:text-ink"
              }`}
            >
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-hairline p-4">
        <p className="data-mono truncate text-xs text-graphite">{email}</p>
        <form action="/api/auth/signout" method="post" className="mt-3">
          <button
            type="submit"
            className="focus-ring text-xs font-semibold text-graphite underline-offset-2 transition-colors hover:text-ink hover:underline"
          >
            Sign out
          </button>
        </form>
      </div>
    </>
  );

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Permanent rail — lg and up */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-hairline bg-canvas lg:flex">
        {rail}
      </aside>

      {/* Drawer — below lg */}
      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-ink/40"
          />
          <aside className="relative flex w-[17rem] max-w-[85vw] flex-col border-r border-hairline bg-canvas">
            {rail}
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between gap-3 border-b border-hairline bg-canvas px-4 py-3 lg:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open navigation"
              aria-expanded={open}
              className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-hairline-soft text-ink"
            >
              <span aria-hidden="true" className="text-base leading-none">
                ☰
              </span>
            </button>
            <div className="flex items-center gap-2">
              <img src="/pactum-logo.png" alt="Pactum" className="h-6 w-6 object-contain" />
              <span className="text-base font-semibold tracking-tight truncate text-ink">
                pactum
              </span>
            </div>
          </div>
          <Link href="/" className="focus-ring text-xs text-slate hover:text-ink">
            Exit
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto bg-canvas">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
