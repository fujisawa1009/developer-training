# 開発状況と今後の追加開発リスト

> 最終更新日: 2026-03-19

---

## 📊 開発済み機能

### ✅ 1. 認証・ユーザー管理
- ログイン/ログアウト（NextAuth.js）
- ユーザー作成・編集・削除
- ロール管理（learner/instructor/admin/hr）
- 権限の個別上書き機能（UserPermissionOverride）

### ✅ 2. 組織構造
- テナント（Tenant）
- 年度コーホート（CohortYear）
- 部署（Department）
- 講師-受講者の担当割り当て（InstructorLearner）

### ✅ 3. チェックリスト機能
- テンプレート管理（ChecklistTemplate）
- カテゴリ・項目の作成・編集・削除
- 学習ガイド（LearningGuide）Markdown編集
- 参考リンク（ResourceLink）管理
- ドラッグ&ドロップによる並び替え

### ✅ 4. 自己評価・講師評価
- 評価期間（EvaluationPeriod）管理
- 自己評価入力（S/A/B/C）
- 講師評価入力
- ギャップ表示機能
- 評価コメント機能

### ✅ 5. カリキュラムプラン
- プラン作成・編集・削除
- カリキュラムアイテムの追加（チェックリストカテゴリ/課題/カリキュラム）
- ドラッグ&ドロップによる順序変更（@dnd-kit）
- ユーザーへのプラン割り当て（UserCurriculumPlan）

### ✅ 6. カリキュラム（コース）・レッスン
- カリキュラム（Curriculum）管理（slug対応）
- レッスン（Lesson）管理（text/video/assignment）
- レッスン進捗管理（LessonProgress）
- Markdown表示・動画埋め込み
- ドラッグ&ドロップによる順序変更

### ✅ 7. 課題管理・提出
- 課題（Assignment）作成・管理（git/sql/program/debug）
- 提出（Submission）機能（下書き保存対応）
- 提出回数カウント（attemptNumber）
- GitHub URL/テキスト回答対応
- コメントスレッド機能（SubmissionComment）

### ✅ 8. 採点・レビュー
- レビュー機能（Review）
- 合格/不合格判定（passed: Boolean）
- 講師コメント
- 採点ステータス管理（pending/completed）

### ✅ 9. 通知機能
- 通知（Notification）一覧
- 既読/未読管理
- ベルアイコン表示（未読件数バッジ）
- 通知リンク機能

### ✅ 10. ダッシュボード
- 受講者向けダッシュボード
- 管理者ダッシュボード
- 基本的な進捗表示

### ✅ 11. レポート・エクスポート
- ユーザー別レポート（CSV）
- コーホート別レポート（CSV）
- 評価データ集計

### ✅ 12. UI/UX
- shadcn/ui コンポーネント
- Markdown レンダリング（react-markdown + remark-gfm）
- シンタックスハイライト（react-syntax-highlighter）
- ドラッグ&ドロップ（@dnd-kit）
- レスポンシブデザイン（Tailwind CSS v4）

---

## 🔧 追加開発が必要な機能

### Phase 2: 基本機能の完成

#### 1. **AI採点機能（Claude API連携）** 🔴
- [ ] Claude API統合（Anthropic SDK導入）
- [ ] 提出時の自動AI評価トリガー
- [ ] AI評価結果の保存（aiComment/aiScore）
- [ ] 講師による承認・修正フロー
- [ ] AI評価プロンプト設計・管理
- [ ] AI評価エラーハンドリング

**実装場所**
- `app/src/lib/ai-grading.ts`（新規）
- `app/src/app/api/submissions/[id]/ai-review/route.ts`（新規）
- `app/src/app/admin/submissions/[id]/page.tsx`（AI評価結果表示）

#### 2. **ユーザー招待フロー** 🔴
- [ ] 招待メール送信機能
- [ ] 招待トークン生成・検証
- [ ] 招待リンクからのアカウント作成画面
- [ ] 招待有効期限チェック（expiresAt）
- [ ] 招待の再送信機能

**実装場所**
- `app/src/app/api/auth/invite/send/route.ts`（新規）
- `app/src/app/auth/invite/[token]/page.tsx`（新規）
- `app/src/lib/mail.ts`（新規：メール送信ヘルパー）

#### 3. **パスワードリセット** 🔴
- [ ] パスワードリセット申請フォーム
- [ ] リセットトークン生成・保存
- [ ] リセットメール送信
- [ ] 新パスワード設定画面
- [ ] トークン有効期限検証

