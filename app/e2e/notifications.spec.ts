import { test, expect } from "@playwright/test";
import { loginAsLearner } from "./helpers/auth";

test.describe("通知", () => {
  test("通知ページがエラーなく表示される", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await loginAsLearner(page);
    await page.goto("/notifications");
    await expect(
      page.getByRole("heading", { name: "通知" })
    ).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("通知ベルアイコンがダッシュボードに表示される", async ({ page }) => {
    await loginAsLearner(page);
    await expect(page.getByTitle("通知")).toBeVisible();
  });

  test("通知アイテムをクリックしてもエラーが発生しない", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await loginAsLearner(page);
    await page.goto("/notifications");

    const item = page.locator("[role=button]").first();
    if (await item.isVisible()) {
      await item.click();
      await page.waitForTimeout(1000);
    }
    expect(errors).toEqual([]);
  });

  test("「すべて既読にする」ボタンがエラーなく動作する", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await loginAsLearner(page);
    await page.goto("/notifications");

    const btn = page.getByRole("button", { name: "すべて既読にする" });
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(1000);
    }
    expect(errors).toEqual([]);
  });

  test("「詳細を見る」リンクをクリックして遷移できる", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await loginAsLearner(page);
    await page.goto("/notifications");

    const link = page.getByText("詳細を見る →").first();
    if (await link.isVisible()) {
      await link.click();
      await page.waitForURL((url) => !url.pathname.includes("/notifications"));
    }
    expect(errors).toEqual([]);
  });
});
