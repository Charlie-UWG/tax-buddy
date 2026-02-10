"use client";

// biome-ignore assist/source/organizeImports: < IGNORE >
import { useState, useEffect, useMemo } from "react"; // 💡 useIdを追加import type { MedicalRecord, MedicalCategory } from "@/types/medical";
import DatePicker, { registerLocale } from "react-datepicker";
import { ja } from "date-fns/locale/ja"; // 日本語化用
import "react-datepicker/dist/react-datepicker.css";
import type { MedicalRecord, MedicalCategory, FurusatoRecord } from "@/types/tax";
import { TaxCard } from "../components/TaxCard";
import { SuggestInput } from "../components/SuggestInput";
import { TaxTable } from "../components/TaxTable";
import { TaxForm, TaxLabel } from "../components/TaxForm";
import type { SyntheticEvent } from "react";

registerLocale("ja", ja);

export default function TaxBuddyPage() {
  const [mounted, setMounted] = useState(false); // 💡 これを追加
  const [activeTab, setActiveTab] = useState<"medical" | "furusato">("medical");
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [furusatoRecords, setFurusatoRecords] = useState<FurusatoRecord[]>([]);
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
    isOneStop: true, // デフォルトでチェックあり
    isReceived: false,
  });
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc"); // ソート状態を管理するState

  // 1. 履歴を管理する箱を作る（State）
  const [history, setHistory] = useState<{ hospitals: string[]; cities: string[] }>({
    hospitals: [],
    cities: [],
  });

  useEffect(() => {
    // 1. 医療費データを読み込む
    const savedMedical = localStorage.getItem("medical-records");
    if (savedMedical) {
      setRecords(JSON.parse(savedMedical));
    }

    // 💡 2. ふるさと納税データを読み込む
    const savedFurusato = localStorage.getItem("furusato-records");
    if (savedFurusato) {
      setFurusatoRecords(JSON.parse(savedFurusato));
    }

    // 3. 入力候補（サジェスト）の履歴を読み込む
    const savedHistory = localStorage.getItem("taxbuddy_history");
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
    setMounted(true); // 💡 一番最後に追加！これで準備完了
  }, []); // 最初に1回だけ実行

  // 保存
  // 既存のuseEffect（保存用）を修正
  useEffect(() => {
    localStorage.setItem("medical-records", JSON.stringify(records));
    localStorage.setItem("furusato-records", JSON.stringify(furusatoRecords)); // 💡 これを追加！
  }, [records, furusatoRecords]);

  // --- 計算ロジック (useMemoで最適化) ---
  const stats = useMemo(() => {
    // 医療費の計算
    const total = records.reduce((sum, r) => sum + r.amount, 0);
    const totalReimbursement = records.reduce((sum, r) => sum + r.reimbursement, 0);
    const netExpense = total - totalReimbursement;
    const medicalDeduction = Math.max(0, netExpense - 100000);

    // 💡 ふるさと納税の計算を追加
    const furusatoTotal = furusatoRecords.reduce((sum, r) => sum + r.amount, 0);

    // 最終的な還付・減税見込（医療費控除分 + ふるさと納税は自己負担2000円を除く額が控除対象）
    const estimatedRefund = Math.floor(medicalDeduction * 0.2) + Math.max(0, furusatoTotal - 2000);

    return { total, netExpense, medicalDeduction, furusatoTotal, estimatedRefund };
  }, [records, furusatoRecords]); // 💡 両方の変化を監視

  // Electron側でJavaScriptの準備が整うまで、一旦「無」を返して不整合を防ぎます
  if (!mounted) {
    return <div className="min-h-screen bg-white dark:bg-slate-900" />;
  }

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newRecord: MedicalRecord = {
      ...formData,
      id: crypto.randomUUID(),
    };
    setRecords([newRecord, ...records]);

    // 💡 病院名を履歴に保存する処理を追加！
    if (formData.providerName) {
      // 重複を除去して最新10件を保持
      const newHospitals = Array.from(new Set([formData.providerName, ...history.hospitals])).slice(
        0,
        10,
      );

      const newHistory = { ...history, hospitals: newHospitals };
      setHistory(newHistory);

      // ローカルストレージにも保存して、ブラウザを閉じても忘れないようにする
      localStorage.setItem("taxbuddy_history", JSON.stringify(newHistory));
    }

    // フォームをリセット
    setFormData({ ...formData, providerName: "", amount: 0, reimbursement: 0 });
  };
  // ふるさと納税の保存処理（handleSubmitとは別に作成）
  const handleFurusatoSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newRecord: FurusatoRecord = {
      ...furusatoForm,
      id: crypto.randomUUID(),
    };
    setFurusatoRecords([newRecord, ...furusatoRecords]);
    // 💡 自治体名を履歴に保存
    if (furusatoForm.city) {
      const newCities = Array.from(new Set([furusatoForm.city, ...history.cities])).slice(0, 10);

      setHistory((prev) => {
        const updatedHistory = { ...prev, cities: newCities };
        localStorage.setItem("taxbuddy_history", JSON.stringify(updatedHistory));
        return updatedHistory;
      });
    }
    setFurusatoForm({ ...furusatoForm, city: "", amount: 0, memo: "" });
  };

  // 特定のレコードのチェック状態を反転させる関数
  const toggleFurusatoReceived = (id: string) => {
    const update = furusatoRecords.map((record) =>
      record.id === id ? { ...record, isReceived: !record.isReceived } : record,
    );
    setFurusatoRecords(update);
  };

  // CSVエクスポート機能
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

  // ソート機能を追加
  const handleSort = (header: string) => {
    const nextOrder = sortOrder === "asc" ? "desc" : "asc";
    setSortOrder(nextOrder);

    if (records.length === 0) {
      return;
    }
    if (activeTab === "medical") {
      // 医療費タブの場合のソート処理
      const sorted = [...records].sort((a, b) => {
        if (!a.date || !b.date) return 0;
        return nextOrder === "asc" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
      });
      setRecords(sorted);
    } else {
      // ふるさと納税タブの場合のソート処理
      const sortedFurusato = [...furusatoRecords].sort((a, b) => {
        if (!a.date || !b.date) return 0;
        return nextOrder === "asc" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
      });
      setFurusatoRecords(sortedFurusato);
    }
  };

  return (
    <main className="h-screen flex flex-col overflow-hidden p-8 max-w-5xl mx-auto font-sans min-h-screen transition-colors duration-300 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {/* ヘッダー部分 */}
      <div className="flex justify-between items-center mb-8 flex-none">
        <h1 className="text-3xl font-bold text-center text-blue-600 dark:text-blue-400">
          TaxBuddy 🩺🎁
        </h1>
        <button
          type="button"
          onClick={exportToCsv}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition flex items-center gap-2 text-sm font-bold"
        >
          📊 Numbers形式で書き出す
        </button>
      </div>

      {/* タブセレクター */}
      <div className="flex flex-none p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6 w-full max-w-md mx-auto shadow-inner">
        <button
          type="button"
          onClick={() => setActiveTab("medical")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === "medical"
              ? "bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          🩺 医療費控除
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("furusato")}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === "furusato"
              ? "bg-white dark:bg-slate-700 shadow-sm text-pink-600 dark:text-pink-400"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          🎁 ふるさと納税
        </button>
      </div>

      {/* 集計ダッシュボード (ここは常に表示) */}
      {/* 数値の表示は右寄せ */}
      <div className="flex-none grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 text-right">
        <TaxCard label="実質負担額 (医療費)" amount={stats.netExpense} color="slate" />
        <TaxCard label="医療費控除額 (概算)" amount={stats.medicalDeduction} color="blue" />
        <TaxCard label="ふるさと納税合計" amount={stats.furusatoTotal} color="pink" />
        <TaxCard label="還付・減税見込額" amount={stats.estimatedRefund} color="green" />
      </div>

      {/* --- 医療費モードの内容 --- */}
      {activeTab === "medical" && (
        <div className="animate-in fade-in duration-300 flex-1 flex flex-col overflow-hidden min-h-0">
          <TaxForm onSubmit={handleSubmit} color="blue" buttonText="医療費を追加">
            {/* 日付 */}
            <div className="flex flex-col gap-1">
              <TaxLabel>受診日</TaxLabel>
              <DatePicker
                selected={formData.date ? new Date(formData.date) : null}
                onChange={(date: Date | null) => {
                  if (date) {
                    // yyyy-mm-dd 形式で保存する場合
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
            {/* 氏名入力 */}
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
            {/* 医療機関名 */}
            <div className="flex flex-col gap-1">
              <TaxLabel>病院・薬局</TaxLabel>
              <SuggestInput
                placeholder="病院・薬局名"
                value={formData.providerName}
                onChange={(val) => setFormData({ ...formData, providerName: val })}
                suggestions={history.hospitals}
                className="h-[52px]" // ← ここで高さを指定！
                required
              />
            </div>
            {/* 医療カテゴリー */}
            <div className="flex flex-col gap-1">
              <TaxLabel>区分</TaxLabel>
              <select
                className="h-[52px] p-2 border-2 rounded-xl dark:bg-slate-700 dark:text-white dark:border-slate-600 outline-none focus:ring-4 focus:ring-blue-500/20"
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
            {/* 金額 */}
            <div className="flex flex-col gap-1">
              <TaxLabel>金額</TaxLabel>
              <input
                type="number"
                placeholder="金額"
                className="h-[52px] p-2 border rounded-md dark:bg-slate-700 text-right dark:text-white dark:border-slate-600"
                value={formData.amount || ""}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                required
              />
            </div>
          </TaxForm>
          {/* データ一覧 */}
          {/* --- 医療費のテーブル部分 --- */}
          <TaxTable
            headers={["日付", "氏名", "場所", "金額"]}
            color="blue"
            rows={records.map((r) => ({
              id: r.id,
              cells: [r.date, r.patientName, r.providerName, `¥${r.amount.toLocaleString()}`],
            }))}
            onDelete={(id) => setRecords(records.filter((rec) => rec.id !== id))}
            emptyMessage="医療費のデータがありません"
            sortOrder={sortOrder}
            onSort={handleSort}
          />
        </div>
      )}

      {/* --- ふるさと納税モードの内容 --- */}
      {activeTab === "furusato" && (
        <div className="animate-in fade-in duration-300 flex-1 flex flex-col overflow-hidden min-h-0">
          <TaxForm onSubmit={handleFurusatoSubmit} color="pink" buttonText="寄付を追加">
            {/* 日付 */}
            <div className="flex flex-col gap-1">
              <TaxLabel>寄付日</TaxLabel>
              <DatePicker
                selected={furusatoForm.date ? new Date(furusatoForm.date) : null}
                onChange={(date: Date | null) => {
                  if (date) {
                    setFurusatoForm({ ...furusatoForm, date: date.toISOString().split("T")[0] });
                  }
                }}
                locale="ja"
                dateFormat="yyyy/MM/dd"
                className="p-3 text-lg border-2 rounded-xl font-bold w-full dark:bg-slate-700 dark:border-slate-600 outline-none focus:ring-4 focus:ring-pink-500/20 cursor-pointer"
              />
            </div>
            {/* ふるさと納税の自治体名 */}
            <div className="flex flex flex-col gap-1">
              <TaxLabel>自治体名</TaxLabel>
              <SuggestInput
                placeholder="寄付先の自治体名"
                value={furusatoForm.city}
                onChange={(val) => setFurusatoForm({ ...furusatoForm, city: val })}
                suggestions={history.cities}
                className="h-[52px]" // ← ここで高さを指定！
                required
              />
            </div>
            {/* 金額 */}
            <div className="flex flex-col gap-1">
              <TaxLabel>金額</TaxLabel>
              <input
                type="number"
                placeholder="金額"
                className="h-[52px] p-2 border rounded-md dark:bg-slate-700 dark:text-white dark:border-slate-600"
                value={furusatoForm.amount || ""}
                onChange={(e) =>
                  setFurusatoForm({ ...furusatoForm, amount: Number(e.target.value) })
                }
                required
              />
            </div>
            {/* メモ */}
            <div className="flex flex-col gap-1">
              <TaxLabel>返礼品のメモ</TaxLabel>
              <input
                type="text"
                placeholder="返礼品のメモ（例：お米10kg）"
                className="h-[52px] p-2 border rounded-md dark:bg-slate-700 dark:text-white dark:border-slate-600"
                value={furusatoForm.memo}
                onChange={(e) => setFurusatoForm({ ...furusatoForm, memo: e.target.value })}
              />
            </div>
            {/* 5. ワンストップ特例（追加分） */}
            <div className="flex flex-col gap-1">
              <TaxLabel>特例申請</TaxLabel>
              <label className="flex items-center gap-2 p-3 border-2 rounded-xl dark:border-slate-600 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
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

          {/* ふるさと納税・データ一覧 */}
          {/* // --- ふるさと納税のテーブル部分 --- */}
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
    </main>
  );
}
