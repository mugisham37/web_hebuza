// REQ-12 assisted submission copy. rw/fr are first drafts for native review.
import type { Locale } from "@/shared/i18n/config";

const en = {
  title: "File a request for a client",
  lede: "For clients who asked us in person or by phone. They receive the tracking code and a link to add it to their account.",
  service: "Service", tier: "Tier", name: "Client's full name", phone: "Client's phone", email: "Client's email", nid: "National ID",
  summary: "What the client needs", consent: "How did the client consent?",
  consents: { verbal: "Verbal (phone or in person)", signed: "Signed form", field_visit: "During a field visit" },
  consentNote: "Consent note (who, when)", submit: "File the request", done: "Filed {code}. The client was sent the code.",
  contactRequired: "Add a phone or an email.", failed: "Could not file the request. Check the fields.",
};
export type AssistedCopy = typeof en;
const rw: AssistedCopy = {
  title: "Tanga ubusabe mu izina ry'umukiriya", lede: "Ku bakiriya badusabye imbonankubone cyangwa kuri telefoni. Bahabwa nimero n'umurongo wo kubwongera kuri konti yabo.",
  service: "Serivisi", tier: "Icyiciro", name: "Amazina y'umukiriya", phone: "Telefoni y'umukiriya", email: "Imeyili y'umukiriya", nid: "Indangamuntu",
  summary: "Icyo umukiriya akeneye", consent: "Umukiriya yemeye ate?",
  consents: { verbal: "Mu magambo (telefoni cyangwa imbonankubone)", signed: "Ifishi yasinywe", field_visit: "Mu gusura aho ari" },
  consentNote: "Ibisobanuro ku kwemera (nde, ryari)", submit: "Ohereza ubusabe", done: "{code} yoherejwe. Umukiriya yahawe nimero.",
  contactRequired: "Shyiramo telefoni cyangwa imeyili.", failed: "Ntibyoherejwe. Reba ibyo wujuje.",
};
const fr: AssistedCopy = {
  title: "Déposer une demande pour un client", lede: "Pour les clients venus en personne ou par téléphone. Ils reçoivent le code de suivi et un lien pour l'ajouter à leur compte.",
  service: "Service", tier: "Formule", name: "Nom complet du client", phone: "Téléphone du client", email: "E-mail du client", nid: "Carte d'identité",
  summary: "Besoin du client", consent: "Comment le client a-t-il consenti ?",
  consents: { verbal: "Oral (téléphone ou en personne)", signed: "Formulaire signé", field_visit: "Lors d'une visite terrain" },
  consentNote: "Note de consentement (qui, quand)", submit: "Déposer la demande", done: "{code} déposée. Le code a été envoyé au client.",
  contactRequired: "Ajoutez un téléphone ou un e-mail.", failed: "Dépôt impossible. Vérifiez les champs.",
};
export const opsAssisted = (l: Locale): AssistedCopy => ({ en, fr, rw })[l];
