import type { Locale } from "@/shared/i18n/config";

// L-D growth pages copy + typed content (book, join-us, knowledge, updates, campaign). Typed by the English source.
// shortcut: guides, updates and campaigns live in code as clearly marked examples; swap for the CMS (F-CMS-04) in Stage 10.

const en = {
  example: "Example",
  exampleNote:
    "Example content. HEBUZA will replace it with reviewed, dated entries.",
  book: {
    meta: "Book a free 30-minute intro or a paid consultation with a HEBUZA adviser, by phone, video or in person.",
    l1: "Talk to an",
    hl: "expert.",
    sub: "Not sure what you need? Book a short call in Kinyarwanda, English or French.",
    steps: ["Type", "Topic", "Time", "Details"],
    stepOf: "Step {n} of {total}",
    free: "Free",
    paid: "Paid",
    introT: "30-minute intro",
    introB:
      "Understand your options and the right service. Once per service area.",
    introTicks: ["Phone, video or office", "No obligation"],
    consultT: "60-minute consultation",
    consultB: "Detailed advice on your case from a senior professional.",
    consultPrice: "From {price}",
    consultTicks: ["Credited if you go ahead with the service"],
    choose: "Choose",
    chosen: "Selected",
    topicQ: "What would you like to discuss?",
    service: "Specific service",
    serviceAny: "Not sure yet",
    meetQ: "How would you like to meet?",
    modes: {
      phone: "Phone",
      video: "Video (Google Meet)",
      office: "At our office",
      premises: "At your premises (Kigali)",
    },
    language: "Language",
    timeQ: "Pick a day and time",
    tz: "Times shown in Kigali time (CAT)",
    prevMonth: "Previous month",
    nextMonth: "Next month",
    weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    pickDay: "Choose a day to see open times.",
    noSlots: "No open times on this day. Try another day.",
    full: "full",
    loadError: "We couldn't load open times.",
    retry: "Try again",
    withAdviser: "With an adviser from {area}",
    details: "Your details",
    name: "Full name",
    phone: "Phone (+250)",
    phoneHint: "e.g. 0788 123 456",
    email: "Email",
    optional: "optional",
    notes: "Anything we should know?",
    notesPh: "e.g. a specific question or deadline",
    reminders: "Send me reminders by SMS/WhatsApp",
    pay: "Payment",
    payWith: "Pay with",
    methods: { momo: "MTN MoMo", airtel: "Airtel Money", card: "Card" },
    payPhone: "Mobile money number",
    cardNote:
      "You'll enter card details on the secure payment page after confirming.",
    payNote: "You'll get a prompt on your phone to approve the payment.",
    summary: "Summary",
    back: "Back",
    continue: "Continue",
    confirm: "Confirm booking",
    confirming: "Booking…",
    errTitle: "Please fix the following",
    err: {
      type: "Choose a type of meeting.",
      topic: "Choose a topic.",
      mode: "Choose how you'd like to meet.",
      slot: "Choose a day and a time.",
      name: "Enter your full name.",
      phone: "Enter a Rwandan phone number, e.g. 0788 123 456.",
      email: "Enter a valid email or leave it empty.",
      payPhone: "Enter the mobile money number to charge.",
      taken: "Sorry, that time was just taken. Please pick another.",
      network:
        "We couldn't confirm your booking. Check your connection and try again.",
    },
    done: "You're booked!",
    doneRef: "Reference {ref}",
    meetNote: "A Google Meet link will be sent by SMS and email.",
    phoneNote: "An adviser will call you on {phone}.",
    officeNote: "We'll send directions by SMS.",
    premisesNote: "An adviser will confirm your address by phone.",
    payPending: "Approve the payment prompt on your phone to secure the slot.",
    addCal: "Add to calendar",
    reschedule: "Reschedule",
    cancel: "Cancel booking",
    cancelSure: "Cancel this booking?",
    cancelYes: "Yes, cancel",
    cancelNo: "Keep it",
    cancelled: "Your booking is cancelled. You can book again any time.",
    bookAgain: "Book another time",
    remind: "We'll remind you 24 hours and 1 hour before.",
    icsTitle: "HEBUZA consultation",
  },
  join: {
    meta: "Join HEBUZA's network of verified accountants, tax advisers, consultants and field agents. Paid tasks, monthly statements.",
    tag: "Work with HEBUZA",
    l1: "Do great work.",
    l2: "Get paid",
    hl: "on time.",
    sub: "Join our network of verified accountants, tax advisers, consultants and field agents. Receive paid tasks, deliver online, get monthly statements.",
    apply: "Apply now",
    how: "How it works",
    whoT: "Who we look for",
    who: [
      "Accountants",
      "Tax advisers",
      "Business consultants",
      "Field agents — visit RDB, RRA and sector offices",
    ],
    howT: "How it works",
    steps: [
      "Apply",
      "Get verified (ID & certificates)",
      "Sign the NDA online",
      "Accept paid offers",
      "Get paid monthly",
    ],
    earnT: "Clear earnings, every month.",
    earnB:
      "You earn a share of the service fee on every task you complete. Your exact rate is in your contract.",
    stmt: "Example statement",
    stmtSub: "Illustration only — not real earnings",
    needT: "What you need",
    need: [
      "National ID or passport",
      "Professional certificates",
      "Bank or MoMo account",
      "A phone with internet",
    ],
    faqT: "Frequently asked questions",
    faq: [
      {
        q: "Is this a job?",
        a: "No. You join as an external professional and work on tasks you accept. You choose how much you take on.",
      },
      {
        q: "How do offers work?",
        a: "When a request matches your skills, you get an offer with the scope, deadline and your fee. Accept or decline it in your workspace.",
      },
      {
        q: "When do I get paid?",
        a: "Completed and approved tasks are paid monthly, with a statement showing every task and any withholding tax.",
      },
      {
        q: "Can I decline a task?",
        a: "Yes. Declining is fine; we'll offer it to someone else.",
      },
    ],
    readyT: "Ready to join?",
    readyB:
      "Applications take about 10 minutes. Have your ID and certificates ready.",
  },
  knowledge: {
    meta: "Plain-language guides for Rwandan businesses: registration, tax, accounting, investment, funding and compliance.",
    tag: "Guides",
    l1: "Plain-language",
    hl: "help",
    l2: "for Rwandan businesses.",
    search: "Search guides — e.g. VAT, RDB, loan",
    all: "All",
    cats: {
      registration: "Registration",
      tax: "Tax",
      accounting: "Accounting",
      investment: "Investment",
      funding: "Funding",
      compliance: "Compliance",
      digital: "Digital",
    },
    featured: "Featured",
    read: "Read guide",
    minRead: "{n} min read",
    by: "By the HEBUZA team",
    gridT: "Guides",
    noneT: "No guides match",
    noneB: "Try another word or category, or ask us on WhatsApp.",
    clear: "Clear filters",
    prev: "Previous",
    next: "Next",
    page: "Page {n}",
    newsT: "Get new guides and regulatory updates",
    newsPh: "Your email or phone",
    newsDone: "Thanks — check your inbox or SMS to confirm.",
    newsErr: "Enter a valid email or phone number.",
    crumb: "Guides",
    published: "Published {d}",
    updated: "Updated {d}",
    contents: "Contents",
    sec: {
      overview: "Overview",
      reqs: "What you need",
      steps: "Step by step",
      fees: "Fees",
      tip: "Tip",
      related: "Related service",
    },
    feeType: "Option",
    feeHebuza: "HEBUZA fee",
    feeGov: "Government fee",
    feeTime: "Time",
    feeNote:
      "Fees from the HEBUZA catalogue. Government fees can change; we confirm them before you pay.",
    apply: "Apply",
    helpful: "Was this helpful?",
    yes: "Yes",
    no: "No",
    thanks: "Thanks for the feedback.",
    share: "Share",
    copy: "Copy link",
    copied: "Link copied",
    relatedT: "Related guides",
    ctaT: "Let us do it for you",
    calendarT: "In the compliance calendar", calendarB: "Track these deadlines in your HEBUZA calendar so you get reminders.", ctaB: "Start a request",
  },
  updates: {
    meta: "Rule changes at RRA, RDB, RSSB and others, explained: who it affects and what to do.",
    tag: "Regulatory updates",
    l1: "Rule changes,",
    hl: "explained.",
    sub: "What changed at RRA, RDB, RSSB and others — who it affects, and what to do.",
    inst: "Institution",
    affects: "Affects",
    all: "All",
    aff: {
      individuals: "Individuals",
      companies: "Companies",
      coops: "Cooperatives & NGOs",
    },
    changed: "What changed",
    who: "Who it affects",
    todo: "What to do",
    deadline: "Deadline",
    addCal: "Add to calendar",
    help: "How HEBUZA can help",
    getHelp: "Get help",
    more: "Load older updates",
    noneT: "No updates match these filters",
    noneB: "Try another institution or clear the filters.",
    clear: "Clear filters",
    bandT: "Never miss a deadline.",
    bandB: "Get updates by email or WhatsApp in your language.",
    bandNote: "Double opt-in. Unsubscribe any time.",
    lang: "Language",
    crumb: "Updates",
    published: "Published {d}",
    contents: "Contents",
    relatedT: "Related updates",
    ctaT: "Let us do it for you",
    calendarT: "In the compliance calendar", calendarB: "Track these deadlines in your HEBUZA calendar so you get reminders.", ctaB: "Start a request",
  },
  campaign: {
    formT: "Get started in 2 minutes",
    name: "Name",
    namePh: "Your full name",
    phone: "Phone (+250)",
    phonePh: "07XX XXX XXX",
    type: "Business type",
    typePh: "Select type",
    types: [
      "Sole proprietor",
      "Private company (Ltd)",
      "Cooperative",
      "NGO / association",
      "Not sure yet",
    ],
    agree: "I agree to the terms and privacy policy.",
    or: "Or chat on WhatsApp",
    busy: "Sending…",
    err: {
      name: "Enter your name.",
      phone: "Enter a Rwandan phone number, e.g. 0788 123 456.",
      type: "Choose a business type.",
      agree: "Please accept the terms to continue.",
      send: "We couldn't send your details. Try again or chat on WhatsApp.",
    },
    errTitle: "Please fix the following",
    doneT: "Thank you! We'll call you shortly.",
    doneB:
      "A HEBUZA adviser will call {phone} within working hours (Mon–Fri 08:00–17:00).",
    trust: ["Verified professionals", "Track every step", "Secure payment"],
    getT: "What you get",
    howT: "How it works",
    faqT: "Frequently asked questions",
    call: "Call",
    until: "Offer ends {d}",
  },
};

