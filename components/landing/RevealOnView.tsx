"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Adds `is-revealed` to its wrapper once, the first time the element
 * enters the viewport. Children opt into motion via `.rule-sweep`,
 * `.seal-strike`, or `.ledger-tick` — the three landing primitives.
 *
 * Reveals once and never re-fires: the page settles instead of
 * re-animating on every scroll pass.
 */
export function RevealOnView({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "section" | "li";
}) {
  const ref = useRef<HTMLElement>(null);

  // Always starts false so server and client render identical markup;
  // revealing happens after mount.
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // No IntersectionObserver (older browser) — reveal on the next frame
    // so content is never stranded at opacity 0.
    if (typeof IntersectionObserver === "undefined") {
      const raf = requestAnimationFrame(() => setRevealed(true));
      return () => cancelAnimationFrame(raf);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={`${revealed ? "is-revealed" : ""} ${className}`.trim()}
    >
      {children}
    </Tag>
  );
}
