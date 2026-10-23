import { defineConfig, devices } from '@playwright/test';

const apiPort = 5505;
const webPort = 5185;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: `http://127.0.0.1:${webPort}`, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } }
  ],
  webServer: [
    {
      command: 'node server/server.js',
      url: `http://127.0.0.1:${apiPort}/api/health`,
      reuseExistingServer: false,
      env: {
        NODE_ENV: 'development', PORT: String(apiPort), BGA_DEV_MEMORY: 'true',
        JWT_SECRET: 'local-test-only-jwt-secret-32-characters',
        ADMIN_EMAIL: 'test-admin@example.com', ADMIN_PASSWORD: 'test-only-password'
      }
    },
    {
      command: `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${webPort} --strictPort`,
      url: `http://127.0.0.1:${webPort}`,
      reuseExistingServer: false,
      env: { VITE_DEMO_MODE: 'true', BGA_API_PROXY_TARGET: `http://127.0.0.1:${apiPort}` }
    }
  ]
});
