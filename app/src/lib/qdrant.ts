import { QdrantClient } from "@qdrant/js-client-rest";

const COLLECTION_NAME = "model_answers";
const VECTOR_SIZE = 1024;

const globalForQdrant = globalThis as unknown as {
  qdrantClient: QdrantClient | undefined;
};

const qdrantClient =
  globalForQdrant.qdrantClient ??
  new QdrantClient({ url: process.env.QDRANT_URL ?? "http://qdrant:6333" });

if (process.env.NODE_ENV !== "production") {
  globalForQdrant.qdrantClient = qdrantClient;
}

/**
 * model_answers コレクションが存在しなければ作成する
 */
export async function ensureCollection(): Promise<void> {
  const collections = await qdrantClient.getCollections();
  const exists = collections.collections.some((c) => c.name === COLLECTION_NAME);
  if (!exists) {
    await qdrantClient.createCollection(COLLECTION_NAME, {
      vectors: {
        size: VECTOR_SIZE,
        distance: "Cosine",
      },
    });
  }
}

/**
 * 模範解答をQdrantに保存する
 * 同じ assignmentId のポイントが既に存在する場合は削除してから挿入する
 */
export async function saveModelAnswer(
  assignmentId: string,
  tenantId: string,
  modelAnswer: string,
  vector: number[]
): Promise<void> {
  // 既存ポイントを削除（idempotent）
  await qdrantClient.delete(COLLECTION_NAME, {
    filter: {
      must: [{ key: "assignmentId", match: { value: assignmentId } }],
    },
  });

  // 新規挿入
  await qdrantClient.upsert(COLLECTION_NAME, {
    points: [
      {
        id: crypto.randomUUID(),
        vector,
        payload: { assignmentId, tenantId, modelAnswer },
      },
    ],
  });
}

/**
 * 課題IDからQdrantに保存された模範解答を取得する
 * DBから直接取得できる場合はそちらを優先すること
 */
export async function getModelAnswerByAssignmentId(
  assignmentId: string
): Promise<string | null> {
  const result = await qdrantClient.scroll(COLLECTION_NAME, {
    filter: {
      must: [{ key: "assignmentId", match: { value: assignmentId } }],
    },
    with_payload: true,
    limit: 1,
  });

  return (result.points[0]?.payload?.modelAnswer as string) ?? null;
}
