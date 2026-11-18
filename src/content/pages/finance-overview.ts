// U3 Finance overview copy (board 03 v2). rw/fr are first drafts for native review. No feature IDs in UI.
import type { Locale } from "@/shared/i18n/config";

const en = {
  title: "Finance overview",
  greet: { morning: "Good morning, {name}", afternoon: "Good afternoon, {name}", evening: "Good evening, {name}" },
  sub: "Collections, approvals and cash for {date}.",
  date: "Date",
  today: "Today",
  needsYou: "Needs you",
  needs: { proofs: "{n} transfer proofs", approvals: "{n} approvals", unmatched: "{n} reconciliation mismatches", refunds: "{n} refunds", allocations: "{n} allocations to approve" } as Record<string, string>,
  tiles: {
    collected: "Collected today", pending: "Pending confirmation", unreconciled: "Unreconciled", refunds: "Refunds awaiting action", allocations: "Allocations to approve",
    items: "{n} items", payments: "{n} payments", lines: "{n} lines",
  },
  noImport: "Import a bank statement to see unreconciled lines",
  nextPayout: "Next payout run", projected: "Projected net · {n} agents", noPayout: "No approved allocations yet",
  ageing: "Receivables ageing", current: "{pct}% current", outstanding: "{amount} outstanding",
  payables: "Payables due this week", payablesHint: "Paid through the procurement workflow (coming later).",
  renewals: "Plan renewals", due7: "{n} due in 7 days", pastDue: "{n} past due", openRenewals: "Open plan invoices",
  cash: "Cash position by account", asOf: "As of last import {t}", noCash: "Import a bank statement to see cash.", importCta: "Import statement",
  provider: { mtn: "MTN MoMo", airtel: "Airtel Money", bank: "Bank", card: "Card" } as Record<string, string>,
  cashTotal: "Total",
  queues: "Work queues", queue: "Queue", items: "Items", action: "Action",
  q: {
    proofs: "Transfer proofs to verify", pending_momo: "Mobile money waiting for provider", allocations: "Allocations to approve",
    unmatched: "Reconciliation mismatches", refunds: "Refunds awaiting action", overdue: "Overdue invoices",
  } as Record<string, string>,
  qAction: { proofs: "Review", pending_momo: "Check", allocations: "Approve", unmatched: "Investigate", refunds: "Open", overdue: "Chase" } as Record<string, string>,
  quiet: { title: "All reconciled for yesterday", body: "Nothing is waiting for you. Reports are up to date.", cta: "View reports" },
  exec: { title: "Executive view", body: "Figures are read-only. The steps waiting for your signature are in Approvals.", cta: "Open my approvals" },
  failed: "Overview",
  cashFailed: "Cash position",
  sim: { panel: "Fail the cash panel once" },
};
type Copy = typeof en;

const rw: Copy = {
  title: "Incamake y'imari",
  greet: { morning: "Mwaramutse, {name}", afternoon: "Mwiriwe, {name}", evening: "Muraho, {name}" },
  sub: "Ibyakiriwe, ibyemezo n'amafaranga ku wa {date}.",
  date: "Itariki",
  today: "Uyu munsi",
  needsYou: "Bigutegereje",
  needs: { proofs: "Inyemezabwishyu {n}", approvals: "Ibyemezo {n}", unmatched: "Ibidahuye {n} mu guhuza", refunds: "Gusubiza {n}", allocations: "Igabanya {n} ryo kwemeza" },
  tiles: {
    collected: "Byakiriwe uyu munsi", pending: "Bitegereje kwemezwa", unreconciled: "Bitarahuzwa", refunds: "Gusubiza bitegereje", allocations: "Igabanya ryo kwemeza",
    items: "Ibintu {n}", payments: "Ubwishyu {n}", lines: "Imirongo {n}",
  },
  noImport: "Injiza raporo ya banki urebe imirongo itarahuzwa",
  nextPayout: "Kwishyura gukurikira", projected: "Biteganyijwe · abakozi {n}", noPayout: "Nta gabanya ryemejwe riraboneka",
  ageing: "Imyenda y'abakiriya", current: "{pct}% ntiharenga igihe", outstanding: "{amount} bitarishyurwa",
  payables: "Ibyo kwishyura iki cyumweru", payablesHint: "Byishyurwa binyuze mu buryo bwo kugura (biri imbere).",
  renewals: "Kuvugurura ifatabuguzi", due7: "{n} mu minsi 7", pastDue: "{n} byarengeje igihe", openRenewals: "Fungura fagitire z'ifatabuguzi",
  cash: "Amafaranga kuri buri konti", asOf: "Nk'uko raporo iheruka ibivuga {t}", noCash: "Injiza raporo ya banki urebe amafaranga.", importCta: "Injiza raporo",
  provider: { mtn: "MTN MoMo", airtel: "Airtel Money", bank: "Banki", card: "Ikarita" },
  cashTotal: "Igiteranyo",
  queues: "Imirimo itegereje", queue: "Umurimo", items: "Ibintu", action: "Igikorwa",
  q: {
    proofs: "Inyemezabwishyu zo kugenzura", pending_momo: "Mobile money itegereje utanga serivisi", allocations: "Igabanya ryo kwemeza",
    unmatched: "Ibidahuye mu guhuza", refunds: "Gusubiza bitegereje", overdue: "Fagitire zarengeje igihe",
  },
  qAction: { proofs: "Suzuma", pending_momo: "Genzura", allocations: "Emeza", unmatched: "Kurikirana", refunds: "Fungura", overdue: "Ibutsa" },
  quiet: { title: "Ibya ejo byose byahujwe", body: "Nta kintu kigutegereje. Raporo ziri ku gihe.", cta: "Reba raporo" },
  exec: { title: "Ishusho y'umuyobozi", body: "Imibare ni iyo kureba gusa. Intambwe zigutegereje kuzisinya ziri mu Byemezo.", cta: "Fungura ibyemezo byanjye" },
  failed: "Incamake",
  cashFailed: "Amafaranga kuri konti",
  sim: { panel: "Tera ikosa ku mafaranga rimwe" },
};

