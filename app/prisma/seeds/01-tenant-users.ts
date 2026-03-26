import { prisma } from "./_client";
import bcrypt from "bcryptjs";

export async function seedTenantAndUsers() {
  // テナント
  const tenant = await prisma.tenant.upsert({
    where: { id: "tenant-sample" },
    update: {},
    create: {
      id: "tenant-sample",
      name: "サンプル株式会社",
      plan: "free",
    },
  });
  console.log(`✅ テナント: ${tenant.name}`);

  // 年度・部署
  const cohort2025 = await prisma.cohortYear.upsert({
    where: { tenantId_year: { tenantId: tenant.id, year: 2025 } },
    update: {},
    create: {
      tenantId: tenant.id,
      year: 2025,
      label: "2025年度入社",
    },
  });

  const dept = await prisma.department
    .create({
      data: {
        tenantId: tenant.id,
        name: "開発部",
      },
    })
    .catch(() => prisma.department.findFirst({ where: { tenantId: tenant.id, name: "開発部" } }));

  console.log(`✅ 年度: ${cohort2025.label} / 部署: ${dept?.name}`);

  // ユーザー
  const adminHash = await bcrypt.hash("password123", 10);
  const instructorHash = await bcrypt.hash("password123", 10);
  const learnerHash = await bcrypt.hash("password123", 10);
  const learner2Hash = await bcrypt.hash("password123", 10);
  const learner3Hash = await bcrypt.hash("password123", 10);
  const learner4Hash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "admin@example.com" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "admin@example.com",
      passwordHash: adminHash,
      name: "管理者",
      role: "admin",
    },
  });

  const instructor = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "instructor@example.com" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "instructor@example.com",
      passwordHash: instructorHash,
      name: "講師",
      role: "instructor",
      departmentId: dept?.id,
    },
  });

  const learner = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "learner@example.com" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "learner@example.com",
      passwordHash: learnerHash,
      name: "新卒",
      role: "learner",
      cohortYearId: cohort2025.id,
      departmentId: dept?.id,
    },
  });

  const learner2 = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "learner2@example.com" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "learner2@example.com",
      passwordHash: learner2Hash,
      name: "受講者2",
      role: "learner",
      cohortYearId: cohort2025.id,
      departmentId: dept?.id,
    },
  });

  const learner3 = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "learner3@example.com" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "learner3@example.com",
      passwordHash: learner3Hash,
      name: "受講者3",
      role: "learner",
      cohortYearId: cohort2025.id,
      departmentId: dept?.id,
    },
  });

  const learner4 = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "learner4@example.com" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "learner4@example.com",
      passwordHash: learner4Hash,
      name: "受講者4",
      role: "learner",
      cohortYearId: cohort2025.id,
      departmentId: dept?.id,
    },
  });

  console.log(`✅ ユーザー作成完了`);
  console.log(`   管理者:   admin@example.com / password123`);
  console.log(`   講師:     instructor@example.com / password123`);
  console.log(`   受講者:   learner@example.com / password123`);
  console.log(`   受講者:   learner2@example.com / password123`);
  console.log(`   受講者:   learner3@example.com / password123`);
  console.log(`   受講者:   learner4@example.com / password123`);

  // 講師 → 受講者の担当割り当て
  for (const learnerId of [learner.id, learner2.id, learner3.id, learner4.id]) {
    await prisma.instructorLearner.upsert({
      where: { instructorId_learnerId: { instructorId: instructor.id, learnerId } },
      update: {},
      create: { instructorId: instructor.id, learnerId },
    });
  }

  return { tenant, admin, instructor, learner, additionalLearners: [learner2, learner3, learner4] };
}
