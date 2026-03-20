import { vi } from "vitest";

export type MockSession = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    tenantId: string;
  };
};

export const defaultAdminSession: MockSession = {
  user: {
    id: "admin-1",
    name: "管理者",
    email: "admin@example.com",
    role: "admin",
    tenantId: "tenant-1",
  },
};

export const defaultInstructorSession: MockSession = {
  user: {
    id: "instructor-1",
    name: "講師",
    email: "instructor@example.com",
    role: "instructor",
    tenantId: "tenant-1",
  },
};

export const defaultLearnerSession: MockSession = {
  user: {
    id: "learner-1",
    name: "受講者",
    email: "learner@example.com",
    role: "learner",
    tenantId: "tenant-1",
  },
};

export const mockAuth = vi.fn<() => Promise<MockSession | null>>();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));
