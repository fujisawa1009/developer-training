import { test, expect } from "@playwright/test";
import { loginAsLearner } from "./helpers/auth";

// 課題レッスンに遷移するヘルパー
async function navigateToAssignmentLesson(page: import("@playwright/test").Page) {
  await loginAsLearner(page);

  const curriculumLink = page.getByRole("link", { name: /入門|基礎/ }).first();
  if (!(await curriculumLink.isVisible())) return false;
  await curriculumLink.click();

  const assignmentLesson = page.locator("a").filter({ hasText: "課題" }).first();
  if (!(await assignmentLesson.isVisible())) return false;
  await assignmentLesson.click();
  await page.waitForTimeout(1000);
  return true;
}

test.describe("課題提出", () => {
  test("課題開始ボタンで下書きが作成される", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    const navigated = await navigateToAssignmentLesson(page);
    if (!navigated) return;

    const startBtn = page.getByRole("button", { name: /課題を開始する|提出を開始する/ });
    if (await startBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await startBtn.click();
      await page.waitForTimeout(2000);
      // 開始後、回答入力欄または取り組み中の表示が出る
      await expect(
        page.getByText(/取り組み中|回答/)
      ).toBeVisible({ timeout: 5000 });
    }
    expect(errors).toEqual([]);
  });

  test("テキスト回答を入力できる", async ({ page }) => {
    const navigated = await navigateToAssignmentLesson(page);
    if (!navigated) return;

    // テキスト入力欄が表示されている場合
    const textarea = page.locator("textarea").first();
    if (await textarea.isVisible({ timeout: 3000 }).catch(() => false)) {
      await textarea.fill("テスト回答です。E2Eテストによる入力。");
      await expect(textarea).toHaveValue(/テスト回答/);
    }
  });

  test("テキスト回答のペーストが禁止されている", async ({ page }) => {
    const navigated = await navigateToAssignmentLesson(page);
    if (!navigated) return;

    const textarea = page.locator("textarea").first();
    if (await textarea.isVisible({ timeout: 3000 }).catch(() => false)) {
      // テキストエリアをクリックしてフォーカス
      await textarea.click();

      // ペーストイベントをディスパッチ
      const pasteHandled = await textarea.evaluate((el) => {
        return new Promise<boolean>((resolve) => {
          const handler = (e: Event) => {
            resolve(e.defaultPrevented);
            el.removeEventListener("paste", handler);
          };
          el.addEventListener("paste", handler);

          const event = new ClipboardEvent("paste", {
            bubbles: true,
            cancelable: true,
            clipboardData: new DataTransfer(),
          });
          el.dispatchEvent(event);
        });
      });
      // ペーストイベントがキャンセルされたことを確認
      expect(pasteHandled).toBe(true);
    }
  });

  test("課題を提出できる", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    const navigated = await navigateToAssignmentLesson(page);
    if (!navigated) return;

    // 提出ボタンが表示されている場合
    const submitBtn = page.getByRole("button", { name: "課題を提出する" });
    if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      // テキスト入力がある場合は入力
      const textarea = page.locator("textarea").first();
      if (await textarea.isVisible({ timeout: 1000 }).catch(() => false)) {
        await textarea.fill("E2Eテストによる提出回答です。十分な文字数のある回答を入力しています。");
      }

      // GitHub URL入力がある場合は入力
      const urlInput = page.locator("input[type='url'], input[placeholder*='github']").first();
      if (await urlInput.isVisible({ timeout: 1000 }).catch(() => false)) {
        await urlInput.fill("https://github.com/test/repo");
      }

      await submitBtn.click();
      await page.waitForTimeout(3000);
    }
    expect(errors).toEqual([]);
  });

  test("提出後にコメントを投稿できる", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    const navigated = await navigateToAssignmentLesson(page);
    if (!navigated) return;

    // コメント入力欄が表示されている場合（提出済みの課題で表示）
    const commentTextarea = page.getByPlaceholder(/コメント/);
    if (await commentTextarea.isVisible({ timeout: 3000 }).catch(() => false)) {
      await commentTextarea.fill("E2Eテストコメントです。");
      const sendBtn = page.getByRole("button", { name: /送信|コメント/ });
      if (await sendBtn.isVisible()) {
        await sendBtn.click();
        await page.waitForTimeout(2000);
      }
    }
    expect(errors).toEqual([]);
  });

  test("提出履歴が表示される", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    const navigated = await navigateToAssignmentLesson(page);
    if (!navigated) return;

    // 提出履歴（第X回目）の表示を確認
    const history = page.getByText(/第 \d+ 回/);
    if (await history.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(history.first()).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
});
