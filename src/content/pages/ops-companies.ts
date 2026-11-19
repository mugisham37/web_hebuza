// ORG-04 staff view: company list, detail and verification. rw/fr are first drafts for native review.
import type { Locale } from "@/shared/i18n/config";

const en = {
  title: "Companies",
  lede: "Company profiles, their representatives and verification.",
  search: "Search name, TIN or customer ID",
  all: "All",
  status: { unverified: "Not verified", pending_verification: "Verification pending", verified: "Verified", rejected: "Needs correction" },
  cols: { name: "Company", tin: "TIN", customer: "Customer ID", members: "Reps", status: "Status", created: "Created" },
  dupTin: "Same TIN as another company",
  empty: "No companies match.",
  reps: "Representatives",
  requests: "Requests",
  none: "None yet",
  verify: "Mark verified",
  reject: "Request correction",
  note: "What needs correcting",
  noteHint: "The owner sees this note.",
  done: "Saved",
  failed: "Could not save. Try again.",
  close: "Close",
};
export type CompaniesCopy = typeof en;

const rw: CompaniesCopy = {
  title: "Ibigo",
  lede: "Imyirondoro y'ibigo, ababihagarariye no kubyemeza.",
  search: "Shakisha izina, TIN cyangwa nimero y'umukiriya",
  all: "Byose",
  status: { unverified: "Ntikiremezwa", pending_verification: "Gitegereje kwemezwa", verified: "Cyemejwe", rejected: "Gikeneye gukosorwa" },
  cols: { name: "Ikigo", tin: "TIN", customer: "Nimero y'umukiriya", members: "Abahagarariye", status: "Imimerere", created: "Cyafunguwe" },
  dupTin: "TIN imwe n'iy'ikindi kigo",
  empty: "Nta kigo gihuye.",
  reps: "Abahagarariye",
  requests: "Ubusabe",
  none: "Nta na kimwe",
  verify: "Emeza",
  reject: "Saba gukosora",
  note: "Igikwiye gukosorwa",
  noteHint: "Nyiri ikigo azabona iyi nyandiko.",
  done: "Byabitswe",
  failed: "Ntibyabitswe. Ongera ugerageze.",
  close: "Funga",
};

const fr: CompaniesCopy = {
  title: "Entreprises",
  lede: "Profils d'entreprise, représentants et vérification.",
  search: "Rechercher nom, NIF ou n° client",
  all: "Toutes",
  status: { unverified: "Non vérifiée", pending_verification: "Vérification en attente", verified: "Vérifiée", rejected: "À corriger" },
  cols: { name: "Entreprise", tin: "NIF", customer: "N° client", members: "Représentants", status: "Statut", created: "Créée" },
  dupTin: "Même NIF qu'une autre entreprise",
  empty: "Aucune entreprise ne correspond.",
  reps: "Représentants",
  requests: "Demandes",
  none: "Aucun",
  verify: "Marquer vérifiée",
  reject: "Demander une correction",
  note: "Ce qu'il faut corriger",
  noteHint: "Le propriétaire voit cette note.",
  done: "Enregistré",
  failed: "Enregistrement impossible. Réessayez.",
  close: "Fermer",
};

export const opsCompanies = (l: Locale): CompaniesCopy => ({ en, fr, rw })[l];
