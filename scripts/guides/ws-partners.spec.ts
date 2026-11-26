import { test } from "@playwright/test";
import { LOCALES, PERSONA, shoot, save, staffLogin } from "./lib";

// Partners dashboard guide shots (src/content/guides/workspaces/partners.ts). Opens forms only; never saves.
const WS = "partners";
test.use({ viewport: { width: 1440, height: 900 } });
for (const l of LOCALES)
  test(`${WS} ${l}`, async ({ page: p }) => {
    test.setTimeout(900_000);
    await staffLogin(p, PERSONA.partners);
    await shoot(p, WS, l, { id: "partners-list", path: "/partners", marks: ["[data-guide=partners-add]", "main dl", "main [role=tablist]"] });
    await shoot(p, WS, l, { id: "partners-add", path: "/partners", before: async (x) => { await x.locator("[data-guide=partners-add]").click({ timeout: 10_000 }); await x.waitForTimeout(500); }, marks: ["dialog[open]"] });
  });
test.afterAll(() => save(WS));
