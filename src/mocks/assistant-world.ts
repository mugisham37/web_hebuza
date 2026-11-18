// Stage 11 assistant world (plan 11 §9.3–9.4): sessions, keyword scripts, drafts, KB sources, console data.
// shortcut: keyword-scripted SSE mock answers, replaced by the HEBUZA server stream (no UI change).
// Mock scripts are dev fixtures, not "AI": acceptance is about UI behaviour, not answer quality.
import { CASES, SERVICES } from "./ops-world";
import { NOW, TYPES, slotsFor } from "./booking-world";
import { addDays, dayOf } from "@/shared/booking/rules";
import type { AiSessionRow, AiSettings, AiTranscript, Citation, Cluster, EvalRun, HandoffData, HandoffItem, HandoffReason, KbSource, StreamEvent, ToolCard } from "@/shared/booking/types";
import type { Locale } from "@/shared/i18n/config";

const D = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();
const id = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;

// ---------------------------------------------------------------- Settings (F-AIA-10/14)
export const SETTINGS: AiSettings = {
  enabled: true, monthlyBudget: { amount: 50 /* PLACEHOLDER(ai-monthly-budget) D-17, Q-AI-01 */, currency: "USD" }, spent: 31,
  perIpDaily: 30, retentionMonths: 12, officeHours: "Mon–Fri 08:00–17:00", version: 1,
};
/** PLACEHOLDER(handoff-promise) D-10 */
export const PROMISE = "within 1 working hour";
export const WHATSAPP = "https://wa.me/250788000000"; // PLACEHOLDER(whatsapp-number) — fictional

// ---------------------------------------------------------------- Sessions
type Intake = { slug: string; step: number; answers: Record<string, string>; unsure: number };
export type Session = { id: string; lang: Locale; context: "public" | "portal" | "staff_test"; startedAt: number; lastAt: number; handedOff: boolean; streaming: boolean; intake: Intake | null; turns: number; title: string; owner: string | null; lowConf: number };
export const SESSIONS = new Map<string, Session>();
export function newSession(lang: Locale, context: Session["context"], owner: string | null) {
  const s: Session = { id: id("as"), lang, context, startedAt: Date.now(), lastAt: Date.now(), handedOff: false, streaming: false, intake: null, turns: 0, title: "New chat", owner, lowConf: 0 };
  SESSIONS.set(s.id, s);
  return s;
}

// ---------------------------------------------------------------- Drafts (F-AIA-05): no case exists until Submit in the wizard.
export const DRAFTS = new Map<string, { serviceSlug: string; answers: Record<string, string>; status: "ai_draft" | "user_reviewing" | "submitted" | "expired"; expiresAt: string; structureVersion: number }>();
DRAFTS.set("dr_expired", { serviceSlug: "company-registration", answers: {}, status: "expired", expiresAt: iso(NOW - D), structureVersion: 1 });

const INTAKE: Record<string, { id: string; type: "choice" | "text" | "number" | "date"; label: Record<Locale, string>; options?: string[]; help?: Record<Locale, string> }[]> = {
  "company-registration": [
    { id: "kind", type: "choice", label: { en: "What kind of company?", fr: "Quel type de société ?", rw: "Ni ubuhe bwoko bwa sosiyete?" }, options: ["Private limited (Ltd)", "Public limited", "Branch of a foreign company"] },
    { id: "name", type: "text", label: { en: "Proposed company name", fr: "Nom proposé pour la société", rw: "Izina wifuza ko sosiyete yitwa" } },
    { id: "shareholders", type: "number", label: { en: "How many shareholders?", fr: "Combien d'actionnaires ?", rw: "Abanyamigabane bangahe?" }, help: { en: "1 to 50", fr: "De 1 à 50", rw: "Kuva kuri 1 kugeza kuri 50" } },
    { id: "foreign", type: "choice", label: { en: "Are any shareholders foreign nationals?", fr: "Des actionnaires sont-ils étrangers ?", rw: "Hari abanyamigabane b'abanyamahanga?" }, options: ["Yes", "No"] },
  ],
};
const DOCS = { "company-registration": ["Passport or ID copy of each shareholder", "Registered office address"] } as Record<string, string[]>;

