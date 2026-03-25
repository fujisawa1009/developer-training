import { QdrantClient } from "@qdrant/js-client-rest";

const COLLECTION_NAME = "model_answers";
const GRADING_EXAMPLES_COLLECTION = "grading_examples";
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

// ---- 過去採点事例（grading_examples コレクション） ----

export type GradingExamplePayload = {
  assignmentId: string;
  tenantId: string;
  textAnswer: string;
  passed: boolean;
  instructorComment: string;
  score: number | null;
  assignmentType: string;
};

export type GradingExampleResult = {
  textAnswer: string;
  passed: boolean;
  instructorComment: string;
  score: number | null;
};

/**
 * grading_examples コレクションが存在しなければ作成する
 */
async function ensureGradingExamplesCollection(): Promise<void> {
  const collections = await qdrantClient.getCollections();
  const exists = collections.collections.some(
    (c) => c.name === GRADING_EXAMPLES_COLLECTION
  );
  if (!exists) {
    await qdrantClient.createCollection(GRADING_EXAMPLES_COLLECTION, {
      vectors: {
        size: VECTOR_SIZE,
        distance: "Cosine",
      },
    });
  }
}

/**
 * 講師採点完了時に採点事例を Qdrant に保存する
 * 同一課題に複数の事例が蓄積されるため、削除は行わず追記のみ
 */
export async function saveGradingExample(
  payload: GradingExamplePayload,
  vector: number[]
): Promise<void> {
  await ensureGradingExamplesCollection();
  await qdrantClient.upsert(GRADING_EXAMPLES_COLLECTION, {
    points: [
      {
        id: crypto.randomUUID(),
        vector,
        payload,
      },
    ],
  });
}

/**
 * AI採点時に同一課題の類似採点事例を検索する
 * assignmentId と tenantId でフィルタしてコサイン類似度 Top-N を返す
 */
export async function getSimilarGradingExamples(
  assignmentId: string,
  tenantId: string,
  vector: number[],
  limit = 3
): Promise<GradingExampleResult[]> {
  const result = await qdrantClient.search(GRADING_EXAMPLES_COLLECTION, {
    vector,
    limit,
    filter: {
      must: [
        { key: "assignmentId", match: { value: assignmentId } },
        { key: "tenantId", match: { value: tenantId } },
      ],
    },
    with_payload: true,
  });

  return result.map((point) => ({
    textAnswer: point.payload?.textAnswer as string,
    passed: point.payload?.passed as boolean,
    instructorComment: point.payload?.instructorComment as string,
    score: (point.payload?.score as number | null) ?? null,
  }));
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
