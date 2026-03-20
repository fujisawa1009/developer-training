# AI採点機能 設計ドキュメント

> 作成日: 2026-03-20
> ステータス: Step 1 実装済み（動作確認・プロンプト調整は未完了）

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

## 6. 不正対策

### 6.1 ペースト禁止

受講者の回答入力欄（textAnswer）ではペースト操作を禁止する。
受講者自身がコードや文章を書く力を評価するため、外部からのコピー&ペーストを防ぐ。

- `onPaste` イベントで `preventDefault()` を実行
- ペースト試行時にユーザーへ「ペーストは禁止されています。自分の言葉で入力してください」と通知

### 6.2 AI生成回答の検知

AI採点時に、受講者の回答がAIによって生成された可能性を判定する。
採点プロンプトにAI生成判定の指示を含め、結果をReviewに保存する。

- AI採点の出力に `aiGeneratedSuspicion`（AI生成の疑い度）を含める
- 講師の採点画面で「AI生成の疑い」がある場合に警告を表示
- 最終判断は講師が行う（自動で不合格にはしない）

---

## 7. AI採点の出力フォーマット

> **要検討**: スコアの詳細形式は今後決定

```json
{
  "recommendation": "pass | fail",
  "score": 85,
  "comment": "全体的な評価コメント",
  "aiGeneratedSuspicion": {
    "level": "low | medium | high",
    "reason": "判定理由"
  },
  "details": [
    { "criteria": "評価基準1", "result": "pass | fail | warning", "note": "詳細" },
    { "criteria": "評価基準2", "result": "pass | fail | warning", "note": "詳細" }
  ]
}
```

- `recommendation`: AIの合否推奨（最終判定は講師が行う）
- `score`: 数値スコア（0-100）
- `comment`: 受講者・講師双方が参照できる全体コメント
- `aiGeneratedSuspicion`: AI生成回答の疑い度と理由
- `details`: 評価基準ごとの内訳

保存先:
- `Review.aiScore` ← `recommendation` と `score`
- `Review.aiComment` ← `comment`、`details`、`aiGeneratedSuspicion`（JSON文字列）

---

## 8. データモデルの変更

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

## 9. 実行タイミングの設計

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

## 10. AI採点失敗時の処理

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

## 11. AWS Bedrock の構成

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

### ベクトルDB（Qdrant）

初期段階からQdrantを導入し、段階的に活用範囲を拡大する。
Qdrantコンテナはdocker-compose.ymlに最初から含め、将来の拡張に備える。

> **参考**: rag-bedrockプロジェクトで Qdrant + Titan Embeddings v2 の実績あり。

#### Qdrant 構成

| 項目 | 設定 |
|------|------|
| コンテナ | `qdrant/qdrant` |
| ポート | 6333（REST API） |
| SDK | `@qdrant/js-client-rest`（TypeScript） |
| Embeddingモデル | Amazon Titan Text Embeddings v2 |
| ベクトル次元 | 1024 |
| 距離計算 | コサイン類似度 |

---

## 12. 実装ステップと工数見積もり

### Step 1: 基盤準備 + AI採点の基本機能（見積: 4-5日）

Qdrantコンテナ導入・Bedrock接続・AI採点の基本フローを構築する。
AI採点はプロンプト直接渡し（ベクトル検索なし）で動かす。

| タスク | 見積 | ファイル |
|-------|------|---------|
| Prismaスキーマ変更（text型・ai_reviewed追加） | 0.5日 | `schema.prisma` |
| docker-compose.yml にQdrant追加・AWS credentials設定 | 0.5日 | `docker-compose.yml`, `.env` |
| AWS Bedrock接続・Embedding関数の作成 | 0.5日 | `app/src/lib/bedrock.ts`（新規） |
| executeAiGrading関数（採点ロジック本体） | 1日 | `app/src/lib/ai-grading.ts`（新規） |
| submitAssignment後のAI採点トリガー | 0.5日 | `app/src/app/curricula/actions.ts` |
| 講師画面のAI採点結果表示・再採点ボタン | 1日 | `admin/submissions/[id]/` |
| 動作確認・プロンプト調整 | 0.5日 | — |

### Step 2: 模範解答の活用（見積: 2-3日）

課題の模範解答をベクトル化し、AI採点時に類似コンテンツをプロンプトに含める。

| タスク | 見積 | 説明 |
|-------|------|------|
| 模範解答フィールドの追加（Assignmentモデル） | 0.5日 | `modelAnswer` フィールド追加 |
| 模範解答のベクトル化・Qdrant保存 | 1日 | 課題作成/更新時にベクトル化 |
| AI採点時のベクトル検索→プロンプト注入 | 1日 | 類似コンテンツを採点プロンプトに含める |

### Step 3: 過去採点データの蓄積・活用（見積: 2日）

採点完了時に提出内容+結果をベクトル化し、新しい採点時に過去の類似事例を参照する。

| タスク | 見積 | 説明 |
|-------|------|------|
| 採点完了時のベクトル化・保存 | 1日 | gradeSubmission後に自動保存 |
| AI採点時の過去事例検索→プロンプト注入 | 1日 | 採点の一貫性を向上 |

### Step 4: 学習ガイド・カリキュラムAI活用（見積: 3-4日、Phase 3で実施）

カリキュラムコンテンツをベクトル化し、RAG検索で活用する。

| タスク | 見積 | 説明 |
|-------|------|------|
| カリキュラムコンテンツのベクトル化 | 1日 | import-content時にベクトルも生成 |
| 学習ガイドのAI質問応答 | 1-2日 | 受講者が質問→RAG検索→AI回答 |
| カリキュラムAI作成UI | 1-2日 | 既存教材をRAG検索→新コンテンツ生成 |

### 工数まとめ

| ステップ | 見積 | フェーズ | 依存 |
|---------|------|---------|------|
| Step 1: 基盤 + AI採点基本 | 4-5日 | Phase 2-1 | — |
| Step 2: 模範解答活用 | 2-3日 | Phase 2-1 | Step 1 |
| Step 3: 過去採点データ活用 | 2日 | Phase 2-1 | Step 1 |
| Step 4: 学習ガイド・カリキュラムAI | 3-4日 | Phase 3-3 | Step 1 |
| **合計** | **11-14日** | | |

> Step 2〜4は独立しており、Step 1完了後に任意の順序で進められる。
> 各ステップ完了時点で動作する状態を維持し、論理破綻が起きないよう段階的に進める。

---

## 13. 未決定・要検討事項

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
| 2026-03-20 | AWS Bedrock構成確定（rag-bedrockプロジェクト調査結果を反映） |
| 2026-03-20 | ベクトルDB（Qdrant）導入方針決定、Step 1〜4の段階的実装計画・工数見積もりを追加 |
| 2026-03-20 | 不正対策（ペースト禁止・AI生成回答検知）を追加 |
