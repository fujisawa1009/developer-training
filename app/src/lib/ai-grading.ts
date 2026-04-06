import { prisma } from "@/lib/prisma";
import { invokeClaude, getEmbedding } from "@/lib/bedrock";
import { getSimilarGradingExamples } from "@/lib/qdrant";

type AiGradingResult = {
  recommendation: "pass" | "fail";
  score: number;
  comment: string;
  aiGeneratedSuspicion: {
    level: "low" | "medium" | "high";
    reason: string;
  };
  details: Array<{
    criteria: string;
    result: "pass" | "fail" | "warning";
    note: string;
  }>;
};

const SYSTEM_PROMPT_BASE = `あなたは新卒エンジニア研修の課題を採点するAIアシスタントです。
受講者の回答を評価し、以下のJSON形式で結果を返してください。
JSON以外のテキストは一切出力しないでください。

## 採点の基本方針
- 受講者が「課題の要求を正しく理解し、適切な知識を持って回答しているか」を評価してください
- 模範解答はあくまで「一例」です。それ以外の正しい解答も合格と判定してください
- 模範解答より詳しい・丁寧な回答（追加のベストプラクティス適用など）はプラスに評価してください
- 模範解答にない要素があっても、課題の要件を満たしていれば減点しないでください

## 問題タイプ別の評価方針

### 設計問題（テーブル設計・API設計など）
- 「課題が要求する要素がすべて含まれているか」を第一に評価してください
- 要求外の追加要素（監査カラム、インデックス、制約の追加など）は、誤りでない限り減点しないでください
- 模範解答は最小限の例示であることが多く、それ以上の設計は問題ありません

### エラー発見・デバッグ問題
- 模範解答が指摘する主要な問題点を正しく特定できているかを評価してください
- 模範解答にない追加の有効な指摘は加点要素として扱ってください
- 模範解答の問題点を見落としている場合のみ減点してください
- 指摘の表現が模範解答と異なっても、同じ問題を正しく理解していれば合格と判定してください

### SQL記述問題
- 実行結果が課題の要件通りになるかを評価してください
- 構文が正確で要件を満たすSQLであれば、模範解答と書き方が違っても合格と判定してください

### 概念説明・知識問題
- 本質的な理解ができているかを評価してください
- 表現の多様性を認め、意味・内容の正確性を重視してください

## 模範解答について
模範解答が提供されている場合は採点の参考にしてください。ただし模範解答は「唯一の正解」ではなく「一例」です。
模範解答と完全一致でなくても、内容が正確であれば合格と判定してください。

出力フォーマット:
{
  "recommendation": "pass" または "fail",
  "score": 0〜100の数値,
  "comment": "全体的な評価コメント（受講者にも表示されます）",
  "aiGeneratedSuspicion": {
    "level": "low" / "medium" / "high",
    "reason": "判定理由"
  },
  "details": [
    { "criteria": "評価基準名", "result": "pass" / "fail" / "warning", "note": "詳細コメント" }
  ]
}

## AI生成回答の検知について
以下の特徴がある場合、aiGeneratedSuspicion の level を上げてください:
- 過度に整った文体・構造（新卒エンジニアとしては不自然に完璧）
- 一般的なAI回答によくみられる定型的な表現パターン
- 具体的な経験や個人的な考察がなく、教科書的な記述のみ
- 質問の範囲を超えた不必要に網羅的な回答

ただし、AI生成の疑いがあっても、内容の正確性に基づいて公平に採点してください。
最終的なAI生成の判断は講師が行います。`;

