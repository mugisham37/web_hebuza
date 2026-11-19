// L-C copy (track, legal, status, errors/offline) in rw / en / fr, plus typed placeholder data.
import type { Locale } from "@/shared/i18n/config";

const en = {
  track: {
    eyebrow: "Public tracker",
    title1: "Track your",
    titleHl: "request.",
    sub: "Enter the code we sent you by SMS or email.",
    label: "Tracking code",
    placeholder: "HBZ-WMVX19",
    submit: "Track",
    signIn: "Have an account? Sign in",
    start: "Start a new request",
    tip1: "Your code starts with HBZ — it's in your SMS",
    tip2: "See every step, what's missing and what's next",
    invalidTitle: "There is a problem",
    invalidBody: "That doesn't look right. Codes look like HBZ-WMVX19.",
    notFoundTitle: "We couldn't find that code.",
    notFoundBody: "Check your SMS, or contact us.",
    offlineTitle: "You're offline",
    offlineBody: "Reconnect and we'll load your request.",
    errorTitle: "We couldn't load this right now",
    errorBody: "Please try again in a moment.",
    retry: "Try again",
    loading: "Loading your request…",
    lastUpdate: "Last update",
    expected: "Expected by",
    verifyTitle: "To see details, confirm the phone or email you used.",
    verifyLabel: "Phone or email",
    verifySubmit: "Show details",
    verifyNote: "We'll never show personal details without this.",
    verifyFail: "That doesn't match our records for this code.",
    tryAnother: "Track another code",
    chat: "Chat on WhatsApp",
    contact: "Contact",
    neededTitle: "Needed from you",
    nothingNeeded: "Nothing needed right now",
    upload: "Upload now",
    payNow: "Pay now",
    payment: "Payment",
    paid: "Paid",
    due: "Balance due",
    institution: "Institution decision",
    institutionNote: "Shown separately from our work.",
    documents: "Documents",
    verified: "verified",
    updates: "Get updates by SMS and WhatsApp",
    phases: ["Received", "Review", "Documents", "In progress", "Done"],
  },
  legal: {
    eyebrow: "Legal",
    contents: "On this page",
    version: "Draft — not in force",
    review: "Placeholder text — pending legal review. Not a binding document.",
    rightsTitle: "Your data, your rights",
    rightsBody: "You can ask for a copy of your data or ask us to delete it.",
    rightsCta: "Privacy settings",
    cookieSettings: "Cookie settings",
    cookieCols: ["Cookie", "Purpose", "Category", "Lasts"],
    tabs: {
      terms: "Terms",
      privacy: "Privacy",
      cookies: "Cookies",
      disclaimers: "Disclaimers",
    },
    titles: {
      terms: "Terms of service",
      privacy: "Privacy policy",
      cookies: "Cookie policy",
      disclaimers: "Disclaimers",
    },
  },
  status: {
    eyebrow: "System status",
    title: "Service",
    titleHl: "status",
    operational: "All systems operational",
    degraded: "Some systems are degraded",
    outage: "Major outage",
    updated: "Updated {t} · refreshes every minute",
    uptime: "{p}% uptime · last 90 days",
    states: {
      operational: "Operational",
      degraded: "Degraded",
      outage: "Outage",
    },
    incidents: "Recent incidents",
    noIncidents: "No incidents in the last 90 days.",
    subscribe: "Get notified about incidents",
    email: "Email address",
    subscribeCta: "Subscribe",
    subscribed: "Thanks — we'll email you when something changes.",
    emailInvalid: "Enter a valid email address.",
    demo: "Example data — live uptime coming soon.",
    unavailable: "Status unavailable right now. Please check again later.",
    loading: "Loading status…",
  },
  errors: {
    notFoundPill: "Page not found",
    notFoundBody: "The page you're looking for doesn't exist or has moved.",
    search: "Search services…",
    home: "Go home",
    services: "All services",
    oops: "Oops",
    errorBody: "Something went wrong on our side. Please try again.",
    reference: "Reference: {id}",
    retry: "Try again",
    support: "Contact support",
    offlineBody:
      "Your drafts are saved on this phone and will send when you're back online.",
    offlineBanner: "Offline — your changes will send when you reconnect",
    saved: "Saved on this phone",
  },
};
export type LcCopy = typeof en;

