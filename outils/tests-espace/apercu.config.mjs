/* Tests sur l'aperçu en ligne (vraie base, vraie recherche d'adresses). Lancés par GitHub Actions (tests-espace.yml),
   ou à la main :  EE_APERCU=1 EE_BASE=https://espace-estimation.shawez-immo.pages.dev npx playwright test --config=apercu.config.mjs
   Les essais utilisent des adresses e-mail en @test.invalid (jamais d'e-mail, jamais d'alerte, hors Google Sheet)
   et suppriment leur compte à la fin. */
import { defineConfig, devices } from '@playwright/test';

process.env.EE_APERCU = '1';
export default defineConfig({
  testDir: './tests',
  testMatch: ['apercu.spec.mjs'],
  timeout: 120000,
  expect: { timeout: 20000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: process.env.EE_BASE || 'https://espace-estimation.shawez-immo.pages.dev', locale: 'fr-FR', timezoneId: 'Europe/Paris', screenshot: 'only-on-failure' },
  projects: [
    { name: 'iphone13', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
    { name: 'ordinateur', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
});
