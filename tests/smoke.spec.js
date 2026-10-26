import { test, expect } from '@playwright/test';

const firstCard = (page) => page.locator('.card:not(.skel) .card-hit').first();

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(firstCard(page)).toBeVisible();
});

test('loads the grid without horizontal overflow', async ({ page }) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  // Virtualised: far fewer cards mounted than channels available.
  expect(await page.locator('.card').count()).toBeLessThan(250);
});

test('search narrows results and is reflected in the URL', async ({ page }) => {
  await page.getByLabel('Search channels').fill('news');
  await expect(page).toHaveURL(/q=news/);
  await expect(page.locator('.section-title h1')).toContainText('news');
});

test('a single category gets a real path', async ({ page }) => {
  await page.locator('.quick .chip', { hasText: 'News' }).first().click();
  await expect(page).toHaveURL(/\/category\/News/);
  await page.reload();
  await expect(page.locator('.section-title h1')).toHaveText('News');
});

test('opening a channel then Back returns to the grid', async ({ page }) => {
  await firstCard(page).click();
  await expect(page.locator('.watch')).toBeVisible();
  await expect(page).toHaveURL(/play=/);
  await page.goBack();
  await expect(page.locator('.watch')).toHaveCount(0);
  await expect(firstCard(page)).toBeVisible();
});

test('favoriting shows an undo toast', async ({ page }) => {
  const fav = page.locator('.card-fav').first();
  await fav.click({ force: true }); // hidden until hover on desktop
  await expect(page.locator('.toast')).toContainText('Added');
  await page.locator('.toast button', { hasText: 'Undo' }).click();
  await expect(fav).toHaveAttribute('aria-pressed', 'false');
});

test('filters open as a sheet on phones', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'phone-only UI');
  await page.locator('.nav-item', { hasText: 'Filters' }).click();
  await expect(page.locator('.filters.open')).toBeVisible();
  await page.locator('.filters-apply button').click();
  await expect(page.locator('.filters.open')).toHaveCount(0);
});
