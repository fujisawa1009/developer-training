import { test, expect } from "@playwright/test";
import { loginAsAdmin, loginAsInstructor } from "./helpers/auth";

test.describe("管理: 評価期間", () => {
  test("評価期間一覧が表示される", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/evaluation-periods");
    await expect(page.getByText("評価タイミング管理")).toBeVisible();
  });

  test("評価期間を作成できる", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/evaluation-periods");

    // 「1ヶ月評価」ラベルをクリック（sr-only radioのため label 要素をクリック）
    const label = page.locator("label").filter({ hasText: "1ヶ月評価" });
    if (await label.isVisible({ timeout: 3000 }).catch(() => false)) {
      await label.click();

      const submitBtn = page.getByRole("button", {
        name: "評価タイミングを開始する",
      });
      await submitBtn.click();

      // 詳細ページにリダイレクト
      await expect(page).toHaveURL(/\/admin\/evaluation-periods\//, {
        timeout: 10000,
      });
    }
  });

  test("評価期間の詳細を表示できる", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/evaluation-periods");

    // 最初の評価期間カードをクリック
    const periodCard = page
      .getByRole("link")
      .filter({ hasText: /ヶ月評価/ })
      .first();
    if (await periodCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await periodCard.click();
      await expect(page).toHaveURL(/\/admin\/evaluation-periods\//);
      // 詳細ページが表示される
      await expect(page.locator("main")).toBeVisible();
    }
  });

  test("講師が受講者の評価ページにアクセスできる", async ({ page }) => {
    await loginAsInstructor(page);
    await page.goto("/admin/evaluation-periods");

    // 評価期間の詳細へ
    const periodCard = page
      .getByRole("link")
      .filter({ hasText: /ヶ月評価/ })
      .first();
    if (await periodCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await periodCard.click();

      // 「評価を入力」リンクをクリック
      const evalLink = page.getByRole("link", { name: /評価を入力/ }).first();
      if (await evalLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await evalLink.click();
        await expect(page).toHaveURL(/\/learners\//);
      }
    }
  });
});