export type LdCopy = typeof en;

const fr: LdCopy = {
  example: "Exemple",
  exampleNote:
    "Contenu d'exemple. HEBUZA le remplacera par des entrées vérifiées et datées.",
  book: {
    meta: "Réservez une introduction gratuite de 30 minutes ou une consultation payante avec un conseiller HEBUZA, par téléphone, vidéo ou en personne.",
    l1: "Parlez à un",
    hl: "expert.",
    sub: "Vous ne savez pas ce qu'il vous faut ? Réservez un court appel en kinyarwanda, anglais ou français.",
    steps: ["Type", "Sujet", "Horaire", "Coordonnées"],
    stepOf: "Étape {n} sur {total}",
    free: "Gratuit",
    paid: "Payant",
    introT: "Introduction de 30 minutes",
    introB: "Comprenez vos options et le bon service. Une fois par domaine.",
    introTicks: ["Téléphone, vidéo ou bureau", "Sans engagement"],
    consultT: "Consultation de 60 minutes",
    consultB:
      "Un avis détaillé sur votre dossier par un professionnel expérimenté.",
    consultPrice: "À partir de {price}",
    consultTicks: ["Déduit si vous poursuivez avec le service"],
    choose: "Choisir",
    chosen: "Sélectionné",
    topicQ: "De quoi souhaitez-vous parler ?",
    service: "Service précis",
    serviceAny: "Je ne sais pas encore",
    meetQ: "Comment souhaitez-vous vous rencontrer ?",
    modes: {
      phone: "Téléphone",
      video: "Vidéo (Google Meet)",
      office: "À notre bureau",
      premises: "Chez vous (Kigali)",
    },
    language: "Langue",
    timeQ: "Choisissez un jour et une heure",
    tz: "Heures affichées à l'heure de Kigali (CAT)",
    prevMonth: "Mois précédent",
    nextMonth: "Mois suivant",
    weekdays: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
    pickDay: "Choisissez un jour pour voir les créneaux.",
    noSlots: "Aucun créneau libre ce jour-là. Essayez un autre jour.",
    full: "complet",
    loadError: "Impossible de charger les créneaux.",
    retry: "Réessayer",
    withAdviser: "Avec un conseiller {area}",
    details: "Vos coordonnées",
    name: "Nom complet",
    phone: "Téléphone (+250)",
    phoneHint: "ex. 0788 123 456",
    email: "E-mail",
    optional: "facultatif",
    notes: "Quelque chose à nous signaler ?",
    notesPh: "ex. une question précise ou une échéance",
    reminders: "M'envoyer des rappels par SMS/WhatsApp",
    pay: "Paiement",
    payWith: "Payer avec",
    methods: { momo: "MTN MoMo", airtel: "Airtel Money", card: "Carte" },
    payPhone: "Numéro mobile money",
    cardNote:
      "Vous saisirez votre carte sur la page de paiement sécurisée après confirmation.",
    payNote: "Vous recevrez une demande de validation sur votre téléphone.",
    summary: "Récapitulatif",
    back: "Retour",
    continue: "Continuer",
    confirm: "Confirmer la réservation",
    confirming: "Réservation…",
    errTitle: "Veuillez corriger les points suivants",
    err: {
      type: "Choisissez un type de rendez-vous.",
      topic: "Choisissez un sujet.",
      mode: "Choisissez un mode de rencontre.",
      slot: "Choisissez un jour et une heure.",
      name: "Saisissez votre nom complet.",
      phone: "Saisissez un numéro rwandais, ex. 0788 123 456.",
      email: "Saisissez un e-mail valide ou laissez vide.",
      payPhone: "Saisissez le numéro mobile money à débiter.",
      taken: "Désolé, ce créneau vient d'être pris. Choisissez-en un autre.",
      network:
        "Impossible de confirmer. Vérifiez votre connexion et réessayez.",
    },
    done: "C'est réservé !",
    doneRef: "Référence {ref}",
    meetNote: "Un lien Google Meet vous sera envoyé par SMS et e-mail.",
    phoneNote: "Un conseiller vous appellera au {phone}.",
    officeNote: "Nous vous enverrons l'itinéraire par SMS.",
    premisesNote: "Un conseiller confirmera votre adresse par téléphone.",
    payPending:
      "Validez la demande de paiement sur votre téléphone pour garantir le créneau.",
    addCal: "Ajouter au calendrier",
    reschedule: "Reprogrammer",
    cancel: "Annuler la réservation",
    cancelSure: "Annuler cette réservation ?",
    cancelYes: "Oui, annuler",
    cancelNo: "La garder",
    cancelled:
      "Votre réservation est annulée. Vous pouvez réserver à nouveau quand vous voulez.",
    bookAgain: "Réserver un autre créneau",
    remind: "Rappel 24 heures et 1 heure avant.",
    icsTitle: "Consultation HEBUZA",
  },
  join: {
    meta: "Rejoignez le réseau HEBUZA de comptables, conseillers fiscaux, consultants et agents de terrain vérifiés. Missions payées, relevés mensuels.",
    tag: "Travailler avec HEBUZA",
    l1: "Faites du bon travail.",
    l2: "Soyez payé",
    hl: "à temps.",
    sub: "Rejoignez notre réseau de comptables, conseillers fiscaux, consultants et agents de terrain vérifiés. Recevez des missions payées, livrez en ligne, recevez un relevé mensuel.",
    apply: "Postuler",
    how: "Comment ça marche",
    whoT: "Qui nous recherchons",
    who: [
      "Comptables",
      "Conseillers fiscaux",
      "Consultants d'entreprise",
      "Agents de terrain — RDB, RRA et bureaux de secteur",
    ],
    howT: "Comment ça marche",
    steps: [
      "Postulez",
      "Faites-vous vérifier (pièce d'identité et certificats)",
      "Signez l'accord de confidentialité en ligne",
      "Acceptez des missions payées",
      "Soyez payé chaque mois",
    ],
    earnT: "Des revenus clairs, chaque mois.",
    earnB:
      "Vous percevez une part des frais de service pour chaque mission réalisée. Votre taux exact figure dans votre contrat.",
    stmt: "Exemple de relevé",
    stmtSub: "Illustration uniquement — pas de revenus réels",
    needT: "Ce qu'il vous faut",
    need: [
      "Carte d'identité ou passeport",
      "Certificats professionnels",
      "Compte bancaire ou MoMo",
      "Un téléphone avec internet",
    ],
    faqT: "Questions fréquentes",
    faq: [
      {
        q: "Est-ce un emploi ?",
        a: "Non. Vous intervenez en tant que professionnel externe sur les missions que vous acceptez. Vous choisissez votre charge.",
      },
      {
        q: "Comment fonctionnent les offres ?",
        a: "Quand une demande correspond à vos compétences, vous recevez une offre avec le périmètre, l'échéance et votre rémunération. Acceptez ou refusez-la dans votre espace.",
      },
      {
        q: "Quand suis-je payé ?",
        a: "Les missions terminées et validées sont payées chaque mois, avec un relevé détaillant chaque mission et la retenue à la source éventuelle.",
      },
      {
        q: "Puis-je refuser une mission ?",
        a: "Oui. Nous la proposerons à quelqu'un d'autre.",
      },
    ],
    readyT: "Prêt à nous rejoindre ?",
    readyB:
      "La candidature prend environ 10 minutes. Préparez votre pièce d'identité et vos certificats.",
  },
  knowledge: {
    meta: "Des guides simples pour les entreprises rwandaises : création, fiscalité, comptabilité, investissement, financement et conformité.",
    tag: "Guides",
    l1: "Une aide",
    hl: "claire",
    l2: "pour les entreprises rwandaises.",
    search: "Rechercher — ex. TVA, RDB, prêt",
    all: "Tous",
    cats: {
      registration: "Création",
      tax: "Fiscalité",
      accounting: "Comptabilité",
      investment: "Investissement",
      funding: "Financement",
      compliance: "Conformité",
      digital: "Numérique",
    },
    featured: "À la une",
    read: "Lire le guide",
    minRead: "{n} min de lecture",
    by: "Par l'équipe HEBUZA",
    gridT: "Guides",
    noneT: "Aucun guide trouvé",
    noneB:
      "Essayez un autre mot ou une autre catégorie, ou écrivez-nous sur WhatsApp.",
    clear: "Effacer les filtres",
    prev: "Précédent",
    next: "Suivant",
    page: "Page {n}",
    newsT: "Recevez les nouveaux guides et les mises à jour réglementaires",
    newsPh: "Votre e-mail ou téléphone",
    newsDone: "Merci — confirmez via votre e-mail ou SMS.",
    newsErr: "Saisissez un e-mail ou un numéro valide.",
    crumb: "Guides",
    published: "Publié le {d}",
    updated: "Mis à jour le {d}",
    contents: "Sommaire",
    sec: {
      overview: "Aperçu",
      reqs: "Ce qu'il vous faut",
      steps: "Étape par étape",
      fees: "Frais",
      tip: "Astuce",
      related: "Service associé",
    },
    feeType: "Option",
    feeHebuza: "Frais HEBUZA",
    feeGov: "Frais publics",
    feeTime: "Délai",
    feeNote:
      "Frais issus du catalogue HEBUZA. Les frais publics peuvent changer ; nous les confirmons avant paiement.",
    apply: "Demander",
    helpful: "Ce guide vous a-t-il aidé ?",
    yes: "Oui",
    no: "Non",
    thanks: "Merci pour votre avis.",
    share: "Partager",
    copy: "Copier le lien",
    copied: "Lien copié",
    relatedT: "Guides associés",
    ctaT: "Laissez-nous faire",
    calendarT: "Dans le calendrier de conformité", calendarB: "Suivez ces échéances dans votre calendrier HEBUZA pour recevoir des rappels.", ctaB: "Lancer une demande",
  },
  updates: {
    meta: "Les changements de règles à la RRA, la RDB, la RSSB et ailleurs, expliqués : qui est concerné et quoi faire.",
    tag: "Mises à jour réglementaires",
    l1: "Les règles changent,",
    hl: "expliquées.",
    sub: "Ce qui change à la RRA, la RDB, la RSSB et ailleurs — qui est concerné, et quoi faire.",
    inst: "Institution",
    affects: "Concerne",
    all: "Toutes",
    aff: {
      individuals: "Particuliers",
      companies: "Sociétés",
      coops: "Coopératives et ONG",
    },
    changed: "Ce qui change",
    who: "Qui est concerné",
    todo: "Que faire",
    deadline: "Échéance",
    addCal: "Ajouter au calendrier",
    help: "Comment HEBUZA peut aider",
    getHelp: "Obtenir de l'aide",
    more: "Voir les mises à jour plus anciennes",
    noneT: "Aucune mise à jour pour ces filtres",
    noneB: "Essayez une autre institution ou effacez les filtres.",
    clear: "Effacer les filtres",
    bandT: "Ne ratez plus une échéance.",
    bandB:
      "Recevez les mises à jour par e-mail ou WhatsApp, dans votre langue.",
    bandNote: "Double confirmation. Désinscription à tout moment.",
    lang: "Langue",
    crumb: "Mises à jour",
    published: "Publié le {d}",
    contents: "Sommaire",
    relatedT: "Mises à jour associées",
    ctaT: "Laissez-nous faire",
    calendarT: "Dans le calendrier de conformité", calendarB: "Suivez ces échéances dans votre calendrier HEBUZA pour recevoir des rappels.", ctaB: "Lancer une demande",
  },
  campaign: {
    formT: "Commencez en 2 minutes",
    name: "Nom",
    namePh: "Votre nom complet",
    phone: "Téléphone (+250)",
    phonePh: "07XX XXX XXX",
    type: "Type d'entreprise",
    typePh: "Choisir le type",
    types: [
      "Entreprise individuelle",
      "Société privée (Ltd)",
      "Coopérative",
      "ONG / association",
      "Je ne sais pas encore",
    ],
    agree: "J'accepte les conditions et la politique de confidentialité.",
    or: "Ou discutez sur WhatsApp",
    busy: "Envoi…",
    err: {
      name: "Saisissez votre nom.",
      phone: "Saisissez un numéro rwandais, ex. 0788 123 456.",
      type: "Choisissez un type d'entreprise.",
      agree: "Veuillez accepter les conditions pour continuer.",
      send: "Envoi impossible. Réessayez ou écrivez-nous sur WhatsApp.",
    },
    errTitle: "Veuillez corriger les points suivants",
    doneT: "Merci ! Nous vous appelons très vite.",
    doneB:
      "Un conseiller HEBUZA appellera le {phone} aux heures d'ouverture (lun–ven 08:00–17:00).",
    trust: [
      "Professionnels vérifiés",
      "Suivi à chaque étape",
      "Paiement sécurisé",
    ],
    getT: "Ce que vous obtenez",
    howT: "Comment ça marche",
    faqT: "Questions fréquentes",
    call: "Appeler",
    until: "Offre valable jusqu'au {d}",
  },
};

