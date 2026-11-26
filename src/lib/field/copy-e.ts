// Lane E copy (U8 payments, U11 expenses, U12 earnings). rw/fr are first drafts for native review.
import type { L3 } from "@/shared/field/types";

const en = {
  pay: {
    title: "Request payment", open: "Request MoMo payment", invoice: "Invoice", phone: "Client's MoMo number", phoneBad: "Enter a Rwandan mobile number (07…).",
    amount: "Amount (RWF)", due: "Balance due {amount}", min: "At least {min}.", over: "Can't be more than the balance due.", send: "Send MoMo prompt",
    waiting: "Waiting for confirmation…", waitingHint: "The client approves the prompt on their phone.", confirmed: "Payment confirmed", receipt: "Receipt {n}",
    failed: "Payment failed", failedHint: "The client declined or has too little balance.", expired: "The prompt expired", cancelled: "Prompt cancelled",
    retry: "Send again", cancel: "Cancel prompt", never: "You never handle cash.", none: "No open invoices for this case.",
    inProgress: "A payment is already in progress, showing it.", error: "Couldn't start the payment.", loadError: "Couldn't load invoices.", timeout: "No answer after 3 minutes.",
  },
  cash: {
    title: "Record cash", open: "Record cash payment", note: "Not paid until finance confirms", amount: "Amount received (RWF)", invoice: "Invoice number",
    provisional: "Provisional receipt", sign: "Ask client to sign", signed: "Client signed", save: "Record cash", recorded: "Cash recorded, provisional receipt {ref}",
    deposit: "Mark deposited", slip: "Deposit slip photo", bankRef: "Bank reference", depositSave: "Save deposit", deposited: "Deposit queued", needSig: "The client must sign first.",
    needSlip: "Add the slip photo and bank reference.", list: "Cash on this visit",
  },
  exp: {
    newTitle: "New expense", category: "Category", cats: { moto: "Moto fare", transport: "Bus / transport", stationery: "Stationery / copies", meal: "Meal", other: "Other" },
    amount: "Amount (RWF)", amountBad: "Enter a whole amount above 0.", visit: "Task", noVisit: "No visit (explain in the note)", receipt: "Receipt photo",
    noReceipt: "No receipt given", noReceiptReason: "Why is there no receipt?", reasonRequired: "Add a receipt photo or say why there is none.", noteNeeded: "Say what this was for.",
    note: "Note (optional)", overCap: "Above the moto cap of {cap} per trip. It will be flagged for your manager, not blocked.", save: "Save expense", resend: "Resend expense",
    saved: "Expense saved", queuedOffline: "Queued (offline), sends when you're online", errors: "Check the highlighted fields",
    title: "Expenses", tabs: { all: "All", pending: "Pending", approved: "Approved", paid: "Paid", rejected: "Rejected" }, monthTotal: "This month total",
    capNote: "Moto fares up to {cap} per trip (placeholder cap).", empty: "No expenses this month", emptyBody: "Moto fares and copies you pay for on a visit go here.",
    newBtn: "New expense", states: { queued: "Queued", submitted: "Submitted", sm_approved: "SM OK", finance_approved: "Finance OK", paid: "Paid", rejected: "Rejected", withdrawn: "Withdrawn" },
    trail: { submitted: "Agent submitted", sm: "Service manager", finance: "Finance approval", paid: "Paid out" }, reason: "Reason",
    withdraw: "Withdraw", withdrawn: "Expense withdrawn", paidIn: "Paid in {b}", onPhone: "Showing what's on this phone, connect to refresh.",
    edit: "Edit and resend", prev: "Previous month", next: "Next month", noReceiptShown: "No receipt: {r}", detail: "Expense", loadError: "Couldn't load expenses.",
  },
  earn: {
    title: "Field earnings", thisMonth: "This month", perVisit: "Per-visit fees ({n} visits × {fee})", feeNote: "The per-visit fee is a placeholder until HEBUZA confirms it.",
    transport: "Transport reimbursements", pending: "Waiting for approval", shares: "Share of case pools", share: "{pct}% of {pool}",
    wht: "Withholding tax (15%, subject to tax adviser)", states: { invoiced: "Invoiced", collected: "Collected", allocated: "Allocated", approved: "Approved", paid: "Paid" },
    detailed: "View detailed earnings", offline: "Needs a connection, showing the last figures loaded.", none: "Connect once to load your earnings.", loadError: "Couldn't load earnings.",
    agent: "Agent", region: "{d} · Northern Province", noWht: "Reimbursements are not taxed.",
  },
};
export type CopyE = typeof en;

