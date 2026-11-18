import { defineConfig, devices } from "@playwright/test";
// Phase 8.3 run against `next dev` on :3000 + real API; dev compiles on first hit, so generous timeouts.
export default defineConfig({
  testDir: ".", globalSetup: "./global-setup.ts", fullyParallel: true, timeout: 300_000, expect: { timeout: 120_000 }, workers: 2, retries: 0,
  outputDir: process.env.E2E_OUT ?? "test-results",
  use: { ...devices["Desktop Chrome"], baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000", navigationTimeout: 180_000, actionTimeout: 45_000, launchOptions: { executablePath: process.env.E2E_CHROME }, // shortcut: reuse a cached chromium build
    storageState: { cookies: [{ name: "hebuza_consent", value: "v1.a0.m0", domain: "localhost", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" }], origins: [] } },
});
