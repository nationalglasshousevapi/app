import { test, expect } from "@playwright/test";

const PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

test.describe("Smoke tests", () => {
  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("login with correct password redirects to documents", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/password/i).fill(PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/documents/);
  });

  test("login with wrong password shows error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/password/i).fill("wrongpassword");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/incorrect/i)).toBeVisible();
  });

  test("unauthenticated access redirects to login", async ({ page }) => {
    await page.goto("/documents");
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Authenticated flows", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/password/i).fill(PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/documents/);
  });

  test("documents page shows list", async ({ page }) => {
    await expect(page.getByText(/documents/i)).toBeVisible();
  });

  test("dashboard page loads charts", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByText(/monthly revenue/i)).toBeVisible();
    await expect(page.getByText(/top customers/i)).toBeVisible();
  });

  test("customers page shows customer list", async ({ page }) => {
    await page.goto("/customers");
    await expect(page.getByText(/customers/i)).toBeVisible();
  });

  test("new document form loads", async ({ page }) => {
    await page.goto("/documents/new");
    await expect(page.getByText(/document details/i)).toBeVisible();
    await expect(page.getByText(/customer details/i)).toBeVisible();
    await expect(page.getByText(/items and pricing/i)).toBeVisible();
  });
});
