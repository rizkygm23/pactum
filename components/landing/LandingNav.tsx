"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function LandingNav({ signedIn }: { signedIn: boolean }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header className={`sticky top-0 z-30 bg-white transition-all duration-200 ${scrolled ? "shadow-[0_1px_0_#e7eaf0]" : ""}`}>
      <nav className="flex h-[60px] items-center justify-between px-5 sm:px-8 lg:px-12 max-w-[1400px] mx-auto">
        {/* Wordmark */}
        <Link href="/" className="flex items-center gap-2 text-base font-semibold tracking-tight text-[#030303]">
          <img src="/pactum-logo.png" alt="Pactum" className="h-6 w-6 object-contain" />
          pactum
        </Link>

        {/* Desktop centre links */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/docs" className="text-sm text-[#676f7b] hover:text-[#030303] transition-colors">Docs</Link>
          <a href="https://aura-ai.rizzgm.xyz" target="_blank" rel="noopener noreferrer"
            className="text-sm text-[#676f7b] hover:text-[#030303] transition-colors">Live Demo</a>
          <Link href="/wallet" className="text-sm text-[#676f7b] hover:text-[#030303] transition-colors">Wallet</Link>
        </div>

        {/* Right CTAs */}
        <div className="flex items-center gap-3">
          {signedIn ? (
            <Link href="/dashboard"
              className="rounded-full bg-[#030303] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a1a1a] transition-colors">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login"
                className="hidden sm:inline text-sm font-semibold text-[#030303] underline-offset-2 hover:underline transition-all">
                Sign in
              </Link>
              <Link href="/signup"
                className="rounded-full bg-[#030303] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a1a1a] transition-colors">
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
