import { prisma } from "@/lib/prisma";
import { invokeClaude } from "@/lib/bedrock";

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

## 模範解答について
模範解答が提供されている場合は、それを採点の基準として参照してください。
ただし、表現の多様性は認め、意味・要件の充足を重視してください。
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
- 要件の充足（課題の指示通りの結果が得られるか）
- 効率性（不要なサブクエリや非効率な結合がないか）
- 可読性（適切なインデント、エイリアスの使用）`;

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
${modelAnswerSection}
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