const rw: LcCopy = {
  track: {
    eyebrow: "Gukurikirana",
    title1: "Kurikirana",
    titleHl: "ubusabe.",
    sub: "Andika kode twakoherereje kuri SMS cyangwa imeyili.",
    label: "Kode yo gukurikirana",
    placeholder: "HBZ-WMVX19",
    submit: "Kurikirana",
    signIn: "Ufite konti? Injira",
    start: "Tangira ubusabe bushya",
    tip1: "Kode yawe itangirwa na HBZ — iri muri SMS yawe",
    tip2: "Reba buri ntambwe, ibibura n'ibikurikiraho",
    invalidTitle: "Hari ikibazo",
    invalidBody: "Ibi ntibisa neza. Kode zimeze nka HBZ-WMVX19.",
    notFoundTitle: "Ntitwabonye iyo kode.",
    notFoundBody: "Reba SMS yawe, cyangwa utwandikire.",
    offlineTitle: "Nta murandasi",
    offlineBody: "Ongera wihuze, turakwereka ubusabe bwawe.",
    errorTitle: "Ntibyakunze kubifungura ubu",
    errorBody: "Ongera ugerageze mu kanya.",
    retry: "Ongera ugerageze",
    loading: "Turimo gufungura ubusabe bwawe…",
    lastUpdate: "Byahinduwe bwa nyuma",
    expected: "Biteganyijwe",
    verifyTitle:
      "Kugira ngo ubone ibisobanuro, emeza telefoni cyangwa imeyili wakoresheje.",
    verifyLabel: "Telefoni cyangwa imeyili",
    verifySubmit: "Erekana ibisobanuro",
    verifyNote: "Ntituzigera twerekana amakuru bwite utabanje kubyemeza.",
    verifyFail: "Ibi ntibihuye n'amakuru dufite kuri iyi kode.",
    tryAnother: "Kurikirana indi kode",
    chat: "Ganira kuri WhatsApp",
    contact: "Twandikire",
    neededTitle: "Ibikenewe kuri wowe",
    nothingNeeded: "Nta kintu gikenewe ubu",
    upload: "Ohereza ubu",
    payNow: "Ishyura ubu",
    payment: "Kwishyura",
    paid: "Byishyuwe",
    due: "Asigaye kwishyurwa",
    institution: "Icyemezo cy'ikigo",
    institutionNote: "Bitandukanye n'akazi kacu.",
    documents: "Inyandiko",
    verified: "byemejwe",
    updates: "Akira amakuru kuri SMS na WhatsApp",
    phases: ["Byakiriwe", "Isuzuma", "Inyandiko", "Birakorwa", "Byarangiye"],
  },
  legal: {
    eyebrow: "Amategeko",
    contents: "Kuri uru rupapuro",
    version: "Inyandiko y'agateganyo — ntirakurikizwa",
    review:
      "Inyandiko y'agateganyo — itegereje gusuzumwa n'abanyamategeko. Ntabwo ari amasezerano.",
    rightsTitle: "Amakuru yawe, uburenganzira bwawe",
    rightsBody: "Ushobora gusaba kopi y'amakuru yawe cyangwa ko tuyasiba.",
    rightsCta: "Igenamiterere ry'ibanga",
    cookieSettings: "Igenamiterere rya cookies",
    cookieCols: ["Cookie", "Icyo ikora", "Icyiciro", "Igihe imara"],
    tabs: {
      terms: "Amabwiriza",
      privacy: "Ibanga",
      cookies: "Cookies",
      disclaimers: "Ibisobanuro",
    },
    titles: {
      terms: "Amabwiriza y'imikoreshereze",
      privacy: "Politiki y'ibanga",
      cookies: "Politiki ya cookies",
      disclaimers: "Ibisobanuro by'inshingano",
    },
  },
  status: {
    eyebrow: "Uko sisitemu ihagaze",
    title: "Uko serivisi",
    titleHl: "zihagaze",
    operational: "Sisitemu zose zirakora",
    degraded: "Sisitemu zimwe zifite ikibazo",
    outage: "Sisitemu zahagaze",
    updated: "Byavuguruwe {t} · bivugururwa buri munota",
    uptime: "{p}% zikora · iminsi 90 ishize",
    states: {
      operational: "Irakora",
      degraded: "Ifite ikibazo",
      outage: "Yahagaze",
    },
    incidents: "Ibibazo biheruka",
    noIncidents: "Nta kibazo cyabaye mu minsi 90 ishize.",
    subscribe: "Menyeshwa iyo habaye ikibazo",
    email: "Imeyili",
    subscribeCta: "Iyandikishe",
    subscribed: "Murakoze — tuzabandikira iyo hari igihindutse.",
    emailInvalid: "Andika imeyili yemewe.",
    demo: "Amakuru y'urugero — amakuru nyayo aza vuba.",
    unavailable: "Imiterere ntiboneka ubu. Ongera urebe nyuma.",
    loading: "Birimo gufunguka…",
  },
  errors: {
    notFoundPill: "Urupapuro ntirwabonetse",
    notFoundBody: "Urupapuro ushaka ntirubaho cyangwa rwimuwe.",
    search: "Shaka serivisi…",
    home: "Ahabanza",
    services: "Serivisi zose",
    oops: "Ihangane",
    errorBody: "Hari ikitagenze neza iwacu. Ongera ugerageze.",
    reference: "Indango: {id}",
    retry: "Ongera ugerageze",
    support: "Vugana n'ubufasha",
    offlineBody:
      "Ibyo wanditse bibitswe kuri iyi telefoni kandi bizoherezwa nugaruka kuri murandasi.",
    offlineBanner: "Nta murandasi — impinduka zizoherezwa nugaruka",
    saved: "Bibitswe kuri iyi telefoni",
  },
};