**実装場所**
- `app/src/app/auth/reset-password/page.tsx`（新規）
- `app/src/app/auth/reset-password/[token]/page.tsx`（新規）
- `app/src/app/api/auth/reset-password/route.ts`（新規）

#### 4. **通知トリガーの実装** 🔴
- [ ] 評価タイミング開始時の通知（→受講者）
- [ ] 自己評価完了時の通知（→講師）
- [ ] 講師評価完了時の通知（→受講者）
- [ ] 課題提出時の通知（→講師）
- [ ] 採点完了時の通知（→受講者）
- [ ] 評価遅延アラート（→管理者）
- [ ] コメント追加時の通知

**実装場所**
- `app/src/lib/notifications.ts`（拡張）
- 各アクション内での通知呼び出し追加

#### 5. **課題ステータスフロー改善** 🔴
- [ ] 差し戻し機能の実装（failed → draft）
- [ ] 再提出時のバージョン管理
- [ ] 提出履歴の表示
- [ ] 差し戻し理由コメント

**実装場所**
- `app/src/app/admin/submissions/[id]/page.tsx`（差し戻しボタン追加）
- `app/src/app/admin/submissions/actions.ts`（差し戻しアクション）

#### 6. **進捗ダッシュボードの拡充** 🟡
- [ ] カテゴリ別S/A/B/C分布グラフ（Chart.js / Recharts）
- [ ] レーダーチャート表示
- [ ] 課題提出状況の可視化
- [ ] 評価タイミングまでのカウントダウン
- [ ] 講師向け担当受講者一覧・比較
- [ ] HR向けコーホート別集計グラフ

**実装場所**
- `app/src/app/dashboard/page.tsx`（拡張）
- `app/src/components/charts/`（新規）

#### 7. **PDF エクスポート** 🟡
- [ ] 個人別レポートPDF生成（Puppeteer / Playwright）
- [ ] コーホート別レポートPDF生成
- [ ] 評価サマリ・グラフ付きレポート
- [ ] PDFテンプレート作成

**実装場所**
- `app/src/app/api/reports/users/[id]/pdf/route.ts`（新規）
- `app/src/app/api/reports/cohorts/[year]/pdf/route.ts`（新規）
- `app/src/lib/pdf.ts`（新規）

#### 8. **検索・フィルタ機能** 🟡
- [ ] ユーザー検索（名前・メール・ロール）
- [ ] カリキュラム検索
- [ ] 課題・提出物検索
- [ ] 評価履歴検索
- [ ] フィルタUI（shadcn/ui Combobox/Select）

**実装場所**
- 各一覧画面にフィルタコンポーネント追加

#### 9. **コンテンツ一括インポート** 🟡
- [ ] Markdown/YAMLファイルからの一括インポート
- [ ] カリキュラム・レッスン自動生成スクリプト
- [ ] チェックリスト項目一括登録（CSV/YAML）
- [ ] インポートバリデーション

**実装場所**
- `content/import.ts`（拡張）
- `app/src/app/admin/import/page.tsx`（新規：Web UIからのインポート）

---

### Phase 3: 高度な機能

#### 10. **マルチテナント対応** 🟢
- [ ] Prisma ミドルウェアでのテナント分離
- [ ] PostgreSQL RLS設定
- [ ] テナント管理画面
- [ ] テナント切り替え機能
- [ ] `current_setting('app.tenant_id')` 設定

**実装場所**
- `app/src/lib/prisma.ts`（ミドルウェア追加）
- `app/src/app/admin/tenants/`（新規）
- PostgreSQL マイグレーション

#### 11. **権限管理の細分化** 🟢
- [ ] 権限キーの体系化（permission.key 一覧定義）
- [ ] ロール別デフォルト権限設定
- [ ] ユーザー個別権限管理UI
- [ ] 権限チェックミドルウェア
- [ ] 権限ベースのUI表示制御

**実装場所**
- `app/src/lib/permissions.ts`（新規）
- `app/src/middleware.ts`（拡張）

#### 12. **外部連携** 🟢
- [ ] Slack通知連携（Webhook）
- [ ] メール通知（SendGrid / Resend）
- [ ] GitHub OAuth連携
- [ ] Google Calendar連携（評価期間の自動登録）

**実装場所**
- `app/src/lib/integrations/`（新規）

#### 13. **管理機能強化** 🟢
- [ ] 監査ログ（AuditLog モデル追加）
- [ ] アクティビティ履歴
- [ ] システム設定管理
- [ ] テナント別設定

**実装場所**
- `app/prisma/schema.prisma`（AuditLog モデル追加）
- `app/src/app/admin/audit-logs/`（新規）

