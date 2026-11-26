// Lane F copy (office: /ops/field, case Field tab, finance field queues). rw/fr are first drafts for native review.
import type { L3 } from "@/shared/field/types";

const en = {
  title: "Field review", sub: "Flagged check-ins, conflicts, expense claims and documents in custody.",
  tabs: { flags: "Flags", conflicts: "Conflicts", expenses: "Expenses", custody: "Custody", visits: "Visits" },
  kpi: { flags: "Flags to review", conflicts: "Conflicts", expenses: "Claims waiting", custody: "Originals out" },
  request: "Request field visit",
  flags: { empty: "No flagged check-ins", emptyBody: "Far-from-pin, no-GPS and gallery photos show here.", review: "Mark reviewed", reviewed: "Reviewed", open: "Open evidence" },
  conflicts: {
    empty: "No escalated conflicts", emptyBody: "When an agent keeps their change after an office edit, it lands here.",
    office: "Office version", agent: "Agent's change", merged: "Auto-merged", review: "Needs review", accept: "Accept agent's change", keep: "Keep office version",
    note: "Note to the agent", done: "Conflict resolved", status: { open: "Open", accepted_agent: "Agent's change accepted", kept_office: "Office version kept" },
  },
  exp: {
    empty: "Nothing to approve", emptyBody: "Claims appear here after the agent submits them.", approve: "Approve", reject: "Reject", bulk: "Approve {n} selected",
    bulkMax: "Up to 20 at a time.", rejectTitle: "Reject expense", reasons: ["No valid receipt", "Not linked to field work", "Above policy without reason", "Duplicate claim", "Other"],
    approved: "Approved", rejected: "Rejected", claimant: "Agent", amount: "Amount", category: "Category", visit: "Visit", date: "Date", state: "State",
    sod: "You can't approve this: approvers must differ from the claimant and from the first approver.", wrong: "This claim is no longer at your level.", select: "Select {ref}", selectAll: "Select all",
    l1: "Service manager approval (L1)", l2: "Finance approval (L2)", receipt: "Receipt", noReceipt: "No receipt",
  },
  custody: { empty: "No originals out", emptyBody: "Documents collected by field agents show here until returned or deposited.", receive: "Received from agent", received: "Marked as received", age: "Out for {time}", items: "{n} originals" },
  visits: { empty: "No field visits", agent: "Agent", window: "Window", status: "Status" },
  ev: {
    title: "Visit evidence", checkin: "Check-in", checkout: "Check-out", noFix: "No GPS fix", acc: "±{a} m", dist: "{d} from pin", reason: "Reason: {r}",
    photos: "Photos", scans: "Scans", receipts: "Receipts", custody: "Custody", expenses: "Expenses", notes: "Notes", incidents: "Incidents",
    none: "None", pdf: "PDF", hash: "SHA-256", copy: "Copy hash", copied: "Hash copied", status: { scanning: "Scanning", available: "Available" },
    stages: { with_agent: "With agent", with_office: "With office", returned_to_client: "Returned to client", deposited: "Deposited", lost: "Lost", damaged: "Damaged" },
    plot: "Pin and check-in position", pin: "Visit pin", fix: "Check-in", outcome: "Outcome",
  },
  create: {
    title: "Request field visit", caseRef: "Case reference", purpose: "Purpose", vtitle: "Title", todo: "What to do", institution: "Institution (optional)", address: "Address",
    lat: "Latitude (optional)", lng: "Longitude (optional)", start: "From (Kigali time)", end: "To", checklist: "Checklist (one per line)", assignee: "Field agent",
    save: "Request visit", created: "Visit {ref} requested, the agent is notified.", invalid: "Fill in purpose, title, address and a future window.",
  },
  cash: {
    title: "Cash to confirm", empty: "No cash waiting", emptyBody: "Cash collected in the field appears after the agent records it.", agent: "Agent", amount: "Amount", visit: "Visit",
    age: "Age", status: "Status", escalated: "Escalated (48 h+)", confirm: "Confirm", confirmTitle: "Confirm cash deposit", depositRef: "Deposit reference", evidence: "Evidence reference",
    reason: "Reason / check performed", needsTwo: "At or above {t}: a second finance user must also confirm.", oneOfTwo: "1 of 2 confirmations", confirmed: "Confirmed",
    same: "A different finance user must give the second confirmation.", notDeposited: "The agent hasn't marked this as deposited yet.",
    states: { recorded: "Recorded", deposited: "Deposited", confirmed: "Confirmed", disputed: "Disputed" },
  },
  finance: { title: "Field claims & cash", tabs: { expenses: "Expense claims (L2)", cash: "Cash to confirm" } },
  tabTitle: "Field visits for this case", tabEmpty: "No field visits on this case yet.",
};
export type CopyF = typeof en;

