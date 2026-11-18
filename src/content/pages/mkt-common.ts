// Shared Marketing copy (Stage 10): shell, atoms, states. Lane copy lives in mkt-<lane>.ts (lane-owned).
// rw/fr are first drafts for native review (PLACEHOLDER(rw-translation)). Never show feature IDs (F-…) in UI.
import type { Locale } from "@/shared/i18n/config";

const en = {
  nav: { more: "More", home: "Home", leads: "Leads", inbox: "Inbox", campaigns: "Campaigns" },
  shell: {
    notifications: "Marketing notifications", markAll: "Mark all read", empty: "You're all caught up.",
    actions: "Actions", newCampaign: "New campaign", newGuide: "New guide", newLanding: "New landing page", newLead: "New lead", newPage: "New page",
    goLeads: "Go to leads", goContent: "Go to content", goReports: "Go to reports", findLead: "Open lead", findCampaign: "Open campaign",
    offline: "You're offline. Edits are kept on this device; sending, publishing and approvals are off until you reconnect.",
    readOnly: "You can review and approve here. Editing stays with the marketing team.",
    language: "Language", nextScheduled: "Next scheduled",
  },
  shortcuts: { goLeads: "Go to leads", goContent: "Go to content", goCampaigns: "Go to campaigns", help: "Keyboard shortcuts" },
  locale: { rw: "Kinyarwanda", en: "English", fr: "Français", ok: "ready", missing: "missing", outdated: "outdated", needs_review: "needs review" },
  workflow: { draft: "Draft", in_review: "In review", approved: "Approved", scheduled: "Scheduled", published: "Published", stale: "Stale", archived: "Archived", scheduledFor: "Scheduled {d}" } as Record<string, string>,
  consent: { in: "opted in", out: "opted out", unknown: "no consent", email: "Email", whatsapp: "WhatsApp", sms: "SMS" } as Record<string, string>,
  stage: { new: "New", contacted: "Contacted", qualified: "Qualified", quote_sent: "Quote sent", won: "Won", lost: "Lost", merged: "Merged" } as Record<string, string>,
  campaign: { draft: "Draft", pending_approval: "Awaiting approval", approved: "Approved", scheduled: "Scheduled", sending: "Sending", sent: "Sent", paused: "Paused", cancelled: "Cancelled", failed: "Failed" } as Record<string, string>,
  template: { draft: "Draft", pending_provider_approval: "Waiting for Meta", active: "Active", rejected: "Rejected", retired: "Retired" } as Record<string, string>,
  channel: { email: "Email", whatsapp: "WhatsApp", sms: "SMS", web: "Web form", call: "Call", event: "Event" } as Record<string, string>,
  kb: { indexed: "AI ready", pending: "Indexing", not_approved: "Not for AI", stale: "Out of AI (stale)" } as Record<string, string>,
  step: { waiting: "Waiting", executed: "Done", skipped: "Skipped", cancelled: "Cancelled", deferred: "Deferred" } as Record<string, string>,
  source: { facebook: "Facebook", google: "Google", whatsapp: "WhatsApp", referral: "Referral", organic: "Organic search", direct: "Direct", newsletter: "Newsletter", email: "Email" } as Record<string, string>,
  counter: { of: "{n} / {max}", over: "{n} over the limit", near: "Close to the limit" },
  cost: { estimate: "Estimated cost", per: "{amount} each", warn: "Close to the monthly budget", block: "Over the monthly budget" },
  noAccess: { title: "No access to Marketing", body: "This area is for the marketing team. Service managers can open content waiting for their review; executives can open campaigns and reports.", home: "Go to my workspace" },
  states: { loading: "Loading…", error: "Couldn't load this.", retry: "Try again", empty: "Nothing here yet.", filteredEmpty: "Nothing matches these filters.", clear: "Clear filters", updated: "Updated {t}", refresh: "Refresh", partial: "Some figures are unavailable right now." },
  common: { save: "Save", cancel: "Cancel", close: "Close", confirm: "Confirm", edit: "Edit", delete: "Delete", add: "Add", back: "Back", next: "Next", search: "Search", all: "All", undo: "Undo", copy: "Copy", copied: "Copied", view: "View", open: "Open", none: "None", reason: "Reason", optional: "optional", showTable: "Show as table", showChart: "Show as chart", demo: "Demo data" },
};
type Copy = typeof en;

