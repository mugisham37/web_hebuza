import type { Locale } from "@/shared/i18n/config";

// L-A copy: family "who it's for" band, service-detail eligibility gate, checklist, D5 price states.
// Eligibility questions are written per service family (keys = catalogue category slugs); they are
// guidance only, never a refusal: a "no" routes the visitor to a consultation, not away.

type Copy = {
  band: {
    tag: string;
    people: string;
    across: string;
    areas: string;
    title: string;
    body: string;
  };
  about: { tag: string; points: string[]; who: string; whoBody: string };
  elig: {
    open: string;
    title: string;
    intro: string;
    yes: string;
    no: string;
    step: string;
    restart: string;
    close: string;
    okTitle: string;
    okBody: string;
    noTitle: string;
    noBody: string;
    apply: string;
    talk: string;
    questions: Record<string, string[]>;
    fallback: string[];
  };
  check: {
    download: string;
    title: string;
    note: string;
    docs: string;
    steps: string;
    ref: string;
    none: string;
  };
  price: {
    bandsTag: string;
    amountLabel: string;
    amountHint: string;
    fee: string;
    band: string;
    outOfRange: string;
    empty: string;
    pausedTag: string;
    pausedBody: string;
    pausedApply: string;
    pausedWa: string;
    quoteTag: string;
  };
};

const en: Copy = {
  band: {
    tag: "Real people, real support",
    people: "services",
    across: "across",
    areas: "areas, and growing",
    title: "Individuals, businesses and organisations.",
    body: "Whether you're a student, a freelancer, an SME, a cooperative or an investor, HEBUZA handles the paperwork for you.",
  },
  about: {
    tag: "About this service",
    points: [
      "Quick and easy process",
      "Track your application online",
      "Get your documents digitally",
    ],
    who: "Who can apply?",
    whoBody: "Individuals, start-ups, SMEs, cooperatives and NGOs.",
  },
  elig: {
    open: "Check if you qualify",
    title: "Can you apply?",
    intro: "Three quick questions. Nothing is saved.",
    yes: "Yes",
    no: "No",
    step: "Question {i} of {n}",
    restart: "Start again",
    close: "Close",
    okTitle: "You look ready to apply.",
    okBody: "Have your documents to hand and start your request.",
    noTitle: "Let's check together first.",
    noBody:
      "Some answers need a closer look. Our team will tell you exactly what's missing, free.",
    apply: "Start a request",
    talk: "Ask on WhatsApp",
    questions: {
      "online-services": [
        "Do you have a valid national ID or passport?",
        "Can you share documents as photos or PDFs?",
        "Do you have a phone number that receives SMS?",
      ],
      "taxes-and-business-support": [
        "Is your business (or you) registered with RRA, or about to be?",
        "Do you have your TIN or company code?",
        "Can you share recent invoices or statements?",
      ],
      "investment-financing": [
        "Do you have a registered business or a clear project?",
        "Can you share basic figures (sales, costs or a budget)?",
        "Are you ready to share ID for every owner?",
      ],
      "ict-ai-studio": [
        "Do you know what you want built or improved?",
        "Do you have a rough budget in mind?",
        "Can someone on your side answer questions during the project?",
      ],
      "digital-marketing-branding": [
        "Do you have a business or product to promote?",
        "Do you know who your customers are?",
        "Can you share your logo or existing materials, if any?",
      ],
      "business-training-coaching": [
        "Are you running or planning a business?",
        "Can you attend sessions in person or online?",
        "Do you have a goal you want help with?",
      ],
    },
    fallback: [
      "Do you have a valid national ID or passport?",
      "Can you share documents as photos or PDFs?",
    ],
  },
  check: {
    download: "Download checklist",
    title: "Document checklist",
    note: "Tick each item before you start your request.",
    docs: "Documents",
    steps: "Steps",
    ref: "Printed from",
    none: "We confirm the exact list after reading your request.",
  },
  price: {
    bandsTag: "Based on amount",
    amountLabel: "Your amount (RWF)",
    amountHint: "The fee depends on the amount involved.",
    fee: "Your fee",
    band: "Band",
    outOfRange: "This amount needs a custom quote.",
    empty: "Enter an amount to see your fee.",
    pausedTag: "Paused",
    pausedBody:
      "We've paused new requests for this service for now. Message us and we'll let you know when it reopens.",
    pausedApply: "Applications paused",
    pausedWa: "Message us on WhatsApp",
    quoteTag: "Quote",
  },
};

