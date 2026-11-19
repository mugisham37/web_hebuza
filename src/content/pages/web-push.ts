// F-NTF-18 web push copy (rw/en/fr).
import type { Locale } from "@/shared/i18n/config";
const en = { title: "Browser notifications", body: "Get a pop-up on this device when something needs you. Uses your quiet hours.", on: "On for this device", blocked: "Notifications are blocked in your browser settings.", failed: "Couldn't turn on notifications." };
type Copy = typeof en;
const fr: Copy = { title: "Notifications du navigateur", body: "Recevez une alerte sur cet appareil quand quelque chose vous attend. Respecte vos heures calmes.", on: "Activées sur cet appareil", blocked: "Les notifications sont bloquées dans votre navigateur.", failed: "Impossible d'activer les notifications." };
const rw: Copy = { title: "Amatangazo ya mushakisha", body: "Akira itangazo kuri iki gikoresho igihe hari ikigukeneye. Byubahiriza amasaha y'ituze.", on: "Bifunguye kuri iki gikoresho", blocked: "Amatangazo yahagaritswe muri mushakisha yawe.", failed: "Ntibyashobotse gufungura amatangazo." };
export const webPushCopy = (l: Locale) => ({ en, fr, rw })[l];
