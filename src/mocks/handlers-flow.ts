// C04/C05 mocks: submit, document upload, application detail, payments (contract: src/lib/api/schema.d.ts).
// Demo rules: full name "error" → 500; national ID 0000000000000000 → 422 field error.
// Phone ending 0 → failed, 1 → insufficient funds, 2 → expired, else success on the 2nd poll.
// Code HBZ-PAID01 → already paid; HBZ-FREE01 → nothing due; HBZ-NONE00 → 404.
import { http, HttpResponse, delay } from "msw";
import { POLICY } from "@/shared/policy";
import { audit } from "./audit";
import { unverifiedGate } from "./handlers-auth";
import { seededInvoice as seeded } from "./handlers-c2";
import { splitVat } from "@/shared/money";

const ok = <T>(data: T) =>
  HttpResponse.json({ success: true, message: "OK", errorType: null, data });
const fail = (
  status: number,
  errorType: string,
  message: string,
  extra?: object,
) =>
  HttpResponse.json(
    { success: false, message, errorType, data: null, ...extra },
    { status },
  );

const apps = new Map<
  string,
  { service: string; slug: string; tier: string; total: number; paid: number }
>();
// Invoice for a ref: seeded demo codes, or what submit created. Total is VAT-inclusive integer RWF.
const invoice = (c: string) =>
  apps.get(c) ?? (seeded(c) && { tier: "standard", ...seeded(c)! }) ?? {
    service: "Company registration",
    slug: "company-registration",
    tier: "standard",
    total: c === "HBZ-FREE01" ? 0 : POLICY.consultationPrice, // PLACEHOLDER(consultation-price)
    paid: c === "HBZ-PAID01" ? POLICY.consultationPrice : 0,
  };
const balance = (c: string) => { const a = invoice(c); return Math.max(0, a.total - a.paid); };
const byIdem = new Map<string, string>();
const txs = new Map<
  string,
  { code: string; outcome: string; polls: number; method: string; amount: number; expiresAt: number; final: boolean }
