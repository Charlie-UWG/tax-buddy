"use client";

import { ja } from "date-fns/locale/ja";
import { useEffect, useMemo, useState } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import type { FurusatoRecord, MedicalCategory, MedicalRecord } from "@/types/tax";
import "react-datepicker/dist/react-datepicker.css";
import type { SyntheticEvent } from "react";
import { EtaxModal } from "@/components/medical/EtaxModal";
import { TrashModal } from "@/components/medical/TrashModal";
import { UndoToast } from "@/components/medical/UndoToast";
import { SuggestInput } from "../components/SuggestInput";
import { TaxCard } from "../components/TaxCard";
import { TaxForm, TaxLabel } from "../components/TaxForm";
import { TaxTable } from "../components/TaxTable";

registerLocale("ja", ja);

// e-Taxの4区分を判定して表示するパーツ
const ETagCategoryChecks = ({ usedCategories }: { usedCategories: Set<string> }) => {
  const categories = [
    { label: "診", id: "診療・治療" },
    { label: "薬", id: "医薬品購入" },
    { label: "介", id: "介護サービス" },
    { label: "他", id: "その他の医療費（交通費など）" },
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

export default function TaxBuddyPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"medical" | "furusato">("medical");
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [furusatoRecords, setFurusatoRecords] = useState<FurusatoRecord[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<MedicalRecord, "id">>({
    date: new Date().toISOString().split("T")[0],
    patientName: "",
    providerName: "",
    category: "診療・治療",
    amount: 0,
    reimbursement: 0,
  });
  const [furusatoForm, setFurusatoForm] = useState<Omit<FurusatoRecord, "id">>({
    date: new Date().toISOString().split("T")[0],
    city: "",
    amount: 0,
    memo: "",
    isOneStop: false,
    isReceived: false,
  });
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [history, setHistory] = useState<{ hospitals: string[]; cities: string[] }>({
    hospitals: [],
    cities: [],
  });
  const [showEtaxModal, setShowEtaxModal] = useState(false);
  const [deletedRecords, setDeletedRecords] = useState<MedicalRecord[]>([]);
  const [showTrashModal, setShowTrashModal] = useState(false);
  const [lastDeleted, setLastDeleted] = useState<MedicalRecord | null>(null);
  const [showUndo, setShowUndo] = useState(false);

  // 1. 集計ロジック（補填金額の集計も追加）
  const etaxSummary = useMemo(() => {
    const summaryMap: Record<
      string,
      {
        patientName: string;
        providerName: string;
        totalAmount: number;
        totalReimbursement: number; // 追加
        usedCategories: Set<string>;
      }
    > = {};
    records.forEach((r) => {
      const key = `${r.patientName}-${r.providerName}`;
      if (!summaryMap[key]) {
        summaryMap[key] = {
          patientName: r.patientName,
          providerName: r.providerName,
          totalAmount: 0,
          totalReimbursement: 0, // 初期化
          usedCategories: new Set(),
        };
      }
      summaryMap[key].totalAmount += r.amount;
      summaryMap[key].totalReimbursement += r.reimbursement || 0; // 加算
      summaryMap[key].usedCategories.add(r.category);
    });
    return Object.values(summaryMap);
  }, [records]);

  // 2. JSON読み込みロジック（Intel Mac対応リトライ版）
  useEffect(() => {
    const initData = async () => {
      // APIが準備されるまで最大2秒待つ（Intel Mac等の遅延対策）
      let retryCount = 0;
      while (!window.electronAPI && retryCount < 20) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        retryCount++;
      }

      const api = window.electronAPI;
      if (!api) {
        console.warn("electronAPI is not available yet.");
        setMounted(true);
        return;
      }

      try {
        const savedData = await api.loadData();
        console.log("Loaded data:", savedData);
        if (savedData) {
          // 各ステートへの反映（データが存在する場合のみ）
          if (savedData.medical) setRecords(savedData.medical);
          if (savedData.furusato) setFurusatoRecords(savedData.furusato);
          if (savedData.history) setHistory(savedData.history);
          // ゴミ箱データの復元を追加
          if (savedData.deleted) setDeletedRecords(savedData.deleted);
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      }

      setMounted(true);
    };
    initData();
  }, []);

  // 3. JSON保存ロジック
  useEffect(() => {
    if (mounted) {
      const dataToSave = {
        medical: records,
        furusato: furusatoRecords,
        history: history,
        deleted: deletedRecords, // ★ここを追加！
      };

      // デバッグ用：保存される内容をコンソールで確認
      console.log("Saving data including deleted items:", dataToSave);

      window.electronAPI?.saveData(dataToSave);
    }
  }, [records, furusatoRecords, history, deletedRecords, mounted]);

  // 4. 計算ロジック (ダッシュボード用)
  const stats = useMemo(() => {
    const total = records.reduce((sum, r) => sum + r.amount, 0);
    const totalReimbursement = records.reduce((sum, r) => sum + r.reimbursement, 0);
    const netExpense = total - totalReimbursement;
    const medicalDeduction = Math.max(0, netExpense - 100000);
    const furusatoTotal = furusatoRecords.reduce((sum, r) => sum + r.amount, 0);
    const estimatedRefund = Math.floor(medicalDeduction * 0.2) + Math.max(0, furusatoTotal - 2000);

    return { total, netExpense, medicalDeduction, furusatoTotal, estimatedRefund };
  }, [records, furusatoRecords]);

  // レコード編集開始処理（医療費）
  const startEdit = (record: MedicalRecord) => {
    setEditingId(record.id);
    setFormData({
      date: record.date,
      patientName: record.patientName,
      providerName: record.providerName,
      category: record.category,
      amount: record.amount,
      reimbursement: record.reimbursement,
    });
    // フォームまでスクロールさせる
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // 5. フォーム追加・更新処理 (医療費)
  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (editingId) {
      // 更新ロジック
      setRecords(records.map((r) => (r.id === editingId ? { ...formData, id: editingId } : r)));
      setEditingId(null);
    } else {
      // 新規追加ロジック
      const newRecord: MedicalRecord = { ...formData, id: crypto.randomUUID() };
      setRecords([newRecord, ...records]);
    }

    if (formData.providerName) {
      const newHospitals = Array.from(new Set([formData.providerName, ...history.hospitals])).slice(
        0,
        10,
      );
      setHistory({ ...history, hospitals: newHospitals });
    }
    setFormData({
      ...formData,
      providerName: "",
      amount: 0,
      reimbursement: 0,
    });
  };

  // 6. フォーム送信処理 (ふるさと納税)
  const handleFurusatoSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newRecord: FurusatoRecord = { ...furusatoForm, id: crypto.randomUUID() };
    setFurusatoRecords([newRecord, ...furusatoRecords]);

    if (furusatoForm.city) {
      const newCities = Array.from(new Set([furusatoForm.city, ...history.cities])).slice(0, 10);
      setHistory({ ...history, cities: newCities });
    }
    setFurusatoForm({ ...furusatoForm, city: "", amount: 0, memo: "" });
  };

  const toggleFurusatoReceived = (id: string) => {
    setFurusatoRecords(
      furusatoRecords.map((r) => (r.id === id ? { ...r, isReceived: !r.isReceived } : r)),
    );
  };

  const exportToCsv = () => {
    if (records.length === 0) return alert("データがありません");
    const headers = ["日付", "受診者", "病院・薬局", "区分", "支払金額", "補填金額"];
    const rows = records.map((r) =>
      [r.date, r.patientName, r.providerName, r.category, r.amount, r.reimbursement].join(","),
    );
    const bom = new Uint8Array([0xef, 0xbb, 0xbf]);
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([bom, csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `医療費控除明細_${new Date().getFullYear()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importFromCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").slice(1); // ヘッダー（1行目）を飛ばす

      const importedRecords: MedicalRecord[] = lines
        .filter((line) => line.trim() !== "") // 空行を除外
        .map((line) => {
          // CSVの列：日付, 受診者, 病院名, 区分, 金額, 補填額
          const [date, patientName, providerName, category, amount, reimbursement] =
            line.split(",");
          return {
            id: crypto.randomUUID(), // 新しいIDを付与
            date: date?.trim(),
            patientName: patientName?.trim(),
            providerName: providerName?.trim(),
            category: category?.trim() as MedicalCategory,
            amount: Number(amount) || 0,
            reimbursement: Number(reimbursement) || 0,
          };
        });

      if (importedRecords.length > 0) {
        if (confirm(`${importedRecords.length}件のデータを追加しますか？`)) {
          setRecords((prev) => [...importedRecords, ...prev]);
          alert("インポートが完了しました！");
        }
      }
    };
    reader.readAsText(file);
  };

  const handleSort = (header: string) => {
    const nextOrder = sortOrder === "asc" ? "desc" : "asc";
    setSortOrder(nextOrder);
    if (activeTab === "medical") {
      setRecords(
        [...records].sort((a, b) =>
          nextOrder === "asc" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date),
        ),
      );
    } else {
      setFurusatoRecords(
        [...furusatoRecords].sort((a, b) =>
          nextOrder === "asc" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date),
        ),
      );
    }
  };

  // レコードの削除と復元のロジック
  const deleteRecord = (id: string) => {
    const target = records.find((r) => r.id === id);
    if (!target) return;

    // ゴミ箱に追加し、現在のリストから消す
    setDeletedRecords([target, ...deletedRecords]);
    setRecords(records.filter((r) => r.id !== id));

    // パターンB: クイック元に戻す通知
    setLastDeleted(target);
    setShowUndo(true);
    setTimeout(() => {
      setShowUndo(false);
    }, 5000);
  };

  // ゴミ箱から復元する関数
  const restoreRecord = (record: MedicalRecord) => {
    setRecords([record, ...records]);
    setDeletedRecords(deletedRecords.filter((r) => r.id !== record.id));
    // const undoDelete = () => {
    //   if (deletedRecords.length > 0) {
    //     const lastDeleted = deletedRecords[deletedRecords.length - 1];
    //     setRecords((prev) => [...prev, lastDeleted]);
    //     setDeletedRecords((prev) => prev.slice(0, -1));
    //     setShowUndo(false);
    //   }
  };

  if (!mounted) return <div className="min-h-screen bg-white dark:bg-slate-900" />;

  return (
    <main className="h-screen flex flex-col overflow-hidden p-8 max-w-5xl mx-auto font-sans min-h-screen transition-colors duration-300 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <div className="flex justify-between items-center mb-8 flex-none">
        <h1 className="text-3xl font-bold text-center text-blue-600 dark:text-blue-400">
          TaxBuddy 🩺🎁
        </h1>
        <div className="flex gap-2">
          {/* インポートボタン（見た目は普通のボタンですが、中身はファイル選択） */}
          <label className="bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 transition flex items-center gap-2 text-sm font-bold cursor-pointer">
            📥 CSVを取り込む
            <input type="file" accept=".csv" className="hidden" onChange={importFromCsv} />
          </label>

          <button
            type="button"
            onClick={exportToCsv}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition flex items-center gap-2 text-sm font-bold"
          >
            📊 Numbers形式で書き出す
          </button>
        </div>
      </div>

      <div className="flex flex-none p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6 w-full max-w-md mx-auto shadow-inner">
        <button
          type="button"
          onClick={() => setActiveTab("medical")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === "medical" ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
        >
          🩺 医療費控除
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("furusato")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === "furusato" ? "bg-white dark:bg-slate-700 shadow-sm text-pink-600 dark:text-pink-400" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
        >
          🎁 ふるさと納税
        </button>
      </div>

      <div className="flex-none grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 text-right">
        <TaxCard label="実質負担額 (医療費)" amount={stats.netExpense} color="slate" />
        <TaxCard label="医療費控除額 (概算)" amount={stats.medicalDeduction} color="blue" />
        <TaxCard label="ふるさと納税合計" amount={stats.furusatoTotal} color="pink" />
        <TaxCard label="還付・減税見込額" amount={stats.estimatedRefund} color="green" />
      </div>

      {activeTab === "medical" && (
        <div className="animate-in fade-in duration-300 flex-1 flex flex-col overflow-y-auto pr-2 custom-scrollbar">
          <TaxForm
            onSubmit={handleSubmit}
            color={editingId ? "orange" : "blue"} // 編集時は色を変えると分かりやすい
            buttonText={editingId ? "修正を保存する" : "医療費を追加"}
          >
            <div className="flex flex-col gap-1">
              <TaxLabel>受診日</TaxLabel>
              <DatePicker
                selected={formData.date ? new Date(formData.date) : null}
                onChange={(date: Date | null) => {
                  if (date) {
                    const yyyy = date.getFullYear();
                    const mm = String(date.getMonth() + 1).padStart(2, "0");
                    const dd = String(date.getDate()).padStart(2, "0");
                    setFormData({ ...formData, date: `${yyyy}-${mm}-${dd}` });
                  }
                }}
                locale="ja"
                dateFormat="yyyy/MM/dd"
                className="p-3 text-lg border-2 rounded-xl font-bold w-full h-[52px] dark:bg-slate-700 dark:border-slate-600 outline-none focus:ring-4 focus:ring-blue-500/20 cursor-pointer"
              />
            </div>
            <div className="flex flex-col gap-1">
              <TaxLabel>氏名</TaxLabel>
              <input
                type="text"
                placeholder="氏名"
                className="h-[52px] p-2 border rounded-md dark:bg-slate-700 dark:text-white dark:border-slate-600"
                value={formData.patientName}
                onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <TaxLabel>病院・薬局</TaxLabel>
              <SuggestInput
                placeholder="病院・薬局名"
                value={formData.providerName}
                onChange={(val) => setFormData({ ...formData, providerName: val })}
                suggestions={history.hospitals}
                className="h-[52px]"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <TaxLabel>区分</TaxLabel>
              <select
                className="h-[52px] p-2 border-2 rounded-xl dark:bg-slate-700 dark:text-white dark:border-slate-600"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value as MedicalCategory })
                }
              >
                <option value="診療・治療">診療・治療</option>
                <option value="医薬品購入">医薬品購入</option>
                <option value="介護サービス">介護サービス</option>
                <option value="その他の医療費（交通費など）">その他の医療費（交通費など）</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <TaxLabel>金額</TaxLabel>
              <input
                type="number"
                placeholder="金額"
                className="h-[52px] p-2 border rounded-md dark:bg-slate-700 text-right"
                value={formData.amount || ""}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                required
              />
            </div>
            {/* 金額入力の次に追加 */}
            <div className="flex flex-col gap-1">
              <TaxLabel>補填金額</TaxLabel>
              <input
                type="number"
                placeholder="保険金など"
                className="h-[52px] p-2 border rounded-md dark:bg-slate-700 text-right text-pink-500 font-bold"
                value={formData.reimbursement || ""}
                onChange={(e) =>
                  setFormData({ ...formData, reimbursement: Number(e.target.value) })
                }
              />
              <p className="text-[10px] text-slate-400">※保険金や高額療養費で戻る額</p>
            </div>
            {/* 編集中のときだけ「キャンセル」ボタンを出す（お好みで） */}
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setFormData({ ...formData, providerName: "", amount: 0, reimbursement: 0 });
                }}
                className="mt-2 text-xs text-slate-500 underline"
              >
                編集をキャンセル
              </button>
            )}
          </TaxForm>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8 pb-20">
            <div className="lg:col-span-2 flex flex-col gap-4">
              <h3 className="font-bold flex items-center gap-2 text-blue-600">📋 入力明細</h3>
              <button
                type="button"
                onClick={() => setShowTrashModal(true)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1"
              >
                🗑️ ゴミ箱 ({deletedRecords.length})
              </button>
              <TaxTable
                headers={["日付", "氏名", "場所", "金額"]}
                color="blue"
                rows={records.map((r) => ({
                  id: r.id,
                  cells: [
                    r.date,
                    r.patientName,
                    r.providerName,
                    `¥${r.amount.toLocaleString()}`,
                    <div key={`actions-${r.id}`} className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(r)} // 手順1-②で作る関数
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                        title="編集"
                      >
                        ✏️
                      </button>
                    </div>,
                  ],
                }))}
                onDelete={(id) => deleteRecord(id)}
                emptyMessage="医療費のデータがありません"
                sortOrder={sortOrder}
                onSort={handleSort}
              />
            </div>

            <div className="flex flex-col gap-4">
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-4">
                  <span className="bg-blue-500 text-white text-[10px] py-0.5 px-2 rounded font-black">
                    e-Tax用
                  </span>
                  病院別の合計
                </h3>

                {/* ↓ここが追加する拡大ボタンです */}
                <button
                  type="button"
                  onClick={() => setShowEtaxModal(true)}
                  className="flex items-center gap-1 text-[10px] bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2 py-1.5 rounded-lg shadow-sm hover:shadow-md hover:translate-y-[-1px] transition-all font-black text-blue-600 dark:text-blue-400 hover: cursor-pointer mb-4"
                >
                  🔍 全画面で大きく表示
                </button>

                {etaxSummary.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {etaxSummary.map((s) => (
                      <div
                        key={`${s.patientName}-${s.providerName}`}
                        className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-3 shadow-sm min-h-[100px]"
                      >
                        {/* 上段：名前と金額のエリア */}
                        <div className="flex justify-between items-start gap-2">
                          {/* 左側：受診者と病院名（幅を確保して折り返しを防ぐ） */}
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-[11px] text-slate-400 font-black leading-tight mb-1">
                              {s.patientName}
                            </span>
                            <span className="text-base font-black truncate leading-tight dark:text-slate-100">
                              {s.providerName}
                            </span>
                          </div>

                          {/* 右側：金額（右寄せを固定） */}
                          <div className="flex flex-col items-end shrink-0 ml-2">
                            <span className="text-blue-600 dark:text-blue-400 font-mono font-black text-lg leading-none">
                              ¥{s.totalAmount.toLocaleString()}
                            </span>
                            {s.totalReimbursement > 0 && (
                              <span className="text-pink-600 dark:text-pink-400 font-mono font-black text-base mt-1 leading-none">
                                ▲ ¥{s.totalReimbursement.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 下段：区分チェック（線を引いて独立させる） */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                          <ETagCategoryChecks usedCategories={s.usedCategories} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-xs text-slate-400">データなし</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "furusato" && (
        <div className="animate-in fade-in duration-300 flex-1 flex flex-col overflow-y-auto pr-2 custom-scrollbar">
          <TaxForm onSubmit={handleFurusatoSubmit} color="pink" buttonText="寄付を追加">
            <div className="flex flex-col gap-1">
              <TaxLabel>寄付日</TaxLabel>
              <DatePicker
                selected={furusatoForm.date ? new Date(furusatoForm.date) : null}
                onChange={(date: Date | null) => {
                  if (date)
                    setFurusatoForm({ ...furusatoForm, date: date.toISOString().split("T")[0] });
                }}
                locale="ja"
                dateFormat="yyyy/MM/dd"
                className="p-3 text-lg border-2 rounded-xl font-bold w-full dark:bg-slate-700 dark:border-slate-600 outline-none focus:ring-4 focus:ring-pink-500/20 cursor-pointer"
              />
            </div>
            <div className="flex flex-col gap-1">
              <TaxLabel>自治体名</TaxLabel>
              <SuggestInput
                placeholder="寄付先の自治体名"
                value={furusatoForm.city}
                onChange={(val) => setFurusatoForm({ ...furusatoForm, city: val })}
                suggestions={history.cities}
                className="h-[52px]"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <TaxLabel>金額</TaxLabel>
              <input
                type="number"
                placeholder="金額"
                className="h-[52px] p-2 border rounded-md dark:bg-slate-700"
                value={furusatoForm.amount || ""}
                onChange={(e) =>
                  setFurusatoForm({ ...furusatoForm, amount: Number(e.target.value) })
                }
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <TaxLabel>返礼品のメモ</TaxLabel>
              <input
                type="text"
                placeholder="返礼品のメモ"
                className="h-[52px] p-2 border rounded-md dark:bg-slate-700"
                value={furusatoForm.memo}
                onChange={(e) => setFurusatoForm({ ...furusatoForm, memo: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <TaxLabel>特例申請</TaxLabel>
              <label className="flex items-center gap-2 p-3 border-2 rounded-xl dark:border-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 accent-pink-600"
                  checked={furusatoForm.isOneStop}
                  onChange={(e) =>
                    setFurusatoForm({ ...furusatoForm, isOneStop: e.target.checked })
                  }
                />
                <span className="text-sm font-bold dark:text-slate-300">利用する</span>
              </label>
            </div>
          </TaxForm>

          <TaxTable
            headers={["証明書", "寄付日", "自治体", "金額", "メモ", "特例"]}
            color="pink"
            rows={furusatoRecords.map((r) => ({
              id: r.id,
              cells: [
                <input
                  key={`check-${r.id}`}
                  type="checkbox"
                  checked={r.isReceived || false}
                  onChange={() => toggleFurusatoReceived(r.id)}
                  className="w-5 h-5 cursor-pointer accent-pink-600"
                />,
                r.date,
                r.city,
                `¥${r.amount.toLocaleString()}`,
                r.memo,
                r.isOneStop ? "適用" : "申告",
              ],
            }))}
            onDelete={(id) => setFurusatoRecords(furusatoRecords.filter((rec) => rec.id !== id))}
            emptyMessage="寄付の記録がありません"
            onSort={handleSort}
            sortOrder={sortOrder}
          />
        </div>
      )}
      {/* モーダルウィンドウ */}
      <EtaxModal
        isOpen={showEtaxModal}
        onClose={() => setShowEtaxModal(false)}
        summary={etaxSummary}
      />
      {/* 後略 */}

      <TrashModal
        isOpen={showTrashModal}
        onClose={() => setShowTrashModal(false)}
        deletedRecords={deletedRecords}
        onRestore={restoreRecord}
        onClearAll={() => setDeletedRecords([])}
      />

      {/* パターンB: クイック元に戻す通知（トースト） */}
      <UndoToast
        show={showUndo}
        lastDeleted={lastDeleted}
        onRestore={restoreRecord}
        onClose={() => setShowUndo(false)}
      />
    </main>
  );
}
