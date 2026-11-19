// Workforce admin copy (Stage 12 lane F, /ops/workforce). rw/fr are first drafts for native review.
import type { Locale } from "@/shared/i18n/config";

const en = {
  title: "Workforce", sub: "Everyone who works on cases: internal staff, external agents and field agents.",
  approvals: "Approvals", add: "Add person", search: "Search name, email or service",
  seg: { all: "All", internal: "Internal", external: "External", field: "Field" },
  filters: { service: "Service", expertise: "Expertise", language: "Language", district: "District", available: "Available on", rating: "Min rating", status: "Status", any: "Any", clear: "Clear filters" },
  cols: { name: "Name", type: "Type", status: "Status", services: "Services", load: "Load", onTime: "On time", rating: "Rating", contractEnd: "Contract ends" },
  type: { internal: "Internal", external: "External", field: "Field" },
  empty: ["Nobody matches these filters.", "Clear a filter or add a person."],
  shown: "{n} people",
  tabs: { overview: "Overview", performance: "Performance", reviews: "Reviews", history: "History", documents: "Documents" },
    blocks: { title: "Never assign to", lede: "Clients this person must never be assigned to (conflict of interest).", client: "Client customer ID", reason: "Reason", add: "Add restriction", remove: "Remove", none: "No restrictions.", added: "Restriction added", removed: "Restriction removed", failed: "Could not save. Check the customer ID." },
  profile: {
    private: "Private details", address: "Address", phone: "Private phone", nationalId: "National ID", reveal: "Reveal", revealTitle: "Reveal private details",
    revealReason: "Why do you need to see this? It's recorded.", revealed: "Revealed — this view was recorded", contract: "Contract", contractEnd: "Ends", lastLogin: "Last sign-in",
    never: "Never", languages: "Languages", districts: "Districts", expertise: "Expertise", services: "Services", certs: "Certifications", openCases: "Open cases",
    sessionsRevoked: "Sessions revoked — this person is signed out everywhere.", noDocs: "No documents yet.", noHistory: "No history yet.", cases: "View cases",
  },
  kpi: { onTime: "On time (30 d)", rating: "Client rating", open: "Open cases", firstResponse: "First response (h)", completed90d: "Completed (90 d)", firstPassPct: "First-pass approval", reassignmentPct: "Reassigned away", revenue90d: "Earned share (90 d, RWF)" },
  contracts: { title: "Contracts", issue: "Issue contract", kind: "Document", kinds: { service_agreement: "Service agreement", sla: "Service level agreement", nda: "Non-disclosure agreement", licence: "Licence" } as Record<string, string>, start: "Starts", end: "Ends (optional)", notice: "Notice (days)", save: "Send for signature", sent: "Sent for signature.", none: "No contracts yet.", status: { pending_signature: "Awaiting signature", active: "Active", expiring: "Expiring", expired: "Expired", renewed: "Renewed", terminated: "Ended" } as Record<string, string>, externalOnly: "Contracts are issued to external agents." },
  cv: { title: "CV", education: "Education", experience: "Experience", expertise: "Expertise", years: "Years of experience", bio: "Summary", empty: "No CV entered at onboarding yet." },
  actions: { label: "Actions", suspend: "Suspend", reactivate: "Reactivate", terminate: "Offboard…", review: "New review" },
  status: {
    suspendTitle: "Suspend {name}", suspendBody: "They're signed out everywhere and can't take new work until reactivated.", reactivateTitle: "Reactivate {name}",
    reactivateBody: "Clearance still valid → Cleared. Otherwise they go back through onboarding.", reclear: "Needs re-clearance (send to onboarding)",
    reasons: { performance: "Performance", conduct: "Conduct", investigation: "Under investigation", leave: "Extended leave", resolved: "Issue resolved", other: "Other" },
    done: "{name} is now {status}",
  },
  review: {
    title: "Performance review", period: "Period", kpis: "KPIs (filled in automatically)", rating: "Manager rating", goals: "Goals for next period", comments: "Comments",
    ack: "Employee acknowledgement required", submit: "Submit review", done: "Review submitted", none: "No reviews yet.", by: "by {name}", status: { draft: "Draft", submitted: "Submitted", acknowledged: "Acknowledged" },
    needComments: "Add comments.", needRating: "Pick a rating.",
  },
  create: {
    title: "Add a person", sub: "They get an invitation by email. Account permissions are set by the system admin.", first: "First name", last: "Last name", email: "Email",
    phone: "Phone", type: "Engagement", field: "Field agent (does visits)", submit: "Send invitation", done: "Invitation sent to {email}", errEmail: "Enter a valid email.", errName: "Enter first and last name.",
  },
  off: {
    title: "Offboard {name}", steps: ["Reassign cases", "Offers", "Access", "Optional", "Summary"], reassignTitle: "Reassign open cases", keep: "Keep with worker until closed",
    pick: "Choose new assignee", noCases: "No open cases.", offersTitle: "Pending offers are withdrawn", noOffers: "No pending offers.",
    accessTitle: "Revoke access", accessBody: "Status becomes Terminated, sessions are revoked and the system admin is notified to close the account.",
    reason: "Reason for offboarding", optional: "Optional items", equipment: "Equipment returned", exit: "Exit interview done",
    summary: "Earnings stay payable — finance notified.", finish: "Finish offboarding", unresolved: "{n} cases still need a decision.", done: "{name} has been offboarded.",
  },
  apps: {
    link: "Applications", title: "Agent applications", sub: "People who applied at /join. Approve, decline or ask for more information.",
    empty: "No applications yet.", open: "To review", closed: "Decided",
    status: { received: "Received", under_review: "Under review", info_requested: "Info requested", approved: "Approved", rejected: "Not successful", invite_expired: "Invite expired", converted: "Account created" },
    kind: { individual: "Individual", firm: "Firm" }, submitted: "Submitted", email: "Email", services: "Services", expertise: "Expertise", regNumber: "Registration number", district: "District", note: "Note to the applicant",
    approve: "Approve", reject: "Decline", requestInfo: "Request info", fields: "Fields to fix", noteHint: "Required. The applicant sees this on /join/status.",
    done: "{ref} updated", decided: "Already decided.",
  },
  denied: "Only service managers can open workforce admin.",
};
type Copy = typeof en;

