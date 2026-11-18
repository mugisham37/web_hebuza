import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3100);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  retries: 1, // one retry: absorbs rare timing flakes; a test that fails twice is a real failure
  workers: process.env.CI ? 2 : 3, // a single next-start server saturates above ~3 parallel browsers (timeouts, not bugs)
  use: {
    baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure",
    // Consent already given, so the banner doesn't cover the page; the consent spec opts out with an empty state.
    storageState: { cookies: [{ name: "hebuza_consent", value: "v1.a0.m0", domain: "localhost", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" }], origins: [] },
  },
  // Phone first (360px Android) + desktop — spec principle 1.
  projects: [
    { name: "mobile", use: { ...devices["Pixel 5"], viewport: { width: 360, height: 780 } } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `npx next start -p ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    // P13: e2e runs against the real API (seeded Postgres); MSW mock builds are retired.
  },
});
