"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Rocket,
  Code2,
  FileText,
} from "lucide-react";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Keep in sync with the files in ./docs — deleted pages disappear here too.
  const navItems = [
    { name: "Overview", href: "/docs", icon: BookOpen },
    { name: "Integration Guide", href: "/docs/integration-guide", icon: Rocket },
    { name: "API Reference", href: "/docs/api-reference", icon: Code2 },
    { name: "Smart Contract", href: "/docs/smart-contract", icon: FileText },
  ];

  return (
    <div className="min-h-dvh bg-canvas flex flex-col md:flex-row">
      {/*
        Sidebar. Below `md` this collapses to a single horizontally
        scrollable rail so it costs one row of height instead of ~260px
        of chrome above every article.
      */}
      <aside className="w-full md:w-64 md:shrink-0 bg-canvas border-b border-hairline md:border-b-0 md:border-r md:sticky md:top-0 md:h-dvh md:overflow-y-auto">
        <div className="px-4 py-3 md:p-6">
          <div className="flex items-center gap-2 mb-3 md:mb-8">
            <div className="w-8 h-8 shrink-0 flex items-center justify-center">
              <FileText className="w-5 h-5 text-ink" />
            </div>
            <Link
              href="/"
              className="focus-ring text-base md:text-lg font-semibold text-ink tracking-tight truncate"
            >
              Documentation
            </Link>
          </div>

          <nav className="flex gap-1 overflow-x-auto md:flex-col md:space-y-1 md:overflow-visible -mx-1 px-1 md:mx-0 md:px-0">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`focus-ring flex shrink-0 items-center gap-2 md:gap-3 whitespace-nowrap px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-hairline text-ink shadow-[inset_2px_0_0_0_var(--color-ink)]"
                      : "text-ink/70 hover:text-ink hover:bg-canvas/50"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="hidden md:block mt-8 pt-4 border-t border-hairline">
            <Link
              href="/"
              className="focus-ring text-xs text-slate transition-colors hover:text-ink"
            >
              ← Back to Pactum
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="min-w-0 flex-1 max-w-4xl mx-auto w-full px-4 py-8 sm:px-6 md:p-12 pb-20 md:pb-24">
        {children}
      </main>
    </div>
  );
}
