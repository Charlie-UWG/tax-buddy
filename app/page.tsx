"use client";

import { ja } from "date-fns/locale/ja";
import { type SyntheticEvent, useMemo, useState } from "react";
import { registerLocale } from "react-datepicker";
import { FurusatoForm } from "@/components/furusato/FurusatoForm";
import { FurusatoModal } from "@/components/furusato/FurusatoModal";
import { ETagCategoryChecks } from "@/components/medical/EtagCategoryChecks";
import { EtaxModal } from "@/components/medical/EtaxModal";
import { MedicalForm } from "@/components/medical/MedicalForm";
import { TrashModal } from "@/components/medical/TrashModal";
import { UndoToast } from "@/components/medical/UndoToast";
import { useMedicalData } from "@/hooks/useMedicalData";
import type { FurusatoRecord, MedicalRecord } from "@/types/tax";
import { TaxCard } from "../components/TaxCard";
import { TaxTable } from "../components/TaxTable";

registerLocale("ja", ja);

export default function TaxBuddyPage() {
  // --- 1. Hooksからすべてのデータと操作を取得 ---
  const {
    records,
    deletedRecords,
    furusatoRecords,
    deletedFurusato,
    history,
    isLoading,
    upsertRecord,
    deleteRecord,
    restoreRecord,
    upsertFurusato,
    deleteFurusato,
    restoreFurusato,
    toggleFurusatoReceived,
    updateCitiesHistory,
    clearTrash,
    exportToCsv,
    importFromCsv,
    sortOrder,
    toggleSort,
  } = useMedicalData();

  // --- 2. フォーム用ステート ---
  const [activeTab, setActiveTab] = useState<"medical" | "furusato">("medical");

  const [formData, setFormData] = useState<Omit<MedicalRecord, "id">>({
    date: new Date().toISOString().split("T")[0],
    patientName: "",
    providerName: "",
    category: "診療代",
    amount: 0,
    reimbursement: 0,
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const [furusatoForm, setFurusatoForm] = useState<Omit<FurusatoRecord, "id">>({
    date: new Date().toISOString().split("T")[0],
    city: "",
    amount: 0,
    memo: "",
    isOneStop: false,
    isReceived: false,
  });

  // --- 3. モーダル・トースト表示制御 ---
  const [showEtaxModal, setShowEtaxModal] = useState(false);
  const [showTrashModal, setShowTrashModal] = useState(false);
  const [isFurusatoModalOpen, setIsFurusatoModalOpen] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  const [lastDeleted, setLastDeleted] = useState<MedicalRecord | null>(null);
  const [showFurusatoUndo, setShowFurusatoUndo] = useState(false);
  const [lastDeletedFurusato, setLastDeletedFurusato] = useState<FurusatoRecord | null>(null);

  // --- 4. 計算ロジック ---
  const etaxSummary = useMemo(() => {
    const summaryMap: Record<string, any> = {};
    records.forEach((r) => {
      const key = `${r.patientName}-${r.providerName}`;
      if (!summaryMap[key]) {
        summaryMap[key] = {
          patientName: r.patientName,
          providerName: r.providerName,
          totalAmount: 0,
          totalReimbursement: 0,
          usedCategories: new Set<string>(),
        };
      }
      summaryMap[key].usedCategories.add(r.category);
      summaryMap[key].totalAmount += r.amount;
      summaryMap[key].totalReimbursement += r.reimbursement;
    });
    return Object.values(summaryMap);
  }, [records]);

  const stats = useMemo(() => {
    const total = records.reduce((sum, r) => sum + r.amount, 0);
    const totalReimbursement = records.reduce((sum, r) => sum + r.reimbursement, 0);
    const netExpense = total - totalReimbursement;
    const medicalDeduction = Math.max(0, netExpense - 100000);
    const furusatoTotal = furusatoRecords.reduce((sum, r) => sum + r.amount, 0);
    const estimatedRefund = Math.floor(medicalDeduction * 0.2) + Math.max(0, furusatoTotal - 2000);

    return { total, netExpense, medicalDeduction, furusatoTotal, estimatedRefund };
  }, [records, furusatoRecords]);

  // --- 5. ハンドラー関数 ---
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await upsertRecord({ ...formData, id: editingId || crypto.randomUUID() } as MedicalRecord);
    setEditingId(null);
    setFormData({ ...formData, amount: 0, reimbursement: 0 });
  };

  const handleDelete = async (id: string) => {
    const deleted = await deleteRecord(id);
    if (deleted) {
      setLastDeleted(deleted);
      setShowUndo(true);
      setTimeout(() => setShowUndo(false), 5000);
    }
  };

  const handleFurusatoSubmit = async (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    await upsertFurusato({ ...furusatoForm, id: crypto.randomUUID() } as FurusatoRecord);
    setFurusatoForm({ ...furusatoForm, city: "", amount: 0, memo: "" });
  };

  const handleFurusatoDelete = async (id: string) => {
    const deleted = await deleteFurusato(id);
    if (deleted) {
      setLastDeletedFurusato(deleted);
      setShowFurusatoUndo(true);
      setTimeout(() => setShowFurusatoUndo(false), 5000);
    }
  };

  if (isLoading) return <div className="min-h-screen bg-white dark:bg-slate-900" />;

  return (
    <main className="h-screen flex flex-col overflow-hidden p-8 max-w-5xl mx-auto font-sans transition-colors duration-300 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {/* ヘッダーエリア */}
      <div className="flex justify-between items-center mb-8 flex-none">
        <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400">TaxBuddy 🩺🎁</h1>
        <div className="flex gap-2">
          <label className="bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 transition text-sm font-bold cursor-pointer">
            📥 CSVを取り込む
            <input type="file" accept=".csv" className="hidden" onChange={importFromCsv} />
          </label>
          <button
            type="button"
            onClick={exportToCsv}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition text-sm font-bold"
          >
            📊 Numbers書き出し
          </button>
        </div>
      </div>

      {/* タブ切り替え */}
      <div className="flex flex-none p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6 w-full max-w-md mx-auto shadow-inner">
        <button
          type="button"
          onClick={() => setActiveTab("medical")}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === "medical" ? "bg-white dark:bg-slate-700 text-blue-600 shadow-sm" : "text-slate-500"}`}
        >
          🩺 医療費
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("furusato")}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === "furusato" ? "bg-white dark:bg-slate-700 text-pink-600 shadow-sm" : "text-slate-500"}`}
        >
          🎁 ふるさと納税
        </button>
      </div>

      {/* 統計カード */}
      <div className="flex-none grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 text-right">
        <TaxCard label="実質負担 (医療費)" amount={stats.netExpense} color="slate" />
        <TaxCard label="医療費控除 (概算)" amount={stats.medicalDeduction} color="blue" />
        <TaxCard label="ふるさと納税合計" amount={stats.furusatoTotal} color="pink" />
        <TaxCard label="還付・減税見込" amount={stats.estimatedRefund} color="green" />
      </div>

      {/* メインコンテンツエリア */}
      {activeTab === "medical" ? (
        <div className="animate-in fade-in duration-300 flex-1 flex flex-col overflow-y-auto pr-2 custom-scrollbar">
          <MedicalForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            editingId={editingId}
            history={history}
            onCancelEdit={() => setEditingId(null)}
          />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8 pb-20">
            {/* 左側：入力明細テーブル */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <div className="flex justify-between">
                <h3 className="font-bold text-blue-600">📋 入力明細</h3>
                <button
                  type="button"
                  onClick={() => setShowTrashModal(true)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  🗑️ ゴミ箱 ({deletedRecords.length})
                </button>
              </div>
              <TaxTable
                color="blue"
                headers={["日付", "氏名", "場所", "金額"]}
                rows={records.map((r) => ({
                  id: r.id,
                  cells: [r.date, r.patientName, r.providerName, `¥${r.amount.toLocaleString()}`],
                }))}
                onDelete={handleDelete}
                onEdit={(id) => {
                  const r = records.find((rec) => rec.id === id);
                  if (r) {
                    setEditingId(r.id);
                    setFormData(r);
                  }
                }}
                onSort={() => toggleSort("medical")}
                sortOrder={sortOrder}
              />
            </div>

            {/* 右側：e-Taxサマリーエリア (ここを完全に復元しました) */}
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-4">
                <span className="bg-blue-500 text-white text-[10px] py-0.5 px-2 rounded font-black">
                  e-Tax用
                </span>
                病院別の合計
              </h3>
              <button
                type="button"
                onClick={() => setShowEtaxModal(true)}
                className="w-full mb-4 bg-white dark:bg-slate-700 py-2 rounded-lg text-blue-600 font-black text-[10px] border border-slate-200 shadow-sm"
              >
                🔍 全画面で大きく表示
              </button>

              <div className="flex flex-col gap-3">
                {etaxSummary.length > 0 ? (
                  etaxSummary.map((s) => (
                    <div
                      key={`${s.patientName}-${s.providerName}`}
                      className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-3 shadow-sm"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-[11px] text-slate-400 font-black leading-tight mb-1">
                            {s.patientName}
                          </span>
                          <span className="text-base font-black truncate dark:text-slate-100">
                            {s.providerName}
                          </span>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <span className="text-blue-600 dark:text-blue-400 font-mono font-black text-lg">
                            ¥{s.totalAmount.toLocaleString()}
                          </span>
                          {s.totalReimbursement > 0 && (
                            <span className="text-pink-600 text-xs font-bold">
                              ▲¥{s.totalReimbursement.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                        <ETagCategoryChecks usedCategories={s.usedCategories} />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-xs text-slate-400 py-10">データがありません</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ふるさと納税タブコンテンツ */
        <div className="animate-in fade-in duration-300 flex-1 flex flex-col overflow-y-auto pr-2 custom-scrollbar">
          <FurusatoForm
            formData={furusatoForm}
            setFormData={setFurusatoForm}
            onSubmit={handleFurusatoSubmit}
            history={history}
            onCancelEdit={() => setFurusatoForm({ ...furusatoForm, city: "", amount: 0 })}
          />
          <div className="flex justify-between items-center mb-4 mt-0">
            <h3 className="font-black text-pink-600">📋 寄付明細</h3>
            <button
              type="button"
              onClick={() => setIsFurusatoModalOpen(true)}
              className="text-xs font-black bg-pink-50 text-pink-600 px-3 py-1.5 rounded-xl hover:bg-pink-100 transition-colors"
            >
              🔍 全画面表示
            </button>
          </div>
          <div className="flex mb-4">
            <span className="text-xs font-bold text-slate-400">
              🗑️ ゴミ箱 ({deletedFurusato.length})
            </span>
          </div>
          <TaxTable
            headers={["受領", "寄付日", "自治体", "金額", "メモ", "特例"]}
            color="pink"
            rows={furusatoRecords.map((r) => ({
              id: r.id,
              cells: [
                <input
                  key={r.id}
                  type="checkbox"
                  checked={r.isReceived}
                  onChange={() => toggleFurusatoReceived(r.id)}
                  className="w-5 h-5 accent-pink-600"
                />,
                r.date,
                r.city,
                `¥${r.amount.toLocaleString()}`,
                r.memo || "-",
                r.isOneStop ? "適用" : "申告",
              ],
            }))}
            onDelete={handleFurusatoDelete}
            onSort={() => toggleSort("furusato")}
            sortOrder={sortOrder}
          />
        </div>
      )}

      {/* モーダル類 */}
      <EtaxModal
        isOpen={showEtaxModal}
        onClose={() => setShowEtaxModal(false)}
        summary={etaxSummary}
      />
      <TrashModal
        isOpen={showTrashModal}
        onClose={() => setShowTrashModal(false)}
        deletedRecords={deletedRecords}
        onRestore={restoreRecord}
        onClearAll={clearTrash}
      />
      <FurusatoModal
        isOpen={isFurusatoModalOpen}
        onClose={() => setIsFurusatoModalOpen(false)}
        records={furusatoRecords}
      />

      {/* トースト類 */}
      <UndoToast
        show={showUndo}
        lastDeleted={lastDeleted}
        onRestore={() => lastDeleted && restoreRecord(lastDeleted)}
        onClose={() => setShowUndo(false)}
      />
      <UndoToast
        show={showFurusatoUndo}
        lastDeleted={lastDeletedFurusato}
        onRestore={() => lastDeletedFurusato && restoreFurusato(lastDeletedFurusato)}
        onClose={() => setShowFurusatoUndo(false)}
      />
    </main>
  );
}
