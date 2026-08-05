import { RevealOnView } from "./RevealOnView";

interface StageSectionProps {
  ordinal: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Numbered stage wrapper — one of three in the Narrative Workflow.
 * Ordinal sweeps in via `.rule-sweep`, content reveals via children.
 */
export function StageSection({
  ordinal,
  title,
  children,
  className = "",
}: StageSectionProps) {
  return (
    <RevealOnView as="section" className={className}>
      <div className="mb-3">
        <span className="stage-ordinal">{ordinal}</span>
        <div className="rule-sweep mt-2" />
      </div>
      <h2 className="display-face text-3xl sm:text-4xl font-semibold text-parchment mb-6">
        {title}
      </h2>
      {children}
    </RevealOnView>
  );
}