const rw: Copy = {
  title: "Abakozi", sub: "Abakora ku madosiye bose: abakozi b'imbere, abakozi bo hanze n'abakora mu murima.",
  approvals: "Ibyemezo", add: "Ongeramo umuntu", search: "Shaka izina, imeyili cyangwa serivisi",
  seg: { all: "Bose", internal: "Imbere", external: "Hanze", field: "Mu murima" },
  filters: { service: "Serivisi", expertise: "Ubuhanga", language: "Ururimi", district: "Akarere", available: "Aboneka ku wa", rating: "Amanota make", status: "Imiterere", any: "Byose", clear: "Kuraho muyunguruzi" },
  cols: { name: "Izina", type: "Ubwoko", status: "Imiterere", services: "Serivisi", load: "Akazi", onTime: "Ku gihe", rating: "Amanota", contractEnd: "Amasezerano arangira" },
  type: { internal: "Imbere", external: "Hanze", field: "Mu murima" },
  empty: ["Nta muntu uhuye n'ibyo wahisemo.", "Kuraho muyunguruzi cyangwa wongeremo umuntu."],
  shown: "Abantu {n}",
  tabs: { overview: "Incamake", performance: "Imikorere", reviews: "Isuzuma", history: "Amateka", documents: "Inyandiko" },
    blocks: { title: "Ntazahabwa", lede: "Abakiriya uyu muntu atagomba guhabwa (inyungu zivuguruzanya).", client: "Nimero y'umukiriya", reason: "Impamvu", add: "Ongeraho ikibuza", remove: "Kuraho", none: "Nta kibuza.", added: "Ikibuza cyongeweho", removed: "Ikibuza cyakuweho", failed: "Ntibyabitswe. Reba nimero y'umukiriya." },
  profile: {
    private: "Amakuru bwite", address: "Aderesi", phone: "Telefone bwite", nationalId: "Indangamuntu", reveal: "Erekana", revealTitle: "Erekana amakuru bwite",
    revealReason: "Kuki ukeneye kubibona? Biranditswe.", revealed: "Byagaragajwe — byanditswe", contract: "Amasezerano", contractEnd: "Birangira", lastLogin: "Yinjiye bwa nyuma",
    never: "Ntarinjira", languages: "Indimi", districts: "Uturere", expertise: "Ubuhanga", services: "Serivisi", certs: "Impamyabushobozi", openCases: "Amadosiye afunguye",
    sessionsRevoked: "Yasohowe muri konti hose.", noDocs: "Nta nyandiko.", noHistory: "Nta mateka.", cases: "Reba amadosiye",
  },
  kpi: { onTime: "Ku gihe (iminsi 30)", rating: "Amanota y'abakiriya", open: "Amadosiye afunguye", firstResponse: "Igisubizo cya mbere (h)", completed90d: "Byarangiye (iminsi 90)", firstPassPct: "Byemejwe ubwa mbere", reassignmentPct: "Byahawe abandi", revenue90d: "Umugabane winjije (iminsi 90, RWF)" },
  contracts: { title: "Amasezerano", issue: "Tanga amasezerano", kind: "Inyandiko", kinds: { service_agreement: "Amasezerano ya serivisi", sla: "Amasezerano y'urwego rwa serivisi", nda: "Amasezerano y'ibanga", licence: "Uruhushya" }, start: "Atangira", end: "Arangira (si ngombwa)", notice: "Integuza (iminsi)", save: "Ohereza ngo asinywe", sent: "Byoherejwe gusinywa.", none: "Nta masezerano arahari.", status: { pending_signature: "Ategereje gusinywa", active: "Arakora", expiring: "Ararangira", expired: "Yarangiye", renewed: "Yavuguruwe", terminated: "Yahagaritswe" }, externalOnly: "Amasezerano ahabwa abakozi bo hanze." },
  cv: { title: "Umwirondoro w'akazi", education: "Amashuri", experience: "Uburambe", expertise: "Ubuhanga", years: "Imyaka y'uburambe", bio: "Incamake", empty: "Nta mwirondoro w'akazi uranditswe." },
  actions: { label: "Ibikorwa", suspend: "Hagarika", reactivate: "Subizaho", terminate: "Sezerera…", review: "Isuzuma rishya" },
  status: {
    suspendTitle: "Hagarika {name}", suspendBody: "Arasohorwa hose kandi ntashobora gufata akazi gashya kugeza asubijweho.", reactivateTitle: "Subizaho {name}",
    reactivateBody: "Uruhushya rukiri rwiza → Yemerewe. Bitabaye ibyo asubira mu kwinjizwa.", reclear: "Akeneye kongera kwemezwa (mu kwinjizwa)",
    reasons: { performance: "Imikorere", conduct: "Imyitwarire", investigation: "Ari gukorwaho iperereza", leave: "Ikiruhuko kirekire", resolved: "Ikibazo cyakemutse", other: "Ibindi" },
    done: "{name} ubu ni {status}",
  },
  review: {
    title: "Isuzuma ry'imikorere", period: "Igihe", kpis: "Ibipimo (byuzuzwa byikora)", rating: "Amanota y'umuyobozi", goals: "Intego z'igihe gikurikira", comments: "Ibitekerezo",
    ack: "Umukozi agomba kwemeza ko yabibonye", submit: "Ohereza isuzuma", done: "Isuzuma ryoherejwe", none: "Nta suzuma rirakorwa.", by: "na {name}", status: { draft: "Umushinga", submitted: "Ryoherejwe", acknowledged: "Ryemejwe" },
    needComments: "Andika ibitekerezo.", needRating: "Hitamo amanota.",
  },
  create: {
    title: "Ongeramo umuntu", sub: "Ahabwa ubutumire kuri imeyili. Uburenganzira bushyirwaho n'ushinzwe sisitemu.", first: "Izina", last: "Irindi zina", email: "Imeyili",
    phone: "Telefone", type: "Ubwoko bw'akazi", field: "Ukora mu murima (asura)", submit: "Ohereza ubutumire", done: "Ubutumire bwoherejwe kuri {email}", errEmail: "Andika imeyili nyayo.", errName: "Andika amazina yombi.",
  },
  off: {
    title: "Sezerera {name}", steps: ["Amadosiye", "Ibyifuzo", "Uburenganzira", "Ibindi", "Incamake"], reassignTitle: "Ha abandi amadosiye afunguye", keep: "Ayagumane kugeza afunzwe",
    pick: "Hitamo uzayakora", noCases: "Nta madosiye afunguye.", offersTitle: "Ibyifuzo bitegereje birakurwaho", noOffers: "Nta byifuzo bitegereje.",
    accessTitle: "Kuraho uburenganzira", accessBody: "Aba Yasezerewe, asohorwa hose kandi ushinzwe sisitemu amenyeshwa gufunga konti.",
    reason: "Impamvu yo gusezerera", optional: "Ibitari ngombwa", equipment: "Ibikoresho byasubijwe", exit: "Ikiganiro cyo gusoza cyakozwe",
    summary: "Amafaranga yakoreye aracyishyurwa — imari yamenyeshejwe.", finish: "Soza", unresolved: "Amadosiye {n} aracyakeneye icyemezo.", done: "{name} yasezerewe.",
  },
  apps: {
    link: "Abasabye", title: "Abasaba kuba abakozi", sub: "Abasabye kuri /join. Emeza, wange cyangwa usabe andi makuru.",
    empty: "Nta busabe buraza.", open: "Ibyo gusuzuma", closed: "Byafashweho icyemezo",
    status: { received: "Byakiriwe", under_review: "Birasuzumwa", info_requested: "Hasabwe amakuru", approved: "Byemejwe", rejected: "Ntibyagenze neza", invite_expired: "Ubutumire bwarangiye", converted: "Konti yafunguwe" },
    kind: { individual: "Umuntu ku giti cye", firm: "Ikigo" }, submitted: "Byoherejwe", email: "Imeri", services: "Serivisi", expertise: "Ubumenyi", regNumber: "Nimero yo kwiyandikisha", district: "Akarere", note: "Ubutumwa ku musabye",
    approve: "Emeza", reject: "Wanga", requestInfo: "Saba amakuru", fields: "Ibyo gukosora", noteHint: "Birakenewe. Umusabye abibona kuri /join/status.",
    done: "{ref} byavuguruwe", decided: "Byamaze gufatwaho icyemezo.",
  },
  denied: "Abayobozi ba serivisi bonyine ni bo bafungura iki gice.",
};

