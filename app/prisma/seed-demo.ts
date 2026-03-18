import { prisma } from "./seeds/_client";
import { seedDemoProgress } from "./seeds/04-demo-progress";

async function main() {
  console.log("🎭 デモ進捗データを投入します...\n");
  await seedDemoProgress();
  console.log("\n🎉 完了！");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
