// Shared Procurement copy (Stage 12): shell, atoms, molecules, status sets, empty states. Unit copy lives in
// procurement-<lane>.ts (lane-owned). rw/fr are first drafts for native review. Never show feature IDs in UI.
import type { Locale } from "@/shared/i18n/config";

const en = {
  nav: { home: "Home", requests: "Requests", bills: "Bills", contracts: "Contracts", more: "More", payables: "Payables" },
  shell: {
    notifications: "Procurement notifications", markAll: "Mark all read", empty: "You're all caught up.", actions: "Actions",
    newSupplier: "New supplier", newContract: "New contract", recordGrn: "Record goods received", enterBill: "Enter bill", goAgeing: "Go to ageing",
    requestPurchase: "Request a purchase", myRequests: "My purchase requests", findNumber: "Find by number", payables: "Payables queue",
    verifyBank: "Verify bank changes", language: "Language", offline: "You're offline. Money actions are disabled; figures show the last update.",
    bellTabs: { all: "All", contracts: "Contracts", bills: "Bills", requests: "Requests", deposits: "Deposits" },
  },
  status: {
    // PR
    draft: "Draft", submitted: "Submitted", info_requested: "Info requested", approved: "Approved", rejected: "Rejected", withdrawn: "Withdrawn", ordered: "Ordered",
    // PO
    issued: "Sent", partially_received: "Partially received", received: "Received", closed: "Closed", cancelled: "Cancelled",
    // bill
    matched: "Matched", match_exception: "Match exception", authorised: "Authorised", partially_paid: "Partially paid", paid: "Paid", disputed: "Disputed", void: "Void",
    // vendor / bank
    active: "Active", inactive: "Inactive", blocked: "Blocked", verified: "Verified", unverified: "Change pending", requested: "Requested",
    // contract
    expiring: "Expiring", renewed: "Renewed", terminated: "Terminated", expired: "Expired",
    // deposit / advance
    pending_payment: "Awaiting payment", paid_out: "Paid out", held: "Held", return_due: "Return due", returned: "Returned", partially_returned: "Partly returned",
    forfeited: "Forfeited", offset: "Offset", sent: "Sent", failed: "Failed", scheduled: "Scheduled",
    // workforce
    invited: "Invited", onboarding: "Onboarding", cleared: "Cleared", suspended: "Suspended",
  } as Record<string, string>,
  match: { matched: "Matched", tolerance: "Within tolerance", exception: "Match exception", no_po: "No PO", pending: "Not matched yet", contract: "Matched to contract" },
  reasons: { over_limit: "Over RWF 1,000,000", over_budget: "Over budget", quotes_waived: "Quotes waived", no_po: "No PO", match_exception: "Match exception" } as Record<string, string>,
  vendorType: { landlord: "Landlord", supplier: "Supplier", service_provider: "Service provider", government_body: "Government body" },
  kind: { PR: "Purchase request", PO: "Purchase order", GRN: "Goods received note", BL: "Bill", VP: "Vendor payment", RA: "Remittance advice", CT: "Contract", DP: "Deposit", V: "Supplier", ADV: "Advance" },
  copy: "Copy {no}", copied: "Copied",
  lock: { until: "Payments locked until {when}", pending: "Payments locked — finance must verify the new details", unlocked: "Payments to {name} unlocked" },
  expiry: { expired: "Expired", days: "{n} days left", today: "Ends today" },
  budget: { meter: "{pct}% of {name} budget after this", used: "{used} of {budget}", over: "Over budget by {amount}", remaining: "{amount} left" },
  tolerance: { within: "{amount} · {pct}% — within tolerance", out: "{amount} · {pct}% — outside tolerance" },
  age: { days: "{n} d" },
  seg: {
    prepared: "Prepared", approved: "Approved", authorised: "Authorised", paid: "Paid", waiting: "Waiting for {name}", waitingRole: "Waiting for {role}",
    self: "You prepared this — someone else must approve", selfApproved: "You approved this — someone else must authorise", skipped: "Not needed",
    override: "Executive override", finance: "Finance", executive: "Executive", requester: "Requester", requested: "Requested",
  },
  route: {
    finance: "Finance approves", executive: "{name} approves", financeName: "Finance ({name}) approves", blocked: "Add {n} more quotes",
    title: "Approval route", limits: "Finance approves up to {limit}. Executive above, or when over budget.",
  },
  quotes: { rule: "Minimum 1 recommended, {n} required above {limit}", met: "{n} of {req} quotes", chosen: "Chosen", cheapest: "Cheapest", reason: "Why not the cheapest?", choose: "Choose this quote" },
  vat: { excl: "Prices exclude VAT", incl: "Prices include VAT", subtotal: "Subtotal", vat: "VAT (18%)", total: "Total", notRegistered: "Supplier isn't VAT-registered", line: "Line", qty: "Qty", unit: "Unit price", net: "Net" },
  bank: { title: "Payment details", reveal: "Reveal", revealReason: "Why do you need to see this?", hidden: "Hidden again", none: "No payment details yet", request: "Change bank details",
    pending: "Changed {when} — finance verification pending", rejected: "Last change rejected — old details still in use", verified: "Verified" },
  dup: { tin: "Similar TIN exists: {name}", name: "Similar name exists: {name}", open: "Open {code}" },
  timeline: { start: "Start", end: "End", today: "Today", notice: "Notice deadline", reminder: "Reminder −{n} d" },
  deposit: { returnDue: "Return due {date}", overdue: "Return overdue by {n} days" },
  evidence: { receivedBy: "Received by {name}", noPhoto: "Service confirmed — no photo", scanning: "Checking file…", blocked: "File blocked" },
  remit: { sent: "Sent {when}", draft: "Not sent yet", failed: "Sending failed", retry: "Retry", view: "View" },
  states: { error: "This panel didn't load.", retry: "Retry", loading: "Loading…", offlineMoney: "Approvals disabled offline", conflict: "Changed by {name} {when}. Reload to see the latest.", reload: "Reload" },
  noAccess: { title: "You don't have access to Procurement", body: "This area is for the procurement officer, finance and executives.", home: "Go to my workspace" },
  empty: {
    suppliers: "No suppliers yet. Add your landlord and utilities first.", contracts: "No contracts yet. Add your office lease to get renewal reminders.",
    requests: "No purchase requests. Anyone on the team can raise one.", receipts: "Nothing received yet.", bills: "No bills due this week. You're all caught up.",
    deposits: "No deposits outstanding.", approvals: "Nothing waiting for you.", obligations: "No expiring contracts in 90 days.", search: "Nothing matches “{q}”.",
  },
  sim: { label: "Simulate (mock mode)", clock: "Advance clock 24 h", reminders: "Run reminders job", recurring: "Generate recurring bills", invoice: "Supplier sends invoice" },
  common: { cancel: "Cancel", save: "Save", submit: "Submit", close: "Close", open: "Open", view: "View", back: "Back", edit: "Edit", next: "Next", confirm: "Confirm", reason: "Reason", note: "Note", all: "All", search: "Search", export: "Export CSV", print: "Print", none: "—", seeAll: "View all", details: "View details" },
};
export type ProcCopy = typeof en;

