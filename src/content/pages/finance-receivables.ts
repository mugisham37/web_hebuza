// Lane D copy: U11 receivables & ageing, client drawer, reminder composer. rw/fr are drafts for native review.
import type { Locale } from "@/shared/i18n/config";

const en = {
  title: "Receivables & ageing",
  sub: "Who owes what, for how long, and a polite nudge when it's time.",
  asOf: "As of {t}",
  tiles: { total: "Total receivable", overdue: "Overdue (31+ days)", due0_30: "1–30 days overdue", over90: "90+ days", clients: "{n} clients" },
  ageing: "Ageing buckets",
  clients: "Clients by outstanding",
  search: "Search clients…",
  cols: { client: "Client", outstanding: "Outstanding", oldest: "Oldest", credit: "Credit", reminder: "Last reminder", promise: "Promise to pay" },
  days: "{n} d",
  daysLong: "{n} days overdue",
  showing: "Showing {bucket}",
  clear: "Show all",
  empty: ["Nothing outstanding", "Every issued invoice is paid. New balances appear here as invoices go out."],
  emptyBucket: ["No client in {bucket}", "Pick another bucket or show all."],
  emptySearch: ["No client matches “{q}”", "Try another name."],
  what: "receivables",
  clientWhat: "this client",
  drawer: {
    tabs: { overview: "Overview", invoices: "Invoices", payments: "Payments", credits: "Credits", notes: "Notes" },
    outstanding: "Outstanding", oldest: "Days overdue", lastInvoice: "Last invoice", credit: "Credit on account", contact: "Contact",
    consent: "Can contact by", lang: "Language", remind: "Send reminder", noPayments: "No payments yet.", noCredits: "No credit notes.",
    noInvoices: "No invoices.", reminders: "{n} reminders", noReminder: "Never reminded",
  },
  inv: { no: "Invoice", issued: "Issued", due: "Due", total: "Total", balance: "Balance", status: "Status", age: "Ageing", remind: "Remind" },
  pay: { ref: "Reference", method: "Method", amount: "Amount", state: "State", at: "Date" },
  notes: {
    add: "Add note", text: "Note", promise: "Promise to pay on", promiseHint: "Optional. Shows in the client list until it passes.",
    save: "Save note", saved: "Note saved", empty: "No notes yet.", promised: "Promised {d}", need: "Write a note first.",
  },
  rem: {
    title: "Send reminder", sub: "{no} · {amount} due {d}", lang: "Message language", template: "Template",
    templates: { standard: "Standard reminder", firm: "Firm reminder", final: "Final notice" },
    channel: "Channel", channels: { email: "Email", whatsapp: "WhatsApp", sms: "SMS" }, noConsent: "No consent on file",
    message: "Message", chars: "{n}/{max} characters", parts: "{n} SMS", preview: "Preview", via: "Sent via {ch}.",
    quiet: "Quiet hours (21:00–07:00 Kigali): it will be queued and sent at 07:00.",
    send: "Send reminder", sent: "Reminder sent to {client}", queued: "Reminder queued for 07:00", history: "Reminder history",
    never: "No reminders yet", by: "{who} · {ch}", tooLong: "Too long for 2 SMS.", needText: "Write the message.", noConsentErr: "This client hasn't agreed to that channel.",
  },
  phone: { overdue: "{pct} overdue", over90: "{n} clients over 90 days" },
  offline: "You're offline, reminders are disabled until you reconnect.",
};
type Copy = typeof en;

