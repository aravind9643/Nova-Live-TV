import { test, expect } from '@playwright/test';
import { pack } from '../src/lib/merge.js';

// Visual regression tests. Live channel data changes daily, so these run
// against a fixed fixture catalogue with external images and ads blocked —
// the screenshots only change when the UI does.
//
// Baselines are per-platform (fonts render differently). Update with:
//   npx playwright test --project=visual-phone --project=visual-desktop --update-snapshots

const CATS = ['News', 'Sports', 'Movies', 'Kids', 'Music', 'Documentary'];
const COUNTRIES = ['United States', 'India', 'France', 'Brazil'];
const fixture = () => pack(Array.from({ length: 48 }, (_, i) => ({
  name: `Channel ${String(i + 1).padStart(2, '0')}`,
  url: `https://fixture.invalid/${i}.m3u8`,
  logo: null,
  quality: i % 3 === 0 ? '1080p' : i % 3 === 1 ? '720p' : null,
  category: [CATS[i % CATS.length]],
  country: [COUNTRIES[i % COUNTRIES.length]],
  language: ['English'],
})));

test.beforeEach(async ({ page }) => {
  await page.route('**/catalogue.json', (r) => r.fulfill({ json: fixture() }));
  // Anything off-origin (logos, flags, ads, analytics) is blocked.
  await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  await page.addInitScript(() => {
    localStorage.clear();
    indexedDB.deleteDatabase('nova-tv');
  });
});

const ready = async (page) => {
  await expect(page.locator('.card:not(.skel)').first()).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
};

test('home', async ({ page }) => {
  await page.goto('/');
  await ready(page);
  await expect(page).toHaveScreenshot('home.png', { animations: 'disabled' });
});

test('filters', async ({ page, isMobile }) => {
  await page.goto('/');
  await ready(page);
  if (isMobile) await page.locator('.nav-item', { hasText: 'Filters' }).click();
  await expect(page.locator('.filters')).toHaveScreenshot('filters.png', { animations: 'disabled' });
});

test('empty favorites', async ({ page }) => {
  await page.goto('/#view=favorites');
  await expect(page.locator('.empty')).toBeVisible();
  await expect(page).toHaveScreenshot('favorites-empty.png', { animations: 'disabled' });
});