const rw: LdCopy = {
  example: "Urugero",
  exampleNote:
    "Ibi ni ingero. HEBUZA izabisimbuza inyandiko zasuzumwe kandi zifite amatariki.",
  book: {
    meta: "Fata gahunda y'iminota 30 y'ubuntu cyangwa inama yishyurwa n'umujyanama wa HEBUZA, kuri telefoni, kuri videwo cyangwa imbonankubone.",
    l1: "Vugana n'",
    hl: "inzobere.",
    sub: "Ntuzi neza icyo ukeneye? Fata gahunda y'ikiganiro gito mu Kinyarwanda, Icyongereza cyangwa Igifaransa.",
    steps: ["Ubwoko", "Ingingo", "Igihe", "Imyirondoro"],
    stepOf: "Intambwe {n} kuri {total}",
    free: "Ubuntu",
    paid: "Kishyurwa",
    introT: "Ikiganiro cy'iminota 30",
    introB: "Menya amahitamo yawe na serivisi ikwiye. Rimwe kuri buri gice.",
    introTicks: ["Telefoni, videwo cyangwa ku biro", "Nta kwiyemeza"],
    consultT: "Inama y'iminota 60",
    consultB:
      "Inama irambuye ku kibazo cyawe itanzwe n'inzobere y'inararibonye.",
    consultPrice: "Guhera kuri {price}",
    consultTicks: ["Ikurwa ku giciro niba ukomeje na serivisi"],
    choose: "Hitamo",
    chosen: "Byahiswemo",
    topicQ: "Ni iki wifuza kuganiraho?",
    service: "Serivisi runaka",
    serviceAny: "Sindabimenya",
    meetQ: "Wifuza ko duhura gute?",
    modes: {
      phone: "Telefoni",
      video: "Videwo (Google Meet)",
      office: "Ku biro byacu",
      premises: "Aho ukorera (Kigali)",
    },
    language: "Ururimi",
    timeQ: "Hitamo umunsi n'isaha",
    tz: "Amasaha agaragazwa ni aya Kigali (CAT)",
    prevMonth: "Ukwezi gushize",
    nextMonth: "Ukwezi gutaha",
    weekdays: ["Mbe", "Kab", "Gat", "Kan", "Gat", "Gtd", "Cyu"],
    pickDay: "Hitamo umunsi urebe amasaha ahari.",
    noSlots: "Nta saha ihari uwo munsi. Gerageza undi munsi.",
    full: "yuzuye",
    loadError: "Ntitwashoboye kubona amasaha ahari.",
    retry: "Ongera ugerageze",
    withAdviser: "Hamwe n'umujyanama wa {area}",
    details: "Imyirondoro yawe",
    name: "Amazina yose",
    phone: "Telefoni (+250)",
    phoneHint: "urugero 0788 123 456",
    email: "Imeyili",
    optional: "si ngombwa",
    notes: "Hari icyo twakagombye kumenya?",
    notesPh: "urugero ikibazo runaka cyangwa itariki ntarengwa",
    reminders: "Unyibutse kuri SMS/WhatsApp",
    pay: "Kwishyura",
    payWith: "Ishyura ukoresheje",
    methods: { momo: "MTN MoMo", airtel: "Airtel Money", card: "Ikarita" },
    payPhone: "Nimero ya mobile money",
    cardNote:
      "Uzandika amakuru y'ikarita ku rupapuro rwizewe rwo kwishyura nyuma yo kwemeza.",
    payNote: "Uzabona ubutumwa kuri telefoni bwo kwemeza kwishyura.",
    summary: "Incamake",
    back: "Subira inyuma",
    continue: "Komeza",
    confirm: "Emeza gahunda",
    confirming: "Turabika…",
    errTitle: "Kosora ibi bikurikira",
    err: {
      type: "Hitamo ubwoko bw'inama.",
      topic: "Hitamo ingingo.",
      mode: "Hitamo uburyo duhura.",
      slot: "Hitamo umunsi n'isaha.",
      name: "Andika amazina yawe yose.",
      phone: "Andika nimero yo mu Rwanda, urugero 0788 123 456.",
      email: "Andika imeyili nyayo cyangwa uyireke.",
      payPhone: "Andika nimero ya mobile money izishyura.",
      taken: "Mutwihanganire, iyo saha imaze gufatwa. Hitamo indi.",
      network:
        "Ntitwashoboye kwemeza gahunda. Reba murandasi wongere ugerageze.",
    },
    done: "Gahunda yawe yemejwe!",
    doneRef: "Nomero {ref}",
    meetNote: "Link ya Google Meet izoherezwa kuri SMS no kuri imeyili.",
    phoneNote: "Umujyanama azaguhamagara kuri {phone}.",
    officeNote: "Tuzakoherereza aho tubarizwa kuri SMS.",
    premisesNote: "Umujyanama azemeza aderesi yawe kuri telefoni.",
    payPending:
      "Emeza ubutumwa bwo kwishyura kuri telefoni kugira ngo isaha ikubikirwe.",
    addCal: "Shyira kuri kalendari",
    reschedule: "Hindura igihe",
    cancel: "Hagarika gahunda",
    cancelSure: "Uhagarike iyi gahunda?",
    cancelYes: "Yego, hagarika",
    cancelNo: "Oya, yigumane",
    cancelled:
      "Gahunda yawe yahagaritswe. Ushobora gufata indi igihe icyo ari cyo cyose.",
    bookAgain: "Fata ikindi gihe",
    remind: "Tuzakwibutsa amasaha 24 n'isaha 1 mbere.",
    icsTitle: "Inama na HEBUZA",
  },
  join: {
    meta: "Injira mu itsinda rya HEBUZA ry'abacungamari, abajyanama mu misoro, abajyanama mu bucuruzi n'abakozi bo hanze bemejwe. Imirimo yishyurwa, raporo buri kwezi.",
    tag: "Korana na HEBUZA",
    l1: "Kora akazi keza.",
    l2: "Wishyurwe",
    hl: "ku gihe.",
    sub: "Injira mu itsinda ryacu ry'abacungamari, abajyanama mu misoro, abajyanama mu bucuruzi n'abakozi bo hanze bemejwe. Habwa imirimo yishyurwa, uyitange kuri murandasi, ubone raporo buri kwezi.",
    apply: "Saba nonaha",
    how: "Uko bikora",
    whoT: "Abo dushaka",
    who: [
      "Abacungamari",
      "Abajyanama mu misoro",
      "Abajyanama mu bucuruzi",
      "Abakozi bo hanze — basura RDB, RRA n'ibiro by'imirenge",
    ],
    howT: "Uko bikora",
    steps: [
      "Saba",
      "Wemezwe (indangamuntu n'impamyabumenyi)",
      "Shyira umukono ku masezerano y'ibanga kuri murandasi",
      "Emera imirimo yishyurwa",
      "Wishyurwe buri kwezi",
    ],
    earnT: "Amafaranga asobanutse, buri kwezi.",
    earnB:
      "Uhabwa igice cy'igiciro cya serivisi kuri buri murimo urangije. Igipimo cyawe nyacyo kiri mu masezerano yawe.",
    stmt: "Urugero rwa raporo",
    stmtSub: "Ni urugero gusa — si amafaranga nyayo",
    needT: "Ibyo ukeneye",
    need: [
      "Indangamuntu cyangwa pasiporo",
      "Impamyabumenyi z'umwuga",
      "Konti ya banki cyangwa MoMo",
      "Telefoni ifite murandasi",
    ],
    faqT: "Ibibazo bikunze kubazwa",
    faq: [
      {
        q: "Ese ni akazi gahoraho?",
        a: "Oya. Uza nk'umunyamwuga wo hanze ugakora imirimo wemeye. Ni wowe uhitamo ingano y'imirimo.",
      },
      {
        q: "Imirimo itangwa ite?",
        a: "Iyo ubusabe buhuye n'ubumenyi bwawe, uhabwa icyifuzo kigaragaza ibikorwa, itariki ntarengwa n'amafaranga yawe. Ucyemera cyangwa ukacyanga mu mwanya wawe.",
      },
      {
        q: "Nishyurwa ryari?",
        a: "Imirimo yarangiye ikemezwa yishyurwa buri kwezi, hamwe na raporo igaragaza buri murimo n'umusoro wakaswe.",
      },
      { q: "Nshobora kwanga umurimo?", a: "Yego. Tuwuha undi." },
    ],
    readyT: "Witeguye kwinjira?",
    readyB:
      "Gusaba bifata iminota nka 10. Tegura indangamuntu n'impamyabumenyi zawe.",
  },
  knowledge: {
    meta: "Amabwiriza yoroshye ku bucuruzi bwo mu Rwanda: kwiyandikisha, imisoro, ibaruramari, ishoramari, inguzanyo no kubahiriza amategeko.",
    tag: "Amabwiriza",
    l1: "Ubufasha",
    hl: "bwumvikana",
    l2: "ku bucuruzi bwo mu Rwanda.",
    search: "Shakisha — urugero TVA, RDB, inguzanyo",
    all: "Byose",
    cats: {
      registration: "Kwiyandikisha",
      tax: "Imisoro",
      accounting: "Ibaruramari",
      investment: "Ishoramari",
      funding: "Inguzanyo",
      compliance: "Kubahiriza amategeko",
      digital: "Ikoranabuhanga",
    },
    featured: "Iby'ingenzi",
    read: "Soma",
    minRead: "Iminota {n} yo gusoma",
    by: "Byanditswe n'itsinda rya HEBUZA",
    gridT: "Amabwiriza",
    noneT: "Nta mabwiriza abonetse",
    noneB:
      "Gerageza irindi jambo cyangwa ikindi cyiciro, cyangwa utubaze kuri WhatsApp.",
    clear: "Siba ibyatoranyijwe",
    prev: "Ibibanza",
    next: "Ibikurikira",
    page: "Urupapuro {n}",
    newsT: "Habwa amabwiriza mashya n'impinduka z'amategeko",
    newsPh: "Imeyili cyangwa telefoni",
    newsDone: "Murakoze — emeza ukoresheje imeyili cyangwa SMS.",
    newsErr: "Andika imeyili cyangwa nimero nyayo.",
    crumb: "Amabwiriza",
    published: "Byatangajwe {d}",
    updated: "Byavuguruwe {d}",
    contents: "Ibikubiyemo",
    sec: {
      overview: "Incamake",
      reqs: "Ibyo ukeneye",
      steps: "Intambwe ku yindi",
      fees: "Ibiciro",
      tip: "Inama",
      related: "Serivisi bijyanye",
    },
    feeType: "Ihitamo",
    feeHebuza: "Igiciro cya HEBUZA",
    feeGov: "Amafaranga ya Leta",
    feeTime: "Igihe",
    feeNote:
      "Ibiciro biva mu rutonde rwa HEBUZA. Amafaranga ya Leta ashobora guhinduka; turayemeza mbere yo kwishyura.",
    apply: "Saba",
    helpful: "Ibi byagufashije?",
    yes: "Yego",
    no: "Oya",
    thanks: "Murakoze ku gitekerezo.",
    share: "Sangiza",
    copy: "Koporora link",
    copied: "Link yakoporowe",
    relatedT: "Andi mabwiriza",
    ctaT: "Reka tubigukorere",
    calendarT: "Mu ngengabihe y'iyubahirizwa", calendarB: "Kurikirana aya matariki mu ngengabihe yawe ya HEBUZA kugira ngo ubone ibyibutsa.", ctaB: "Tangira ubusabe",
  },
  updates: {
    meta: "Impinduka z'amategeko muri RRA, RDB, RSSB n'ahandi, zisobanuwe: abo bireba n'icyo gukora.",
    tag: "Impinduka z'amategeko",
    l1: "Amategeko arahinduka,",
    hl: "dore ibisobanuro.",
    sub: "Ibyahindutse muri RRA, RDB, RSSB n'ahandi — abo bireba n'icyo gukora.",
    inst: "Ikigo",
    affects: "Bireba",
    all: "Byose",
    aff: {
      individuals: "Abantu ku giti cyabo",
      companies: "Amasosiyete",
      coops: "Amakoperative n'imiryango",
    },
    changed: "Ibyahindutse",
    who: "Abo bireba",
    todo: "Icyo gukora",
    deadline: "Itariki ntarengwa",
    addCal: "Shyira kuri kalendari",
    help: "Uko HEBUZA yagufasha",
    getHelp: "Saba ubufasha",
    more: "Reba izindi za kera",
    noneT: "Nta mpinduka zihuye n'ibyo wahisemo",
    noneB: "Gerageza ikindi kigo cyangwa usibe ibyatoranyijwe.",
    clear: "Siba ibyatoranyijwe",
    bandT: "Ntuzacikwe n'itariki ntarengwa.",
    bandB: "Habwa amakuru kuri imeyili cyangwa WhatsApp mu rurimi rwawe.",
    bandNote: "Wemeza kabiri. Wahagarika igihe icyo ari cyo cyose.",
    lang: "Ururimi",
    crumb: "Impinduka",
    published: "Byatangajwe {d}",
    contents: "Ibikubiyemo",
    relatedT: "Izindi mpinduka",
    ctaT: "Reka tubigukorere",
    calendarT: "Mu ngengabihe y'iyubahirizwa", calendarB: "Kurikirana aya matariki mu ngengabihe yawe ya HEBUZA kugira ngo ubone ibyibutsa.", ctaB: "Tangira ubusabe",
  },
  campaign: {
    formT: "Tangira mu minota 2",
    name: "Amazina",
    namePh: "Amazina yawe yose",
    phone: "Telefoni (+250)",
    phonePh: "07XX XXX XXX",
    type: "Ubwoko bw'ubucuruzi",
    typePh: "Hitamo ubwoko",
    types: [
      "Umucuruzi ku giti cye",
      "Sosiyete (Ltd)",
      "Koperative",
      "Umuryango / ishyirahamwe",
      "Sindabimenya",
    ],
    agree: "Nemeye amategeko n'politiki y'ibanga.",
    or: "Cyangwa tuganire kuri WhatsApp",
    busy: "Turohereza…",
    err: {
      name: "Andika amazina yawe.",
      phone: "Andika nimero yo mu Rwanda, urugero 0788 123 456.",
      type: "Hitamo ubwoko bw'ubucuruzi.",
      agree: "Emera amategeko kugira ngo ukomeze.",
      send: "Ntitwashoboye kohereza. Ongera ugerageze cyangwa utwandikire kuri WhatsApp.",
    },
    errTitle: "Kosora ibi bikurikira",
    doneT: "Murakoze! Turaguhamagara vuba.",
    doneB:
      "Umujyanama wa HEBUZA azahamagara {phone} mu masaha y'akazi (Mbe–Gat 08:00–17:00).",
    trust: [
      "Abanyamwuga bemejwe",
      "Kurikirana buri ntambwe",
      "Kwishyura byizewe",
    ],
    getT: "Ibyo uhabwa",
    howT: "Uko bikora",
    faqT: "Ibibazo bikunze kubazwa",
    call: "Hamagara",
    until: "Iki giciro kirangira {d}",
  },
};

