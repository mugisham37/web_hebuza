import type { Locale } from "@/shared/i18n/config";

// L-B content pages copy: /pricing, /about, /about/team, /faq, /contact. Typed by the English source.
// shortcut: lives in code until the CMS (F-CMS-01) replaces it.

/** Content flags: facts HEBUZA has not confirmed yet stay hidden or marked (INTEGRATION-PLAN §10.3). */
export const LB_FLAGS = {
  /** Plan ids whose price is not confirmed: show "set by HEBUZA" instead of the API amount. */
  unconfirmedPlanPrices: ["pln_starter", "pln_growth"],
  /** "+50,000 clients" / "5+ years" style stats. Off until confirmed. */
  showStats: false,
  /** Office street address. Off until confirmed: we show "address to be confirmed". */
  addressConfirmed: true,
};

/** Team profiles. Only `consented: true` ones render (F-WRK-04). All placeholders until HEBUZA sends real, consented profiles. */
export const TEAM: {
  slug: string;
  name: string;
  role: Record<Locale, string>;
  photo: string;
  consented: boolean;
}[] = [];

export const FAQ_CATEGORIES = [
  "getting-started",
  "documents",
  "payments",
  "tracking",
  "plans",
  "privacy",
  "business",
] as const;
export type FaqCategory = (typeof FAQ_CATEGORIES)[number];
type QA = { q: string; a: string };

