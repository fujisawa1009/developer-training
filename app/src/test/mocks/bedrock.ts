import { vi } from "vitest";

export const mockInvokeClaude = vi.fn<
  (system: string, user: string) => Promise<string>
>();

export const mockGetEmbedding = vi.fn<(text: string) => Promise<number[]>>();

vi.mock("@/lib/bedrock", () => ({
  invokeClaude: mockInvokeClaude,
  getEmbedding: mockGetEmbedding,
}));
