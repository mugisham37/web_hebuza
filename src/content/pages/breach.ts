// PRV-breach copy (rw/en/fr): personal-data flag on incidents + regulator-notification timer.
import type { Locale } from "@/shared/i18n/config";
const en = { flag: "Personal data affected (breach: regulator must be notified)", title: "Regulator notification", due: "Notify by", left: "left", overdue: "Overdue", done: "Notified", ref: "Notification reference", mark: "Mark notified", saved: "Notification recorded" };
type Copy = typeof en;
const fr: Copy = { flag: "Données personnelles touchées (violation : notifier l'autorité)", title: "Notification à l'autorité", due: "À notifier avant", left: "restant", overdue: "En retard", done: "Notifiée", ref: "Référence de notification", mark: "Marquer notifiée", saved: "Notification enregistrée" };
const rw: Copy = { flag: "Amakuru bwite yagezweho (bigomba kumenyeshwa urwego rubishinzwe)", title: "Kumenyesha urwego rubishinzwe", due: "Bimenyeshwe mbere ya", left: "isigaye", overdue: "Byarengeje igihe", done: "Byamenyeshejwe", ref: "Nimero yo kumenyesha", mark: "Emeza ko byamenyeshejwe", saved: "Byabitswe" };
export const breachCopy = (l: Locale) => ({ en, fr, rw })[l];