>();
const txByKey = new Map<string, string>();
const code = () =>
  `HBZ-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export const handlers = [
  http.post("/api/applications/submit", async ({ request }) => {
    await delay(500);
    const gate = unverifiedGate();
    if (gate) return gate;
    const b = (await request.json()) as {
      service_slug: string;
      tier: string;
      idempotency_key?: string;
      personal_info: { fullName: string; nationalId: string };
    };
    if (b.personal_info.fullName.trim().toLowerCase() === "error")
      return fail(500, "server_error", "Internal error");
    if (b.personal_info.nationalId === "0000000000000000")
      return fail(422, "validation", "Invalid national ID", {
        detail: [
          {
            loc: ["body", "personal_info", "nationalId"],
            msg: "This national ID isn't valid.",
          },
        ],
      });
    const replay = b.idempotency_key && byIdem.get(b.idempotency_key);
    const c = replay || code();
    if (b.idempotency_key) byIdem.set(b.idempotency_key, c);
    const service = b.service_slug
      .replace(/-/g, " ")
      .replace(/^\w/, (x) => x.toUpperCase());
    if (!replay) {
      apps.set(c, { service, slug: b.service_slug, tier: b.tier, total: POLICY.consultationPrice, paid: 0 });
      audit({ actor: "mock-client", action: "application.submit", entity: { kind: "application", id: c }, after: { service: b.service_slug, tier: b.tier } });
    }
    return ok({
      application_id: c,
      code: c,
      service_name: service,
      tier: b.tier,
      payment_required: true,
      ending: "payable",
      replayed: !!replay,
      notified: [],
      matches_account: true,
    });
  }),

  http.post("/api/applications/:code/documents", async ({ request }) => {
    await delay(400);
    const f = (await request.formData().catch(() => null))?.get("file");
    if (f instanceof File && f.size > 10 * 1024 * 1024) return fail(413, "too_large", "File too large."); // PLACEHOLDER(upload-max-mb)
    return ok({ id: crypto.randomUUID(), status: "scanning" });
  }),

  http.get("/api/applications/:code", async ({ params }) => {
    await delay(250);
    const c = String(params.code);
    if (c === "HBZ-NONE00")
      return fail(404, "not_found", "Application not found");
    const a = invoice(c);
    const due = balance(c);
    return ok({
      application_id: c,
      code: c,
      service_name: a.service,
      service_slug: a.slug,
      tier: a.tier,
      status: "submitted",
      personal_info: {},
      service_data: {},
      payment_status: a.total && !due ? "paid" : a.paid ? "partial" : "pending",
      payment_amount: a.total ? due || a.total : null, // the balance; the full total once paid (receipt headline)
      handler: "hebuza",
      ending: "payable",
      status_display: "Submitted",
      submitted_at: new Date().toISOString(),
    });
  }),

  http.post("/api/payments/initiate", async ({ request }) => {
    await delay(600);
    const gate = unverifiedGate();
    if (gate) return gate;
    const b = (await request.json()) as {
      application_code: string;
      method: string;
      phone_number?: string | null;
    };
    const key = request.headers.get("Idempotency-Key");
    const live = (id?: string) => { const t = id ? txs.get(id) : undefined; return t && !t.final && t.expiresAt > Date.now() ? t : undefined; };
    // F-FIN-16: same key while in flight → the same payment, never a second charge.
    const same = key ? txByKey.get(key) : undefined;
    if (same && live(same)) {
      const t = txs.get(same)!;
      return ok({ paymentId: same, transactionId: same, status: "pending", expiresAt: new Date(t.expiresAt).toISOString(), sessionToken: t.method === "card" ? `${location.pathname}?tx=${same}` : null });
    }
    if ([...txs.keys()].some((id) => txs.get(id)!.code === b.application_code && live(id)))
      return fail(409, "payment_pending", "A payment for this invoice is already in progress.");
    const amount = balance(b.application_code);
    if (!amount) return fail(409, "conflict", "Nothing is due on this invoice.");
    const last = b.phone_number?.slice(-1);
    const out =
      { "0": "failed", "1": "insufficient_funds", "2": "expired" }[
        last ?? ""
      ] ?? "successful";
    const id = `TX-${crypto.randomUUID().slice(0, 8)}`;
    const exp = Date.now() + (out === "expired" ? 8_000 : POLICY.momoPromptMs);
    txs.set(id, { code: b.application_code, outcome: out, polls: 0, method: b.method, amount, expiresAt: exp, final: false });
    if (key) txByKey.set(key, id);
    const expiresAt = new Date(exp).toISOString();
    // Card: hand off to the "secure page" — in mocks it just comes straight back with ?tx=.
    const sessionToken =
      b.method === "card" ? `${location.pathname}?tx=${id}` : null;
    return ok({
      paymentId: id,
      transactionId: id,
      status: "pending",
      expiresAt,
      sessionToken,
    });
  }),

  http.get("/api/payments/:tx/status", async ({ params }) => {
    await delay(200);
    const t = txs.get(String(params.tx));
    if (!t)
      return ok({
        transactionId: String(params.tx),
        status: "successful",
        paidAt: new Date().toISOString(),
      });
    t.polls++;
    if (t.outcome === "expired" || t.polls < 2)
      return ok({ transactionId: params.tx, status: "pending", paidAt: null });
    if (t.outcome === "successful" && !t.final) {
      const a = invoice(t.code);
      const before = a.paid;
      apps.set(t.code, { ...a, paid: a.paid + t.amount });
      audit({ actor: "mock-client", action: "payment.success", entity: { kind: "invoice", id: t.code }, before: { paid: before }, after: { paid: before + t.amount, tx: String(params.tx) } });
    }
    t.final = true;
    return ok({
      transactionId: params.tx,
      status: t.outcome,
      paidAt: t.outcome === "successful" ? new Date().toISOString() : null,
    });
  }),

  http.post("/api/payments/bank-transfer", async ({ request }) => {
    await delay(400);
    const gate = unverifiedGate();
    if (gate) return gate;
    const b = (await request.json()) as { application_code: string };
    if (!b.application_code) return fail(422, "validation", "application_code is required");
    return ok({ status: "pending_verification" });
  }),

  http.get("/api/applications/:code/payment/receipt", async ({ params }) => {
    await delay(250);
    const c = String(params.code);
    const a = invoice(c);
    const { vat } = splitVat(a.paid);
    return ok({
      serviceName: a.service,
      trackingCode: c,
      amount: a.paid,
      governmentFee: 0,
      vatAmount: vat,
      method: "MTN MoMo",
      transactionId: "TX-DEMO",
      receiptNumber: `RCPT-${c.slice(4)}`,
      paidAt: new Date().toISOString(),
      applicationCode: c,
    });
  }),
];
