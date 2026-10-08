import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-[#f9fafb] border border-[#e7eaf0] flex items-center justify-center mb-4">
          <Icon className="w-5 h-5 text-[#939393]" />
        </div>
      )}
      <p className="text-sm font-medium text-[#030303]">{title}</p>
      {description && <p className="mt-1.5 text-sm text-[#676f7b] max-w-xs">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
