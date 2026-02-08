// components/SuggestInput.tsx
import { useId } from "react";

interface SuggestInputProps {
  label?: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  required?: boolean;
  className?: string; // 外から h-[52px] などを受け取るために必要
}

export const SuggestInput = ({
  label, // 実際は TaxLabel を外で使うならこれは不要になりますが、残しておいてもOKです
  placeholder,
  value,
  onChange,
  suggestions = [],
  required = false,
  className = "",
}: SuggestInputProps) => {
  const listId = useId();

  return (
    <div className="flex flex-col gap-1 w-full">
      {/* ラベルを page.tsx 側の TaxLabel で統一するなら、ここは消してもOK */}
      {label && (
        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 ml-1">{label}</span>
      )}

      <input
        type="text"
        placeholder={placeholder}
        list={listId}
        // クラスを他の入力欄（p-3, border-2, rounded-xl）と統一
        className={`p-3 border-2 rounded-xl text-lg dark:bg-slate-700 dark:text-white dark:border-slate-600 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all ${className}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
      <datalist id={listId}>
        {suggestions.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
    </div>
  );
};
