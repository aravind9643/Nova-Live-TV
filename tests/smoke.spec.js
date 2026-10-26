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

test('Back keeps the channel playing in a mini-player', async ({ page }) => {
  await firstCard(page).click();
  await expect(page.locator('.watch')).toBeVisible();
  await page.goBack();
  const mini = page.locator('.mini');
  await expect(mini).toBeVisible();
  await mini.locator('.mini-expand').click();
  await expect(page.locator('.watch')).toBeVisible();
  await page.goBack();
  await page.locator('.mini').getByLabel('Stop playback').click();
  await expect(page.locator('.mini')).toHaveCount(0);
});

test('arrow keys move focus across the grid', async ({ page }) => {
  await firstCard(page).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-index="1"] .card-hit')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  const cols = await page.locator('.grid').evaluate((g) => getComputedStyle(g).gridTemplateColumns.split(' ').length);
  await expect(page.locator(`[data-index="${1 + cols}"] .card-hit`)).toBeFocused();
});

test('a shared favorites link offers to import', async ({ page }) => {
  const token = await page.evaluate(async () => {
    const { encodeFavorites } = await import('/src/lib/shareList.js');
    return encodeFavorites([{ name: 'Shared One', url: 'https://example.com/one.m3u8' }]);
  });
  await page.goto('about:blank'); // a fresh load, not a same-document hash change
  await page.goto(`/#import=${token}`);
  await expect(page.locator('.toast')).toContainText('Import 1 shared favorite');
  await expect(page).not.toHaveURL(/import=/);
  await page.locator('.toast button', { hasText: 'Import' }).click();
  await expect(page.locator('.section-title h1')).toHaveText('Favorites');
  await expect(page.locator('.card-name', { hasText: 'Shared One' })).toBeVisible();
});

test('shows an offline notice when the connection drops', async ({ page, context }) => {
  await context.setOffline(true);
  await expect(page.locator('.notice.offline')).toBeVisible();
  await context.setOffline(false);
  await expect(page.locator('.notice.offline')).toHaveCount(0);
});
