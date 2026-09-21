import fs from "fs";
import path from "path";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string }>;
}

function readDocsFile(name: string): string | null {
  try {
    return fs.readFileSync(path.join(process.cwd(), "docs", name), "utf8");
  } catch {
    return null;
  }
}

export default async function DocPage({ params }: PageProps) {
  const { slug } = await params;

  // Prevent directory traversal
  const safeSlug = slug.replace(/[^a-zA-Z0-9-]/g, "");
  if (!safeSlug) return notFound();

  const content = readDocsFile(`${safeSlug}.md`);
  if (!content) return notFound();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <MarkdownRenderer content={content} />
    </div>
  );
}

// Generate static params for all markdown files
export async function generateStaticParams() {
  try {
    const docsDir = path.join(process.cwd(), "docs");
    const files = fs.readdirSync(docsDir);

    return files
      .filter(file => file.endsWith(".md") && file !== "README.md")
      .map(file => ({
        slug: file.replace(".md", "")
      }));
  } catch {
    return [];
  }
}
