import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockPrisma } from "@/test/mocks/prisma";
import { mockInvokeClaude } from "@/test/mocks/bedrock";
import { executeAiGrading } from "@/lib/ai-grading";

// AI採点結果の正常レスポンス
function createAiResponse(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    recommendation: "pass",
    score: 85,
    comment: "良い回答です",
    aiGeneratedSuspicion: {
      level: "low",
      reason: "自然な回答",
    },
    details: [
      {
        criteria: "正確性",
        result: "pass",
        note: "正しい内容です",
      },
    ],
    ...overrides,
  });
}

// 提出物データのファクトリ
function createSubmission(overrides: Record<string, unknown> = {}) {
  return {
    id: "sub-1",
    textAnswer: "受講者の回答テキスト",
    assignment: {
      title: "SQL基礎",
      type: "sql",
      description: "SELECT文を書いてください",
    },
    ...overrides,
  };
}

describe("executeAiGrading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  // --- 提出物の検索 ---

  it("提出物が見つからない場合、console.error を出力して return する", async () => {
    mockPrisma.submission.findUnique.mockResolvedValue(null);

    await executeAiGrading("non-existent-id");

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("提出物が見つかりません")
    );
    expect(mockInvokeClaude).not.toHaveBeenCalled();
  });

  it("textAnswer がない場合（git/program型）、何もせず return する", async () => {
    mockPrisma.submission.findUnique.mockResolvedValue(
      createSubmission({ textAnswer: null })
    );

    await executeAiGrading("sub-1");

    expect(mockInvokeClaude).not.toHaveBeenCalled();
    expect(mockPrisma.review.upsert).not.toHaveBeenCalled();
  });

  // --- プロンプト構築 ---

  it("sql 課題タイプで SQL固有の評価基準プロンプトが使用される", async () => {
    mockPrisma.submission.findUnique.mockResolvedValue(
      createSubmission({ assignment: { title: "SQL", type: "sql", description: "課題" } })
    );
    mockInvokeClaude.mockResolvedValue(createAiResponse());
    mockPrisma.review.findUnique.mockResolvedValue(null);
    mockPrisma.review.upsert.mockResolvedValue({});

    await executeAiGrading("sub-1");

    const systemPrompt = mockInvokeClaude.mock.calls[0][0];
    expect(systemPrompt).toContain("SQL課題の評価基準");
  });

  it("debug 課題タイプでデバッグ固有の評価基準プロンプトが使用される", async () => {
    mockPrisma.submission.findUnique.mockResolvedValue(
      createSubmission({ assignment: { title: "Debug", type: "debug", description: "課題" } })
    );
    mockInvokeClaude.mockResolvedValue(createAiResponse());
    mockPrisma.review.findUnique.mockResolvedValue(null);
    mockPrisma.review.upsert.mockResolvedValue({});

    await executeAiGrading("sub-1");

    const systemPrompt = mockInvokeClaude.mock.calls[0][0];
    expect(systemPrompt).toContain("デバッグ課題の評価基準");
  });

  it("text 課題タイプでテキスト固有の評価基準プロンプトが使用される", async () => {
    mockPrisma.submission.findUnique.mockResolvedValue(
      createSubmission({ assignment: { title: "Text", type: "text", description: "課題" } })
    );
    mockInvokeClaude.mockResolvedValue(createAiResponse());
    mockPrisma.review.findUnique.mockResolvedValue(null);
    mockPrisma.review.upsert.mockResolvedValue({});

    await executeAiGrading("sub-1");

    const systemPrompt = mockInvokeClaude.mock.calls[0][0];
    expect(systemPrompt).toContain("テキスト記述課題の評価基準");
  });

  it("不明な課題タイプでデフォルト評価基準プロンプトが使用される", async () => {
    mockPrisma.submission.findUnique.mockResolvedValue(
      createSubmission({ assignment: { title: "Other", type: "unknown", description: "課題" } })
    );
    mockInvokeClaude.mockResolvedValue(createAiResponse());
    mockPrisma.review.findUnique.mockResolvedValue(null);
    mockPrisma.review.upsert.mockResolvedValue({});

    await executeAiGrading("sub-1");

    const systemPrompt = mockInvokeClaude.mock.calls[0][0];
    expect(systemPrompt).toContain("総合的に評価してください");
  });

  it("課題タイトル・説明・回答がユーザーメッセージに含まれる", async () => {
    mockPrisma.submission.findUnique.mockResolvedValue(
      createSubmission({
        textAnswer: "SELECT * FROM users;",
        assignment: {
          title: "SQL基礎演習",
          type: "sql",
          description: "全ユーザーを取得するSQLを書いてください",
        },
      })
    );
    mockInvokeClaude.mockResolvedValue(createAiResponse());
    mockPrisma.review.findUnique.mockResolvedValue(null);
    mockPrisma.review.upsert.mockResolvedValue({});

    await executeAiGrading("sub-1");

    const userMessage = mockInvokeClaude.mock.calls[0][1];
    expect(userMessage).toContain("SQL基礎演習");
    expect(userMessage).toContain("全ユーザーを取得するSQLを書いてください");
    expect(userMessage).toContain("SELECT * FROM users;");
  });

  // --- レスポンス解析 ---

  it("正常な JSON レスポンスをパースできる", async () => {
    mockPrisma.submission.findUnique.mockResolvedValue(createSubmission());
    mockInvokeClaude.mockResolvedValue(createAiResponse({ score: 90 }));
    mockPrisma.review.findUnique.mockResolvedValue(null);
    mockPrisma.review.upsert.mockResolvedValue({});

    await executeAiGrading("sub-1");

    expect(mockPrisma.review.upsert).toHaveBeenCalledTimes(1);
    const upsertArg = mockPrisma.review.upsert.mock.calls[0][0];
    const aiScore = JSON.parse(upsertArg.create.aiScore);
    expect(aiScore.score).toBe(90);
  });

  it("コードブロックで囲まれた JSON を抽出できる", async () => {
    const wrappedResponse = '```json\n' + createAiResponse({ score: 75 }) + '\n```';
    mockPrisma.submission.findUnique.mockResolvedValue(createSubmission());
    mockInvokeClaude.mockResolvedValue(wrappedResponse);
    mockPrisma.review.findUnique.mockResolvedValue(null);
    mockPrisma.review.upsert.mockResolvedValue({});

    await executeAiGrading("sub-1");

    expect(mockPrisma.review.upsert).toHaveBeenCalledTimes(1);
    const upsertArg = mockPrisma.review.upsert.mock.calls[0][0];
    const aiScore = JSON.parse(upsertArg.create.aiScore);
    expect(aiScore.score).toBe(75);
  });

  it("JSON を含まないレスポンスで console.error を出力して return する", async () => {
    mockPrisma.submission.findUnique.mockResolvedValue(createSubmission());
    mockInvokeClaude.mockResolvedValue("JSONではないテキスト");

    await executeAiGrading("sub-1");

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("JSONを抽出できませんでした"),
      expect.any(String)
    );
    expect(mockPrisma.review.upsert).not.toHaveBeenCalled();
  });

  // --- Review upsert ---

  it("既存 Review がない場合、ai_reviewed で新規作成される", async () => {
    mockPrisma.submission.findUnique.mockResolvedValue(createSubmission());
    mockInvokeClaude.mockResolvedValue(createAiResponse());
    mockPrisma.review.findUnique.mockResolvedValue(null);
    mockPrisma.review.upsert.mockResolvedValue({});

    await executeAiGrading("sub-1");

    const upsertArg = mockPrisma.review.upsert.mock.calls[0][0];
    expect(upsertArg.create.status).toBe("ai_reviewed");
  });

  it("既存 Review が ai_reviewed の場合、update で ai_reviewed を維持する", async () => {
    mockPrisma.submission.findUnique.mockResolvedValue(createSubmission());
    mockInvokeClaude.mockResolvedValue(createAiResponse());
    mockPrisma.review.findUnique.mockResolvedValue({ status: "ai_reviewed" });
    mockPrisma.review.upsert.mockResolvedValue({});

    await executeAiGrading("sub-1");

    const upsertArg = mockPrisma.review.upsert.mock.calls[0][0];
    expect(upsertArg.update.status).toBe("ai_reviewed");
  });

  it("既存 Review が completed の場合、status を変更しない", async () => {
    mockPrisma.submission.findUnique.mockResolvedValue(createSubmission());
    mockInvokeClaude.mockResolvedValue(createAiResponse());
    mockPrisma.review.findUnique.mockResolvedValue({ status: "completed" });
    mockPrisma.review.upsert.mockResolvedValue({});

    await executeAiGrading("sub-1");

    const upsertArg = mockPrisma.review.upsert.mock.calls[0][0];
    expect(upsertArg.update.status).toBe("completed");
  });

  it("aiScore に recommendation と score が JSON 保存される", async () => {
    mockPrisma.submission.findUnique.mockResolvedValue(createSubmission());
    mockInvokeClaude.mockResolvedValue(
      createAiResponse({ recommendation: "fail", score: 40 })
    );
    mockPrisma.review.findUnique.mockResolvedValue(null);
    mockPrisma.review.upsert.mockResolvedValue({});

    await executeAiGrading("sub-1");

    const upsertArg = mockPrisma.review.upsert.mock.calls[0][0];
    const aiScore = JSON.parse(upsertArg.create.aiScore);
    expect(aiScore).toEqual({ recommendation: "fail", score: 40 });
  });

  it("aiComment に comment, aiGeneratedSuspicion, details が JSON 保存される", async () => {
    const response = createAiResponse({
      comment: "改善が必要です",
      aiGeneratedSuspicion: { level: "high", reason: "AI生成の疑い" },
      details: [{ criteria: "品質", result: "fail", note: "不十分" }],
    });
    mockPrisma.submission.findUnique.mockResolvedValue(createSubmission());
    mockInvokeClaude.mockResolvedValue(response);
    mockPrisma.review.findUnique.mockResolvedValue(null);
    mockPrisma.review.upsert.mockResolvedValue({});

    await executeAiGrading("sub-1");

    const upsertArg = mockPrisma.review.upsert.mock.calls[0][0];
    const aiComment = JSON.parse(upsertArg.create.aiComment);
    expect(aiComment.comment).toBe("改善が必要です");
    expect(aiComment.aiGeneratedSuspicion.level).toBe("high");
    expect(aiComment.details).toHaveLength(1);
    expect(aiComment.details[0].criteria).toBe("品質");
  });

  // --- エラーハンドリング ---

  it("invokeClaude 失敗時に例外をスローしない", async () => {
    mockPrisma.submission.findUnique.mockResolvedValue(createSubmission());
    mockInvokeClaude.mockRejectedValue(new Error("Bedrock error"));

    await expect(executeAiGrading("sub-1")).resolves.toBeUndefined();

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("エラーが発生しました"),
      expect.any(Error)
    );
  });

  it("JSON パース失敗時に例外をスローしない", async () => {
    mockPrisma.submission.findUnique.mockResolvedValue(createSubmission());
    // { を含むが不正なJSON
    mockInvokeClaude.mockResolvedValue("{ invalid json }}}");

    await expect(executeAiGrading("sub-1")).resolves.toBeUndefined();

    expect(console.error).toHaveBeenCalled();
  });
});