const fr: CopyE = {
  pay: {
    title: "Demander un paiement", open: "Demander un paiement MoMo", invoice: "Facture", phone: "Numéro MoMo du client", phoneBad: "Entrez un numéro mobile rwandais (07…).",
    amount: "Montant (RWF)", due: "Solde dû {amount}", min: "Au moins {min}.", over: "Pas plus que le solde dû.", send: "Envoyer la demande MoMo",
    waiting: "En attente de confirmation…", waitingHint: "Le client valide la demande sur son téléphone.", confirmed: "Paiement confirmé", receipt: "Reçu {n}",
    failed: "Paiement échoué", failedHint: "Le client a refusé ou n'a pas assez de solde.", expired: "La demande a expiré", cancelled: "Demande annulée",
    retry: "Renvoyer", cancel: "Annuler la demande", never: "Vous ne manipulez jamais d'argent liquide.", none: "Aucune facture ouverte pour ce dossier.",
    inProgress: "Un paiement est déjà en cours, affiché ci-dessous.", error: "Impossible de lancer le paiement.", loadError: "Impossible de charger les factures.", timeout: "Pas de réponse après 3 minutes.",
  },
  cash: {
    title: "Enregistrer des espèces", open: "Enregistrer un paiement en espèces", note: "Non payé tant que la finance n'a pas confirmé", amount: "Montant reçu (RWF)", invoice: "Numéro de facture",
    provisional: "Reçu provisoire", sign: "Faire signer le client", signed: "Le client a signé", save: "Enregistrer", recorded: "Espèces enregistrées, reçu provisoire {ref}",
    deposit: "Marquer comme déposé", slip: "Photo du bordereau", bankRef: "Référence bancaire", depositSave: "Enregistrer le dépôt", deposited: "Dépôt en file", needSig: "Le client doit d'abord signer.",
    needSlip: "Ajoutez la photo du bordereau et la référence.", list: "Espèces sur cette visite",
  },
  exp: {
    newTitle: "Nouvelle dépense", category: "Catégorie", cats: { moto: "Moto-taxi", transport: "Bus / transport", stationery: "Fournitures / copies", meal: "Repas", other: "Autre" },
    amount: "Montant (RWF)", amountBad: "Entrez un montant entier supérieur à 0.", visit: "Tâche", noVisit: "Sans visite (expliquez dans la note)", receipt: "Photo du reçu",
    noReceipt: "Pas de reçu", noReceiptReason: "Pourquoi pas de reçu ?", reasonRequired: "Ajoutez une photo du reçu ou expliquez pourquoi.", noteNeeded: "Indiquez à quoi cela a servi.",
    note: "Note (facultatif)", overCap: "Au-dessus du plafond moto de {cap} par trajet. Signalé à votre responsable, pas bloqué.", save: "Enregistrer la dépense", resend: "Renvoyer la dépense",
    saved: "Dépense enregistrée", queuedOffline: "En file (hors ligne), envoyée dès la connexion", errors: "Vérifiez les champs signalés",
    title: "Dépenses", tabs: { all: "Toutes", pending: "En attente", approved: "Approuvées", paid: "Payées", rejected: "Refusées" }, monthTotal: "Total du mois",
    capNote: "Moto-taxi jusqu'à {cap} par trajet (plafond provisoire).", empty: "Aucune dépense ce mois-ci", emptyBody: "Les moto-taxis et copies payés en visite apparaissent ici.",
    newBtn: "Nouvelle dépense", states: { queued: "En file", submitted: "Soumise", sm_approved: "OK resp.", finance_approved: "OK finance", paid: "Payée", rejected: "Refusée", withdrawn: "Retirée" },
    trail: { submitted: "Soumise par l'agent", sm: "Responsable de service", finance: "Approbation finance", paid: "Versée" }, reason: "Motif",
    withdraw: "Retirer", withdrawn: "Dépense retirée", paidIn: "Payée dans {b}", onPhone: "Données de ce téléphone, connectez-vous pour actualiser.",
    edit: "Modifier et renvoyer", prev: "Mois précédent", next: "Mois suivant", noReceiptShown: "Sans reçu : {r}", detail: "Dépense", loadError: "Impossible de charger les dépenses.",
  },
  earn: {
    title: "Gains terrain", thisMonth: "Ce mois-ci", perVisit: "Frais par visite ({n} visites × {fee})", feeNote: "Le frais par visite est provisoire en attente de confirmation HEBUZA.",
    transport: "Remboursements transport", pending: "En attente d'approbation", shares: "Part des pools de dossiers", share: "{pct} % de {pool}",
    wht: "Retenue à la source (15 %, sous réserve du conseiller fiscal)", states: { invoiced: "Facturé", collected: "Encaissé", allocated: "Alloué", approved: "Approuvé", paid: "Payé" },
    detailed: "Voir le détail des gains", offline: "Nécessite une connexion, derniers chiffres chargés.", none: "Connectez-vous une fois pour charger vos gains.", loadError: "Impossible de charger les gains.",
    agent: "Agent", region: "{d} · Province du Nord", noWht: "Les remboursements ne sont pas imposés.",
  },
};

