import { defineConfig, devices } from '@playwright/test';

// Smoke tests run against the real dev server (and the live iptv-org
// playlists through its proxy), on a phone and a desktop viewport.
// Visual tests (tests/visual.spec.js) use fixture data instead.
const phone = devices['Pixel 7'];
const desktop = { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } };

export default defineConfig({
  testDir: 'tests',
  timeout: 90_000,
  expect: { timeout: 60_000, toHaveScreenshot: { maxDiffPixelRatio: 0.01 } },
  use: { baseURL: 'http://localhost:5199', trace: 'retain-on-failure' },
  // Screenshots differ by OS font rendering, so baselines are per platform.
  snapshotPathTemplate: 'tests/__screenshots__/{platform}/{projectName}/{arg}{ext}',
  // In CI a missing baseline is written (and uploaded as an artifact) rather
  // than failing, so new platforms can be bootstrapped from a CI run.
  updateSnapshots: process.env.CI ? 'missing' : 'none',
  webServer: {
    command: 'npx vite --port 5199 --strictPort',
    url: 'http://localhost:5199',
    reuseExistingServer: true,
  },
  projects: [
    { name: 'phone', use: phone, testIgnore: /visual\.spec/ },
    { name: 'desktop', use: desktop, testIgnore: /visual\.spec/ },
    { name: 'visual-phone', use: phone, testMatch: /visual\.spec/ },
    { name: 'visual-desktop', use: desktop, testMatch: /visual\.spec/ },
  ],
});
