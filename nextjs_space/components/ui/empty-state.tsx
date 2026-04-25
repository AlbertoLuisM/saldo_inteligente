import { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-emerald-50 dark:bg-emerald-900/30">
        <Icon className="w-8 h-8" style={{ color: '#10b981' }} />
      </div>
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">{title}</h3>
      <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs mb-6">{description}</p>
      {action}
    </div>
  );
}
