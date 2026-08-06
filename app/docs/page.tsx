import fs from "fs";
import path from "path";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { notFound } from "next/navigation";

export default async function DocsOverview() {
  const filePath = path.join(process.cwd(), "docs", "README.md");
  
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
        <MarkdownRenderer content={content} />
      </div>
    );
  } catch (error) {
    console.error("Failed to load README.md", error);
    return notFound();
  }
}
