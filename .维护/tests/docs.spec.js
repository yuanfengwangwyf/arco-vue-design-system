import { expect, test } from '@playwright/test';
import manifest from '../manifests/design-system.json' with { type: 'json' };

test('all manifest pages are directly navigable', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = [];
  page.on('pageerror', error => errors.push(page.url() + ' ' + error.message));
  for (const entry of manifest.pages) {
    const result = await page.goto(entry.route, { waitUntil: 'domcontentloaded' });
    expect(result?.ok(), entry.route).toBeTruthy();
    await expect(page.locator('#main-content > h1')).toHaveText(entry.title);
    const active = page.locator('.nav-group .is-active');
    if (['start', 'i18n', 'theme'].includes(entry.id) || entry.id.startsWith('pro/')) {
      await expect(active).toHaveCount(0);
    } else {
      await expect(active).toHaveAttribute('href', entry.route);
    }
    await expect(page.locator('.doc-body')).toBeAttached();
    await expect(page.locator('.example-preview')).toHaveCount(entry.demos.length);
  }
  expect(errors).toEqual([]);
});

test('changelog, links, history, anchors and keyboard access', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/docs\/changelog$/);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: '跳至正文' })).toBeFocused();
  await page.locator('.outline').getByRole('link', { name: '2.58.0', exact: true }).click();
  await expect(page).toHaveURL(/#2\.58\.0$/);
  await page.reload();
  await expect(page.locator('[id="2.58.0"]')).toBeInViewport();
  await page.locator('.nav-group').getByRole('link', { name: '按钮 Button', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Primary', exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: '查看代码' }).first().click();
  await expect(page.locator('.example pre').first()).toContainText('<a-button');
  await page.goBack();
  await expect(page).toHaveURL(/changelog#2\.58\.0$/);
  await page.goForward();
  await expect(page).toHaveURL(/component\/button$/);
});

test('mobile menu and component interactions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const menu = page.getByRole('button', { name: '目录', exact: true });
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await page.locator('#doc-sidebar input').fill('modal');
  await page.locator('.nav-group').getByRole('link', { name: /Modal/ }).click();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await page.locator('.example-preview button').first().click();
  const modal = page.locator('.arco-modal:visible');
  await expect(modal).toHaveCount(1);
  await modal.locator('.arco-modal-footer button').first().click();
  await expect(modal).toHaveCount(0);
  await page.goto('/vue/component/form');
  const input = page.locator('.example-preview input[type="text"]').first();
  await input.fill('Arco');
  await expect(input).toHaveValue('Arco');
  await page.goto('/vue/component/select');
  await page.locator('.example-preview .arco-select-view').first().click();
  await page.locator('.arco-select-option:visible').filter({ hasText: /^Beijing$/ }).click();
  await expect(page.locator('.example-preview .arco-select-view').first()).toContainText('Beijing');
  await page.goto('/vue/component/table');
  await expect(page.locator('.example-preview tbody tr').first()).toBeVisible();
});

test('changelog layout at desktop and mobile widths', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/vue/docs/changelog');
  await expect(page.locator('[id="2.59.0"]')).toBeInViewport();
  await expect(page.locator('.outline')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('changelog-desktop.png') });
  await page.getByRole('button', { name: '深色' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('body')).toHaveAttribute('arco-theme', 'dark');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('#doc-sidebar')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({ path: testInfo.outputPath('changelog-mobile-dark.png') });
});


