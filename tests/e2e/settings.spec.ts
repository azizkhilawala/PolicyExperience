import { test, expect } from '@playwright/test';

test.describe('Settings page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('loads successfully', async ({ page }) => {
    await expect(page).toHaveURL(/\/settings/);
  });

  test('shows Settings heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /^settings$/i })
    ).toBeVisible();
  });

  test('shows Tenant Configuration section', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /tenant configuration/i })
    ).toBeVisible();
  });

  test('shows Display Scopes in Policies toggle', async ({ page }) => {
    await expect(
      page.getByText(/display scopes in policies/i).first()
    ).toBeVisible();
  });

  test('shows User Management section', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /user management/i })
    ).toBeVisible();
  });

  test('shows Switch User control', async ({ page }) => {
    // User Management section has a Switch User combobox
    await expect(
      page.getByRole('combobox', { name: /switch user/i })
    ).toBeVisible();
  });

  test('shows Appearance section', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /appearance/i })
    ).toBeVisible();
  });

  test('shows Theme selector', async ({ page }) => {
    await expect(
      page.getByRole('combobox', { name: /theme/i })
    ).toBeVisible();
  });
});
