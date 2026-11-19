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
  tabs: { subs: "Subscriptions", plans: "Plans" },
  plans: {
    add: "New plan", edit: "Edit", title: "Plan", name: "Name", interval: "Billing", month: "Monthly", year: "Yearly",
    amount: "Price (RWF, VAT incl.)", cap: "Applications per month (empty = unlimited)", description: "Description",
    features: "Features (one per line)", public: "Listed on /pricing", active: "Active", order: "Sort order", save: "Save plan",
    saved: "Plan saved.", empty: ["No plans yet", "Create the first plan clients can subscribe to."],
    per: { month: "/ month", year: "/ year" } as Record<string, string>, hidden: "hidden", inactive: "inactive", trial: "signup trial",
  },
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
  tabs: { subs: "Abiyandikishije", plans: "Gahunda" },
  plans: {
    add: "Gahunda nshya", edit: "Hindura", title: "Gahunda", name: "Izina", interval: "Kwishyura", month: "Buri kwezi", year: "Buri mwaka",
    amount: "Igiciro (RWF, TVA irimo)", cap: "Ubusabe ku kwezi (ubusa = nta mbibi)", description: "Ibisobanuro",
    features: "Ibyo irimo (kimwe ku murongo)", public: "Igaragara kuri /pricing", active: "Irakora", order: "Urutonde", save: "Bika gahunda",
    saved: "Gahunda yabitswe.", empty: ["Nta gahunda zirahari", "Kora gahunda ya mbere abakiriya bashobora kwiyandikishaho."],
    per: { month: "/ ukwezi", year: "/ umwaka" }, hidden: "ihishe", inactive: "ntikora", trial: "igerageza ryo kwiyandikisha",
  },
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
  tabs: { subs: "Abonnements", plans: "Forfaits" },
  plans: {
    add: "Nouveau forfait", edit: "Modifier", title: "Forfait", name: "Nom", interval: "Facturation", month: "Mensuelle", year: "Annuelle",
    amount: "Prix (RWF, TVA incl.)", cap: "Demandes par mois (vide = illimité)", description: "Description",
    features: "Avantages (un par ligne)", public: "Affiché sur /pricing", active: "Actif", order: "Ordre", save: "Enregistrer",
    saved: "Forfait enregistré.", empty: ["Aucun forfait", "Créez le premier forfait auquel les clients peuvent souscrire."],
    per: { month: "/ mois", year: "/ an" }, hidden: "masqué", inactive: "inactif", trial: "essai à l'inscription",
  },
};
const ALL: Record<Locale, Copy> = { en, rw, fr };
export const financeSubscriptions = (l: Locale): Copy => ALL[l] ?? en;
