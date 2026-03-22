import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("管理: ユーザー管理", () => {
  test("ユーザー一覧が表示される", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/users");
    await expect(
      page.getByRole("heading", { name: "ユーザー管理" })
    ).toBeVisible();
    // テーブル内にメールが表示される
    await expect(
      page.getByRole("cell", { name: "admin@example.com" })
    ).toBeVisible();
  });

  test("ユーザーを新規作成できる", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/users/new");
    await expect(
      page.getByRole("heading", { name: "ユーザーを追加" })
    ).toBeVisible();

    await page.getByLabel("氏名").fill("E2Eテストユーザー");
    await page.getByLabel("メールアドレス").fill(`e2e-test-${Date.now()}@example.com`);
    await page.getByLabel("パスワード").fill("testpass123");

    await page.getByRole("button", { name: "ユーザーを作成する" }).click();
    await expect(page).toHaveURL(/\/admin\/users/, { timeout: 10000 });
  });

  test("バリデーションエラーが表示される", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/users/new");

    // 短いパスワードで送信（Server Actionバリデーション発火）
    await page.getByLabel("氏名").fill("テスト");
    await page.getByLabel("メールアドレス").fill("valid@example.com");
    await page.getByLabel("パスワード").fill("short");

    await page.getByRole("button", { name: "ユーザーを作成する" }).click();
    await page.waitForTimeout(2000);

    // バリデーションエラーでページに留まる
    await expect(page).toHaveURL(/\/admin\/users\/new/);
  });

  test("ユーザー情報を編集できる", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/users");

    // テーブル内の「編集」リンクをクリック
    const tableArea = page.locator("table");
    const editLink = tableArea.getByRole("link", { name: "編集" }).first();
    await editLink.click();
    await expect(page).toHaveURL(/\/admin\/users\/.*\/edit/, { timeout: 10000 });
    await expect(page.getByLabel("氏名")).toBeVisible();
  });

  test("ユーザーを削除できる", async ({ page }) => {
    await loginAsAdmin(page);

    // 削除用ユーザーを作成
    await page.goto("/admin/users/new");
    const testEmail = `e2e-delete-${Date.now()}@example.com`;
    await page.getByLabel("氏名").fill("削除テスト");
    await page.getByLabel("メールアドレス").fill(testEmail);
    await page.getByLabel("パスワード").fill("testpass123");
    await page.getByRole("button", { name: "ユーザーを作成する" }).click();
    await expect(page).toHaveURL(/\/admin\/users/, { timeout: 10000 });

    // ページをリロードして作成したユーザーを確認
    await page.goto("/admin/users");
    const row = page.locator("tr").filter({ hasText: testEmail });
    await expect(row).toBeVisible({ timeout: 10000 });
    page.on("dialog", (dialog) => dialog.accept());
    await row.getByRole("button").first().click();
    await page.waitForTimeout(3000);
    // 削除後、一覧から消える
    await expect(row).not.toBeVisible({ timeout: 5000 });
  });
});