const en = {
  pricing: {
    meta: "Clear monthly plans and per-service fees. Government fees shown separately.",
    tag: "Pricing",
    l1: "No surprises.",
    hl: "Ever.",
    sub: "Pick a monthly plan if you file often, or pay per service. What you see is what you pay.",
    toggle: {
      label: "How do you want to pay?",
      monthly: "Monthly plans",
      perService: "Pay per service",
    },
    ticks: [
      "Government fees shown separately",
      "VAT included where it applies",
      "Cancel any time",
    ],
    plansTitle: "Monthly plans",
    plansSub:
      "New accounts start with a free trial. Upgrade when you need more.",
    perMonth: "per month",
    setBy: "price set by HEBUZA",
    upTo: "{n} applications per month",
    unlimited: "Unlimited applications",
    popular: "Most popular",
    trial: "Start free trial",
    talk: "Talk to us",
    negotiate: "Negotiate price",
    noPlans:
      "Monthly plans are being updated. You can still pay per service, or ask us on WhatsApp.",
    compareTitle: "Compare plans",
    feature: "Feature",
    choose: "Choose",
    included: "Included",
    notIncluded: "Not included",
    rows: [
      { label: "Applications per month", key: "apps" },
      { label: "In-app chat", key: "chat" },
      { label: "Document vault & reuse", key: "vault" },
      { label: "SMS / WhatsApp alerts", key: "alerts" },
      { label: "Priority queue", key: "priority" },
      { label: "Dedicated agent", key: "agent" },
    ],
    upgrade: "Upgrade",
    feesTitle: "Service fees",
    feesSub:
      "Platform fee per service. Government or third-party fees are shown separately.",
    search: "Search a service…",
    all: "All",
    service: "Service",
    area: "Area",
    standard: "Standard fee",
    urgent: "Urgent fee",
    action: "Action",
    apply: "Apply",
    applyFor: "Apply for {name}",
    showing: "Showing {n} of {total}",
    showAll: "Show all",
    showLess: "Show less",
    quote: "On quote",
    from: "From",
    noResults: "No service matches “{q}”.",
    clear: "Clear search",
    faqTitle: "Pricing FAQ",
    faq: [
      {
        q: "Are government fees included?",
        a: "Government fees are shown as a separate line and paid at cost. We never mark them up.",
      },
      {
        q: "Is VAT included?",
        a: "Yes, our prices include VAT where it applies. Your receipt shows it.",
      },
      {
        q: "What does Urgent mean?",
        a: "Some services have an urgent option that is processed first. Its fee and turnaround are shown before you pay.",
      },
      {
        q: "What if I go over my plan?",
        a: "Extra applications are charged at the normal per-service fee, or you can upgrade your plan at any time.",
      },
      {
        q: "Can I get a refund?",
        a: "If we cannot deliver a service, you can ask for a refund. Our terms explain when and how.",
      },
    ],
    unsureTitle: "Not sure which plan fits?",
    unsureBody:
      "Tell us what you file each month and we'll suggest the cheapest option.",
    consult: "Book a free consultation",
    whatsapp: "Chat on WhatsApp",
    photoAlt: "A client checking a request on her phone",
  },
  about: {
    meta: "HEBUZA is a private one stop centre for business, tax, investment and finance services in Rwanda.",
    tag: "About HEBUZA",
    l1: "Running a business",
    l2: "shouldn't slow",
    hl: "Rwanda",
    l3: "down.",
    sub: "HEBUZA is a private one stop centre for business, tax, investment and finance services, online first, office optional.",
    badge: " · EST. KIGALI · HEBUZA ",
    heroAlt: "HEBUZA advisors working together",
    missionTag: "Our mission",
    mission: "Simpler, faster access to business services in Rwanda.",
    missionBody:
      "We help individuals, entrepreneurs and organisations get the right support to grow, comply and thrive.",
    valuesTag: "Our values",
    values: [
      {
        t: "Client first",
        b: "Clear prices and plain answers before you pay.",
      },
      {
        t: "Integrity",
        b: "Government fees at cost. No shortcuts, no favours.",
      },
      {
        t: "Innovation",
        b: "Online first: apply, pay and track from your phone.",
      },
      {
        t: "Together stronger",
        b: "One team accountable for every step of your request.",
      },
    ],
    teamTag: "Our team",
    teamTitle: "A dedicated team, here for you.",
    teamSub: "Skilled professionals, ready to guide you at every step.",
    teamAll: "Meet the team",
    verified: "Verified",
    teamEmpty: "Team profiles are coming soon.",
    teamEmptyBody: "We only publish profiles our people have agreed to share.",
    credTag: "Our credentials",
    credTitle: "Trusted. Compliant. Professional.",
    credBody:
      "HEBUZA operates under Rwandan regulations and follows Rwanda's data protection law.",
    creds: [
      { t: "Rwandan law", b: "We operate under local regulations" },
      { t: "Data protected", b: "Documents encrypted, access logged" },
      {
        t: "Verified professionals",
        b: "Every request handled by a named expert",
      },
    ],
    officeTag: "Our office",
    officeTitle: "Visit us in Kigali.",
    city: "Kigali, Rwanda",
    addressTbc: "Address to be confirmed",
    officeBody: "Most services are fully online. Visits by appointment.",
    directions: "Get directions",
    workTitle: "Ready to work with HEBUZA?",
    workBody:
      "Get started today and experience a simpler way to access business services.",
    start: "Start a request",
    teamPage: {
      title: "Our team",
      sub: "The people behind your requests.",
      back: "About HEBUZA",
    },
  },
  faq: {
    meta: "Answers about getting started, documents, payments, tracking, plans, privacy and businesses.",
    tag: "FAQ",
    l1: "Questions?",
    l2: "We've got",
    hl: "answers.",
    search: "Search questions, e.g. refund, MoMo, documents",
    browse: "Browse by category",
    all: "All questions",
    results: "{n} results for “{q}”",
    none: "No answers match “{q}”.",
    noneBody: "Try another word, or ask us directly.",
    clear: "Clear search",
    copyLink: "Copy link to this question",
    copied: "Link copied",
    cats: {
      "getting-started": "Getting started",
      documents: "Documents",
      payments: "Payments & refunds",
      tracking: "Tracking",
      plans: "Plans",
      privacy: "Privacy & security",
      business: "Businesses & cooperatives",
    } as Record<FaqCategory, string>,
    catBody: {
      "getting-started":
        "How HEBUZA works and how to start your first request.",
      documents: "What to upload, formats, and missing documents.",
      payments: "Find answers about payments, refunds and transaction issues.",
      tracking: "Following your request from start to finish.",
      plans: "Monthly plans, limits and changes.",
      privacy: "How we protect your data and documents.",
      business: "Help for companies, cooperatives and organisations.",
    } as Record<FaqCategory, string>,
    stuckTag: "Still stuck?",
    stuckTitle: "We're here to help.",
    stuckBody:
      "Chat with our support team or contact us for personal assistance.",
    contact: "Contact support",
    photoAlt: "A HEBUZA advisor replying on her phone",
    items: {
      "getting-started": [
        {
          q: "What is HEBUZA?",
          a: "HEBUZA is a private one stop centre for business, tax, investment and finance services in Rwanda. We handle the paperwork with the institutions for you.",
        },
        {
          q: "Is HEBUZA a government office?",
          a: "No. HEBUZA is a private company. We prepare and submit requests to institutions such as RRA and RDB on your behalf.",
        },
        {
          q: "How do I start a request?",
          a: "Choose a service, check the price and requirements, then apply online. You can also start on WhatsApp.",
        },
        {
          q: "Do I need an account?",
          a: "You need an account to apply and pay, so you can follow your request and download results. Signing up takes a minute.",
        },
        {
          q: "Do I need to come to the office?",
          a: "No. Most services are fully online. If an institution needs you in person, we tell you before you pay.",
        },
        {
          q: "Which languages do you support?",
          a: "Kinyarwanda, English and French, on the website, on WhatsApp and with our team.",
        },
      ],
      documents: [
        {
          q: "Which documents do I need?",
          a: "Each service page lists its requirements before you apply. We only ask for what the institution needs.",
        },
        {
          q: "Which file formats can I upload?",
          a: "PDF, JPG and PNG. A clear photo from your phone is usually fine.",
        },
        {
          q: "What if I don't have all the documents?",
          a: "Start anyway. We tell you exactly what's missing and remind you; the clock pauses while we wait for you.",
        },
        {
          q: "Can I reuse documents for another request?",
          a: "Yes. Documents you upload are kept in your vault so you don't upload the same ID twice.",
        },
        {
          q: "How do I receive the final documents?",
          a: "You download them from your account, and we notify you by SMS or WhatsApp when they are ready.",
        },
        {
          q: "Can someone else upload documents for me?",
          a: "Yes, as long as they use your account or you share the request with them. You stay responsible for the information.",
        },
      ],
      payments: [
        {
          q: "How can I pay for my service?",
          a: "Online from your account when you apply. You see the full price before you pay.",
        },
        {
          q: "What payment methods are accepted?",
          a: "MTN MoMo, Airtel Money, card or bank transfer.",
        },
        {
          q: "Are government fees included in the price?",
          a: "Government fees are shown as a separate line and paid at cost. We never mark them up.",
        },
        {
          q: "How do I request a refund?",
          a: "Open the request in your account and choose “Request a refund”, or contact us. Our terms explain when refunds apply.",
        },
        {
          q: "How long does a refund take?",
          a: "We confirm the decision and the timing when we review your refund request.",
        },
        {
          q: "Can I get a receipt for my payment?",
          a: "Yes. You receive a receipt by SMS and email, and you can download it from your account.",
        },
        {
          q: "My payment failed but money left my account. What now?",
          a: "Don't pay again. Contact us with your request reference; we check the transaction with the provider.",
        },
      ],
      tracking: [
        {
          q: "How do I track my request?",
          a: "Enter the code we sent you by SMS on the Track page, or open the request in your account.",
        },
        {
          q: "What does my tracking code look like?",
          a: "Codes look like HBZ-WMVX19.",
        },
        {
          q: "How long does it take?",
          a: "Each service shows its turnaround before you apply. Urgent options are faster where they exist.",
        },
        {
          q: "Will you tell me when something changes?",
          a: "Yes. We send status alerts by SMS or WhatsApp, and every step shows in your account.",
        },
        {
          q: "Why is my request paused?",
          a: "Usually we are waiting for a document or an answer from you, or for the institution. The tracker shows which.",
        },
      ],
      plans: [
        {
          q: "What is a monthly plan?",
          a: "A plan gives you a number of applications every month for one fee, plus chat, document vault and alerts.",
        },
        {
          q: "Is there a free trial?",
          a: "New accounts start with a free trial. Its length is shown when you sign up.",
        },
        {
          q: "What if I go over my plan?",
          a: "Extra applications are charged at the normal per-service fee, or you can upgrade.",
        },
        {
          q: "Can I change or cancel my plan?",
          a: "Yes, any time from your account. Changes apply from your next billing period.",
        },
        {
          q: "What is a dedicated agent?",
          a: "On the Retainer plan, a named agent handles your open cases and new applications go to them.",
        },
        {
          q: "Are all services covered by plans?",
          a: "Not all. Each service page shows whether it is covered by a plan.",
        },
        {
          q: "Do unused applications roll over?",
          a: "No. Your allowance resets each billing period.",
        },
      ],
      privacy: [
        {
          q: "Is my information safe?",
          a: "Yes. Documents are encrypted, only the professionals on your request can see them, and we follow Rwanda's data protection law.",
        },
        {
          q: "Who can see my documents?",
          a: "Only the HEBUZA staff working on your request. Every access is logged.",
        },
        {
          q: "Do you share my data?",
          a: "Only with the institution that must process your request, and only what it needs.",
        },
        {
          q: "Can I delete my account?",
          a: "Yes. You can ask us to delete your account and data, except what the law requires us to keep.",
        },
        {
          q: "How do I spot a fake HEBUZA message?",
          a: "We never ask for your PIN or password. If in doubt, contact us through the numbers on this website.",
        },
        {
          q: "How do you use cookies?",
          a: "Essential cookies make the site work. Analytics and marketing cookies only run if you accept them.",
        },
      ],
      business: [
        {
          q: "Can you register my company?",
          a: "Yes. We prepare and submit company registration with RDB and tell you what we need first.",
        },
        {
          q: "Do you help cooperatives?",
          a: "Yes. We help cooperatives with registration, compliance, business plans and funding requests.",
        },
        {
          q: "Can you file my monthly taxes?",
          a: "Yes. We can prepare and file VAT, PAYE and other returns. A monthly plan often costs less if you file regularly.",
        },
        {
          q: "Can several people in my company use one account?",
          a: "Team access is planned. For now, share requests with colleagues from your account.",
        },
        {
          q: "Do you help with loans and grants?",
          a: "We help prepare business plans and applications. The lender or funder makes the decision.",
        },
        {
          q: "Can I get an invoice in my company's name?",
          a: "Yes. Add your company details to your account before you pay.",
        },
        {
          q: "Do you work with organisations and NGOs?",
          a: "Yes. Contact us to discuss your needs; the Retainer plan suits regular work.",
        },
      ],
    } as Record<FaqCategory, QA[]>,
  },
  contact: {
    meta: "Contact HEBUZA by WhatsApp, phone, email or the contact form. We reply within business hours.",
    tag: "Contact",
    l1: "Let's",
    hl: "talk.",
    sub: "Most clients reach us on WhatsApp, we reply within business hours.",
    photoAlt: "A HEBUZA advisor on a call",
    waTitle: "WhatsApp us",
    waBody: "Get quick answers, track your request and receive updates.",
    waOpen: "Open WhatsApp",
    phone: "Phone",
    email: "Email",
    office: "Office",
    hours: "Hours",
    hoursValue: "Mon–Fri 08:00–17:00",
    call: "Call",
    copy: "Copy",
    copied: "Copied",
    map: "Map",
    addressTbc: "Address to be confirmed",
    formTitle: "Send us a message",
    formSub: "We reply by your preferred channel.",
    name: "Your name",
    contact: "Phone or email",
    contactHint: "+250 7XX XXX XXX or you@example.com",
    language: "Preferred language",
    topic: "Topic",
    choose: "Choose a topic…",
    message: "Message",
    messageHint: "Tell us how we can help…",
    consent: "You can contact me about my request",
    required: "required",
    topics: {
      general: "General question",
      service: "A service",
      pricing: "Pricing / plan",
      request: "An existing request",
      complaint: "A complaint",
      partnership: "Partnership",
    },
    send: "Send message",
    sending: "Sending…",
    never: "We never share your details.",
    errTitle: "There is a problem",
    errBody: "Check the form and try again.",
    e: {
      name: "Enter your name",
      contact: "Enter a valid phone number or email",
      topic: "Choose a topic",
      message: "Write a message of at least 10 characters",
      consent: "Tick the box so we can contact you",
    },
    fail: "We couldn't send your message. Check your connection and try again, or message us on WhatsApp.",
    rate: "Too many messages in a short time. Please wait a few minutes and try again.",
    prefPlan: "You asked about the {name} plan.",
    prefPlanMsg: "I'd like to know more about the {name} plan.",
    prefService: "You asked about {name}.",
    prefServiceMsg: "I'd like to know more about {name}.",
    sentTitle: "Thanks, we've got it.",
    sentRef: "Your reference is {ref}.",
    sentBody: "We'll reply by your preferred channel within business hours.",
    track: "Track my request",
    home: "Back to home",
    another: "Send another message",
    mapTitle: "HEBUZA office",
    directions: "Directions",
    otherTitle: "Other ways we can help",
    other: [
      {
        t: "Track a request",
        b: "Use the code from your SMS.",
        href: "/track",
      },
      {
        t: "Book a free consultation",
        b: "Talk to an advisor.",
        href: "/book",
      },
      {
        t: "Read the FAQ",
        b: "Quick answers to common questions.",
        href: "/faq",
      },
    ],
  },
};

