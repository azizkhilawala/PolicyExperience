import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility — axe scans', () => {
  test('policy-v2 list page has no accessibility violations', async ({ page }) => {
    await page.goto('/policy-v2');
    await page.getByRole('heading', { name: /policies/i }).first().waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('classic policies page has no accessibility violations', async ({ page }) => {
    await page.goto('/policies');
    await page.getByRole('heading', { name: /policies/i }).first().waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('policy-v2 detail page has no accessibility violations', async ({ page }) => {
    await page.goto('/policy-v2');

    const firstRow = page.getByRole('row').nth(1);
    const empty = page.getByText(/no policies/i);
    await firstRow.or(empty).waitFor({ timeout: 10_000 });

    if (await empty.isVisible()) {
      test.skip(true, 'No seeded policies — skipping detail page a11y scan');
    }

    await firstRow.locator('td').first().click();
    await page.waitForURL(/\/policy-v2\/.+/);
    await page.getByRole('heading', { name: /ingress/i }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
