import { test, expect } from "@playwright/test";
import { api, createTestCustomer, createTestQuotation, cleanupTestData } from "./helpers";

const PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

test.describe("Plan cutting + Convert UI", () => {
  test.beforeAll(async () => {
    // Ensure the app is up and auth works
    await api();
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test("Plan cutting button preloads the optimizer with pieces", async ({ page, request }) => {
    const customer = await createTestCustomer();
    const { document: quote } = await createTestQuotation({
      customerId: customer.id,
      billToName: `${customer.name}`,
    });

    await page.goto("/login");
    await page.getByLabel(/password/i).fill(PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/documents/);

    // Open the quotation detail page
    await page.goto(`/documents/${quote.id}`);
    await expect(page.getByText(/quotation/i).first()).toBeVisible();

    // Click Plan cutting
    await page.getByTitle("Plan cutting").click();
    await expect(page).toHaveURL(/\/tools\/cutting-optimizer/);

    // Pieces loaded banner appears
    await expect(page.getByText(/pieces loaded from the quotation/i)).toBeVisible();
  });

  test("Convert to Invoice dialog converts with cash payment", async ({ page }) => {
    const customer = await createTestCustomer();
    const { document: quote } = await createTestQuotation({
      customerId: customer.id,
      billToName: `${customer.name}`,
    });

    await page.goto("/login");
    await page.getByLabel(/password/i).fill(PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/documents/);

    await page.goto(`/documents/${quote.id}`);
    await page.getByTitle("Convert to Invoice").click();

    const dialog = page.getByRole("dialog", { name: /convert to invoice/i });
    await expect(dialog).toBeVisible();
    // Record payment is on by default
    await expect(dialog.getByText(/record cash payment now/i)).toBeVisible();

    await dialog.getByRole("button", { name: /convert to invoice/i }).click();

    // Should land on the new invoice detail page
    await expect(page).toHaveURL(/\/documents\/[0-9a-f-]{36}/);
    await expect(page.getByText(/invoice — /i)).toBeVisible();
    // Status should be paid (cash recorded)
    await expect(page.getByTitle(/convert/i)).not.toBeVisible();
  });
});
