import type { Locale } from "@/shared/i18n/config";
import { ROLE_META, type Role, type Workspace } from "@/shared/auth/roles";

// Role-aware sign-in (?as=<slug>): slug = workspace. UI hint only — the server decides what the account may open.
export const AUTH_ROLES = ["client", "agent", "work", "ops", "finance", "marketing", "procurement", "partners", "exec", "system"] as const satisfies readonly Workspace[];
export type AuthRole = (typeof AUTH_ROLES)[number];
// Sign-in picker: only roles held by real stakeholders; ops/finance/marketing/procurement/exec are run by the system admin (workspace tabs).
export const SIGN_IN_ROLES = ["client", "agent", "work", "partners", "system"] as const satisfies readonly AuthRole[];
export const isSignInRole = (s: string | null | undefined): s is AuthRole => !!s && (SIGN_IN_ROLES as readonly string[]).includes(s);
export const isAuthRole = (s: string | null | undefined): s is AuthRole => !!s && (AUTH_ROLES as readonly string[]).includes(s);
export const roleHome = (r: AuthRole) => Object.values(ROLE_META).find((m) => m.workspace === r)!.home;
export const roleOf = (r: AuthRole) => (Object.keys(ROLE_META) as Exclude<Role, "visitor">[]).find((k) => ROLE_META[k].workspace === r)!;

type RoleCopy = { name: string; title: string; lede: string; headline: string; line: string };
type Copy = {
  roles: Record<AuthRole, RoleCopy>;
  pickerLabel: string; signingInAs: string; invite: string; inviteWork: string; joinAgent: string;
  signupInvite: string; backToLogin: string; demo: string; signedInAs: string;
  steps: { title: string; items: [string, string, string] };
};

const en: Copy = {
  roles: {
    client: { name: "Client", title: "Welcome back", lede: "Sign in to apply, pay and track your requests.", headline: "Your requests, one place.", line: "Apply, pay and follow every service from start to finish." },
    agent: { name: "Agent", title: "Team sign‑in · Agent", lede: "Use your HEBUZA work email.", headline: "Serve clients, case by case.", line: "Your queue, deliverables and calendar." },
    work: { name: "Work", title: "Partner sign‑in · Work", lede: "Sign in to your partner agent workspace.", headline: "Your field work, organised.", line: "Offers, jobs and earnings in one workspace." },
    ops: { name: "Ops", title: "Team sign‑in · Ops", lede: "Use your HEBUZA work email.", headline: "Keep every request moving.", line: "Queues, SLAs and assignments across the team." },
    finance: { name: "Finance", title: "Team sign‑in · Finance", lede: "Use your HEBUZA work email.", headline: "Money in, money out, reconciled.", line: "Invoices, payments, payouts and approvals." },
    marketing: { name: "Marketing", title: "Team sign‑in · Marketing", lede: "Use your HEBUZA work email.", headline: "Tell the HEBUZA story.", line: "Campaigns, content and CRM." },
    procurement: { name: "Procurement", title: "Team sign‑in · Procurement", lede: "Use your HEBUZA work email.", headline: "Buy right, on time.", line: "Requests, suppliers and purchase orders." },
    partners: { name: "Partners", title: "Team sign‑in · Partners", lede: "Use your HEBUZA work email.", headline: "Grow the partner network.", line: "Partner agencies, members and performance." },
    exec: { name: "Executive", title: "Team sign‑in · Executive", lede: "Use your HEBUZA work email.", headline: "The whole business at a glance.", line: "Overview, approvals and reports." },
    system: { name: "System", title: "Team sign‑in · System", lede: "Use your HEBUZA work email. Every action is audited.", headline: "Keep the platform safe.", line: "Users, settings, security and audit." },
  },
  pickerLabel: "Sign in as", signingInAs: "Signing in as {role}",
  invite: "Access is by invitation, ask your manager or HEBUZA.", inviteWork: "Access is by invitation, ask your agency or HEBUZA.",
  joinAgent: "Want to join as an agent?", signupInvite: "{role} accounts are created by invitation only. Ask your manager or HEBUZA.",
  backToLogin: "Back to sign-in", demo: "Use demo account", signedInAs: "You're signed in as {role}",
  steps: { title: "Getting started", items: ["Create account", "Verify your email", "Start your first request"] },
};

