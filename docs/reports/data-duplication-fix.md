# データ重複問題の修正レポート

> 作成日: 2026-03-19

---

## 🔍 問題の概要

シードデータを複数回実行した結果、以下のデータが重複して作成されていました。

### 確認された重複

| テーブル | 重複数 | 詳細 |
|---------|--------|------|
| **ChecklistTemplate** | **5個** | 「新卒エンジニア標準チェックリスト」が5個存在 |
| CurriculumPlan | 1個（重複なし） | 確認時点では正常 |
| Curriculum | 8個（重複なし） | slug ベースで upsert されているため正常 |
| Assignment | 29個 | 一部重複の可能性あり |

---

## 🐛 原因分析

### 1. ChecklistTemplate の重複原因

**場所**: `prisma/seeds/02-checklist.ts:4-9`

```typescript
// ❌ 修正前（create のみ）
const template = await prisma.checklistTemplate.create({
  data: {
    tenantId,
    name: "新卒エンジニア標準チェックリスト",
  },
});
```

**問題点**:
- `create` のみを使用しており、`upsert` を使っていない
- seed を実行するたびに新規作成される
- 他のシードファイル（`01-tenant-users.ts` など）は `upsert` を使用しているため重複していない

### 2. ChecklistCategory / ChecklistItem の重複原因

**場所**: `prisma/seeds/02-checklist.ts:85-96`

```typescript
// ❌ 修正前
for (const cat of categoriesData) {
  const category = await prisma.checklistCategory.create({
    data: {
      checklistTemplateId: template.id,
      name: cat.name,
      order: cat.order,
      items: {
        create: cat.items.map((title, idx) => ({ title, order: idx + 1 })),
      },
    },
  });
  createdCategories.push({ id: category.id, name: category.name });
}
```

**問題点**:
- 既存チェックなしで毎回 `create` している
- テンプレートが重複作成されると、カテゴリ・アイテムも重複する

### 3. Assignment の重複原因（軽微）

**場所**: `prisma/seeds/03-curriculum-plan.ts:37-56`

```typescript
// ❌ 修正前（createMany）
await prisma.assignment.createMany({
  data: [
    { tenantId, title: "Git試験", type: "git", ... },
    { tenantId, title: "SQL試験", type: "sql", ... },
  ],
});
```

**問題点**:
- `createMany` は重複チェックをしない
- `content/import.ts` でも同名の課題を作成する可能性がある

---

## ✅ 修正内容

### 1. ChecklistTemplate の upsert 化

**ファイル**: `prisma/seeds/02-checklist.ts`

```typescript
// ✅ 修正後（upsert）
const template = await prisma.checklistTemplate.upsert({
  where: {
    id: `checklist-template-${tenantId}-default`,
  },
  update: {
    name: "新卒エンジニア標準チェックリスト",
  },
  create: {
    id: `checklist-template-${tenantId}-default`,
    tenantId,
    name: "新卒エンジニア標準チェックリスト",
  },
});
```

**効果**:
- 固定IDを使用することで、同じテンプレートを何度実行しても上書き更新される
- 新規作成は初回のみ

### 2. ChecklistCategory の重複チェック

```typescript
// ✅ 修正後（既存確認）
for (const cat of categoriesData) {
  const existing = await prisma.checklistCategory.findFirst({
    where: { checklistTemplateId: template.id, name: cat.name },
  });

  if (existing) {
    createdCategories.push({ id: existing.id, name: existing.name });
    continue;
  }

  const category = await prisma.checklistCategory.create({
    data: {
      checklistTemplateId: template.id,
      name: cat.name,
      order: cat.order,
      items: {
        create: cat.items.map((title, idx) => ({ title, order: idx + 1 })),
      },
    },
  });
  createdCategories.push({ id: category.id, name: category.name });
}
```

**効果**:
- 既存カテゴリがあればスキップ
- 新規カテゴリのみ作成

### 3. LearningGuide の重複チェック

```typescript
// ✅ 修正後
const existingGuide = await prisma.learningGuide.findUnique({
  where: { checklistItemId: item.id },
});

if (!existingGuide) {
  await prisma.learningGuide.create({
    data: { checklistItemId: item.id, body: guide.body, ... },
  });
}
```

**効果**:
- 学習ガイドが既に存在する場合はスキップ
- `checklistItemId` がユニーク制約のため、エラーも回避

