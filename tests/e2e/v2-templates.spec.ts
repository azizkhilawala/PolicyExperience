import { test, expect, type Locator } from '@playwright/test';

function tab(page: import('@playwright/test').Page, value: string): Locator {
  return page.locator(`button.astryx-tab[data-tab-value="${value}"]`);
}

test.describe('V2 Templates — list page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/policy-v2');
    await tab(page, 'templates').click();
    await expect(tab(page, 'templates')).toHaveAttribute(
      'data-selected',
      'selected'
    );
  });

  test('shows at least one template row (seeded data)', async ({ page }) => {
    const row = page.getByRole('row').nth(1);
    const empty = page.getByText(/no templates/i);
    await expect(row.or(empty)).toBeVisible({ timeout: 10_000 });
    // Seeded data has 3 templates — expect rows
    await expect(row).toBeVisible();
  });

  test('shows at least three template rows from seed', async ({ page }) => {
    const rows = page.getByRole('row');
    // header row + at least 3 data rows
    await expect(rows).toHaveCount(4, { timeout: 10_000 }).catch(() => {});
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('clicking Create Template navigates to /policy-v2/templates/new', async ({
    page,
  }) => {
    const createBtn = page.getByRole('button', { name: /create template/i });
    await expect(createBtn).toBeVisible();
    await createBtn.click();
    await page.waitForURL(/\/policy-v2\/templates\/new/);
    await expect(page).toHaveURL(/\/policy-v2\/templates\/new/);
  });
});

test.describe('V2 Templates — create page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/policy-v2/templates/new');
  });

  test('shows Create Template heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /create template/i })
    ).toBeVisible();
  });

  test('shows Name field', async ({ page }) => {
    await expect(page.getByLabel(/name/i).first()).toBeVisible();
  });

  test('shows Ingress Rules heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Ingress Rules', exact: true })
    ).toBeVisible();
  });

  test('shows Egress Rules heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Egress Rules', exact: true })
    ).toBeVisible();
  });

  test('shows Create Template submit button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /create template/i })
    ).toBeVisible();
  });

  test('shows Cancel button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /cancel/i })
    ).toBeVisible();
  });
});

test.describe('V2 Templates — detail page', () => {
  test('navigating to a template shows detail sections', async ({ page }) => {
    await page.goto('/policy-v2');
    await tab(page, 'templates').click();

    const firstRow = page.getByRole('row').nth(1);
    const empty = page.getByText(/no templates/i);
    await firstRow.or(empty).waitFor({ timeout: 10_000 });

    if (await empty.isVisible()) {
      test.skip(true, 'No seeded templates to navigate to');
    }

    // Click first template row's first cell to navigate
    await firstRow.locator('td').first().click();
    await page.waitForURL(/\/policy-v2\/templates\/.+/);

    // Verify template name appears as a heading
    await expect(
      page.getByRole('heading', { level: 1 }).first()
    ).toBeVisible();

    // Verify Ingress Rules heading
    await expect(
      page.getByRole('heading', { name: 'Ingress Rules', exact: true })
    ).toBeVisible();

    // Verify Egress Rules heading
    await expect(
      page.getByRole('heading', { name: 'Egress Rules', exact: true })
    ).toBeVisible();

    // Verify Edit button
    await expect(
      page.getByRole('button', { name: /edit/i })
    ).toBeVisible();
  });

  test('template detail shows Linked Policies section', async ({ page }) => {
    await page.goto('/policy-v2');
    await tab(page, 'templates').click();

    const firstRow = page.getByRole('row').nth(1);
    const empty = page.getByText(/no templates/i);
    await firstRow.or(empty).waitFor({ timeout: 10_000 });

    if (await empty.isVisible()) {
      test.skip(true, 'No seeded templates to navigate to');
    }

    await firstRow.locator('td').first().click();
    await page.waitForURL(/\/policy-v2\/templates\/.+/);

    await expect(
      page.getByRole('heading', { name: /linked policies/i })
    ).toBeVisible();
  });
});
