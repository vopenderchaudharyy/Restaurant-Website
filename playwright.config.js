import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  outputDir: 'test-results',
  timeout: 45_000,
  fullyParallel: true,
  workers: 2,
  forbidOnly: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  expect: { timeout: 8_000 },
  use: {
    baseURL: 'http://127.0.0.1:5173',
    locale: 'en-IN',
    timezoneId: 'Asia/Kolkata',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev:client',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'desktop-firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1366, height: 768 },
        // The managed Windows runner blocks Firefox's content sandbox from spawning tabs.
        ...(process.platform === 'win32'
          ? {
              launchOptions: {
                env: { ...process.env, MOZ_DISABLE_CONTENT_SANDBOX: '1' },
                firefoxUserPrefs: {
                  'gfx.webrender.software': true,
                  'media.hardware-video-decoding.enabled': false,
                },
              },
            }
          : {}),
      },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-webkit',
      use: { ...devices['iPhone 13'] },
    },
  ],
});
