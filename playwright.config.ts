import { defineConfig, devices } from "@playwright/test";

// Journeys run against a production build (`next start`, never `next dev`) and the real API.
// E2E_BASE_URL targets a deployed stack instead (staging); global setup then skips the local DB reset.
const PORT = Number(process.env.PORT ?? 3000);
const remote = process.env.E2E_BASE_URL;
const consent = { cookies: [{ name: "hebuza_consent", value: "v1.a0.m0", domain: remote ? new URL(remote).hostname : "localhost", path: "/", expires: -1, httpOnly: false, secure: !!remote, sameSite: "Lax" as const }], origins: [] };

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 4,
  outputDir: process.env.E2E_OUT ?? "test-results",
  use: { baseURL: remote ?? `http://localhost:${PORT}`, trace: "retain-on-failure", actionTimeout: 15_000, storageState: consent, launchOptions: { executablePath: process.env.E2E_CHROME } },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 5"], viewport: { width: 360, height: 780 } }, grep: /@mobile/ },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: remote ? undefined : { command: `npx next start -p ${PORT}`, port: PORT, reuseExistingServer: false }, // never reuse a `next dev` server: journeys must hit the production build
});
