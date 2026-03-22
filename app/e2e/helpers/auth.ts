import { Page, expect } from "@playwright/test";

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード").fill(password);
  await page.getByRole("button", { name: "ログイン" }).click();
  await page.waitForURL("**/dashboard");
}

export async function loginAsAdmin(page: Page) {
  await login(page, "admin@example.com", "password123");
}

export async function loginAsInstructor(page: Page) {
  await login(page, "instructor@example.com", "password123");
}

export async function loginAsLearner(page: Page) {
  await login(page, "learner@example.com", "password123");
}