const rw: Copy = {
  title: "Amadeni n'igihe amaze",
  sub: "Ni nde ufitiye iki, kuva ryari, n'ubutumwa bwiyubashye iyo igihe kigeze.",
  asOf: "Kugeza {t}",
  tiles: { total: "Amadeni yose", overdue: "Yarengeje igihe (iminsi 31+)", due0_30: "Iminsi 1–30 yarenze", over90: "Iminsi 90+", clients: "Abakiriya {n}" },
  ageing: "Ibyiciro by'igihe",
  clients: "Abakiriya ukurikije ideni",
  search: "Shaka abakiriya…",
  cols: { client: "Umukiriya", outstanding: "Ideni", oldest: "Irya kera", credit: "Inguzanyo", reminder: "Iheruka kwibutswa", promise: "Isezerano ryo kwishyura" },
  days: "Iminsi {n}",
  daysLong: "Iminsi {n} irenze",
  showing: "Hagaragara {bucket}",
  clear: "Erekana byose",
  empty: ["Nta deni rihari", "Inyemezabuguzi zose zarishyuwe. Amadeni mashya azagaragara hano."],
  emptyBucket: ["Nta mukiriya muri {bucket}", "Hitamo ikindi cyiciro cyangwa werekane byose."],
  emptySearch: ["Nta mukiriya uhuye na “{q}”", "Gerageza irindi zina."],
  what: "amadeni",
  clientWhat: "uyu mukiriya",
  drawer: {
    tabs: { overview: "Incamake", invoices: "Inyemezabuguzi", payments: "Ubwishyu", credits: "Inguzanyo", notes: "Ibyitonderwa" },
    outstanding: "Ideni", oldest: "Iminsi yarenze", lastInvoice: "Inyemezabuguzi iheruka", credit: "Inguzanyo kuri konti", contact: "Aho abarizwa",
    consent: "Ashobora kwandikirwa kuri", lang: "Ururimi", remind: "Ohereza kwibutsa", noPayments: "Nta bwishyu buraba.", noCredits: "Nta nyandiko z'inguzanyo.",
    noInvoices: "Nta nyemezabuguzi.", reminders: "Kwibutsa {n}", noReminder: "Ntiyigeze yibutswa",
  },
  inv: { no: "Inyemezabuguzi", issued: "Yatanzwe", due: "Igihe ntarengwa", total: "Igiteranyo", balance: "Asigaye", status: "Uko bihagaze", age: "Igihe", remind: "Ibutsa" },
  pay: { ref: "Nimero", method: "Uburyo", amount: "Amafaranga", state: "Uko bihagaze", at: "Itariki" },
  notes: {
    add: "Ongeraho icyitonderwa", text: "Icyitonderwa", promise: "Yasezeranyije kwishyura ku wa", promiseHint: "Si ngombwa. Kigaragara ku rutonde kugeza itariki irenze.",
    save: "Bika", saved: "Byabitswe", empty: "Nta byitonderwa.", promised: "Yasezeranyije {d}", need: "Banza wandike icyitonderwa.",
  },
  rem: {
    title: "Ohereza kwibutsa", sub: "{no} · {amount} bitegerejwe {d}", lang: "Ururimi rw'ubutumwa", template: "Icyitegererezo",
    templates: { standard: "Kwibutsa bisanzwe", firm: "Kwibutsa gukomeye", final: "Integuza ya nyuma" },
    channel: "Inzira", channels: { email: "Imeyili", whatsapp: "WhatsApp", sms: "SMS" }, noConsent: "Nta ruhushya",
    message: "Ubutumwa", chars: "Inyuguti {n}/{max}", parts: "SMS {n}", preview: "Uko buzagaragara", via: "Bwoherezwa kuri {ch}.",
    quiet: "Amasaha y'ituze (21:00–07:00 i Kigali): buzoherezwa saa 07:00.",
    send: "Ohereza kwibutsa", sent: "Kwibutsa koherejwe kuri {client}", queued: "Kwibutsa kuzoherezwa saa 07:00", history: "Amateka yo kwibutsa",
    never: "Nta kwibutsa kuraba", by: "{who} · {ch}", tooLong: "Birerekire SMS 2.", needText: "Andika ubutumwa.", noConsentErr: "Uyu mukiriya ntiyemeye iyi nzira.",
  },
  phone: { overdue: "{pct} yarengeje igihe", over90: "Abakiriya {n} barengeje iminsi 90" },
  offline: "Nta interineti, kwibutsa birahagaritswe kugeza wongeye kwihuza.",
};

