// Client dashboard guide screenshots (src/content/guides/workspaces/client.ts). Opens dialogs/tabs only; never submits
// or clicks destructive buttons. Demo data: HBZ-ZSXRA6 awaits payment, HBZ-2RT8LM is completed with a deliverable.
import { test, type Page } from "@playwright/test";
import { LOCALES, clientLogin, shoot, save } from "./lib";

const WS = "client";
const OPEN = "HBZ-ZSXRA6";
const DONE = "HBZ-2RT8LM";
const click = (sel: string) => async (p: Page) => {
  await p.locator(sel).first().click();
  await p.waitForTimeout(500);
};
const clicks =
  (...sels: string[]) =>
  async (p: Page) => {
    for (const s of sels) await click(s)(p);
  };

test.use({ viewport: { width: 1440, height: 900 } });
for (const l of LOCALES)
  test(`${WS} ${l}`, async ({ page }) => {
    test.setTimeout(900_000);
    await clientLogin(page);
    // h: taller viewport so marks below the fold land in the image
    const s = async (spec: Parameters<typeof shoot>[3], h = 900) => {
      await page.setViewportSize({ width: 1440, height: h });
      await shoot(page, WS, l, spec);
    };

    // Overview
    await s(
      {
        id: "client-dash",
        path: "/dashboard",
        marks: [
          "[data-guide=client-dash-start]",
          "section[aria-labelledby=needs-h]",
          "[data-guide=need-upload]",
          "[data-guide=client-dash-stats]",
          "section[aria-labelledby=pay-h]",
          "main a[href$='/dashboard/reminders']",
        ],
      },
      3000, // demo requests from capture.spec runs lengthen the lists
    );
    await s({
      id: "client-reminders",
      path: "/dashboard/reminders",
      marks: [
        "[data-guide=client-reminders-tabs]",
        "[data-guide=client-reminders-snooze]",
        "[data-guide=client-reminders-done]",
      ],
    });
    await s({
      id: "client-help-panel",
      path: "/dashboard",
      marks: ["dialog[open]"],
      before: click("[data-guide=help-button]"),
    });
    await s({
      id: "client-guides",
      path: "/dashboard/guides",
      marks: ["[data-guide=help-button]", "nav a[href$='/dashboard/guides']"],
    });

    // Requests
    await s({
      id: "client-requests-list",
      path: "/requests",
      marks: [
        "[data-guide=client-requests-start]",
        "[data-guide=client-requests-tabs]",
        "[data-guide=client-requests-search]",
        "[data-guide=client-requests-service]",
        "main table",
      ],
    });
    await s({
      id: "client-request-overview",
      path: `/requests/${OPEN}`,
      marks: [
        "[data-guide=client-request-header]",
        "main [role=tablist]",
        "section[aria-labelledby=need-h]",
        "[data-guide=client-request-cancel]",
      ],
    });
    await s({
      id: "client-request-timeline",
      path: `/requests/${OPEN}`,
      marks: ["[id$='-timeline-panel']"],
      before: click("[id$='-timeline']"),
    });
    await s({
      id: "client-request-payments",
      path: `/requests/${OPEN}`,
      marks: [
        "[id$='-payments-panel'] li",
        "[id$='-payments-panel'] a[href*='/pay/']",
      ],
      before: click("[id$='-payments']"),
    });
    await s({
      id: "client-request-deliverables",
      path: `/requests/${DONE}`,
      marks: [
        "[id$='-deliverables-panel'] li",
        "[id$='-deliverables-panel'] a[href*='/download']",
      ],
      before: click("[id$='-deliverables']"),
    });
    await s({
      id: "client-request-messages",
      path: `/requests/${DONE}`,
      marks: [
        "[data-guide=client-thread-search]",
        "[data-guide=client-thread-mute]",
        "[data-guide=client-thread-quick]",
        "[data-guide=client-thread-attach]",
        "[data-guide=client-thread-input]",
        "[data-guide=client-thread-send]",
      ],
      before: click("[id$='-messages']"),
    });
    await s({
      id: "client-request-cancel",
      path: `/requests/${OPEN}`,
      marks: ["dialog[open]", "dialog[open] textarea"],
      before: click("[data-guide=client-request-cancel]"),
    });
    await s({
      id: "client-messages",
      path: "/messages",
      marks: [
        "[data-guide=client-inbox-list]",
        "[data-guide=client-inbox-list] a",
      ],
    });

    // Documents
    await s({
      id: "client-docs-library",
      path: "/documents",
      marks: [
        "[data-guide=client-docs-cats]",
        "[data-guide=client-docs-expiring]",
        "[data-guide=client-docs-toolbar] fieldset",
        "[data-guide=client-docs-search]",
        "[data-guide=vault-upload]",
        "[data-guide=client-docs-item]",
      ],
    });
    await s({
      id: "client-docs-upload",
      path: "/documents",
      marks: [
        "dialog[open] input[maxlength='120']",
        "dialog[open] select",
        "[data-guide=client-docs-hint]",
      ],
      before: click("[data-guide=vault-upload]"),
    });
    await s({
      id: "client-docs-drawer",
      path: "/documents",
      marks: [
        "dialog[open] [role=tablist]",
        "[data-guide=client-docs-expiry]",
        "[data-guide=client-docs-delete]",
      ],
      before: click("[data-guide=client-docs-item]"),
    });
    await s(
      {
        id: "client-docs-hebuza",
        path: "/documents?tab=deliverables",
        marks: [
          "[data-guide=client-dlv-actions]",
          "[data-guide=client-dlv-review]",
          "[data-guide=client-dlv-pay]",
        ],
      },
      1560,
    );

    // Billing
    await s(
      {
        id: "client-billing",
        path: "/billing",
        marks: [
          "[data-guide=client-billing-tiles]",
          "[data-guide=client-billing-paynow]",
          "main [role=tablist]",
          "[data-guide=client-billing-row]",
          "[data-guide=client-billing-pay]",
          "[data-guide=client-billing-help]",
        ],
      },
      1500, // each capture.spec run adds an unpaid invoice above the help box
    );
    await s({
      id: "client-billing-invoices",
      path: "/billing",
      marks: [
        "[data-guide=client-billing-search]",
        "[data-guide=client-billing-invno]",
      ],
      before: click("[id$='-invoices']"),
    });
    await s({
      id: "client-billing-invoice",
      path: "/billing",
      marks: ["dialog[open]", "[data-guide=client-billing-pdf]"],
      before: clicks("[id$='-invoices']", "[data-guide=client-billing-invno]"),
    });
    await s({
      id: "client-billing-quotes",
      path: "/billing",
      marks: ["[id$='-quotes-panel']"],
      before: click("[id$='-quotes']"),
    });
    await s({
      id: "client-billing-receipts",
      path: "/billing",
      marks: [
        "[id$='-receipts-panel'] table",
        "[id$='-receipts-panel'] a[href*='/receipts/']",
      ],
      before: click("[id$='-receipts']"),
    });
    await s({
      id: "client-billing-statements",
      path: "/billing",
      marks: [
        "[id$='-statements-panel'] select",
        "[data-guide=client-billing-csv]",
      ],
      before: click("[id$='-statements']"),
    });
    await s({
      id: "client-billing-plan",
      path: "/billing",
      marks: ["[id$='-plan-panel']"],
      before: click("[id$='-plan']"),
    });
    await s({
      id: "client-refunds",
      path: "/help/refunds",
      marks: [
        "[data-guide=client-refund-policy]",
        "section[aria-labelledby=rf-mine]",
      ],
    });

    // History, bookings
    await s({
      id: "client-history",
      path: "/history",
      marks: [
        "[data-guide=client-history-filters]",
        "main table",
        "[data-guide=client-history-again]",
      ],
    });
    await s({
      id: "client-bookings",
      path: "/bookings",
      marks: [
        "main a[href$='/book']",
        "main [role=tablist]",
        "main a[href*='/bookings/']",
      ],
      before: click("[id$='-past']"),
    });

    // Companies
    await s({
      id: "client-orgs",
      path: "/orgs",
      marks: ["[data-guide=client-orgs-add]"],
    });
    await s(
      {
        id: "client-orgs-add",
        path: "/orgs",
        marks: [
          "dialog[open] input[name=legalName]",
          "dialog[open] input[name=tin]",
          "dialog[open] button[type=submit]",
        ],
        before: click("[data-guide=client-orgs-add]"),
      },
      1400,
    );

    // Notifications, help
    await s({
      id: "client-notifications",
      path: "/notifications",
      marks: [
        "main a[href$='/settings/notifications']",
        "[data-guide=client-notif-markall]",
        "main fieldset",
        "[data-guide=client-notif-actions]",
      ],
    });
    await s(
      {
        id: "client-settings-channels",
        path: "/settings/notifications",
        marks: [
          "[data-guide=client-channels-table]",
          "label:has([data-guide=client-channels-quiet])",
          "[data-guide=client-channels-save]",
        ],
      },
      1220,
    );
    await s(
      {
        id: "client-help",
        path: "/help",
        marks: [
          "main a[href$='/help/refunds']",
          "[data-guide=client-help-faq] input[type=search]",
          "[data-guide=client-help-faq] details",
          "[data-guide=client-help-newticket]",
          "[data-guide=client-help-contact]",
        ],
      },
      1000,
    );
    await s({
      id: "client-help-ticket",
      path: "/help",
      marks: [
        "dialog[open] fieldset",
        "dialog[open] select[name=caseRef]",
        "dialog[open] [name=subject]",
        "dialog[open] [name=message]",
        "dialog[open] button[type=submit]",
      ],
      before: click("[data-guide=client-help-newticket]"),
    });

    // Settings
    await s(
      {
        id: "client-settings-profile",
        path: "/settings",
        marks: [
          "[data-guide=client-settings-nav]",
          "[data-guide=client-profile-photo]",
          "[data-guide=client-profile-form]",
          "[data-guide=client-profile-language]",
        ],
      },
      1720,
    );
    await s(
      {
        id: "client-settings-security",
        path: "/settings/security",
        marks: [
          "main section.gap-3.p-5",
          "[data-guide=client-security-password]",
          "[data-guide=client-security-signout-all]",
        ],
      },
      1330,
    );
    await s(
      {
        id: "client-settings-privacy",
        path: "/settings/privacy",
        marks: [
          "[data-guide=client-privacy-consents]",
          "[data-guide=client-privacy-export]",
          "[data-guide=client-privacy-delete]",
        ],
      },
      1500,
    );
  });
test.afterAll(() => save(WS));
