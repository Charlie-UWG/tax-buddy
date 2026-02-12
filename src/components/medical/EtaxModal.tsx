import type { FC } from "react";

interface EtaxSummary {
  providerName: string;
  patientName?: string;
  totalAmount?: number;
  totalReimbursement: number;
}

interface EtaxModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: EtaxSummary[];
}

export const EtaxModal: React.FC<EtaxModalProps> = ({ isOpen, onClose, summary }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border-4 border-blue-500/20">
        <div className="p-8 border-b dark:border-slate-700 flex justify-between items-center bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-900/20">
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
              <span className="bg-blue-600 text-white text-xs py-1 px-3 rounded-full font-black tracking-widest">
                E-TAX
              </span>
              病院別の合計額
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-bold">
              このままe-Taxの「医療費集計」欄に入力してください
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

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="grid gap-3">
            {summary.map((item) => (
              <div
                key={`${item.providerName}-${item.patientName}`} // 名前と病院のペアでユニークにする
                className="flex justify-between items-center p-5 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border-2 border-slate-100 dark:border-slate-600 hover:border-blue-200 transition-colors group"
              >
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {item.patientName}
                  </span>
                  <span className="text-lg font-black text-slate-700 dark:text-slate-200">
                    {item.providerName}
                  </span>
                </div>
                <div className="text-right">
                  {/* totalAmount を使用するように修正 */}
                  <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                    ¥{(item.totalAmount ?? 0).toLocaleString()}{" "}
                  </span>
                  {item.totalReimbursement > 0 && (
                    <p className="text-[10px] font-bold text-red-400">
                      (補填額 ¥{item.totalReimbursement.toLocaleString()} 差引済)
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

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