const fr: Copy = {
  nav: { more: "Plus", home: "Accueil", leads: "Prospects", inbox: "Messages", campaigns: "Campagnes" },
  shell: {
    notifications: "Notifications marketing", markAll: "Tout marquer comme lu", empty: "Vous êtes à jour.",
    actions: "Actions", newCampaign: "Nouvelle campagne", newGuide: "Nouveau guide", newLanding: "Nouvelle page d'atterrissage", newLead: "Nouveau prospect", newPage: "Nouvelle page",
    goLeads: "Aller aux prospects", goContent: "Aller au contenu", goReports: "Aller aux rapports", findLead: "Ouvrir le prospect", findCampaign: "Ouvrir la campagne",
    offline: "Vous êtes hors ligne. Les modifications restent sur cet appareil ; envois, publications et validations sont désactivés.",
    readOnly: "Vous pouvez relire et valider ici. L'édition reste à l'équipe marketing.",
    language: "Langue", nextScheduled: "Prochain envoi",
  },
  shortcuts: { goLeads: "Aller aux prospects", goContent: "Aller au contenu", goCampaigns: "Aller aux campagnes", help: "Raccourcis clavier" },
  locale: { rw: "Kinyarwanda", en: "English", fr: "Français", ok: "prêt", missing: "manquant", outdated: "obsolète", needs_review: "à relire" },
  workflow: { draft: "Brouillon", in_review: "En relecture", approved: "Approuvé", scheduled: "Programmé", published: "Publié", stale: "À revoir", archived: "Archivé", scheduledFor: "Programmé {d}" },
  consent: { in: "accepte", out: "refuse", unknown: "sans consentement", email: "E-mail", whatsapp: "WhatsApp", sms: "SMS" },
  stage: { new: "Nouveau", contacted: "Contacté", qualified: "Qualifié", quote_sent: "Devis envoyé", won: "Gagné", lost: "Perdu", merged: "Fusionné" },
  campaign: { draft: "Brouillon", pending_approval: "En attente de validation", approved: "Validée", scheduled: "Programmée", sending: "En cours d'envoi", sent: "Envoyée", paused: "En pause", cancelled: "Annulée", failed: "Échec" },
  template: { draft: "Brouillon", pending_provider_approval: "En attente de Meta", active: "Actif", rejected: "Refusé", retired: "Retiré" },
  channel: { email: "E-mail", whatsapp: "WhatsApp", sms: "SMS", web: "Formulaire web", call: "Appel", event: "Événement" },
  kb: { indexed: "Prêt pour l'IA", pending: "Indexation", not_approved: "Hors IA", stale: "Retiré de l'IA (à revoir)" },
  step: { waiting: "En attente", executed: "Fait", skipped: "Ignoré", cancelled: "Annulé", deferred: "Reporté" },
  source: { facebook: "Facebook", google: "Google", whatsapp: "WhatsApp", referral: "Parrainage", organic: "Recherche naturelle", direct: "Direct", newsletter: "Newsletter", email: "E-mail" },
  counter: { of: "{n} / {max}", over: "{n} au-delà de la limite", near: "Proche de la limite" },
  cost: { estimate: "Coût estimé", per: "{amount} l'unité", warn: "Proche du budget mensuel", block: "Au-delà du budget mensuel" },
  noAccess: { title: "Pas d'accès au Marketing", body: "Cet espace est réservé à l'équipe marketing. Les responsables de service ouvrent le contenu à relire ; la direction ouvre campagnes et rapports.", home: "Aller à mon espace" },
  states: { loading: "Chargement…", error: "Impossible de charger.", retry: "Réessayer", empty: "Rien pour l'instant.", filteredEmpty: "Aucun résultat pour ces filtres.", clear: "Effacer les filtres", updated: "Mis à jour {t}", refresh: "Actualiser", partial: "Certains chiffres sont indisponibles pour le moment." },
  common: { save: "Enregistrer", cancel: "Annuler", close: "Fermer", confirm: "Confirmer", edit: "Modifier", delete: "Supprimer", add: "Ajouter", back: "Retour", next: "Suivant", search: "Rechercher", all: "Tous", undo: "Annuler", copy: "Copier", copied: "Copié", view: "Voir", open: "Ouvrir", none: "Aucun", reason: "Motif", optional: "facultatif", showTable: "Afficher en tableau", showChart: "Afficher en graphique", demo: "Données de démonstration" },
};

