interface Props {
  label: string;
  children: React.ReactNode;
  error?: string;
}

export default function FormField({ label, children, error }: Props) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

export const inputClass = "w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-500";
export const selectClass = "w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 bg-white dark:bg-gray-800 dark:text-gray-200";
