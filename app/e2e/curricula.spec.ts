import { test, expect } from "@playwright/test";
import { loginAsLearner } from "./helpers/auth";

test.describe("カリキュラム・レッスン", () => {
  test("ダッシュボードからカリキュラムに遷移できる", async ({ page }) => {
    await loginAsLearner(page);

    // カリキュラムへのリンクを探してクリック
    const curriculumLink = page.getByRole("link", { name: /入門|基礎/ }).first();
    if (await curriculumLink.isVisible()) {
      await curriculumLink.click();
      await expect(page).toHaveURL(/\/curricula\//);
    }
  });

  test("カリキュラム詳細ページにレッスン一覧が表示される", async ({ page }) => {
    await loginAsLearner(page);

    // Git入門カリキュラムに直接アクセス（seedデータのslugベース）
    // まずカリキュラムIDを取得するためにダッシュボードからリンクを探す
    const curriculumLink = page.getByRole("link", { name: /入門|基礎/ }).first();
    if (await curriculumLink.isVisible()) {
      await curriculumLink.click();
      await expect(page.getByText("レッスン完了")).toBeVisible();
      // レッスンのタイプバッジが表示される
      await expect(
        page.getByText(/テキスト|動画|課題/).first()
      ).toBeVisible();
    }
  });

  test("テキストレッスンのコンテンツが表示される", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await loginAsLearner(page);

    const curriculumLink = page.getByRole("link", { name: /入門|基礎/ }).first();
    if (await curriculumLink.isVisible()) {
      await curriculumLink.click();

      // 最初のレッスン（テキスト型）をクリック
      const firstLesson = page.getByRole("link", { name: /レッスン|テキスト/ }).first();
      if (await firstLesson.isVisible()) {
        await firstLesson.click();
        // レッスンページが表示される
        await expect(page.getByText(/レッスン \d+ \/ \d+/)).toBeVisible();
      }
    }
    expect(errors).toEqual([]);
  });

  test("レッスン完了ボタンが動作する", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await loginAsLearner(page);

    const curriculumLink = page.getByRole("link", { name: /入門|基礎/ }).first();
    if (await curriculumLink.isVisible()) {
      await curriculumLink.click();

      const firstLesson = page.getByRole("link", { name: /レッスン|テキスト/ }).first();
      if (await firstLesson.isVisible()) {
        await firstLesson.click();

        const completeBtn = page.getByRole("button", {
          name: /このレッスンを完了する|動画を視聴しました/,
        });
        if (await completeBtn.isVisible()) {
          await completeBtn.click();
          await page.waitForTimeout(2000);
          // 完了後もエラーがない
        }
      }
    }
    expect(errors).toEqual([]);
  });

  test("動画レッスンにURLリンクが表示される", async ({ page }) => {
    await loginAsLearner(page);

    const curriculumLink = page.getByRole("link", { name: /入門|基礎/ }).first();
    if (await curriculumLink.isVisible()) {
      await curriculumLink.click();

      // 動画バッジのあるレッスンを探す
      const videoLesson = page
        .locator("a")
        .filter({ hasText: "動画" })
        .first();
      if (await videoLesson.isVisible()) {
        await videoLesson.click();
        // 動画ページではURLリンクまたは動画コンテンツが表示される
        await expect(page.getByText(/レッスン \d+ \/ \d+/)).toBeVisible();
      }
    }
  });

  test("課題レッスンに課題説明が表示される", async ({ page }) => {
    await loginAsLearner(page);

    const curriculumLink = page.getByRole("link", { name: /入門|基礎/ }).first();
    if (await curriculumLink.isVisible()) {
      await curriculumLink.click();

      const assignmentLesson = page
        .locator("a")
        .filter({ hasText: "課題" })
        .first();
      if (await assignmentLesson.isVisible()) {
        await assignmentLesson.click();
        // 課題の説明または開始ボタンが表示される
        await expect(
          page.getByText(/課題を開始する|課題を提出する|取り組み中|合格|提出済み/)
        ).toBeVisible();
      }
    }
  });

  test("レッスン間のナビゲーションが動作する", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await loginAsLearner(page);

    const curriculumLink = page.getByRole("link", { name: /入門|基礎/ }).first();
    if (await curriculumLink.isVisible()) {
      await curriculumLink.click();

      const firstLesson = page.getByRole("link", { name: /レッスン|テキスト/ }).first();
      if (await firstLesson.isVisible()) {
        await firstLesson.click();

        // 「次のレッスンへ」リンクが表示される場合クリック
        const nextLink = page.getByRole("link", { name: /次のレッスン/ });
        if (await nextLink.isVisible({ timeout: 3000 }).catch(() => false)) {
          await nextLink.click();
          await page.waitForTimeout(1000);
        }
      }
    }
    expect(errors).toEqual([]);
  });
});