const rw: CopyE = {
  pay: {
    title: "Saba ubwishyu", open: "Saba kwishyura kuri MoMo", invoice: "Fagitire", phone: "Nomero ya MoMo y'umukiriya", phoneBad: "Andika nomero ya telefoni yo mu Rwanda (07…).",
    amount: "Amafaranga (RWF)", due: "Asigaye kwishyurwa {amount}", min: "Nibura {min}.", over: "Ntibirenze asigaye kwishyurwa.", send: "Ohereza ubusabe bwa MoMo",
    waiting: "Dutegereje kwemezwa…", waitingHint: "Umukiriya yemeza kuri telefoni ye.", confirmed: "Ubwishyu bwemejwe", receipt: "Inyemezabwishyu {n}",
    failed: "Ubwishyu bwanze", failedHint: "Umukiriya yanze cyangwa nta mafaranga ahagije afite.", expired: "Ubusabe bwarangiye", cancelled: "Ubusabe bwahagaritswe",
    retry: "Ongera wohereze", cancel: "Hagarika ubusabe", never: "Ntuzigera ufata amafaranga mu ntoki.", none: "Nta fagitire ifunguye kuri iyi dosiye.",
    inProgress: "Hari ubwishyu buri gukorwa, ni ubu.", error: "Ntibyashobotse gutangiza ubwishyu.", loadError: "Ntibyashobotse kubona fagitire.", timeout: "Nta gisubizo nyuma y'iminota 3.",
  },
  cash: {
    title: "Andika amafaranga mu ntoki", open: "Andika ubwishyu mu ntoki", note: "Ntibyishyuwe kugeza imari yemeje", amount: "Amafaranga yakiriwe (RWF)", invoice: "Nomero ya fagitire",
    provisional: "Inyemezabwishyu y'agateganyo", sign: "Saba umukiriya gusinya", signed: "Umukiriya yasinye", save: "Andika", recorded: "Byanditswe, inyemezabwishyu y'agateganyo {ref}",
    deposit: "Byashyizwe kuri banki", slip: "Ifoto y'urupapuro rwa banki", bankRef: "Nomero ya banki", depositSave: "Bika", deposited: "Byashyizwe ku murongo", needSig: "Umukiriya agomba kubanza gusinya.",
    needSlip: "Ongeraho ifoto n'inomero ya banki.", list: "Amafaranga kuri uru ruzinduko",
  },
  exp: {
    newTitle: "Amafaranga mashya yakoreshejwe", category: "Ubwoko", cats: { moto: "Moto", transport: "Bisi / ingendo", stationery: "Impapuro / kopi", meal: "Ifunguro", other: "Ibindi" },
    amount: "Amafaranga (RWF)", amountBad: "Andika umubare wuzuye urenze 0.", visit: "Igikorwa", noVisit: "Nta ruzinduko (sobanura mu nyandiko)", receipt: "Ifoto y'inyemezabwishyu",
    noReceipt: "Nta nyemezabwishyu yatanzwe", noReceiptReason: "Kuki nta nyemezabwishyu?", reasonRequired: "Ongeraho ifoto cyangwa usobanure impamvu.", noteNeeded: "Vuga icyo byari bigamije.",
    note: "Icyitonderwa (bitari ngombwa)", overCap: "Birenze igipimo cya moto cya {cap} ku rugendo. Bizamenyeshwa umuyobozi, ntibihagarikwa.", save: "Bika", resend: "Ongera wohereze",
    saved: "Byabitswe", queuedOffline: "Biri ku murongo (nta interineti), bizoherezwa", errors: "Reba ibyagaragajwe",
    title: "Amafaranga yakoreshejwe", tabs: { all: "Byose", pending: "Bitegereje", approved: "Byemejwe", paid: "Byishyuwe", rejected: "Byanzwe" }, monthTotal: "Igiteranyo cy'ukwezi",
    capNote: "Moto kugeza {cap} ku rugendo (igipimo cy'agateganyo).", empty: "Nta mafaranga yakoreshejwe uku kwezi", emptyBody: "Moto n'amakopi wishyuye mu ruzinduko bigaragara hano.",
    newBtn: "Ongeraho", states: { queued: "Ku murongo", submitted: "Byoherejwe", sm_approved: "SM yemeje", finance_approved: "Imari yemeje", paid: "Byishyuwe", rejected: "Byanzwe", withdrawn: "Byakuweho" },
    trail: { submitted: "Umukozi yohereje", sm: "Umuyobozi wa serivisi", finance: "Kwemezwa n'imari", paid: "Byishyuwe" }, reason: "Impamvu",
    withdraw: "Kuraho", withdrawn: "Byakuweho", paidIn: "Byishyuwe muri {b}", onPhone: "Ibiri kuri iyi telefoni, jya kuri interineti uvugurure.",
    edit: "Hindura wongere wohereze", prev: "Ukwezi gushize", next: "Ukwezi gutaha", noReceiptShown: "Nta nyemezabwishyu: {r}", detail: "Amafaranga", loadError: "Ntibyashobotse kubibona.",
  },
  earn: {
    title: "Ibyo winjije mu murima", thisMonth: "Uku kwezi", perVisit: "Amafaranga ku ruzinduko ({n} × {fee})", feeNote: "Amafaranga ku ruzinduko ni ay'agateganyo HEBUZA itaremeza.",
    transport: "Gusubizwa amafaranga y'ingendo", pending: "Bitegereje kwemezwa", shares: "Umugabane ku madosiye", share: "{pct}% bya {pool}",
    wht: "Umusoro ukatwa (15%, hakurikijwe umujyanama w'imisoro)", states: { invoiced: "Byatangiwe fagitire", collected: "Byishyuwe n'umukiriya", allocated: "Byagabanyijwe", approved: "Byemejwe", paid: "Byishyuwe" },
    detailed: "Reba ibisobanuro birambuye", offline: "Bikeneye interineti, imibare iheruka.", none: "Jya kuri interineti rimwe ubone ibyo winjije.", loadError: "Ntibyashobotse kubibona.",
    agent: "Umukozi", region: "{d} · Intara y'Amajyaruguru", noWht: "Gusubizwa ntibisoreshwa.",
  },
};

const ALL: Record<L3, CopyE> = { en, fr, rw };
export const copyE = (l: string) => ALL[(l as L3) in ALL ? (l as L3) : "en"];
