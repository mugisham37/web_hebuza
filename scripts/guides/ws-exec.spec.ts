import { test } from "@playwright/test";
import { LOCALES, PERSONA, shoot, save, staffLogin } from "./lib";

// Executive dashboard guide shots (src/content/guides/workspaces/exec.ts). Never approves.
const WS = "exec";
test.use({ viewport: { width: 1440, height: 900 } });
for (const l of LOCALES)
  test(`${WS} ${l}`, async ({ page: p }) => {
    test.setTimeout(900_000);
    await staffLogin(p, PERSONA.exec);
    await shoot(p, WS, l, { id: "exec-overview", path: "/exec", marks: ["[data-guide=exec-money]", "[data-guide=exec-counts]", "[data-guide=exec-panels]", 'main a[href$="/exec/approvals"]'] });
    await shoot(p, WS, l, { id: "exec-approvals", path: "/exec/approvals", marks: ["#proc-exec", "[data-guide=system-appr-search]"] });
    await shoot(p, WS, l, { id: "exec-approval", path: "/exec/approvals?state=decided", before: async (x) => { await x.locator("[data-guide=system-appr-review]").first().click({ timeout: 10_000 }); await x.waitForTimeout(500); }, marks: ["dialog[open]"] });
    await shoot(p, WS, l, { id: "exec-targets", path: "/exec/targets", marks: ["main form select", "main form select >> nth=1", "main form input", "main form button[type=submit]"] });
    await shoot(p, WS, l, { id: "exec-reports", path: "/exec/reports", marks: ["main h1"] });
  });
test.afterAll(() => save(WS));
