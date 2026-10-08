/* Tests de l'espace estimation, en local (serveurs lancés par « node serveur.mjs »).
   Deux appareils : iPhone 13 et ordinateur. Captures dans captures/. */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testIgnore: ['apercu.spec.mjs'],
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:8788', locale: 'fr-FR', timezoneId: 'Europe/Paris', trace: 'off', screenshot: 'only-on-failure' },
  projects: [
    { name: 'iphone13', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
    { name: 'ordinateur', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
});
