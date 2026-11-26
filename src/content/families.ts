import type { Locale } from "@/shared/i18n/config";
import type { IconName } from "@/components/atoms/icon";

// Display metadata for the API's service categories (slugs = API category slugs).
export type FamilyTone = "navy" | "cream" | "purple" | "lime" | "white" | "lavender";
export type FamilyMeta = {
  slug: string; icon: IconName; tone: FamilyTone; photo: string;
  name: Record<Locale, string>; short: Record<Locale, string>; blurb: Record<Locale, string>; promise: Record<Locale, string>;
};

export const FAMILIES: FamilyMeta[] = [
  {
    slug: "online-services", icon: "layers", tone: "navy", photo: "/hebuza/photos/family-online.jpg",
    name: { en: "Online & Government Services", rw: "Serivisi za Leta kuri murandasi", fr: "Services administratifs en ligne" },
    short: { en: "Online & Government", rw: "Serivisi za Leta", fr: "Démarches en ligne" },
    blurb: { en: "RRA, RDB, Irembo, RSSB, RURA and RICA applications handled for you.", rw: "Ubusabe bwa RRA, RDB, Irembo, RSSB, RURA na RICA tubukora mu mwanya wawe.", fr: "Vos démarches RRA, RDB, Irembo, RSSB, RURA et RICA, prises en charge." },
    promise: { en: "Government paperwork, done online, without the queues.", rw: "Impapuro za Leta zikorwa kuri murandasi, nta mirongo.", fr: "Vos démarches administratives, en ligne, sans file d'attente." },
  },
  {
    slug: "taxes-and-business-support", icon: "chart", tone: "cream", photo: "/hebuza/photos/family-tax.jpg",
    name: { en: "Tax & Business Support", rw: "Imisoro n'ubufasha mu bucuruzi", fr: "Fiscalité et appui aux entreprises" },
    short: { en: "Tax & Business", rw: "Imisoro", fr: "Fiscalité" },
    blurb: { en: "Tax advisory, filing, appeals, VAT refunds, business plans and statutes.", rw: "Inama ku misoro, kumenyekanisha, ubujurire, gusubizwa TVA, imishinga n'amategeko shingiro.", fr: "Conseil fiscal, déclarations, recours, remboursements de TVA, plans d'affaires et statuts." },
    promise: { en: "Tax and business support that keeps you compliant.", rw: "Ubufasha ku misoro n'ubucuruzi bugutuma wubahiriza amategeko.", fr: "Un appui fiscal et administratif qui vous garde en règle." },
  },
  {
    slug: "investment-financing", icon: "briefcase", tone: "purple", photo: "/hebuza/photos/family-investment.jpg",
    name: { en: "Investment & Finance", rw: "Ishoramari n'imari", fr: "Investissement et financement" },
    short: { en: "Investment & Finance", rw: "Ishoramari", fr: "Investissement" },
    blurb: { en: "Investment advice, incentives, bank loans, grants and licensing.", rw: "Inama ku ishoramari, inyoroshyo, inguzanyo za banki, inkunga n'impushya.", fr: "Conseil en investissement, incitations, prêts bancaires, subventions et agréments." },
    promise: { en: "Funding and investment, prepared the way lenders expect.", rw: "Inguzanyo n'ishoramari bitegurwa uko abatanga amafaranga babyifuza.", fr: "Financement et investissement, préparés comme les prêteurs l'attendent." },
  },
  {
    slug: "digital-marketing-branding", icon: "megaphone", tone: "lime", photo: "/hebuza/photos/family-marketing.jpg",
    name: { en: "Marketing & Branding", rw: "Kwamamaza no kubaka ibirango", fr: "Marketing et image de marque" },
    short: { en: "Marketing", rw: "Kwamamaza", fr: "Marketing" },
    blurb: { en: "Marketing staff, social media, SEO, voice-over and promotional material.", rw: "Abakozi bo kwamamaza, imbuga nkoranyambaga, SEO, amajwi n'ibikoresho byo kwamamaza.", fr: "Personnel marketing, réseaux sociaux, SEO, voix off et supports promotionnels." },
    promise: { en: "Get seen and chosen by the right customers.", rw: "Menyekana kandi uhitwemo n'abakiriya bakwiye.", fr: "Soyez vu et choisi par les bons clients." },
  },
  {
    slug: "business-training-coaching", icon: "graduation", tone: "white", photo: "/hebuza/photos/family-training.jpg",
    name: { en: "Trainings & Coaching", rw: "Amahugurwa n'ubujyanama", fr: "Formations et coaching" },
    short: { en: "Trainings", rw: "Amahugurwa", fr: "Formations" },
    blurb: { en: "Short courses, incubation, workshops, coaching and mentorship.", rw: "Amasomo magufi, iterambere ry'imishinga, amahugurwa, ubujyanama n'ubuyobozi.", fr: "Formations courtes, incubation, ateliers, coaching et mentorat." },
    promise: { en: "Practical skills to run and grow your business.", rw: "Ubumenyi bufatika bwo kuyobora no guteza imbere ubucuruzi bwawe.", fr: "Des compétences concrètes pour gérer et développer votre entreprise." },
  },
  {
    slug: "ict-ai-studio", icon: "laptop", tone: "lavender", photo: "/hebuza/photos/family-ict.jpg",
    name: { en: "ICT & Digital", rw: "Ikoranabuhanga", fr: "Numérique et IA" },
    short: { en: "ICT & Digital", rw: "Ikoranabuhanga", fr: "Numérique" },
    blurb: { en: "IT support, websites, AI and automation for your business.", rw: "Ubufasha mu ikoranabuhanga, imbuga, AI n'ikoresha ry'imashini mu bucuruzi bwawe.", fr: "Support informatique, sites web, IA et automatisation pour votre entreprise." },
    promise: { en: "Digital tools that save you time every week.", rw: "Ibikoresho by'ikoranabuhanga bikurinda gutakaza igihe.", fr: "Des outils numériques qui vous font gagner du temps." },
  },
];

export const FACES = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `/hebuza/faces/${n}.jpg`);
