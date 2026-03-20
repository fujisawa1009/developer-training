import { vi } from "vitest";

type MockPrismaModel = {
  findUnique: ReturnType<typeof vi.fn>;
  findFirst: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  createMany: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  updateMany: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  deleteMany: ReturnType<typeof vi.fn>;
  count: ReturnType<typeof vi.fn>;
};

function createMockModel(): MockPrismaModel {
  return {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  };
}

export const mockPrisma = {
  user: createMockModel(),
  tenant: createMockModel(),
  cohortYear: createMockModel(),
  department: createMockModel(),
  submission: createMockModel(),
  review: createMockModel(),
  notification: createMockModel(),
  lesson: createMockModel(),
  lessonProgress: createMockModel(),
  curriculum: createMockModel(),
  curriculumPlan: createMockModel(),
  curriculumItem: createMockModel(),
  userCurriculumPlan: createMockModel(),
  assignment: createMockModel(),
  instructorLearner: createMockModel(),
  submissionComment: createMockModel(),
  checklistTemplate: createMockModel(),
  checklistCategory: createMockModel(),
  checklistItem: createMockModel(),
  learnerChecklist: createMockModel(),
  learnerChecklistItem: createMockModel(),
  evaluationPeriod: createMockModel(),
  userPermissionOverride: createMockModel(),
  learningGuide: createMockModel(),
  resourceLink: createMockModel(),
  invite: createMockModel(),
  $transaction: vi.fn(
    async (fn: unknown) => {
      if (typeof fn === "function") {
        return fn(mockPrisma);
      }
      return Promise.all(fn as Promise<unknown>[]);
    }
  ),
};

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));
