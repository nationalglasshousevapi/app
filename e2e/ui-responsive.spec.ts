import { test, expect, type Page } from "@playwright/test";
import {
  TEST_PREFIX,
  createTestCustomer,
  cleanupTestData,
  hasLiveCreds,
} from "./helpers";

const PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/password/i).fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/documents/);
}

/** Horizontal page overflow in px (0 = everything fits the viewport width). */
async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const el = document.documentElement;
    return el.scrollWidth - el.clientWidth;
  });
}

test.describe("Responsive layout — zoomed / narrow widths", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !hasLiveCreds(),
      "Requires live Supabase creds + ADMIN_PASSWORD in .env.local"
    );
    await login(page);
  });

  // A zoomed-in Chromebook lands in this range: the desktop layout is active,
  // so nothing should spill sideways out of the viewport.
  for (const path of [
    "/dashboard",
    "/documents",
    "/customers",
    "/purchases",
    "/accounts",
    "/daybook",
    "/expenses",
  ]) {
    test(`no horizontal page scroll at 1024x600 — ${path}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1024, height: 600 });
      await page.goto(path);
      await page.locator("h1").first().waitFor();
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
    });
  }

  test("list tables switch to cards below xl and back at xl", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.goto("/documents");
    await expect(page.locator("table").first()).toBeHidden();

    await page.setViewportSize({ width: 1400, height: 900 });
    await expect(page.locator("table").first()).toBeVisible();
  });

  test("compact mode removed — text stays 17px and inputs ≥44px on short viewports", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 600 });
    await page.goto("/documents");
    await page.locator("h1").first().waitFor();

    const bodyFontSize = await page.evaluate(
      () => getComputedStyle(document.body).fontSize
    );
    expect(bodyFontSize).toBe("17px");

    const input = page.locator("input.input").first();
    await expect(input).toBeVisible();
    const box = await input.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });
});

test.describe("Bottom navigation — phone", () => {
  test.use({ viewport: { width: 375, height: 740 } });

  test.beforeEach(async ({ page }) => {
    test.skip(
      !hasLiveCreds(),
      "Requires live Supabase creds + ADMIN_PASSWORD in .env.local"
    );
    await login(page);
  });

  test("shows 4 tabs + a centred FAB and never overflows", async ({ page }) => {
    await page.goto("/dashboard");
    const nav = page.locator('nav[class*="safe-area-bottom"]');
    await expect(nav).toBeVisible();

    // 4 tabs + the centre FAB — no extra items to overflow a 375px bar.
    await expect(nav.getByRole("link")).toHaveCount(5);

    for (const label of ["Dashboard", "Documents", "Purchases", "Customers"]) {
      await expect(nav.getByRole("link", { name: label })).toBeVisible();
    }

    const fab = nav.getByRole("link", { name: /create new document/i });
    await expect(fab).toBeVisible();

    const { scrollWidth, clientWidth } = await nav.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

    // The FAB sits in the middle of the bar.
    const navBox = (await nav.boundingBox())!;
    const fabBox = (await fab.boundingBox())!;
    const navCentre = navBox.x + navBox.width / 2;
    const fabCentre = fabBox.x + fabBox.width / 2;
    expect(Math.abs(navCentre - fabCentre)).toBeLessThanOrEqual(10);
  });
});

test.describe("Responsive — dialogs and data", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      !hasLiveCreds(),
      "Requires live Supabase creds + ADMIN_PASSWORD in .env.local"
    );
    await login(page);
  });

  test.afterAll(async () => {
    if (!hasLiveCreds()) return;
    await cleanupTestData();
  });

  test("Record Payment keeps its action visible on a short viewport", async ({
    page,
  }) => {
    const customer = await createTestCustomer();

    await page.setViewportSize({ width: 1024, height: 600 });
    await page.goto(`/accounts/${customer.id}`);
    await page
      .getByRole("button", { name: /record payment/i })
      .first()
      .click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/balance due/i)).toBeVisible();

    // The primary action must be reachable without scrolling the page.
    const submit = dialog.getByRole("button", {
      name: /record & generate receipt/i,
    });
    await expect(submit).toBeVisible();
    const submitBox = (await submit.boundingBox())!;
    expect(submitBox.y + submitBox.height).toBeLessThanOrEqual(600);

    // The dialog itself must fit the viewport.
    const panel = (await dialog.boundingBox())!;
    expect(panel.height).toBeLessThanOrEqual(600);
  });

  test("Record Payment dialog is usable on a phone viewport", async ({
    page,
  }) => {
    const customer = await createTestCustomer();

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`/accounts/${customer.id}`);
    await page
      .getByRole("button", { name: /record payment/i })
      .first()
      .click();

    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("button", { name: /record & generate receipt/i })
    ).toBeVisible();
    await expect(dialog).toBeInViewport();
  });

  test("newly added customer appears in the card list at narrow width", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    const name = `${TEST_PREFIX} Resp ${Date.now()}`;

    await page.goto("/customers");
    await page.getByRole("button", { name: /add customer/i }).click();
    await page.locator("form input").first().fill(name);
    await page.getByRole("button", { name: /save customer/i }).click();

    await page.getByPlaceholder(/search by customer name/i).fill(name);
    await expect(page.getByText(name, { exact: true })).toBeVisible();

    // Below xl the table is replaced by cards.
    await expect(page.locator("table").first()).toBeHidden();
  });
});