const fr: LcCopy = {
  track: {
    eyebrow: "Suivi public",
    title1: "Suivez votre",
    titleHl: "demande.",
    sub: "Saisissez le code reçu par SMS ou e-mail.",
    label: "Code de suivi",
    placeholder: "HBZ-WMVX19",
    submit: "Suivre",
    signIn: "Vous avez un compte ? Connexion",
    start: "Nouvelle demande",
    tip1: "Votre code commence par HBZ — il est dans votre SMS",
    tip2: "Voyez chaque étape, ce qui manque et la suite",
    invalidTitle: "Il y a un problème",
    invalidBody:
      "Ce format n'est pas valide. Les codes ressemblent à HBZ-WMVX19.",
    notFoundTitle: "Nous n'avons pas trouvé ce code.",
    notFoundBody: "Vérifiez votre SMS ou contactez-nous.",
    offlineTitle: "Vous êtes hors ligne",
    offlineBody: "Reconnectez-vous et nous chargerons votre demande.",
    errorTitle: "Chargement impossible pour le moment",
    errorBody: "Veuillez réessayer dans un instant.",
    retry: "Réessayer",
    loading: "Chargement de votre demande…",
    lastUpdate: "Dernière mise à jour",
    expected: "Prévu pour le",
    verifyTitle:
      "Pour voir les détails, confirmez le téléphone ou l'e-mail utilisé.",
    verifyLabel: "Téléphone ou e-mail",
    verifySubmit: "Voir les détails",
    verifyNote:
      "Nous n'affichons jamais de données personnelles sans cette étape.",
    verifyFail: "Cela ne correspond pas à nos informations pour ce code.",
    tryAnother: "Suivre un autre code",
    chat: "Discuter sur WhatsApp",
    contact: "Contact",
    neededTitle: "Ce qu'il nous faut",
    nothingNeeded: "Rien pour le moment",
    upload: "Envoyer",
    payNow: "Payer",
    payment: "Paiement",
    paid: "Payé",
    due: "Solde dû",
    institution: "Décision de l'institution",
    institutionNote: "Affichée séparément de notre travail.",
    documents: "Documents",
    verified: "vérifié",
    updates: "Recevoir les mises à jour par SMS et WhatsApp",
    phases: ["Reçue", "Examen", "Documents", "En cours", "Terminée"],
  },
  legal: {
    eyebrow: "Mentions légales",
    contents: "Sur cette page",
    version: "Projet — non en vigueur",
    review:
      "Texte provisoire — en attente de revue juridique. Document non contractuel.",
    rightsTitle: "Vos données, vos droits",
    rightsBody:
      "Vous pouvez demander une copie de vos données ou leur suppression.",
    rightsCta: "Paramètres de confidentialité",
    cookieSettings: "Paramètres des cookies",
    cookieCols: ["Cookie", "Finalité", "Catégorie", "Durée"],
    tabs: {
      terms: "Conditions",
      privacy: "Confidentialité",
      cookies: "Cookies",
      disclaimers: "Avertissements",
    },
    titles: {
      terms: "Conditions d'utilisation",
      privacy: "Politique de confidentialité",
      cookies: "Politique des cookies",
      disclaimers: "Avertissements",
    },
  },
  status: {
    eyebrow: "État du système",
    title: "État des",
    titleHl: "services",
    operational: "Tous les systèmes fonctionnent",
    degraded: "Certains systèmes sont dégradés",
    outage: "Panne majeure",
    updated: "Mis à jour {t} · actualisé chaque minute",
    uptime: "{p} % de disponibilité · 90 derniers jours",
    states: {
      operational: "Opérationnel",
      degraded: "Dégradé",
      outage: "Panne",
    },
    incidents: "Incidents récents",
    noIncidents: "Aucun incident ces 90 derniers jours.",
    subscribe: "Être averti des incidents",
    email: "Adresse e-mail",
    subscribeCta: "S'abonner",
    subscribed: "Merci — nous vous écrirons en cas de changement.",
    emailInvalid: "Saisissez une adresse e-mail valide.",
    demo: "Données d'exemple — disponibilité réelle bientôt.",
    unavailable: "Statut indisponible pour le moment. Réessayez plus tard.",
    loading: "Chargement du statut…",
  },
  errors: {
    notFoundPill: "Page introuvable",
    notFoundBody: "La page que vous cherchez n'existe pas ou a été déplacée.",
    search: "Rechercher un service…",
    home: "Accueil",
    services: "Tous les services",
    oops: "Oups",
    errorBody: "Un problème est survenu de notre côté. Veuillez réessayer.",
    reference: "Référence : {id}",
    retry: "Réessayer",
    support: "Contacter le support",
    offlineBody:
      "Vos brouillons sont enregistrés sur ce téléphone et partiront dès votre retour en ligne.",
    offlineBanner: "Hors ligne — vos modifications partiront à la reconnexion",
    saved: "Enregistré sur ce téléphone",
  },
};

