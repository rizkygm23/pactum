import fs from "fs";
import path from "path";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function DocPage({ params }: PageProps) {
  const { slug } = await params;
  
  // Prevent directory traversal
  const safeSlug = slug.replace(/[^a-zA-Z0-9-]/g, "");
  const filePath = path.join(process.cwd(), "docs", `${safeSlug}.md`);
  
  try {
    if (!fs.existsSync(filePath)) {
      return notFound();
    }
    
    const content = fs.readFileSync(filePath, "utf8");
    
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        <MarkdownRenderer content={content} />
      </div>
    );
  } catch (error) {
    console.error(`Failed to load doc: ${slug}`, error);
    return notFound();
  }
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
  } catch (e) {
    return [];
  }
}
