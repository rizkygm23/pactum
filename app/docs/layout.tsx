"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Rocket, Code2, Link as LinkIcon, FileText } from "lucide-react";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { name: "Overview", href: "/docs", icon: BookOpen },
    { name: "Quickstart", href: "/docs/quickstart", icon: Rocket },
    { name: "Integration & SIWE", href: "/docs/integration", icon: Code2 },
    { name: "Smart Contracts", href: "/docs/smart-contracts", icon: LinkIcon },
  ];

  return (
    <div className="min-h-screen bg-graphite flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-950 border-r border-slate-800 shrink-0">
        <div className="p-6 sticky top-0">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 flex items-center justify-center">
              <FileText className="w-5 h-5 text-slate-100" />
            </div>
            <span className="text-lg font-semibold text-slate-100 tracking-tight">Documentation</span>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-slate-800 text-white"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto p-6 md:p-12 pb-24 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