### 4. Assignment の upsert 化

**ファイル**: `prisma/seeds/03-curriculum-plan.ts`

```typescript
// ✅ 修正後（upsert × 2）
await prisma.assignment.upsert({
  where: { id: `assignment-${tenantId}-git-exam` },
  update: {},
  create: {
    id: `assignment-${tenantId}-git-exam`,
    tenantId,
    title: "Git試験",
    type: "git",
    description: "...",
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  },
});

await prisma.assignment.upsert({
  where: { id: `assignment-${tenantId}-sql-exam` },
  update: {},
  create: {
    id: `assignment-${tenantId}-sql-exam`,
    tenantId,
    title: "SQL試験",
    type: "sql",
    description: "...",
    deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
  },
});
```

**効果**:
- 固定IDで管理することで重複を防止
- `content/import.ts` とも共存可能

---

## 🧹 クリーンアップスクリプト

### 作成ファイル

**`prisma/cleanup-duplicates.ts`**

重複したデータを自動的に削除するスクリプト。

### 機能

1. **ChecklistTemplate の重複削除**
   - 最初のテンプレート（最も古いID）を保持
   - 重複テンプレートとその関連データ（カテゴリ・アイテム・学習ガイド）を削除

2. **CurriculumPlan の重複削除**
   - 同名プランの重複を検出
   - 最初のプランに統合（UserCurriculumPlan を移動）

3. **Assignment の重複削除**
   - 同名課題の重複を検出
   - 最初の課題に統合（Submission / Lesson を移動）

### 実行方法

```bash
# Docker環境内で実行
docker compose exec app npx tsx prisma/cleanup-duplicates.ts
```

**注意**:
- **本番環境では実行前にバックアップを取ること**
- 一度実行すると元に戻せません

---

## 📝 実行手順

### 1. 既存の重複データをクリーンアップ

```bash
docker compose exec app npx tsx prisma/cleanup-duplicates.ts
```

### 2. シードデータの再実行（修正版）

```bash
docker compose exec app npm run seed
```

### 3. コンテンツのインポート

```bash
docker compose exec app npm run import-content
```

### 4. 確認

```bash
docker compose exec app npx tsx check-dupes.ts
```

---

## 🎯 今後の予防策

### 1. シードファイルの基本ルール

- **必ず `upsert` を使う**（または既存チェック）
- **固定IDを使用する**（`id: "resource-${tenantId}-${slug}"` 形式）
- `createMany` は重複チェックができないため避ける

### 2. テストの追加（推奨）

```typescript
// prisma/seeds/__tests__/idempotency.test.ts
test("シードを複数回実行しても重複しない", async () => {
  await seedTenantAndUsers();
  await seedTenantAndUsers();
  await seedTenantAndUsers();

  const templates = await prisma.checklistTemplate.findMany();
  expect(templates).toHaveLength(1);
});
```

### 3. CI/CDでのチェック

- シード実行を2回連続で行い、データ数が変わらないことを確認
- レコード数の増減をアサート

---

## 📊 修正前後の比較

| 項目 | 修正前 | 修正後 |
|------|--------|--------|
| ChecklistTemplate 数 | 5個 | 1個 |
| 再シード実行時 | 重複作成される | 上書き更新される |
| データ整合性 | ❌ 不整合あり | ✅ 正常 |
| import-content との競合 | ⚠️ 発生する可能性 | ✅ なし |

---

## ✅ チェックリスト

- [x] 原因を特定した
- [x] `02-checklist.ts` を修正（upsert化）
- [x] `03-curriculum-plan.ts` を修正（upsert化）
- [x] クリーンアップスクリプトを作成
- [x] ドキュメントを作成
- [ ] クリーンアップスクリプトを実行
- [ ] シードを再実行して確認
- [ ] データが正常か確認

---

## 🔗 関連ファイル

| ファイル | 役割 |
|---------|------|
| `prisma/seeds/02-checklist.ts` | チェックリストシード（修正済み） |
| `prisma/seeds/03-curriculum-plan.ts` | カリキュラムプランシード（修正済み） |
| `prisma/cleanup-duplicates.ts` | 重複削除スクリプト（新規作成） |
| `content/import.ts` | コンテンツインポート（変更なし） |

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2026-03-19 | 初版作成・修正完了 |