export const LD: Record<Locale, LdCopy> = { en, fr, rw };
export const getLd = (l: Locale) => LD[l];

// ---------- Booking ----------
/** Paid consultation price; shortcut: hard-coded until the bookings API (F-BKG-05) returns it. */
// PLACEHOLDER(CONSULT_FEE): unconfirmed consultation price; render only as provisional.
export const CONSULT_FEE = 20000;
/** Suffix for unconfirmed prices so they are never presented as fact. */
export const PROVISIONAL: Record<Locale, string> = { en: "provisional", fr: "provisoire", rw: "by'agateganyo" };
export const BOOK_LANGS = ["rw", "en", "fr"] as const;

// ---------- Guides ----------
export type GuideCat = keyof LdCopy["knowledge"]["cats"];
type GuideText = {
  title: string;
  excerpt: string;
  overview: string;
  reqs: string[];
  steps: string[];
  tip: string;
};
export type Guide = {
  slug: string;
  cat: GuideCat;
  date: string;
  updated?: string;
  read: number;
  img: string;
  service?: string;
  featured?: boolean;
  t: Record<Locale, GuideText>;
};

export const GUIDES: Guide[] = [
  {
    slug: "register-a-company-in-rwanda",
    cat: "registration",
    date: "2026-10-12",
    updated: "2026-11-02",
    read: 5,
    img: "/hebuza/guides/register-a-company-in-rwanda.jpg",
    service: "company-registration",
    featured: true,
    t: {
      en: {
        title: "How to register a company in Rwanda, step by step",
        excerpt: "A simple guide to company registration, documents and fees.",
        overview:
          "Registering a company in Rwanda is done online with RDB. With your documents ready, it usually takes a few working days, and you receive your TIN with your registration.",
        reqs: [
          "ID or passport of every shareholder and director",
          "Three company names, in order of preference",
          "Business activity and registered address",
          "Share split between shareholders",
        ],
        steps: [
          "Prepare your documents.",
          "Choose and check a company name.",
          "Submit your application online.",
          "Pay the required fees.",
          "Download your certificate and TIN.",
        ],
        tip: "Prepare three company names in order of preference, in case the first is taken.",
      },
      fr: {
        title: "Créer une société au Rwanda, étape par étape",
        excerpt:
          "Un guide simple sur l'immatriculation, les documents et les frais.",
        overview:
          "La création d'une société au Rwanda se fait en ligne auprès de la RDB. Avec des documents prêts, cela prend en général quelques jours ouvrables, et vous recevez votre NIF avec l'immatriculation.",
        reqs: [
          "Pièce d'identité ou passeport de chaque associé et dirigeant",
          "Trois noms de société, par ordre de préférence",
          "Activité et adresse du siège",
          "Répartition des parts entre associés",
        ],
        steps: [
          "Préparez vos documents.",
          "Choisissez et vérifiez un nom.",
          "Déposez la demande en ligne.",
          "Payez les frais requis.",
          "Téléchargez votre certificat et votre NIF.",
        ],
        tip: "Préparez trois noms par ordre de préférence, au cas où le premier serait pris.",
      },
      rw: {
        title: "Uko wandikisha sosiyete mu Rwanda, intambwe ku yindi",
        excerpt:
          "Amabwiriza yoroshye ku kwandikisha sosiyete, inyandiko n'ibiciro.",
        overview:
          "Kwandikisha sosiyete mu Rwanda bikorerwa kuri murandasi muri RDB. Iyo inyandiko ziteguye, bifata iminsi mike y'akazi, kandi uhabwa TIN hamwe n'icyemezo.",
        reqs: [
          "Indangamuntu cyangwa pasiporo ya buri munyamigabane n'umuyobozi",
          "Amazina atatu ya sosiyete, ukurikije ayo ukunda",
          "Ibikorwa n'aderesi ya sosiyete",
          "Uko imigabane igabanywa",
        ],
        steps: [
          "Tegura inyandiko zawe.",
          "Hitamo kandi ugenzure izina.",
          "Ohereza ubusabe kuri murandasi.",
          "Ishyura amafaranga asabwa.",
          "Kuramo icyemezo na TIN.",
        ],
        tip: "Tegura amazina atatu ukurikije ayo ukunda, mu gihe irya mbere ryaba ryarafashwe.",
      },
    },
  },
  {
    slug: "vat-paye-cit-monthly-calendar",
    cat: "tax",
    date: "2026-10-12",
    read: 5,
    img: "/hebuza/guides/vat-paye-cit-monthly-calendar.jpg",
    service: "monthly-tax-advisory-service",
    t: {
      en: {
        title: "VAT, PAYE and CIT: your monthly calendar",
        excerpt: "Know when to file and pay.",
        overview:
          "Most monthly declarations to RRA are due by the 15th of the following month. Annual income tax has its own deadline. A simple calendar keeps you clear of penalties.",
        reqs: [
          "Your TIN and e-Tax access",
          "Sales and purchase records for the month",
          "Payroll for the month, if you have staff",
        ],
        steps: [
          "List which taxes apply to your business.",
          "Close your books at month end.",
          "File each declaration on e-Tax.",
          "Pay by the due date and keep the receipt.",
        ],
        tip: "Set a reminder for the 10th so you are never filing on the last day.",
      },
      fr: {
        title: "TVA, IRPP et IS : votre calendrier mensuel",
        excerpt: "Sachez quand déclarer et payer.",
        overview:
          "La plupart des déclarations mensuelles à la RRA sont dues le 15 du mois suivant. L'impôt annuel a sa propre échéance. Un calendrier simple vous évite les pénalités.",
        reqs: [
          "Votre NIF et votre accès e-Tax",
          "Les ventes et achats du mois",
          "La paie du mois, si vous avez du personnel",
        ],
        steps: [
          "Listez les impôts qui vous concernent.",
          "Clôturez vos comptes en fin de mois.",
          "Déposez chaque déclaration sur e-Tax.",
          "Payez avant l'échéance et gardez le reçu.",
        ],
        tip: "Programmez un rappel le 10 pour ne jamais déclarer le dernier jour.",
      },
      rw: {
        title: "TVA, PAYE na CIT: kalendari yawe ya buri kwezi",
        excerpt: "Menya igihe cyo kumenyekanisha no kwishyura.",
        overview:
          "Imenyekanisha ryinshi rya buri kwezi muri RRA rikorwa bitarenze tariki 15 z'ukwezi gukurikira. Umusoro w'umwaka ufite itariki yawo. Kalendari yoroshye ikurinda ibihano.",
        reqs: [
          "TIN yawe no kwinjira muri e-Tax",
          "Ibyo wagurishije n'ibyo waguze mu kwezi",
          "Imishahara y'ukwezi, niba ufite abakozi",
        ],
        steps: [
          "Andika imisoro ikureba.",
          "Funga ibitabo by'ukwezi.",
          "Menyekanisha buri musoro kuri e-Tax.",
          "Ishyura mbere y'itariki ntarengwa ubike inyemezabwishyu.",
        ],
        tip: "Shyiraho kwibutswa ku itariki 10 kugira ngo utazamenyekanisha ku munsi wa nyuma.",
      },
    },
  },
  {
    slug: "how-vat-refunds-work",
    cat: "tax",
    date: "2026-10-10",
    read: 4,
    img: "/hebuza/guides/how-vat-refunds-work.jpg",
    service: "vat-refund-application-and-follow-up",
    t: {
      en: {
        title: "How VAT refunds work in Rwanda",
        excerpt: "Get your refund faster.",
        overview:
          "If you paid more input VAT than you collected, you can ask RRA for a refund. Clean records and matching invoices are what make it quick.",
        reqs: [
          "VAT registration",
          "EBM invoices for your purchases",
          "Filed VAT returns for the period",
        ],
        steps: [
          "Check the credit on your VAT returns.",
          "Match every purchase to an EBM invoice.",
          "Submit the refund request.",
          "Answer any RRA questions and follow up.",
        ],
        tip: "Missing EBM invoices are the most common reason refunds slow down.",
      },
      fr: {
        title: "Comment fonctionne le remboursement de TVA au Rwanda",
        excerpt: "Obtenez votre remboursement plus vite.",
        overview:
          "Si vous avez payé plus de TVA déductible que vous n'en avez collecté, vous pouvez demander un remboursement à la RRA. Des comptes propres et des factures concordantes accélèrent tout.",
        reqs: [
          "Immatriculation à la TVA",
          "Factures EBM de vos achats",
          "Déclarations de TVA déposées pour la période",
        ],
        steps: [
          "Vérifiez le crédit sur vos déclarations.",
          "Rapprochez chaque achat d'une facture EBM.",
          "Déposez la demande de remboursement.",
          "Répondez aux questions de la RRA et suivez le dossier.",
        ],
        tip: "Les factures EBM manquantes sont la première cause de retard.",
      },
      rw: {
        title: "Uko gusubizwa TVA bikorwa mu Rwanda",
        excerpt: "Subizwa amafaranga yawe vuba.",
        overview:
          "Niba warishyuye TVA nyinshi ku byo waguze kurusha iyo wakiriye, ushobora gusaba RRA kuyigusubiza. Ibitabo bisukuye n'inyemezabuguzi zihuye nibyo byihutisha.",
        reqs: [
          "Kwiyandikisha muri TVA",
          "Inyemezabuguzi za EBM z'ibyo waguze",
          "Imenyekanisha rya TVA ry'icyo gihe",
        ],
        steps: [
          "Reba umwenda uri ku imenyekanisha rya TVA.",
          "Huza buri kintu waguze n'inyemezabuguzi ya EBM.",
          "Ohereza ubusabe bwo gusubizwa.",
          "Subiza ibibazo bya RRA ukurikirane.",
        ],
        tip: "Inyemezabuguzi za EBM zibura nizo zikunze gutinza gusubizwa.",
      },
    },
  },
  {
    slug: "bank-loan-for-your-cooperative",
    cat: "funding",
    date: "2026-10-08",
    read: 6,
    img: "/hebuza/guides/bank-loan-for-your-cooperative.jpg",
    service: "bank-loan-facilitation",
    t: {
      en: {
        title: "Getting a bank loan for your cooperative",
        excerpt: "Tips and requirements.",
        overview:
          "Lenders want to see that your cooperative is registered, organised and able to repay. A clear business plan and tidy accounts do most of the work.",
        reqs: [
          "Cooperative registration and statutes",
          "Recent financial statements",
          "A business plan with cash-flow projections",
          "Collateral or a guarantee, where required",
        ],
        steps: [
          "Decide the amount and what it will pay for.",
          "Prepare your plan and accounts.",
          "Compare lenders and products.",
          "Submit the application and answer questions.",
        ],
        tip: "Ask lenders about sector programmes; some products are designed for cooperatives.",
      },
      fr: {
        title: "Obtenir un prêt bancaire pour votre coopérative",
        excerpt: "Conseils et conditions.",
        overview:
          "Les prêteurs veulent voir une coopérative enregistrée, organisée et capable de rembourser. Un plan d'affaires clair et des comptes à jour font l'essentiel.",
        reqs: [
          "Enregistrement et statuts de la coopérative",
          "États financiers récents",
          "Un plan d'affaires avec prévisions de trésorerie",
          "Une garantie, si exigée",
        ],
        steps: [
          "Fixez le montant et son usage.",
          "Préparez le plan et les comptes.",
          "Comparez les prêteurs et les produits.",
          "Déposez la demande et répondez aux questions.",
        ],
        tip: "Renseignez-vous sur les programmes sectoriels ; certains produits visent les coopératives.",
      },
      rw: {
        title: "Kubona inguzanyo ya banki kuri koperative yawe",
        excerpt: "Inama n'ibisabwa.",
        overview:
          "Abatanga inguzanyo bashaka kubona ko koperative yanditswe, iteguye kandi ishobora kwishyura. Umushinga usobanutse n'ibitabo bisukuye nibyo by'ingenzi.",
        reqs: [
          "Icyemezo cya koperative n'amategeko shingiro",
          "Raporo z'imari za vuba",
          "Umushinga ufite iteganyamafaranga",
          "Ingwate, aho isabwa",
        ],
        steps: [
          "Menya amafaranga ukeneye n'icyo azakora.",
          "Tegura umushinga n'ibitabo.",
          "Gereranya banki n'ibyo zitanga.",
          "Ohereza ubusabe usubize ibibazo.",
        ],
        tip: "Baza banki gahunda zihariye; zimwe zagenewe amakoperative.",
      },
    },
  },
  {
    slug: "investment-certificates-explained",
    cat: "investment",
    date: "2026-10-05",
    read: 5,
    img: "/hebuza/guides/investment-certificates-explained.jpg",
    service: "application-for-investment-certificate",
    t: {
      en: {
        title: "Investment certificates explained",
        excerpt: "Invest with confidence.",
        overview:
          "An RDB investment certificate can give eligible investors access to incentives. Whether you qualify depends on your sector and the size of the investment.",
        reqs: [
          "Registered company",
          "Business plan and investment amount",
          "Evidence of funds",
        ],
        steps: [
          "Check whether your project is eligible.",
          "Prepare the business plan.",
          "Submit the application to RDB.",
          "Receive the certificate and keep it current.",
        ],
        tip: "Ask about incentives before you invest — some apply only from the start.",
      },
      fr: {
        title: "Le certificat d'investissement expliqué",
        excerpt: "Investissez en confiance.",
        overview:
          "Un certificat d'investissement de la RDB peut ouvrir l'accès à des incitations pour les investisseurs éligibles. L'éligibilité dépend du secteur et du montant investi.",
        reqs: [
          "Société immatriculée",
          "Plan d'affaires et montant investi",
          "Preuve des fonds",
        ],
        steps: [
          "Vérifiez l'éligibilité du projet.",
          "Préparez le plan d'affaires.",
          "Déposez la demande à la RDB.",
          "Recevez le certificat et tenez-le à jour.",
        ],
        tip: "Renseignez-vous sur les incitations avant d'investir — certaines ne s'appliquent qu'au départ.",
      },
      rw: {
        title: "Icyemezo cy'ishoramari gisobanuwe",
        excerpt: "Shora imari wizeye.",
        overview:
          "Icyemezo cy'ishoramari cya RDB gishobora guha abashoramari babyujuje inyoroshyo. Kubyuzuza biterwa n'urwego n'ingano y'ishoramari.",
        reqs: [
          "Sosiyete yanditswe",
          "Umushinga n'ingano y'ishoramari",
          "Ibimenyetso by'amafaranga",
        ],
        steps: [
          "Reba niba umushinga wawe ubyujuje.",
          "Tegura umushinga.",
          "Ohereza ubusabe muri RDB.",
          "Akira icyemezo ukivugurure.",
        ],
        tip: "Baza ku nyoroshyo mbere yo gushora — zimwe zitangwa mu ntangiriro gusa.",
      },
    },
  },
  {
    slug: "ebm-what-every-shop-owner-must-know",
    cat: "compliance",
    date: "2026-10-02",
    read: 4,
    img: "/hebuza/guides/ebm-what-every-shop-owner-must-know.jpg",
    service: "application-for-ebm-acquisition-and-installation",
    t: {
      en: {
        title: "EBM: what every shop owner must know",
        excerpt: "Stay compliant.",
        overview:
          "VAT-registered businesses must issue receipts through an Electronic Billing Machine (EBM). Using it correctly protects you in audits and keeps your VAT claims valid.",
        reqs: [
          "TIN and VAT registration",
          "An EBM device or software",
          "Staff trained to issue receipts",
        ],
        steps: [
          "Get your EBM installed.",
          "Learn to issue and cancel receipts.",
          "Give a receipt for every sale.",
          "Keep the EBM synchronised.",
        ],
        tip: "Train everyone who sells for you — a missing receipt is the shop's responsibility.",
      },
      fr: {
        title: "EBM : ce que tout commerçant doit savoir",
        excerpt: "Restez en règle.",
        overview:
          "Les entreprises assujetties à la TVA doivent émettre leurs reçus via une machine de facturation électronique (EBM). Bien l'utiliser vous protège en cas de contrôle.",
        reqs: [
          "NIF et immatriculation TVA",
          "Un appareil ou logiciel EBM",
          "Un personnel formé à l'émission des reçus",
        ],
        steps: [
          "Faites installer l'EBM.",
          "Apprenez à émettre et annuler un reçu.",
          "Remettez un reçu à chaque vente.",
          "Gardez l'EBM synchronisée.",
        ],
        tip: "Formez tous vos vendeurs — un reçu manquant engage la boutique.",
      },
      rw: {
        title: "EBM: ibyo buri mucuruzi agomba kumenya",
        excerpt: "Kurikiza amategeko.",
        overview:
          "Ubucuruzi bwanditse muri TVA bugomba gutanga inyemezabuguzi zikoreshejwe imashini ya EBM. Kuyikoresha neza bikurinda mu igenzura.",
        reqs: [
          "TIN no kwiyandikisha muri TVA",
          "Imashini cyangwa porogaramu ya EBM",
          "Abakozi bazi gutanga inyemezabuguzi",
        ],
        steps: [
          "Shyirisha EBM.",
          "Iga gutanga no gusiba inyemezabuguzi.",
          "Tanga inyemezabuguzi kuri buri kugurisha.",
          "Komeza EBM ihuye n'iya RRA.",
        ],
        tip: "Hugura abagurisha bose — inyemezabuguzi ibuze ibazwa iduka.",
      },
    },
  },
  {
    slug: "writing-a-business-plan-banks-accept",
    cat: "accounting",
    date: "2026-09-30",
    read: 5,
    img: "/hebuza/guides/writing-a-business-plan-banks-accept.jpg",
    service: "business-plan-preparation",
    t: {
      en: {
        title: "Writing a business plan banks accept",
        excerpt: "Plan for growth.",
        overview:
          "A bank reads your plan to answer one question: can you repay? Keep it short, use real numbers, and show where the money goes.",
        reqs: [
          "Your sales and costs history",
          "Clear use of funds",
          "Realistic projections for 3 years",
        ],
        steps: [
          "Describe the business and market in one page.",
          "Show past numbers honestly.",
          "Project cash flow month by month.",
          "Explain how the loan is repaid.",
        ],
        tip: "Lenders trust conservative numbers more than optimistic ones.",
      },
      fr: {
        title: "Rédiger un plan d'affaires accepté par les banques",
        excerpt: "Préparez la croissance.",
        overview:
          "Une banque lit votre plan pour une seule question : pouvez-vous rembourser ? Soyez bref, chiffré et montrez l'usage des fonds.",
        reqs: [
          "Historique des ventes et charges",
          "Usage clair des fonds",
          "Prévisions réalistes sur 3 ans",
        ],
        steps: [
          "Présentez l'activité et le marché en une page.",
          "Montrez les chiffres passés avec honnêteté.",
          "Prévoyez la trésorerie mois par mois.",
          "Expliquez le remboursement.",
        ],
        tip: "Les prêteurs font plus confiance à des chiffres prudents qu'optimistes.",
      },
      rw: {
        title: "Kwandika umushinga banki zemera",
        excerpt: "Tegura iterambere.",
        overview:
          "Banki isoma umushinga wawe ishaka igisubizo kimwe: uzashobora kwishyura? Wugire mugufi, ukoreshe imibare nyayo, werekane aho amafaranga azajya.",
        reqs: [
          "Amateka y'ibyo wagurishije n'ibyo wakoresheje",
          "Aho amafaranga azakoreshwa",
          "Iteganyagihe rifatika ry'imyaka 3",
        ],
        steps: [
          "Sobanura ubucuruzi n'isoko ku rupapuro rumwe.",
          "Erekana imibare ya kera nta guhisha.",
          "Teganya amafaranga ukwezi ku kundi.",
          "Sobanura uko inguzanyo izishyurwa.",
        ],
        tip: "Banki zizera imibare yitondewe kurusha iyirenze urugero.",
      },
    },
  },
];

