import { vi } from "vitest";

export const mockInvokeClaude = vi.fn<
  (system: string, user: string) => Promise<string>
>();

vi.mock("@/lib/bedrock", () => ({
  invokeClaude: mockInvokeClaude,
}));
