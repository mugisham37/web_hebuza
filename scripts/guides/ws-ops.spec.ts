// Ops (Service Manager) guide screenshots. Marks are in the order of the `marks` labels in src/content/guides/workspaces/ops.ts.
// Never clicks anything irreversible: dialogs are only opened, then captured.
import { test, type Page } from "@playwright/test";
import { LOCALES, PERSONA, shoot, save, staffLogin } from "./lib";

const WS = "ops";
const REF = "HBZ-ZSXRA6";
const CASE = `/ops/cases/${REF}`;
// HBZ-ZSXRA6 has no documents or lead; these demo cases do
const DOCS_CASE = "/ops/cases/HBZ-9QW5ZE";
const SUGGEST = "/ops/assign/HBZ-4K2M9QL";
const HANDOFF = "/ops/assign/HBZ-9QW5ZE";
const DLG = "dialog[open]";
const PANEL = "main [role=tabpanel]:not([hidden])";
const click = (sel: string) => async (p: Page) => {
  await p.locator(sel).first().click();
  await p.waitForTimeout(500);
};
/** follow the first link matching sel, then wait for the page to settle */
const follow =
  (sel: string, query = "") =>
  async (p: Page) => {
    const href = await p.locator(sel).first().getAttribute("href");
    if (href) await p.goto(href + query, { waitUntil: "domcontentloaded" });
    await p
      .waitForLoadState("networkidle", { timeout: 15_000 })
      .catch(() => {});
  };

