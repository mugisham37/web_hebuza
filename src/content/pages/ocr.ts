// F-DOC-12 OCR suggestion copy (rw/en/fr).
import type { Locale } from "@/shared/i18n/config";
const kinds = { en: { identity: "ID document", tax: "Tax document", company: "Company document", bank: "Bank document", other: "Other" }, fr: { identity: "Pièce d'identité", tax: "Document fiscal", company: "Document de société", bank: "Document bancaire", other: "Autre" }, rw: { identity: "Indangamuntu", tax: "Inyandiko y'imisoro", company: "Inyandiko y'ikigo", bank: "Inyandiko ya banki", other: "Ibindi" } } as const;
const label = { en: "Looks like", fr: "Ressemble à", rw: "Bisa na" } as const;
export const ocrCopy = (l: Locale) => ({ label: label[l], kinds: kinds[l] as Record<string, string> });
