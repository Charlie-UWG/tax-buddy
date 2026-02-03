"use client";

// biome-ignore assist/source/organizeImports: < IGNORE >
import { useState, useEffect, useMemo, useId } from "react"; // 💡 useIdを追加import type { MedicalRecord, MedicalCategory } from "@/types/medical";
import DatePicker, { registerLocale } from "react-datepicker";
import { ja } from "date-fns/locale/ja"; // 日本語化用
import "react-datepicker/dist/react-datepicker.css";
import type { MedicalRecord, MedicalCategory } from "@/types/medical";

registerLocale("ja", ja);

export default function MedicalTaxDeductionPage() {
  const hospitalListId = useId(); // 💡 ユニークなIDを生成（例: ":r1:" のような文字列）
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [formData, setFormData] = useState<Omit<MedicalRecord, "id">>({
    date: new Date().toISOString().split("T")[0],
    patientName: "",
    providerName: "",
    category: "診療・治療",
    amount: 0,
    reimbursement: 0,
  });
  // 1. 履歴を管理する箱を作る（State）
  const [history, setHistory] = useState<{ hospitals: string[]; cities: string[] }>({
    hospitals: [],
    cities: [],
  });

  useEffect(() => {
    // 1. 医療費データを読み込む（既存のキー名 "medical-records" に合わせます）
    const savedData = localStorage.getItem("medical-records");
    if (savedData) {
      setRecords(JSON.parse(savedData)); // setData ではなく setRecords に修正
    }

    // 2. 入力候補の履歴を読み込む
    const savedHistory = localStorage.getItem("taxbuddy_history");
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory));
    }
  }, []); // 空の配列 [] なので、アプリ起動時に1回だけ実行されます

  // 保存
  useEffect(() => {
    localStorage.setItem("medical-records", JSON.stringify(records));
  }, [records]);

  // --- 計算ロジック (useMemoで最適化) ---
  const stats = useMemo(() => {
    const total = records.reduce((sum, r) => sum + r.amount, 0);
    const totalReimbursement = records.reduce((sum, r) => sum + r.reimbursement, 0);
    const netExpense = total - totalReimbursement;
    const deduction = Math.max(0, netExpense - 100000); // 10万円控除
    const estimatedRefund = Math.floor(deduction * 0.2); // 所得税・住民税概算20%

    return { total, netExpense, deduction, estimatedRefund };
  }, [records]);

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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-center mb-8 text-blue-600 dark:text-blue-400">
          TaxBuddy 🩺🎁
        </h1>{" "}
        <button
          type="button"
          onClick={exportToCsv}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition flex items-center gap-2 text-sm font-bold"
        >
          📊 Numbers形式で書き出す
        </button>
      </div>

      {/* 集計ダッシュボード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <p className="text-xs text-slate-500 font-bold mb-1">実質負担額 (支払-補填)</p>
          <p className="text-2xl font-mono font-bold">¥{stats.netExpense.toLocaleString()}</p>
        </div>
        <div
          className={`p-4 rounded-xl border transition-colors ${stats.deduction > 0 ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-slate-200 dark:border-slate-700 opacity-60"}`}
        >
          <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mb-1">
            控除対象額 (概算)
          </p>
          <p className="text-2xl font-mono font-bold">¥{stats.deduction.toLocaleString()}</p>
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
              /* 💡 エラーの原因になる popperModifiers は一旦すべて削除します */
              /* 代わりに、標準プロパティだけで位置を調整します */
              popperPlacement="bottom-start"
              calendarClassName="large-calendar"
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
            placeholder="病院名・薬局名を入力"
            list={hospitalListId} // 💡 中身を {hospitalListId} に変更            placeholder="病院・薬局名"
            className="p-2 border rounded-md dark:bg-slate-700 dark:text-white dark:border-slate-600"
            value={formData.providerName}
            onChange={(e) => setFormData({ ...formData, providerName: e.target.value })}
            required
          />
          {/* 💡 候補を表示するためのリストを追加 */}
          <datalist id={hospitalListId}>
            {" "}
            {/* 💡 ここも同じ変数にする */}{" "}
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
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
        <table className="w-full text-left border-collapse bg-white dark:bg-slate-800">
          <thead className="bg-slate-50 text-slate-600 dark:bg-slate-700 dark:text-slate-200">
            <tr>
              <th className="p-3 text-xs font-bold uppercase tracking-wider border-b dark:border-slate-600">
                日付
              </th>
              <th className="p-3 text-xs font-bold uppercase tracking-wider border-b dark:border-slate-600">
                氏名
              </th>
              <th className="p-3 text-xs font-bold uppercase tracking-wider border-b dark:border-slate-600">
                場所
              </th>
              <th className="p-3 text-xs font-bold uppercase tracking-wider border-b dark:border-slate-600">
                区分
              </th>
              <th className="p-3 text-xs font-bold uppercase tracking-wider border-b dark:border-slate-600 text-right">
                金額
              </th>
              <th className="p-3 text-xs font-bold uppercase tracking-wider border-b dark:border-slate-600 text-center">
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
                <td className="p-3 text-xs text-slate-500 dark:text-slate-400">{r.category}</td>
                <td className="p-3 text-right font-mono font-medium">
                  ¥{r.amount.toLocaleString()}
                </td>
                <td className="p-3 text-center">
                  <button
                    type="button"
                    onClick={() => setRecords(records.filter((rec) => rec.id !== r.id))}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded transition-colors text-xs font-bold"
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {records.length === 0 && (
          <div className="p-10 text-center text-slate-400 text-sm">
            データがありません。領収書を入力してください。
          </div>
        )}
      </div>
    </main>
  );
}