test.use({ viewport: { width: 1440, height: 900 } });
for (const l of LOCALES)
  test(`${WS} ${l}`, async ({ page }) => {
    test.setTimeout(900_000);
    await staffLogin(page, PERSONA.ops);
    const s = (spec: Parameters<typeof shoot>[3]) => shoot(page, WS, l, spec);

    // start
    await s({
      id: "ops-today",
      path: "/ops",
      marks: [
        "[data-guide=ops-kpis]",
        "[data-guide=ops-needs]",
        "[data-guide=ops-overdue-all]",
        "[data-guide=ops-open-intake]",
        "[data-guide=help-button]",
      ],
    });
    await s({
      id: "ops-help",
      path: "/ops",
      before: click("[data-guide=help-button]"),
      marks: [DLG],
    });

    // intake
    await s({
      id: "ops-intake",
      path: "/ops/intake",
      marks: [
        "[data-guide=ops-views]",
        "[data-guide=ops-search]",
        "[data-guide=ops-filterbar] [aria-expanded]",
        "main tbody input[type=checkbox]",
        "[data-guide=ops-intake-review]",
      ],
    });
    await s({
      id: "ops-intake-quick",
      path: "/ops/intake?tab=duplicates",
      before: click("[data-guide=ops-intake-review]"),
      marks: [
        "[data-guide=ops-open-triage]",
        "[data-guide=ops-claim]",
        "[data-guide=ops-compare]",
      ],
    });
    await s({
      id: "ops-intake-bulk",
      path: "/ops/intake",
      before: click("main tbody input[type=checkbox]"),
      marks: ["[data-guide=ops-bulkbar]"],
    });
    await s({
      id: "ops-assisted",
      path: "/ops/assisted",
      marks: ["main form", "[data-guide=ops-assisted-submit]"],
    });

    // cases list
    await s({
      id: "ops-cases",
      path: "/ops/cases",
      marks: [
        "[data-guide=ops-views]",
        "[data-guide=ops-save-view]",
        "[data-guide=ops-search]",
        "[data-guide=ops-filterbar] [aria-expanded]",
        "[data-guide=ops-density]",
        "[data-guide=ops-export]",
      ],
    });
    await s({
      id: "ops-cases-columns",
      path: "/ops/cases",
      before: click("[data-guide=ops-density] + div > button"),
      marks: ["[data-guide=ops-density] + div"],
    });
    await s({
      id: "ops-cases-save",
      path: "/ops/cases",
      before: click("[data-guide=ops-save-view]"),
      marks: [DLG],
    });
    await s({
      id: "ops-cases-bulk",
      path: "/ops/cases",
      before: click("main tbody input[type=checkbox]"),
      marks: ["[data-guide=ops-bulkbar]"],
    });
    await s({
      id: "ops-cases-export",
      path: "/ops/cases",
      before: click("[data-guide=ops-export]"),
      marks: [DLG],
    });

    // a case
    await s({
      id: "ops-case",
      path: CASE,
      marks: [
        "[data-guide=ops-status]",
        "[data-guide=ops-view-as]",
        "[data-guide=ops-assign]",
        "[data-guide=ops-message-client]",
        "[data-guide=ops-case-chat]",
        "main [role=tablist]",
      ],
    });
    await s({
      id: "ops-case-status",
      path: CASE,
      before: click("[data-guide=ops-status]"),
      marks: ["[data-guide=ops-moves]", "[data-guide=ops-substatus]"],
    });
    await s({
      id: "ops-case-triage",
      path: CASE,
      marks: [
        "[data-guide=ops-checklist]",
        "[data-guide=ops-mark-complete]",
        "[data-guide=ops-request-missing]",
        "[data-guide=ops-reject]",
      ],
    });
    await s({
      id: "ops-case-request",
      path: CASE,
      before: click("[data-guide=ops-request-missing]:not([disabled])"),
      marks: [DLG],
    });
    await s({
      id: "ops-case-docs",
      path: `${DOCS_CASE}?tab=documents`,
      marks: [
        "[data-guide=ops-doc-rail]",
        "[data-guide=ops-doc-zoom]",
        "[data-guide=ops-precheck]",
        "[data-guide=ops-doc-accept]",
        "[data-guide=ops-doc-reject]",
      ],
    });
    await s({
      id: "ops-case-timeline",
      path: `${CASE}?tab=timeline`,
      marks: [
        "[data-guide=ops-timeline-filters]",
        `${PANEL} textarea`,
        "[data-guide=ops-note-post]",
      ],
    });
    await s({
      id: "ops-case-messages",
      path: `${CASE}?tab=messages`,
      marks: [PANEL],
    });
    await s({
      id: "ops-case-billing",
      path: `${CASE}?tab=billing`,
      marks: [PANEL],
    });
    await s({
      id: "ops-case-audit",
      path: `${CASE}?tab=audit`,
      marks: [PANEL],
    });
    await s({
      id: "ops-case-field",
      path: `${CASE}?tab=field`,
      marks: [PANEL],
    });
    await s({
      id: "ops-case-viewas",
      path: CASE,
      before: click("[data-guide=ops-view-as]"),
      marks: [DLG],
    });

    // assign
    await s({
      id: "ops-assign",
      path: SUGGEST,
      marks: [
        "[data-guide=ops-assign-steps]",
        "label:has(> [data-guide=ops-include-external])",
        "[data-guide=ops-why]",
        "[data-guide=ops-suggestions]",
        "[data-guide=ops-assign-submit]",
      ],
    });
    await s({
      id: "ops-assign-brief",
      path: `${HANDOFF}?step=brief`,
      marks: [
        "[data-guide=ops-brief-template]",
        "[data-guide=ops-brief-deadline]",
        "[data-guide=ops-send-offer]",
      ],
    });
    await s({
      id: "ops-assign-scope",
      path: `${HANDOFF}?step=scope`,
      marks: ["[data-guide=ops-scope-matrix]", "[data-guide=ops-scope-save]"],
    });
    await s({
      id: "ops-assign-offer",
      path: `${HANDOFF}?step=offer`,
      marks: ["[data-guide=ops-reassign]"],
    });
    await s({
      id: "ops-assign-rules",
      path: `${HANDOFF}?step=rules`,
      marks: ["[data-guide=ops-rules-mode]", "[data-guide=ops-rules-save]"],
    });

    // team
    await s({
      id: "ops-workload",
      path: "/ops/workload",
      marks: [
        "[role=tab][id$='-load']",
        "[role=tab][id$='-approvals']",
        "[data-guide=ops-agent-view]",
      ],
    });
    await s({
      id: "ops-workload-drawer",
      path: "/ops/workload",
      before: click("[data-guide=ops-agent-view]"),
      marks: [DLG],
    });
    await s({
      id: "ops-workload-approvals",
      path: "/ops/workload?tab=approvals",
      marks: [PANEL],
    });
    await s({
      id: "ops-workforce",
      path: "/ops/workforce",
      marks: [
        "[data-guide=ops-add-person]",
        "[data-guide=ops-applications]",
        "main input[type=search]",
        "main table",
      ],
    });
    await s({
      id: "ops-worker",
      path: "/ops/workforce",
      before: async (p) => {
        await p.locator("main tbody tr").first().dblclick();
        await p.waitForURL(/\/ops\/workforce\/[^/]+$/, { timeout: 15_000 });
        await p
          .waitForLoadState("networkidle", { timeout: 15_000 })
          .catch(() => {});
      },
      marks: ["main [role=tablist]"],
    });

    // service quality
    await s({
      id: "ops-sla",
      path: "/ops/sla",
      marks: ["[data-guide=ops-sla-rules]", "#col-risk", "#col-breach"],
    });
    await s({
      id: "ops-sla-case",
      path: "/ops/sla",
      before: click("section[aria-labelledby^=col-] button"),
      marks: ["[data-guide=ops-sla-extend]", "[data-guide=ops-sla-escalate]"],
    });
    await s({
      id: "ops-reviews",
      path: "/ops/reviews",
      marks: ["main [role=tablist]"],
    });
    await s({
      id: "ops-tickets",
      path: "/ops/tickets",
      marks: [
        "main [role=tablist]",
        "[data-guide=ops-new-ticket]",
      ],
    });
    await s({
      id: "ops-conversations",
      path: "/ops/conversations",
      marks: ["main input[type=search]"],
    });
    await s({
      id: "ops-bookings",
      path: "/ops/bookings",
      marks: ["main [role=tablist]", "main header button"],
    });

    // records
    await s({
      id: "ops-companies",
      path: "/ops/companies",
      marks: [
        "main [role=tablist]",
        "main input[type=search]",
      ],
    });
    await s({
      id: "ops-retention",
      path: "/ops/retention",
      marks: ["main [role=tablist]"],
    });
    await s({
      id: "ops-field",
      path: "/ops/field",
      marks: ["[data-guide=ops-field-request]", "main [role=tablist]"],
    });

    // setup
    await s({
      id: "ops-catalogue",
      path: "/ops/catalogue",
      marks: [
        "[data-guide=ops-new-service]",
        "[data-guide=ops-categories]",
        "main input[type=search]",
        "[data-guide=ops-service-status]",
      ],
    });
    await s({
      id: "ops-builder",
      path: "/ops/catalogue",
      before: follow("main a[href*='/ops/catalogue/']"),
      marks: [
        "[data-guide=ops-builder-steps]",
        "[data-guide=ops-builder-preview]",
        "[data-guide=ops-builder-publish]",
      ],
    });
    await s({
      id: "ops-builder-pricing",
      path: "/ops/catalogue",
      before: follow("main a[href*='/ops/catalogue/']", "?step=pricing"),
      marks: [
        "[data-guide=ops-pricing-mode]",
        "[data-guide=ops-tiers]",
        "[data-guide=ops-pricing-save]",
      ],
    });
    await s({
      id: "ops-statuses",
      path: "/ops/settings/statuses",
      marks: ["[data-guide=ops-new-status]", "main table"],
    });
    await s({
      id: "ops-compliance",
      path: "/ops/compliance-rules",
      marks: [
        "[data-guide=ops-new-rule]",
        "main input[type=search]",
        "main table",
      ],
    });
    await s({
      id: "ops-knowledge",
      path: "/ops/knowledge",
      marks: ["main input[type=search]", "main [role=tablist]", "main table"],
    });
    await s({
      id: "ops-assistant",
      path: "/ops/assistant",
      marks: ["main [role=tablist]"],
    });
  });
test.afterAll(() => save(WS));