// ---------- Updates ----------
export type Institution = "RRA" | "RDB" | "RSSB" | "RURA" | "BNR";
export type Affects = keyof LdCopy["updates"]["aff"];
type UpdateText = {
  title: string;
  changed: string;
  who: string;
  todo: string[];
  body: string;
};
export type Update = {
  slug: string;
  inst: Institution;
  affects: Affects[];
  date: string;
  deadline?: string;
  visual: "calendar" | "doc";
  service: string;
  img: string;
  t: Record<Locale, UpdateText>;
};
export const INSTITUTIONS: Institution[] = [
  "RRA",
  "RDB",
  "RSSB",
  "RURA",
  "BNR",
];

export const UPDATES: Update[] = [
  {
    slug: "monthly-vat-return-reminder",
    inst: "RRA",
    affects: ["companies"],
    // PLACEHOLDER(UPDATE_SAMPLE): example entry (see examples notice); dates unconfirmed.
    date: "2026-11-03",
    deadline: "2026-12-15",
    visual: "calendar",
    service: "monthly-tax-advisory-service",
    img: "/hebuza/updates/monthly-vat-return-reminder.jpg",
    t: {
      en: {
        title: "Monthly VAT return due on the 15th",
        changed: "Reminder: November VAT returns are due by 15 December.",
        who: "VAT-registered businesses",
        todo: ["File on time", "Avoid penalties"],
        body: "VAT returns and payment for a month are due by the 15th of the following month. Late filing and late payment each attract penalties and interest.",
      },
      fr: {
        title: "Déclaration mensuelle de TVA due le 15",
        changed:
          "Rappel : la TVA de novembre est à déclarer avant le 15 décembre.",
        who: "Entreprises assujetties à la TVA",
        todo: ["Déclarer à temps", "Éviter les pénalités"],
        body: "La déclaration et le paiement de la TVA d'un mois sont dus le 15 du mois suivant. Les retards entraînent pénalités et intérêts.",
      },
      rw: {
        title: "Imenyekanisha rya TVA rya buri kwezi ku itariki 15",
        changed:
          "Kwibutsa: TVA y'Ugushyingo imenyekanishwa bitarenze 15 Ukuboza.",
        who: "Ubucuruzi bwanditse muri TVA",
        todo: ["Menyekanisha ku gihe", "Irinde ibihano"],
        body: "Imenyekanisha n'ubwishyu bwa TVA by'ukwezi bikorwa bitarenze tariki 15 z'ukwezi gukurikira. Gutinda bizana ibihano n'inyungu z'ubukererwe.",
      },
    },
  },
  {
    slug: "beneficial-ownership-declaration",
    inst: "RDB",
    affects: ["companies", "coops"],
    date: "2026-10-21",
    visual: "doc",
    service: "updating-registration-details",
    img: "/hebuza/updates/beneficial-ownership-declaration.jpg",
    t: {
      en: {
        title: "Keep your beneficial-ownership details current",
        changed:
          "Companies must keep beneficial-owner information up to date with RDB.",
        who: "Companies and other registered entities",
        todo: ["Review your owners on record", "Update any changes"],
        body: "When shareholders or controlling persons change, the registry must be updated. Out-of-date records can block other services, such as tax clearance or bank onboarding.",
      },
      fr: {
        title: "Tenez à jour vos bénéficiaires effectifs",
        changed:
          "Les sociétés doivent tenir à jour leurs bénéficiaires effectifs auprès de la RDB.",
        who: "Sociétés et autres entités enregistrées",
        todo: [
          "Vérifiez les bénéficiaires déclarés",
          "Déclarez tout changement",
        ],
        body: "Quand les associés ou les personnes qui contrôlent changent, le registre doit être mis à jour. Un registre obsolète peut bloquer d'autres démarches.",
      },
      rw: {
        title: "Vugurura amakuru ya ba nyir'inyungu",
        changed:
          "Amasosiyete agomba kuvugurura amakuru ya ba nyir'inyungu muri RDB.",
        who: "Amasosiyete n'ibindi bigo byanditswe",
        todo: ["Reba abanditswe nka ba nyir'inyungu", "Vugurura impinduka"],
        body: "Iyo abanyamigabane cyangwa abayobora bahindutse, igitabo cy'iyandikisha kigomba kuvugururwa. Amakuru ashaje ashobora guhagarika izindi serivisi.",
      },
    },
  },
  {
    slug: "rssb-contributions-monthly",
    inst: "RSSB",
    affects: ["companies", "coops"],
    date: "2026-10-14",
    deadline: "2026-12-15",
    visual: "calendar",
    service: "monthly-business-support-advisory-subscription",
    img: "/hebuza/updates/rssb-contributions-monthly.jpg",
    t: {
      en: {
        title: "RSSB contributions: monthly declaration",
        changed: "Employers declare and pay staff contributions every month.",
        who: "Employers with staff on payroll",
        todo: ["Declare every employee", "Pay by the due date"],
        body: "Pension, occupational-hazard and other contributions are declared and paid monthly. Keep your employee list in sync with payroll.",
      },
      fr: {
        title: "Cotisations RSSB : déclaration mensuelle",
        changed:
          "Les employeurs déclarent et paient les cotisations chaque mois.",
        who: "Employeurs ayant du personnel",
        todo: ["Déclarer chaque salarié", "Payer à l'échéance"],
        body: "Les cotisations retraite, risques professionnels et autres se déclarent et se paient chaque mois. Gardez la liste du personnel alignée avec la paie.",
      },
      rw: {
        title: "Imisanzu ya RSSB: imenyekanisha rya buri kwezi",
        changed:
          "Abakoresha bamenyekanisha bakishyura imisanzu y'abakozi buri kwezi.",
        who: "Abakoresha bafite abakozi",
        todo: ["Menyekanisha buri mukozi", "Ishyura ku gihe"],
        body: "Imisanzu y'ubwiteganyirize, impanuka z'akazi n'indi imenyekanishwa ikishyurwa buri kwezi. Huza urutonde rw'abakozi n'imishahara.",
      },
    },
  },
  {
    slug: "ebm-receipts-reminder",
    inst: "RRA",
    affects: ["companies", "individuals"],
    date: "2026-09-28",
    visual: "doc",
    service: "ebm-training",
    img: "/hebuza/updates/ebm-receipts-reminder.jpg",
    t: {
      en: {
        title: "EBM receipts for every sale",
        changed:
          "A reminder that VAT-registered sellers issue an EBM receipt for each sale.",
        who: "VAT-registered sellers",
        todo: ["Issue a receipt every time", "Train your staff"],
        body: "Sales without EBM receipts can lead to penalties in an audit, and buyers cannot claim the VAT. Make receipts part of every sale.",
      },
      fr: {
        title: "Un reçu EBM pour chaque vente",
        changed:
          "Rappel : les vendeurs assujettis à la TVA émettent un reçu EBM pour chaque vente.",
        who: "Vendeurs assujettis à la TVA",
        todo: ["Émettre un reçu à chaque fois", "Former le personnel"],
        body: "Les ventes sans reçu EBM exposent à des pénalités en cas de contrôle, et l'acheteur ne peut pas déduire la TVA.",
      },
      rw: {
        title: "Inyemezabuguzi ya EBM kuri buri kugurisha",
        changed:
          "Kwibutsa ko abacuruzi banditse muri TVA batanga inyemezabuguzi ya EBM kuri buri kugurisha.",
        who: "Abacuruzi banditse muri TVA",
        todo: ["Tanga inyemezabuguzi buri gihe", "Hugura abakozi"],
        body: "Kugurisha nta nyemezabuguzi ya EBM bishobora kuzana ibihano mu igenzura, kandi umuguzi ntashobora gusaba TVA.",
      },
    },
  },
];

