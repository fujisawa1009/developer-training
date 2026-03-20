# AI採点機能 設計ドキュメント

> 作成日: 2026-03-20
> ステータス: 設計中

---

## 1. 目的

受講者が提出した課題をAIで自動採点し、講師・管理者の採点業務を効率化する。
AIはあくまで補助であり、最終的な合否判定は講師・管理者が行う。

---

## 2. フロー

```
受講者が課題を提出（status: submitted）
 ↓
講師・管理者に通知（既存実装済み）
 ↓
AI自動採点が実行される（AWS Bedrock）
 ├─ 成功 → 採点結果をReviewに保存（status: ai_reviewed）
 └─ 失敗 → Review.status: pending のまま（提出は成功扱い）
         → 講師が採点画面で「AI再採点」ボタンで再実行可能
 ↓
講師・管理者が提出課題 + AI採点結果を確認
 ├─ AI採点のコメント・スコアを参照
 └─ 合格 or 不合格を判定（講師コメント付き）
 ↓
受講者に通知
 ├─ 合格 → LessonProgress作成 → 次のレッスンへ
 └─ 不合格 → 再提出
```

---

## 3. 現在のフローとの差分

| 項目 | 現在 | AI採点追加後 |
|------|------|------------|
| 提出直後 | 講師に通知のみ | 講師に通知 + AI採点を自動実行 |
| Review作成 | 講師が採点時に作成 | 提出時にAI採点で作成 → 講師が更新 |
| ReviewStatus | `pending` / `completed` | `pending` / `ai_reviewed` / `completed` |
| 採点画面 | 講師コメント＋合否のみ | AI採点結果表示 + 講師コメント＋合否 |
| AI採点失敗時 | — | 提出は成功。講師画面に「AI再採点」ボタン表示 |

---

## 4. AI採点の対象

### 対象とする課題タイプ

textAnswer（テキスト回答）を持つ課題のみをAI採点の対象とする。

| タイプ | AI採点 | 入力 | AIの評価ポイント |
|-------|--------|------|----------------|
| sql | 対象 | textAnswer（SQL文） | SQL構文の正確性、要件の充足、効率性 |
| debug | 対象 | textAnswer（修正コード） | バグの特定と修正が適切か、コードの品質 |
| text | 対象 | textAnswer（記述回答） | 要点の把握、内容の正確性、論理性 |
| git | 対象外 | githubUrl のみ | 将来的にGitHub API連携で対応を検討 |
| program | 対象外 | githubUrl のみ | 同上 |

### AssignmentType の追加

社会人基礎・IT基礎などのテキスト記述式課題に対応するため、`text` 型を追加する。

```prisma
enum AssignmentType {
  git       // GitHub URL提出
  sql       // SQL文提出
  program   // プログラムコード提出（GitHub URL）
  debug     // バグデバッグコード提出
  text      // テキスト記述（レポート・説明問題） ← 追加
}
```

---

## 5. AIに渡す入力データ

| データ | 出典 | 用途 |
|-------|------|------|
| assignment.title | Assignment | 課題名の文脈 |
| assignment.description | Assignment | 課題の要件・仕様（採点基準） |
| assignment.type | Assignment | sql / debug / text |
| submission.textAnswer | Submission | 受講者の回答テキスト |

---

## 6. AI採点の出力フォーマット

> **要検討**: スコアの詳細形式は今後決定

```json
{
  "recommendation": "pass | fail",
  "score": 85,
  "comment": "全体的な評価コメント",
  "details": [
    { "criteria": "評価基準1", "result": "pass | fail | warning", "note": "詳細" },
    { "criteria": "評価基準2", "result": "pass | fail | warning", "note": "詳細" }
  ]
}
```

- `recommendation`: AIの合否推奨（最終判定は講師が行う）
- `score`: 数値スコア（0-100）
- `comment`: 受講者・講師双方が参照できる全体コメント
- `details`: 評価基準ごとの内訳

保存先:
- `Review.aiScore` ← `recommendation` と `score`
- `Review.aiComment` ← `comment` と `details`（JSON文字列）

---

## 7. データモデルの変更

### Review モデル（既存フィールドを活用）

```prisma
model Review {
  aiComment         String?    // AI採点の詳細（JSON文字列）
  aiScore           String?    // AI採点のスコア・推奨結果（JSON文字列）
  instructorComment String?    // 講師のコメント
  passed            Boolean?   // 最終合否（講師が確定）
  status            ReviewStatus
  reviewedBy        String?    // 採点した講師のID
  reviewedAt        DateTime?  // 講師が採点した日時
}
```

### ReviewStatus の拡張

```prisma
enum ReviewStatus {
  pending       // 採点待ち（提出直後、AI採点前 or AI採点失敗）
  ai_reviewed   // AI採点完了・講師レビュー待ち ← 追加
  completed     // 講師が最終判定を確定
}
```

### AssignmentType の拡張

```prisma
enum AssignmentType {
  git
  sql
  program
  debug
  text      // ← 追加
}
```

---

## 8. 実行タイミングの設計

### 方針: 同期でプロトタイプ → 非同期に切り替え

AI採点ロジックを独立した関数として設計し、呼び出し方の変更だけで同期/非同期を切り替える。

```
ai-grading.ts
 └─ executeAiGrading(submissionId)  ← 共通ロジック
     ├─ Submission + Assignment を取得
     ├─ textAnswer が無い場合はスキップ（git/program型）
     ├─ AWS Bedrock を呼び出し
     ├─ 結果を Review に保存（status: ai_reviewed）
     └─ 失敗時は Review.status: pending のまま（エラーログのみ）
```

#### プロトタイプ（同期処理）