const rw: ProcCopy = {
  nav: { home: "Ahabanza", requests: "Ubusabe", bills: "Fagitire", contracts: "Amasezerano", more: "Ibindi", payables: "Ibyishyurwa" },
  shell: {
    notifications: "Amakuru y'amasoko", markAll: "Byose byasomwe", empty: "Nta kintu gishya.", actions: "Ibikorwa",
    newSupplier: "Utanga serivisi mushya", newContract: "Amasezerano mashya", recordGrn: "Andika ibyakiriwe", enterBill: "Andika fagitire", goAgeing: "Jya ku myenda ishaje",
    requestPurchase: "Saba kugura", myRequests: "Ubusabe bwanjye bwo kugura", findNumber: "Shaka ukoresheje nomero", payables: "Ibitegereje kwishyurwa",
    verifyBank: "Emeza impinduka za banki", language: "Ururimi", offline: "Nta murandasi. Ibikorwa by'amafaranga byahagaritswe; imibare ni iya nyuma yabonetse.",
    bellTabs: { all: "Byose", contracts: "Amasezerano", bills: "Fagitire", requests: "Ubusabe", deposits: "Ingwate" },
  },
  status: {
    draft: "Umushinga", submitted: "Byoherejwe", info_requested: "Hasabwe ibisobanuro", approved: "Byemejwe", rejected: "Byanzwe", withdrawn: "Byakuweho", ordered: "Byatumijwe",
    issued: "Byoherejwe", partially_received: "Byakiriwe igice", received: "Byakiriwe", closed: "Byafunzwe", cancelled: "Byahagaritswe",
    matched: "Bihuye", match_exception: "Ntibihuye", authorised: "Byemerewe kwishyurwa", partially_paid: "Byishyuwe igice", paid: "Byishyuwe", disputed: "Bijyanye impaka", void: "Byateshejwe agaciro",
    active: "Birakora", inactive: "Ntibikora", blocked: "Byahagaritswe", verified: "Byemejwe", unverified: "Impinduka itegereje", requested: "Byasabwe",
    expiring: "Birenda kurangira", renewed: "Byavuguruwe", terminated: "Byasheshwe", expired: "Byarangiye",
    pending_payment: "Bitegereje kwishyurwa", paid_out: "Byishyuwe", held: "Bibitswe", return_due: "Bigomba gusubizwa", returned: "Byasubijwe", partially_returned: "Byasubijwe igice",
    forfeited: "Byatakaye", offset: "Byakuweho", sent: "Byoherejwe", failed: "Byanze", scheduled: "Biteganyijwe",
    invited: "Yatumiwe", onboarding: "Ari kwinjizwa", cleared: "Yemerewe", suspended: "Yahagaritswe",
  },
  match: { matched: "Bihuye", tolerance: "Biri mu rugero", exception: "Ntibihuye", no_po: "Nta PO", pending: "Ntibirahuzwa", contract: "Bihuye n'amasezerano" },
  reasons: { over_limit: "Birenze RWF 1,000,000", over_budget: "Birenze ingengo y'imari", quotes_waived: "Nta biciro byatanzwe", no_po: "Nta PO", match_exception: "Ntibihuye" },
  vendorType: { landlord: "Nyir'inzu", supplier: "Utanga ibicuruzwa", service_provider: "Utanga serivisi", government_body: "Urwego rwa Leta" },
  kind: { PR: "Ubusabe bwo kugura", PO: "Itegeko ryo kugura", GRN: "Inyandiko y'ibyakiriwe", BL: "Fagitire", VP: "Ubwishyu", RA: "Inyandiko y'ubwishyu", CT: "Amasezerano", DP: "Ingwate", V: "Utanga serivisi", ADV: "Avansi" },
  copy: "Koporora {no}", copied: "Byakoporowe",
  lock: { until: "Ubwishyu bwahagaritswe kugeza {when}", pending: "Ubwishyu bwahagaritswe — imari igomba kwemeza amakuru mashya", unlocked: "Ubwishyu kuri {name} bwafunguwe" },
  expiry: { expired: "Byarangiye", days: "Hasigaye iminsi {n}", today: "Birarangira uyu munsi" },
  budget: { meter: "{pct}% by'ingengo ya {name} nyuma y'ibi", used: "{used} kuri {budget}", over: "Birenze ingengo ho {amount}", remaining: "Hasigaye {amount}" },
  tolerance: { within: "{amount} · {pct}% — biri mu rugero", out: "{amount} · {pct}% — birenze urugero" },
  age: { days: "iminsi {n}" },
  seg: {
    prepared: "Yateguye", approved: "Yemeje", authorised: "Yemereye kwishyura", paid: "Yishyuye", waiting: "Bitegereje {name}", waitingRole: "Bitegereje {role}",
    self: "Ni wowe wabiteguye — undi agomba kubyemeza", selfApproved: "Ni wowe wabyemeje — undi agomba kwemerera kwishyura", skipped: "Ntibikenewe",
    override: "Uruhushya rw'ubuyobozi", finance: "Imari", executive: "Ubuyobozi", requester: "Uwasabye", requested: "Yasabye",
  },
  route: {
    finance: "Imari iremeza", executive: "{name} aremeza", financeName: "Imari ({name}) iremeza", blocked: "Ongeraho ibiciro {n}",
    title: "Inzira yo kwemeza", limits: "Imari yemeza kugeza {limit}. Ubuyobozi hejuru yaho cyangwa iyo birenze ingengo.",
  },
  quotes: { rule: "Nibura 1 birasabwa, {n} ni ngombwa hejuru ya {limit}", met: "Ibiciro {n} kuri {req}", chosen: "Byatoranyijwe", cheapest: "Bihendutse", reason: "Kuki atari ibihendutse?", choose: "Hitamo iki giciro" },
  vat: { excl: "Ibiciro bitarimo TVA", incl: "Ibiciro birimo TVA", subtotal: "Igiteranyo", vat: "TVA (18%)", total: "Igiteranyo cyose", notRegistered: "Ntiyanditswe muri TVA", line: "Umurongo", qty: "Umubare", unit: "Igiciro kimwe", net: "Nta TVA" },
  bank: { title: "Amakuru y'ubwishyu", reveal: "Erekana", revealReason: "Kuki ukeneye kubibona?", hidden: "Byongeye guhishwa", none: "Nta makuru y'ubwishyu", request: "Hindura konti ya banki",
    pending: "Byahinduwe {when} — imari itaremeza", rejected: "Impinduka iheruka yanzwe — amakuru ya kera aracyakoreshwa", verified: "Byemejwe" },
  dup: { tin: "TIN isa n'iyi irahari: {name}", name: "Izina risa n'iri rirahari: {name}", open: "Fungura {code}" },
  timeline: { start: "Itangira", end: "Iherezo", today: "Uyu munsi", notice: "Itariki ntarengwa yo kumenyesha", reminder: "Kwibutsa −{n} d" },
  deposit: { returnDue: "Igomba gusubizwa {date}", overdue: "Yarengeje iminsi {n} itarasubizwa" },
  evidence: { receivedBy: "Byakiriwe na {name}", noPhoto: "Serivisi yemejwe — nta foto", scanning: "Turagenzura dosiye…", blocked: "Dosiye yahagaritswe" },
  remit: { sent: "Byoherejwe {when}", draft: "Ntibiroherezwa", failed: "Kohereza byanze", retry: "Ongera ugerageze", view: "Reba" },
  states: { error: "Iki gice nticyafunguye.", retry: "Ongera ugerageze", loading: "Birimo gufunguka…", offlineMoney: "Kwemeza byahagaritswe nta murandasi", conflict: "Byahinduwe na {name} {when}. Ongera ufungure urebe ibishya.", reload: "Ongera ufungure" },
  noAccess: { title: "Nta burenganzira ufite ku masoko", body: "Iki gice ni icy'ushinzwe amasoko, imari n'ubuyobozi.", home: "Jya aho nkorera" },
  empty: {
    suppliers: "Nta batanga serivisi barahari. Banza wongeremo nyir'inzu n'abatanga amazi n'umuriro.", contracts: "Nta masezerano arahari. Ongeramo amasezerano y'ubukode kugira ngo ubone kwibutswa.",
    requests: "Nta busabe bwo kugura. Umuntu wese mu ikipe ashobora kubutanga.", receipts: "Nta kintu cyakiriwe.", bills: "Nta fagitire zigomba kwishyurwa iki cyumweru.",
    deposits: "Nta ngwate zitarasubizwa.", approvals: "Nta kikureba.", obligations: "Nta masezerano arangira mu minsi 90.", search: "Nta gihuye na “{q}”.",
  },
  sim: { label: "Igerageza (mock)", clock: "Imbere amasaha 24", reminders: "Kora kwibutsa", recurring: "Kora fagitire zisubirwamo", invoice: "Utanga serivisi yohereje fagitire" },
  common: { cancel: "Hagarika", save: "Bika", submit: "Ohereza", close: "Funga", open: "Fungura", view: "Reba", back: "Subira inyuma", edit: "Hindura", next: "Komeza", confirm: "Emeza", reason: "Impamvu", note: "Icyitonderwa", all: "Byose", search: "Shakisha", export: "Kuramo CSV", print: "Capa", none: "—", seeAll: "Reba byose", details: "Reba birambuye" },
};