// ---------- Campaigns ----------
type CampaignText = {
  badge: string;
  l1: string;
  hl: string;
  sub: string;
  priceNote: string;
  get: string[];
  how: string[];
  faq: { q: string; a: string }[];
  readyT: string;
  cta: string;
};
export type Campaign = {
  slug: string;
  service: string;
  price: number;
  endsOn?: string;
  index?: boolean;
  t: Record<Locale, CampaignText>;
};

export const CAMPAIGNS: Campaign[] = [
  {
    slug: "register-in-3-days",
    service: "company-registration",
    // PLACEHOLDER(CAMPAIGN_PRICE): unconfirmed price; noindex until HEBUZA confirms. Turnaround/end-date claims removed (seed says 5 working days).
    price: 20000,
    t: {
      en: {
        badge: "Online registration",
        l1: "Register your company in",
        hl: "one online request.",
        sub: "RDB registration + TIN, done online by our professionals. Pay with MoMo.",
        priceNote:
          "all-inclusive service fee · government fees shown separately",
        get: [
          "Certificate of incorporation",
          "TIN certificate",
          "Company profile summary",
        ],
        how: ["Fill the form", "Pay with MoMo", "Receive your certificates"],
        faq: [
          {
            q: "How much does it cost?",
            a: "The HEBUZA service fee is shown above. Any government fee is shown separately before you pay.",
          },
          {
            q: "Can I register online?",
            a: "Yes. We handle the whole application online; you only send your documents and approve.",
          },
          {
            q: "What documents do I need?",
            a: "IDs of shareholders and directors, three name choices, your business activity and address.",
          },
        ],
        readyT: "Ready to make it official?",
        cta: "Start my registration",
      },
      fr: {
        badge: "Immatriculation en ligne",
        l1: "Créez votre société en",
        hl: "une seule demande en ligne.",
        sub: "Immatriculation RDB + NIF, en ligne, par nos professionnels. Payez avec MoMo.",
        priceNote:
          "frais de service tout compris · frais publics affichés à part",
        get: [
          "Certificat d'immatriculation",
          "Certificat NIF",
          "Fiche de présentation de la société",
        ],
        how: [
          "Remplissez le formulaire",
          "Payez avec MoMo",
          "Recevez vos certificats",
        ],
        faq: [
          {
            q: "Combien ça coûte ?",
            a: "Les frais HEBUZA sont affichés ci-dessus. Les frais publics éventuels sont affichés à part avant paiement.",
          },
          {
            q: "Puis-je tout faire en ligne ?",
            a: "Oui. Nous gérons toute la demande en ligne ; vous envoyez vos documents et validez.",
          },
          {
            q: "Quels documents faut-il ?",
            a: "Pièces d'identité des associés et dirigeants, trois noms, l'activité et l'adresse.",
          },
        ],
        readyT: "Prêt à officialiser ?",
        cta: "Lancer mon immatriculation",
      },
      rw: {
        badge: "Kwiyandikisha kuri murandasi",
        l1: "Andikisha sosiyete yawe mu",
        hl: "busabe bumwe kuri murandasi.",
        sub: "Kwiyandikisha muri RDB + TIN, bikozwe kuri murandasi n'abanyamwuga bacu. Ishyura na MoMo.",
        priceNote:
          "igiciro cya serivisi cyose · amafaranga ya Leta agaragazwa ukwayo",
        get: [
          "Icyemezo cyo kwandikwa",
          "Icyemezo cya TIN",
          "Incamake y'umwirondoro wa sosiyete",
        ],
        how: ["Uzuza ifishi", "Ishyura na MoMo", "Akira ibyemezo byawe"],
        faq: [
          {
            q: "Bitwara angahe?",
            a: "Igiciro cya HEBUZA kiri hejuru. Amafaranga ya Leta agaragazwa ukwayo mbere yo kwishyura.",
          },
          {
            q: "Nabikora kuri murandasi?",
            a: "Yego. Dukora ubusabe bwose kuri murandasi; wowe wohereza inyandiko ukemeza.",
          },
          {
            q: "Nkenera izihe nyandiko?",
            a: "Indangamuntu z'abanyamigabane n'abayobozi, amazina atatu, ibikorwa n'aderesi.",
          },
        ],
        readyT: "Witeguye kubigira ukuri?",
        cta: "Tangira kwiyandikisha",
      },
    },
  },
];

/** Rwandan mobile: 07[2389]XXXXXXX, optional +250/250 prefix, spaces/dashes allowed. */
export const isRwPhone = (v: string) =>
  /^(?:\+?250|0)7[2389]\d{7}$/.test(v.replace(/[\s-]/g, ""));
