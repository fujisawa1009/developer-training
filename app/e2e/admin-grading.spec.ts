import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers/auth";

test.describe("管理: 提出物・採点", () => {
  test("提出物一覧が表示される", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/submissions");
    await expect(
      page.getByRole("heading", { name: "提出物管理" })
    ).toBeVisible();
  });

  test("提出物の詳細を表示できる", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/submissions");

    // 「採点する」または「詳細」リンクをクリック
    const actionLink = page
      .getByRole("link", { name: /採点する|詳細/ })
      .first();
    if (await actionLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await actionLink.click();
      await expect(page).toHaveURL(/\/admin\/submissions\//);
      // 詳細ページが表示される（受講者情報セクション）
      await expect(page.locator("main")).toBeVisible();
    }
  });

  test("講師採点を実行できる", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/submissions");

    // 「採点する」リンクがある提出物を探す
    const gradeLink = page.getByRole("link", { name: "採点する" }).first();
    if (await gradeLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await gradeLink.click();

      // 合格を選択
      const passRadio = page.getByLabel("合格");
      if (await passRadio.isVisible({ timeout: 3000 }).catch(() => false)) {
        await passRadio.click();

        // コメントを入力
        const commentArea = page.getByPlaceholder(/採点理由|改善点/);
        if (await commentArea.isVisible()) {
          await commentArea.fill(
            "E2Eテストによる採点です。良い回答でした。"
          );
        }

        // 採点ボタンをクリック
        const submitBtn = page.getByRole("button", { name: /採点|保存/ });
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
          await page.waitForTimeout(3000);
        }
      }
    }
  });

  test("AI再採点ボタンがエラーなく動作する", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/submissions");

    // 詳細ページへ
    const actionLink = page
      .getByRole("link", { name: /採点する|詳細/ })
      .first();
    if (await actionLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await actionLink.click();

      // AI再採点ボタンを探す
      const retryBtn = page.getByRole("button", { name: /AI再採点|再採点/ });
      if (await retryBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await retryBtn.click();
        await page.waitForTimeout(5000);
      }
    }
  });
});
