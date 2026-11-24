import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ channel: process.env.ARCO_BROWSER_CHANNEL || undefined });
const entry = new URL('../../index.html', import.meta.url).href;
try {
  const context = await browser.newContext({ offline: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(entry);
  await page.getByRole('heading', { name: '2.59.0', exact: true }).waitFor({ timeout: 10000 });

  await page.locator('.nav-group').getByRole('link', { name: '按钮 Button', exact: true }).click();
  const primary = page.getByRole('button', { name: 'Primary', exact: true }).first();
  await primary.waitFor();
  await page.getByRole('button', { name: '查看代码' }).first().click();
  assert.match(await page.locator('.example pre').first().innerText(), /<a-button/);
  await page.reload();
  await primary.waitFor();

  await page.goto(entry + '#/vue/component/modal');
  await page.locator('.example-preview button').first().click();
  const modal = page.locator('.arco-modal:visible');
  await modal.waitFor();
  await modal.locator('.arco-modal-footer button').first().click();
  await modal.waitFor({ state: 'hidden' });

  await page.goto(entry + '#/vue/component/image');
  await page.waitForFunction(() => [...document.querySelectorAll('.example-preview img')].some(
    image => image.getAttribute('src')?.startsWith('./图片/') && image.complete && image.naturalWidth > 0
  ));
  assert(await page.evaluate(async () => (await document.fonts.load('400 14px Inter')).some(font => font.status === 'loaded')));
  assert.deepEqual(errors, []);
  console.log('file:// verified with networking disabled: changelog, menu, reload, live demos, source, image and font.');
} finally {
  await browser.close();
}

