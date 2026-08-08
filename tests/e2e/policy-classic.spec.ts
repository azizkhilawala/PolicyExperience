import { test, expect, type Locator } from '@playwright/test';

function tab(page: import('@playwright/test').Page, name: RegExp): Locator {
  return page.locator('button.astryx-tab', { hasText: name });
}

test.describe('Classic Policies page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/policies');
  });

  test('loads successfully', async ({ page }) => {
    await expect(page).toHaveURL(/\/policies/);
  });

  test('shows the Policies heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /policies/i }).first()
    ).toBeVisible();
  });

  test('shows All Policies, Organizational, and Application tabs', async ({
    page,
  }) => {
    await expect(tab(page, /all policies/i)).toBeVisible();
    await expect(tab(page, /organizational/i)).toBeVisible();
    await expect(tab(page, /application/i)).toBeVisible();
  });

  test('shows Create Policy button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /create policy/i })
    ).toBeVisible();
  });

  test('shows at least one policy row or empty state', async ({ page }) => {
    const row = page.getByRole('row').nth(1);
    const empty = page.getByText(/no policies/i);
    await expect(row.or(empty)).toBeVisible();
  });
});
