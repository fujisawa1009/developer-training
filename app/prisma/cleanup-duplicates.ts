/**
 * 重複データを削除するクリーンアップスクリプト
 *
 * 実行方法:
 *   docker compose exec app npx tsx prisma/cleanup-duplicates.ts
 */

import { prisma } from "./seeds/_client";

async function cleanupDuplicates() {
  console.log("🧹 重複データのクリーンアップを開始します...\n");

  // ─────────────────────────────────────────
  // 1. ChecklistTemplate の重複削除
  // ─────────────────────────────────────────

  console.log("📋 ChecklistTemplate の重複を確認中...");

  const templates = await prisma.checklistTemplate.findMany({
    orderBy: { id: "asc" },
    include: {
      categories: {
        include: {
          items: {
            include: {
              learnerItems: true,
              guide: true,
            },
          },
        },
      },
      learnerChecklists: true,
    },
  });

  if (templates.length > 1) {
    console.log(`  ⚠️  ${templates.length}個のテンプレートが見つかりました`);

    // 最初のテンプレート（最も古いもの）を残す
    const keepTemplate = templates[0];
    const duplicates = templates.slice(1);

    console.log(`  ✅ 保持: ${keepTemplate.name} (${keepTemplate.id})`);

    for (const dup of duplicates) {
      console.log(`  🗑️  削除対象: ${dup.name} (${dup.id})`);

      // カテゴリに紐づくアイテムと学習ガイドを削除
      for (const category of dup.categories) {
        for (const item of category.items) {
          // ResourceLink を先に削除（外部キー制約対応）
          if (item.guide) {
            await prisma.resourceLink.deleteMany({
              where: { learningGuideId: item.guide.id },
            });

            // LearningGuide の削除
            await prisma.learningGuide.delete({
              where: { id: item.guide.id },
            });
          }

          // LearnerChecklistItem の削除
          await prisma.learnerChecklistItem.deleteMany({
            where: { checklistItemId: item.id },
          });

          // ChecklistItem の削除
          await prisma.checklistItem.delete({
            where: { id: item.id },
          });
        }

        // ChecklistCategory の削除
        await prisma.checklistCategory.delete({
          where: { id: category.id },
        });
      }

      // LearnerChecklist の削除
      await prisma.learnerChecklist.deleteMany({
        where: { checklistTemplateId: dup.id },
      });

      // テンプレート本体を削除
      await prisma.checklistTemplate.delete({
        where: { id: dup.id },
      });

      console.log(`    ✅ 削除完了`);
    }
  } else {
    console.log("  ✅ 重複なし");
  }

  // ─────────────────────────────────────────
  // 2. CurriculumPlan の重複削除
  // ─────────────────────────────────────────

  console.log("\n📚 CurriculumPlan の重複を確認中...");

  const plans = await prisma.curriculumPlan.findMany({
    orderBy: { id: "asc" },
    include: {
      items: true,
      assignments: true,
    },
  });

  const plansByName = new Map<string, typeof plans>();
  for (const plan of plans) {
    if (!plansByName.has(plan.name)) {
      plansByName.set(plan.name, []);
    }
    plansByName.get(plan.name)!.push(plan);
  }

  for (const [name, groupedPlans] of plansByName) {
    if (groupedPlans.length > 1) {
      console.log(`  ⚠️  "${name}" が ${groupedPlans.length}個見つかりました`);

      const keepPlan = groupedPlans[0];
      const duplicatePlans = groupedPlans.slice(1);

      console.log(`  ✅ 保持: ${keepPlan.name} (${keepPlan.id})`);

      for (const dup of duplicatePlans) {
        console.log(`  🗑️  削除対象: ${dup.name} (${dup.id})`);

        // UserCurriculumPlan を保持するプランに移動
        await prisma.userCurriculumPlan.updateMany({
          where: { curriculumPlanId: dup.id },
          data: { curriculumPlanId: keepPlan.id },
        });

        // CurriculumItem を削除
        await prisma.curriculumItem.deleteMany({
          where: { curriculumPlanId: dup.id },
        });

        // CurriculumPlan を削除
        await prisma.curriculumPlan.delete({
          where: { id: dup.id },
        });

        console.log(`    ✅ 削除完了`);
      }
    }
  }

  console.log("  ✅ 重複なし（または既に処理済み）");

  // ─────────────────────────────────────────
  // 3. Assignment の重複削除（タイトルベース）
  // ─────────────────────────────────────────

  console.log("\n📝 Assignment の重複を確認中...");

  const assignments = await prisma.assignment.findMany({
    orderBy: { id: "asc" },
    include: {
      submissions: true,
      lessons: true,
    },
  });

  const assignmentsByTitle = new Map<string, typeof assignments>();
  for (const assignment of assignments) {
    if (!assignmentsByTitle.has(assignment.title)) {
      assignmentsByTitle.set(assignment.title, []);
    }
    assignmentsByTitle.get(assignment.title)!.push(assignment);
  }

  for (const [title, groupedAssignments] of assignmentsByTitle) {
    if (groupedAssignments.length > 1) {
      console.log(`  ⚠️  "${title}" が ${groupedAssignments.length}個見つかりました`);

      const keepAssignment = groupedAssignments[0];
      const duplicateAssignments = groupedAssignments.slice(1);

      console.log(`  ✅ 保持: ${keepAssignment.title} (${keepAssignment.id})`);

      for (const dup of duplicateAssignments) {
        console.log(`  🗑️  削除対象: ${dup.title} (${dup.id})`);

        // Submission を保持する Assignment に移動
        await prisma.submission.updateMany({
          where: { assignmentId: dup.id },
          data: { assignmentId: keepAssignment.id },
        });

        // Lesson を保持する Assignment に移動
        await prisma.lesson.updateMany({
          where: { assignmentId: dup.id },
          data: { assignmentId: keepAssignment.id },
        });

        // CurriculumItem を保持する Assignment に移動
        await prisma.curriculumItem.updateMany({
          where: { assignmentId: dup.id },
          data: { assignmentId: keepAssignment.id },
        });

        // Assignment を削除
        await prisma.assignment.delete({
          where: { id: dup.id },
        });

        console.log(`    ✅ 削除完了`);
      }
    }
  }

  console.log("  ✅ 重複なし（または既に処理済み）");

  console.log("\n✅ クリーンアップ完了！");
}

cleanupDuplicates()
  .catch((e) => {
    console.error("❌ エラーが発生しました:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