const fr: CopyF = {
  title: "Revue terrain", sub: "Pointages signalés, conflits, notes de frais et documents en garde.",
  tabs: { flags: "Signalements", conflicts: "Conflits", expenses: "Dépenses", custody: "Garde", visits: "Visites" },
  kpi: { flags: "Signalements à revoir", conflicts: "Conflits", expenses: "Dépenses en attente", custody: "Originaux sortis" },
  request: "Demander une visite terrain",
  flags: { empty: "Aucun pointage signalé", emptyBody: "Pointages loin du repère, sans GPS ou photos de galerie.", review: "Marquer revu", reviewed: "Revu", open: "Voir les preuves" },
  conflicts: {
    empty: "Aucun conflit escaladé", emptyBody: "Quand un agent garde sa modification après une modification du bureau, elle arrive ici.",
    office: "Version du bureau", agent: "Modification de l'agent", merged: "Fusion automatique", review: "À examiner", accept: "Accepter la modification de l'agent", keep: "Garder la version du bureau",
    note: "Note à l'agent", done: "Conflit résolu", status: { open: "Ouvert", accepted_agent: "Modification acceptée", kept_office: "Version du bureau gardée" },
  },
  exp: {
    empty: "Rien à approuver", emptyBody: "Les dépenses apparaissent après soumission par l'agent.", approve: "Approuver", reject: "Refuser", bulk: "Approuver {n} sélectionnées",
    bulkMax: "Jusqu'à 20 à la fois.", rejectTitle: "Refuser la dépense", reasons: ["Pas de reçu valable", "Sans lien avec le terrain", "Au-dessus de la règle sans motif", "Dépense en double", "Autre"],
    approved: "Approuvée", rejected: "Refusée", claimant: "Agent", amount: "Montant", category: "Catégorie", visit: "Visite", date: "Date", state: "État",
    sod: "Impossible : l'approbateur doit différer du demandeur et du premier approbateur.", wrong: "Cette dépense n'est plus à votre niveau.", select: "Sélectionner {ref}", selectAll: "Tout sélectionner",
    l1: "Approbation responsable (N1)", l2: "Approbation finance (N2)", receipt: "Reçu", noReceipt: "Sans reçu",
  },
  custody: { empty: "Aucun original sorti", emptyBody: "Les documents récupérés restent ici jusqu'au retour ou au dépôt.", receive: "Reçu de l'agent", received: "Marqué comme reçu", age: "Sorti depuis {time}", items: "{n} originaux" },
  visits: { empty: "Aucune visite terrain", agent: "Agent", window: "Créneau", status: "Statut" },
  ev: {
    title: "Preuves de la visite", checkin: "Arrivée", checkout: "Départ", noFix: "Pas de position GPS", acc: "±{a} m", dist: "à {d} du repère", reason: "Motif : {r}",
    photos: "Photos", scans: "Scans", receipts: "Reçus", custody: "Garde", expenses: "Dépenses", notes: "Notes", incidents: "Incidents",
    none: "Aucun", pdf: "PDF", hash: "SHA-256", copy: "Copier l'empreinte", copied: "Empreinte copiée", status: { scanning: "Analyse", available: "Disponible" },
    stages: { with_agent: "Chez l'agent", with_office: "Au bureau", returned_to_client: "Rendu au client", deposited: "Déposé", lost: "Perdu", damaged: "Endommagé" },
    plot: "Repère et position d'arrivée", pin: "Repère de la visite", fix: "Arrivée", outcome: "Résultat",
  },
  create: {
    title: "Demander une visite terrain", caseRef: "Référence du dossier", purpose: "Objet", vtitle: "Titre", todo: "À faire", institution: "Institution (facultatif)", address: "Adresse",
    lat: "Latitude (facultatif)", lng: "Longitude (facultatif)", start: "De (heure de Kigali)", end: "À", checklist: "Liste (une ligne par élément)", assignee: "Agent terrain",
    save: "Demander la visite", created: "Visite {ref} demandée, l'agent est prévenu.", invalid: "Renseignez objet, titre, adresse et un créneau futur.",
  },
  cash: {
    title: "Espèces à confirmer", empty: "Aucune espèce en attente", emptyBody: "Les espèces encaissées apparaissent après enregistrement par l'agent.", agent: "Agent", amount: "Montant", visit: "Visite",
    age: "Âge", status: "Statut", escalated: "Escaladé (48 h+)", confirm: "Confirmer", confirmTitle: "Confirmer le dépôt", depositRef: "Référence du dépôt", evidence: "Référence de la preuve",
    reason: "Motif / contrôle effectué", needsTwo: "À partir de {t} : un second utilisateur finance doit aussi confirmer.", oneOfTwo: "1 confirmation sur 2", confirmed: "Confirmé",
    same: "Un autre utilisateur finance doit donner la seconde confirmation.", notDeposited: "L'agent n'a pas encore marqué le dépôt.",
    states: { recorded: "Enregistré", deposited: "Déposé", confirmed: "Confirmé", disputed: "Contesté" },
  },
  finance: { title: "Dépenses terrain et espèces", tabs: { expenses: "Dépenses (N2)", cash: "Espèces à confirmer" } },
  tabTitle: "Visites terrain du dossier", tabEmpty: "Aucune visite terrain sur ce dossier.",
};

