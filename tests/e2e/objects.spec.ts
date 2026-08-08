import { test, expect, type Locator } from '@playwright/test';

function tab(page: import('@playwright/test').Page, value: string): Locator {
  return page.locator(`button.astryx-tab[data-tab-value="${value}"]`);
}

test.describe('Objects page — navigation and tabs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/objects');
  });

  test('loads successfully', async ({ page }) => {
    await expect(page).toHaveURL(/\/objects/);
  });

  test('shows the Policy Objects heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /policy objects/i })
    ).toBeVisible();
  });

  test('shows all four tabs', async ({ page }) => {
    await expect(tab(page, 'services')).toBeVisible();
    await expect(tab(page, 'ip-lists')).toBeVisible();
    await expect(tab(page, 'label-groups')).toBeVisible();
    await expect(tab(page, 'virtual-services')).toBeVisible();
  });
});

test.describe('Objects page — Services tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/objects');
  });

  test('Services tab is selected by default', async ({ page }) => {
    await expect(tab(page, 'services')).toHaveAttribute(
      'data-selected',
      'selected'
    );
  });

  test('shows Create Service button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /create service/i })
    ).toBeVisible();
  });

  test('shows seeded service rows or empty state', async ({ page }) => {
    const row = page.getByRole('row').nth(1);
    const spinner = page.getByText(/loading services/i);
    await spinner.or(row).waitFor({ timeout: 10_000 });
    if (await spinner.isVisible()) {
      await row.waitFor({ timeout: 10_000 });
    }
    await expect(row).toBeVisible();
  });

  test('table has Name, Port / Range, Protocol, Description columns', async ({
    page,
  }) => {
    await expect(
      page.getByRole('columnheader', { name: 'Name' })
    ).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: /port/i })
    ).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: 'Protocol' })
    ).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: 'Description' })
    ).toBeVisible();
  });
});

test.describe('Objects page — IP Lists tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/objects');
    await tab(page, 'ip-lists').click();
  });

  test('IP Lists tab becomes selected', async ({ page }) => {
    await expect(tab(page, 'ip-lists')).toHaveAttribute(
      'data-selected',
      'selected'
    );
  });

  test('shows Create IP List button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /create ip list/i })
    ).toBeVisible();
  });

  test('shows seeded IP list rows or empty state', async ({ page }) => {
    const row = page.getByRole('row').nth(1);
    const spinner = page.getByText(/loading ip lists/i);
    await spinner.or(row).waitFor({ timeout: 10_000 });
    if (await spinner.isVisible()) {
      await row.waitFor({ timeout: 10_000 });
    }
    await expect(row).toBeVisible();
  });

  test('table has Name, CIDR, Description columns', async ({ page }) => {
    await expect(
      page.getByRole('columnheader', { name: 'Name' })
    ).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: 'CIDR' })
    ).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: 'Description' })
    ).toBeVisible();
  });
});

test.describe('Objects page — Label Groups tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/objects');
    await tab(page, 'label-groups').click();
  });

  test('Label Groups tab becomes selected', async ({ page }) => {
    await expect(tab(page, 'label-groups')).toHaveAttribute(
      'data-selected',
      'selected'
    );
  });

  test('shows Create Label Group button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /create label group/i })
    ).toBeVisible();
  });

  test('shows seeded label group rows or empty state', async ({ page }) => {
    const row = page.getByRole('row').nth(1);
    const spinner = page.getByText(/loading label groups/i);
    await spinner.or(row).waitFor({ timeout: 10_000 });
    if (await spinner.isVisible()) {
      await row.waitFor({ timeout: 10_000 });
    }
    await expect(row).toBeVisible();
  });

  test('table has Name and Labels columns', async ({ page }) => {
    await expect(
      page.getByRole('columnheader', { name: 'Name' })
    ).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: 'Labels' })
    ).toBeVisible();
  });
});

test.describe('Objects page — Virtual Services tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/objects');
    await tab(page, 'virtual-services').click();
  });

  test('Virtual Services tab becomes selected', async ({ page }) => {
    await expect(tab(page, 'virtual-services')).toHaveAttribute(
      'data-selected',
      'selected'
    );
  });

  test('shows Create Virtual Service button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /create virtual service/i })
    ).toBeVisible();
  });

  test('shows seeded virtual service rows or empty state', async ({ page }) => {
    const row = page.getByRole('row').nth(1);
    const spinner = page.getByText(/loading virtual services/i);
    await spinner.or(row).waitFor({ timeout: 10_000 });
    if (await spinner.isVisible()) {
      await row.waitFor({ timeout: 10_000 });
    }
    await expect(row).toBeVisible();
  });

  test('table has Name, Port, Protocol columns', async ({ page }) => {
    await expect(
      page.getByRole('columnheader', { name: 'Name' })
    ).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: 'Port' })
    ).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: 'Protocol' })
    ).toBeVisible();
  });
});

test.describe('Objects page — Create Service flow', () => {
  test('can create a new service via the dialog', async ({ page }) => {
    await page.goto('/objects');

    await page.getByRole('button', { name: /create service/i }).click();
    await expect(page.getByText(/create service/i).first()).toBeVisible();

    await page.getByLabel(/name/i).first().fill('E2E Test Service');
    await page.getByLabel(/port/i).first().fill('9999');

    await page.getByRole('button', { name: /^create$/i }).click();

    await expect(page.getByText('E2E Test Service').first()).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe('Objects page — Create IP List flow', () => {
  test('can create a new IP list via the dialog', async ({ page }) => {
    await page.goto('/objects');
    await tab(page, 'ip-lists').click();

    await page.getByRole('button', { name: /create ip list/i }).click();
    await expect(page.getByText(/create ip list/i).first()).toBeVisible();

    await page.getByLabel(/name/i).first().fill('E2E Test IP List');
    await page.getByLabel(/cidr/i).fill('192.168.99.0/24');

    await page.getByRole('button', { name: /^create$/i }).click();

    await expect(page.getByText('E2E Test IP List').first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