const rw: Copy = {
  nav: { more: "Ibindi", home: "Ahabanza", leads: "Abashobora kuba abakiriya", inbox: "Ubutumwa", campaigns: "Ubukangurambaga" },
  shell: {
    notifications: "Amatangazo y'ubucuruzi", markAll: "Byose byasomwe", empty: "Nta kintu gishya.",
    actions: "Ibikorwa", newCampaign: "Ubukangurambaga bushya", newGuide: "Ubuyobozi bushya", newLanding: "Ipaji nshya y'ubukangurambaga", newLead: "Ushobora kuba umukiriya mushya", newPage: "Ipaji nshya",
    goLeads: "Jya ku bashobora kuba abakiriya", goContent: "Jya ku nyandiko", goReports: "Jya ku za raporo", findLead: "Fungura", findCampaign: "Fungura ubukangurambaga",
    offline: "Nta murandasi. Impinduka zibikwa kuri iki gikoresho; kohereza, gutangaza no kwemeza birahagaze.",
    readOnly: "Hano ushobora gusuzuma no kwemeza. Guhindura bikorwa n'itsinda ry'ubucuruzi.",
    language: "Ururimi", nextScheduled: "Igikurikira giteganyijwe",
  },
  shortcuts: { goLeads: "Jya ku bashobora kuba abakiriya", goContent: "Jya ku nyandiko", goCampaigns: "Jya ku bukangurambaga", help: "Utubuto twihuse" },
  locale: { rw: "Kinyarwanda", en: "English", fr: "Français", ok: "biteguye", missing: "ntibihari", outdated: "byashaje", needs_review: "bikeneye gusuzumwa" },
  workflow: { draft: "Umushinga", in_review: "Birasuzumwa", approved: "Byemejwe", scheduled: "Biteganyijwe", published: "Byatangajwe", stale: "Bikeneye kuvugururwa", archived: "Byabitswe", scheduledFor: "Biteganyijwe {d}" },
  consent: { in: "yemeye", out: "yanze", unknown: "nta ruhushya", email: "Imeyili", whatsapp: "WhatsApp", sms: "SMS" },
  stage: { new: "Gishya", contacted: "Yavuganywe", qualified: "Yujuje ibisabwa", quote_sent: "Igiciro cyoherejwe", won: "Yabaye umukiriya", lost: "Yatakaye", merged: "Yahujwe" },
  campaign: { draft: "Umushinga", pending_approval: "Bitegereje kwemezwa", approved: "Byemejwe", scheduled: "Biteganyijwe", sending: "Biroherezwa", sent: "Byoherejwe", paused: "Byahagaritswe", cancelled: "Byahagaritswe burundu", failed: "Byanze" },
  template: { draft: "Umushinga", pending_provider_approval: "Bitegereje Meta", active: "Birakora", rejected: "Byanzwe", retired: "Byavanywemo" },
  channel: { email: "Imeyili", whatsapp: "WhatsApp", sms: "SMS", web: "Ifishi yo ku rubuga", call: "Guhamagara", event: "Igikorwa" },
  kb: { indexed: "Byiteguye kuri AI", pending: "Birimo kwinjizwa", not_approved: "Si ibya AI", stale: "Byavanywe muri AI" },
  step: { waiting: "Bitegereje", executed: "Byakozwe", skipped: "Byasimbutswe", cancelled: "Byahagaritswe", deferred: "Byimuriwe" },
  source: { facebook: "Facebook", google: "Google", whatsapp: "WhatsApp", referral: "Uwamutumye", organic: "Ishakiro", direct: "Mu buryo butaziguye", newsletter: "Ibaruwa y'amakuru", email: "Imeyili" },
  counter: { of: "{n} / {max}", over: "{n} birenze", near: "Hafi y'imbibi" },
  cost: { estimate: "Igiciro giteganyijwe", per: "{amount} kuri buri umwe", warn: "Hafi y'ingengo y'imari y'ukwezi", block: "Birenze ingengo y'imari y'ukwezi" },
  noAccess: { title: "Nta burenganzira ku Bucuruzi", body: "Iki gice ni icy'itsinda ry'ubucuruzi. Abayobozi ba serivisi bafungura inyandiko zitegereje isuzuma; ubuyobozi bufungura ubukangurambaga na raporo.", home: "Jya ku mwanya wanjye" },
  states: { loading: "Biratangira…", error: "Ntibyashobotse.", retry: "Ongera ugerageze", empty: "Nta kintu kirahari.", filteredEmpty: "Nta kihuye n'ibyo wahisemo.", clear: "Siba ibyo wahisemo", updated: "Byavuguruwe {t}", refresh: "Vugurura", partial: "Imibare imwe ntiboneka ubu." },
  common: { save: "Bika", cancel: "Reka", close: "Funga", confirm: "Emeza", edit: "Hindura", delete: "Siba", add: "Ongeraho", back: "Subira inyuma", next: "Komeza", search: "Shakisha", all: "Byose", undo: "Subiza", copy: "Kopa", copied: "Byakopwe", view: "Reba", open: "Fungura", none: "Nta na kimwe", reason: "Impamvu", optional: "si ngombwa", showTable: "Erekana nk'imbonerahamwe", showChart: "Erekana nk'igishushanyo", demo: "Amakuru y'icyitegererezo" },
};

const ALL: Record<Locale, Copy> = { en, rw, fr };
export const mktCommon = (l: Locale): Copy => ALL[l] ?? en;
export type MktCommon = Copy;
export { fill } from "./agent-common";
