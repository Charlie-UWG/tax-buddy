import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner"; // これも追加
import type { AppData, History, MedicalCategory, MedicalRecord } from "@/types/tax";

export const useMedicalData = () => {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [furusatoRecords, setFurusatoRecords] = useState<AppData["furusato"]>([]);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [deletedRecords, setDeletedRecords] = useState<MedicalRecord[]>([]);
  const [history, setHistory] = useState<History>({
    patientNames: [],
    providerNames: [],
    cities: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  // --- 1. 基本的な読み書き (省略せず実装) ---
  const loadData = useCallback(async () => {
    try {
      const data = await (window as any).electronAPI.readFile();
      if (data) {
        // JSON.parse は削除しました
        setRecords(data.medical || []);
        setFurusatoRecords(data.furusato || []);
        setDeletedRecords(data.deleted || []);
        setHistory(data.history || { patientNames: [], providerNames: [], cities: [] });
      }
    } catch (error) {
      console.error("読み込みエラー:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveData = useCallback(
    async (
      recs: MedicalRecord[],
      furu: AppData["furusato"],
      hist: History,
      del: MedicalRecord[],
    ) => {
      // 1. 保存する箱（オブジェクト）を作る。名前を JSON内の名前 と合わせる
      const updatedData = {
        medical: recs,
        furusato: furu,
        history: hist,
        deleted: del,
      };
      await (window as any).electronAPI.writeFile(updatedData);
    },
    [],
  );

  // ソート関数をフック内に追加
  const toggleSort = (target: "medical" | "furusato" = "medical") => {
    const nextOrder = sortOrder === "asc" ? "desc" : "asc";
    setSortOrder(nextOrder);

    if (target === "medical") {
      setRecords((prev) =>
        [...prev].sort((a, b) =>
          nextOrder === "asc" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date),
        ),
      );
    } else {
      // ふるさと納税のソート（まだHooks化していなければ、一旦保留でもOK）
    }
  };

  // --- 2. 操作関数 ---
  const upsertRecord = async (record: MedicalRecord) => {
    const isEdit = records.some((r) => r.id === record.id);
    const updatedRecords = isEdit
      ? records.map((r) => (r.id === record.id ? record : r))
      : [record, ...records];

    const newHistory: History = {
      ...history,
      patientNames: Array.from(
        new Set([record.patientName, ...(history.patientNames || []), record.patientName]),
      ),
      providerNames: Array.from(
        new Set([record.providerName, ...(history.providerNames || []), record.providerName]),
      ),
      cities: history.cities || [], // ここは医療費の履歴なので、都市は更新しない（必要なら別途関数を作る）
    };

    setRecords(updatedRecords);
    setHistory(newHistory);
    await saveData(updatedRecords, furusatoRecords, newHistory, deletedRecords);
  };

  const updateCitiesHistory = (city: string) => {
    const newCities = Array.from(new Set([city, ...history.cities])).slice(0, 10);
    const newHistory = { ...history, cities: newCities };
    setHistory(newHistory);
    // 保存も忘れずに（任意）
    saveData(records, furusatoRecords, newHistory, deletedRecords);
  };

  const deleteRecord = async (id: string) => {
    const recordToDelete = records.find((r) => r.id === id);
    if (!recordToDelete) return;
    const updatedRecords = records.filter((r) => r.id !== id);
    const updatedDeleted = [recordToDelete, ...deletedRecords];
    setRecords(updatedRecords);
    setDeletedRecords(updatedDeleted);
    await saveData(updatedRecords, furusatoRecords, history, updatedDeleted);

    if (typeof toast !== "undefined") {
      toast("ゴミ箱に移動しました", {
        action: {
          label: "元に戻す",
          onClick: () => restoreRecord(recordToDelete),
        },
      });
    }

    return recordToDelete;
  };

  const restoreRecord = async (record: MedicalRecord) => {
    const updatedRecords = [record, ...records].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    const updatedDeleted = deletedRecords.filter((r) => r.id !== record.id);
    setRecords(updatedRecords);
    setDeletedRecords(updatedDeleted);
    await saveData(updatedRecords, furusatoRecords, history, updatedDeleted);
  };

  // --- 3. CSV入出力ロジックの引っ越し ---
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
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").slice(1);
      const importedRecords: MedicalRecord[] = lines
        .filter((line) => line.trim() !== "")
        .map((line) => {
          const [date, patientName, providerName, category, amount, reimbursement] =
            line.split(",");
          return {
            id: crypto.randomUUID(),
            date: date?.trim() || "",
            patientName: patientName?.trim() || "",
            providerName: providerName?.trim() || "",
            category: (category?.trim() as MedicalCategory) || "診療代",
            amount: Number(amount) || 0,
            reimbursement: Number(reimbursement) || 0,
          };
        });

      if (importedRecords.length > 0) {
        if (confirm(`${importedRecords.length}件のデータを追加しますか？`)) {
          const newRecords = [...importedRecords, ...records];
          setRecords(newRecords);
          await saveData(newRecords, furusatoRecords, history, deletedRecords); // 保存も行う
          alert("インポートが完了しました！");
        }
      }
    };
    reader.readAsText(file);
  };

  return {
    records,
    deletedRecords,
    furusatoRecords,
    history,
    isLoading,
    sortOrder,
    toggleSort,
    upsertRecord,
    updateCitiesHistory,
    deleteRecord,
    restoreRecord,
    clearTrash: async () => {
      setDeletedRecords([]);
    },
    exportToCsv,
    importFromCsv,
  };
};
