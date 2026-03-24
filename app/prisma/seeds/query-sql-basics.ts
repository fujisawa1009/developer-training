import { prisma } from "./_client";

async function main() {
  const lessons = await prisma.lesson.findMany({
    include: { curriculum: true, assignment: true },
    where: { curriculum: { slug: "sql-basics" } },
    orderBy: { order: "asc" },
  });

  if (lessons.length === 0) {
    console.log("sql-basics not found. All curricula:");
    const all = await prisma.curriculum.findMany({ select: { slug: true, name: true } });
    all.forEach((c) => console.log(" -", c.slug, c.name));
  } else {
    console.log(`sql-basics: ${lessons.length} lessons`);
    lessons.forEach((l) => {
      const ans = l.assignment;
      console.log(
        `${l.order}\t${l.slug}\t${l.type}` +
          (ans ? `\t→ atype:${ans.type} id:${ans.id} modelAnswer:${ans.modelAnswer ? "✓" : "NULL"}` : "")
      );
    });
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
