# リファクタリング・タスクリスト

- [ ] **Phase 1: 型の整理**
  - [ ] `src/types/index.ts` を作成し、Medical/Furusatoの型を移動
- [ ] **Phase 2: コンポーネントの切り出し (UI)**
  - [ ] `EtaxModal.tsx` の抽出
  - [ ] `TrashModal.tsx` の抽出
  - [ ] `MedicalForm.tsx` の抽出
- [ ] **Phase 3: ロジックの抽出 (Hooks)**
  - [ ] `useMedicalData.ts` の作成（保存・削除・ゴミ箱ロジックの移動）
  - [ ] `useFurusatoData.ts` の作成
- [ ] **Phase 4: 統合**
  - [ ] `page.tsx` をクリーンアップし、新コンポーネントで再構成