```
submitAssignment()
 ├─ Submission を submitted に更新
 ├─ 通知送信
 └─ await executeAiGrading(submissionId)  ← 直接呼び出し
```

#### 本番（非同期処理）

```
submitAssignment()
 ├─ Submission を submitted に更新
 ├─ 通知送信
 └─ fetch('/api/ai-grading', { submissionId })  ← 内部APIを非同期呼び出し

/api/ai-grading（別エンドポイント）
 └─ executeAiGrading(submissionId)  ← 同じ関数を呼ぶ
```

切り替えコストは呼び出し元の1-2行の変更のみ。

---

## 9. AI採点失敗時の処理

```
AI採点実行
 ├─ 成功 → Review に結果保存（status: ai_reviewed）
 └─ 失敗 → Review.status は pending のまま
         → エラーログを記録
         → 提出自体は成功扱い（受講者には影響なし）

講師の採点画面:
 ├─ AI採点あり → AI結果を表示 + 講師の合否判定フォーム
 └─ AI採点なし → 「AI採点失敗」表示 + 「AI再採点」ボタン + 講師の合否判定フォーム
                  （講師は手動採点も可能）
```

「AI再採点」ボタンは `executeAiGrading(submissionId)` を再実行するだけ。

---

## 10. AWS Bedrock の構成

### 基本構成（RAGプロジェクトの実績を踏まえて確定）

| 項目 | 設定 |
|------|------|
| サービス | AWS Bedrock |
| SDK | `@aws-sdk/client-bedrock-runtime`（TypeScript） |
| API | `InvokeModelCommand`（invoke_model） |
| リージョン | `ap-northeast-1`（東京） |
| 認証 | AWS IAM credentials（`~/.aws/credentials` をDockerマウント） |
| モデル | 要検討（Claude系を想定） |

> **参考**: 別プロジェクト（rag-bedrock）で `boto3` + `anthropic.claude-3-5-sonnet` での
> Bedrock利用実績あり。本プロジェクトはTypeScriptだが、API仕様は同一のためそのまま適用可能。

### リクエスト形式（Anthropic Messages API on Bedrock）

```typescript
const payload = {
  anthropic_version: "bedrock-2023-05-31",
  max_tokens: 2048,
  temperature: 0.2,
  system: "あなたは課題採点のアシスタントです...",
  messages: [
    {
      role: "user",
      content: [{ type: "text", text: "課題内容 + 受講者の回答" }]
    }
  ]
};

const command = new InvokeModelCommand({
  modelId: process.env.BEDROCK_MODEL_ID,
  body: JSON.stringify(payload),
  contentType: "application/json",
  accept: "application/json",
});

const response = await bedrockClient.send(command);
```

### レスポンス形式

```json
{
  "content": [
    { "type": "text", "text": "AI採点結果のJSON文字列" }
  ]
}
```

### Docker環境での認証設定

```yaml
# docker-compose.yml に追加
volumes:
  - ~/.aws/credentials:/root/.aws/credentials:ro
  - ~/.aws/config:/root/.aws/config:ro
environment:
  - AWS_REGION=${AWS_REGION}
```

### ベクトルDBについて

現在のAI採点ではベクトルDBは**不要**。課題の `description`（要件）と受講者の `textAnswer` を
プロンプトに直接渡すだけで十分に採点可能。

将来的にベクトルDBが必要になりうるケース:

| ケース | 用途 |
|-------|------|
| 模範解答との類似度比較 | 模範解答をベクトル化し、回答の類似度で採点補助 |
| 過去の採点履歴の参照 | 過去の合格/不合格回答を検索し、採点の一貫性を担保 |
| カリキュラムAI作成UI（Phase 3） | 既存教材をRAG検索して新カリキュラムを生成 |

> Phase 3のカリキュラムAI作成UIでは、RAGプロジェクト（rag-bedrock）の構成を活用できる可能性あり。

---

## 11. 実装箇所の想定

| ファイル | 変更内容 |
|---------|---------|
| `app/prisma/schema.prisma` | AssignmentTypeにtext追加、ReviewStatusにai_reviewed追加 |
| `app/src/lib/ai-grading.ts` | 新規：executeAiGrading関数（Bedrock呼び出し・プロンプト構築・結果パース） |
| `app/src/app/curricula/actions.ts` | submitAssignment後にexecuteAiGradingを呼び出し |
| `app/src/app/admin/submissions/[id]/page.tsx` | AI採点結果の表示エリア追加 |
| `app/src/app/admin/submissions/[id]/_components/` | AI再採点ボタンコンポーネント追加 |
| `app/src/app/admin/submissions/actions.ts` | AI再採点アクション追加、gradeSubmissionでAI採点済みReviewを更新 |
| `.env` | AWS_REGION / BEDROCK_MODEL_ID 追加 |
| `docker-compose.yml` | AWS credentials マウント追加 |
| `package.json` | `@aws-sdk/client-bedrock-runtime` 追加 |

---

## 12. 未決定・要検討事項

- [ ] AWS Bedrockで使用するモデルの選定（コスト・精度のバランス）
- [ ] AI採点の出力フォーマットの詳細（評価基準の項目設計）
- [ ] プロンプトの管理方法（コード内固定 or DB管理）
- [ ] AI採点のコスト管理・利用量制限の要否
- [ ] 非同期化のタイミング（プロトタイプ検証後に判断）

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2026-03-20 | 初版作成 |
| 2026-03-20 | 方針決定: text型追加、同期→非同期設計、AI採点失敗時のリトライ設計を反映 |
| 2026-03-20 | AWS Bedrock構成確定（rag-bedrockプロジェクト調査結果を反映）、ベクトルDB不要の判断を記載 |
