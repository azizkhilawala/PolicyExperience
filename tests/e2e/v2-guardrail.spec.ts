import { test, expect } from '@playwright/test';

test.describe('V2 Guardrail policy', () => {
  test('guardrail policy detail shows template banner, Enforcement Points, and rules', async ({
    page,
  }) => {
    await page.goto('/policy-v2');

    // Wait for the policy table to load
    const firstRow = page.getByRole('row').nth(1);
    const empty = page.getByText(/no.*policies/i);
    await firstRow.or(empty).waitFor({ timeout: 10_000 });

    if (await empty.isVisible()) {
      test.skip(true, 'No seeded policies — cannot test guardrail');
    }

    // Look for a row containing a "Guardrail" badge token
    const guardrailBadge = page.getByText('Guardrail', { exact: true });
    const guardrailVisible = await guardrailBadge.first().isVisible().catch(() => false);

    if (!guardrailVisible) {
      test.skip(true, 'No guardrail policy found in the list');
    }

    // Click into the guardrail policy row — click the name cell in the row that contains the badge
    const guardrailRow = page.getByRole('row').filter({ hasText: 'Guardrail' }).first();
    await guardrailRow.locator('td').first().click();

    await page.waitForURL(/\/policy-v2\/.+/);

    // Verify the guardrail detail page shows a Banner mentioning "template"
    await expect(
      page.locator('[class*="banner"]', { hasText: /template/i }).first().or(
        page.getByText(/rules managed by template/i)
      )
    ).toBeVisible({ timeout: 10_000 });

    // Verify "Enforcement Points" heading (guardrail uses this instead of "Scope")
    await expect(
      page.getByRole('heading', { name: /enforcement points/i })
    ).toBeVisible();

    // Verify Ingress Rules heading
    await expect(
      page.getByRole('heading', { name: /ingress rules/i })
    ).toBeVisible();

    // Verify Egress Rules heading
    await expect(
      page.getByRole('heading', { name: /egress rules/i })
    ).toBeVisible();

    // Verify the Provision button is visible
    await expect(
      page.getByRole('button', { name: /provision/i })
    ).toBeVisible();
  });
});
