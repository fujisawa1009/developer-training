import { vi } from "vitest";

export const mockExecuteAiGrading = vi.fn();

vi.mock("@/lib/ai-grading", () => ({
  executeAiGrading: mockExecuteAiGrading,
}));