export const LC: Record<Locale, LcCopy> = { rw, en, fr };
export const fmt = (s: string, v: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

/* ---------- Track ---------- */
export const TRACK_CODE = /^HBZ-[A-Z0-9]{6}$/;
export const normaliseCode = (raw: string) =>
  raw.trim().toUpperCase().replace(/\s+/g, "");

/** Full tracker returned after verification (not in schema.d.ts yet → mocked in handlers-lc.ts). */
export type TrackDetail = {
  timeline: {
    title: string;
    at: string;
    note?: string;
    state: "done" | "current" | "todo";
  }[];
  needed: { kind: "upload" | "pay"; label: string; amount?: number }[];
  payment: { paid: number; due: number; method: string; receipt?: string };
  institution: { name: string; decision: string };
  documents: { name: string; verified: boolean }[];
};

/* ---------- Status ---------- */
export type ComponentState = "operational" | "degraded" | "outage";
export type StatusData = {
  updatedAt: string;
  components: {
    name: string;
    state: ComponentState;
    uptime: number;
    days: ComponentState[];
  }[];
  incidents: {
    title: string;
    at: string;
    state: ComponentState;
    body: string;
  }[];
};

const days = (
  bad: number[] = [],
  worst: ComponentState = "degraded",
): ComponentState[] =>
  Array.from({ length: 90 }, (_, i) =>
    bad.includes(i) ? worst : "operational",
  );

// PLACEHOLDER(STATUS_SAMPLE): invented uptime for MSW mocks only; never rendered when /api/status fails.
export function sampleStatus(
  scenario: "operational" | "degraded" = "operational",
): StatusData {
  const deg = scenario === "degraded";
  return {
    updatedAt: new Date().toISOString(),
    components: [
      {
        name: "Website",
        state: "operational",
        uptime: 99.98,
        days: days([41]),
      },
      {
        name: "Client portal",
        state: "operational",
        uptime: 99.95,
        days: days([12, 13]),
      },
      {
        name: "Payments (MoMo / card)",
        state: deg ? "degraded" : "operational",
        uptime: deg ? 99.4 : 99.9,
        days: days(deg ? [70, 89] : [70]),
      },
      {
        name: "SMS & WhatsApp notifications",
        state: "operational",
        uptime: 99.97,
        days: days(),
      },
      {
        name: "Public tracker",
        state: "operational",
        uptime: 100,
        days: days(),
      },
    ],
    incidents: deg
      ? [
          {
            title: "Slow mobile money confirmations",
            at: new Date().toISOString(),
            state: "degraded",
            body: "Example incident: payments are taking longer than usual to confirm.",
          },
        ]
      : [],
  };
}

/* ---------- Legal ---------- */
export type LegalDoc = "terms" | "privacy" | "cookies" | "disclaimers";
export const LEGAL_DOCS: LegalDoc[] = [
  "terms",
  "privacy",
  "cookies",
  "disclaimers",
];
export const COOKIES = [
  {
    name: "NEXT_LOCALE",
    purpose: "Language",
    category: "Essential",
    lasts: "1 year",
  },
  {
    name: "hebuza_access / hebuza_refresh",
    purpose: "Sign-in session",
    category: "Essential",
    lasts: "Session / 30 days",
  },
  {
    name: "hebuza_consent",
    purpose: "Cookie choices",
    category: "Essential",
    lasts: "6 months",
  },
  {
    name: "_ga",
    purpose: "Analytics (only with consent)",
    category: "Analytics",
    lasts: "13 months",
  },
];
