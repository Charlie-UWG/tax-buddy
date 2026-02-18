// components/TaxTable.tsx

interface TaxTableProps {
  headers: string[];
  rows: {
    id: string;
    cells: (string | number | React.ReactNode)[];
  }[];
  onDelete: (id: string) => void;
  emptyMessage?: string;
  color?: "blue" | "pink";
  onSort?: (header: string) => void; // ソート用の関数を受け取れるようにする
  sortOrder?: "asc" | "desc"; // ソートの状態を表示用にもらう
  onEdit?: (id: string) => void; // 編集用の関数を受け取れるようにする
}

export const TaxTable = ({
  headers,
  rows,
  onDelete,
  onEdit,
  onSort,
  sortOrder = "asc",
  emptyMessage = "データがありません",
  color = "blue",
}: TaxTableProps) => {
  const theme = {
    blue: {
      border: "border-slate-200 dark:border-slate-700",
      thead: "sticky top-0 z-10 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-200",
      rowHover: "hover:bg-slate-50/80 dark:hover:bg-slate-700/50",
      accentText: "text-blue-600 dark:text-blue-400",
    },
    pink: {
      border: "border-pink-100 dark:border-pink-900/30",
      thead: "sticky top-0 z-10 bg-pink-50 dark:bg-pink-950 text-slate-600 dark:text-pink-200",
      rowHover: "hover:bg-pink-50/50 dark:hover:bg-pink-900/5",
      accentText: "text-pink-600 dark:text-pink-400",
    },
  }[color];

  return (
    <div className="flex-1 overflow-hidden p-2 flex flex-col min-h-0">
      <div
        className={`flex-1 overflow-auto border rounded-xl shadow-sm bg-white dark:bg-slate-800 ${theme.border}`}
      >
        <table className="w-full text-left border-collapse">
          <thead className={theme.thead}>
            <tr>
              {headers.map((h, i) => (
                <th
                  key={h}
                  onClick={() => (h === "日付" || h === "寄付日") && onSort?.(h)}
                  className={`p-3 text-xs font-bold uppercase border-b dark:border-slate-700 
                    ${h === "日付" || h === "寄付日" ? "cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors" : ""}
                    ${i === headers.length - 1 ? "text-center" : ""}`}
                >
                  <div className="flex items-center gap-1">
                    {h}
                    {/* ソート状態のアイコンを表示 */}
                    {(h === "日付" || h === "寄付日") && (
                      <span className="text-[10px]">{sortOrder === "asc" ? "▲" : "▼"}</span>
                    )}
                  </div>
                </th>
              ))}
              <th className="p-3 text-xs font-bold uppercase border-b dark:border-slate-700 text-center">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {rows.map((row) => (
              <tr key={row.id} className={`transition-colors ${theme.rowHover}`}>
                {row.cells.map((cell, i) => (
                  <td
                    key={`${row.id}-${i}`}
                    className={`p-3 text-sm ${typeof cell === "number" || (typeof cell === "string" && cell.startsWith("¥")) ? "text-right font-mono" : ""}`}
                  >
                    {cell}
                  </td>
                ))}
                <td className="p-3 text-center">
                  {/* 編集ボタンを追加 */}
                  <button
                    type="button"
                    onClick={() => {
                      console.log("クリックされたID：", row.id);
                      onEdit?.(row.id);
                    }}
                    className="text-blue-600 hover:text-blue-800 font-bold text-xs p-1"
                  >
                    ✏️ 編集
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(row.id)}
                    className="text-red-500 hover:text-red-700 font-bold text-xs p-1"
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="p-10 text-center text-slate-400 text-sm">{emptyMessage}</div>
        )}
      </div>
    </div>
  );
};
