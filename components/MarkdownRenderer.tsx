"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Mermaid } from "./Mermaid";
import Link from "next/link";

export default function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="w-full">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          pre({ children, ...props }: any) {
            const childArray = React.Children.toArray(children);
          if (childArray.length === 1 && React.isValidElement(childArray[0])) {
            const child = childArray[0] as React.ReactElement<any>;
            if (child.props.className?.includes("language-mermaid")) {
                return <>{children}</>;
              }
            }
            return (
              <div className="relative my-6">
                <pre className="bg-[#0D1117] p-4 rounded-lg overflow-x-auto border border-slate-800" {...props}>
                  {children}
                </pre>
              </div>
            );
          },
          code({ className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";
            
            if (language === "mermaid") {
              return <Mermaid chart={String(children).replace(/\n$/, "")} />;
            }
            
            const isBlock = match || String(children).includes("\n");
            
            if (isBlock) {
              return <code className={className} {...props}>{children}</code>;
            }
            
            return (
              <code className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-sm font-mono border border-slate-700" {...props}>
                {children}
              </code>
            );
          },
          p({ children }) {
            return <p className="leading-7 text-slate-300 my-4 text-base">{children}</p>;
          },
          h1({ children }) {
            return <h1 className="text-3xl font-semibold tracking-tight text-slate-100 mb-6 pb-4 border-b border-slate-800">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-xl font-medium text-slate-100 mt-12 mb-4 pb-2 border-b border-slate-800/50">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-lg font-medium text-slate-200 mt-8 mb-3">{children}</h3>;
          },
          ul({ children }) {
            return <ul className="list-disc pl-6 space-y-2 text-slate-300 my-4 text-base">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal pl-6 space-y-2 text-slate-300 my-4 text-base">{children}</ol>;
          },
          li({ children }) {
            return <li className="pl-1 leading-7">{children}</li>;
          },
          a({ href, children }) {
            const isInternal = href?.startsWith("/") || href?.startsWith("./");
            const parsedHref = href?.replace("./", "/docs/").replace(".md", "");
            
            if (isInternal) {
              return <Link href={parsedHref || "#"} className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">{children}</Link>;
            }
            return <a href={href} target="_blank" rel="noreferrer" className="text-emerald-400 hover:text-emerald-300 underline underline-offset-2">{children}</a>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-slate-600 bg-slate-900/50 px-5 py-4 rounded-r-md my-6 text-slate-300 italic text-base">
                {children}
              </blockquote>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-8 border border-slate-800 rounded-lg">
                <table className="w-full text-sm text-left">{children}</table>
              </div>
            );
          },
          th({ children }) {
            return <th className="px-4 py-3 bg-slate-900 border-b border-slate-700 font-semibold text-slate-200 whitespace-nowrap">{children}</th>;
          },
          td({ children }) {
            return <td className="px-4 py-3 border-b border-slate-800 text-slate-300">{children}</td>;
          },
          hr() {
            return <hr className="my-10 border-slate-800" />;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
