import { test, expect } from "@playwright/test";
import { TEST_PREFIX, cleanupTestData } from "./helpers";

const PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

test.describe("Customer quick-create UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/password/i).fill(PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/documents/);
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test("typing an unrecognized name shows Create customer and creates it", async ({ page }) => {
    const name = `${TEST_PREFIX} WalkIn UI ${Date.now()}`;
    await page.goto("/documents/new");

    const searchInput = page.getByPlaceholder(/search customer by name/i);
    await searchInput.click();
    await searchInput.fill(name);

    const createBtn = page.getByRole("button", { name: new RegExp(`create customer "${name}"`, "i") });
    await createBtn.click();

    // After creation, the form shows the customer details section with the name filled
    await expect(page.getByText(name, { exact: true })).toBeVisible();
    await expect(page.getByText(/customer details/i)).toBeVisible();
  });

  test("customer picker shows recent customers on focus", async ({ page }) => {
    await page.goto("/documents/new");
    const searchInput = page.getByPlaceholder(/search customer by name/i);
    await searchInput.click();
    await expect(page.getByText(/recent customers/i)).toBeVisible();
  });
});
