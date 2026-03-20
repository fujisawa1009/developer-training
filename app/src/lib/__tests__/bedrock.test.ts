import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// AWS SDK のモック
const mockSend = vi.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockCommandCalls: any[] = [];

vi.mock("@aws-sdk/client-bedrock-runtime", () => {
  return {
    BedrockRuntimeClient: class {
      send = mockSend;
    },
    InvokeModelCommand: class {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      constructor(input: any) {
        Object.assign(this, input);
        mockCommandCalls.push(input);
      }
    },
  };
});

function createBedrockResponse(text: string) {
  const body = JSON.stringify({
    content: [{ type: "text", text }],
  });
  return {
    body: new TextEncoder().encode(body),
  };
}

describe("invokeClaude", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCommandCalls.length = 0;
    process.env = { ...originalEnv };
    process.env.BEDROCK_MODEL_ID = "test-model-id";
    process.env.AWS_REGION = "ap-northeast-1";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("BEDROCK_MODEL_ID 未設定でエラーをスローする", async () => {
    delete process.env.BEDROCK_MODEL_ID;
    vi.resetModules();
    const { invokeClaude } = await import("@/lib/bedrock");

    await expect(invokeClaude("system", "user")).rejects.toThrow(
      "BEDROCK_MODEL_ID が設定されていません"
    );
  });

  it("正しいペイロード構造で送信される", async () => {
    vi.resetModules();
    const { invokeClaude } = await import("@/lib/bedrock");
    mockSend.mockResolvedValue(createBedrockResponse("OK"));

    await invokeClaude("システムプロンプト", "ユーザーメッセージ");

    expect(mockCommandCalls).toHaveLength(1);
    const payload = JSON.parse(mockCommandCalls[0].body);
    expect(payload).toMatchObject({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 2048,
      temperature: 0.2,
      system: "システムプロンプト",
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: "ユーザーメッセージ" }],
        },
      ],
    });
  });

  it("anthropic_version が bedrock-2023-05-31 である", async () => {
    vi.resetModules();
    const { invokeClaude } = await import("@/lib/bedrock");
    mockSend.mockResolvedValue(createBedrockResponse("OK"));

    await invokeClaude("sys", "user");

    const payload = JSON.parse(mockCommandCalls[0].body);
    expect(payload.anthropic_version).toBe("bedrock-2023-05-31");
  });

  it("max_tokens が 2048 である", async () => {
    vi.resetModules();
    const { invokeClaude } = await import("@/lib/bedrock");
    mockSend.mockResolvedValue(createBedrockResponse("OK"));

    await invokeClaude("sys", "user");

    const payload = JSON.parse(mockCommandCalls[0].body);
    expect(payload.max_tokens).toBe(2048);
  });

  it("temperature が 0.2 である", async () => {
    vi.resetModules();
    const { invokeClaude } = await import("@/lib/bedrock");
    mockSend.mockResolvedValue(createBedrockResponse("OK"));

    await invokeClaude("sys", "user");

    const payload = JSON.parse(mockCommandCalls[0].body);
    expect(payload.temperature).toBe(0.2);
  });

  it("system にシステムプロンプトが設定される", async () => {
    vi.resetModules();
    const { invokeClaude } = await import("@/lib/bedrock");
    mockSend.mockResolvedValue(createBedrockResponse("OK"));

    await invokeClaude("採点プロンプト", "回答");

    const payload = JSON.parse(mockCommandCalls[0].body);
    expect(payload.system).toBe("採点プロンプト");
  });

  it("messages にユーザーメッセージが設定される", async () => {
    vi.resetModules();
    const { invokeClaude } = await import("@/lib/bedrock");
    mockSend.mockResolvedValue(createBedrockResponse("OK"));

    await invokeClaude("sys", "受講者の回答です");

    const payload = JSON.parse(mockCommandCalls[0].body);
    expect(payload.messages[0].content[0].text).toBe("受講者の回答です");
  });

  it("レスポンスの content[0].text を返す", async () => {
    vi.resetModules();
    const { invokeClaude } = await import("@/lib/bedrock");
    mockSend.mockResolvedValue(createBedrockResponse("採点結果JSON"));

    const result = await invokeClaude("sys", "user");

    expect(result).toBe("採点結果JSON");
  });

  it("Bedrock クライアントエラーが伝播する", async () => {
    vi.resetModules();
    const { invokeClaude } = await import("@/lib/bedrock");
    mockSend.mockRejectedValue(new Error("AccessDeniedException"));

    await expect(invokeClaude("sys", "user")).rejects.toThrow(
      "AccessDeniedException"
    );
  });
});