// ---------------------------------------------------------------- Scripts
export type Step = StreamEvent | { pause: number };
const svc = (slug: string) => SERVICES.find((s) => s.slug === slug)!;
const ASOF = dayOf(NOW - 10 * D);
const cite = (slug: string, title: string, lang: Locale, sourceLang: Locale = "en"): Citation => ({ id: id("c"), title, url: `/${lang}/knowledge/${slug}`, updatedAt: ASOF, sourceLang });
function chunks(text: string): Step[] {
  return text.match(/\S+\s*/g)!.reduce<string[]>((acc, w, i) => (i % 3 ? (acc[acc.length - 1] += w, acc) : [...acc, w]), []).flatMap((t) => [{ event: "delta", data: { text: t } } as Step, { pause: 30 + Math.round(Math.random() * 30) }]);
}
const card = (data: ToolCard): Step => ({ event: "tool_card", data });
const notice = (kind: Extract<StreamEvent, { event: "notice" }>["data"]["kind"]): Step => ({ event: "notice", data: { kind } });
function serviceCard(slug: string, lang: Locale): ToolCard {
  const s = svc(slug);
  return { kind: "service", slug, name: s.name, summary: lang === "fr" ? "Accompagnement complet de la demande." : lang === "rw" ? "Tugufasha mu busabe bwose." : "We handle the whole application for you.",
    fee: s.fee == null ? null : { min: s.fee, max: null, asOf: ASOF, indicative: true }, turnaround: `${s.slaDays}–${s.slaDays + 2} ${lang === "fr" ? "jours ouvrables" : lang === "rw" ? "iminsi y'akazi" : "working days"}`,
    applyHref: `/${lang}/apply/${slug}`, bookHref: `/${lang}/book/consult-60?service=${slug}` };
}
function slotsCard(lang: Locale): ToolCard {
  const t = TYPES.find((x) => x.slug === "consult-60")!;
  const r = slotsFor(t, dayOf(Date.now()), addDays(dayOf(Date.now()), 10), null);
  return { kind: "slots", typeSlug: t.slug, typeName: t.name[lang], slots: r.slots.filter((_, i) => i % 5 === 0).slice(0, 3), moreHref: `/${lang}/book/consult-60` };
}
export function handoffData(s: Session, reason: HandoffReason, hoursClosed: boolean): HandoffData {
  const lang = s.lang;
  return {
    conversationId: s.context === "portal" ? id("cv") : null, ticketRef: `SUP-${String(Math.floor(Math.random() * 9000) + 1000)}`, reasonCode: reason, inHours: !hoursClosed,
    promise: hoursClosed ? null : PROMISE, nextOpenAt: hoursClosed ? iso(Date.parse(`${addDays(dayOf(Date.now()), 1)}T06:00:00Z`)) : null,
    whatsapp: WHATSAPP, callbackHref: `/${lang}/book/callback`, bookHref: `/${lang}/book`,
  };
}
const T = (lang: Locale, m: Record<Locale, string>) => m[lang];
const has = (text: string, re: RegExp) => re.test(text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase());

