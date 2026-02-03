/**
 * 医療費控除の区分
 */
export type MedicalCategory =
  | "診療・治療"
  | "医薬品購入"
  | "介護サービス"
  | "その他の医療費（交通費など）";

/**
 * 医療費レコードの定義
 */
export interface MedicalRecord {
  id: string; // 一意のID（UUIDなど）
  date: string; // 受診日 (YYYY-MM-DD)
  patientName: string; // 診療を受けた人の氏名
  providerName: string; // 病院・薬局などの名称
  category: MedicalCategory; // 区分
  amount: number; // 支払った医療費（円）
  reimbursement: number; // 保険金などで補填される金額（円）
  isSelfMedication?: boolean; // セルフメディケーション税制対象かどうかのフラグ
}
