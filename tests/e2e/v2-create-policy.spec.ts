import { test, expect } from '@playwright/test';

test.describe('V2 Create Policy page', () => {
  test('clicking Create Policy navigates to /policy-v2/new', async ({
    page,
  }) => {
    await page.goto('/policy-v2');
    const createBtn = page.getByRole('button', { name: /create policy/i });
    await expect(createBtn).toBeVisible();
    await createBtn.click();
    await page.waitForURL(/\/policy-v2\/new/);
    await expect(page).toHaveURL(/\/policy-v2\/new/);
  });

  test('shows Create Policy heading', async ({ page }) => {
    await page.goto('/policy-v2/new');
    await expect(
      page.getByRole('heading', { name: /create policy/i })
    ).toBeVisible();
  });

  test('shows Name field', async ({ page }) => {
    await page.goto('/policy-v2/new');
    await expect(page.getByLabel(/name/i).first()).toBeVisible();
  });

  test('shows Policy Info section heading', async ({ page }) => {
    await page.goto('/policy-v2/new');
    await expect(
      page.getByRole('heading', { name: /policy info/i })
    ).toBeVisible();
  });

  test('shows Scope section heading', async ({ page }) => {
    await page.goto('/policy-v2/new');
    // Standard policy shows "Scope"; guardrail shows "Enforcement Points"
    const scopeHeading = page.getByRole('heading', { name: /scope/i });
    const enforcementHeading = page.getByRole('heading', {
      name: /enforcement points/i,
    });
    await expect(scopeHeading.or(enforcementHeading).first()).toBeVisible();
  });

  test('shows Scope Type radio options', async ({ page }) => {
    await page.goto('/policy-v2/new');
    // The RadioList has options: All Workloads, Labels, Kubernetes
    await expect(page.getByText(/all workloads/i)).toBeVisible();
    await expect(page.getByText(/kubernetes/i)).toBeVisible();
  });

  test('shows Ingress Rules heading', async ({ page }) => {
    await page.goto('/policy-v2/new');
    await expect(
      page.getByRole('heading', { name: 'Ingress Rules', exact: true })
    ).toBeVisible();
  });

  test('shows Egress Rules heading', async ({ page }) => {
    await page.goto('/policy-v2/new');
    await expect(
      page.getByRole('heading', { name: 'Egress Rules', exact: true })
    ).toBeVisible();
  });

  test('shows Create Policy submit button', async ({ page }) => {
    await page.goto('/policy-v2/new');
    // The submit button is labeled "Create Policy"
    const buttons = page.getByRole('button', { name: /create policy/i });
    // There may be multiple matches (breadcrumb link is not a button) — check at least one
    await expect(buttons.last()).toBeVisible();
  });

  test('shows Policy Type segmented control with Standard and Guardrail', async ({
    page,
  }) => {
    await page.goto('/policy-v2/new');
    await expect(page.getByText(/standard policy/i)).toBeVisible();
    await expect(page.getByText(/guardrail policy/i)).toBeVisible();
  });

  test('shows Cancel button', async ({ page }) => {
    await page.goto('/policy-v2/new');
    await expect(
      page.getByRole('button', { name: /cancel/i })
    ).toBeVisible();
  });
});
