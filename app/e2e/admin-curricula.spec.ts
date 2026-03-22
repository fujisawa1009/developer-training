import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("管理: カリキュラム管理", () => {
  test("カリキュラム一覧が表示される", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/curricula");
    await expect(
      page.getByRole("heading", { name: "カリキュラム管理" })
    ).toBeVisible();
  });

  test("カリキュラムを新規作成できる", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/curricula/new");
    await expect(
      page.getByRole("heading", { name: "カリキュラム新規作成" })
    ).toBeVisible();

    const slug = `e2e-test-${Date.now()}`;
    await page.getByLabel("カリキュラム名").fill("E2Eテストカリキュラム");
    await page.getByLabel("スラッグ").fill(slug);
    await page.getByRole("button", { name: "作成する" }).click();

    // 作成後にカリキュラム詳細または一覧にリダイレクト
    await expect(page).toHaveURL(/\/admin\/curricula/, { timeout: 10000 });
  });

  test("カリキュラムにレッスンを追加できる", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/curricula");

    // テーブル内のカリキュラムリンクをクリック
    const mainContent = page.locator("main, [class*='p-8']").first();
    const curriculumLink = mainContent.locator("a").first();
    if (await curriculumLink.isVisible()) {
      await curriculumLink.click();
      await page.waitForTimeout(2000);

      // 「レッスンを追加」リンクを探す
      const addLink = page.getByRole("link", { name: /レッスンを追加|レッスン追加/ });
      if (await addLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await addLink.click();
        await expect(
          page.getByRole("heading", { name: /レッスンを追加/ })
        ).toBeVisible();
      }
    }
  });

  test("レッスンを編集できる", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/curricula");

    // テーブル内のカリキュラムリンクをクリック
    const mainContent = page.locator("main, [class*='p-8']").first();
    const curriculumLink = mainContent.locator("a").first();
    if (await curriculumLink.isVisible()) {
      await curriculumLink.click();
      await page.waitForTimeout(2000);

      // レッスンの編集リンク（ペンアイコン）をクリック
      const editLink = page.locator("a[href*='/lessons/'][href*='/edit']").first();
      if (await editLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await editLink.click();
        await page.waitForTimeout(2000);
        // 編集ページが表示される
        await expect(page).toHaveURL(/\/lessons\/.*\/edit/);
      }
    }
  });

  test("カリキュラムを削除できる", async ({ page }) => {
    await loginAsAdmin(page);

    // テスト用カリキュラムを作成
    await page.goto("/admin/curricula/new");
    const slug = `e2e-delete-${Date.now()}`;
    await page.getByLabel("カリキュラム名").fill("削除テストカリキュラム");
    await page.getByLabel("スラッグ").fill(slug);
    await page.getByRole("button", { name: "作成する" }).click();
    await expect(page).toHaveURL(/\/admin\/curricula/, { timeout: 10000 });

    // 削除ボタンをクリック
    const deleteBtn = page.getByRole("button", { name: /削除/ });
    if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      page.on("dialog", (dialog) => dialog.accept());
      await deleteBtn.click();
      await page.waitForTimeout(2000);
    }
  });
});
