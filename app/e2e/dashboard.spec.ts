import { test, expect } from "@playwright/test";
import { loginAsAdmin, loginAsLearner } from "./helpers/auth";

test.describe("ダッシュボード", () => {
  test("受講者ダッシュボードが表示される", async ({ page }) => {
    await loginAsLearner(page);
    await expect(
      page.getByRole("heading", { name: "割り当てられたカリキュラムプラン" })
    ).toBeVisible();
  });

  test("管理者ダッシュボードが表示される", async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByText("管理画面")).toBeVisible();
  });

  test("管理者サイドバーにナビゲーションリンクが表示される", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/curricula");
    await expect(
      page.getByRole("link", { name: "カリキュラム管理" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "ユーザー管理" })
    ).toBeVisible();
  });

  test("受講者が管理画面にアクセスするとダッシュボードにリダイレクトされる", async ({
    page,
  }) => {
    await loginAsLearner(page);
    await page.goto("/admin/curricula");
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
