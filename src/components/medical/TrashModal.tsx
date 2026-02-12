import type { FC } from "react";
import type { MedicalRecord } from "@/types/tax"; // 後ほど型定義ファイルを整理する想定

interface TrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  deletedRecords: MedicalRecord[];
  onRestore: (record: MedicalRecord) => void;
  onClearAll: () => void;
}

export const TrashModal: FC<TrashModalProps> = ({
  isOpen,
  onClose,
  deletedRecords,
  onRestore,
  onClearAll,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-xl max-h-[80vh] flex flex-col shadow-2xl border dark:border-slate-700">
        <div className="p-6 border-b dark:border-slate-700 flex justify-between items-center">
          <h2 className="text-xl font-black flex items-center gap-2 text-slate-800 dark:text-white">
            🗑️ ゴミ箱
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-2xl transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {deletedRecords.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-400 font-bold">ゴミ箱は空です</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {deletedRecords.map((r) => (
                <div
                  key={r.id}
                  className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-slate-600 group hover:border-blue-300 transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {r.date}
                    </span>
                    <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                      {r.providerName}
                    </span>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                      ¥{r.amount.toLocaleString()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRestore(r)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-black transition-all hover:scale-105 active:scale-95"
                  >
                    復元する
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center border-t dark:border-slate-700">
          <p className="text-[10px] text-slate-400 font-bold px-2">
            ※ アプリを終了しても中身は保持されます
          </p>
          <button
            type="button"
            onClick={() => {
              if (confirm("ゴミ箱を完全に空にしますか？この操作は取り消せません。")) {
                onClearAll();
              }
            }}
            className="text-xs text-red-500 hover:text-red-600 font-black px-4 py-2 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
          >
            ゴミ箱を空にする
          </button>
        </div>
      </div>
    </div>
  );
};
