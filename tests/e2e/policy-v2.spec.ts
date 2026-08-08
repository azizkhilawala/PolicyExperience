import { test, expect, type Locator } from '@playwright/test';

function tab(page: import('@playwright/test').Page, name: RegExp): Locator {
  return page.locator('button.astryx-tab', { hasText: name });
}

test.describe('Policy v2 list page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/policy-v2');
  });

  test('loads successfully', async ({ page }) => {
    await expect(page).toHaveURL(/\/policy-v2/);
  });

  test('shows the page heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /policies/i }).first()
    ).toBeVisible();
  });

  test('shows Policies and Templates tabs', async ({ page }) => {
    await expect(tab(page, /policies/i)).toBeVisible();
    await expect(tab(page, /templates/i)).toBeVisible();
  });

  test('shows at least one policy row or empty state', async ({ page }) => {
    const row = page.getByRole('row').nth(1);
    const empty = page.getByText(/no policies/i);
    await expect(row.or(empty)).toBeVisible();
  });

  test('shows Create Policy button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /create policy/i })
    ).toBeVisible();
  });

  test('can switch to Templates tab', async ({ page }) => {
    const templatesTab = tab(page, /templates/i);
    await templatesTab.click();
    await expect(templatesTab).toHaveClass(/selected/);
  });

  test('Templates tab shows rows or empty state', async ({ page }) => {
    await tab(page, /templates/i).click();
    const row = page.getByRole('row').nth(1);
    const empty = page.getByText(/no templates/i);
    await expect(row.or(empty)).toBeVisible();
  });

  test('shows Create Template button on Templates tab', async ({ page }) => {
    await tab(page, /templates/i).click();
    await expect(
      page.getByRole('button', { name: /create template/i })
    ).toBeVisible();
  });
});

test.describe('Policy v2 detail page', () => {
  test('navigating to a policy shows detail sections', async ({ page }) => {
    await page.goto('/policy-v2');

    const firstRow = page.getByRole('row').nth(1);
    const empty = page.getByText(/no policies/i);

    await firstRow.or(empty).waitFor({ timeout: 10_000 });

    if (await empty.isVisible()) {
      test.skip(true, 'No seeded policies to navigate to');
    }

    await firstRow.locator('td').first().click();
    await page.waitForURL(/\/policy-v2\/.+/);

    await expect(
      page.getByRole('button', { name: /provision/i })
    ).toBeVisible();

    const scopeHeading = page.getByRole('heading', { name: /scope/i });
    const enforcementHeading = page.getByRole('heading', {
      name: /enforcement/i,
    });
    await expect(scopeHeading.or(enforcementHeading).first()).toBeVisible();

    await expect(
      page.getByRole('heading', { name: /ingress/i })
    ).toBeVisible();

    await expect(
      page.getByRole('heading', { name: /egress/i })
    ).toBeVisible();
  });
});