export type LBCopy = typeof en;

const fr: LBCopy = {
  pricing: {
    meta: "Forfaits mensuels clairs et frais par service. Frais publics affichés à part.",
    tag: "Tarifs",
    l1: "Aucune surprise.",
    hl: "Jamais.",
    sub: "Choisissez un forfait mensuel si vous déposez souvent, ou payez par service. Ce que vous voyez est ce que vous payez.",
    toggle: {
      label: "Comment voulez-vous payer ?",
      monthly: "Forfaits mensuels",
      perService: "Payer par service",
    },
    ticks: [
      "Frais publics affichés à part",
      "TVA incluse là où elle s'applique",
      "Résiliable à tout moment",
    ],
    plansTitle: "Forfaits mensuels",
    plansSub:
      "Les nouveaux comptes commencent par un essai gratuit. Passez au niveau supérieur quand vous en avez besoin.",
    perMonth: "par mois",
    setBy: "prix fixé par HEBUZA",
    upTo: "{n} demandes par mois",
    unlimited: "Demandes illimitées",
    popular: "Le plus choisi",
    trial: "Essai gratuit",
    talk: "Parlez-nous",
    negotiate: "Négocier le prix",
    noPlans:
      "Les forfaits mensuels sont en cours de mise à jour. Vous pouvez payer par service ou nous écrire sur WhatsApp.",
    compareTitle: "Comparer les forfaits",
    feature: "Fonction",
    choose: "Choisir",
    included: "Inclus",
    notIncluded: "Non inclus",
    rows: [
      { label: "Demandes par mois", key: "apps" },
      { label: "Chat dans l'application", key: "chat" },
      { label: "Coffre et réutilisation des documents", key: "vault" },
      { label: "Alertes SMS / WhatsApp", key: "alerts" },
      { label: "File prioritaire", key: "priority" },
      { label: "Agent dédié", key: "agent" },
    ],
    upgrade: "Évolution",
    feesTitle: "Frais par service",
    feesSub:
      "Frais de plateforme par service. Les frais publics ou de tiers sont affichés à part.",
    search: "Rechercher un service…",
    all: "Tous",
    service: "Service",
    area: "Domaine",
    standard: "Frais standard",
    urgent: "Frais urgent",
    action: "Action",
    apply: "Demander",
    applyFor: "Demander {name}",
    showing: "{n} sur {total} affichés",
    showAll: "Tout afficher",
    showLess: "Afficher moins",
    quote: "Sur devis",
    from: "À partir de",
    noResults: "Aucun service ne correspond à « {q} ».",
    clear: "Effacer la recherche",
    faqTitle: "FAQ tarifs",
    faq: [
      {
        q: "Les frais publics sont-ils inclus ?",
        a: "Les frais publics apparaissent sur une ligne à part et sont payés au coût réel. Nous ne prenons aucune marge.",
      },
      {
        q: "La TVA est-elle incluse ?",
        a: "Oui, nos prix incluent la TVA là où elle s'applique. Votre reçu l'indique.",
      },
      {
        q: "Que signifie Urgent ?",
        a: "Certains services ont une option urgente traitée en priorité. Ses frais et son délai sont affichés avant paiement.",
      },
      {
        q: "Et si je dépasse mon forfait ?",
        a: "Les demandes supplémentaires sont facturées au tarif normal par service, ou vous pouvez changer de forfait à tout moment.",
      },
      {
        q: "Puis-je être remboursé ?",
        a: "Si nous ne pouvons pas livrer un service, vous pouvez demander un remboursement. Nos conditions expliquent quand et comment.",
      },
    ],
    unsureTitle: "Vous hésitez entre deux forfaits ?",
    unsureBody:
      "Dites-nous ce que vous déposez chaque mois et nous vous proposerons l'option la moins chère.",
    consult: "Réserver une consultation gratuite",
    whatsapp: "Écrire sur WhatsApp",
    photoAlt: "Une cliente suit sa demande sur son téléphone",
  },
  about: {
    meta: "HEBUZA est un guichet unique privé pour les services aux entreprises, fiscaux, d'investissement et financiers au Rwanda.",
    tag: "À propos de HEBUZA",
    l1: "Gérer une entreprise",
    l2: "ne devrait pas ralentir",
    hl: "le Rwanda.",
    l3: "",
    sub: "HEBUZA est un guichet unique privé pour les services aux entreprises, fiscaux, d'investissement et financiers, en ligne d'abord, bureau en option.",
    badge: " · FONDÉ À KIGALI · HEBUZA ",
    heroAlt: "Des conseillers HEBUZA au travail",
    missionTag: "Notre mission",
    mission:
      "Un accès plus simple et plus rapide aux services aux entreprises au Rwanda.",
    missionBody:
      "Nous aidons particuliers, entrepreneurs et organisations à obtenir le bon accompagnement pour grandir, être en règle et prospérer.",
    valuesTag: "Nos valeurs",
    values: [
      {
        t: "Le client d'abord",
        b: "Des prix clairs et des réponses simples avant de payer.",
      },
      {
        t: "Intégrité",
        b: "Frais publics au coût réel. Ni raccourcis, ni faveurs.",
      },
      {
        t: "Innovation",
        b: "En ligne d'abord : demandez, payez et suivez depuis votre téléphone.",
      },
      {
        t: "Plus forts ensemble",
        b: "Une seule équipe responsable de chaque étape.",
      },
    ],
    teamTag: "Notre équipe",
    teamTitle: "Une équipe dédiée, à votre service.",
    teamSub: "Des professionnels qualifiés pour vous guider à chaque étape.",
    teamAll: "Voir l'équipe",
    verified: "Vérifié",
    teamEmpty: "Les profils de l'équipe arrivent bientôt.",
    teamEmptyBody:
      "Nous ne publions que les profils que nos collaborateurs ont accepté de partager.",
    credTag: "Nos garanties",
    credTitle: "Fiable. Conforme. Professionnel.",
    credBody:
      "HEBUZA exerce selon la réglementation rwandaise et respecte la loi rwandaise sur la protection des données.",
    creds: [
      {
        t: "Droit rwandais",
        b: "Nous exerçons selon la réglementation locale",
      },
      { t: "Données protégées", b: "Documents chiffrés, accès journalisés" },
      {
        t: "Professionnels vérifiés",
        b: "Chaque demande suivie par un expert nommé",
      },
    ],
    officeTag: "Notre bureau",
    officeTitle: "Rendez-nous visite à Kigali.",
    city: "Kigali, Rwanda",
    addressTbc: "Adresse à confirmer",
    officeBody:
      "La plupart des services sont entièrement en ligne. Visites sur rendez-vous.",
    directions: "Itinéraire",
    workTitle: "Prêt à travailler avec HEBUZA ?",
    workBody:
      "Commencez aujourd'hui et accédez plus simplement aux services aux entreprises.",
    start: "Faire une demande",
    teamPage: {
      title: "Notre équipe",
      sub: "Les personnes derrière vos demandes.",
      back: "À propos de HEBUZA",
    },
  },
  faq: {
    meta: "Réponses sur le démarrage, les documents, les paiements, le suivi, les forfaits, la confidentialité et les entreprises.",
    tag: "FAQ",
    l1: "Des questions ?",
    l2: "Nous avons les",
    hl: "réponses.",
    search: "Rechercher, ex. remboursement, MoMo, documents",
    browse: "Parcourir par catégorie",
    all: "Toutes les questions",
    results: "{n} résultats pour « {q} »",
    none: "Aucune réponse pour « {q} ».",
    noneBody: "Essayez un autre mot ou posez-nous la question.",
    clear: "Effacer la recherche",
    copyLink: "Copier le lien de cette question",
    copied: "Lien copié",
    cats: {
      "getting-started": "Bien démarrer",
      documents: "Documents",
      payments: "Paiements et remboursements",
      tracking: "Suivi",
      plans: "Forfaits",
      privacy: "Confidentialité et sécurité",
      business: "Entreprises et coopératives",
    },
    catBody: {
      "getting-started":
        "Comment fonctionne HEBUZA et comment faire votre première demande.",
      documents: "Quoi envoyer, formats acceptés, documents manquants.",
      payments: "Réponses sur les paiements, remboursements et transactions.",
      tracking: "Suivre votre demande du début à la fin.",
      plans: "Forfaits mensuels, limites et changements.",
      privacy: "Comment nous protégeons vos données et documents.",
      business: "Aide pour les sociétés, coopératives et organisations.",
    },
    stuckTag: "Toujours bloqué ?",
    stuckTitle: "Nous sommes là pour vous aider.",
    stuckBody:
      "Écrivez à notre équipe ou contactez-nous pour une aide personnalisée.",
    contact: "Contacter le support",
    photoAlt: "Une conseillère HEBUZA répond sur son téléphone",
    items: {
      "getting-started": [
        {
          q: "Qu'est-ce que HEBUZA ?",
          a: "HEBUZA est un guichet unique privé pour les services aux entreprises, fiscaux, d'investissement et financiers au Rwanda. Nous gérons les démarches auprès des institutions pour vous.",
        },
        {
          q: "HEBUZA est-il un service public ?",
          a: "Non. HEBUZA est une entreprise privée. Nous préparons et déposons les demandes auprès d'institutions comme la RRA et le RDB pour vous.",
        },
        {
          q: "Comment faire une demande ?",
          a: "Choisissez un service, vérifiez le prix et les pièces requises, puis faites la demande en ligne. Vous pouvez aussi commencer sur WhatsApp.",
        },
        {
          q: "Ai-je besoin d'un compte ?",
          a: "Oui, pour demander et payer, afin de suivre votre demande et télécharger les résultats. L'inscription prend une minute.",
        },
        {
          q: "Dois-je venir au bureau ?",
          a: "Non. La plupart des services sont entièrement en ligne. Si une institution exige votre présence, nous vous le disons avant le paiement.",
        },
        {
          q: "Quelles langues parlez-vous ?",
          a: "Kinyarwanda, anglais et français, sur le site, sur WhatsApp et avec notre équipe.",
        },
      ],
      documents: [
        {
          q: "De quels documents ai-je besoin ?",
          a: "Chaque page de service liste les pièces requises avant la demande. Nous ne demandons que ce dont l'institution a besoin.",
        },
        {
          q: "Quels formats puis-je envoyer ?",
          a: "PDF, JPG et PNG. Une photo nette prise avec votre téléphone suffit généralement.",
        },
        {
          q: "Et s'il me manque des documents ?",
          a: "Commencez quand même. Nous vous disons précisément ce qui manque ; le délai est suspendu pendant que nous attendons.",
        },
        {
          q: "Puis-je réutiliser mes documents ?",
          a: "Oui. Vos documents restent dans votre coffre pour ne pas renvoyer la même pièce d'identité.",
        },
        {
          q: "Comment recevoir les documents finaux ?",
          a: "Vous les téléchargez depuis votre compte et nous vous prévenons par SMS ou WhatsApp quand ils sont prêts.",
        },
        {
          q: "Quelqu'un peut-il envoyer les documents pour moi ?",
          a: "Oui, via votre compte ou si vous lui partagez la demande. Vous restez responsable des informations.",
        },
      ],
      payments: [
        {
          q: "Comment payer mon service ?",
          a: "En ligne depuis votre compte lors de la demande. Vous voyez le prix total avant de payer.",
        },
        {
          q: "Quels moyens de paiement acceptez-vous ?",
          a: "MTN MoMo, Airtel Money, carte ou virement bancaire.",
        },
        {
          q: "Les frais publics sont-ils inclus dans le prix ?",
          a: "Ils apparaissent sur une ligne à part et sont payés au coût réel. Nous ne prenons aucune marge.",
        },
        {
          q: "Comment demander un remboursement ?",
          a: "Ouvrez la demande dans votre compte et choisissez « Demander un remboursement », ou contactez-nous. Nos conditions expliquent quand il s'applique.",
        },
        {
          q: "Combien de temps prend un remboursement ?",
          a: "Nous confirmons la décision et le délai lors de l'examen de votre demande de remboursement.",
        },
        {
          q: "Puis-je obtenir un reçu ?",
          a: "Oui. Vous recevez un reçu par SMS et e-mail et pouvez le télécharger depuis votre compte.",
        },
        {
          q: "Le paiement a échoué mais j'ai été débité. Que faire ?",
          a: "Ne payez pas une deuxième fois. Contactez-nous avec la référence de votre demande ; nous vérifions la transaction auprès de l'opérateur.",
        },
      ],
      tracking: [
        {
          q: "Comment suivre ma demande ?",
          a: "Saisissez le code reçu par SMS sur la page Suivi, ou ouvrez la demande dans votre compte.",
        },
        {
          q: "À quoi ressemble mon code de suivi ?",
          a: "Les codes ressemblent à HBZ-WMVX19.",
        },
        {
          q: "Combien de temps cela prend-il ?",
          a: "Chaque service affiche son délai avant la demande. Les options urgentes sont plus rapides lorsqu'elles existent.",
        },
        {
          q: "Serai-je prévenu des changements ?",
          a: "Oui. Nous envoyons des alertes par SMS ou WhatsApp, et chaque étape apparaît dans votre compte.",
        },
        {
          q: "Pourquoi ma demande est-elle en pause ?",
          a: "Généralement, nous attendons un document ou une réponse de votre part, ou de l'institution. Le suivi indique laquelle.",
        },
      ],
      plans: [
        {
          q: "Qu'est-ce qu'un forfait mensuel ?",
          a: "Un forfait donne un nombre de demandes par mois pour un prix, avec chat, coffre de documents et alertes.",
        },
        {
          q: "Y a-t-il un essai gratuit ?",
          a: "Les nouveaux comptes commencent par un essai gratuit. Sa durée est indiquée à l'inscription.",
        },
        {
          q: "Et si je dépasse mon forfait ?",
          a: "Les demandes supplémentaires sont facturées au tarif normal par service, ou vous pouvez changer de forfait.",
        },
        {
          q: "Puis-je changer ou résilier mon forfait ?",
          a: "Oui, à tout moment depuis votre compte. Les changements s'appliquent à la période suivante.",
        },
        {
          q: "Qu'est-ce qu'un agent dédié ?",
          a: "Avec le forfait Retainer, un agent nommé gère vos dossiers et reçoit vos nouvelles demandes.",
        },
        {
          q: "Tous les services sont-ils couverts par les forfaits ?",
          a: "Non. Chaque page de service indique s'il est couvert par un forfait.",
        },
        {
          q: "Les demandes non utilisées sont-elles reportées ?",
          a: "Non. Votre quota est remis à zéro à chaque période.",
        },
      ],
      privacy: [
        {
          q: "Mes informations sont-elles en sécurité ?",
          a: "Oui. Les documents sont chiffrés, seuls les professionnels de votre dossier y accèdent, et nous respectons la loi rwandaise sur la protection des données.",
        },
        {
          q: "Qui peut voir mes documents ?",
          a: "Seul le personnel HEBUZA qui traite votre demande. Chaque accès est journalisé.",
        },
        {
          q: "Partagez-vous mes données ?",
          a: "Uniquement avec l'institution qui doit traiter votre demande, et seulement ce dont elle a besoin.",
        },
        {
          q: "Puis-je supprimer mon compte ?",
          a: "Oui. Vous pouvez nous demander de supprimer votre compte et vos données, sauf ce que la loi nous oblige à garder.",
        },
        {
          q: "Comment repérer un faux message HEBUZA ?",
          a: "Nous ne demandons jamais votre code PIN ou mot de passe. En cas de doute, contactez-nous via les numéros de ce site.",
        },
        {
          q: "Comment utilisez-vous les cookies ?",
          a: "Les cookies essentiels font fonctionner le site. Ceux d'analyse et de marketing ne s'activent que si vous les acceptez.",
        },
      ],
      business: [
        {
          q: "Pouvez-vous enregistrer ma société ?",
          a: "Oui. Nous préparons et déposons l'enregistrement auprès du RDB et vous disons d'abord ce qu'il nous faut.",
        },
        {
          q: "Aidez-vous les coopératives ?",
          a: "Oui : enregistrement, conformité, plans d'affaires et demandes de financement.",
        },
        {
          q: "Pouvez-vous déclarer mes impôts mensuels ?",
          a: "Oui. Nous préparons et déposons TVA, PAYE et autres déclarations. Un forfait mensuel revient souvent moins cher.",
        },
        {
          q: "Plusieurs personnes peuvent-elles utiliser un compte ?",
          a: "L'accès équipe est prévu. Pour l'instant, partagez les demandes avec vos collègues depuis votre compte.",
        },
        {
          q: "Aidez-vous pour les prêts et subventions ?",
          a: "Nous aidons à préparer plans d'affaires et dossiers. Le prêteur ou bailleur décide.",
        },
        {
          q: "Puis-je avoir une facture au nom de ma société ?",
          a: "Oui. Ajoutez les informations de votre société à votre compte avant de payer.",
        },
        {
          q: "Travaillez-vous avec des organisations et ONG ?",
          a: "Oui. Contactez-nous pour en discuter ; le forfait Retainer convient au travail régulier.",
        },
      ],
    },
  },
  contact: {
    meta: "Contactez HEBUZA par WhatsApp, téléphone, e-mail ou formulaire. Nous répondons aux heures ouvrables.",
    tag: "Contact",
    l1: "Parlons",
    hl: "ensemble.",
    sub: "La plupart des clients nous écrivent sur WhatsApp, nous répondons aux heures ouvrables.",
    photoAlt: "Une conseillère HEBUZA au téléphone",
    waTitle: "Écrivez-nous sur WhatsApp",
    waBody: "Réponses rapides, suivi de demande et mises à jour.",
    waOpen: "Ouvrir WhatsApp",
    phone: "Téléphone",
    email: "E-mail",
    office: "Bureau",
    hours: "Horaires",
    hoursValue: "Lun–Ven 08:00–17:00",
    call: "Appeler",
    copy: "Copier",
    copied: "Copié",
    map: "Carte",
    addressTbc: "Adresse à confirmer",
    formTitle: "Envoyez-nous un message",
    formSub: "Nous répondons par le canal de votre choix.",
    name: "Votre nom",
    contact: "Téléphone ou e-mail",
    contactHint: "+250 7XX XXX XXX ou vous@exemple.com",
    language: "Langue préférée",
    topic: "Sujet",
    choose: "Choisir un sujet…",
    message: "Message",
    messageHint: "Dites-nous comment nous pouvons aider…",
    consent: "Vous pouvez me contacter au sujet de ma demande",
    required: "obligatoire",
    topics: {
      general: "Question générale",
      service: "Un service",
      pricing: "Tarifs / forfait",
      request: "Une demande en cours",
      complaint: "Une réclamation",
      partnership: "Partenariat",
    },
    send: "Envoyer",
    sending: "Envoi…",
    never: "Nous ne partageons jamais vos coordonnées.",
    errTitle: "Il y a un problème",
    errBody: "Vérifiez le formulaire et réessayez.",
    e: {
      name: "Saisissez votre nom",
      contact: "Saisissez un téléphone ou e-mail valide",
      topic: "Choisissez un sujet",
      message: "Écrivez un message d'au moins 10 caractères",
      consent: "Cochez la case pour que nous puissions vous contacter",
    },
    fail: "Impossible d'envoyer votre message. Vérifiez votre connexion et réessayez, ou écrivez-nous sur WhatsApp.",
    rate: "Trop de messages en peu de temps. Attendez quelques minutes et réessayez.",
    prefPlan: "Vous demandez des informations sur le forfait {name}.",
    prefPlanMsg: "J'aimerais en savoir plus sur le forfait {name}.",
    prefService: "Vous demandez des informations sur {name}.",
    prefServiceMsg: "J'aimerais en savoir plus sur {name}.",
    sentTitle: "Merci, c'est bien reçu.",
    sentRef: "Votre référence est {ref}.",
    sentBody: "Nous répondrons par le canal choisi aux heures ouvrables.",
    track: "Suivre ma demande",
    home: "Retour à l'accueil",
    another: "Envoyer un autre message",
    mapTitle: "Bureau HEBUZA",
    directions: "Itinéraire",
    otherTitle: "Autres façons de vous aider",
    other: [
      {
        t: "Suivre une demande",
        b: "Avec le code reçu par SMS.",
        href: "/track",
      },
      {
        t: "Réserver une consultation gratuite",
        b: "Parlez à un conseiller.",
        href: "/book",
      },
      {
        t: "Lire la FAQ",
        b: "Réponses rapides aux questions fréquentes.",
        href: "/faq",
      },
    ],
  },
};

