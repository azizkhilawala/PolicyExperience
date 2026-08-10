import { test, expect } from '@playwright/test';

test.describe('Workloads page — list', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/workloads');
  });

  test('loads successfully', async ({ page }) => {
    await expect(page).toHaveURL(/\/workloads/);
  });

  test('shows the Workloads title', async ({ page }) => {
    await expect(page.getByText('Workloads', { exact: true }).first()).toBeVisible();
  });

  test('shows the total count token', async ({ page }) => {
    await expect(page.getByText(/\d+ total/)).toBeVisible();
  });

  test('renders workload table with rows', async ({ page }) => {
    await expect(page.locator('table')).toBeVisible();
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible();
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('shows search input', async ({ page }) => {
    await expect(page.getByPlaceholder('Name or hostname...')).toBeVisible();
  });

  test('search filters workloads by name', async ({ page }) => {
    const input = page.getByPlaceholder('Name or hostname...');
    await input.fill('hrm');
    await page.waitForTimeout(1000);
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible();
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('table shows status column with StatusDot', async ({ page }) => {
    await expect(page.locator('.astryx-statusdot').first()).toBeVisible();
  });

  test('table shows enforcement mode tokens', async ({ page }) => {
    const enforcementTokens = page.locator('tbody tr').first().locator('.astryx-token');
    await expect(enforcementTokens.first()).toBeVisible();
  });
});

test.describe('Workloads page — detail', () => {
  test('clicking a workload row navigates to detail page', async ({ page }) => {
    await page.goto('/workloads');
    await page.locator('tbody tr').first().click();
    await expect(page).toHaveURL(/\/workloads\/.+/);
  });

  test('detail page shows breadcrumbs', async ({ page }) => {
    await page.goto('/workloads');
    await page.locator('tbody tr').first().click();
    await expect(page.getByText('Workloads', { exact: true })).toBeVisible();
  });

  test('detail page shows properties', async ({ page }) => {
    await page.goto('/workloads');
    await page.locator('tbody tr').first().click();
    await expect(page.getByText('Hostname').first()).toBeVisible();
  });

  test('detail page shows labels section', async ({ page }) => {
    await page.goto('/workloads');
    await page.locator('tbody tr').first().click();
    await expect(page.getByText('Labels')).toBeVisible();
    await expect(page.getByText('Edit Labels')).toBeVisible();
  });
});

test.describe('Workloads — navigation', () => {
  test('SideNav has Workloads item', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Workloads' })).toBeVisible();
  });

  test('SideNav Workloads link navigates correctly', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Workloads' }).click();
    await expect(page).toHaveURL(/\/workloads/);
  });
});