const fr: Copy = {
  roles: {
    client: { name: "Client", title: "Bon retour", lede: "Connectez-vous pour demander, payer et suivre vos demandes.", headline: "Vos demandes, au même endroit.", line: "Demandez, payez et suivez chaque service du début à la fin." },
    agent: { name: "Agent", title: "Connexion équipe · Agent", lede: "Utilisez votre e-mail professionnel HEBUZA.", headline: "Servir les clients, dossier par dossier.", line: "Votre file, vos livrables et votre agenda." },
    work: { name: "Travail", title: "Connexion partenaire · Travail", lede: "Connectez-vous à votre espace agent partenaire.", headline: "Votre travail terrain, organisé.", line: "Offres, missions et gains en un seul espace." },
    ops: { name: "Opérations", title: "Connexion équipe · Opérations", lede: "Utilisez votre e-mail professionnel HEBUZA.", headline: "Faire avancer chaque demande.", line: "Files, délais et attributions de l'équipe." },
    finance: { name: "Finance", title: "Connexion équipe · Finance", lede: "Utilisez votre e-mail professionnel HEBUZA.", headline: "Entrées, sorties, rapprochées.", line: "Factures, paiements, versements et approbations." },
    marketing: { name: "Marketing", title: "Connexion équipe · Marketing", lede: "Utilisez votre e-mail professionnel HEBUZA.", headline: "Raconter l'histoire HEBUZA.", line: "Campagnes, contenus et CRM." },
    procurement: { name: "Achats", title: "Connexion équipe · Achats", lede: "Utilisez votre e-mail professionnel HEBUZA.", headline: "Bien acheter, à temps.", line: "Demandes, fournisseurs et bons de commande." },
    partners: { name: "Partenaires", title: "Connexion équipe · Partenaires", lede: "Utilisez votre e-mail professionnel HEBUZA.", headline: "Développer le réseau partenaire.", line: "Agences partenaires, membres et performance." },
    exec: { name: "Direction", title: "Connexion équipe · Direction", lede: "Utilisez votre e-mail professionnel HEBUZA.", headline: "Toute l'activité d'un coup d'œil.", line: "Vue d'ensemble, approbations et rapports." },
    system: { name: "Système", title: "Connexion équipe · Système", lede: "Utilisez votre e-mail professionnel HEBUZA. Chaque action est journalisée.", headline: "Garder la plateforme sûre.", line: "Utilisateurs, paramètres, sécurité et audit." },
  },
  pickerLabel: "Se connecter en tant que", signingInAs: "Connexion en tant que {role}",
  invite: "Accès sur invitation, demandez à votre responsable ou à HEBUZA.", inviteWork: "Accès sur invitation, demandez à votre agence ou à HEBUZA.",
  joinAgent: "Vous voulez devenir agent ?", signupInvite: "Les comptes {role} sont créés sur invitation uniquement. Demandez à votre responsable ou à HEBUZA.",
  backToLogin: "Retour à la connexion", demo: "Utiliser le compte démo", signedInAs: "Vous êtes connecté en tant que {role}",
  steps: { title: "Pour commencer", items: ["Créer un compte", "Vérifier votre e-mail", "Lancer votre première demande"] },
};

const rw: Copy = {
  roles: {
    client: { name: "Umukiriya", title: "Murakaza neza", lede: "Injira usabe, wishyure kandi ukurikirane ibyo wasabye.", headline: "Ibyo wasabye byose hamwe.", line: "Saba, wishyure kandi ukurikirane serivisi kuva itangiye kugeza irangiye." },
    agent: { name: "Umukozi", title: "Kwinjira kw'ikipe · Umukozi", lede: "Koresha imeyili y'akazi ya HEBUZA.", headline: "Fasha abakiriya, dosiye ku yindi.", line: "Urutonde rwawe, ibyo gutanga na kalendari." },
    work: { name: "Akazi", title: "Kwinjira kw'umufatanyabikorwa · Akazi", lede: "Injira mu mwanya w'umukozi w'umufatanyabikorwa.", headline: "Akazi kawe ko hanze, gateguwe.", line: "Ibyifuzo, imirimo n'ibyo winjiza ahantu hamwe." },
    ops: { name: "Ibikorwa", title: "Kwinjira kw'ikipe · Ibikorwa", lede: "Koresha imeyili y'akazi ya HEBUZA.", headline: "Buri busabe bugende imbere.", line: "Imirongo, igihe ntarengwa n'inshingano z'ikipe." },
    finance: { name: "Imari", title: "Kwinjira kw'ikipe · Imari", lede: "Koresha imeyili y'akazi ya HEBUZA.", headline: "Amafaranga yinjira n'asohoka, ahujwe.", line: "Inyemezabuguzi, kwishyura, kwishyurwa n'kwemeza." },
    marketing: { name: "Kwamamaza", title: "Kwinjira kw'ikipe · Kwamamaza", lede: "Koresha imeyili y'akazi ya HEBUZA.", headline: "Vuga inkuru ya HEBUZA.", line: "Ubukangurambaga, ibikubiyemo na CRM." },
    procurement: { name: "Amasoko", title: "Kwinjira kw'ikipe · Amasoko", lede: "Koresha imeyili y'akazi ya HEBUZA.", headline: "Gura neza, ku gihe.", line: "Ubusabe, abatanga ibicuruzwa n'amabwiriza yo kugura." },
    partners: { name: "Abafatanyabikorwa", title: "Kwinjira kw'ikipe · Abafatanyabikorwa", lede: "Koresha imeyili y'akazi ya HEBUZA.", headline: "Kwagura urusobe rw'abafatanyabikorwa.", line: "Ibigo by'abafatanyabikorwa, abanyamuryango n'imikorere." },
    exec: { name: "Ubuyobozi", title: "Kwinjira kw'ikipe · Ubuyobozi", lede: "Koresha imeyili y'akazi ya HEBUZA.", headline: "Ibikorwa byose mu ishusho imwe.", line: "Incamake, kwemeza na raporo." },
    system: { name: "Sisitemu", title: "Kwinjira kw'ikipe · Sisitemu", lede: "Koresha imeyili y'akazi ya HEBUZA. Buri gikorwa kirandikwa.", headline: "Rinda urubuga.", line: "Abakoresha, igenamiterere, umutekano n'igenzura." },
  },
  pickerLabel: "Injira nka", signingInAs: "Winjira nka {role}",
  invite: "Kwinjira ni ku butumire, baza umuyobozi wawe cyangwa HEBUZA.", inviteWork: "Kwinjira ni ku butumire, baza ikigo cyawe cyangwa HEBUZA.",
  joinAgent: "Ushaka kuba umukozi?", signupInvite: "Konti za {role} zifungurwa ku butumire gusa. Baza umuyobozi wawe cyangwa HEBUZA.",
  backToLogin: "Subira ku kwinjira", demo: "Koresha konti y'igerageza", signedInAs: "Winjiye nka {role}",
  steps: { title: "Gutangira", items: ["Fungura konti", "Emeza imeyili yawe", "Tangira ubusabe bwa mbere"] },
};

export const authRolesCopy = (l: Locale): Copy => ({ rw, en, fr })[l];
