/**
 * content/curricula/ 以下のファイルを読み込んでDBに登録するスクリプト
 *
 * 実行方法:
 *   docker compose exec app npx tsx --env-file=.env content/import.ts
 *   npx tsx --env-file=.env content/import.ts
 *
 * 注意: 同じ slug のカリキュラムは上書き更新されます
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import fs from "fs";
import path from "path";

// ─────────────────────────────────────────
// 型定義
// ─────────────────────────────────────────

interface CurriculumMeta {
  name: string;
  description?: string;
  order?: number;
}

interface TextLessonFrontmatter {
  title: string;
  type: "text";
  order: number;
}

interface VideoLesson {
  title: string;
  type: "video";
  order: number;
  videoUrl: string;
  description?: string;
}

interface AssignmentLesson {
  title: string;
  type: "assignment";
  order: number;
  assignmentType: "git" | "sql" | "program" | "debug";
  description: string;
  deadline_days?: number;
}

type LessonFile = VideoLesson | AssignmentLesson;

// ─────────────────────────────────────────
// ユーティリティ
// ─────────────────────────────────────────

function parseFrontmatter(content: string): {
  frontmatter: TextLessonFrontmatter;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) throw new Error("frontmatter が見つかりません");

  const lines = match[1].split("\n");
  const fm: Record<string, unknown> = {};
  for (const line of lines) {
    const [key, ...valueParts] = line.split(": ");
    const value = valueParts.join(": ").replace(/^"|"$/g, "");
    fm[key.trim()] = key.trim() === "order" ? Number(value) : value;
  }

  return {
    frontmatter: fm as unknown as TextLessonFrontmatter,
    body: match[2].trim(),
  };
}

// ─────────────────────────────────────────
// メイン処理
// ─────────────────────────────────────────

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function importCurricula(tenantId: string) {
  const curriculaDir = path.join(process.cwd(), "content/curricula");
  const entries = fs.readdirSync(curriculaDir, { withFileTypes: true });

  for (const entry of entries) {
    // アンダースコア始まり（_template 等）と README.md はスキップ
    if (!entry.isDirectory() || entry.name.startsWith("_")) continue;

    const slug = entry.name;
    const curriculumDir = path.join(curriculaDir, slug);

    // meta.json を読み込み
    const metaPath = path.join(curriculumDir, "meta.json");
    if (!fs.existsSync(metaPath)) {
      console.warn(`⚠️  ${slug}/meta.json が見つかりません。スキップします。`);
      continue;
    }
    const meta: CurriculumMeta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));

    // カリキュラムをupsert
    const curriculum = await prisma.curriculum.upsert({
      where: { tenantId_slug: { tenantId, slug } },
      update: {
        name: meta.name,
        description: meta.description,
        order: meta.order ?? 0,
      },
      create: {
        tenantId,
        slug,
        name: meta.name,
        description: meta.description,
        order: meta.order ?? 0,
      },
    });

    console.log(`📚 カリキュラム: ${curriculum.name} (${slug})`);

    // レッスンファイルを読み込み
    const lessonsDir = path.join(curriculumDir, "lessons");
    if (!fs.existsSync(lessonsDir)) {
      console.warn(`  ⚠️  lessons/ ディレクトリが見つかりません。`);
      continue;
    }

    const lessonFiles = fs.readdirSync(lessonsDir).sort();

    for (const file of lessonFiles) {
      const filePath = path.join(lessonsDir, file);
      const lessonSlug = path.basename(file, path.extname(file));

      let lessonData: {
        slug: string;
        title: string;
        type: "text" | "video" | "assignment";
        order: number;
        body?: string;
        videoUrl?: string;
        assignmentId?: string;
      };

      if (file.endsWith(".md")) {
        // テキストレッスン
        const content = fs.readFileSync(filePath, "utf-8");
        const { frontmatter, body } = parseFrontmatter(content);
        lessonData = {
          slug: lessonSlug,
          title: frontmatter.title,
          type: "text",
          order: frontmatter.order,
          body,
        };
      } else if (file.endsWith(".json")) {
        // 動画 or 課題レッスン
        const data: LessonFile = JSON.parse(fs.readFileSync(filePath, "utf-8"));

        if (data.type === "video") {
          lessonData = {
            slug: lessonSlug,
            title: data.title,
            type: "video",
            order: data.order,
            videoUrl: data.videoUrl,
          };
        } else if (data.type === "assignment") {
          // Assignment を作成or取得
          const deadline = data.deadline_days
            ? new Date(Date.now() + data.deadline_days * 24 * 60 * 60 * 1000)
            : undefined;

          const assignment = await prisma.assignment.upsert({
            where: {
              // slug がないので title + tenantId で代用（本来はslugを持たせるとよい）
              id: `assignment-${tenantId}-${lessonSlug}`,
            },
            update: { title: data.title, description: data.description },
            create: {
              id: `assignment-${tenantId}-${lessonSlug}`,
              tenantId,
              title: data.title,
              type: data.assignmentType,
              description: data.description,
              deadline,
            },
          });

          lessonData = {
            slug: lessonSlug,
            title: data.title,
            type: "assignment",
            order: data.order,
            assignmentId: assignment.id,
          };
        } else {
          console.warn(`  ⚠️  不明なtype: ${file}`);
          continue;
        }
      } else {
        continue;
      }

      // レッスンをupsert
      await prisma.lesson.upsert({
        where: {
          curriculumId_slug: {
            curriculumId: curriculum.id,
            slug: lessonData.slug,
          },
        },
        update: lessonData,
        create: { ...lessonData, curriculumId: curriculum.id },
      });

      const icon =
        lessonData.type === "text"
          ? "📄"
          : lessonData.type === "video"
            ? "🎬"
            : "📝";
      console.log(`  ${icon} ${lessonData.order}. ${lessonData.title}`);
    }
  }
}

async function main() {
  console.log("📦 コンテンツをインポートします...\n");

  // デフォルトテナントを取得（複数テナントの場合は引数で指定）
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) {
    console.error("❌ テナントが見つかりません。先にシードを実行してください。");
    process.exit(1);
  }

  await importCurricula(tenant.id);

  console.log("\n✅ インポート完了！");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
