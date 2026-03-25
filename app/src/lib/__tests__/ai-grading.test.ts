import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockPrisma } from "@/test/mocks/prisma";
import { mockInvokeClaude, mockGetEmbedding } from "@/test/mocks/bedrock";
import { mockGetSimilarGradingExamples } from "@/test/mocks/qdrant";
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
    assignmentId: "assignment-1",
    textAnswer: "受講者の回答テキスト",
    assignment: {
      title: "SQL基礎",
      type: "sql",
      description: "SELECT文を書いてください",
      modelAnswer: null,
      tenantId: "tenant-1",
    },
    ...overrides,
  };
}

describe("executeAiGrading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    // RAG 関連のデフォルトモック（事例なし）
    mockGetEmbedding.mockResolvedValue(new Array(1024).fill(0.1));
    mockGetSimilarGradingExamples.mockResolvedValue([]);
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
          modelAnswer: null,
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

  it("模範解答がある場合、ユーザーメッセージに模範解答セクションが含まれる", async () => {
    mockPrisma.submission.findUnique.mockResolvedValue(
      createSubmission({
        assignment: {
          title: "SQL基礎",
          type: "sql",
          description: "SELECT文を書いてください",
          modelAnswer: "SELECT * FROM users WHERE active = true;",
        },
      })
    );
    mockInvokeClaude.mockResolvedValue(createAiResponse());
    mockPrisma.review.findUnique.mockResolvedValue(null);
    mockPrisma.review.upsert.mockResolvedValue({});

    await executeAiGrading("sub-1");

    const userMessage = mockInvokeClaude.mock.calls[0][1];
    expect(userMessage).toContain("## 模範解答（参考）");
    expect(userMessage).toContain("SELECT * FROM users WHERE active = true;");
  });

  it("模範解答がない場合、ユーザーメッセージに模範解答セクションが含まれない", async () => {
    mockPrisma.submission.findUnique.mockResolvedValue(
      createSubmission({
        assignment: {
          title: "SQL基礎",
          type: "sql",
          description: "SELECT文を書いてください",
          modelAnswer: null,
        },
      })
    );
    mockInvokeClaude.mockResolvedValue(createAiResponse());
    mockPrisma.review.findUnique.mockResolvedValue(null);
    mockPrisma.review.upsert.mockResolvedValue({});

    await executeAiGrading("sub-1");

    const userMessage = mockInvokeClaude.mock.calls[0][1];
    expect(userMessage).not.toContain("## 模範解答（参考）");
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

  // --- RAG: 過去事例の注入 ---

  it("過去事例がある場合、userMessage に「過去の講師採点事例」セクションが含まれる", async () => {
    mockPrisma.submission.findUnique.mockResolvedValue(createSubmission());
    mockGetSimilarGradingExamples.mockResolvedValue([
      { textAnswer: "過去の回答テキスト", passed: true, instructorComment: "良い回答です", score: 80 },
    ]);
    mockInvokeClaude.mockResolvedValue(createAiResponse());
    mockPrisma.review.findUnique.mockResolvedValue(null);
    mockPrisma.review.upsert.mockResolvedValue({});

    await executeAiGrading("sub-1");

    const userMessage = mockInvokeClaude.mock.calls[0][1];
    expect(userMessage).toContain("## 過去の講師採点事例（参考）");
    expect(userMessage).toContain("過去の回答テキスト");
    expect(userMessage).toContain("良い回答です");
  });

  it("過去事例がゼロの場合、userMessage に「過去の講師採点事例」セクションが含まれない", async () => {
    mockPrisma.submission.findUnique.mockResolvedValue(createSubmission());
    mockGetSimilarGradingExamples.mockResolvedValue([]);
    mockInvokeClaude.mockResolvedValue(createAiResponse());
    mockPrisma.review.findUnique.mockResolvedValue(null);
    mockPrisma.review.upsert.mockResolvedValue({});

    await executeAiGrading("sub-1");

    const userMessage = mockInvokeClaude.mock.calls[0][1];
    expect(userMessage).not.toContain("## 過去の講師採点事例（参考）");
  });

  it("getEmbedding に「課題タイトル + タイプ + 回答」の連結テキストが渡される", async () => {
    mockPrisma.submission.findUnique.mockResolvedValue(
      createSubmission({
        textAnswer: "MY_ANSWER",
        assignment: {
          title: "MY_TITLE",
          type: "sql",
          description: "課題説明",
          modelAnswer: null,
          tenantId: "tenant-1",
        },
      })
    );
    mockInvokeClaude.mockResolvedValue(createAiResponse());
    mockPrisma.review.findUnique.mockResolvedValue(null);
    mockPrisma.review.upsert.mockResolvedValue({});

    await executeAiGrading("sub-1");

    expect(mockGetEmbedding).toHaveBeenCalledWith("MY_TITLE sql MY_ANSWER");
  });

  it("RAG 取得失敗時も採点処理は継続し、console.warn が出力される", async () => {
    mockPrisma.submission.findUnique.mockResolvedValue(createSubmission());
    mockGetEmbedding.mockRejectedValue(new Error("Qdrant error"));
    mockInvokeClaude.mockResolvedValue(createAiResponse());
    mockPrisma.review.findUnique.mockResolvedValue(null);
    mockPrisma.review.upsert.mockResolvedValue({});

    await expect(executeAiGrading("sub-1")).resolves.toBeUndefined();

    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("過去事例の取得に失敗しました"),
      expect.any(Error)
    );
    expect(mockInvokeClaude).toHaveBeenCalled();
  });

  it("textAnswer が null の場合、getEmbedding は呼ばれない", async () => {
    mockPrisma.submission.findUnique.mockResolvedValue(
      createSubmission({ textAnswer: null })
    );

    await executeAiGrading("sub-1");

    expect(mockGetEmbedding).not.toHaveBeenCalled();
  });

  it("passed: false の過去事例が「不合格」として userMessage に含まれる", async () => {
    mockPrisma.submission.findUnique.mockResolvedValue(createSubmission());
    mockGetSimilarGradingExamples.mockResolvedValue([
      { textAnswer: "不十分な回答", passed: false, instructorComment: "要改善", score: 30 },
    ]);
    mockInvokeClaude.mockResolvedValue(createAiResponse());
    mockPrisma.review.findUnique.mockResolvedValue(null);
    mockPrisma.review.upsert.mockResolvedValue({});

    await executeAiGrading("sub-1");

    const userMessage = mockInvokeClaude.mock.calls[0][1];
    expect(userMessage).toContain("不合格");
    expect(userMessage).toContain("不十分な回答");
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
