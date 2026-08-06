"use client";

import React, { useEffect, useRef } from "react";
import mermaid from "mermaid";

mermaid.initialize({
  startOnLoad: false,
  theme: "dark",
  themeVariables: {
    fontFamily: "Inter, sans-serif",
    primaryColor: "#0E1526",
    primaryBorderColor: "#3FA796",
    primaryTextColor: "#EDE8DC",
    lineColor: "#3FA796",
    secondaryColor: "#1B2333",
    tertiaryColor: "#1B2333",
  },
  securityLevel: "loose",
});

export function Mermaid({ chart }: { chart: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        mermaid.render(`mermaid-${Math.random().toString(36).substring(7)}`, chart)
          .then(({ svg }) => {
            if (containerRef.current) containerRef.current.innerHTML = svg;
          });
      } catch (e) {
        console.error("Mermaid parsing error", e);
      }
    }
  }, [chart]);

  return <div ref={containerRef} className="my-8 flex justify-center bg-[#0D1117] p-6 rounded-lg border border-slate-800 overflow-x-auto min-h-[100px]" />;
}