const fr: Copy = {
  band: {
    tag: "De vraies personnes, un vrai soutien",
    people: "services",
    across: "dans",
    areas: "domaines, et ça grandit",
    title: "Particuliers, entreprises et organisations.",
    body: "Étudiant, freelance, PME, coopérative ou investisseur : HEBUZA s'occupe des démarches pour vous.",
  },
  about: {
    tag: "À propos du service",
    points: [
      "Démarche simple et rapide",
      "Suivez votre demande en ligne",
      "Recevez vos documents en ligne",
    ],
    who: "Qui peut faire la demande ?",
    whoBody: "Particuliers, start-ups, PME, coopératives et ONG.",
  },
  elig: {
    open: "Vérifier mon éligibilité",
    title: "Pouvez-vous faire la demande ?",
    intro: "Trois questions rapides. Rien n'est enregistré.",
    yes: "Oui",
    no: "Non",
    step: "Question {i} sur {n}",
    restart: "Recommencer",
    close: "Fermer",
    okTitle: "Vous semblez prêt à faire la demande.",
    okBody: "Gardez vos documents à portée de main et lancez votre demande.",
    noTitle: "Vérifions d'abord ensemble.",
    noBody:
      "Certaines réponses demandent un examen. Notre équipe vous dira gratuitement ce qui manque.",
    apply: "Faire une demande",
    talk: "Demander sur WhatsApp",
    questions: {
      "online-services": [
        "Avez-vous une carte d'identité ou un passeport valide ?",
        "Pouvez-vous envoyer des documents en photo ou PDF ?",
        "Avez-vous un numéro qui reçoit les SMS ?",
      ],
      "taxes-and-business-support": [
        "Votre entreprise (ou vous) est-elle enregistrée à la RRA, ou sur le point de l'être ?",
        "Avez-vous votre NIF ou code d'entreprise ?",
        "Pouvez-vous fournir des factures ou relevés récents ?",
      ],
      "investment-financing": [
        "Avez-vous une entreprise enregistrée ou un projet clair ?",
        "Pouvez-vous fournir des chiffres de base (ventes, coûts ou budget) ?",
        "Pouvez-vous fournir une pièce d'identité pour chaque associé ?",
      ],
      "ict-ai-studio": [
        "Savez-vous ce que vous voulez créer ou améliorer ?",
        "Avez-vous un budget approximatif ?",
        "Quelqu'un de votre côté peut-il répondre aux questions pendant le projet ?",
      ],
      "digital-marketing-branding": [
        "Avez-vous une entreprise ou un produit à promouvoir ?",
        "Savez-vous qui sont vos clients ?",
        "Pouvez-vous partager votre logo ou vos supports existants ?",
      ],
      "business-training-coaching": [
        "Gérez-vous ou préparez-vous une entreprise ?",
        "Pouvez-vous suivre des sessions en présentiel ou en ligne ?",
        "Avez-vous un objectif précis ?",
      ],
    },
    fallback: [
      "Avez-vous une carte d'identité ou un passeport valide ?",
      "Pouvez-vous envoyer des documents en photo ou PDF ?",
    ],
  },
  check: {
    download: "Télécharger la liste",
    title: "Liste des documents",
    note: "Cochez chaque élément avant de lancer votre demande.",
    docs: "Documents",
    steps: "Étapes",
    ref: "Imprimé depuis",
    none: "Nous confirmons la liste exacte après lecture de votre demande.",
  },
  price: {
    bandsTag: "Selon le montant",
    amountLabel: "Votre montant (RWF)",
    amountHint: "Les frais dépendent du montant concerné.",
    fee: "Vos frais",
    band: "Tranche",
    outOfRange: "Ce montant nécessite un devis personnalisé.",
    empty: "Saisissez un montant pour voir vos frais.",
    pausedTag: "En pause",
    pausedBody:
      "Les nouvelles demandes pour ce service sont en pause. Écrivez-nous et nous vous préviendrons à la réouverture.",
    pausedApply: "Demandes en pause",
    pausedWa: "Écrivez-nous sur WhatsApp",
    quoteTag: "Devis",
  },
};

