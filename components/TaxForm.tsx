import type { ReactNode, SyntheticEvent } from "react";

interface TaxFormProps {
  children: ReactNode;
  // SubmitEventの代わりに、汎用的なSyntheticEvent（合成イベント）を使用
  onSubmit: (e: SyntheticEvent<HTMLFormElement>) => void;
  color?: "blue" | "pink";
  buttonText?: string;
}

export const TaxForm = ({
  children,
  onSubmit,
  color = "blue",
  buttonText = "追加する",
}: TaxFormProps) => {
  const theme = {
    blue: "bg-blue-600 hover:bg-blue-700 shadow-blue-200 dark:shadow-none",
    pink: "bg-pink-600 hover:bg-pink-700 shadow-pink-200 dark:shadow-none",
  }[color];

  return (
    <form
      onSubmit={onSubmit}
      className="flex-none bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mb-8 animate-in fade-in slide-in-from-top-4 duration-500"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
        {children}
        <button
          type="submit"
          className={`w-full py-2 px-4 text-white font-bold rounded-lg transition-all active:scale-95 shadow-lg ${theme}`}
        >
          {buttonText}
        </button>
      </div>
    </form>
  );
};

export const TaxLabel = ({ children }: { children: React.ReactNode }) => (
  <span className="text-sm font-bold text-slate-700 dark:text-slate-200 ml-1">{children}</span>
);
