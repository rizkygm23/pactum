"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Rocket, Code2, FileText } from "lucide-react";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const navItems = [
    { name: "Overview",          href: "/docs",                   icon: BookOpen },
    { name: "Integration Guide", href: "/docs/integration-guide", icon: Rocket },
    { name: "API Reference",     href: "/docs/api-reference",     icon: Code2 },
    { name: "Smart Contract",    href: "/docs/smart-contract",    icon: FileText },
  ];

  return (
    <div className="min-h-dvh bg-white flex flex-col md:flex-row">
      <aside className="w-full md:w-64 md:shrink-0 bg-white border-b border-[#e7eaf0] md:border-b-0 md:border-r md:sticky md:top-0 md:h-dvh md:overflow-y-auto">
        <div className="px-4 py-3 md:p-6">
          <div className="flex items-center gap-2 mb-3 md:mb-8">
            <FileText className="w-5 h-5 text-[#030303]" />
            <Link href="/" className="text-base md:text-lg font-semibold text-[#030303] tracking-tight truncate">
              Documentation
            </Link>
          </div>
          <nav className="flex gap-1 overflow-x-auto md:flex-col md:space-y-1 md:overflow-visible -mx-1 px-1 md:mx-0 md:px-0">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.name} href={item.href} aria-current={isActive ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-2 md:gap-3 whitespace-nowrap px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[#e7eaf0] text-[#030303] shadow-[inset_2px_0_0_0_#030303]"
                      : "text-[#676f7b] hover:text-[#030303] hover:bg-[#f9fafb]"
                  }`}>
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="hidden md:block mt-8 pt-4 border-t border-[#e7eaf0]">
            <Link href="/" className="text-xs text-[#676f7b] hover:text-[#030303] transition-colors">
              ← Back to Pactum
            </Link>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 max-w-4xl mx-auto w-full px-4 py-8 sm:px-6 md:p-12 pb-20 md:pb-24">
        {children}
      </main>
    </div>
  );
}