function getTypeSpecificPrompt(type: string): string {
  switch (type) {
    case "sql":
      return `
## SQL課題の評価基準
以下の観点で評価してください:
- SQL構文の正確性（文法エラーがないか）
- 要件の充足（課題が求める結果を得られるか。設計問題では必須要素がすべて含まれているか）
- 可読性（適切なインデント、エイリアスの使用）
- 効率性（不要なサブクエリや非効率な結合がないか）

【設計問題（CREATE TABLEなど）の評価】
- 課題が指定する必須カラム・制約がすべて含まれていれば要件充足とみなしてください
- 監査カラム（created_at、created_by など）や追加の制約（CHECK制約など）の追加は実務的なベストプラクティスであり、減点しないでください
- 模範解答より多いカラムや制約は「過剰」ではなく「丁寧な設計」として評価してください

【エラー発見問題の評価】
- 模範解答が指摘するすべての問題点を正しく特定できているかを確認してください
- 追加の有効な指摘（模範解答にない正しい問題点）は加点要素として扱ってください
- 問題点の説明が模範解答と表現が違っても、同じ本質を理解していれば合格と判定してください`;

    case "debug":
      return `
## デバッグ課題の評価基準
以下の観点で評価してください:
- バグの特定が正確か（原因の分析が適切か）
- 修正方法が適切か（根本的な解決になっているか）
- コードの品質（修正後のコードが読みやすく保守しやすいか）
- 説明の明確さ（なぜそのバグが発生したか説明できているか）`;

    case "text":
      return `
## テキスト記述課題の評価基準
以下の観点で評価してください:
- 要点の把握（課題が求める内容を理解しているか）
- 内容の正確性（事実に基づいた記述か）
- 論理性（主張と根拠の関係が明確か）
- 具体性（抽象的な記述だけでなく具体例があるか）`;

    default:
      return `
## 課題の評価基準
課題の要件に対して、回答が適切かどうか総合的に評価してください。`;
  }
}

/**
 * AI採点を実行する
 * 失敗しても例外を投げない（呼び出し元の処理を止めない）
 */
export async function executeAiGrading(
  submissionId: string
): Promise<void> {
  try {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { assignment: true },
    });

    if (!submission) {
      console.error(`[AI採点] 提出物が見つかりません: ${submissionId}`);
      return;
    }

    // textAnswer がない場合はスキップ（git/program型）
    if (!submission.textAnswer) {
      return;
    }

    // 過去の講師採点事例を Qdrant から検索（RAG）
    let pastExamplesSection = "";
    try {
      const answerVector = await getEmbedding(
        `${submission.assignment.title} ${submission.assignment.type} ${submission.textAnswer}`
      );
      const examples = await getSimilarGradingExamples(
        submission.assignmentId,
        submission.assignment.tenantId,
        answerVector
      );
      if (examples.length > 0) {
        const exampleTexts = examples.map((ex, i) => {
          const verdict = ex.passed ? "合格" : "不合格";
          return `### 過去事例 ${i + 1}（${verdict}・スコア: ${ex.score ?? "N/A"}）
回答: ${ex.textAnswer}
講師コメント: ${ex.instructorComment}`;
        });
        pastExamplesSection = `\n## 過去の講師採点事例（参考）\n以下は同一課題に対して講師が採点した過去の事例です。採点の一貫性を保つ参考として活用してください。\n${exampleTexts.join("\n\n")}\n`;
      }
    } catch (error) {
      // RAG 取得失敗は無視（フォールバック: 事例なしで採点継続）
      console.warn("[AI採点] 過去事例の取得に失敗しました:", error);
    }

    const systemPrompt =
      SYSTEM_PROMPT_BASE + getTypeSpecificPrompt(submission.assignment.type);

    const modelAnswerSection = submission.assignment.modelAnswer
      ? `\n## 模範解答（参考）\n${submission.assignment.modelAnswer}\n`
      : "";

    const userMessage = `## 課題情報
課題名: ${submission.assignment.title}
課題タイプ: ${submission.assignment.type}

## 課題の説明・要件
${submission.assignment.description}
${modelAnswerSection}${pastExamplesSection}
## 受講者の回答
${submission.textAnswer}`;

    const responseText = await invokeClaude(systemPrompt, userMessage);

    // JSON部分を抽出（コードブロックで囲まれている場合にも対応）
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("[AI採点] レスポンスからJSONを抽出できませんでした:", responseText);
      return;
    }

    const result: AiGradingResult = JSON.parse(jsonMatch[0]);

    // Review を upsert
    const existingReview = await prisma.review.findUnique({
      where: { submissionId },
    });

    const aiScore = JSON.stringify({
      recommendation: result.recommendation,
      score: result.score,
    });

    const aiComment = JSON.stringify({
      comment: result.comment,
      aiGeneratedSuspicion: result.aiGeneratedSuspicion,
      details: result.details,
    });

    // 既に講師が採点完了済み（completed）の場合はステータスを変更しない
    const newStatus =
      existingReview?.status === "completed" ? "completed" : "ai_reviewed";

    await prisma.review.upsert({
      where: { submissionId },
      update: {
        aiScore,
        aiComment,
        status: newStatus,
      },
      create: {
        submissionId,
        aiScore,
        aiComment,
        status: "ai_reviewed",
      },
    });
  } catch (error) {
    console.error("[AI採点] エラーが発生しました:", error);
    // 例外を投げない — 提出処理を止めない
  }
}
