import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://127.0.0.1:4188',
    channel: process.env.ARCO_BROWSER_CHANNEL || undefined,
  },
  webServer: {
    command: 'npm run preview -- --port 4188 --strictPort',
    url: 'http://127.0.0.1:4188',
    reuseExistingServer: false,
  },
});

