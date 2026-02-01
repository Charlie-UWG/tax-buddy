"use client";

// biome-ignore assist/source/organizeImports: < IGNORE >
import { useState, useEffect } from "react";
import type { MedicalRecord, MedicalCategory } from "@/types/medical";

export default function MedicalTaxDeductionPage() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [formData, setFormData] = useState<Omit<MedicalRecord, "id">>({
    date: new Date().toISOString().split("T")[0],
    patientName: "",
    providerName: "",
    category: "診療・治療",
    amount: 0,
    reimbursement: 0,
  });

  // 初回読み込み時にLocalStorageからデータを取得
  useEffect(() => {
    const saved = localStorage.getItem("medical-records");
    if (saved) setRecords(JSON.parse(saved));
  }, []);

  // 記録が更新されるたびに保存
  useEffect(() => {
    localStorage.setItem("medical-records", JSON.stringify(records));
  }, [records]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord: MedicalRecord = {
      ...formData,
      id: crypto.randomUUID(),
    };
    setRecords([newRecord, ...records]);
    // フォームを一部リセット（日付や名前は連続入力のために残すのがコツ）
    setFormData({ ...formData, providerName: "", amount: 0, reimbursement: 0 });
  };

  // CSV書き出し用の関数
  const exportToCsv = () => {
    if (records.length === 0) return alert("データがありません");

    // Numbersで開けるようにヘッダーを定義
    const headers = ["日付", "受診者", "病院・薬局", "区分", "支払金額", "補填金額"];
    
    // データをCSVの行に変換
    const rows = records.map(r => [
      r.date,
      r.patientName,
      r.providerName,
      r.category,
      r.amount,
      r.reimbursement
    ].join(","));

    // UTF-8のBOMを先頭に付与（これ重要！）
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([bom, csvContent], { type: "text/csv;charset=utf-8;" });
    
    // ダウンロード処理
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `医療費控除明細_${new Date().getFullYear()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="p-8 max-w-5xl mx-auto font-sans min-h-screen transition-colors duration-300 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">🏥 医療費控除管理アプリ</h1>
        <button 
          type="button"
          onClick={exportToCsv}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition flex items-center gap-2"
        >
          📊 Numbers形式で書き出す
        </button>
      </div>
      {/* 入力フォーム */}
      <form onSubmit={handleSubmit} className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg mb-8 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <input
            type="date"
            className="p-2 border rounded dark:bg-slate-700 dark:text-white"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="受診者の氏名"
            className="p-2 border rounded dark:bg-slate-700 dark:text-white"
            value={formData.patientName}
            onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
            required
          />
          <input
            type="text"
            placeholder="病院・薬局名"
            className="p-2 border rounded dark:bg-slate-700 dark:text-white"
            value={formData.providerName}
            onChange={(e) => setFormData({ ...formData, providerName: e.target.value })}
            required
          />
          <select
            className="p-2 border rounded dark:bg-slate-700 dark:text-white"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as MedicalCategory })}
          >
            <option>診療・治療</option>
            <option>医薬品購入</option>
            <option>介護サービス</option>
            <option>その他の医療費（交通費など）</option>
          </select>
          <div className="flex items-center gap-2">
            <span className="text-sm">支払額:</span>
            <input
              type="number"
              className="p-2 border rounded dark:bg-slate-700 dark:text-white w-full"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              required
            />
          </div>
          <button type="submit" className="bg-blue-600 text-white rounded font-bold hover:bg-blue-700 transition">
            追加する
          </button>
        </div>
      </form>

      {/* データ一覧 */}
      <div className="overflow-x-auto shadow-md rounded-lg">
        <table className="w-full text-left border-collapse bg-white dark:bg-slate-800">
          <thead className="bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">
            <tr>
              <th className="p-3 border">日付</th>
              <th className="p-3 border">氏名</th>
              <th className="p-3 border">場所</th>
              <th className="p-3 border">区分</th>
              <th className="p-3 border text-right">金額</th>
              <th className="p-3 border">操作</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                <td className="p-3 border text-sm">{r.date}</td>
                <td className="p-3 border text-sm">{r.patientName}</td>
                <td className="p-3 border text-sm">{r.providerName}</td>
                <td className="p-3 border text-xs">{r.category}</td>
                <td className="p-3 border text-right font-mono">¥{r.amount.toLocaleString()}</td>
                <td className="p-3 border text-center">
                  <button 
                    type="button"
                    onClick={() => setRecords(records.filter(rec => rec.id !== r.id))}
                    className="text-red-500 hover:underline text-xs"
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}