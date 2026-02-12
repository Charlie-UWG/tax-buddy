import type { FC } from "react";
import type { MedicalRecord } from "@/types/tax";

interface UndoToastProps {
  show: boolean;
  lastDeleted: MedicalRecord | null;
  onRestore: (record: MedicalRecord) => void;
  onClose: () => void;
}

export const UndoToast: FC<UndoToastProps> = ({ show, lastDeleted, onRestore, onClose }) => {
  if (!show || !lastDeleted) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 z-[100] animate-in slide-in-from-bottom-4">
      <span className="text-sm font-bold">データを削除しました</span>
      <button
        type="button"
        onClick={() => {
          // 安全に復元を実行
          onRestore(lastDeleted);
          onClose();
        }}
        className="text-yellow-400 font-black text-sm pl-4 border-l border-slate-600 hover:text-yellow-300 transition-colors"
      >
        元に戻す
      </button>
    </div>
  );
};
