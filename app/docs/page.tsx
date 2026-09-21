import fs from "fs";
import path from "path";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { notFound } from "next/navigation";

function readDocsFile(name: string): string | null {
  try {
    return fs.readFileSync(path.join(process.cwd(), "docs", name), "utf8");
  } catch {
    return null;
  }
}

export default function DocsOverview() {
  const content = readDocsFile("README.md");
  if (!content) return notFound();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <MarkdownRenderer content={content} />
    </div>
  );
}