const fr: Copy = {
  title: "Vue d'ensemble finance",
  greet: { morning: "Bonjour, {name}", afternoon: "Bon après-midi, {name}", evening: "Bonsoir, {name}" },
  sub: "Encaissements, approbations et trésorerie au {date}.",
  date: "Date",
  today: "Aujourd'hui",
  needsYou: "À traiter",
  needs: { proofs: "{n} preuves de virement", approvals: "{n} approbations", unmatched: "{n} écarts de rapprochement", refunds: "{n} remboursements", allocations: "{n} répartitions à approuver" },
  tiles: {
    collected: "Encaissé aujourd'hui", pending: "En attente de confirmation", unreconciled: "Non rapproché", refunds: "Remboursements en attente", allocations: "Répartitions à approuver",
    items: "{n} éléments", payments: "{n} paiements", lines: "{n} lignes",
  },
  noImport: "Importez un relevé bancaire pour voir les lignes non rapprochées",
  nextPayout: "Prochain versement", projected: "Net prévu · {n} agents", noPayout: "Aucune répartition approuvée",
  ageing: "Balance âgée clients", current: "{pct}% non échu", outstanding: "{amount} en cours",
  payables: "À payer cette semaine", payablesHint: "Réglé via le circuit achats (à venir).",
  renewals: "Renouvellements d'abonnement", due7: "{n} dans 7 jours", pastDue: "{n} en retard", openRenewals: "Ouvrir les factures d'abonnement",
  cash: "Trésorerie par compte", asOf: "Au dernier import {t}", noCash: "Importez un relevé bancaire pour voir la trésorerie.", importCta: "Importer un relevé",
  provider: { mtn: "MTN MoMo", airtel: "Airtel Money", bank: "Banque", card: "Carte" },
  cashTotal: "Total",
  queues: "Files de travail", queue: "File", items: "Éléments", action: "Action",
  q: {
    proofs: "Preuves de virement à vérifier", pending_momo: "Mobile money en attente de l'opérateur", allocations: "Répartitions à approuver",
    unmatched: "Écarts de rapprochement", refunds: "Remboursements en attente", overdue: "Factures en retard",
  },
  qAction: { proofs: "Examiner", pending_momo: "Vérifier", allocations: "Approuver", unmatched: "Analyser", refunds: "Ouvrir", overdue: "Relancer" },
  quiet: { title: "Tout est rapproché pour hier", body: "Rien ne vous attend. Les rapports sont à jour.", cta: "Voir les rapports" },
  exec: { title: "Vue direction", body: "Les chiffres sont en lecture seule. Les étapes à signer sont dans Approbations.", cta: "Ouvrir mes approbations" },
  failed: "Vue d'ensemble",
  cashFailed: "Trésorerie",
  sim: { panel: "Faire échouer la trésorerie une fois" },
};

const ALL: Record<Locale, Copy> = { en, rw, fr };
export const financeOverview = (l: Locale): Copy => ALL[l] ?? en;
