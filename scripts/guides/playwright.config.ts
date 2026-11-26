import { defineConfig } from "@playwright/test";

// Guide screenshot capture (not part of the e2e suite): reuses the running app on :3000, never resets the database.
export default defineConfig({
  testDir: ".",
  timeout: 600_000,
  workers: 1, // one writer for shots.json
  fullyParallel: false,
  use: {
    baseURL: "http://localhost:3000",
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
    viewport: { width: 1280, height: 800 },
    storageState: {
      cookies: [
        {
          name: "hebuza_consent",
          value: "v1.a0.m0",
          domain: "localhost",
          path: "/",
          expires: -1,
          httpOnly: false,
          secure: false,
          sameSite: "Lax",
        },
      ],
      origins: [],
    },
    launchOptions: { executablePath: process.env.E2E_CHROME },
  },
});