const rw: CopyF = {
  title: "Isuzuma ry'ibyo mu murima", sub: "Kwinjira kwagaragajwe, amakimbirane, amafaranga yasabwe n'inyandiko zirinzwe.",
  tabs: { flags: "Ibyagaragajwe", conflicts: "Amakimbirane", expenses: "Amafaranga", custody: "Kurinda", visits: "Ingendo" },
  kpi: { flags: "Ibyo gusuzuma", conflicts: "Amakimbirane", expenses: "Ibitegereje", custody: "Inyandiko zisohotse" },
  request: "Saba uruzinduko",
  flags: { empty: "Nta kwinjira kwagaragajwe", emptyBody: "Kure y'ikimenyetso, nta GPS cyangwa amafoto yo mu bubiko bigaragara hano.", review: "Byasuzumwe", reviewed: "Byasuzumwe", open: "Reba ibimenyetso" },
  conflicts: {
    empty: "Nta makimbirane yazamuwe", emptyBody: "Iyo umukozi agumana impinduka ze nyuma y'iz'ibiro, biza hano.",
    office: "Iby'ibiro", agent: "Impinduka z'umukozi", merged: "Byahujwe byikora", review: "Bikeneye isuzuma", accept: "Emera impinduka z'umukozi", keep: "Guma ku by'ibiro",
    note: "Ubutumwa ku mukozi", done: "Byakemuwe", status: { open: "Bifunguye", accepted_agent: "Byemewe", kept_office: "Iby'ibiro byagumye" },
  },
  exp: {
    empty: "Nta byo kwemeza", emptyBody: "Amafaranga yasabwe agaragara hano.", approve: "Emeza", reject: "Anga", bulk: "Emeza {n} byatoranyijwe",
    bulkMax: "Kugeza kuri 20 icyarimwe.", rejectTitle: "Anga amafaranga", reasons: ["Nta nyemezabwishyu yemewe", "Ntibijyanye n'akazi ko mu murima", "Birenze amategeko nta mpamvu", "Byasabwe kabiri", "Ibindi"],
    approved: "Byemejwe", rejected: "Byanzwe", claimant: "Umukozi", amount: "Amafaranga", category: "Ubwoko", visit: "Uruzinduko", date: "Itariki", state: "Uko bihagaze",
    sod: "Ntushobora kwemeza: uwemeza agomba kuba atandukanye n'uwasabye n'uwemeje mbere.", wrong: "Ibi ntibikiri ku rwego rwawe.", select: "Hitamo {ref}", selectAll: "Hitamo byose",
    l1: "Kwemezwa n'umuyobozi (L1)", l2: "Kwemezwa n'imari (L2)", receipt: "Inyemezabwishyu", noReceipt: "Nta nyemezabwishyu",
  },
  custody: { empty: "Nta nyandiko z'umwimerere zisohotse", emptyBody: "Inyandiko zafashwe ziguma hano kugeza zisubijwe cyangwa zitanzwe.", receive: "Nakiriye ku mukozi", received: "Byakiriwe", age: "Zimaze {time}", items: "Inyandiko {n}" },
  visits: { empty: "Nta ngendo", agent: "Umukozi", window: "Igihe", status: "Uko bihagaze" },
  ev: {
    title: "Ibimenyetso by'uruzinduko", checkin: "Kugera", checkout: "Kugenda", noFix: "Nta GPS", acc: "±{a} m", dist: "{d} uvuye ku kimenyetso", reason: "Impamvu: {r}",
    photos: "Amafoto", scans: "Scan", receipts: "Inyemezabwishyu", custody: "Kurinda", expenses: "Amafaranga", notes: "Inyandiko", incidents: "Ibibazo",
    none: "Nta na kimwe", pdf: "PDF", hash: "SHA-256", copy: "Koporora", copied: "Byakoporowe", status: { scanning: "Birasuzumwa", available: "Biraboneka" },
    stages: { with_agent: "Ku mukozi", with_office: "Ku biro", returned_to_client: "Byasubijwe umukiriya", deposited: "Byatanzwe", lost: "Byabuze", damaged: "Byangiritse" },
    plot: "Ikimenyetso n'aho yageze", pin: "Ikimenyetso", fix: "Kugera", outcome: "Umusaruro",
  },
  create: {
    title: "Saba uruzinduko", caseRef: "Nomero ya dosiye", purpose: "Intego", vtitle: "Umutwe", todo: "Icyo gukora", institution: "Ikigo (bitari ngombwa)", address: "Aderesi",
    lat: "Latitude (bitari ngombwa)", lng: "Longitude (bitari ngombwa)", start: "Kuva (isaha ya Kigali)", end: "Kugeza", checklist: "Urutonde (kimwe ku murongo)", assignee: "Umukozi wo mu murima",
    save: "Saba", created: "Uruzinduko {ref} rwasabwe, umukozi yamenyeshejwe.", invalid: "Uzuza intego, umutwe, aderesi n'igihe kiri imbere.",
  },
  cash: {
    title: "Amafaranga yo kwemeza", empty: "Nta mafaranga ategereje", emptyBody: "Amafaranga yakiriwe mu murima agaragara hano.", agent: "Umukozi", amount: "Amafaranga", visit: "Uruzinduko",
    age: "Igihe", status: "Uko bihagaze", escalated: "Byazamuwe (48 h+)", confirm: "Emeza", confirmTitle: "Emeza ko yashyizwe kuri banki", depositRef: "Nomero ya banki", evidence: "Nomero y'ikimenyetso",
    reason: "Impamvu / igenzura ryakozwe", needsTwo: "Guhera kuri {t}: undi mukozi w'imari agomba kwemeza.", oneOfTwo: "Byemejwe 1 kuri 2", confirmed: "Byemejwe",
    same: "Undi mukozi w'imari agomba kwemeza ubwa kabiri.", notDeposited: "Umukozi ntaremeza ko yashyize kuri banki.",
    states: { recorded: "Byanditswe", deposited: "Byashyizwe kuri banki", confirmed: "Byemejwe", disputed: "Biraburanwa" },
  },
  finance: { title: "Amafaranga yo mu murima", tabs: { expenses: "Amafaranga (L2)", cash: "Amafaranga yo kwemeza" } },
  tabTitle: "Ingendo z'iyi dosiye", tabEmpty: "Nta ngendo kuri iyi dosiye.",
};

const ALL: Record<L3, CopyF> = { en, fr, rw };
export const copyF = (l: string) => ALL[(l as L3) in ALL ? (l as L3) : "en"];