const rw: LBCopy = {
  pricing: {
    meta: "Ifatabuguzi rya buri kwezi n'ibiciro bya buri serivisi bisobanutse. Amafaranga ya Leta agaragazwa ukwayo.",
    tag: "Ibiciro",
    l1: "Nta gutungurwa.",
    hl: "Na rimwe.",
    sub: "Hitamo ifatabuguzi rya buri kwezi niba usaba kenshi, cyangwa wishyure kuri buri serivisi. Ibyo ubona ni byo wishyura.",
    toggle: {
      label: "Ushaka kwishyura ute?",
      monthly: "Ifatabuguzi rya buri kwezi",
      perService: "Kwishyura kuri serivisi",
    },
    ticks: [
      "Amafaranga ya Leta agaragazwa ukwayo",
      "TVA irimo aho ireba",
      "Ushobora guhagarika igihe icyo ari cyo cyose",
    ],
    plansTitle: "Ifatabuguzi rya buri kwezi",
    plansSub:
      "Konti nshya zitangirana n'igerageza ry'ubuntu. Uzamura igihe ubikeneye.",
    perMonth: "ku kwezi",
    setBy: "igiciro gishyirwaho na HEBUZA",
    upTo: "Ubusabe {n} ku kwezi",
    unlimited: "Ubusabe butagira umubare",
    popular: "Bikunzwe cyane",
    trial: "Tangira igerageza ry'ubuntu",
    talk: "Tuvugishe",
    negotiate: "Kuganira ku giciro",
    noPlans:
      "Ifatabuguzi rya buri kwezi riri kuvugururwa. Ushobora kwishyura kuri serivisi, cyangwa ukatwandikira kuri WhatsApp.",
    compareTitle: "Gereranya ifatabuguzi",
    feature: "Icyo ubona",
    choose: "Hitamo",
    included: "Birimo",
    notIncluded: "Ntibirimo",
    rows: [
      { label: "Ubusabe ku kwezi", key: "apps" },
      { label: "Ikiganiro muri porogaramu", key: "chat" },
      { label: "Ububiko bw'inyandiko no kuzikoresha", key: "vault" },
      { label: "Ubutumwa bwa SMS / WhatsApp", key: "alerts" },
      { label: "Umurongo w'imbere", key: "priority" },
      { label: "Umukozi wawe bwite", key: "agent" },
    ],
    upgrade: "Kuzamura",
    feesTitle: "Ibiciro bya serivisi",
    feesSub:
      "Amafaranga ya serivisi ya HEBUZA. Amafaranga ya Leta cyangwa y'abandi agaragazwa ukwayo.",
    search: "Shakisha serivisi…",
    all: "Byose",
    service: "Serivisi",
    area: "Icyiciro",
    standard: "Igiciro gisanzwe",
    urgent: "Igiciro cyihuse",
    action: "Igikorwa",
    apply: "Saba",
    applyFor: "Saba {name}",
    showing: "Herekanywe {n} kuri {total}",
    showAll: "Erekana byose",
    showLess: "Erekana bike",
    quote: "Ku giciro cyumvikanyweho",
    from: "Guhera kuri",
    noResults: "Nta serivisi ihuye na “{q}”.",
    clear: "Siba ishakisha",
    faqTitle: "Ibibazo ku biciro",
    faq: [
      {
        q: "Amafaranga ya Leta arimo?",
        a: "Amafaranga ya Leta agaragazwa ku murongo wayo kandi yishyurwa uko ari. Ntitwongeraho inyungu.",
      },
      {
        q: "TVA irimo?",
        a: "Yego, ibiciro byacu birimo TVA aho ireba. Inyemezabwishyu yawe irabigaragaza.",
      },
      {
        q: "Byihuse bisobanura iki?",
        a: "Serivisi zimwe zifite uburyo bwihuse bukorwa mbere. Igiciro n'igihe bigaragazwa mbere yo kwishyura.",
      },
      {
        q: "Bigenda bite ndenze ifatabuguzi ryanjye?",
        a: "Ubusabe bw'inyongera bwishyurwa ku giciro gisanzwe cya serivisi, cyangwa ukazamura ifatabuguzi igihe icyo ari cyo cyose.",
      },
      {
        q: "Nshobora gusubizwa amafaranga?",
        a: "Niba tutabashije gutanga serivisi, ushobora gusaba gusubizwa. Amabwiriza yacu asobanura igihe n'uburyo.",
      },
    ],
    unsureTitle: "Ntuzi ifatabuguzi rikubereye?",
    unsureBody: "Tubwire ibyo usaba buri kwezi tukwereke uburyo buhendutse.",
    consult: "Saba inama y'ubuntu",
    whatsapp: "Twandikire kuri WhatsApp",
    photoAlt: "Umukiriya akurikirana ubusabe kuri telefone",
  },
  about: {
    meta: "HEBUZA ni ikigo cyigenga gitanga serivisi zose z'ubucuruzi, imisoro, ishoramari n'imari mu Rwanda.",
    tag: "Ibyerekeye HEBUZA",
    l1: "Gukora ubucuruzi",
    l2: "ntibikwiye gutinza",
    hl: "u Rwanda.",
    l3: "",
    sub: "HEBUZA ni ikigo cyigenga gitanga serivisi z'ubucuruzi, imisoro, ishoramari n'imari ahantu hamwe, kuri murandasi mbere, ibiro iyo bibaye ngombwa.",
    badge: " · YASHINGIWE I KIGALI · HEBUZA ",
    heroAlt: "Abajyanama ba HEBUZA bakorana",
    missionTag: "Intego yacu",
    mission:
      "Kugera kuri serivisi z'ubucuruzi mu Rwanda byoroshye kandi byihuse.",
    missionBody:
      "Dufasha abantu ku giti cyabo, ba rwiyemezamirimo n'ibigo kubona ubufasha bukwiye bwo gukura, kubahiriza amategeko no gutera imbere.",
    valuesTag: "Indangagaciro zacu",
    values: [
      {
        t: "Umukiriya mbere",
        b: "Ibiciro bisobanutse n'ibisubizo byumvikana mbere yo kwishyura.",
      },
      {
        t: "Ubunyangamugayo",
        b: "Amafaranga ya Leta uko ari. Nta nzira z'ubusamo.",
      },
      {
        t: "Udushya",
        b: "Kuri murandasi mbere: saba, wishyure kandi ukurikirane kuri telefone.",
      },
      {
        t: "Hamwe turakomera",
        b: "Itsinda rimwe ribazwa buri ntambwe y'ubusabe bwawe.",
      },
    ],
    teamTag: "Itsinda ryacu",
    teamTitle: "Itsinda ryiyemeje kugufasha.",
    teamSub: "Abanyamwuga b'inzobere biteguye kukuyobora muri buri ntambwe.",
    teamAll: "Menya itsinda",
    verified: "Byemejwe",
    teamEmpty: "Imyirondoro y'itsinda iraza vuba.",
    teamEmptyBody:
      "Dushyira ahagaragara gusa imyirondoro abakozi bacu bemeye gusangiza.",
    credTag: "Icyizere cyacu",
    credTitle: "Byizewe. Byubahiriza amategeko. Kinyamwuga.",
    credBody:
      "HEBUZA ikora ikurikije amategeko y'u Rwanda kandi yubahiriza itegeko ryo kurinda amakuru bwite.",
    creds: [
      {
        t: "Amategeko y'u Rwanda",
        b: "Dukora dukurikije amabwiriza y'igihugu",
      },
      {
        t: "Amakuru arinzwe",
        b: "Inyandiko zirabitswe neza, kuzigeraho biranditswe",
      },
      {
        t: "Abanyamwuga bemewe",
        b: "Buri busabe bukurikiranwa n'inzobere izwi",
      },
    ],
    officeTag: "Ibiro byacu",
    officeTitle: "Udusure i Kigali.",
    city: "Kigali, Rwanda",
    addressTbc: "Aderesi izemezwa",
    officeBody:
      "Serivisi nyinshi zikorerwa kuri murandasi. Gusura ni ku gahunda.",
    directions: "Inzira",
    workTitle: "Witeguye gukorana na HEBUZA?",
    workBody:
      "Tangira uyu munsi wibonere uburyo bworoshye bwo kubona serivisi z'ubucuruzi.",
    start: "Tangira ubusabe",
    teamPage: {
      title: "Itsinda ryacu",
      sub: "Abantu bari inyuma y'ubusabe bwawe.",
      back: "Ibyerekeye HEBUZA",
    },
  },
  faq: {
    meta: "Ibisubizo ku gutangira, inyandiko, kwishyura, gukurikirana, ifatabuguzi, umutekano n'ibigo.",
    tag: "Ibibazo",
    l1: "Ufite ibibazo?",
    l2: "Dufite",
    hl: "ibisubizo.",
    search: "Shakisha ibibazo, urugero: gusubizwa, MoMo, inyandiko",
    browse: "Reba ukurikije icyiciro",
    all: "Ibibazo byose",
    results: "Ibisubizo {n} kuri “{q}”",
    none: "Nta gisubizo gihuye na “{q}”.",
    noneBody: "Gerageza irindi jambo, cyangwa utubaze.",
    clear: "Siba ishakisha",
    copyLink: "Koporora umurongo w'iki kibazo",
    copied: "Byakoporowe",
    cats: {
      "getting-started": "Gutangira",
      documents: "Inyandiko",
      payments: "Kwishyura no gusubizwa",
      tracking: "Gukurikirana",
      plans: "Ifatabuguzi",
      privacy: "Ibanga n'umutekano",
      business: "Ibigo n'amakoperative",
    },
    catBody: {
      "getting-started": "Uko HEBUZA ikora n'uko watangira ubusabe bwa mbere.",
      documents: "Icyo wohereza, uburyo bw'amadosiye n'inyandiko zibura.",
      payments: "Ibisubizo ku kwishyura, gusubizwa n'ibibazo by'ihererekanya.",
      tracking: "Gukurikirana ubusabe bwawe kuva bitangiye kugeza birangiye.",
      plans: "Ifatabuguzi rya buri kwezi, imbibi n'impinduka.",
      privacy: "Uko turinda amakuru n'inyandiko byawe.",
      business: "Ubufasha ku masosiyete, amakoperative n'imiryango.",
    },
    stuckTag: "Uracyafite ikibazo?",
    stuckTitle: "Turi hano kugufasha.",
    stuckBody:
      "Vugana n'itsinda ryacu cyangwa utwandikire ubone ubufasha bwihariye.",
    contact: "Vugana natwe",
    photoAlt: "Umujyanama wa HEBUZA asubiza kuri telefone",
    items: {
      "getting-started": [
        {
          q: "HEBUZA ni iki?",
          a: "HEBUZA ni ikigo cyigenga gitanga serivisi z'ubucuruzi, imisoro, ishoramari n'imari mu Rwanda. Tugukorera impapuro mu bigo bya Leta.",
        },
        {
          q: "HEBUZA ni ikigo cya Leta?",
          a: "Oya. HEBUZA ni sosiyete yigenga. Dutegura kandi tugatanga ubusabe mu bigo nka RRA na RDB mu izina ryawe.",
        },
        {
          q: "Ntangira nte ubusabe?",
          a: "Hitamo serivisi, urebe igiciro n'ibisabwa, hanyuma usabe kuri murandasi. Ushobora no gutangirira kuri WhatsApp.",
        },
        {
          q: "Nkeneye konti?",
          a: "Ukeneye konti kugira ngo usabe kandi wishyure, ukurikirane ubusabe kandi ukuremo ibisubizo. Kwiyandikisha bimara umunota.",
        },
        {
          q: "Ngomba kuza ku biro?",
          a: "Oya. Serivisi nyinshi zikorerwa kuri murandasi. Niba ikigo gisaba ko uza ubwawe, tubikubwira mbere yo kwishyura.",
        },
        {
          q: "Mukoresha izihe ndimi?",
          a: "Ikinyarwanda, Icyongereza n'Igifaransa, ku rubuga, kuri WhatsApp no ku itsinda ryacu.",
        },
      ],
      documents: [
        {
          q: "Nkeneye izihe nyandiko?",
          a: "Buri paji ya serivisi igaragaza ibisabwa mbere yo gusaba. Dusaba gusa ibyo ikigo gikeneye.",
        },
        {
          q: "Nshobora kohereza amadosiye ameze ate?",
          a: "PDF, JPG na PNG. Ifoto isobanutse ya telefone akenshi irahagije.",
        },
        {
          q: "Bigenda bite ntafite inyandiko zose?",
          a: "Tangira. Tukubwira neza ibibura tukakwibutsa; igihe gihagarara mu gihe tugutegereje.",
        },
        {
          q: "Nshobora kongera gukoresha inyandiko?",
          a: "Yego. Inyandiko wohereje zibikwa mu bubiko bwawe kugira ngo utohereza indangamuntu kabiri.",
        },
        {
          q: "Nakira nte inyandiko za nyuma?",
          a: "Uzikura kuri konti yawe, kandi tukakumenyesha kuri SMS cyangwa WhatsApp iyo ziteguye.",
        },
        {
          q: "Undi muntu yanyoherereza inyandiko?",
          a: "Yego, akoresheje konti yawe cyangwa umusangije ubusabe. Ni wowe ukomeza kubazwa amakuru.",
        },
      ],
      payments: [
        {
          q: "Nishyura nte serivisi?",
          a: "Kuri murandasi, kuri konti yawe igihe usaba. Ubona igiciro cyose mbere yo kwishyura.",
        },
        {
          q: "Mwemera ubuhe buryo bwo kwishyura?",
          a: "MTN MoMo, Airtel Money, ikarita cyangwa kohereza kuri banki.",
        },
        {
          q: "Amafaranga ya Leta ari mu giciro?",
          a: "Agaragazwa ku murongo wayo kandi yishyurwa uko ari. Ntitwongeraho inyungu.",
        },
        {
          q: "Nsaba nte gusubizwa amafaranga?",
          a: "Fungura ubusabe kuri konti yawe uhitemo “Saba gusubizwa”, cyangwa utuvugishe. Amabwiriza yacu asobanura igihe bikorwa.",
        },
        {
          q: "Gusubizwa bimara igihe kingana iki?",
          a: "Tukwemeza icyemezo n'igihe igihe dusuzuma ubusabe bwawe bwo gusubizwa.",
        },
        {
          q: "Nabona inyemezabwishyu?",
          a: "Yego. Uyakira kuri SMS no kuri imeri, kandi ushobora kuyikura kuri konti yawe.",
        },
        {
          q: "Kwishyura byanze ariko amafaranga yavuye kuri konti. Nkore iki?",
          a: "Ntiwongere kwishyura. Twandikire uduhe nimero y'ubusabe; turagenzura ihererekanya n'utanga serivisi.",
        },
      ],
      tracking: [
        {
          q: "Nkurikirana nte ubusabe bwanjye?",
          a: "Andika kode twakoherereje kuri SMS ku paji yo Gukurikirana, cyangwa ufungure ubusabe kuri konti yawe.",
        },
        {
          q: "Kode yo gukurikirana imeze ite?",
          a: "Kode zimeze nka HBZ-WMVX19.",
        },
        {
          q: "Bimara igihe kingana iki?",
          a: "Buri serivisi igaragaza igihe imara mbere yo gusaba. Uburyo bwihuse buraruta aho buri.",
        },
        {
          q: "Muzamenyesha niba hari igihindutse?",
          a: "Yego. Twohereza ubutumwa kuri SMS cyangwa WhatsApp, kandi buri ntambwe igaragara kuri konti yawe.",
        },
        {
          q: "Kuki ubusabe bwanjye bwahagaze?",
          a: "Akenshi tuba dutegereje inyandiko cyangwa igisubizo cyawe, cyangwa icy'ikigo. Igikurikirana kirabigaragaza.",
        },
      ],
      plans: [
        {
          q: "Ifatabuguzi rya buri kwezi ni iki?",
          a: "Riguha umubare w'ubusabe buri kwezi ku giciro kimwe, hamwe n'ikiganiro, ububiko bw'inyandiko n'ubutumwa.",
        },
        {
          q: "Hari igerageza ry'ubuntu?",
          a: "Konti nshya zitangirana n'igerageza ry'ubuntu. Igihe rimara kigaragazwa igihe wiyandikisha.",
        },
        {
          q: "Bigenda bite ndenze ifatabuguzi?",
          a: "Ubusabe bw'inyongera bwishyurwa ku giciro gisanzwe, cyangwa ukazamura ifatabuguzi.",
        },
        {
          q: "Nshobora guhindura cyangwa guhagarika ifatabuguzi?",
          a: "Yego, igihe icyo ari cyo cyose kuri konti yawe. Impinduka zitangira mu gihe gikurikira.",
        },
        {
          q: "Umukozi wawe bwite ni iki?",
          a: "Ku ifatabuguzi rya Retainer, umukozi uzwi akurikirana dosiye zawe kandi ubusabe bushya bujya kuri we.",
        },
        {
          q: "Serivisi zose ziri mu ifatabuguzi?",
          a: "Si zose. Buri paji ya serivisi igaragaza niba iri mu ifatabuguzi.",
        },
        {
          q: "Ubusabe ntakoresheje bwimurirwa ukwezi gukurikira?",
          a: "Oya. Umubare wawe usubira ku ntangiriro buri gihe cyo kwishyura.",
        },
      ],
      privacy: [
        {
          q: "Amakuru yanjye arinzwe?",
          a: "Yego. Inyandiko zirabitswe neza, abanyamwuga bari ku busabe bwawe bonyine ni bo bazibona, kandi twubahiriza itegeko ry'u Rwanda ryo kurinda amakuru bwite.",
        },
        {
          q: "Ni nde ubona inyandiko zanjye?",
          a: "Abakozi ba HEBUZA bakora ku busabe bwawe gusa. Buri gihe bazirebye biranditswe.",
        },
        {
          q: "Musangiza abandi amakuru yanjye?",
          a: "Gusa ikigo kigomba gukora ku busabe bwawe, kandi gusa ibyo gikeneye.",
        },
        {
          q: "Nshobora gusiba konti yanjye?",
          a: "Yego. Ushobora kudusaba gusiba konti n'amakuru yawe, uretse ibyo itegeko ridutegeka kubika.",
        },
        {
          q: "Namenya nte ubutumwa bw'ibinyoma bwiyita HEBUZA?",
          a: "Ntitujya dusaba PIN cyangwa ijambo ry'ibanga. Niba ushidikanya, duhamagare kuri nimero ziri kuri uru rubuga.",
        },
        {
          q: "Mukoresha mute cookies?",
          a: "Cookies z'ingenzi zituma urubuga rukora. Iz'isesengura n'izo kwamamaza zikora gusa iyo ubyemeye.",
        },
      ],
      business: [
        {
          q: "Mwanyandikishiriza sosiyete?",
          a: "Yego. Dutegura kandi tugatanga iyandikwa muri RDB, tukakubwira mbere ibyo dukeneye.",
        },
        {
          q: "Mufasha amakoperative?",
          a: "Yego: kwiyandikisha, kubahiriza amategeko, imishinga n'ubusabe bw'inkunga.",
        },
        {
          q: "Mwantangira imenyekanisha ry'imisoro rya buri kwezi?",
          a: "Yego. Dutegura kandi tugatanga TVA, PAYE n'andi. Ifatabuguzi rya buri kwezi akenshi rihendutse.",
        },
        {
          q: "Abantu benshi bo muri sosiyete bakoresha konti imwe?",
          a: "Uburyo bw'itsinda burateganyijwe. Ubu, sangiza bagenzi bawe ubusabe uhereye kuri konti yawe.",
        },
        {
          q: "Mufasha ku nguzanyo n'inkunga?",
          a: "Dufasha gutegura imishinga n'ubusabe. Utanga inguzanyo cyangwa inkunga ni we ufata icyemezo.",
        },
        {
          q: "Nabona fagitire mu izina rya sosiyete yanjye?",
          a: "Yego. Shyira amakuru ya sosiyete kuri konti yawe mbere yo kwishyura.",
        },
        {
          q: "Mukorana n'imiryango na ONG?",
          a: "Yego. Tuvugishe tuganire ku byo ukeneye; ifatabuguzi rya Retainer ribereye akazi gahoraho.",
        },
      ],
    },
  },
  contact: {
    meta: "Vugana na HEBUZA kuri WhatsApp, telefone, imeri cyangwa ifishi. Dusubiza mu masaha y'akazi.",
    tag: "Twandikire",
    l1: "Reka",
    hl: "tuganire.",
    sub: "Abakiriya benshi batwandikira kuri WhatsApp, dusubiza mu masaha y'akazi.",
    photoAlt: "Umujyanama wa HEBUZA kuri telefone",
    waTitle: "Twandikire kuri WhatsApp",
    waBody: "Ibisubizo byihuse, gukurikirana ubusabe no kubona amakuru mashya.",
    waOpen: "Fungura WhatsApp",
    phone: "Telefone",
    email: "Imeri",
    office: "Ibiro",
    hours: "Amasaha",
    hoursValue: "Kuwa 1–Kuwa 5 08:00–17:00",
    call: "Hamagara",
    copy: "Koporora",
    copied: "Byakoporowe",
    map: "Ikarita",
    addressTbc: "Aderesi izemezwa",
    formTitle: "Twohereze ubutumwa",
    formSub: "Tugusubiza ukoresheje uburyo wahisemo.",
    name: "Izina ryawe",
    contact: "Telefone cyangwa imeri",
    contactHint: "+250 7XX XXX XXX cyangwa wowe@urugero.com",
    language: "Ururimi wifuza",
    topic: "Ingingo",
    choose: "Hitamo ingingo…",
    message: "Ubutumwa",
    messageHint: "Tubwire uko twagufasha…",
    consent: "Mushobora kumvugisha ku busabe bwanjye",
    required: "birakenewe",
    topics: {
      general: "Ikibazo rusange",
      service: "Serivisi",
      pricing: "Ibiciro / ifatabuguzi",
      request: "Ubusabe busanzwe buhari",
      complaint: "Ikirego",
      partnership: "Ubufatanye",
    },
    send: "Ohereza ubutumwa",
    sending: "Birimo koherezwa…",
    never: "Ntitujya dusangiza abandi amakuru yawe.",
    errTitle: "Hari ikibazo",
    errBody: "Reba ifishi wongere ugerageze.",
    e: {
      name: "Andika izina ryawe",
      contact: "Andika telefone cyangwa imeri nyayo",
      topic: "Hitamo ingingo",
      message: "Andika ubutumwa bw'inyuguti nibura 10",
      consent: "Kanda aka gasanduku kugira ngo tukuvugishe",
    },
    fail: "Ntitwabashije kohereza ubutumwa bwawe. Reba murandasi wongere ugerageze, cyangwa utwandikire kuri WhatsApp.",
    rate: "Wohereje ubutumwa bwinshi mu gihe gito. Tegereza iminota mike wongere ugerageze.",
    prefPlan: "Wabajije ku ifatabuguzi rya {name}.",
    prefPlanMsg: "Ndashaka kumenya byinshi ku ifatabuguzi rya {name}.",
    prefService: "Wabajije kuri {name}.",
    prefServiceMsg: "Ndashaka kumenya byinshi kuri {name}.",
    sentTitle: "Murakoze, twabyakiriye.",
    sentRef: "Nimero yawe ni {ref}.",
    sentBody: "Tuzagusubiza ukoresheje uburyo wahisemo mu masaha y'akazi.",
    track: "Kurikirana ubusabe",
    home: "Subira ahabanza",
    another: "Ohereza ubundi butumwa",
    mapTitle: "Ibiro bya HEBUZA",
    directions: "Inzira",
    otherTitle: "Ubundi buryo twagufasha",
    other: [
      {
        t: "Kurikirana ubusabe",
        b: "Koresha kode yo muri SMS.",
        href: "/track",
      },
      { t: "Saba inama y'ubuntu", b: "Vugana n'umujyanama.", href: "/book" },
      {
        t: "Soma ibibazo bikunze kubazwa",
        b: "Ibisubizo byihuse.",
        href: "/faq",
      },
    ],
  },
};

export const LB: Record<Locale, LBCopy> = { en, fr, rw };
export const getLB = (l: Locale) => LB[l];

/** Compare-table values per known plan id (unknown plans show "—"). true = included, string = shown as-is. */
export const PLAN_MATRIX: Record<
  string,
  Record<string, boolean | "upgrade">
> = {
  pln_zcqmLg4E: {
    chat: true,
    vault: true,
    alerts: false,
    priority: false,
    agent: false,
  },
  pln_starter: {
    chat: true,
    vault: true,
    alerts: true,
    priority: false,
    agent: false,
  },
  pln_growth: {
    chat: true,
    vault: true,
    alerts: true,
    priority: true,
    agent: "upgrade",
  },
  pln_retainer: {
    chat: true,
    vault: true,
    alerts: true,
    priority: true,
    agent: true,
  },
};
export const planMatrix = (id: string) =>
  PLAN_MATRIX[id] ??
  PLAN_MATRIX[Object.keys(PLAN_MATRIX).find((k) => id.startsWith(k)) ?? ""] ??
  {};

export const fill = (s: string, v: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