const fr: Copy = {
  title: "Créances et ancienneté",
  sub: "Qui doit quoi, depuis quand, et une relance courtoise au bon moment.",
  asOf: "Au {t}",
  tiles: { total: "Total des créances", overdue: "En retard (31 j et +)", due0_30: "1–30 jours de retard", over90: "90 jours et +", clients: "{n} clients" },
  ageing: "Tranches d'ancienneté",
  clients: "Clients par encours",
  search: "Rechercher des clients…",
  cols: { client: "Client", outstanding: "Encours", oldest: "Plus ancien", credit: "Crédit", reminder: "Dernière relance", promise: "Promesse de paiement" },
  days: "{n} j",
  daysLong: "{n} jours de retard",
  showing: "Affichage : {bucket}",
  clear: "Tout afficher",
  empty: ["Aucune créance", "Toutes les factures émises sont payées. Les nouveaux soldes apparaîtront ici."],
  emptyBucket: ["Aucun client dans {bucket}", "Choisissez une autre tranche ou affichez tout."],
  emptySearch: ["Aucun client ne correspond à « {q} »", "Essayez un autre nom."],
  what: "les créances",
  clientWhat: "ce client",
  drawer: {
    tabs: { overview: "Aperçu", invoices: "Factures", payments: "Paiements", credits: "Avoirs", notes: "Notes" },
    outstanding: "Encours", oldest: "Jours de retard", lastInvoice: "Dernière facture", credit: "Crédit au compte", contact: "Contact",
    consent: "Peut être contacté par", lang: "Langue", remind: "Envoyer une relance", noPayments: "Aucun paiement.", noCredits: "Aucun avoir.",
    noInvoices: "Aucune facture.", reminders: "{n} relances", noReminder: "Jamais relancé",
  },
  inv: { no: "Facture", issued: "Émise", due: "Échéance", total: "Total", balance: "Solde", status: "Statut", age: "Ancienneté", remind: "Relancer" },
  pay: { ref: "Référence", method: "Moyen", amount: "Montant", state: "État", at: "Date" },
  notes: {
    add: "Ajouter une note", text: "Note", promise: "Promesse de paiement le", promiseHint: "Facultatif. Visible dans la liste jusqu'à la date.",
    save: "Enregistrer", saved: "Note enregistrée", empty: "Aucune note.", promised: "Promis le {d}", need: "Rédigez d'abord la note.",
  },
  rem: {
    title: "Envoyer une relance", sub: "{no} · {amount} dû le {d}", lang: "Langue du message", template: "Modèle",
    templates: { standard: "Relance standard", firm: "Relance ferme", final: "Dernier avis" },
    channel: "Canal", channels: { email: "E-mail", whatsapp: "WhatsApp", sms: "SMS" }, noConsent: "Pas de consentement",
    message: "Message", chars: "{n}/{max} caractères", parts: "{n} SMS", preview: "Aperçu", via: "Envoyé par {ch}.",
    quiet: "Heures calmes (21 h–7 h, Kigali) : le message partira à 7 h.",
    send: "Envoyer la relance", sent: "Relance envoyée à {client}", queued: "Relance programmée pour 7 h", history: "Historique des relances",
    never: "Aucune relance", by: "{who} · {ch}", tooLong: "Trop long pour 2 SMS.", needText: "Rédigez le message.", noConsentErr: "Ce client n'a pas accepté ce canal.",
  },
  phone: { overdue: "{pct} en retard", over90: "{n} clients à plus de 90 jours" },
  offline: "Vous êtes hors ligne, les relances sont désactivées jusqu'à la reconnexion.",
};

const ALL: Record<Locale, Copy> = { en, rw, fr };
export const financeReceivables = (l: Locale): Copy => ALL[l] ?? en;
export type ReceivablesCopy = Copy;

/** Message templates by message language (independent of the UI language). Placeholders: {client} {no} {amount} {due}. */
export const REMINDER_TEMPLATES: Record<Locale, Record<"standard" | "firm" | "final", string>> = {
  rw: {
    standard: "Muraho {client}. Murakoze ku bufatanye. Turabibutsa kwishyura inyemezabuguzi {no} ya {amount} yagombaga kwishyurwa ku wa {due}. Murakoze!, HEBUZA",
    firm: "Muraho {client}. Inyemezabuguzi {no} ya {amount} yarengeje igihe kuva ku wa {due}. Turabasaba kwishyura vuba cyangwa kutwandikira., HEBUZA",
    final: "Muraho {client}. Iyi ni integuza ya nyuma ku nyemezabuguzi {no} ya {amount} (yagombaga kwishyurwa ku wa {due}). Mudusubize mu minsi 7., HEBUZA",
  },
  en: {
    standard: "Hello {client}, thank you for working with us. A friendly reminder that invoice {no} for {amount} was due on {due}. Thank you!, HEBUZA",
    firm: "Hello {client}, invoice {no} for {amount} has been overdue since {due}. Please pay soon or reply to arrange a plan., HEBUZA",
    final: "Hello {client}, this is a final notice for invoice {no} for {amount} (due {due}). Please settle or contact us within 7 days., HEBUZA",
  },
  fr: {
    standard: "Bonjour {client}, merci de votre confiance. Petit rappel : la facture {no} de {amount} était due le {due}. Merci !, HEBUZA",
    firm: "Bonjour {client}, la facture {no} de {amount} est en retard depuis le {due}. Merci de régler rapidement ou de nous répondre., HEBUZA",
    final: "Bonjour {client}, dernier avis pour la facture {no} de {amount} (échue le {due}). Merci de régler ou de nous contacter sous 7 jours., HEBUZA",
  },
};
