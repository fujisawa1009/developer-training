import { vi } from "vitest";

export const mockGetSimilarGradingExamples = vi.fn();
export const mockSaveGradingExample = vi.fn();

vi.mock("@/lib/qdrant", () => ({
  getSimilarGradingExamples: mockGetSimilarGradingExamples,
  saveGradingExample: mockSaveGradingExample,
}));
