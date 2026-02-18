// src/components/furusato/FurusatoModal.tsx
import type { FC } from "react";
import type { FurusatoRecord } from "@/types/tax";

interface FurusatoModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: FurusatoRecord[];
}

export const FurusatoModal: FC<FurusatoModalProps> = ({ isOpen, onClose, records }) => {
  if (!isOpen) return null;

  const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border-4 border-pink-500/20">
        {/* ヘッダー */}
        <div className="p-8 border-b dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-pink-50 to-transparent dark:from-pink-900/20">
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
              <span className="bg-pink-600 text-white text-xs py-1 px-3 rounded-full font-black tracking-widest">
                e-Tax
              </span>
              寄附金受領明細
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-bold">
              合計 {records.length} 件：¥{totalAmount.toLocaleString()}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors text-2xl"
          >
            ✕
          </button>
        </div>

        {/* リスト部分 */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="grid gap-4">
            {records.map((r) => (
              <div
                key={r.id}
                className="flex justify-between items-center p-5 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border-2 border-slate-100 dark:border-slate-600 transition-all hover:border-pink-200"
              >
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    {r.date}
                  </span>
                  <span className="text-lg font-black text-slate-700 dark:text-slate-200">
                    {r.city}
                  </span>
                  {r.memo && (
                    <span className="text-xs text-slate-500 font-bold mt-1">🎁 {r.memo}</span>
                  )}
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <span className="text-2xl font-mono font-black text-pink-600 dark:text-pink-400">
                    ¥{r.amount.toLocaleString()}
                  </span>
                  <div
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      r.isOneStop ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                    }`}
                  >
                    {r.isOneStop ? "ワンストップ特例" : "確定申告対象"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* フッター */}
        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 text-center border-t dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-10 py-4 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-800 rounded-2xl font-black hover:scale-105 transition-transform shadow-lg"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