const fr: ProcCopy = {
  nav: { home: "Accueil", requests: "Demandes", bills: "Factures", contracts: "Contrats", more: "Plus", payables: "Fournisseurs à payer" },
  shell: {
    notifications: "Notifications achats", markAll: "Tout marquer lu", empty: "Rien de nouveau.", actions: "Actions",
    newSupplier: "Nouveau fournisseur", newContract: "Nouveau contrat", recordGrn: "Enregistrer une réception", enterBill: "Saisir une facture", goAgeing: "Balance âgée",
    requestPurchase: "Demander un achat", myRequests: "Mes demandes d'achat", findNumber: "Chercher par numéro", payables: "File fournisseurs",
    verifyBank: "Vérifier les changements bancaires", language: "Langue", offline: "Hors ligne. Les actions financières sont désactivées ; chiffres de la dernière mise à jour.",
    bellTabs: { all: "Tout", contracts: "Contrats", bills: "Factures", requests: "Demandes", deposits: "Dépôts" },
  },
  status: {
    draft: "Brouillon", submitted: "Soumise", info_requested: "Infos demandées", approved: "Approuvée", rejected: "Refusée", withdrawn: "Retirée", ordered: "Commandée",
    issued: "Envoyé", partially_received: "Reçu en partie", received: "Reçu", closed: "Clôturé", cancelled: "Annulé",
    matched: "Rapprochée", match_exception: "Écart de rapprochement", authorised: "Autorisée", partially_paid: "Payée en partie", paid: "Payée", disputed: "Contestée", void: "Annulée",
    active: "Actif", inactive: "Inactif", blocked: "Bloqué", verified: "Vérifié", unverified: "Changement en attente", requested: "Demandé",
    expiring: "Expire bientôt", renewed: "Renouvelé", terminated: "Résilié", expired: "Expiré",
    pending_payment: "En attente de paiement", paid_out: "Versé", held: "Détenu", return_due: "Restitution due", returned: "Restitué", partially_returned: "Restitué en partie",
    forfeited: "Perdu", offset: "Imputé", sent: "Envoyé", failed: "Échec", scheduled: "Planifié",
    invited: "Invité", onboarding: "Intégration", cleared: "Habilité", suspended: "Suspendu",
  },
  match: { matched: "Rapproché", tolerance: "Dans la tolérance", exception: "Écart", no_po: "Sans bon de commande", pending: "Pas encore rapproché", contract: "Conforme au contrat" },
  reasons: { over_limit: "Plus de 1 000 000 RWF", over_budget: "Hors budget", quotes_waived: "Devis non fournis", no_po: "Sans bon de commande", match_exception: "Écart de rapprochement" },
  vendorType: { landlord: "Bailleur", supplier: "Fournisseur", service_provider: "Prestataire", government_body: "Organisme public" },
  kind: { PR: "Demande d'achat", PO: "Bon de commande", GRN: "Bon de réception", BL: "Facture", VP: "Paiement fournisseur", RA: "Avis de paiement", CT: "Contrat", DP: "Dépôt", V: "Fournisseur", ADV: "Avance" },
  copy: "Copier {no}", copied: "Copié",
  lock: { until: "Paiements bloqués jusqu'au {when}", pending: "Paiements bloqués — la finance doit vérifier les nouvelles coordonnées", unlocked: "Paiements à {name} débloqués" },
  expiry: { expired: "Expiré", days: "{n} jours restants", today: "Se termine aujourd'hui" },
  budget: { meter: "{pct} % du budget {name} après cette demande", used: "{used} sur {budget}", over: "Dépasse le budget de {amount}", remaining: "{amount} restants" },
  tolerance: { within: "{amount} · {pct} % — dans la tolérance", out: "{amount} · {pct} % — hors tolérance" },
  age: { days: "{n} j" },
  seg: {
    prepared: "Préparé", approved: "Approuvé", authorised: "Autorisé", paid: "Payé", waiting: "En attente de {name}", waitingRole: "En attente : {role}",
    self: "Vous l'avez préparé — une autre personne doit approuver", selfApproved: "Vous l'avez approuvé — une autre personne doit autoriser", skipped: "Non requis",
    override: "Dérogation de la direction", finance: "Finance", executive: "Direction", requester: "Demandeur", requested: "Demandé",
  },
  route: {
    finance: "La finance approuve", executive: "{name} approuve", financeName: "Finance ({name}) approuve", blocked: "Ajoutez {n} devis",
    title: "Circuit d'approbation", limits: "La finance approuve jusqu'à {limit}. La direction au-delà ou hors budget.",
  },
  quotes: { rule: "1 devis recommandé, {n} obligatoires au-delà de {limit}", met: "{n} devis sur {req}", chosen: "Retenu", cheapest: "Le moins cher", reason: "Pourquoi pas le moins cher ?", choose: "Retenir ce devis" },
  vat: { excl: "Prix hors TVA", incl: "Prix TVA comprise", subtotal: "Sous-total", vat: "TVA (18 %)", total: "Total", notRegistered: "Fournisseur non assujetti à la TVA", line: "Ligne", qty: "Qté", unit: "Prix unitaire", net: "HT" },
  bank: { title: "Coordonnées de paiement", reveal: "Afficher", revealReason: "Pourquoi devez-vous les voir ?", hidden: "Masqué à nouveau", none: "Aucune coordonnée", request: "Changer les coordonnées bancaires",
    pending: "Modifié {when} — vérification finance en attente", rejected: "Dernier changement refusé — anciennes coordonnées conservées", verified: "Vérifié" },
  dup: { tin: "NIF similaire existant : {name}", name: "Nom similaire existant : {name}", open: "Ouvrir {code}" },
  timeline: { start: "Début", end: "Fin", today: "Aujourd'hui", notice: "Date limite de préavis", reminder: "Rappel −{n} j" },
  deposit: { returnDue: "Restitution due le {date}", overdue: "Restitution en retard de {n} jours" },
  evidence: { receivedBy: "Reçu par {name}", noPhoto: "Service confirmé — sans photo", scanning: "Vérification du fichier…", blocked: "Fichier bloqué" },
  remit: { sent: "Envoyé {when}", draft: "Pas encore envoyé", failed: "Échec d'envoi", retry: "Réessayer", view: "Voir" },
  states: { error: "Ce panneau n'a pas chargé.", retry: "Réessayer", loading: "Chargement…", offlineMoney: "Approbations désactivées hors ligne", conflict: "Modifié par {name} {when}. Rechargez pour voir la dernière version.", reload: "Recharger" },
  noAccess: { title: "Vous n'avez pas accès aux Achats", body: "Cet espace est réservé aux achats, à la finance et à la direction.", home: "Mon espace" },
  empty: {
    suppliers: "Aucun fournisseur. Ajoutez d'abord votre bailleur et vos services publics.", contracts: "Aucun contrat. Ajoutez votre bail pour recevoir les rappels de renouvellement.",
    requests: "Aucune demande d'achat. Tout le monde dans l'équipe peut en créer une.", receipts: "Rien de reçu pour l'instant.", bills: "Aucune facture due cette semaine. Tout est à jour.",
    deposits: "Aucun dépôt en cours.", approvals: "Rien ne vous attend.", obligations: "Aucun contrat n'expire dans les 90 jours.", search: "Aucun résultat pour « {q} ».",
  },
  sim: { label: "Simuler (mode maquette)", clock: "Avancer de 24 h", reminders: "Lancer les rappels", recurring: "Générer les factures récurrentes", invoice: "Le fournisseur envoie une facture" },
  common: { cancel: "Annuler", save: "Enregistrer", submit: "Soumettre", close: "Fermer", open: "Ouvrir", view: "Voir", back: "Retour", edit: "Modifier", next: "Suivant", confirm: "Confirmer", reason: "Motif", note: "Note", all: "Tout", search: "Rechercher", export: "Exporter CSV", print: "Imprimer", none: "—", seeAll: "Tout voir", details: "Voir le détail" },
};

const COPY: Record<Locale, ProcCopy> = { en, rw, fr };
export const procurementCommon = (locale: Locale) => COPY[locale] ?? en;
export const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
