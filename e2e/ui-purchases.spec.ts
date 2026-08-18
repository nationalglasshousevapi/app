import { test, expect } from "@playwright/test";
import { TEST_PREFIX, cleanupTestData } from "./helpers";

const PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

test.describe("Purchases UI", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/password/i).fill(PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/documents/);
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test("purchases page loads with New purchase button", async ({ page }) => {
    await page.goto("/purchases");
    await expect(page.getByText(/purchases/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /new purchase/i })).toBeVisible();
  });

  test("new purchase form creates a purchase", async ({ page }) => {
    const supplier = `${TEST_PREFIX} UI Supplier ${Date.now()}`;
    await page.goto("/purchases/new");

    await page.getByLabel(/supplier name/i).fill(supplier);
    await page.getByLabel(/contact number/i).fill("9876543210");

    // Fill the first item row
    const itemsTable = page.locator("table");
    await itemsTable.locator("input").nth(0).fill(`${TEST_PREFIX} glass`); // description
    await itemsTable.locator("input").nth(1).fill("72x96"); // size
    await itemsTable.locator("input").nth(2).fill("7005"); // hsn
    await itemsTable.locator("input").nth(3).fill("10"); // qty
    await itemsTable.locator("input").nth(4).fill("25"); // rate

    await page.getByRole("button", { name: /save purchase/i }).click();

    // Should navigate to the purchase detail page
    await expect(page).toHaveURL(/\/purchases\/[0-9a-f-]{36}/);
    await expect(page.getByText(supplier, { exact: true })).toBeVisible();
  });
});
