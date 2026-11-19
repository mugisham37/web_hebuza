// F-SUB-09 finance subscriptions list + pause. rw/fr are drafts for native review.
import type { Locale } from "@/shared/i18n/config";

const en = {
  title: "Subscriptions",
  sub: "Client plans, renewals and pauses. A pause stops coverage and moves the period end by the same days.",
  cols: { client: "Client", plan: "Plan", amount: "Price", status: "Status", end: "Period end" },
  status: { active: "Active", trial: "Trial", past_due: "Past due", paused: "Paused", cancelled: "Cancelled", expired: "Expired" } as Record<string, string>,
  cancels: "cancels at period end",
  pausedUntil: "until {date}",
  pause: "Pause",
  pauseTitle: "Pause {client}'s plan",
  days: "Days (1–90)",
  confirm: "Pause plan",
  paused: "Plan paused.",
  empty: ["No subscriptions yet", "Client plans appear here once someone subscribes."],
  err: "subscriptions",
  conflict: "Only an active plan can be paused.",
};
type Copy = typeof en;
const rw: Copy = {
  title: "Abiyandikishije",
  sub: "Gahunda z'abakiriya, kongera no guhagarika by'agateganyo. Guhagarika bihagarika kurindwa kandi bikongera iminsi ingana.",
  cols: { client: "Umukiriya", plan: "Gahunda", amount: "Igiciro", status: "Imiterere", end: "Iherezo ry'igihe" },
  status: { active: "Irakora", trial: "Igerageza", past_due: "Yatinze kwishyurwa", paused: "Yahagaritswe", cancelled: "Yahagaritswe burundu", expired: "Yarangiye" },
  cancels: "izahagarara ku iherezo ry'igihe",
  pausedUntil: "kugeza {date}",
  pause: "Hagarika by'agateganyo",
  pauseTitle: "Hagarika gahunda ya {client}",
  days: "Iminsi (1–90)",
  confirm: "Hagarika gahunda",
  paused: "Gahunda yahagaritswe.",
  empty: ["Nta biyandikishije", "Gahunda z'abakiriya zigaragara hano bamaze kwiyandikisha."],
  err: "abiyandikishije",
  conflict: "Gahunda ikora gusa ni yo ishobora guhagarikwa.",
};
const fr: Copy = {
  title: "Abonnements",
  sub: "Forfaits clients, renouvellements et pauses. Une pause suspend la couverture et décale la fin de période d'autant.",
  cols: { client: "Client", plan: "Forfait", amount: "Prix", status: "Statut", end: "Fin de période" },
  status: { active: "Actif", trial: "Essai", past_due: "En retard", paused: "En pause", cancelled: "Résilié", expired: "Expiré" },
  cancels: "résiliation en fin de période",
  pausedUntil: "jusqu'au {date}",
  pause: "Mettre en pause",
  pauseTitle: "Mettre en pause le forfait de {client}",
  days: "Jours (1–90)",
  confirm: "Mettre en pause",
  paused: "Forfait mis en pause.",
  empty: ["Aucun abonnement", "Les forfaits clients apparaissent ici dès la première souscription."],
  err: "abonnements",
  conflict: "Seul un forfait actif peut être mis en pause.",
};
const ALL: Record<Locale, Copy> = { en, rw, fr };
export const financeSubscriptions = (l: Locale): Copy => ALL[l] ?? en;
