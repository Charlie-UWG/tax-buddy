// components/TaxCard.tsx
interface TaxCardProps {
  label: string;
  amount: number;
  color?: "blue" | "green" | "pink" | "slate";
}

export const TaxCard = ({ label, amount, color = "slate" }: TaxCardProps) => {
  const colorClasses = {
    blue: "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
    green: "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400",
    pink: "border-pink-200 dark:border-pink-900/30 bg-pink-50/30 dark:bg-pink-900/10 text-pink-600 dark:text-pink-400",
    slate:
      "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100",
  };

  return (
    <div className={`p-4 rounded-xl border transition-all ${colorClasses[color]}`}>
      {/* ラベルは中央揃え */}
      <p className="text-xs font-bold mb-1 opacity-80 text-center">{label}</p>
      <p className="text-2xl font-mono font-bold">¥{amount.toLocaleString()}</p>
    </div>
  );
};
