// U4 Approvals inbox copy (boards 02 SH3, 14). Signing happens on the record (D4); the inbox only links.
import type { Locale } from "@/shared/i18n/config";

const en = {
  title: "Approvals",
  sub: "Every step waiting for a signature. Open a record to sign it there.",
  execSub: "Only the steps waiting for your signature as executive.",
  tabs: { all: "All", manual_payment: "Manual payments", refund: "Refunds", allocation: "Allocations", batch: "Payout batches", setting: "Settings & rules" } as Record<string, string>,
  type: { manual_payment: "Manual payment", refund: "Refund", allocation: "Allocation", batch: "Payout batch", setting: "Setting change", rule: "Revenue rule" } as Record<string, string>,
  col: { type: "Type", record: "Record", maker: "Made by", amount: "Amount", reason: "Reason", age: "Age", sla: "Returns", step: "My step" },
  reason: {
    manual_confirm: "Manual payment confirmation", allocation_review: "Reviewed by service manager", batch_authorise: "Authorise payout batch",
    quality_dispute: "Quality dispute", cancelled_before_work: "Cancelled before work", duplicate_payment: "Duplicate payment",
    service_not_delivered: "Service not delivered", other: "Other",
  } as Record<string, string>,
  sla: "in {h} h", slaOver: "Overdue", noSla: "",
  mine: { sign: "Your turn", waiting: "Waiting for another finance user", blocked: "Not your step" } as Record<string, string>,
  open: "Open",
  list: "Approvals list",
  empty: { title: "Nothing waiting for you", body: "New approvals appear here as soon as someone submits them.", tab: "Nothing in this tab." },
  bulk: {
    approve: "Approve selected", only: "Bulk approval works for allocations only; everything else is signed one by one on its record.",
    title: "Approve {n} allocations?", body: "Total pool {amount}. Each allocation becomes approved for the next payout run and is logged with the same batch id.",
    confirm: "Approve {n}", done: "{n} allocations approved", offline: "You're offline, approvals are disabled.", loading: "Checking the total…", cancel: "Cancel",
  },
  signedElsewhere: "{who} approved {record}",
  someone: "Another finance user",
  sim: { signed: "Another user approves an allocation" },
  failed: "Approvals",
};
type Copy = typeof en;

const rw: Copy = {
  title: "Ibyemezo",
  sub: "Intambwe zose zitegereje gusinywa. Fungura inyandiko uyisinyireho.",
  execSub: "Intambwe zigutegereje gusa nk'umuyobozi.",
  tabs: { all: "Byose", manual_payment: "Ubwishyu bwinjijwe n'intoki", refund: "Gusubiza", allocation: "Igabanya", batch: "Ibyiciro byo kwishyura", setting: "Igenamiterere n'amategeko" },
  type: { manual_payment: "Ubwishyu bw'intoki", refund: "Gusubiza", allocation: "Igabanya", batch: "Icyiciro cyo kwishyura", setting: "Impinduka y'igenamiterere", rule: "Itegeko ry'igabanya" },
  col: { type: "Ubwoko", record: "Inyandiko", maker: "Byakozwe na", amount: "Amafaranga", reason: "Impamvu", age: "Igihe", sla: "Bisubizwa", step: "Intambwe yanjye" },
  reason: {
    manual_confirm: "Kwemeza ubwishyu bw'intoki", allocation_review: "Byasuzumwe n'umuyobozi wa serivisi", batch_authorise: "Kwemeza icyiciro cyo kwishyura",
    quality_dispute: "Ikibazo cy'ireme", cancelled_before_work: "Byahagaritswe mbere y'akazi", duplicate_payment: "Ubwishyu bwisubiyemo",
    service_not_delivered: "Serivisi ntiyatanzwe", other: "Ibindi",
  },
  sla: "mu masaha {h}", slaOver: "Byarengeje igihe", noSla: "",
  mine: { sign: "Ni wowe", waiting: "Bitegereje undi mukozi w'imari", blocked: "Si intambwe yawe" },
  open: "Fungura",
  list: "Urutonde rw'ibyemezo",
  empty: { title: "Nta kigutegereje", body: "Ibyemezo bishya bigaragara hano bikimara koherezwa.", tab: "Nta kintu muri iki gice." },
  bulk: {
    approve: "Emeza ibyatoranyijwe", only: "Kwemeza byinshi icyarimwe bikora ku igabanya gusa; ibindi bisinywa kimwe kimwe ku nyandiko yabyo.",
    title: "Kwemeza igabanya {n}?", body: "Igiteranyo {amount}. Buri gabanya rizishyurwa mu cyiciro gikurikira kandi ryandikwa n'inomero imwe y'icyiciro.",
    confirm: "Emeza {n}", done: "Igabanya {n} ryemejwe", offline: "Nta interineti, kwemeza birahagaritswe.", loading: "Turabara igiteranyo…", cancel: "Reka",
  },
  signedElsewhere: "{who} yemeje {record}",
  someone: "Undi mukozi w'imari",
  sim: { signed: "Undi mukozi yemeza igabanya" },
  failed: "Ibyemezo",
};

const fr: Copy = {
  title: "Approbations",
  sub: "Toutes les étapes en attente de signature. Ouvrez un dossier pour le signer.",
  execSub: "Uniquement les étapes qui attendent votre signature de direction.",
  tabs: { all: "Tout", manual_payment: "Paiements manuels", refund: "Remboursements", allocation: "Répartitions", batch: "Lots de versement", setting: "Paramètres et règles" },
  type: { manual_payment: "Paiement manuel", refund: "Remboursement", allocation: "Répartition", batch: "Lot de versement", setting: "Changement de paramètre", rule: "Règle de répartition" },
  col: { type: "Type", record: "Dossier", maker: "Créé par", amount: "Montant", reason: "Motif", age: "Âge", sla: "Retour", step: "Mon étape" },
  reason: {
    manual_confirm: "Confirmation de paiement manuel", allocation_review: "Revue par le responsable de service", batch_authorise: "Autoriser le lot de versement",
    quality_dispute: "Litige qualité", cancelled_before_work: "Annulé avant travaux", duplicate_payment: "Paiement en double",
    service_not_delivered: "Service non fourni", other: "Autre",
  },
  sla: "dans {h} h", slaOver: "En retard", noSla: "",
  mine: { sign: "À vous", waiting: "En attente d'un autre utilisateur finance", blocked: "Pas votre étape" },
  open: "Ouvrir",
  list: "Liste des approbations",
  empty: { title: "Rien ne vous attend", body: "Les nouvelles approbations apparaissent ici dès leur soumission.", tab: "Rien dans cet onglet." },
  bulk: {
    approve: "Approuver la sélection", only: "L'approbation groupée ne concerne que les répartitions ; le reste se signe un par un sur le dossier.",
    title: "Approuver {n} répartitions ?", body: "Total {amount}. Chaque répartition passe au prochain versement et est journalisée avec le même identifiant de lot.",
    confirm: "Approuver {n}", done: "{n} répartitions approuvées", offline: "Hors ligne, approbations désactivées.", loading: "Calcul du total…", cancel: "Annuler",
  },
  signedElsewhere: "{who} a approuvé {record}",
  someone: "Un autre utilisateur finance",
  sim: { signed: "Un autre utilisateur approuve une répartition" },
  failed: "Approbations",
};

const ALL: Record<Locale, Copy> = { en, rw, fr };
export const financeApprovals = (l: Locale): Copy => ALL[l] ?? en;
