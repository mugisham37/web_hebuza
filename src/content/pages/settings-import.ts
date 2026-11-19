// F-SET-13 settings import copy (rw/en/fr).
import type { Locale } from "@/shared/i18n/config";
const en = { button: "Import", label: "Settings file (from Export)", done: "{n} settings applied", pending: "Sent for approval", skipped: "{n} keys skipped (read-only or unknown)", failed: "Not a settings export file." };
type Copy = typeof en;
const fr: Copy = { button: "Importer", label: "Fichier de paramètres (issu d'Exporter)", done: "{n} paramètres appliqués", pending: "Envoyé pour approbation", skipped: "{n} clés ignorées (lecture seule ou inconnues)", failed: "Ce n'est pas un export de paramètres." };
const rw: Copy = { button: "Injiza", label: "Dosiye y'igenamiterere (yavuye muri Kohereza)", done: "Igenamiterere {n} ryashyizweho", pending: "Byoherejwe kwemezwa", skipped: "Imfunguzo {n} zasimbutswe", failed: "Iyi si dosiye y'igenamiterere." };
export const settingsImportCopy = (l: Locale) => ({ en, fr, rw })[l];
