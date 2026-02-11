# TaxBuddy ディレクトリ設計図 (v1.3.0 リファクタリング案)

## 🏗 ディレクトリ構造
src/
├── components/          # 再利用可能なUI部品
│   ├── ui/              # 汎用部品（Button, Table, Modalのベース）
│   ├── medical/         # 医療費控除専用のコンポーネント
│   │   ├── MedicalForm.tsx
│   │   ├── EtaxModal.tsx
│   │   └── TrashModal.tsx
│   └── furusato/        # ふるさと納税専用のコンポーネント
│       ├── FurusatoForm.tsx
│       └── FurusatoList.tsx
├── hooks/               # ビジネスロジック・状態管理
│   ├── useMedicalData.ts   # 医療費のCRUD・保存・計算
│   └── useFurusatoData.ts  # ふるさと納税のCRUD・保存・計算
├── types/               # TypeScript 型定義
│   └── index.ts         # RecordやHistoryの型
├── utils/               # 共通の関数（日付フォーマット、CSV解析など）
│   └── format.ts
└── page.tsx             # メインレイアウト（各コンポーネントの配置のみ）

## 🔄 データの流れ
1. `page.tsx` が `hooks` を呼び出して最新の状態を取得
2. 各 `components` に props としてデータや関数を渡す
3. `hooks` 内の `useEffect` が Electron API を通じて `data.json` と同期