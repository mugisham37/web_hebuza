// F-CAL-03 company compliance profile copy (rw/en/fr).
import type { Locale } from "@/shared/i18n/config";
const en = { legend: "Tax & payroll profile (sets your compliance calendar)", vat: "Registered for VAT", vatPeriod: "VAT filing", monthly: "Monthly", quarterly: "Quarterly", employer: "Has employees (PAYE, RSSB)" };
type Copy = typeof en;
const fr: Copy = { legend: "Profil fiscal et social (définit votre calendrier de conformité)", vat: "Assujetti à la TVA", vatPeriod: "Déclaration TVA", monthly: "Mensuelle", quarterly: "Trimestrielle", employer: "A des employés (PAYE, RSSB)" };
const rw: Copy = { legend: "Imiterere y'imisoro n'abakozi (igena ingengabihe y'inshingano zanyu)", vat: "Yanditswe muri TVA", vatPeriod: "Imenyekanisha rya TVA", monthly: "Buri kwezi", quarterly: "Buri gihembwe", employer: "Ifite abakozi (PAYE, RSSB)" };
export const orgComplianceCopy = (l: Locale) => ({ en, fr, rw })[l];
