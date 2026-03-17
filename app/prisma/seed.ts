import { prisma } from "./seeds/_client";
import { seedTenantAndUsers } from "./seeds/01-tenant-users";
import { seedChecklist } from "./seeds/02-checklist";
import { seedCurriculumPlan } from "./seeds/03-curriculum-plan";

async function main() {
  console.log("🌱 シードデータを投入します...\n");

  const { tenant, learner } = await seedTenantAndUsers();
  const { createdCategories } = await seedChecklist(tenant.id);
  await seedCurriculumPlan(tenant.id, learner.id, createdCategories);

  console.log("\n🎉 シード完了！");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
