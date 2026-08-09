import { test, expect } from '@playwright/test';

test.describe('Token tooltips', () => {
  test('scope label token on classic policy page shows tooltip on hover', async ({
    page,
  }) => {
    await page.goto('/policies');
    const token = page.locator('[class*="token"]').first();
    await token.waitFor({ state: 'visible', timeout: 10_000 });
    await token.hover();
    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toBeVisible({ timeout: 5_000 });
  });

  test('v2 policy list scope token shows tooltip on hover', async ({
    page,
  }) => {
    await page.goto('/policy-v2');
    const token = page.locator('[class*="token"]').first();
    await token.waitFor({ state: 'visible', timeout: 10_000 });
    await token.hover();
    const tooltip = page.getByRole('tooltip');
    await expect(tooltip).toBeVisible({ timeout: 5_000 });
  });
});