const fr: Copy = {
  title: "Effectifs", sub: "Toutes les personnes qui traitent des dossiers : internes, agents externes et agents de terrain.",
  approvals: "Approbations", add: "Ajouter une personne", search: "Nom, e-mail ou service",
  seg: { all: "Tous", internal: "Internes", external: "Externes", field: "Terrain" },
  filters: { service: "Service", expertise: "Expertise", language: "Langue", district: "District", available: "Disponible le", rating: "Note min.", status: "Statut", any: "Tous", clear: "Effacer les filtres" },
  cols: { name: "Nom", type: "Type", status: "Statut", services: "Services", load: "Charge", onTime: "À l'heure", rating: "Note", contractEnd: "Fin de contrat" },
  type: { internal: "Interne", external: "Externe", field: "Terrain" },
  empty: ["Personne ne correspond à ces filtres.", "Retirez un filtre ou ajoutez une personne."],
  shown: "{n} personnes",
  tabs: { overview: "Aperçu", performance: "Performance", reviews: "Évaluations", history: "Historique", documents: "Documents" },
    blocks: { title: "Ne jamais affecter à", lede: "Clients auxquels cette personne ne doit jamais être affectée (conflit d'intérêts).", client: "N° client", reason: "Motif", add: "Ajouter une restriction", remove: "Retirer", none: "Aucune restriction.", added: "Restriction ajoutée", removed: "Restriction retirée", failed: "Enregistrement impossible. Vérifiez le n° client." },
  profile: {
    private: "Données privées", address: "Adresse", phone: "Téléphone privé", nationalId: "Pièce d'identité", reveal: "Afficher", revealTitle: "Afficher les données privées",
    revealReason: "Pourquoi devez-vous les voir ? C'est journalisé.", revealed: "Affiché — consultation journalisée", contract: "Contrat", contractEnd: "Fin", lastLogin: "Dernière connexion",
    never: "Jamais", languages: "Langues", districts: "Districts", expertise: "Expertise", services: "Services", certs: "Certifications", openCases: "Dossiers ouverts",
    sessionsRevoked: "Sessions révoquées — déconnecté partout.", noDocs: "Aucun document.", noHistory: "Aucun historique.", cases: "Voir les dossiers",
  },
  kpi: { onTime: "À l'heure (30 j)", rating: "Note clients", open: "Dossiers ouverts", firstResponse: "Première réponse (h)", completed90d: "Terminés (90 j)", firstPassPct: "Validés du premier coup", reassignmentPct: "Réattribués", revenue90d: "Part gagnée (90 j, RWF)" },
  contracts: { title: "Contrats", issue: "Émettre un contrat", kind: "Document", kinds: { service_agreement: "Contrat de service", sla: "Accord de niveau de service", nda: "Accord de confidentialité", licence: "Licence" }, start: "Début", end: "Fin (facultatif)", notice: "Préavis (jours)", save: "Envoyer pour signature", sent: "Envoyé pour signature.", none: "Aucun contrat.", status: { pending_signature: "En attente de signature", active: "Actif", expiring: "Expire bientôt", expired: "Expiré", renewed: "Renouvelé", terminated: "Terminé" }, externalOnly: "Les contrats sont émis aux agents externes." },
  cv: { title: "CV", education: "Formation", experience: "Expérience", expertise: "Expertise", years: "Années d'expérience", bio: "Résumé", empty: "Aucun CV saisi à l'intégration." },
  actions: { label: "Actions", suspend: "Suspendre", reactivate: "Réactiver", terminate: "Départ…", review: "Nouvelle évaluation" },
  status: {
    suspendTitle: "Suspendre {name}", suspendBody: "Déconnecté partout, aucune nouvelle tâche jusqu'à la réactivation.", reactivateTitle: "Réactiver {name}",
    reactivateBody: "Habilitation valide → Habilité. Sinon retour en intégration.", reclear: "Ré-habilitation nécessaire (intégration)",
    reasons: { performance: "Performance", conduct: "Comportement", investigation: "Enquête en cours", leave: "Congé prolongé", resolved: "Problème résolu", other: "Autre" },
    done: "{name} est maintenant {status}",
  },
  review: {
    title: "Évaluation de performance", period: "Période", kpis: "Indicateurs (remplis automatiquement)", rating: "Note du responsable", goals: "Objectifs de la prochaine période", comments: "Commentaires",
    ack: "Accusé de lecture de l'employé requis", submit: "Envoyer l'évaluation", done: "Évaluation envoyée", none: "Aucune évaluation.", by: "par {name}", status: { draft: "Brouillon", submitted: "Envoyée", acknowledged: "Lue" },
    needComments: "Ajoutez des commentaires.", needRating: "Choisissez une note.",
  },
  create: {
    title: "Ajouter une personne", sub: "Une invitation est envoyée par e-mail. Les droits du compte sont définis par l'admin système.", first: "Prénom", last: "Nom", email: "E-mail",
    phone: "Téléphone", type: "Engagement", field: "Agent de terrain (visites)", submit: "Envoyer l'invitation", done: "Invitation envoyée à {email}", errEmail: "Saisissez un e-mail valide.", errName: "Saisissez prénom et nom.",
  },
  off: {
    title: "Départ de {name}", steps: ["Dossiers", "Offres", "Accès", "Optionnel", "Résumé"], reassignTitle: "Réaffecter les dossiers ouverts", keep: "Garder jusqu'à la clôture",
    pick: "Choisir un nouvel affecté", noCases: "Aucun dossier ouvert.", offersTitle: "Les offres en attente sont retirées", noOffers: "Aucune offre en attente.",
    accessTitle: "Révoquer l'accès", accessBody: "Le statut passe à Résilié, les sessions sont révoquées et l'admin système est prévenu.",
    reason: "Motif du départ", optional: "Éléments optionnels", equipment: "Matériel restitué", exit: "Entretien de sortie fait",
    summary: "Les gains restent payables — la finance est prévenue.", finish: "Terminer le départ", unresolved: "{n} dossiers attendent une décision.", done: "Départ de {name} enregistré.",
  },
  apps: {
    link: "Candidatures", title: "Candidatures d'agents", sub: "Personnes ayant postulé sur /join. Approuver, refuser ou demander des informations.",
    empty: "Aucune candidature.", open: "À examiner", closed: "Décidées",
    status: { received: "Reçue", under_review: "En examen", info_requested: "Infos demandées", approved: "Approuvée", rejected: "Non retenue", invite_expired: "Invitation expirée", converted: "Compte créé" },
    kind: { individual: "Individuel", firm: "Cabinet" }, submitted: "Envoyée", email: "E-mail", services: "Services", expertise: "Expertise", regNumber: "Numéro d'enregistrement", district: "District", note: "Message au candidat",
    approve: "Approuver", reject: "Refuser", requestInfo: "Demander des infos", fields: "Champs à corriger", noteHint: "Obligatoire. Le candidat le voit sur /join/status.",
    done: "{ref} mis à jour", decided: "Déjà décidée.",
  },
  denied: "Seuls les responsables de service ont accès.",
};

const COPY: Record<Locale, Copy> = { en, rw, fr };
export const opsWorkforce = (l: Locale) => COPY[l] ?? en;
export const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
