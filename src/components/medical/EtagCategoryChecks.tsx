// e-Taxの4区分を判定して表示するパーツ
export const ETagCategoryChecks = ({ usedCategories }: { usedCategories: Set<string> }) => {
  const categories = [
    { label: "診", id: "診療・治療" },
    { label: "薬", id: "医薬品購入" },
    { label: "介", id: "介護サービス" },
    { label: "他", id: "その他の医療費(交通費など)" },
  ];

  return (
    <div className="flex gap-1 mt-2">
      {categories.map((cat) => {
        const isActive = usedCategories.has(cat.id);
        return (
          <div
            key={cat.id}
            className={`text-[9px] w-5 h-5 flex items-center justify-center rounded border font-bold ${
              isActive
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-transparent border-slate-300 text-slate-300 dark:border-slate-600 dark:text-slate-600"
            }`}
            title={cat.id} // ホバー時にフルネーム表示
          >
            {isActive ? "✓" : ""}
            <span className={isActive ? "hidden" : "block"}>{cat.label}</span>
          </div>
        );
      })}
    </div>
  );
};