export function respond(text: string, s: Session, hoursClosed: boolean): Step[] {
  const lang = s.lang;
  const steps: Step[] = [];
  const masked = text.replace(/\d[\d -]{6,}\d/g, (m) => "•".repeat(Math.max(0, m.replace(/\D/g, "").length - 4)) + m.replace(/\D/g, "").slice(-4));
  const done = (outcome: string): Step => ({ event: "done", data: { outcome, maskedUserText: masked !== text ? masked : undefined } });
  if (masked !== text) steps.push(notice("pii_masked"));

  if (has(text, /guarant|garanti|ingwate|promise|promettre|approve my/)) {
    return [...steps, notice("guardrail_guarantee"), ...chunks(T(lang, { en: "I can't guarantee a loan, an approval or a timeline — those decisions belong to the bank or the institution. An adviser can review your case and tell you what improves your chances.", fr: "Je ne peux pas garantir un prêt, une approbation ou un délai : ces décisions appartiennent à la banque ou à l'institution. Un conseiller peut examiner votre dossier.", rw: "Sinshobora kwemeza inguzanyo cyangwa igihe — ibyo byemezwa na banki cyangwa ikigo. Umujyanama ashobora gusuzuma dosiye yawe." })), card(slotsCard(lang)), done("refused")];
  }
  if (has(text, /legal advice|tax advice|conseil juridique|conseil fiscal|inama y'amategeko|should i/)) {
    return [...steps, notice("guardrail_advice"), ...chunks(T(lang, { en: "Here is what the official RRA guide says about filing: declarations are due by the 15th of the following month, and late filing has penalties. For your own situation, an adviser should look at it.", fr: "Voici ce que dit le guide officiel de la RRA : les déclarations sont dues le 15 du mois suivant. Pour votre situation, un conseiller doit l'examiner.", rw: "Dore icyo amabwiriza ya RRA avuga: imenyekanisha ritangwa bitarenze ku itariki ya 15 y'ukwezi gukurikira." })),
      { event: "citation", data: cite("vat-declaration", "VAT declaration — RRA deadlines", lang) }, card(slotsCard(lang)), done("refused")];
  }
  if (has(text, /hotel|football|weather|meteo|recipe|recette|ikirere|umupira/)) return [...steps, notice("off_topic"), ...chunks(T(lang, { en: "I'm here to help with HEBUZA services. Let me know if you have a business or investment question.", fr: "Je suis là pour les services HEBUZA. Avez-vous une question sur votre entreprise ou un investissement ?", rw: "Ndi hano gufasha kuri serivisi za HEBUZA. Ufite ikibazo kijyanye n'ubucuruzi cyangwa ishoramari?" })), done("off_topic")];
  if (has(text, /human|person|humain|personne|umuntu|agent|someone/)) return [...steps, { event: "handoff", data: handoffData(s, "user_request", hoursClosed) }, done("handed_off")];
  if (has(text, /minor|mineur|umwana|my child/)) return [...steps, ...chunks(T(lang, { en: "Applications for a minor need an adviser.", fr: "Les démarches pour un mineur nécessitent un conseiller.", rw: "Ubusabe bw'umwana bukenera umujyanama." })), { event: "handoff", data: handoffData(s, "minor", hoursClosed) }, done("handed_off")];
  if (has(text, /hbz-|where is my|mon dossier|ma demande|dosiye yanjye|status|statut/)) {
    if (s.context !== "portal") return [...steps, ...chunks(T(lang, { en: "For your privacy I can only check applications when you're signed in.", fr: "Par confidentialité, je ne peux vérifier vos demandes qu'une fois connecté.", rw: "Kubw'ibanga, nshobora kureba ubusabe bwawe ari uko winjiye." })), card({ kind: "sign_in_to_track" }), done("answered")];
    const asked = text.match(/HBZ-[A-Z0-9-]+/i)?.[0]?.toUpperCase();
    const mine = CASES.filter((c) => c.clientId === "cl-aline");
    if (asked && !mine.some((c) => c.ref.toUpperCase() === asked)) return [...steps, card({ kind: "case_not_found" }), done("answered")];
    const list = (asked ? mine.filter((c) => c.ref.toUpperCase() === asked) : mine).slice(0, 4);
    return [...steps, ...chunks(T(lang, { en: "Here are your applications:", fr: "Voici vos demandes :", rw: "Dore ubusabe bwawe:" })),
      card({ kind: "case_status", cases: list.map((c) => ({ ref: c.ref, service: svc(c.service)?.name ?? c.service, status: c.status, nextStep: c.status === "awaiting_client_documents" ? "Upload the missing document" : "Your agent is working on it", href: `/${lang}/requests/${c.ref}` })) }), done("answered")];
  }
  if (has(text, /visa|residence permit|titre de sejour/)) {
    s.lowConf++;
    const out: Step[] = [...steps, notice("no_source"), ...chunks(T(lang, { en: "I don't have confirmed information on investor visas yet, so I won't guess. An adviser can help.", fr: "Je n'ai pas d'information confirmée sur les visas investisseurs, je préfère ne pas deviner. Un conseiller peut vous aider.", rw: "Nta makuru yemejwe mfite kuri visa z'abashoramari. Umujyanama yagufasha." })), card(slotsCard(lang))];
    if (s.lowConf >= 2) out.push({ event: "handoff", data: handoffData(s, "low_confidence", hoursClosed) });
    return [...out, done("no_source")];
  }
  if (has(text, /upload|attach|passport|passeport|pasiporo|send (you )?(my )?doc|envoyer.*doc/)) {
    return [...steps, card({ kind: "secure_upload", draftId: null, href: `/${lang}/apply/company-registration?step=documents` }), done("answered")];
  }
  if (has(text, /\bbook|reserv|gahunda|consultation|rendez|meeting|inama/)) {
    return [...steps, ...chunks(T(lang, { en: "Here are the next times with an expert:", fr: "Voici les prochains créneaux avec un expert :", rw: "Dore amasaha ari imbere n'impuguke:" })), card(slotsCard(lang)), done("answered")];
  }
  if (has(text, /\b(apply|start the request|commencer la demande|tangira ubusabe|i want to register|je veux creer)\b/)) {
    s.intake = { slug: "company-registration", step: 0, answers: {}, unsure: 0 };
    return [...steps, ...chunks(T(lang, { en: "Let's prepare your company registration. Four quick questions:", fr: "Préparons votre immatriculation. Quatre questions rapides :", rw: "Reka dutegure kwandikisha sosiyete yawe. Ibibazo bine:" })), card(intakeCard(s)), done("awaiting_input")];
  }
  if (has(text, /document|requirement|pieces|ibyangombwa|what do i need|need to bring/)) {
    return [...steps, card({ kind: "requirements", slug: "company-registration", name: svc("company-registration").name, serviceHref: `/${lang}/services/company-registration`,
      items: [{ label: "Passport or ID copy", required: true }, { label: "Business plan", required: false }, { label: "Registered office address", required: true }] }),
      { event: "citation", data: cite("register-company", "How to register a company with RDB", lang) }, done("answered")];
  }
  if (has(text, /vat|tva|umusoro|cost|price|prix|fee|frais|igiciro|combien|angahe/)) {
    const v = svc("vat-declaration");
    const out: Step[] = [...steps, ...chunks(T(lang, { en: "VAT is a tax on goods and services. To use our VAT declaration service you register with RRA, keep your invoices, and we file for you. The fee is in the card below.", fr: "La TVA est une taxe sur les biens et services. Vous vous inscrivez à la RRA, gardez vos factures et nous déclarons pour vous. Le tarif figure dans la carte ci-dessous.", rw: "Iyo ni umusoro ku byongerewe agaciro (VAT). Ukoresha iyi serivisi: wiyandikishije kuri RRA, ubika inyemezabuguzi, natwe tukakumenyekanishiriza. Igiciro kiri hasi." })),
      card({ kind: "fee", slug: v.slug, name: v.name, fee: { min: v.fee ?? 0, max: null, asOf: ASOF, indicative: true } }), { event: "citation", data: cite("vat-declaration", "VAT declaration", lang, lang === "rw" ? "rw" : "en") }];
    if (lang !== "en") out.push(notice("source_in_english"));
    return [...out, done("answered")];
  }
  if (has(text, /clearance|quitus|icyemezo cy'imisoro/)) {
    return [...steps, ...chunks(T(lang, { en: "A tax clearance certificate confirms your taxes are up to date. RRA issues it once all declarations are filed and paid.", fr: "Le certificat de quitus fiscal confirme que vos impôts sont à jour.", rw: "Icyemezo cy'imisoro kigaragaza ko imisoro yawe yishyuwe neza." })),
      { event: "citation", data: cite("tax-clearance", "Tax clearance certificate", lang) }, card(serviceCard("tax-clearance-certificate", lang)), done("answered")];
  }
  if (has(text, /compan|societe|sosiyete|register|creer|kwandikisha|business|entreprise/)) {
    return [...steps, ...chunks(T(lang, {
      en: "Here are the main steps:\n1. Choose a legal form\n2. Prepare the documents\n3. Submit the application to RDB\n\nAs a foreign investor you can own 100 % of a Rwandan company.",
      fr: "Voici les étapes principales :\n1. Choisir une forme juridique\n2. Préparer les documents\n3. Soumettre la demande à RDB\n\nEn tant qu'investisseur étranger, vous pouvez détenir 100 % d'une société rwandaise.",
      rw: "Dore intambwe z'ingenzi:\n1. Hitamo ubwoko bwa sosiyete\n2. Tegura ibyangombwa\n3. Ohereza ubusabe kuri RDB\n\nUmunyamahanga ashobora gutunga sosiyete 100 %.",
    })), { event: "citation", data: cite("register-company", "How to register a company with RDB", lang) }, card(serviceCard("company-registration", lang)), done("answered")];
  }
  s.lowConf++;
  const out: Step[] = [...steps, notice("no_source"), ...chunks(T(lang, { en: "I don't have confirmed information on that. I can book you a consultation or connect you to a person.", fr: "Je n'ai pas d'information confirmée à ce sujet. Je peux vous réserver une consultation ou vous mettre en relation avec une personne.", rw: "Nta makuru yemejwe mfite kuri ibyo. Nshobora kugufatira gahunda cyangwa kuguhuza n'umuntu." }))];
  if (s.lowConf >= 2) out.push({ event: "handoff", data: handoffData(s, "low_confidence", hoursClosed) });
  return [...out, done("no_source")];
}

export function intakeCard(s: Session): ToolCard {
  const q = INTAKE[s.intake!.slug][s.intake!.step];
  return { kind: "intake_question", toolCallId: `${s.id}:${s.intake!.step}`, step: s.intake!.step + 1, total: INTAKE[s.intake!.slug].length,
    field: { id: q.id, label: q.label[s.lang], type: q.type, options: q.options, required: true, help: q.help?.[s.lang] } };
}
/** One intake answer → next question, draft, or handoff after 3 "not sure". Returns null when invalid (422). */
export function answerIntake(s: Session, value: unknown, hoursClosed: boolean): Step[] | null {
  const it = s.intake;
  if (!it) return [];
  const q = INTAKE[it.slug][it.step];
  if (value === "__unsure__") {
    it.unsure++;
    if (it.unsure >= 3) { s.intake = null; return [{ event: "handoff", data: handoffData(s, "clarification_failed", hoursClosed) }, { event: "done", data: { outcome: "handed_off" } }]; }
    it.answers[q.id] = "Not sure";
  } else {
    const v = String(value ?? "").trim();
    if (!v || (q.type === "number" && !(+v >= 1 && +v <= 50))) return null;
    it.answers[q.id] = v;
  }
  it.step++;
  if (it.step < INTAKE[it.slug].length) return [card(intakeCard(s)), { event: "done", data: { outcome: "awaiting_input" } }];
  const draftId = id("dr");
  const expiresAt = iso(Date.now() + 30 * D);
  DRAFTS.set(draftId, { serviceSlug: it.slug, answers: it.answers, status: "ai_draft", expiresAt, structureVersion: 1 });
  s.intake = null;
  const lang = s.lang;
  return [...chunks(T(lang, { en: "Your draft is ready. Nothing is submitted until you review it.", fr: "Votre brouillon est prêt. Rien n'est envoyé avant votre vérification.", rw: "Umushinga w'ubusabe witeguye. Nta kintu cyoherezwa utabanje kugenzura." })),
    card({ kind: "draft", draftId, serviceSlug: it.slug, serviceName: svc(it.slug).name, answeredCount: Object.keys(it.answers).length, missingDocs: DOCS[it.slug] ?? [], expiresAt,
      reviewHref: `/${lang}/apply/${it.slug}?draft=${draftId}&step=review`, docsHref: `/${lang}/apply/${it.slug}?draft=${draftId}&step=documents` }),
    { event: "done", data: { outcome: "draft_created" } }];
}

// ---------------------------------------------------------------- Staff side
const day = (n: number) => iso(NOW - n * D);
export const KB: KbSource[] = [
  { id: "kb-1", title: "How to register a company with RDB", kind: "guide", locale: "en", status: "indexed", owner: "Grace Mutesi", factsBy: "Diane Mukamana", toneBy: "Grace Mutesi", reviewBy: dayOf(NOW + 150 * D), lastIndexedAt: day(10), updatedAt: day(10), version: 3,
    body: "1. Choose a legal form (Ltd, public, branch).\n2. Prepare passport/ID copies and a registered office address.\n3. Submit on the RDB portal. RDB usually decides within 6 working hours.\n\nForeign investors may own 100 % of a company.", previous: "1. Choose a legal form.\n2. Prepare documents.\n3. Submit at RDB offices.", flags: [] },
  { id: "kb-2", title: "Certificat d'investissement — FAQ", kind: "faq", locale: "fr", status: "approved_for_ai", owner: "Grace Mutesi", factsBy: "Diane Mukamana", toneBy: null, reviewBy: dayOf(NOW + 170 * D), lastIndexedAt: null, updatedAt: day(2), version: 1,
    body: "Le certificat d'investissement est délivré par RDB aux investisseurs remplissant le seuil d'investissement.", previous: null, flags: [] },
  { id: "kb-3", title: "Amategeko y'imisoro 2026", kind: "guide", locale: "rw", status: "draft", owner: "Grace Mutesi", factsBy: null, toneBy: null, reviewBy: dayOf(NOW + 180 * D), lastIndexedAt: null, updatedAt: day(1), version: 1,
    body: "Umusoro ku nyungu ni 30 %. Tuguha icyizere ko dosiye yawe izemerwa mu minsi 3.", previous: null,
    flags: [{ text: "Tuguha icyizere ko dosiye yawe izemerwa mu minsi 3", why: "guarantee" }, { text: "Umusoro ku nyungu ni 30 %", why: "unsourced_fee" }] },
  { id: "kb-4", title: "VAT declaration", kind: "catalogue", locale: "en", status: "indexed", owner: "Diane Mukamana", factsBy: "Diane Mukamana", toneBy: "Grace Mutesi", reviewBy: dayOf(NOW + 90 * D), lastIndexedAt: day(11), updatedAt: day(11), version: 2,
    body: "Monthly or quarterly VAT declaration filed with RRA by the 15th. HEBUZA fee from RWF 15,000 (indicative).", previous: null, flags: [] },
  { id: "kb-5", title: "PAYE rates 2025", kind: "policy", locale: "en", status: "stale", owner: "Diane Mukamana", factsBy: "Diane Mukamana", toneBy: "Grace Mutesi", reviewBy: dayOf(NOW - 20 * D), lastIndexedAt: day(200), updatedAt: day(200), version: 1,
    body: "PAYE bands for 2025…", previous: null, flags: [{ text: "PAYE bands for 2025", why: "outdated" }] },
  { id: "kb-6", title: "Expert consultation (60 min)", kind: "consultation_type", locale: "en", status: "indexed", owner: "Diane Mukamana", factsBy: "Diane Mukamana", toneBy: "Grace Mutesi", reviewBy: dayOf(NOW + 120 * D), lastIndexedAt: day(5), updatedAt: day(5), version: 1,
    body: "60-minute paid consultation with a specialist. Price confirmed on invoice.", previous: null, flags: [] },
];
export const REINDEX = new Map<string, { started: number; ids: string[] }>();

const OUT: AiSessionRow["outcome"][] = ["answered", "answered", "handed_off", "no_source", "answered", "abandoned", "answered", "blocked"];
const TITLES = ["Comment créer une société au Rwanda ?", "Umusoro wa VAT ni iki?", "What documents do I need?", "Visa for investors", "Tax clearance certificate", "Where is my application?", "Guarantee my loan", "PAYE rates 2027"];
export const AI_SESSIONS: AiSessionRow[] = Array.from({ length: 20 }, (_, i) => ({
  id: `as-${1000 + i}`, startedAt: iso(NOW - i * 5.3 * 3_600_000), lang: (["fr", "rw", "en"] as Locale[])[i % 3], outcome: OUT[i % OUT.length], rating: i % 4 === 0 ? 1 : i % 7 === 0 ? -1 : null,
  handoff: OUT[i % OUT.length] === "handed_off", turns: 2 + (i % 6), context: i % 5 === 0 ? "portal" : "public", title: TITLES[i % TITLES.length],
}));
export function transcript(sid: string): AiTranscript | null {
  const row = AI_SESSIONS.find((s) => s.id === sid);
  if (!row) return null;
  return { ...row, meta: { model: "answer-tier (server-routed)", tokensIn: 2140, tokensOut: 388, costUsd: 0.012, latencyMs: 1830 },
    messages: [
      { role: "user", text: row.title },
      { role: "tool", text: "search_services(query) → company-registration", sources: ["How to register a company with RDB"] },
      { role: "assistant", text: "Here are the main steps: 1. Choose a legal form 2. Prepare the documents 3. Submit to RDB.", sources: ["How to register a company with RDB · v3"], flags: row.outcome === "blocked" ? ["abuse"] : [] },
      { role: "user", text: "My ID is ••••••••••••7890, can you check?" },
      { role: "assistant", text: "Please don't share ID numbers here. Use the secure form.", flags: ["pii_masked"] },
    ] };
}
export const CLUSTERS: Cluster[] = [
  { id: "cl1", label: "Visa for investors", count: 23, lang: "en", sample: ["Do I need a visa to invest?", "Visa investisseur Rwanda", "Investor residence permit"] },
  { id: "cl2", label: "PAYE rates 2027", count: 11, lang: "en", sample: ["PAYE 2027 bands", "New PAYE rates?"] },
  { id: "cl3", label: "Business plan format", count: 8, lang: "fr", sample: ["Format du business plan", "Modèle de plan d'affaires"] },
];
export const EVALS: EvalRun[] = [
  { id: "ev-12", at: day(1), trigger: "Prompt update v14", passed: 146, total: 150, prohibited: 0, deployBlocked: false },
  { id: "ev-11", at: day(8), trigger: "KB reindex", passed: 141, total: 150, prohibited: 2, deployBlocked: true },
  { id: "ev-10", at: day(15), trigger: "Weekly", passed: 145, total: 150, prohibited: 0, deployBlocked: false },
];
// conversationId points at the ops console threads (handlers-ops-d mkConv ids) so /ops/conversations/[id] resolves.
export const HANDOFFS: HandoffItem[] = [
  { id: "ho-1", conversationId: `ocv-${CASES[0].ref}`, at: iso(NOW - 25 * 60_000), reason: "user_request", lang: "fr", summary: "Foreign investor (Belgium) wants to register a Ltd and asks about bank account opening. Asked for a person after fees answer.", sessionId: "as-1000", claimedBy: null, who: "Visitor (lead)" },
  { id: "ho-2", conversationId: `ocv-${CASES[2].ref}`, at: iso(NOW - 3 * 3_600_000), reason: "money_owed", lang: "rw", summary: "Client says they were charged twice for a VAT filing. Needs finance check.", sessionId: "as-1002", claimedBy: "Diane Mukamana", who: "Aline Uwase" },
];
export const copilot = (kind: "summary" | "draft" | "completeness" | "queue", caseCode: string, lang: Locale) => {
  const at = new Date().toISOString();
  if (kind === "summary") return { text: `Case ${caseCode}: the client wants the work finished before month end. Documents received: passport, office lease. Waiting on: signed shareholder resolution. Last client message 2 days ago asked about timing.`, generatedAt: at, sources: ["Case timeline", "Messages"] };
  if (kind === "draft") return { text: lang === "fr" ? "Bonjour, merci pour votre message. Il nous manque encore la résolution des actionnaires signée. Dès réception, nous soumettons votre dossier à RDB." : lang === "rw" ? "Muraho, murakoze ku butumwa. Turacyategereje umwanzuro w'abanyamigabane wasinywe. Nitubona, turahita twohereza dosiye kuri RDB." : "Hello, thanks for your message. We're still waiting for the signed shareholder resolution. As soon as we have it we'll submit your file to RDB.", generatedAt: at };
  if (kind === "completeness") return { text: "2 of 3 required documents are in.", items: [{ label: "Passport copy", ok: true }, { label: "Office lease", ok: true }, { label: "Signed shareholder resolution", ok: false }], generatedAt: at };
  return { text: "12 open cases today: 3 breach SLA within 24 h (2 VAT, 1 trademark), 4 wait on clients for more than 3 days, Grace is on leave Thursday with 1 consultation to move. Suggest: reassign HBZ cases on Grace's queue and chase the 4 waiting clients.", generatedAt: at };
};
