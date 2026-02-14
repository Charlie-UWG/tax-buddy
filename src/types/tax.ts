// 医療費レコードの型
export interface MedicalRecord {
  id: string;
  date: string;
  patientName: string;
  providerName: string;
  category: string;
  amount: number;
  reimbursement: number;
}

// 入力履歴（サジェスト用）の型
export interface History {
  patientNames: string[];
  providerNames: string[];
  cities: string[];
}

// 医療費の区分（e-Taxの集計などで使用）
export type MedicalCategory = "診療代" | "薬代" | "交通費" | "その他";

// ふるさと納税レコードの型
export interface FurusatoRecord {
  id: string;
  date: string;
  city: string;
  amount: number;
  memo?: string;
  isOneStop: boolean;
  isReceived: boolean;
}

// 保存データの全体構造（JSON用）
export interface AppData {
  medical: MedicalRecord[];
  furusato: FurusatoRecord[];
  history: History;
  deleted?: MedicalRecord[];
}