const rw: Copy = {
  band: {
    tag: "Abantu nyabo, ubufasha nyabwo",
    people: "serivisi",
    across: "mu",
    areas: "byiciro, kandi ziriyongera",
    title: "Abantu ku giti cyabo, ibigo n'imiryango.",
    body: "Waba uri umunyeshuri, ukorera ku giti cyawe, ikigo gito, koperative cyangwa umushoramari, HEBUZA igukorera impapuro.",
  },
  about: {
    tag: "Ibyerekeye iyi serivisi",
    points: [
      "Uburyo bworoshye kandi bwihuse",
      "Kurikirana ubusabe bwawe kuri murandasi",
      "Bona inyandiko zawe kuri murandasi",
    ],
    who: "Ni nde ushobora gusaba?",
    whoBody:
      "Abantu ku giti cyabo, imishinga mishya, ibigo bito, koperative n'imiryango itegamiye kuri Leta.",
  },
  elig: {
    open: "Reba niba wemerewe",
    title: "Ushobora gusaba?",
    intro: "Ibibazo bitatu byihuse. Nta na kimwe kibikwa.",
    yes: "Yego",
    no: "Oya",
    step: "Ikibazo {i} kuri {n}",
    restart: "Ongera utangire",
    close: "Funga",
    okTitle: "Usa n'uwiteguye gusaba.",
    okBody: "Tegura inyandiko zawe maze utangire ubusabe.",
    noTitle: "Reka tubanze turebere hamwe.",
    noBody:
      "Ibisubizo bimwe bikeneye gusuzumwa. Itsinda ryacu rizakubwira ku buntu ibibura.",
    apply: "Tangira ubusabe",
    talk: "Baza kuri WhatsApp",
    questions: {
      "online-services": [
        "Ufite indangamuntu cyangwa pasiporo bifite agaciro?",
        "Ushobora kohereza inyandiko nk'amafoto cyangwa PDF?",
        "Ufite nimero ya telefoni yakira SMS?",
      ],
      "taxes-and-business-support": [
        "Ikigo cyawe (cyangwa wowe) cyanditse muri RRA, cyangwa kigiye kwandikwa?",
        "Ufite TIN cyangwa nimero y'ikigo?",
        "Ushobora gutanga inyemezabuguzi cyangwa raporo za vuba?",
      ],
      "investment-financing": [
        "Ufite ikigo cyanditse cyangwa umushinga usobanutse?",
        "Ushobora gutanga imibare y'ibanze (ibyagurishijwe, ibyakoreshejwe cyangwa ingengo y'imari)?",
        "Witeguye gutanga indangamuntu ya buri munyamigabane?",
      ],
      "ict-ai-studio": [
        "Uzi icyo ushaka gukora cyangwa kunoza?",
        "Ufite ingengo y'imari ugereranyije?",
        "Hari umuntu wo ku ruhande rwawe uzasubiza ibibazo mu gihe cy'umushinga?",
      ],
      "digital-marketing-branding": [
        "Ufite ikigo cyangwa igicuruzwa ushaka kumenyekanisha?",
        "Uzi abakiriya bawe abo ari bo?",
        "Ushobora gusangiza ikirango cyawe cyangwa ibindi ufite?",
      ],
      "business-training-coaching": [
        "Ufite cyangwa uteganya gutangiza ubucuruzi?",
        "Ushobora kwitabira amasomo imbonankubone cyangwa kuri murandasi?",
        "Ufite intego ushaka gufashwamo?",
      ],
    },
    fallback: [
      "Ufite indangamuntu cyangwa pasiporo bifite agaciro?",
      "Ushobora kohereza inyandiko nk'amafoto cyangwa PDF?",
    ],
  },
  check: {
    download: "Kuramo urutonde",
    title: "Urutonde rw'inyandiko",
    note: "Shyira akamenyetso kuri buri kintu mbere yo gutangira ubusabe.",
    docs: "Inyandiko",
    steps: "Intambwe",
    ref: "Byacapwe kuri",
    none: "Twemeza urutonde nyarwo tumaze gusoma ubusabe bwawe.",
  },
  price: {
    bandsTag: "Bitewe n'amafaranga",
    amountLabel: "Amafaranga yawe (RWF)",
    amountHint: "Igiciro giterwa n'amafaranga arebwa.",
    fee: "Igiciro cyawe",
    band: "Icyiciro",
    outOfRange: "Aya mafaranga akeneye igiciro cyihariye.",
    empty: "Andika amafaranga urebe igiciro.",
    pausedTag: "Byahagaritswe",
    pausedBody:
      "Twahagaritse by'agateganyo ubusabe bushya kuri iyi serivisi. Twandikire tuzakumenyesha nibisubukurwa.",
    pausedApply: "Ubusabe bwahagaritswe",
    pausedWa: "Twandikire kuri WhatsApp",
    quoteTag: "Igiciro",
  },
};

const ALL: Record<Locale, Copy> = { en, fr, rw };
export const laCopy = (l: Locale) => ALL[l];