#### 14. **モバイル対応** 🟢
- [ ] レスポンシブデザイン改善
- [ ] モバイル専用UI調整
- [ ] タッチ操作最適化

---

### Phase 4: SaaS展開準備

#### 15. **パフォーマンス最適化** 🟢
- [ ] データベースインデックス最適化
- [ ] キャッシュ戦略（Redis / Next.js Cache）
- [ ] ページネーション実装（全一覧画面）
- [ ] 画像最適化（Next.js Image）
- [ ] バンドルサイズ削減

#### 16. **テスト・品質管理** 🟢
- [ ] ユニットテスト（Vitest / Jest）
- [ ] E2Eテスト（Playwright）
- [ ] CI/CDパイプライン（GitHub Actions）
- [ ] エラー監視（Sentry）
- [ ] パフォーマンス監視（Vercel Analytics）

---

## 📋 優先度別整理

### 🔴 高優先度（MVPの完成に必要）
1. **AI採点機能**（Claude API連携）
2. **ユーザー招待フロー**（メール送信・トークン検証）
3. **パスワードリセット**
4. **通知トリガーの実装**（全イベント対応）
5. **差し戻し機能**の実装

### 🟡 中優先度（ユーザー体験向上）
6. **進捗ダッシュボードの拡充**（グラフ・チャート）
7. **PDFエクスポート**
8. **検索・フィルタ機能**
9. **コンテンツ一括インポート**

### 🟢 低優先度（将来的な拡張）
10. **マルチテナント対応**（RLS設定）
11. **外部連携**（Slack/メール/OAuth）
12. **権限管理の細分化**
13. **モバイル対応**
14. **パフォーマンス最適化**
15. **テスト・品質管理**

---

## 🗂️ 技術スタック（現在使用中）

| レイヤー | 技術 |
|---------|------|
| フロントエンド | Next.js 16 (App Router) + TypeScript |
| バックエンド | Next.js API Routes / Server Actions |
| DB | PostgreSQL + Prisma 7.5 |
| 認証 | NextAuth.js v5 (beta) |
| UI | shadcn/ui + Tailwind CSS v4 |
| ドラッグ&ドロップ | @dnd-kit |
| Markdown | react-markdown + remark-gfm |
| シンタックスハイライト | react-syntax-highlighter |

---

## 📝 データベース構造（Prisma Schema）

実装済みのモデル一覧：

- **Tenant** - テナント（企業）
- **User** - ユーザー（learner/instructor/admin/hr）
- **UserPermissionOverride** - 個別権限上書き
- **Invite** - 招待管理
- **CohortYear** - 年度コーホート
- **Department** - 部署
- **InstructorLearner** - 講師-受講者割り当て
- **CurriculumPlan** - カリキュラムプラン
- **CurriculumItem** - プラン構成要素
- **UserCurriculumPlan** - ユーザーへのプラン割り当て
- **ChecklistTemplate** - チェックリストテンプレート
- **ChecklistCategory** - チェックリストカテゴリ
- **ChecklistItem** - チェックリスト項目
- **LearningGuide** - 学習ガイド
- **ResourceLink** - 参考リンク
- **LearnerChecklist** - 受講者チェックリスト
- **LearnerChecklistItem** - 受講者チェックリスト項目（評価含む）
- **EvaluationPeriod** - 評価期間
- **Assignment** - 課題
- **Submission** - 提出物
- **Review** - 採点結果
- **SubmissionComment** - 提出物コメント
- **Notification** - 通知
- **Curriculum** - カリキュラム（コース）
- **Lesson** - レッスン
- **LessonProgress** - レッスン進捗

---

## 🚀 次のステップ（推奨実装順序）

### Week 1-2
1. AI採点機能の実装（Claude API連携）
2. 通知トリガーの実装（全イベント）

### Week 3-4
3. ユーザー招待フローの実装
4. パスワードリセット機能

### Week 5-6
5. 差し戻し機能の実装
6. 進捗ダッシュボードの拡充（グラフ追加）

### Week 7-8
7. PDFエクスポート機能
8. 検索・フィルタ機能

---

## 📌 メモ

- 現在のファイル数: TypeScript/TSX 132ファイル
- データベース設計は仕様書（spec.md / db-design.md）に沿って実装済み
- API設計（api-design.md）の大部分はServer Actionsで実装済み
- コンテンツインポート機能（`content/import.ts`）は部分的に実装済み

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2026-03-19 | 初版作成（開発状況の棚卸し） |
