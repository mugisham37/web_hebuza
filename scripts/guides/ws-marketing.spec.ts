// Marketing dashboard guide captures (src/content/guides/workspaces/marketing.ts). Opens editors/dialogs only: never publishes, sends or deletes.
import { test, type Page } from "@playwright/test";
import { LOCALES, PERSONA, shoot, save, staffLogin } from "./lib";
const WS = "marketing";
const g = (k: string) => `[data-guide=${k}]`;
const VIEWS = "[role=toolbar][aria-label=Views]";
const DLG = "dialog[open]";
/** Open the first entry of the current list in the editor. */
const openFirst = async (p: Page) => {
  await p
    .locator(`${g("marketing-row")} a`)
    .first()
    .click();
  await p.locator(g("marketing-lang")).waitFor({ timeout: 15_000 });
};
const click = (sel: string) => async (p: Page) => {
  await p.locator(sel).first().click();
  await p.waitForTimeout(500);
};
const editorThen = (sel: string) => async (p: Page) => {
  await openFirst(p);
  await click(sel)(p);
};

test.use({ viewport: { width: 1440, height: 900 } });
for (const l of LOCALES)
  test(`${WS} ${l}`, async ({ page }) => {
    test.setTimeout(900_000);
    await staffLogin(page, PERSONA.marketing);
    const s = (spec: Parameters<typeof shoot>[3]) => shoot(page, WS, l, spec);
    await s({
      id: "marketing-overview",
      path: "/marketing",
      marks: [
        g("marketing-range"),
        g("marketing-new-campaign"),
        g("marketing-kpis"),
      ],
    });
    await s({
      id: "marketing-help",
      path: "/marketing",
      marks: [g("help-button")],
    });
    await s({
      id: "marketing-content",
      path: "/marketing/content",
      marks: [
        g("marketing-new"),
        VIEWS,
        "form[role=search]",
        g("marketing-row"),
      ],
    });
    await s({
      id: "marketing-content-new",
      path: "/marketing/content?new=1",
      marks: [`${DLG} input`, `${DLG} select`],
    });
    await s({
      id: "marketing-editor",
      path: "/marketing/knowledge?status=published",
      before: openFirst,
      marks: [
        g("marketing-structure"),
        g("marketing-add-block"),
        g("marketing-canvas"),
        g("marketing-panels"),
      ],
    });
    await s({
      id: "marketing-editor-lang",
      path: "/marketing/knowledge?status=published",
      before: openFirst,
      marks: [
        g("marketing-lang"),
        g("marketing-compare"),
        g("marketing-preview-link"),
      ],
    });
    await s({
      id: "marketing-seo-panel",
      path: "/marketing/knowledge?status=published",
      before: editorThen(`${g("marketing-panels")} [role=tab]:nth-child(2)`),
      marks: [g("marketing-panels")],
    });
    await s({
      id: "marketing-archive",
      path: "/marketing/content?status=published",
      before: editorThen(g("marketing-archive")),
      marks: [`${DLG} input`],
    });
    await s({
      id: "marketing-landing",
      path: "/marketing/landing",
      marks: [g("marketing-new"), g("marketing-row")],
    });
    await s({
      id: "marketing-knowledge",
      path: "/marketing/knowledge",
      marks: [g("marketing-new"), g("marketing-row")],
    });
    await s({
      id: "marketing-updates",
      path: "/marketing/updates",
      marks: [g("marketing-new"), g("marketing-row")],
    });
    await s({
      id: "marketing-faqs",
      path: "/marketing/faqs",
      marks: [g("marketing-new-faq"), VIEWS, g("marketing-faq-open")],
    });
    await s({
      id: "marketing-faq-drawer",
      path: "/marketing/faqs",
      before: click(g("marketing-faq-open")),
      marks: [`${DLG} [role=tablist]`, `${DLG} textarea`],
    });
    await s({
      id: "marketing-media",
      path: "/marketing/media",
      marks: [g("marketing-upload"), g("marketing-media-filters")],
    });
    await s({
      id: "marketing-leads",
      path: "/marketing/leads",
      marks: [
        g("marketing-add-lead"),
        g("marketing-import"),
        VIEWS,
        `${g("marketing-lead-card")}:visible`,
      ],
    });
    await s({
      id: "marketing-lead",
      path: "/marketing/leads",
      before: click(`${g("marketing-lead-card")}:visible button`),
      marks: [`${DLG} [role=tablist]`, g("marketing-convert")],
    });
    await s({
      id: "marketing-inbox",
      path: "/marketing/inbox",
      before: click(`${g("marketing-threads")} button`),
      marks: [
        g("marketing-threads"),
        g("marketing-reply"),
        g("marketing-lead-actions"),
      ],
    });
    await s({
      id: "marketing-customers",
      path: "/marketing/customers",
      marks: [g("marketing-customer-search"), "main table"],
    });
    await s({
      id: "marketing-segments",
      path: "/marketing/segments",
      marks: [g("marketing-new-segment")],
    });
    await s({
      id: "marketing-segment",
      path: "/marketing/segments",
      before: click(`main a[href*="/marketing/segments/"]:not(${g("marketing-new-segment")})`),
      marks: [g("marketing-add-rule"), g("marketing-seg-preview")],
    });
    await s({
      id: "marketing-campaigns",
      path: "/marketing/campaigns",
      marks: [g("marketing-new-campaign"), VIEWS, g("marketing-campaign-list")],
    });
    await s({
      id: "marketing-campaign-new",
      path: "/marketing/campaigns/new?id=CP-2026-021",
      marks: [g("marketing-wizard-step"), g("marketing-wizard-rail")],
    });
    await s({
      id: "marketing-campaign",
      path: "/marketing/campaigns?status=pending_approval",
      before: click(`${g("marketing-campaign-list")} a`),
      marks: [VIEWS, g("marketing-campaign-approve")],
    });
    await s({
      id: "marketing-sequences",
      path: "/marketing/sequences",
      marks: [g("marketing-new-sequence"), VIEWS],
    });
    await s({
      id: "marketing-templates",
      path: "/marketing/templates",
      marks: [g("marketing-new-template")],
    });
    await s({
      id: "marketing-testimonials",
      path: "/marketing/testimonials",
      marks: ["main [role=tablist]", g("marketing-ts-approve")],
    });
    await s({
      id: "marketing-team",
      path: "/marketing/team",
      marks: [],
    });
    await s({
      id: "marketing-referrals",
      path: "/marketing/referrals?tab=programme",
      marks: [g("marketing-rf-save")],
    });
    await s({
      id: "marketing-feedback",
      path: "/marketing/feedback",
      marks: [g("marketing-range")],
    });
    await s({
      id: "marketing-reports",
      path: "/marketing/reports",
      marks: [g("marketing-range"), "main [role=tablist]"],
    });
    await s({
      id: "marketing-seo-analytics",
      path: "/marketing/seo?tab=analytics",
      marks: [g("marketing-ga4")],
    });
    await s({
      id: "marketing-seo-redirects",
      path: "/marketing/seo?tab=redirects",
      marks: [g("marketing-redirect-form")],
    });
  });
test.afterAll(() => save(WS));
