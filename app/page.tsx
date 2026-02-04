"use client";

// biome-ignore assist/source/organizeImports: < IGNORE >
import { useState, useEffect, useMemo, useId } from "react"; // 💡 useIdを追加import type { MedicalRecord, MedicalCategory } from "@/types/medical";
import DatePicker, { registerLocale } from "react-datepicker";
import { ja } from "date-fns/locale/ja"; // 日本語化用
import "react-datepicker/dist/react-datepicker.css";
import type { MedicalRecord, MedicalCategory, FurusatoRecord } from "@/types/tax";

registerLocale("ja", ja);

export default function MedicalTaxDeductionPage() {
  const hospitalListId = useId(); // 💡 ユニークなIDを生成（例: ":r1:" のような文字列）
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
  });

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

    // 💡 2. ふるさと納税データを読み込む（これを追加！）
    const savedFurusato = localStorage.getItem("furusato-records");
    if (savedFurusato) {
      setFurusatoRecords(JSON.parse(savedFurusato));
    }

    // 3. 入力候補（サジェスト）の履歴を読み込む
    const savedHistory = localStorage.getItem("taxbuddy_history");
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
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

  const handleSubmit = (e: React.FormEvent) => {
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
  const handleFurusatoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord: FurusatoRecord = {
      ...furusatoForm,
      id: crypto.randomUUID(),
    };
    setFurusatoRecords([newRecord, ...furusatoRecords]);
    // 自治体名も履歴（サジェスト）に追加したければここでupdateHistory的な処理を呼ぶ（後ほど）
    setFurusatoForm({ ...furusatoForm, city: "", amount: 0, memo: "" });
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

  return (
    <main className="p-8 max-w-5xl mx-auto font-sans min-h-screen transition-colors duration-300 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {/* ヘッダー部分 */}
      <div className="flex justify-between items-center mb-8">
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
      <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6 w-full max-w-md mx-auto shadow-inner">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <p className="text-xs text-slate-500 font-bold mb-1">実質負担額 (医療費)</p>
          <p className="text-2xl font-mono font-bold">¥{stats.netExpense.toLocaleString()}</p>
        </div>
        <div
          className={`p-4 rounded-xl border transition-colors ${stats.medicalDeduction > 0 ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-slate-200 dark:border-slate-700 opacity-60"}`}
        >
          <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mb-1">
            医療費控除額 (概算)
          </p>
          <p className="text-2xl font-mono font-bold">¥{stats.medicalDeduction.toLocaleString()}</p>
        </div>
        <div
          className={`p-4 rounded-xl border transition-colors ${stats.estimatedRefund > 0 ? "border-green-500 bg-green-50 dark:bg-green-900/20 shadow-lg shadow-green-500/10" : "border-slate-200 dark:border-slate-700 opacity-60"}`}
        >
          <p className="text-xs text-green-600 dark:text-green-400 font-bold mb-1">
            還付・減税見込額
          </p>
          <p className="text-2xl font-mono font-bold text-green-600 dark:text-green-400">
            ¥{stats.estimatedRefund.toLocaleString()}
          </p>
        </div>
      </div>

      {/* --- 医療費モードの内容 --- */}
      {activeTab === "medical" && (
        <div className="animate-in fade-in duration-300">
          {/* 入力フォーム */}
          <form
            onSubmit={handleSubmit}
            className="bg-slate-50 dark:bg-slate-800 p-6 rounded-xl mb-8 border border-slate-200 dark:border-slate-700 shadow-sm"
          >
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="flex flex-col">
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
                  popperPlacement="bottom-start"
                  className="p-3 text-lg border-2 rounded-xl font-bold w-full dark:bg-slate-700 dark:text-white dark:border-slate-600 outline-none focus:ring-4 focus:ring-blue-500/20 cursor-pointer"
                />
              </div>
              <input
                type="text"
                placeholder="受診者の氏名"
                className="p-2 border rounded-md dark:bg-slate-700 dark:text-white dark:border-slate-600"
                value={formData.patientName}
                onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="病院・薬局名"
                list={hospitalListId}
                className="p-2 border rounded-md dark:bg-slate-700 dark:text-white dark:border-slate-600"
                value={formData.providerName}
                onChange={(e) => setFormData({ ...formData, providerName: e.target.value })}
                required
              />
              <datalist id={hospitalListId}>
                {history.hospitals.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
              <select
                className="p-2 border rounded-md dark:bg-slate-700 dark:text-white dark:border-slate-600"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value as MedicalCategory })
                }
              >
                <option>診療・治療</option>
                <option>医薬品購入</option>
                <option>介護サービス</option>
                <option>その他の医療費（交通費など）</option>
              </select>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 whitespace-nowrap">金額:</span>
                <input
                  type="number"
                  className="p-2 border rounded-md dark:bg-slate-700 dark:text-white dark:border-slate-600 w-full font-mono"
                  value={formData.amount || ""}
                  onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                  onFocus={(e) => e.target.select()}
                  required
                />
              </div>
              <button
                type="submit"
                className="bg-blue-600 text-white rounded-md font-bold hover:bg-blue-700 transition shadow-md active:scale-95"
              >
                追加する
              </button>
            </div>
          </form>

          {/* データ一覧 */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm bg-white dark:bg-slate-800">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                <tr>
                  <th className="p-3 text-xs font-bold uppercase border-b dark:border-slate-600">
                    日付
                  </th>
                  <th className="p-3 text-xs font-bold uppercase border-b dark:border-slate-600">
                    氏名
                  </th>
                  <th className="p-3 text-xs font-bold uppercase border-b dark:border-slate-600">
                    場所
                  </th>
                  <th className="p-3 text-xs font-bold uppercase border-b dark:border-slate-600 text-right">
                    金額
                  </th>
                  <th className="p-3 text-xs font-bold uppercase border-b dark:border-slate-600 text-center">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {records.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <td className="p-3 text-sm">{r.date}</td>
                    <td className="p-3 text-sm">{r.patientName}</td>
                    <td className="p-3 text-sm">{r.providerName}</td>
                    <td className="p-3 text-right font-mono">¥{r.amount.toLocaleString()}</td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => setRecords(records.filter((rec) => rec.id !== r.id))}
                        className="text-red-500 font-bold text-xs"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {records.length === 0 && (
              <div className="p-10 text-center text-slate-400">データがありません</div>
            )}
          </div>
        </div>
      )}

      {/* --- ふるさと納税モードの内容 --- */}
      {/* --- ふるさと納税モードの内容 --- */}
      {activeTab === "furusato" && (
        <div className="animate-in fade-in duration-300">
          <form
            onSubmit={handleFurusatoSubmit}
            className="bg-pink-50/50 dark:bg-pink-900/10 p-6 rounded-xl mb-8 border border-pink-100 dark:border-pink-900/30 shadow-sm"
          >
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {/* 日付 */}
              <DatePicker
                selected={furusatoForm.date ? new Date(furusatoForm.date) : null}
                onChange={(date: Date | null) => {
                  if (date) {
                    setFurusatoForm({ ...furusatoForm, date: date.toISOString().split("T")[0] });
                  }
                }}
                locale="ja"
                dateFormat="yyyy/MM/dd"
                className="p-3 text-lg border-2 rounded-xl font-bold w-full dark:bg-slate-700 dark:border-slate-600 outline-none focus:ring-4 focus:ring-pink-500/20"
              />

              {/* 自治体名 */}
              <input
                type="text"
                placeholder="寄付先の自治体名"
                className="p-2 border rounded-md dark:bg-slate-700 dark:text-white dark:border-slate-600"
                value={furusatoForm.city}
                onChange={(e) => setFurusatoForm({ ...furusatoForm, city: e.target.value })}
                required
              />

              {/* 金額 */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">金額:</span>
                <input
                  type="number"
                  className="p-2 border rounded-md dark:bg-slate-700 w-full font-mono"
                  value={furusatoForm.amount || ""}
                  onChange={(e) =>
                    setFurusatoForm({ ...furusatoForm, amount: Number(e.target.value) })
                  }
                  required
                />
              </div>

              {/* メモ */}
              <input
                type="text"
                placeholder="返礼品のメモ（例：お米10kg）"
                className="p-2 border rounded-md dark:bg-slate-700 col-span-2"
                value={furusatoForm.memo}
                onChange={(e) => setFurusatoForm({ ...furusatoForm, memo: e.target.value })}
              />

              {/* ワンストップ特例スイッチ */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="w-5 h-5 accent-pink-500"
                  checked={furusatoForm.isOneStop}
                  onChange={(e) =>
                    setFurusatoForm({ ...furusatoForm, isOneStop: e.target.checked })
                  }
                />
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                  ワンストップ特例を利用
                </span>
              </label>

              {/* 追加ボタン */}
              <button
                type="submit"
                className="bg-pink-600 text-white rounded-md font-bold hover:bg-pink-700 transition shadow-md active:scale-95 md:col-start-3"
              >
                寄付を追加
              </button>
            </div>
          </form>

          {/* ここに後で「ふるさと納税の一覧テーブル」を追加します */}
        </div>
      )}
      {/* ふるさと納税・データ一覧 */}
      <div className="overflow-x-auto border border-pink-100 dark:border-pink-900/30 rounded-xl shadow-sm bg-white dark:bg-slate-800">
        <table className="w-full text-left border-collapse">
          <thead className="bg-pink-50 text-slate-600 dark:bg-pink-900/20 dark:text-pink-200">
            <tr>
              <th className="p-3 text-xs font-bold uppercase border-b dark:border-slate-700">
                寄付日
              </th>
              <th className="p-3 text-xs font-bold uppercase border-b dark:border-slate-700">
                自治体
              </th>
              <th className="p-3 text-xs font-bold uppercase border-b dark:border-slate-700 text-right">
                金額
              </th>
              <th className="p-3 text-xs font-bold uppercase border-b dark:border-slate-700">
                返礼品メモ
              </th>
              <th className="p-3 text-xs font-bold uppercase border-b dark:border-slate-700 text-center">
                特例
              </th>
              <th className="p-3 text-xs font-bold uppercase border-b dark:border-slate-700 text-center">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-pink-50 dark:divide-pink-900/10">
            {furusatoRecords.map((r) => (
              <tr
                key={r.id}
                className="hover:bg-pink-50/50 dark:hover:bg-pink-900/5 transition-colors"
              >
                <td className="p-3 text-sm font-mono">{r.date}</td>
                <td className="p-3 text-sm font-bold">{r.city}</td>
                <td className="p-3 text-right font-mono text-pink-600 dark:text-pink-400">
                  ¥{r.amount.toLocaleString()}
                </td>
                <td className="p-3 text-xs text-slate-500">{r.memo}</td>
                <td className="p-3 text-center text-xs">
                  {r.isOneStop ? (
                    <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                      適用
                    </span>
                  ) : (
                    <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                      申告
                    </span>
                  )}
                </td>
                <td className="p-3 text-center">
                  <button
                    type="button"
                    onClick={() =>
                      setFurusatoRecords(furusatoRecords.filter((rec) => rec.id !== r.id))
                    }
                    className="text-red-400 hover:text-red-600 p-1"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {furusatoRecords.length === 0 && (
          <div className="p-10 text-center text-slate-400 text-sm">寄付の記録がありません。</div>
        )}
      </div>
    </main>
  );
}
