import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

const globalForBedrock = globalThis as unknown as {
  bedrockClient: BedrockRuntimeClient | undefined;
};

function createBedrockClient() {
  return new BedrockRuntimeClient({
    region: process.env.AWS_REGION || "ap-northeast-1",
  });
}

const bedrockClient =
  globalForBedrock.bedrockClient ?? createBedrockClient();

if (process.env.NODE_ENV !== "production")
  globalForBedrock.bedrockClient = bedrockClient;

/**
 * Bedrock 上の Claude モデルを呼び出す
 */
export async function invokeClaude(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const modelId = process.env.BEDROCK_MODEL_ID;
  if (!modelId) {
    throw new Error("BEDROCK_MODEL_ID が設定されていません");
  }

  const payload = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 2048,
    temperature: 0.2,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: userMessage }],
      },
    ],
  };

  const command = new InvokeModelCommand({
    modelId,
    body: JSON.stringify(payload),
    contentType: "application/json",
    accept: "application/json",
  });

  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));

  return responseBody.content[0].text;
}

/**
 * テキストのベクトル埋め込みを取得する（Step 2 以降で使用）
 */
export async function getEmbedding(_text: string): Promise<number[]> {
  // Step 1 では未使用。Step 2 で Titan Embeddings v2 を使って実装予定。
  throw new Error("getEmbedding は Step 2 で実装予定です");
}
