import { defineConfig, devices } from '@playwright/test';

// Smoke tests run against the real dev server (and the live iptv-org
// playlists through its proxy), on a phone and a desktop viewport.
export default defineConfig({
  testDir: 'tests',
  timeout: 90_000,
  expect: { timeout: 60_000 },
  use: { baseURL: 'http://localhost:5199', trace: 'retain-on-failure' },
  webServer: {
    command: 'npx vite --port 5199 --strictPort',
    url: 'http://localhost:5199',
    reuseExistingServer: true,
  },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
});
