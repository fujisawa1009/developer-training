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
  const adminHash = await bcrypt.hash("Admin1234!", 10);
  const instructorHash = await bcrypt.hash("Instructor1234!", 10);
  const learnerHash = await bcrypt.hash("Learner1234!", 10);

  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "admin@example.com" } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: "admin@example.com",
      passwordHash: adminHash,
      name: "管理者 太郎",
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
      name: "講師 花子",
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
      name: "新卒 一郎",
      role: "learner",
      cohortYearId: cohort2025.id,
      departmentId: dept?.id,
    },
  });

  console.log(`✅ ユーザー作成完了`);
  console.log(`   管理者:   admin@example.com / Admin1234!`);
  console.log(`   講師:     instructor@example.com / Instructor1234!`);
  console.log(`   受講者:   learner@example.com / Learner1234!`);

  // 講師 → 受講者の担当割り当て
  await prisma.instructorLearner.upsert({
    where: { instructorId_learnerId: { instructorId: instructor.id, learnerId: learner.id } },
    update: {},
    create: { instructorId: instructor.id, learnerId: learner.id },
  });

  return { tenant, admin, instructor, learner };
}
