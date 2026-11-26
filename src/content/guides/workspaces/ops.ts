import type { Locale } from "@/shared/i18n/config";
import type { GuideText } from "../types";
import type { WsGuide, WsGuideSet } from "./index";
import enDict from "@/shared/i18n/dictionaries/en.json";
import frDict from "@/shared/i18n/dictionaries/fr.json";
import rwDict from "@/shared/i18n/dictionaries/rw.json";
import { opsToday } from "@/content/pages/ops-today";
import { opsIntake } from "@/content/pages/ops-intake";
import { opsAssisted } from "@/content/pages/ops-assisted";
import { opsCases } from "@/content/pages/ops-cases";
import { opsCase } from "@/content/pages/ops-case";
import { opsCommon } from "@/content/pages/ops-common";
import { opsAssign } from "@/content/pages/ops-assign";
import { opsWorkload } from "@/content/pages/ops-workload";
import { opsSla } from "@/content/pages/ops-sla";
import { opsReviews } from "@/content/pages/ops-reviews";
import { opsTickets } from "@/content/pages/ops-tickets";
import { opsCompanies } from "@/content/pages/ops-companies";
import { opsRetention } from "@/content/pages/ops-retention";
import { opsConversations } from "@/content/pages/ops-conversations";
import { opsCatalogue, opsStatuses } from "@/content/pages/ops-catalogue";
import { opsCompliance } from "@/content/pages/ops-compliance";
import { opsWorkforce } from "@/content/pages/ops-workforce";
import { clientMessageCopy } from "@/content/pages/client-message";
import { bkgCopy } from "@/lib/booking/copy";
import { copyF } from "@/lib/field/copy-f";
import { guidesCopy } from "../copy";

// ops dashboard guides (Service Manager). rw/fr are drafts for native review.
// Bold labels are read from the same copy files the screens use, so they always match what the person sees
// (Bookings, Knowledge base and Assistant screens are English-only for staff today, so their labels stay English).
const U = "2026-11-26";
const NAV = { en: enDict.wsnav, fr: frDict.wsnav, rw: rwDict.wsnav };

/** **label**, without {placeholders} or trailing punctuation. */
const B = (s: string) =>
  `**${s
    .replace(/\s*\{\w+\}\s*/g, " ")
    .replace(/[\s·:,(]+$/, "")
    .replace(/\s+/g, " ")
    .trim()}**`;

const copies = (l: Locale) => ({
  nav: NAV[l],
  today: opsToday(l),
  intake: opsIntake(l),
  assisted: opsAssisted(l),
  cases: opsCases(l),
  kase: opsCase(l),
  com: opsCommon(l),
  assign: opsAssign(l),
  load: opsWorkload(l),
  sla: opsSla(l),
  rev: opsReviews(l),
  tix: opsTickets(l),
  co: opsCompanies(l),
  ret: opsRetention(l),
  conv: opsConversations(l),
  cat: opsCatalogue(l),
  st: opsStatuses(l),
  comp: opsCompliance(l),
  wf: opsWorkforce(l),
  msg: clientMessageCopy(l),
  bk: bkgCopy(l),
  fld: copyF(l),
  help: guidesCopy(l),
});
type C = ReturnType<typeof copies>;
type P = <T>(en: T, fr: T, rw: T) => T;

function g(
  meta: Omit<WsGuide, "t" | "updated">,
  f: (c: C, p: P, l: Locale) => GuideText,
): WsGuide {
  const at = (l: Locale) =>
    f(copies(l), ((en, fr, rw) => ({ en, fr, rw })[l]) as P, l);
  return {
    ...meta,
    updated: U,
    t: { en: at("en"), fr: at("fr"), rw: at("rw") },
  };
}
/** side menu → item */
const menu = (c: C, p: P, item: string) =>
  p(
    `In the side menu, open ${B(item)}.`,
    `Dans le menu latéral, ouvrez ${B(item)}.`,
    `Mu rutonde rw'ibumoso, fungura ${B(item)}.`,
  );

const CATS: WsGuideSet["cats"] = [
  {
    key: "start",
    t: { en: "Getting started", fr: "Premiers pas", rw: "Gutangira" },
  },
  {
    key: "intake",
    t: {
      en: "Intake & cases",
      fr: "Entrées et dossiers",
      rw: "Ubusabe na dosiye",
    },
  },
  {
    key: "case",
    t: {
      en: "Working a case",
      fr: "Traiter un dossier",
      rw: "Gukora kuri dosiye",
    },
  },
  {
    key: "team",
    t: {
      en: "Team & assignment",
      fr: "Équipe et attribution",
      rw: "Itsinda no gushinga akazi",
    },
  },
  {
    key: "service",
    t: {
      en: "Service quality",
      fr: "Qualité de service",
      rw: "Ireme rya serivisi",
    },
  },
  {
    key: "records",
    t: {
      en: "Clients & records",
      fr: "Clients et archives",
      rw: "Abakiriya n'inyandiko",
    },
  },
  {
    key: "setup",
    t: {
      en: "Catalogue & settings",
      fr: "Catalogue et réglages",
      rw: "Serivisi n'igenamiterere",
    },
  },
];

const GUIDES: WsGuide[] = [
  // ------------------------------------------------------------------ start
  g(
    {
      slug: "today-dashboard",
      cat: "start",
      minutes: 4,
      pages: ["/ops"],
      start: true,
    },
    (c, p) => ({
      title: p(
        "Your Today page",
        "Votre page Aujourd'hui",
        "Urupapuro rwawe rw'Uyu munsi",
      ),
      summary: p(
        "What needs you right now: new requests, reviews, overdue cases, team load and today's consultations, on one screen.",
        "Ce qui vous attend maintenant : nouvelles demandes, revues, dossiers en retard, charge de l'équipe et consultations du jour, sur un seul écran.",
        "Ibigukeneye ubu: ubusabe bushya, isuzuma, dosiye zarengeje igihe, akazi k'itsinda n'inama z'uyu munsi, byose ku rupapuro rumwe.",
      ),
      keywords:
        "home dashboard kpi tiles morning start accueil tableau ahabanza",
      facts: {
        who: p(
          "Service managers",
          "Responsables de service",
          "Abayobozi ba serivisi",
        ),
        time: p(
          "2 minutes each morning",
          "2 minutes chaque matin",
          "Iminota 2 buri gitondo",
        ),
      },
      sections: [
        {
          id: "read",
          title: p("Read the page", "Lire la page", "Soma urupapuro"),
          steps: [
            {
              text: menu(c, p, c.nav.today),
              shot: "ops-today",
              marks: p(
                [
                  "Counters",
                  "Needs you now",
                  "All overdue cases",
                  "Open intake",
                  "Help",
                ],
                [
                  "Compteurs",
                  "Vous attend",
                  "Tous les retards",
                  "Ouvrir les entrées",
                  "Aide",
                ],
                [
                  "Imibare",
                  "Bigukeneye ubu",
                  "Ibyarengeje igihe byose",
                  "Fungura ibyinjiye",
                  "Ubufasha",
                ],
              ),
            },
            {
              text: p(
                `The counters at the top show ${B(c.today.kpi.intake)}, ${B(c.today.kpi.review)}, ${B(c.today.kpi.overdue)}, ${B(c.today.kpi.risk)}, ${B(c.today.kpi.unassigned)} and ${B(c.today.kpi.complaints)}. Click a counter (or press 1–6) to open that list.`,
                `Les compteurs en haut affichent ${B(c.today.kpi.intake)}, ${B(c.today.kpi.review)}, ${B(c.today.kpi.overdue)}, ${B(c.today.kpi.risk)}, ${B(c.today.kpi.unassigned)} et ${B(c.today.kpi.complaints)}. Cliquez un compteur (ou touches 1–6) pour ouvrir la liste.`,
                `Imibare yo hejuru yerekana ${B(c.today.kpi.intake)}, ${B(c.today.kpi.review)}, ${B(c.today.kpi.overdue)}, ${B(c.today.kpi.risk)}, ${B(c.today.kpi.unassigned)} na ${B(c.today.kpi.complaints)}. Kanda umubare (cyangwa 1–6) ufungure urwo rutonde.`,
              ),
            },
            {
              text: p(
                `${B(c.today.needsYou)} lists items waiting for you. Use the button on each line: ${B(c.today.act.review)} opens the deliverable to approve, ${B(c.today.act.declined)} opens assignment, ${B(c.today.act.dispute)} opens Tickets.`,
                `${B(c.today.needsYou)} liste ce qui vous attend. Utilisez le bouton de chaque ligne : ${B(c.today.act.review)} ouvre le livrable à approuver, ${B(c.today.act.declined)} ouvre l'attribution, ${B(c.today.act.dispute)} ouvre les tickets.`,
                `${B(c.today.needsYou)} herekana ibigutegereje. Koresha buto iri ku murongo: ${B(c.today.act.review)} ifungura igikorwa cyo kwemeza, ${B(c.today.act.declined)} ifungura gushinga, ${B(c.today.act.dispute)} ifungura ibibazo.`,
              ),
            },
            {
              text: p(
                `In ${B(c.today.overdueRisk)}, use ${B(c.today.nudge)} to remind the assignee or ${B(c.today.reassign)} to give the case to someone else. ${B(c.today.viewAll)} opens the full list in Cases.`,
                `Dans ${B(c.today.overdueRisk)}, utilisez ${B(c.today.nudge)} pour relancer l'agent ou ${B(c.today.reassign)} pour confier le dossier à quelqu'un d'autre. ${B(c.today.viewAll)} ouvre la liste complète dans Dossiers.`,
                `Muri ${B(c.today.overdueRisk)}, koresha ${B(c.today.nudge)} wibutse umukozi cyangwa ${B(c.today.reassign)} uhe dosiye undi. ${B(c.today.viewAll)} ifungura urutonde rwose muri Dosiye.`,
              ),
            },
            {
              text: p(
                `Lower down: ${B(c.today.workload)} (red means over capacity), ${B(c.today.awaitingReview)}, ${B(c.today.consultations)} and ${B(c.today.institutions)}.`,
                `Plus bas : ${B(c.today.workload)} (rouge = au-dessus de la capacité), ${B(c.today.awaitingReview)}, ${B(c.today.consultations)} et ${B(c.today.institutions)}.`,
                `Hasi: ${B(c.today.workload)} (umutuku = birenze ubushobozi), ${B(c.today.awaitingReview)}, ${B(c.today.consultations)} na ${B(c.today.institutions)}.`,
              ),
            },
          ],
        },
        {
          id: "approve",
          title: p(
            "Approve a deliverable from Today",
            "Approuver un livrable depuis Aujourd'hui",
            "Kwemeza igikorwa uhereye ku Uyu munsi",
          ),
          steps: [
            {
              text: p(
                `On a ${B(c.today.needs.review)} line, click ${B(c.today.act.review)}. A side panel shows the deliverable.`,
                `Sur une ligne ${B(c.today.needs.review)}, cliquez ${B(c.today.act.review)}. Un panneau affiche le livrable.`,
                `Ku murongo ${B(c.today.needs.review)}, kanda ${B(c.today.act.review)}. Akanama k'iruhande kerekana igikorwa.`,
              ),
            },
            {
              text: p(
                `Click ${B(c.today.approve.approve)} to deliver it to the client, or ${B(c.today.approve.ret)}, pick a reason, write a ${B(c.today.approve.note)} and confirm to send it back to the agent.`,
                `Cliquez ${B(c.today.approve.approve)} pour le livrer au client, ou ${B(c.today.approve.ret)}, choisissez un motif, écrivez une ${B(c.today.approve.note)} et confirmez pour le renvoyer à l'agent.`,
                `Kanda ${B(c.today.approve.approve)} gihabwe umukiriya, cyangwa ${B(c.today.approve.ret)}, hitamo impamvu, andika ${B(c.today.approve.note)} wemeze kugisubiza umukozi.`,
              ),
            },
          ],
        },
        {
          id: "scope",
          title: p(
            "Filter by service",
            "Filtrer par service",
            "Kuyungurura ukurikije serivisi",
          ),
          steps: [
            {
              text: p(
                `Use the ${B(c.today.service)} menu at the top right to show one service only (${B(c.today.allServices)} brings everything back). The category selector in the top bar (${B(c.com.shell.scope)}) narrows every ops page.`,
                `Le menu ${B(c.today.service)} en haut à droite n'affiche qu'un service (${B(c.today.allServices)} rétablit tout). Le sélecteur ${B(c.com.shell.scope)} de la barre du haut restreint toutes les pages ops.`,
                `Koresha ${B(c.today.service)} hejuru iburyo werekane serivisi imwe (${B(c.today.allServices)} igarura byose). Ihitamo ${B(c.com.shell.scope)} ryo hejuru rigabanya amapaji yose ya ops.`,
              ),
            },
          ],
          tips: [
            p(
              "The page refreshes itself; the Live badge shows when it last updated.",
              "La page se met à jour seule ; le badge Live indique la dernière mise à jour.",
              "Urupapuro rwivugurura ubwarwo; akamenyetso Live kerekana igihe ruheruka kuvugururwa.",
            ),
          ],
        },
      ],
    }),
  ),

  g(
    {
      slug: "help-and-shortcuts",
      cat: "start",
      minutes: 2,
      pages: ["/ops", "/ops/guides"],
      start: true,
    },
    (c, p) => ({
      title: p(
        "Help, guides and keyboard shortcuts",
        "Aide, guides et raccourcis clavier",
        "Ubufasha, amabwiriza n'utubuto twihuse",
      ),
      summary: p(
        "Open the guide for the screen you are on, search all guides, and work faster with the keyboard.",
        "Ouvrez le guide de l'écran où vous êtes, cherchez dans tous les guides et travaillez plus vite au clavier.",
        "Fungura amabwiriza y'urupapuro uriho, shakisha mu mabwiriza yose, kandi ukore vuba ukoresheje clavier.",
      ),
      keywords:
        "help question mark guide shortcut keyboard aide raccourci ubufasha",
      sections: [
        {
          id: "help",
          title: p("Open a guide", "Ouvrir un guide", "Fungura amabwiriza"),
          steps: [
            {
              text: p(
                `Click ${B(c.help.help)} (the round ? at the top). The panel lists the guides for the page you are on first.`,
                `Cliquez ${B(c.help.help)} (le ? rond en haut). Le panneau liste d'abord les guides de la page ouverte.`,
                `Kanda ${B(c.help.help)} (akaziga ka ? hejuru). Akanama kabanza kwerekana amabwiriza y'urupapuro uriho.`,
              ),
              shot: "ops-help",
              marks: p(
                ["Guides panel"],
                ["Panneau des guides"],
                ["Akanama k'amabwiriza"],
              ),
            },
            {
              text: p(
                `Type in the search box to find any guide, click one to read it, or use ${B(c.help.allInDashboard)} to see the full list (also in the side menu under ${B(c.nav.guides)}).`,
                `Tapez dans la recherche pour trouver un guide, cliquez-le pour le lire, ou utilisez ${B(c.help.allInDashboard)} pour la liste complète (aussi dans le menu, ${B(c.nav.guides)}).`,
                `Andika mu gushakisha ubone amabwiriza, kanda kimwe ugisome, cyangwa ukoreshe ${B(c.help.allInDashboard)} ubone byose (no mu rutonde, ${B(c.nav.guides)}).`,
              ),
            },
          ],
        },
        {
          id: "keys",
          title: p(
            "Keyboard shortcuts",
            "Raccourcis clavier",
            "Utubuto twihuse",
          ),
          steps: [
            {
              text: p(
                `Press ? anywhere in ops to open ${B(c.com.shortcuts.title)}. Press G then I, C, R, T or S to ${B(c.com.shortcuts.goIntake)}, ${B(c.com.shortcuts.goCases)}, ${B(c.com.shortcuts.goReviews)}, ${B(c.com.shortcuts.goTickets)} or ${B(c.com.shortcuts.goSla)}.`,
                `Appuyez sur ? n'importe où pour ouvrir ${B(c.com.shortcuts.title)}. Appuyez G puis I, C, R, T ou S pour ${B(c.com.shortcuts.goIntake)}, ${B(c.com.shortcuts.goCases)}, ${B(c.com.shortcuts.goReviews)}, ${B(c.com.shortcuts.goTickets)} ou ${B(c.com.shortcuts.goSla)}.`,
                `Kanda ? aho ari ho hose ufungure ${B(c.com.shortcuts.title)}. Kanda G hanyuma I, C, R, T cyangwa S: ${B(c.com.shortcuts.goIntake)}, ${B(c.com.shortcuts.goCases)}, ${B(c.com.shortcuts.goReviews)}, ${B(c.com.shortcuts.goTickets)} cyangwa ${B(c.com.shortcuts.goSla)}.`,
              ),
            },
            {
              text: p(
                "In lists: J/K move, Enter opens, X selects, / jumps to search. On a case: E changes status, H puts on hold, A assigns, N adds an internal note.",
                "Dans les listes : J/K pour naviguer, Entrée pour ouvrir, X pour sélectionner, / pour chercher. Sur un dossier : E change le statut, H met en pause, A attribue, N ajoute une note interne.",
                "Mu rutonde: J/K kugenda, Enter gufungura, X guhitamo, / gushakisha. Kuri dosiye: E guhindura imiterere, H guhagarika, A gushinga, N kongeraho icyitonderwa cy'imbere.",
              ),
            },
          ],
        },
      ],
    }),
  ),

  // ------------------------------------------------------------------ intake
  g(
    {
      slug: "triage-intake",
      cat: "intake",
      minutes: 5,
      pages: ["/ops/intake"],
      start: true,
    },
    (c, p) => ({
      title: p(
        "Triage new requests in Intake",
        "Trier les nouvelles demandes (Entrées)",
        "Gusuzuma ubusabe bushya (Ibyinjiye)",
      ),
      summary: p(
        "Every new request lands in Intake, newest first. Look, claim, then open the full triage, hold, merge duplicates or act on several at once.",
        "Chaque nouvelle demande arrive dans Entrées, la plus récente en premier. Regardez, réservez, puis ouvrez le tri, mettez en pause, fusionnez les doublons ou agissez sur plusieurs.",
        "Ubusabe bushya bwose buza mu Byinjiye, ubwa vuba mbere. Reba, ubufate, hanyuma ufungure isuzuma, uhagarike, uhuze ibisubiwemo cyangwa ukore kuri byinshi icyarimwe.",
      ),
      keywords:
        "intake triage new request claim duplicate merge entrées tri ubusabe bushya",
      facts: {
        who: p(
          "Service managers",
          "Responsables de service",
          "Abayobozi ba serivisi",
        ),
        time: p(
          "1–3 minutes per request",
          "1 à 3 minutes par demande",
          "Iminota 1–3 ku busabe",
        ),
      },
      sections: [
        {
          id: "find",
          title: p("Find the request", "Trouver la demande", "Shaka ubusabe"),
          steps: [
            {
              text: menu(c, p, c.nav.intake),
              shot: "ops-intake",
              marks: p(
                ["Tabs", "Search", "Filters", "Select", "Review"],
                ["Onglets", "Recherche", "Filtres", "Sélection", "Revoir"],
                ["Ibice", "Gushakisha", "Iyungurura", "Hitamo", "Suzuma"],
              ),
            },
            {
              text: p(
                `Pick a tab: ${B(c.intake.tabs.all)}, ${B(c.intake.tabs.urgent)}, ${B(c.intake.tabs.vip)}, ${B(c.intake.tabs.duplicates)} or ${B(c.intake.tabs.partner)}. Search by reference, client or service, or add ${B(c.intake.filters.flags)}, ${B(c.intake.filters.service)} or ${B(c.intake.filters.payment)} filters.`,
                `Choisissez un onglet : ${B(c.intake.tabs.all)}, ${B(c.intake.tabs.urgent)}, ${B(c.intake.tabs.vip)}, ${B(c.intake.tabs.duplicates)} ou ${B(c.intake.tabs.partner)}. Cherchez par référence, client ou service, ou ajoutez les filtres ${B(c.intake.filters.flags)}, ${B(c.intake.filters.service)} ou ${B(c.intake.filters.payment)}.`,
                `Hitamo igice: ${B(c.intake.tabs.all)}, ${B(c.intake.tabs.urgent)}, ${B(c.intake.tabs.vip)}, ${B(c.intake.tabs.duplicates)} cyangwa ${B(c.intake.tabs.partner)}. Shakisha ukoresheje nimero, umukiriya cyangwa serivisi, cyangwa wongereho ${B(c.intake.filters.flags)}, ${B(c.intake.filters.service)} cyangwa ${B(c.intake.filters.payment)}.`,
              ),
            },
            {
              text: p(
                `Read the ${B(c.intake.cols.completeness)}, ${B(c.intake.cols.precheck)} and ${B(c.intake.cols.sla)} columns: they tell you what is missing and how long you have to reply.`,
                `Lisez les colonnes ${B(c.intake.cols.completeness)}, ${B(c.intake.cols.precheck)} et ${B(c.intake.cols.sla)} : elles indiquent ce qui manque et le délai de réponse.`,
                `Soma inkingi ${B(c.intake.cols.completeness)}, ${B(c.intake.cols.precheck)} na ${B(c.intake.cols.sla)}: zikubwira ibibura n'igihe ufite cyo gusubiza.`,
              ),
            },
          ],
        },
        {
          id: "look",
          title: p(
            "Quick look and claim",
            "Aperçu et réservation",
            "Kureba vuba no gufata",
          ),
          steps: [
            {
              text: p(
                `Click ${B(c.intake.review)} on a row. The ${B(c.intake.quickLook)} panel opens on the right with key answers, documents and completeness.`,
                `Cliquez ${B(c.intake.review)} sur une ligne. Le panneau ${B(c.intake.quickLook)} s'ouvre à droite avec les réponses clés, documents et complétude.`,
                `Kanda ${B(c.intake.review)} ku murongo. Akanama ${B(c.intake.quickLook)} gafunguka iburyo kerekana ibisubizo by'ingenzi, inyandiko no kuzura.`,
              ),
              shot: "ops-intake-quick",
              marks: p(
                ["Open full triage", "Claim", "Compare duplicate"],
                ["Ouvrir le tri", "Réserver", "Comparer"],
                ["Fungura isuzuma", "Fata", "Gereranya"],
              ),
            },
            {
              text: p(
                `Click ${B(c.intake.claim)} so colleagues see you are triaging it (they can read but not change it), then ${B(c.intake.openTriage)} to work on the case page.`,
                `Cliquez ${B(c.intake.claim)} pour que vos collègues voient que vous la triez (lecture seule pour eux), puis ${B(c.intake.openTriage)} pour travailler sur la page du dossier.`,
                `Kanda ${B(c.intake.claim)} kugira ngo bagenzi bawe babone ko uri kubusuzuma (bashobora gusoma gusa), hanyuma ${B(c.intake.openTriage)} ukore ku rupapuro rwa dosiye.`,
              ),
            },
            {
              text: p(
                `Need to wait? Click ${B(c.intake.hold)}, choose a reason such as ${B(c.intake.holdReasons.client)}, add a note and confirm.`,
                `Il faut attendre ? Cliquez ${B(c.intake.hold)}, choisissez un motif comme ${B(c.intake.holdReasons.client)}, ajoutez une note et confirmez.`,
                `Ugomba gutegereza? Kanda ${B(c.intake.hold)}, hitamo impamvu nka ${B(c.intake.holdReasons.client)}, wongereho icyitonderwa wemeze.`,
              ),
            },
          ],
        },
        {
          id: "dup",
          title: p(
            "Possible duplicates",
            "Doublons possibles",
            "Ibishobora kuba bisubiwemo",
          ),
          steps: [
            {
              text: p(
                `On a request flagged ${B(c.com.flags.duplicate)}, click ${B(c.intake.compare)}. The two requests are shown side by side, field by field.`,
                `Sur une demande marquée ${B(c.com.flags.duplicate)}, cliquez ${B(c.intake.compare)}. Les deux demandes s'affichent côte à côte.`,
                `Ku busabe bwanditseho ${B(c.com.flags.duplicate)}, kanda ${B(c.intake.compare)}. Ubusabe bubiri bugaragara iruhande.`,
              ),
            },
            {
              text: p(
                `Choose ${B(c.intake.dup.merge)} to fold it into the existing case, ${B(c.intake.dup.dismiss)} to clear the flag, or ${B(c.intake.dup.reject)}.`,
                `Choisissez ${B(c.intake.dup.merge)} pour la fusionner avec le dossier existant, ${B(c.intake.dup.dismiss)} pour retirer l'indicateur, ou ${B(c.intake.dup.reject)}.`,
                `Hitamo ${B(c.intake.dup.merge)} ubuhuze na dosiye isanzwe, ${B(c.intake.dup.dismiss)} ukureho ikimenyetso, cyangwa ${B(c.intake.dup.reject)}.`,
              ),
            },
          ],
          warn: p(
            "Merging and rejecting cannot be undone from Intake. Compare the client, phone and documents first.",
            "La fusion et le rejet ne s'annulent pas depuis Entrées. Comparez d'abord client, téléphone et documents.",
            "Guhuza no kwanga ntibisubirwaho uhereye mu Byinjiye. Banza ugereranye umukiriya, telefoni n'inyandiko.",
          ),
        },
        {
          id: "bulk",
          title: p(
            "Act on several requests",
            "Agir sur plusieurs demandes",
            "Gukora ku busabe bwinshi",
          ),
          steps: [
            {
              text: p(
                "Tick the box at the start of each row (or press X). A dark bar appears at the bottom.",
                "Cochez la case au début de chaque ligne (ou touche X). Une barre sombre apparaît en bas.",
                "Shyira akamenyetso mu kazu ko ku ntangiriro y'umurongo (cyangwa X). Umurongo wijimye ugaragara hasi.",
              ),
              shot: "ops-intake-bulk",
              marks: p(
                ["Bulk actions"],
                ["Actions groupées"],
                ["Ibikorwa rusange"],
              ),
            },
            {
              text: p(
                `Choose ${B(c.intake.bulk.assign)}, ${B(c.intake.bulk.hold)} or ${B(c.intake.bulk.review)}. ${B(c.intake.bulk.request)} works on one request at a time. A toast with ${B(c.com.undo)} lets you reverse the move.`,
                `Choisissez ${B(c.intake.bulk.assign)}, ${B(c.intake.bulk.hold)} ou ${B(c.intake.bulk.review)}. ${B(c.intake.bulk.request)} ne marche que pour une demande à la fois. Le message ${B(c.com.undo)} permet d'annuler.`,
                `Hitamo ${B(c.intake.bulk.assign)}, ${B(c.intake.bulk.hold)} cyangwa ${B(c.intake.bulk.review)}. ${B(c.intake.bulk.request)} ikora ku busabe bumwe bumwe. Ubutumwa bufite ${B(c.com.undo)} bugufasha gusubiza inyuma.`,
              ),
            },
          ],
        },
      ],
    }),
  ),

  g(
    {
      slug: "file-for-a-client",
      cat: "intake",
      minutes: 3,
      pages: ["/ops/assisted"],
    },
    (c, p) => ({
      title: p(
        "File a request for a walk-in or phone client",
        "Déposer une demande pour un client au guichet ou au téléphone",
        "Gutanga ubusabe ku mukiriya waje cyangwa wahamagaye",
      ),
      summary: c.assisted.lede,
      keywords:
        "assisted walk-in phone offline client on behalf déposer guichet saba mu izina",
      facts: {
        who: p(
          "Service managers",
          "Responsables de service",
          "Abayobozi ba serivisi",
        ),
        time: p("3 minutes", "3 minutes", "Iminota 3"),
        need: p(
          [
            "The client's name",
            "A phone number or email",
            "The client's consent",
          ],
          [
            "Le nom du client",
            "Un téléphone ou un e-mail",
            "Le consentement du client",
          ],
          [
            "Amazina y'umukiriya",
            "Telefoni cyangwa imeyili",
            "Uburenganzira bw'umukiriya",
          ],
        ),
      },
      sections: [
        {
          id: "file",
          title: p("Fill in and file", "Remplir et déposer", "Uzuza wohereze"),
          steps: [
            {
              text: menu(c, p, c.nav.assisted),
              shot: "ops-assisted",
              marks: p(
                ["The form", "File the request"],
                ["Le formulaire", "Déposer"],
                ["Ifishi", "Ohereza"],
              ),
            },
            {
              text: p(
                `Choose the ${B(c.assisted.service)}, then enter ${B(c.assisted.name)}, ${B(c.assisted.nid)}, ${B(c.assisted.phone)} and/or ${B(c.assisted.email)}.`,
                `Choisissez le ${B(c.assisted.service)}, puis saisissez ${B(c.assisted.name)}, ${B(c.assisted.nid)}, ${B(c.assisted.phone)} et/ou ${B(c.assisted.email)}.`,
                `Hitamo ${B(c.assisted.service)}, hanyuma wandike ${B(c.assisted.name)}, ${B(c.assisted.nid)}, ${B(c.assisted.phone)} na/cyangwa ${B(c.assisted.email)}.`,
              ),
            },
            {
              text: p(
                `Describe ${B(c.assisted.summary)}, pick ${B(c.assisted.consent)} (for example ${B(c.assisted.consents.verbal)}) and write the ${B(c.assisted.consentNote)}.`,
                `Décrivez le ${B(c.assisted.summary)}, choisissez ${B(c.assisted.consent)} (par ex. ${B(c.assisted.consents.verbal)}) et écrivez la ${B(c.assisted.consentNote)}.`,
                `Sobanura ${B(c.assisted.summary)}, hitamo ${B(c.assisted.consent)} (urugero ${B(c.assisted.consents.verbal)}) wandike ${B(c.assisted.consentNote)}.`,
              ),
            },
            {
              text: p(
                `Click ${B(c.assisted.submit)}. The client receives the tracking code; the new request appears in Intake.`,
                `Cliquez ${B(c.assisted.submit)}. Le client reçoit le code de suivi ; la demande apparaît dans Entrées.`,
                `Kanda ${B(c.assisted.submit)}. Umukiriya ahabwa nimero yo gukurikirana; ubusabe bushya bugaragara mu Byinjiye.`,
              ),
            },
          ],
          faq: [
            {
              q: p(
                "It says to add a phone or an email.",
                "Le message demande un téléphone ou un e-mail.",
                "Ubutumwa busaba telefoni cyangwa imeyili.",
              ),
              a: p(
                "At least one contact is required so the client can receive the code.",
                "Au moins un contact est obligatoire pour que le client reçoive le code.",
                "Hakenewe nibura uburyo bumwe bwo kuvugana kugira ngo umukiriya abone nimero.",
              ),
            },
          ],
        },
      ],
    }),
  ),

  g(
    {
      slug: "cases-list",
      cat: "intake",
      minutes: 6,
      pages: ["/ops/cases"],
      start: true,
    },
    (c, p) => ({
      title: p(
        "Find cases: views, search, filters and columns",
        "Trouver des dossiers : vues, recherche, filtres et colonnes",
        "Gushaka dosiye: uko ureba, gushakisha, iyungurura n'inkingi",
      ),
      summary: p(
        "The Cases list holds every request after intake. Save the views you use, filter, change columns, select several cases to move or export them.",
        "La liste Dossiers contient toutes les demandes après l'entrée. Enregistrez vos vues, filtrez, changez les colonnes, sélectionnez plusieurs dossiers pour les déplacer ou les exporter.",
        "Urutonde rwa Dosiye rubika ubusabe bwose nyuma yo kwinjira. Bika uko ureba, uyungurure, uhindure inkingi, uhitemo dosiye nyinshi uzimure cyangwa uzisohore.",
      ),
      keywords:
        "cases list filter saved view columns density export csv bulk status dossiers dosiye",
      sections: [
        {
          id: "find",
          title: p(
            "Find what you need",
            "Trouver ce qu'il vous faut",
            "Shaka ibyo ukeneye",
          ),
          steps: [
            {
              text: menu(c, p, c.nav.cases),
              shot: "ops-cases",
              marks: p(
                [
                  "Views",
                  "Save view",
                  "Search",
                  "Filters",
                  "Density",
                  "Export",
                ],
                [
                  "Vues",
                  "Enregistrer",
                  "Recherche",
                  "Filtres",
                  "Densité",
                  "Exporter",
                ],
                [
                  "Uko ureba",
                  "Bika",
                  "Gushakisha",
                  "Iyungurura",
                  "Ubucucike",
                  "Sohora",
                ],
              ),
            },
            {
              text: p(
                `Pick a view: ${B(c.cases.views.mine)}, ${B(c.cases.views.overdue)}, ${B(c.cases.views.risk)}, ${B(c.cases.views.unassigned)}, ${B(c.cases.views.client)}, ${B(c.cases.views.institution)}, ${B(c.cases.views.review)} or ${B(c.cases.views.hold)}.`,
                `Choisissez une vue : ${B(c.cases.views.mine)}, ${B(c.cases.views.overdue)}, ${B(c.cases.views.risk)}, ${B(c.cases.views.unassigned)}, ${B(c.cases.views.client)}, ${B(c.cases.views.institution)}, ${B(c.cases.views.review)} ou ${B(c.cases.views.hold)}.`,
                `Hitamo uko ureba: ${B(c.cases.views.mine)}, ${B(c.cases.views.overdue)}, ${B(c.cases.views.risk)}, ${B(c.cases.views.unassigned)}, ${B(c.cases.views.client)}, ${B(c.cases.views.institution)}, ${B(c.cases.views.review)} cyangwa ${B(c.cases.views.hold)}.`,
              ),
            },
            {
              text: p(
                `Type in the search box (reference, client, service or submission ref), then add ${B(c.cases.filters.status)}, ${B(c.cases.filters.sla)}, ${B(c.cases.filters.assignee)} or ${B(c.cases.filters.service)} filters. Remove one with its ×, or ${B(c.com.clearAll)}.`,
                `Tapez dans la recherche (référence, client, service ou réf. de dépôt), puis ajoutez les filtres ${B(c.cases.filters.status)}, ${B(c.cases.filters.sla)}, ${B(c.cases.filters.assignee)} ou ${B(c.cases.filters.service)}. Retirez-en un avec ×, ou ${B(c.com.clearAll)}.`,
                `Andika mu gushakisha (nimero, umukiriya, serivisi cyangwa nimero yo kohereza), wongereho ${B(c.cases.filters.status)}, ${B(c.cases.filters.sla)}, ${B(c.cases.filters.assignee)} cyangwa ${B(c.cases.filters.service)}. Kuraho kimwe ukoresheje ×, cyangwa ${B(c.com.clearAll)}.`,
              ),
            },
            {
              text: p(
                `Click a row to see the ${B(c.cases.lastEvents)} and ${B(c.cases.nudgeAgent)}; double-click (or Enter) to open the case.`,
                `Cliquez une ligne pour voir les ${B(c.cases.lastEvents)} et ${B(c.cases.nudgeAgent)} ; double-cliquez (ou Entrée) pour ouvrir le dossier.`,
                `Kanda umurongo urebe ${B(c.cases.lastEvents)} na ${B(c.cases.nudgeAgent)}; kanda kabiri (cyangwa Enter) ufungure dosiye.`,
              ),
            },
            {
              text: p(
                `In ${B(c.cases.views.institution)}, cases are grouped by institution with the next expected decision; late ones are red.`,
                `Dans ${B(c.cases.views.institution)}, les dossiers sont groupés par institution avec la prochaine décision attendue ; les retards sont en rouge.`,
                `Muri ${B(c.cases.views.institution)}, dosiye zishyirwa hamwe ukurikije ikigo n'icyemezo gitegerejwe; izatinze ziba zitukura.`,
              ),
            },
          ],
        },
        {
          id: "layout",
          title: p(
            "Columns, density and saved views",
            "Colonnes, densité et vues enregistrées",
            "Inkingi, ubucucike n'uko ubika ureba",
          ),
          steps: [
            {
              text: p(
                `Switch ${B(c.com.density.comfortable)} / ${B(c.com.density.compact)}, then open ${B(c.com.columns)} to tick the columns you want and move them up or down.`,
                `Basculez ${B(c.com.density.comfortable)} / ${B(c.com.density.compact)}, puis ouvrez ${B(c.com.columns)} pour cocher les colonnes et changer leur ordre.`,
                `Hindura ${B(c.com.density.comfortable)} / ${B(c.com.density.compact)}, hanyuma ufungure ${B(c.com.columns)} uhitemo inkingi n'uko zikurikirana.`,
              ),
              shot: "ops-cases-columns",
              marks: p(
                ["Column picker"],
                ["Choix des colonnes"],
                ["Guhitamo inkingi"],
              ),
            },
            {
              text: p(
                `Click ${B(c.cases.saveView)}, give a ${B(c.cases.save.name)}, tick ${B(c.cases.save.share)} or ${B(c.cases.save.def)} if you want, then ${B(c.cases.save.confirm)}. It appears as a new tab.`,
                `Cliquez ${B(c.cases.saveView)}, donnez un ${B(c.cases.save.name)}, cochez ${B(c.cases.save.share)} ou ${B(c.cases.save.def)} si besoin, puis ${B(c.cases.save.confirm)}. Elle apparaît comme un nouvel onglet.`,
                `Kanda ${B(c.cases.saveView)}, wandike ${B(c.cases.save.name)}, uhitemo ${B(c.cases.save.share)} cyangwa ${B(c.cases.save.def)} ubishaka, hanyuma ${B(c.cases.save.confirm)}. Bigaragara nk'igice gishya.`,
              ),
              shot: "ops-cases-save",
              marks: p(["Save view"], ["Enregistrer la vue"], ["Bika"]),
            },
          ],
          tips: [
            p(
              "Every filter and view lives in the address bar: copy the link to share exactly what you see.",
              "Chaque filtre et vue est dans l'adresse : copiez le lien pour partager exactement ce que vous voyez.",
              "Iyungurura ryose riri mu aderesi: koporora ihuza usangize abandi ibyo ubona.",
            ),
          ],
        },
        {
          id: "bulk",
          title: p(
            "Move or export several cases",
            "Déplacer ou exporter plusieurs dossiers",
            "Kwimura cyangwa gusohora dosiye nyinshi",
          ),
          steps: [
            {
              text: p(
                "Tick the cases you want (X on the keyboard). The bar at the bottom shows how many are selected.",
                "Cochez les dossiers voulus (X au clavier). La barre du bas indique combien sont sélectionnés.",
                "Hitamo dosiye ushaka (X kuri clavier). Umurongo wo hasi werekana umubare watoranyijwe.",
              ),
              shot: "ops-cases-bulk",
              marks: p(
                ["Selection bar"],
                ["Barre de sélection"],
                ["Umurongo w'ibyatoranyijwe"],
              ),
            },
            {
              text: p(
                `${B(c.cases.bulk.change)}: only statuses every selected case can move to are enabled. Pick one, choose a ${B(c.cases.change.reason)}, add a ${B(c.cases.change.note)} and confirm.`,
                `${B(c.cases.bulk.change)} : seuls les statuts possibles pour tous les dossiers sont actifs. Choisissez-en un, un ${B(c.cases.change.reason)}, une ${B(c.cases.change.note)} et confirmez.`,
                `${B(c.cases.bulk.change)}: imiterere dosiye zose zishobora kujyamo ni yo ikora. Hitamo umwe, ${B(c.cases.change.reason)}, ${B(c.cases.change.note)} wemeze.`,
              ),
            },
            {
              text: p(
                `${B(c.cases.bulk.export)} (or ${B(c.com.export)} for the whole list): choose ${B(c.cases.export.columns)}, the ${B(c.cases.export.range)} dates and the ${B(c.cases.export.format)}, then click the export button. A CSV downloads.`,
                `${B(c.cases.bulk.export)} (ou ${B(c.com.export)} pour toute la liste) : choisissez ${B(c.cases.export.columns)}, les dates ${B(c.cases.export.range)} et le ${B(c.cases.export.format)}, puis cliquez sur exporter. Un CSV est téléchargé.`,
                `${B(c.cases.bulk.export)} (cyangwa ${B(c.com.export)} ku rutonde rwose): hitamo ${B(c.cases.export.columns)}, amatariki ${B(c.cases.export.range)} na ${B(c.cases.export.format)}, hanyuma ukande kohereza. CSV iramanuka.`,
              ),
              shot: "ops-cases-export",
              marks: p(
                ["Export dialog"],
                ["Fenêtre d'export"],
                ["Idirishya ryo gusohora"],
              ),
            },
          ],
          faq: [
            {
              q: p(
                "What do the SLA colours mean?",
                "Que signifient les couleurs SLA ?",
                "Amabara ya SLA asobanura iki?",
              ),
              a: p(
                `${B(c.cases.slaStates.ok)}: inside the target. ${B(c.cases.slaStates.risk)}: due within 24 business hours. ${B(c.cases.slaStates.breach)}: past due. ${B(c.cases.slaStates.paused)}: the clock is stopped (waiting on client, institution, quote, payment or on hold). ${c.com.sla.businessHours}.`,
                `${B(c.cases.slaStates.ok)} : dans l'objectif. ${B(c.cases.slaStates.risk)} : échéance sous 24 h ouvrables. ${B(c.cases.slaStates.breach)} : dépassé. ${B(c.cases.slaStates.paused)} : horloge arrêtée (attente client, institution, devis, paiement ou pause). ${c.com.sla.businessHours}.`,
                `${B(c.cases.slaStates.ok)}: biri mu gihe. ${B(c.cases.slaStates.risk)}: bisigaje amasaha 24 y'akazi. ${B(c.cases.slaStates.breach)}: byarenze igihe. ${B(c.cases.slaStates.paused)}: isaha yahagaze (dutegereje umukiriya, ikigo, igiciro, ubwishyu cyangwa byahagaritswe). ${c.com.sla.businessHours}.`,
              ),
            },
            {
              q: p(
                "Some cases could not move.",
                "Certains dossiers n'ont pas bougé.",
                "Dosiye zimwe ntizimutse.",
              ),
              a: p(
                "They changed since the list loaded. Refresh and try again; the toast says how many failed.",
                "Ils ont changé depuis le chargement. Actualisez et réessayez ; le message indique combien ont échoué.",
                "Zahindutse nyuma yo gufungura urutonde. Vugurura wongere ugerageze; ubutumwa bwerekana izanze.",
              ),
            },
          ],
        },
      ],
    }),
  ),

  // ------------------------------------------------------------------ case
  g(
    {
      slug: "case-page-and-status",
      cat: "case",
      minutes: 5,
      pages: ["/ops/cases/"],
    },
    (c, p) => ({
      title: p(
        "A case page: header, tabs and changing status",
        "La page d'un dossier : en-tête, onglets et statut",
        "Urupapuro rwa dosiye: umutwe, ibice no guhindura imiterere",
      ),
      summary: p(
        "Everything about one request: client, price, SLA, status, and tabs for triage, documents, timeline, messages, billing, audit and field visits.",
        "Tout sur une demande : client, prix, SLA, statut et onglets tri, documents, historique, messages, facturation, audit et terrain.",
        "Ibyerekeye ubusabe bumwe byose: umukiriya, igiciro, SLA, imiterere, n'ibice by'isuzuma, inyandiko, amateka, ubutumwa, ubwishyu, igenzura n'ingendo.",
      ),
      keywords:
        "case detail header status change sub-status hold resume dossier statut dosiye imiterere",
      sections: [
        {
          id: "header",
          title: p("Read the header", "Lire l'en-tête", "Soma umutwe"),
          steps: [
            {
              text: p(
                `Open a case from ${B(c.nav.cases)} (double-click a row) or from a link. The header shows the reference, status, SLA chip, flags, client and price.`,
                `Ouvrez un dossier depuis ${B(c.nav.cases)} (double-clic) ou un lien. L'en-tête affiche référence, statut, SLA, indicateurs, client et prix.`,
                `Fungura dosiye uhereye kuri ${B(c.nav.cases)} (kanda kabiri) cyangwa ku ihuza. Umutwe werekana nimero, imiterere, SLA, ibimenyetso, umukiriya n'igiciro.`,
              ),
              shot: "ops-case",
              marks: p(
                [
                  "Status (E)",
                  "View as client",
                  "Assign (A)",
                  "Message client",
                  "Message",
                  "Tabs",
                ],
                [
                  "Statut (E)",
                  "Voir comme le client",
                  "Attribuer (A)",
                  "Écrire au client",
                  "Message",
                  "Onglets",
                ],
                [
                  "Imiterere (E)",
                  "Reba nk'umukiriya",
                  "Shinga (A)",
                  "Andikira umukiriya",
                  "Ubutumwa",
                  "Ibice",
                ],
              ),
            },
            {
              text: p(
                `${B(c.msg.button)} sends a one-off notification (add ${B(c.msg.email)}, ${B(c.msg.sms)} or ${B(c.msg.whatsapp)} under ${B(c.msg.channels)}). ${B(c.kase.client.message)} opens the conversation; ${B(c.kase.client.call)} dials the client.`,
                `${B(c.msg.button)} envoie une notification ponctuelle (ajoutez ${B(c.msg.email)}, ${B(c.msg.sms)} ou ${B(c.msg.whatsapp)} sous ${B(c.msg.channels)}). ${B(c.kase.client.message)} ouvre la conversation ; ${B(c.kase.client.call)} appelle le client.`,
                `${B(c.msg.button)} yohereza ubutumwa bumwe (ongeraho ${B(c.msg.email)}, ${B(c.msg.sms)} cyangwa ${B(c.msg.whatsapp)} munsi ya ${B(c.msg.channels)}). ${B(c.kase.client.message)} ifungura ikiganiro; ${B(c.kase.client.call)} ihamagara umukiriya.`,
              ),
            },
            {
              text: p(
                `If you see ${B(c.kase.claimed)}, a colleague is triaging: you can read but not change anything until they finish.`,
                `Si vous voyez ${B(c.kase.claimed)}, un collègue trie le dossier : lecture seule jusqu'à ce qu'il termine.`,
                `Nubona ${B(c.kase.claimed)}, mugenzi wawe ari kuyisuzuma: urasoma gusa kugeza arangije.`,
              ),
            },
          ],
        },
        {
          id: "status",
          title: p(
            "Change the status",
            "Changer le statut",
            "Hindura imiterere",
          ),
          steps: [
            {
              text: p(
                `Click the status chip (or press E). ${B(c.kase.status.sheet)} lists only the moves allowed from ${B(c.kase.status.current)}; greyed moves show what they wait for.`,
                `Cliquez le statut (ou E). ${B(c.kase.status.sheet)} ne liste que les passages permis depuis ${B(c.kase.status.current)} ; les grisés indiquent ce qu'ils attendent.`,
                `Kanda imiterere (cyangwa E). ${B(c.kase.status.sheet)} yerekana gusa ibyemewe uhereye kuri ${B(c.kase.status.current)}; ibisa n'ivu byerekana ibyo bitegereje.`,
              ),
              shot: "ops-case-status",
              marks: p(
                ["Allowed next", "Sub-status"],
                ["Possibles", "Sous-statut"],
                ["Ibyemewe", "Imiterere y'imbere"],
              ),
            },
            {
              text: p(
                `Optionally pick a ${B(c.kase.status.sub)} (for example ${B(c.kase.status.subs[3])}), then click the new status. Moves that need a reason open a short form; a toast offers ${B(c.kase.docs.undo)}.`,
                `Choisissez au besoin un ${B(c.kase.status.sub)} (par ex. ${B(c.kase.status.subs[3])}), puis cliquez le nouveau statut. Les passages qui demandent un motif ouvrent un formulaire ; un message propose ${B(c.kase.docs.undo)}.`,
                `Niba ubishaka hitamo ${B(c.kase.status.sub)} (urugero ${B(c.kase.status.subs[3])}), hanyuma ukande imiterere nshya. Ibikenera impamvu bifungura ifishi ngufi; ubutumwa butanga ${B(c.kase.docs.undo)}.`,
              ),
            },
            {
              text: p(
                `${B(c.com.status.awaiting_client_documents)} opens the document request; ${B(c.com.status.awaiting_quotation)} opens ${B(c.kase.quote.open)}; ${B(c.com.status.awaiting_payment)} creates an invoice; ${B(c.com.status.rejected)} asks for a reason and a message.`,
                `${B(c.com.status.awaiting_client_documents)} ouvre la demande de documents ; ${B(c.com.status.awaiting_quotation)} ouvre ${B(c.kase.quote.open)} ; ${B(c.com.status.awaiting_payment)} crée une facture ; ${B(c.com.status.rejected)} demande motif et message.`,
                `${B(c.com.status.awaiting_client_documents)} ifungura gusaba inyandiko; ${B(c.com.status.awaiting_quotation)} ifungura ${B(c.kase.quote.open)}; ${B(c.com.status.awaiting_payment)} ikora fagitire; ${B(c.com.status.rejected)} isaba impamvu n'ubutumwa.`,
              ),
            },
          ],
        },
        {
          id: "hold",
          title: p(
            "Put on hold and resume",
            "Mettre en pause et reprendre",
            "Guhagarika no gusubukura",
          ),
          steps: [
            {
              text: p(
                `Choose ${B(c.com.status.on_hold)} (or press H). Pick a reason such as ${B(c.kase.hold.reasons.thirdParty)}, set ${B(c.kase.hold.resume)}, keep ${B(c.kase.hold.notify)} ticked if the client should know, and click ${B(c.kase.hold.confirm)}.`,
                `Choisissez ${B(c.com.status.on_hold)} (ou H). Prenez un motif comme ${B(c.kase.hold.reasons.thirdParty)}, réglez ${B(c.kase.hold.resume)}, gardez ${B(c.kase.hold.notify)} coché si le client doit savoir, puis ${B(c.kase.hold.confirm)}.`,
                `Hitamo ${B(c.com.status.on_hold)} (cyangwa H). Hitamo impamvu nka ${B(c.kase.hold.reasons.thirdParty)}, shyiraho ${B(c.kase.hold.resume)}, usige ${B(c.kase.hold.notify)} niba umukiriya agomba kumenya, ukande ${B(c.kase.hold.confirm)}.`,
              ),
            },
            {
              text: p(
                `A yellow banner shows the case is on hold and the SLA is paused. Click ${B(c.kase.hold.resumeNow)} to restart it.`,
                `Une bannière jaune indique la pause et le SLA arrêté. Cliquez ${B(c.kase.hold.resumeNow)} pour reprendre.`,
                `Agasanduku k'umuhondo kerekana ko byahagaritswe na SLA yahagaze. Kanda ${B(c.kase.hold.resumeNow)} usubukure.`,
              ),
            },
          ],
          faq: [
            {
              q: p(
                "Why can't I pick a status?",
                "Pourquoi un statut est-il grisé ?",
                "Kuki imiterere imwe idakora?",
              ),
              a: c.kase.status.whyBody,
            },
          ],
        },
      ],
    }),
  ),

  g(
    {
      slug: "triage-and-documents",
      cat: "case",
      minutes: 6,
      pages: ["/ops/cases/"],
    },
    (c, p) => ({
      title: p(
        "Triage answers and review documents",
        "Trier les réponses et vérifier les documents",
        "Gusuzuma ibisubizo n'inyandiko",
      ),
      summary: p(
        "Check the client's answers against the completeness checklist, accept or reject each document, then mark the request complete or reject it.",
        "Comparez les réponses du client à la liste de complétude, acceptez ou refusez chaque document, puis marquez la demande complète ou refusez-la.",
        "Gereranya ibisubizo by'umukiriya n'urutonde rwo kuzura, wemere cyangwa wange buri nyandiko, hanyuma wemeze ko byuzuye cyangwa wange ubusabe.",
      ),
      keywords:
        "triage checklist completeness documents accept reject precheck mark complete tri complétude isuzuma",
      sections: [
        {
          id: "triage",
          title: c.kase.tabs.triage,
          steps: [
            {
              text: p(
                `On the case page, the ${B(c.kase.tabs.triage)} tab shows ${B(c.kase.triage.answers)} on the left and the ${B(c.kase.triage.checklist)} on the right. ${B(c.kase.tabs.answers)} shows the answers full width.`,
                `Sur la page du dossier, l'onglet ${B(c.kase.tabs.triage)} montre ${B(c.kase.triage.answers)} à gauche et la ${B(c.kase.triage.checklist)} à droite. ${B(c.kase.tabs.answers)} les montre en pleine largeur.`,
                `Ku rupapuro rwa dosiye, igice ${B(c.kase.tabs.triage)} cyerekana ${B(c.kase.triage.answers)} ibumoso na ${B(c.kase.triage.checklist)} iburyo. ${B(c.kase.tabs.answers)} kibyerekana ku bugari bwose.`,
              ),
              shot: "ops-case-triage",
              marks: p(
                [
                  "Checklist",
                  "Mark complete",
                  "Request missing items",
                  "Reject",
                ],
                [
                  "Liste",
                  "Marquer complet",
                  "Demander les manquants",
                  "Refuser",
                ],
                ["Urutonde", "Emeza ko byuzuye", "Saba ibibura", "Anga"],
              ),
            },
            {
              text: p(
                `Each item is ${B(c.kase.triage.states.provided)}, ${B(c.kase.triage.states.missing)}, ${B(c.kase.triage.states.check)}, ${B(c.kase.triage.states.rejected)} or ${B(c.kase.triage.states.pending)}. Click ${B(c.kase.triage.view)} to open the document, or ${B(c.kase.triage.request)} to ask for it.`,
                `Chaque élément est ${B(c.kase.triage.states.provided)}, ${B(c.kase.triage.states.missing)}, ${B(c.kase.triage.states.check)}, ${B(c.kase.triage.states.rejected)} ou ${B(c.kase.triage.states.pending)}. ${B(c.kase.triage.view)} ouvre le document, ${B(c.kase.triage.request)} le demande.`,
                `Buri kintu ni ${B(c.kase.triage.states.provided)}, ${B(c.kase.triage.states.missing)}, ${B(c.kase.triage.states.check)}, ${B(c.kase.triage.states.rejected)} cyangwa ${B(c.kase.triage.states.pending)}. ${B(c.kase.triage.view)} ifungura inyandiko, ${B(c.kase.triage.request)} irayisaba.`,
              ),
            },
            {
              text: p(
                `When everything is accepted, click ${B(c.kase.triage.markComplete)}. If items are missing, use ${B(c.kase.triage.requestMissing)} (next guide). ${B(c.kase.triage.reject)} opens the rejection form.`,
                `Quand tout est accepté, cliquez ${B(c.kase.triage.markComplete)}. S'il manque des éléments, utilisez ${B(c.kase.triage.requestMissing)} (guide suivant). ${B(c.kase.triage.reject)} ouvre le formulaire de refus.`,
                `Byose nibimara kwemerwa, kanda ${B(c.kase.triage.markComplete)}. Niba hari ibibura, koresha ${B(c.kase.triage.requestMissing)} (amabwiriza akurikira). ${B(c.kase.triage.reject)} ifungura ifishi yo kwanga.`,
              ),
            },
          ],
          faq: [
            {
              q: p(
                `${c.kase.triage.markComplete} is greyed out.`,
                `${c.kase.triage.markComplete} est grisé.`,
                `${c.kase.triage.markComplete} ntikora.`,
              ),
              a: p(
                `${c.kase.triage.blockers.hasMissing}. ${c.kase.triage.blockers.needsCheck}.`,
                `${c.kase.triage.blockers.hasMissing}. ${c.kase.triage.blockers.needsCheck}.`,
                `${c.kase.triage.blockers.hasMissing}. ${c.kase.triage.blockers.needsCheck}.`,
              ),
            },
          ],
        },
        {
          id: "docs",
          title: c.kase.tabs.documents,
          steps: [
            {
              text: p(
                `Open the ${B(c.kase.tabs.documents)} tab. Pick a file in the left rail; use ${B(c.kase.docs.zoomIn)}, ${B(c.kase.docs.rotate)} and ${B(c.kase.docs.reset)} to read it.`,
                `Ouvrez l'onglet ${B(c.kase.tabs.documents)}. Choisissez un fichier à gauche ; utilisez ${B(c.kase.docs.zoomIn)}, ${B(c.kase.docs.rotate)} et ${B(c.kase.docs.reset)} pour le lire.`,
                `Fungura igice ${B(c.kase.tabs.documents)}. Hitamo dosiye ibumoso; koresha ${B(c.kase.docs.zoomIn)}, ${B(c.kase.docs.rotate)} na ${B(c.kase.docs.reset)} uyisome.`,
              ),
              shot: "ops-case-docs",
              marks: p(
                ["Documents", "Zoom", "Pre-check", "Accept", "Reject"],
                ["Documents", "Zoom", "Pré-contrôle", "Accepter", "Refuser"],
                [
                  "Inyandiko",
                  "Kwegereza",
                  "Isuzuma ry'ibanze",
                  "Emera",
                  "Anga",
                ],
              ),
            },
            {
              text: p(
                `Read the ${B(c.kase.docs.precheck)} panel: legibility, expiry, name match and detected type. Use J/K to move between documents.`,
                `Lisez le ${B(c.kase.docs.precheck)} : lisibilité, expiration, correspondance du nom et type détecté. J/K pour passer d'un document à l'autre.`,
                `Soma ${B(c.kase.docs.precheck)}: gusomeka, igihe izarangirira, guhura kw'amazina n'ubwoko bwabonetse. Koresha J/K ujya ku yindi.`,
              ),
            },
            {
              text: p(
                `Click ${B(c.kase.docs.accept)}, or ${B(c.kase.docs.reject)}, choose a reason (${B(c.kase.docs.rejectReasons.blurry)}, ${B(c.kase.docs.rejectReasons.expired)}…) and write a ${B(c.kase.docs.noteToClient)}. ${B(c.kase.docs.undo)} reverses it.`,
                `Cliquez ${B(c.kase.docs.accept)}, ou ${B(c.kase.docs.reject)}, choisissez un motif (${B(c.kase.docs.rejectReasons.blurry)}, ${B(c.kase.docs.rejectReasons.expired)}…) et une ${B(c.kase.docs.noteToClient)}. ${B(c.kase.docs.undo)} annule.`,
                `Kanda ${B(c.kase.docs.accept)}, cyangwa ${B(c.kase.docs.reject)}, uhitemo impamvu (${B(c.kase.docs.rejectReasons.blurry)}, ${B(c.kase.docs.rejectReasons.expired)}…) wandike ${B(c.kase.docs.noteToClient)}. ${B(c.kase.docs.undo)} birasubizwa.`,
              ),
            },
            {
              text: p(
                `When the client re-uploads, a banner ${B(c.kase.triage.reviewNow)} appears at the top of the case: click it to check the new files.`,
                `Quand le client renvoie des fichiers, une bannière ${B(c.kase.triage.reviewNow)} apparaît en haut : cliquez pour les vérifier.`,
                `Umukiriya nasubizamo inyandiko, agasanduku ${B(c.kase.triage.reviewNow)} kagaragara hejuru: kanda urebe inshya.`,
              ),
            },
          ],
        },
      ],
    }),
  ),

  g(
    {
      slug: "request-missing-documents",
      cat: "case",
      minutes: 3,
      pages: ["/ops/cases/"],
    },
    (c, p) => ({
      title: p(
        "Request missing documents from the client",
        "Demander les documents manquants au client",
        "Gusaba umukiriya inyandiko zibura",
      ),
      summary: p(
        "Send the client a list of what is missing with a due date. The SLA pauses while you wait and reminders go out automatically.",
        "Envoyez au client la liste de ce qui manque avec une échéance. Le SLA est en pause pendant l'attente et des rappels partent automatiquement.",
        "Oherereza umukiriya urutonde rw'ibibura n'itariki ntarengwa. SLA irahagarara mu gihe utegereje kandi ibyibutsa byoherezwa byikora.",
      ),
      keywords:
        "missing documents request client reminder sms whatsapp documents manquants inyandiko zibura",
      sections: [
        {
          id: "send",
          title: p("Send the request", "Envoyer la demande", "Ohereza ubusabe"),
          steps: [
            {
              text: p(
                `In ${B(c.kase.tabs.triage)}, click ${B(c.kase.triage.requestMissing)} (or move the status to ${B(c.com.status.awaiting_client_documents)}).`,
                `Dans ${B(c.kase.tabs.triage)}, cliquez ${B(c.kase.triage.requestMissing)} (ou passez le statut à ${B(c.com.status.awaiting_client_documents)}).`,
                `Muri ${B(c.kase.tabs.triage)}, kanda ${B(c.kase.triage.requestMissing)} (cyangwa uhindure imiterere ujye kuri ${B(c.com.status.awaiting_client_documents)}).`,
              ),
              shot: "ops-case-request",
              marks: p(
                ["Request form"],
                ["Formulaire de demande"],
                ["Ifishi yo gusaba"],
              ),
            },
            {
              text: p(
                `Under ${B(c.kase.request.items)}, the missing items are already ticked; add a note for each (for example what to upload instead).`,
                `Sous ${B(c.kase.request.items)}, les éléments manquants sont déjà cochés ; ajoutez une note pour chacun.`,
                `Munsi ya ${B(c.kase.request.items)}, ibibura biba byatoranyijwe; ongeraho icyitonderwa kuri buri kimwe.`,
              ),
            },
            {
              text: p(
                `Set the ${B(c.kase.request.due)}, tick one or more ${B(c.kase.request.channels)} (${B(c.kase.request.channel.sms)}, ${B(c.kase.request.channel.whatsapp)}, ${B(c.kase.request.channel.inapp)}) and check the ${B(c.kase.request.preview)}.`,
                `Réglez la ${B(c.kase.request.due)}, cochez un ou plusieurs ${B(c.kase.request.channels)} (${B(c.kase.request.channel.sms)}, ${B(c.kase.request.channel.whatsapp)}, ${B(c.kase.request.channel.inapp)}) et vérifiez l'${B(c.kase.request.preview)}.`,
                `Shyiraho ${B(c.kase.request.due)}, uhitemo ${B(c.kase.request.channels)} (${B(c.kase.request.channel.sms)}, ${B(c.kase.request.channel.whatsapp)}, ${B(c.kase.request.channel.inapp)}) urebe ${B(c.kase.request.preview)}.`,
              ),
            },
            {
              text: p(
                `Click ${B(c.kase.request.send)}. A card shows ${B(c.kase.after.paused)} with the ${B(c.kase.after.reminders)}.`,
                `Cliquez ${B(c.kase.request.send)}. Une carte affiche ${B(c.kase.after.paused)} avec le ${B(c.kase.after.reminders)}.`,
                `Kanda ${B(c.kase.request.send)}. Ikarita yerekana ${B(c.kase.after.paused)} na ${B(c.kase.after.reminders)}.`,
              ),
            },
          ],
          tips: [c.kase.request.slaPause],
        },
      ],
    }),
  ),

  g(
    {
      slug: "case-record-tabs",
      cat: "case",
      minutes: 4,
      pages: ["/ops/cases/"],
    },
    (c, p) => ({
      title: p(
        "Timeline, notes, messages, billing, audit and field",
        "Historique, notes, messages, facturation, audit et terrain",
        "Amateka, ibyitonderwa, ubutumwa, ubwishyu, igenzura n'ingendo",
      ),
      summary: p(
        "The case history and internal notes, the client conversation, payments and quotation, the audit log and field visits.",
        "L'historique et les notes internes, la conversation avec le client, paiements et devis, le journal d'audit et les visites terrain.",
        "Amateka ya dosiye n'ibyitonderwa by'imbere, ikiganiro n'umukiriya, ubwishyu n'igiciro, igitabo cy'igenzura n'ingendo.",
      ),
      keywords:
        "timeline note mention messages billing payment quotation audit field historique note facturation amateka",
      sections: [
        {
          id: "timeline",
          title: c.kase.tabs.timeline,
          steps: [
            {
              text: p(
                `Open ${B(c.kase.tabs.timeline)}. Filter by ${B(c.kase.timeline.filters.status)}, ${B(c.kase.timeline.filters.document)}, ${B(c.kase.timeline.filters.message)}, ${B(c.kase.timeline.filters.assignment)}, ${B(c.kase.timeline.filters.payment)} or ${B(c.kase.timeline.filters.note)}.`,
                `Ouvrez ${B(c.kase.tabs.timeline)}. Filtrez par ${B(c.kase.timeline.filters.status)}, ${B(c.kase.timeline.filters.document)}, ${B(c.kase.timeline.filters.message)}, ${B(c.kase.timeline.filters.assignment)}, ${B(c.kase.timeline.filters.payment)} ou ${B(c.kase.timeline.filters.note)}.`,
                `Fungura ${B(c.kase.tabs.timeline)}. Yungurura ukurikije ${B(c.kase.timeline.filters.status)}, ${B(c.kase.timeline.filters.document)}, ${B(c.kase.timeline.filters.message)}, ${B(c.kase.timeline.filters.assignment)}, ${B(c.kase.timeline.filters.payment)} cyangwa ${B(c.kase.timeline.filters.note)}.`,
              ),
              shot: "ops-case-timeline",
              marks: p(
                ["Filters", "Internal note", "Add note"],
                ["Filtres", "Note interne", "Ajouter"],
                ["Iyungurura", "Icyitonderwa", "Ongeraho"],
              ),
            },
            {
              text: p(
                `Write an ${B(c.kase.timeline.composer)} (type @ to mention a colleague) and click ${B(c.kase.timeline.post)}. Clients never see internal notes. Shortcut: N.`,
                `Écrivez une ${B(c.kase.timeline.composer)} (tapez @ pour mentionner un collègue) puis ${B(c.kase.timeline.post)}. Le client ne voit jamais les notes internes. Raccourci : N.`,
                `Andika ${B(c.kase.timeline.composer)} (andika @ uvuge mugenzi wawe) ukande ${B(c.kase.timeline.post)}. Umukiriya ntabona ibyitonderwa by'imbere. Akabuto: N.`,
              ),
            },
          ],
        },
        {
          id: "messages",
          title: c.kase.tabs.messages,
          steps: [
            {
              text: p(
                `${B(c.kase.tabs.messages)} shows the conversation with the client, read-only. Click ${B(c.kase.messages.open)} to reply.`,
                `${B(c.kase.tabs.messages)} montre la conversation avec le client, en lecture seule. Cliquez ${B(c.kase.messages.open)} pour répondre.`,
                `${B(c.kase.tabs.messages)} herekana ikiganiro n'umukiriya, gusoma gusa. Kanda ${B(c.kase.messages.open)} usubize.`,
              ),
              shot: "ops-case-messages",
              marks: p(["Messages"], ["Messages"], ["Ubutumwa"]),
            },
          ],
        },
        {
          id: "billing",
          title: c.kase.tabs.billing,
          steps: [
            {
              text: p(
                `${B(c.kase.tabs.billing)} shows the ${B(c.kase.billing.price)}, ${B(c.kase.billing.payments)} and the ${B(c.kase.billing.quote)}.`,
                `${B(c.kase.tabs.billing)} affiche le ${B(c.kase.billing.price)}, les ${B(c.kase.billing.payments)} et le ${B(c.kase.billing.quote)}.`,
                `${B(c.kase.tabs.billing)} herekana ${B(c.kase.billing.price)}, ${B(c.kase.billing.payments)} na ${B(c.kase.billing.quote)}.`,
              ),
              shot: "ops-case-billing",
              marks: p(["Billing"], ["Facturation"], ["Ubwishyu"]),
            },
            {
              text: p(
                `For services priced by quote, move the status to ${B(c.com.status.awaiting_quotation)}: ${B(c.kase.quote.open)} opens. Add lines ${B(c.kase.quote.priceList)} or a ${B(c.kase.quote.custom)}, set ${B(c.kase.quote.discount)} (a reason is required), ${B(c.kase.quote.validity)}, check the ${B(c.kase.quote.preview)} and click ${B(c.kase.quote.send)}.`,
                `Pour les services sur devis, passez le statut à ${B(c.com.status.awaiting_quotation)} : ${B(c.kase.quote.open)} s'ouvre. Ajoutez des lignes ${B(c.kase.quote.priceList)} ou une ${B(c.kase.quote.custom)}, une ${B(c.kase.quote.discount)} (motif obligatoire), ${B(c.kase.quote.validity)}, vérifiez l'${B(c.kase.quote.preview)} et cliquez ${B(c.kase.quote.send)}.`,
                `Ku serivisi zishyurwa ku giciro cyumvikanyweho, hindura imiterere ujye kuri ${B(c.com.status.awaiting_quotation)}: ${B(c.kase.quote.open)} irafunguka. Ongeraho imirongo ${B(c.kase.quote.priceList)} cyangwa ${B(c.kase.quote.custom)}, ${B(c.kase.quote.discount)} (impamvu irakenewe), ${B(c.kase.quote.validity)}, urebe ${B(c.kase.quote.preview)} ukande ${B(c.kase.quote.send)}.`,
              ),
            },
          ],
        },
        {
          id: "audit",
          title: c.kase.tabs.audit,
          steps: [
            {
              text: p(
                `${B(c.kase.tabs.audit)} lists every recorded action: ${B(c.kase.audit.who)}, ${B(c.kase.audit.what)}, ${B(c.kase.audit.change)}, ${B(c.kase.audit.ip)} and ${B(c.kase.audit.when)}.`,
                `${B(c.kase.tabs.audit)} liste chaque action enregistrée : ${B(c.kase.audit.who)}, ${B(c.kase.audit.what)}, ${B(c.kase.audit.change)}, ${B(c.kase.audit.ip)} et ${B(c.kase.audit.when)}.`,
                `${B(c.kase.tabs.audit)} herekana buri gikorwa cyanditswe: ${B(c.kase.audit.who)}, ${B(c.kase.audit.what)}, ${B(c.kase.audit.change)}, ${B(c.kase.audit.ip)} na ${B(c.kase.audit.when)}.`,
              ),
              shot: "ops-case-audit",
              marks: p(
                ["Audit log"],
                ["Journal d'audit"],
                ["Igitabo cy'igenzura"],
              ),
            },
          ],
        },
        {
          id: "field",
          title: c.fld.tabTitle,
          steps: [
            {
              text: p(
                `The ${B(c.fld.tabs.visits)} tab of the case (${B(c.fld.tabTitle)}) shows each field visit with its evidence: check-in, photos, scans, receipts and custody.`,
                `L'onglet terrain du dossier (${B(c.fld.tabTitle)}) montre chaque visite et ses preuves : arrivée, photos, scans, reçus et garde.`,
                `Igice cy'ingendo cya dosiye (${B(c.fld.tabTitle)}) cyerekana buri rugendo n'ibimenyetso byarwo: kugera, amafoto, scan, inyemezabwishyu no kurinda.`,
              ),
              shot: "ops-case-field",
              marks: p(["Field visits"], ["Visites terrain"], ["Ingendo"]),
            },
          ],
        },
      ],
    }),
  ),

  g(
    {
      slug: "reject-view-as-and-complete",
      cat: "case",
      minutes: 5,
      pages: ["/ops/cases/", "/ops/reviews"],
    },
    (c, p) => ({
      title: p(
        "Reject, view as the client, and close a case",
        "Refuser, voir comme le client et clôturer",
        "Kwanga, kureba nk'umukiriya no gusoza dosiye",
      ),
      summary: p(
        "Reject a request with a clear message, check exactly what the client sees, follow an institution's decision and deliver the result.",
        "Refusez une demande avec un message clair, voyez exactement ce que voit le client, suivez la décision de l'institution et livrez le résultat.",
        "Anga ubusabe ufite ubutumwa busobanutse, urebe neza ibyo umukiriya abona, ukurikirane icyemezo cy'ikigo kandi utange igisubizo.",
      ),
      keywords:
        "reject refund view as client impersonate institution decision deliverable complete refuser livrable kwanga gusoza",
      sections: [
        {
          id: "reject",
          title: c.kase.reject.title,
          steps: [
            {
              text: p(
                `Click ${B(c.kase.triage.reject)} in ${B(c.kase.tabs.triage)} (or choose ${B(c.com.status.rejected)} in the status list).`,
                `Cliquez ${B(c.kase.triage.reject)} dans ${B(c.kase.tabs.triage)} (ou choisissez ${B(c.com.status.rejected)} dans la liste des statuts).`,
                `Kanda ${B(c.kase.triage.reject)} muri ${B(c.kase.tabs.triage)} (cyangwa uhitemo ${B(c.com.status.rejected)} mu miterere).`,
              ),
            },
            {
              text: p(
                `Pick a reason (${B(c.kase.reject.reasons.outOfScope)}, ${B(c.kase.reject.reasons.ineligible)}…), edit the ${B(c.kase.reject.message)}, optionally tick ${B(c.kase.reject.consult)}, then click ${B(c.kase.reject.confirm)}.`,
                `Choisissez un motif (${B(c.kase.reject.reasons.outOfScope)}, ${B(c.kase.reject.reasons.ineligible)}…), modifiez le ${B(c.kase.reject.message)}, cochez au besoin ${B(c.kase.reject.consult)}, puis ${B(c.kase.reject.confirm)}.`,
                `Hitamo impamvu (${B(c.kase.reject.reasons.outOfScope)}, ${B(c.kase.reject.reasons.ineligible)}…), uhindure ${B(c.kase.reject.message)}, niba ubishaka uhitemo ${B(c.kase.reject.consult)}, ukande ${B(c.kase.reject.confirm)}.`,
              ),
            },
          ],
          warn: p(
            "Rejection is final for the client. If they already paid, a refund request is created for Finance automatically.",
            "Le refus est définitif pour le client. S'il a déjà payé, une demande de remboursement est créée pour la Finance.",
            "Kwanga ni ibya burundu ku mukiriya. Niba yarishyuye, ubusabe bwo gusubizwa amafaranga bukorwa byikora bujya ku Mari.",
          ),
        },
        {
          id: "viewas",
          title: c.kase.viewAs.button,
          steps: [
            {
              text: p(
                `Click ${B(c.kase.viewAs.button)} in the header, choose why (for example ${B(c.kase.viewAs.reasons.support)}) and confirm.`,
                `Cliquez ${B(c.kase.viewAs.button)} dans l'en-tête, choisissez la raison (par ex. ${B(c.kase.viewAs.reasons.support)}) et confirmez.`,
                `Kanda ${B(c.kase.viewAs.button)} mu mutwe, uhitemo impamvu (urugero ${B(c.kase.viewAs.reasons.support)}) wemeze.`,
              ),
              shot: "ops-case-viewas",
              marks: p(
                ["Why are you opening it?"],
                ["Pourquoi l'ouvrir ?"],
                ["Kuki uyifunguye?"],
              ),
            },
            {
              text: p(
                `A dark banner shows you are viewing read-only as the client. Click ${B(c.kase.viewAs.exit)} to come back. The visit is recorded in ${B(c.kase.tabs.audit)}.`,
                `Une bannière sombre indique la vue client en lecture seule. Cliquez ${B(c.kase.viewAs.exit)} pour revenir. La visite est inscrite dans ${B(c.kase.tabs.audit)}.`,
                `Agasanduku kijimye kerekana ko ureba nk'umukiriya (gusoma gusa). Kanda ${B(c.kase.viewAs.exit)} ugaruke. Byandikwa muri ${B(c.kase.tabs.audit)}.`,
              ),
            },
          ],
        },
        {
          id: "close",
          title: p(
            "Institution decision and delivery",
            "Décision de l'institution et livraison",
            "Icyemezo cy'ikigo no gutanga",
          ),
          steps: [
            {
              text: p(
                `When the file is lodged, move the case to ${B(c.com.status.awaiting_external_institution)} and pick a ${B(c.kase.status.sub)} such as ${B(c.kase.status.subs[3])}. The SLA pauses.`,
                `Une fois le dossier déposé, passez-le à ${B(c.com.status.awaiting_external_institution)} et choisissez un ${B(c.kase.status.sub)} comme ${B(c.kase.status.subs[3])}. Le SLA s'arrête.`,
                `Dosiye imaze gutangwa, yishyire kuri ${B(c.com.status.awaiting_external_institution)} uhitemo ${B(c.kase.status.sub)} nka ${B(c.kase.status.subs[3])}. SLA irahagarara.`,
              ),
            },
            {
              text: p(
                `Follow these cases in ${B(c.nav.cases)} → ${B(c.cases.views.institution)} and use ${B(c.cases.nudgeAgent)} when a decision is late. Record what the institution said as an internal note in ${B(c.kase.tabs.timeline)}.`,
                `Suivez-les dans ${B(c.nav.cases)} → ${B(c.cases.views.institution)} et utilisez ${B(c.cases.nudgeAgent)} quand une décision tarde. Notez la réponse de l'institution en note interne dans ${B(c.kase.tabs.timeline)}.`,
                `Zikurikirane muri ${B(c.nav.cases)} → ${B(c.cases.views.institution)} ukoreshe ${B(c.cases.nudgeAgent)} igihe icyemezo gitinze. Andika icyo ikigo cyavuze nk'icyitonderwa cy'imbere muri ${B(c.kase.tabs.timeline)}.`,
              ),
            },
            {
              text: p(
                `The agent uploads the result as a deliverable; it reaches you in ${B(c.nav.reviews)}. ${B(c.rev.approve)} there delivers it to the client and closes the case as ${B(c.com.status.completed_delivered)}.`,
                `L'agent dépose le résultat comme livrable ; il vous arrive dans ${B(c.nav.reviews)}. ${B(c.rev.approve)} le livre au client et clôture le dossier en ${B(c.com.status.completed_delivered)}.`,
                `Umukozi ashyiraho igisubizo nk'igikorwa; kikugeraho muri ${B(c.nav.reviews)}. ${B(c.rev.approve)} kigaha umukiriya kandi gifunga dosiye nka ${B(c.com.status.completed_delivered)}.`,
              ),
            },
          ],
          faq: [
            {
              q: p(
                `${c.com.status.completed_delivered} is locked.`,
                `${c.com.status.completed_delivered} est bloqué.`,
                `${c.com.status.completed_delivered} irafunze.`,
              ),
              a: p(
                `${c.com.guard.noDeliverable}. ${c.com.guard.unpaid} may also block it.`,
                `${c.com.guard.noDeliverable}. ${c.com.guard.unpaid} peut aussi bloquer.`,
                `${c.com.guard.noDeliverable}. ${c.com.guard.unpaid} nabyo bishobora kubibuza.`,
              ),
            },
          ],
        },
      ],
    }),
  ),

  // ------------------------------------------------------------------ team
  g(
    { slug: "assign-a-case", cat: "team", minutes: 5, pages: ["/ops/assign/"] },
    (c, p) => ({
      title: p(
        "Assign a case to an agent",
        "Attribuer un dossier à un agent",
        "Guha dosiye umukozi",
      ),
      summary: p(
        "Pick from ranked suggestions (or the external pool), add helpers if needed, and assign.",
        "Choisissez parmi les suggestions classées (ou le vivier externe), ajoutez des aides si besoin, puis attribuez.",
        "Hitamo mu bakozi batanzwe bakurikiranye (cyangwa abo hanze), wongereho abafasha niba bikenewe, hanyuma ushinge.",
      ),
      keywords:
        "assign suggestion external helper co-assignment override attribuer agent shinga umukozi",
      sections: [
        {
          id: "pick",
          title: c.assign.steps.suggest,
          steps: [
            {
              text: p(
                `On the case page click ${B(c.kase.assign)} (or press A). Five steps run across the top: ${B(c.assign.steps.suggest)}, ${B(c.assign.steps.brief)}, ${B(c.assign.steps.scope)}, ${B(c.assign.steps.offer)}, ${B(c.assign.steps.rules)}.`,
                `Sur la page du dossier, cliquez ${B(c.kase.assign)} (ou A). Cinq étapes en haut : ${B(c.assign.steps.suggest)}, ${B(c.assign.steps.brief)}, ${B(c.assign.steps.scope)}, ${B(c.assign.steps.offer)}, ${B(c.assign.steps.rules)}.`,
                `Ku rupapuro rwa dosiye kanda ${B(c.kase.assign)} (cyangwa A). Intambwe eshanu hejuru: ${B(c.assign.steps.suggest)}, ${B(c.assign.steps.brief)}, ${B(c.assign.steps.scope)}, ${B(c.assign.steps.offer)}, ${B(c.assign.steps.rules)}.`,
              ),
              shot: "ops-assign",
              marks: p(
                [
                  "Steps",
                  "External pool",
                  "Why this order?",
                  "Suggestions",
                  "Assign",
                ],
                [
                  "Étapes",
                  "Vivier externe",
                  "Pourquoi cet ordre ?",
                  "Suggestions",
                  "Attribuer",
                ],
                [
                  "Intambwe",
                  "Abo hanze",
                  "Kuki uru rutonde?",
                  "Abatanzwe",
                  "Shinga",
                ],
              ),
            },
            {
              text: p(
                `Read ${B(c.assign.suggested)}: each card shows skill, load, on-time rate, rating and language. ${B(c.assign.why)} explains the score. Change ${B(c.assign.sort.label)} to ${B(c.assign.sort.load)} or ${B(c.assign.sort.rating)} if needed.`,
                `Lisez ${B(c.assign.suggested)} : chaque carte montre compétence, charge, ponctualité, note et langue. ${B(c.assign.why)} explique le score. Changez ${B(c.assign.sort.label)} en ${B(c.assign.sort.load)} ou ${B(c.assign.sort.rating)} au besoin.`,
                `Soma ${B(c.assign.suggested)}: buri karita yerekana ubumenyi, akazi afite, kubahiriza igihe, amanota n'ururimi. ${B(c.assign.why)} isobanura amanota. Hindura ${B(c.assign.sort.label)} ujye kuri ${B(c.assign.sort.load)} cyangwa ${B(c.assign.sort.rating)} niba bikenewe.`,
              ),
            },
            {
              text: p(
                `Turn on ${B(c.assign.includeExternal)} for external agents (enter the ${B(c.assign.external.price)}), or ${B(c.assign.showIneligible)} to see who is blocked and why.`,
                `Activez ${B(c.assign.includeExternal)} pour les agents externes (saisissez le ${B(c.assign.external.price)}), ou ${B(c.assign.showIneligible)} pour voir qui est bloqué et pourquoi.`,
                `Fungura ${B(c.assign.includeExternal)} ku bakozi bo hanze (andika ${B(c.assign.external.price)}), cyangwa ${B(c.assign.showIneligible)} urebe abatemerewe n'impamvu.`,
              ),
            },
            {
              text: p(
                `Click a card (or press 1–5). Optionally choose a ${B(c.assign.reviewer)} and use ${B(c.assign.co.toggle)} to split the work (shares must total 100%). Click ${B(c.assign.assignTo)}.`,
                `Cliquez une carte (ou 1–5). Choisissez au besoin un ${B(c.assign.reviewer)} et utilisez ${B(c.assign.co.toggle)} pour partager le travail (total 100 %). Cliquez ${B(c.assign.assignTo)}.`,
                `Kanda ikarita (cyangwa 1–5). Niba ubishaka hitamo ${B(c.assign.reviewer)} ukoreshe ${B(c.assign.co.toggle)} mugabane akazi (byose hamwe 100%). Kanda ${B(c.assign.assignTo)}.`,
              ),
            },
          ],
          faq: [
            {
              q: c.assign.nobody.title,
              a: p(
                `Use ${B(c.assign.nobody.searchExternal)}, ${B(c.assign.nobody.override)} (your reason is recorded) or ${B(c.assign.nobody.hold)}.`,
                `Utilisez ${B(c.assign.nobody.searchExternal)}, ${B(c.assign.nobody.override)} (votre motif est enregistré) ou ${B(c.assign.nobody.hold)}.`,
                `Koresha ${B(c.assign.nobody.searchExternal)}, ${B(c.assign.nobody.override)} (impamvu yawe irandikwa) cyangwa ${B(c.assign.nobody.hold)}.`,
              ),
            },
          ],
        },
      ],
    }),
  ),

  g(
    {
      slug: "brief-sharing-offer-rules",
      cat: "team",
      minutes: 6,
      pages: ["/ops/assign/"],
    },
    (c, p) => ({
      title: p(
        "Brief, sharing, offer and auto-assign rules",
        "Consignes, partage, offre et règles automatiques",
        "Amabwiriza, gusangiza, icyifuzo n'amategeko yo gushinga byikora",
      ),
      summary: p(
        "Tell the agent what to do, choose what they can see, follow the offer until accepted, and set how new requests are assigned.",
        "Dites à l'agent quoi faire, choisissez ce qu'il voit, suivez l'offre jusqu'à l'acceptation et réglez l'attribution des nouvelles demandes.",
        "Bwira umukozi icyo gukora, uhitemo ibyo abona, ukurikirane icyifuzo kugeza acyemeye, kandi ushyireho uko ubusabe bushya bushingwa.",
      ),
      keywords:
        "brief offer timeout decline reassign sharing matrix rules round robin consignes offre amabwiriza",
      sections: [
        {
          id: "brief",
          title: c.assign.steps.brief,
          steps: [
            {
              text: p(
                `Open step ${B(c.assign.steps.brief)}. Pick a ${B(c.assign.brief.template)}, write ${B(c.assign.brief.instructions)} and the ${B(c.assign.brief.steps)}.`,
                `Ouvrez l'étape ${B(c.assign.steps.brief)}. Choisissez un ${B(c.assign.brief.template)}, écrivez les ${B(c.assign.brief.instructions)} et les ${B(c.assign.brief.steps)}.`,
                `Fungura intambwe ${B(c.assign.steps.brief)}. Hitamo ${B(c.assign.brief.template)}, wandike ${B(c.assign.brief.instructions)} na ${B(c.assign.brief.steps)}.`,
              ),
              shot: "ops-assign-brief",
              marks: p(
                ["Template", "Deadline", "Send offer"],
                ["Modèle", "Échéance", "Envoyer l'offre"],
                ["Inyandikorugero", "Itariki", "Ohereza"],
              ),
            },
            {
              text: p(
                `Set the ${B(c.assign.brief.deadline)} (before the client deadline), the ${B(c.assign.brief.priority)}, the ${B(c.assign.brief.deliverables)} and any ${B(c.assign.brief.attachments)}, then click ${B(c.assign.brief.send)}.`,
                `Réglez l'${B(c.assign.brief.deadline)} (avant celle du client), la ${B(c.assign.brief.priority)}, les ${B(c.assign.brief.deliverables)} et les ${B(c.assign.brief.attachments)}, puis ${B(c.assign.brief.send)}.`,
                `Shyiraho ${B(c.assign.brief.deadline)} (mbere y'iy'umukiriya), ${B(c.assign.brief.priority)}, ${B(c.assign.brief.deliverables)} na ${B(c.assign.brief.attachments)}, ukande ${B(c.assign.brief.send)}.`,
              ),
            },
          ],
        },
        {
          id: "scope",
          title: c.assign.steps.scope,
          steps: [
            {
              text: p(
                `In ${B(c.assign.steps.scope)}, tick what the ${B(c.assign.scope.cols.lead)}, ${B(c.assign.scope.cols.helper)} and ${B(c.assign.scope.cols.external)} may see, then ${B(c.assign.scope.save)}.`,
                `Dans ${B(c.assign.steps.scope)}, cochez ce que ${B(c.assign.scope.cols.lead)}, ${B(c.assign.scope.cols.helper)} et ${B(c.assign.scope.cols.external)} peuvent voir, puis ${B(c.assign.scope.save)}.`,
                `Muri ${B(c.assign.steps.scope)}, hitamo ibyo ${B(c.assign.scope.cols.lead)}, ${B(c.assign.scope.cols.helper)} na ${B(c.assign.scope.cols.external)} bemerewe kubona, ukande ${B(c.assign.scope.save)}.`,
              ),
              shot: "ops-assign-scope",
              marks: p(
                ["Sharing matrix", "Save sharing"],
                ["Matrice de partage", "Enregistrer"],
                ["Imbonerahamwe", "Bika"],
              ),
            },
          ],
          tips: [c.assign.external.notice],
        },
        {
          id: "offer",
          title: c.assign.steps.offer,
          steps: [
            {
              text: p(
                `${B(c.assign.offer.title)} shows a countdown. It ends as ${B(c.com.offer.accepted)}, ${B(c.com.offer.declined)} or ${B(c.com.offer.timeout)}.`,
                `${B(c.assign.offer.title)} affiche un compte à rebours. Il finit en ${B(c.com.offer.accepted)}, ${B(c.com.offer.declined)} ou ${B(c.com.offer.timeout)}.`,
                `${B(c.assign.offer.title)} herekana igihe gisigaye. Birangira ari ${B(c.com.offer.accepted)}, ${B(c.com.offer.declined)} cyangwa ${B(c.com.offer.timeout)}.`,
              ),
              shot: "ops-assign-offer",
              marks: p(["Reassign"], ["Réattribuer"], ["Shaka undi"]),
            },
            {
              text: p(
                `If declined, use ${B(c.assign.offer.next)}. To move an accepted case, click ${B(c.assign.offer.reassign)}: choose ${B(c.assign.reassign.to)}, a ${B(c.assign.reassign.reason)}, a ${B(c.assign.reassign.handoff)}, and decide on ${B(c.assign.reassign.revoke)} and ${B(c.assign.reassign.notify)}.`,
                `En cas de refus, utilisez ${B(c.assign.offer.next)}. Pour déplacer un dossier accepté, cliquez ${B(c.assign.offer.reassign)} : choisissez ${B(c.assign.reassign.to)}, un ${B(c.assign.reassign.reason)}, une ${B(c.assign.reassign.handoff)}, et décidez de ${B(c.assign.reassign.revoke)} et ${B(c.assign.reassign.notify)}.`,
                `Niba yanze, koresha ${B(c.assign.offer.next)}. Kwimura dosiye yemewe, kanda ${B(c.assign.offer.reassign)}: hitamo ${B(c.assign.reassign.to)}, ${B(c.assign.reassign.reason)}, ${B(c.assign.reassign.handoff)}, wemeze ${B(c.assign.reassign.revoke)} na ${B(c.assign.reassign.notify)}.`,
              ),
            },
            {
              text: p(
                `A ${B(c.assign.offer.counter)} appears when the agent proposes a new date: ${B(c.assign.offer.counterAccept)} or ${B(c.assign.offer.counterDecline)}.`,
                `Une ${B(c.assign.offer.counter)} apparaît quand l'agent propose une date : ${B(c.assign.offer.counterAccept)} ou ${B(c.assign.offer.counterDecline)}.`,
                `${B(c.assign.offer.counter)} igaragara iyo umukozi atanze itariki nshya: ${B(c.assign.offer.counterAccept)} cyangwa ${B(c.assign.offer.counterDecline)}.`,
              ),
            },
          ],
        },
        {
          id: "rules",
          title: c.assign.steps.rules,
          steps: [
            {
              text: p(
                `In ${B(c.assign.steps.rules)}, choose the ${B(c.assign.rules.mode)} (${B(c.assign.rules.modes.roundRobin)}, ${B(c.assign.rules.modes.leastLoaded)}, ${B(c.assign.rules.modes.skill)}), the ${B(c.assign.rules.pool)}, the ${B(c.assign.rules.cap)} and the ${B(c.assign.rules.assignMode)}.`,
                `Dans ${B(c.assign.steps.rules)}, choisissez le ${B(c.assign.rules.mode)} (${B(c.assign.rules.modes.roundRobin)}, ${B(c.assign.rules.modes.leastLoaded)}, ${B(c.assign.rules.modes.skill)}), le ${B(c.assign.rules.pool)}, le ${B(c.assign.rules.cap)} et l'${B(c.assign.rules.assignMode)}.`,
                `Muri ${B(c.assign.steps.rules)}, hitamo ${B(c.assign.rules.mode)} (${B(c.assign.rules.modes.roundRobin)}, ${B(c.assign.rules.modes.leastLoaded)}, ${B(c.assign.rules.modes.skill)}), ${B(c.assign.rules.pool)}, ${B(c.assign.rules.cap)} na ${B(c.assign.rules.assignMode)}.`,
              ),
              shot: "ops-assign-rules",
              marks: p(
                ["Mode", "Save rules"],
                ["Mode", "Enregistrer"],
                ["Uburyo", "Bika"],
              ),
            },
            {
              text: p(
                `Check the preview of who the next 3 requests would go to, then click ${B(c.assign.rules.save)}.`,
                `Vérifiez l'aperçu des 3 prochaines attributions, puis ${B(c.assign.rules.save)}.`,
                `Reba abo ubusabe 3 bukurikira bwahabwa, hanyuma ukande ${B(c.assign.rules.save)}.`,
              ),
            },
          ],
        },
      ],
    }),
  ),

  g(
    {
      slug: "workload-and-approvals",
      cat: "team",
      minutes: 5,
      pages: ["/ops/workload"],
    },
    (c, p) => ({
      title: p(
        "Team workload, caps and approvals",
        "Charge de l'équipe, plafonds et approbations",
        "Akazi k'itsinda, igipimo n'ibyemezo",
      ),
      summary: c.load.lede.replace(/\s*\{\w+\}\.?/, "."),
      keywords:
        "workload capacity cap leave approvals rebalance charge plafond congé akazi",
      sections: [
        {
          id: "load",
          title: c.load.tabs.load,
          steps: [
            {
              text: menu(c, p, c.nav.workload),
              shot: "ops-workload",
              marks: p(
                ["Team load", "Approvals", "View agent"],
                ["Charge", "Approbations", "Voir l'agent"],
                ["Akazi", "Ibyemezo", "Reba umukozi"],
              ),
            },
            {
              text: p(
                `Filter by ${B(c.load.filters.skill)}, ${B(c.load.filters.type)} and ${B(c.load.filters.week)}. The heatmap shows ${B(c.load.heatLegend.ok)}, ${B(c.load.heatLegend.risk)} and ${B(c.load.heatLegend.over)}.`,
                `Filtrez par ${B(c.load.filters.skill)}, ${B(c.load.filters.type)} et ${B(c.load.filters.week)}. La carte montre ${B(c.load.heatLegend.ok)}, ${B(c.load.heatLegend.risk)} et ${B(c.load.heatLegend.over)}.`,
                `Yungurura ukurikije ${B(c.load.filters.skill)}, ${B(c.load.filters.type)} na ${B(c.load.filters.week)}. Ikarita yerekana ${B(c.load.heatLegend.ok)}, ${B(c.load.heatLegend.risk)} na ${B(c.load.heatLegend.over)}.`,
              ),
            },
            {
              text: p(
                `When someone is over capacity a banner suggests moving cases: ${B(c.load.rebalance.preview)}, untick cases to keep, then ${B(c.load.rebalance.apply)}.`,
                `Quand quelqu'un dépasse sa capacité, une bannière propose de déplacer des dossiers : ${B(c.load.rebalance.preview)}, décochez ceux à garder, puis ${B(c.load.rebalance.apply)}.`,
                `Iyo umuntu arengeje ubushobozi, agasanduku gasaba kwimura dosiye: ${B(c.load.rebalance.preview)}, ukureho izo kugumana, ukande ${B(c.load.rebalance.apply)}.`,
              ),
            },
            {
              text: p(
                `Click ${B(c.load.view)} (or ${B(c.load.adjust)}) on an agent. The panel shows skills, current cases, on-time trend and leave.`,
                `Cliquez ${B(c.load.view)} (ou ${B(c.load.adjust)}) sur un agent. Le panneau montre compétences, dossiers, ponctualité et congés.`,
                `Kanda ${B(c.load.view)} (cyangwa ${B(c.load.adjust)}) ku mukozi. Akanama kerekana ubumenyi, dosiye afite, kubahiriza igihe n'ikiruhuko.`,
              ),
              shot: "ops-workload-drawer",
              marks: p(
                ["Agent panel"],
                ["Panneau agent"],
                ["Akanama k'umukozi"],
              ),
            },
            {
              text: p(
                `Under ${B(c.load.drawer.cap)}, change the cap with − / +, set ${B(c.load.drawer.perDay)}, choose a ${B(c.load.drawer.capReason)} and click ${B(c.load.drawer.save)}. ${B(c.load.drawer.reassign)} moves today's cases to free colleagues.`,
                `Sous ${B(c.load.drawer.cap)}, changez le plafond avec − / +, réglez ${B(c.load.drawer.perDay)}, choisissez un ${B(c.load.drawer.capReason)} et ${B(c.load.drawer.save)}. ${B(c.load.drawer.reassign)} confie les dossiers du jour à des collègues libres.`,
                `Munsi ya ${B(c.load.drawer.cap)}, hindura igipimo ukoresheje − / +, shyiraho ${B(c.load.drawer.perDay)}, uhitemo ${B(c.load.drawer.capReason)} ukande ${B(c.load.drawer.save)}. ${B(c.load.drawer.reassign)} iha dosiye z'uyu munsi bagenzi bafite umwanya.`,
              ),
            },
          ],
        },
        {
          id: "approvals",
          title: c.load.tabs.approvals,
          steps: [
            {
              text: p(
                `Open ${B(c.load.tabs.approvals)}. Filter by ${B(c.load.approvals.tabs.leave)}, ${B(c.load.approvals.tabs.skill)}, ${B(c.load.approvals.tabs.due)} or ${B(c.load.approvals.tabs.cancel)}.`,
                `Ouvrez ${B(c.load.tabs.approvals)}. Filtrez par ${B(c.load.approvals.tabs.leave)}, ${B(c.load.approvals.tabs.skill)}, ${B(c.load.approvals.tabs.due)} ou ${B(c.load.approvals.tabs.cancel)}.`,
                `Fungura ${B(c.load.tabs.approvals)}. Yungurura ukurikije ${B(c.load.approvals.tabs.leave)}, ${B(c.load.approvals.tabs.skill)}, ${B(c.load.approvals.tabs.due)} cyangwa ${B(c.load.approvals.tabs.cancel)}.`,
              ),
              shot: "ops-workload-approvals",
              marks: p(["Requests"], ["Demandes"], ["Ibisabwa"]),
            },
            {
              text: p(
                `Read the impact (cases due in that period), then click ${B(c.load.approvals.approve)} or ${B(c.load.approvals.decline)}. For new due dates you can tick ${B(c.load.approvals.notify)}.`,
                `Lisez l'impact (dossiers dus sur la période), puis ${B(c.load.approvals.approve)} ou ${B(c.load.approvals.decline)}. Pour une nouvelle échéance, cochez ${B(c.load.approvals.notify)}.`,
                `Soma ingaruka (dosiye zigomba muri icyo gihe), hanyuma ukande ${B(c.load.approvals.approve)} cyangwa ${B(c.load.approvals.decline)}. Ku itariki nshya ushobora guhitamo ${B(c.load.approvals.notify)}.`,
              ),
            },
          ],
        },
      ],
    }),
  ),

  g(
    { slug: "workforce", cat: "team", minutes: 6, pages: ["/ops/workforce"] },
    (c, p) => ({
      title: p(
        "Workforce: people, profiles, applications and offboarding",
        "Effectifs : personnes, profils, candidatures et départs",
        "Abakozi: abantu, imyirondoro, abasaba n'abavuye",
      ),
      summary: c.wf.sub,
      keywords:
        "workforce people agent profile invite application contract suspend offboard effectifs abakozi",
      sections: [
        {
          id: "list",
          title: p("Find a person", "Trouver une personne", "Shaka umuntu"),
          steps: [
            {
              text: menu(c, p, c.nav.workforce),
              shot: "ops-workforce",
              marks: p(
                ["Add person", "Applications", "Search", "People"],
                ["Ajouter", "Candidatures", "Recherche", "Personnes"],
                ["Ongeraho", "Abasabye", "Gushakisha", "Abantu"],
              ),
            },
            {
              text: p(
                `Choose ${B(c.wf.seg.all)}, ${B(c.wf.seg.internal)}, ${B(c.wf.seg.external)} or ${B(c.wf.seg.field)}; search by name, email or service and filter by ${B(c.wf.filters.service)}, ${B(c.wf.filters.language)}, ${B(c.wf.filters.district)} or ${B(c.wf.filters.rating)}.`,
                `Choisissez ${B(c.wf.seg.all)}, ${B(c.wf.seg.internal)}, ${B(c.wf.seg.external)} ou ${B(c.wf.seg.field)} ; cherchez par nom, e-mail ou service et filtrez par ${B(c.wf.filters.service)}, ${B(c.wf.filters.language)}, ${B(c.wf.filters.district)} ou ${B(c.wf.filters.rating)}.`,
                `Hitamo ${B(c.wf.seg.all)}, ${B(c.wf.seg.internal)}, ${B(c.wf.seg.external)} cyangwa ${B(c.wf.seg.field)}; shakisha ukoresheje izina, imeyili cyangwa serivisi, uyungurure ukurikije ${B(c.wf.filters.service)}, ${B(c.wf.filters.language)}, ${B(c.wf.filters.district)} cyangwa ${B(c.wf.filters.rating)}.`,
              ),
            },
          ],
        },
        {
          id: "profile",
          title: p(
            "A person's profile",
            "Le profil d'une personne",
            "Umwirondoro w'umuntu",
          ),
          steps: [
            {
              text: p(
                `Double-click a row. Tabs: ${B(c.wf.tabs.overview)}, ${B(c.wf.tabs.performance)}, ${B(c.wf.tabs.reviews)}, ${B(c.wf.tabs.history)}, ${B(c.wf.tabs.documents)}.`,
                `Double-cliquez une ligne. Onglets : ${B(c.wf.tabs.overview)}, ${B(c.wf.tabs.performance)}, ${B(c.wf.tabs.reviews)}, ${B(c.wf.tabs.history)}, ${B(c.wf.tabs.documents)}.`,
                `Kanda kabiri ku murongo. Ibice: ${B(c.wf.tabs.overview)}, ${B(c.wf.tabs.performance)}, ${B(c.wf.tabs.reviews)}, ${B(c.wf.tabs.history)}, ${B(c.wf.tabs.documents)}.`,
              ),
              shot: "ops-worker",
              marks: p(
                ["Profile tabs"],
                ["Onglets du profil"],
                ["Ibice by'umwirondoro"],
              ),
            },
            {
              text: p(
                `${B(c.wf.profile.reveal)} shows private details after you give a reason (recorded). ${B(c.wf.blocks.title)} → ${B(c.wf.blocks.add)} stops assignments to a client. ${B(c.wf.contracts.issue)} sends a contract for signature (external agents).`,
                `${B(c.wf.profile.reveal)} affiche les données privées après un motif (enregistré). ${B(c.wf.blocks.title)} → ${B(c.wf.blocks.add)} bloque les attributions pour un client. ${B(c.wf.contracts.issue)} envoie un contrat à signer (externes).`,
                `${B(c.wf.profile.reveal)} yerekana amakuru bwite nyuma yo gutanga impamvu (irandikwa). ${B(c.wf.blocks.title)} → ${B(c.wf.blocks.add)} ibuza kumuha umukiriya runaka. ${B(c.wf.contracts.issue)} yohereza amasezerano yo gusinya (abo hanze).`,
              ),
            },
            {
              text: p(
                `${B(c.wf.actions.label)}: ${B(c.wf.actions.review)} (rating, goals, comments → ${B(c.wf.review.submit)}), ${B(c.wf.actions.suspend)} / ${B(c.wf.actions.reactivate)}, or ${B(c.wf.actions.terminate)}.`,
                `${B(c.wf.actions.label)} : ${B(c.wf.actions.review)} (note, objectifs, commentaires → ${B(c.wf.review.submit)}), ${B(c.wf.actions.suspend)} / ${B(c.wf.actions.reactivate)}, ou ${B(c.wf.actions.terminate)}.`,
                `${B(c.wf.actions.label)}: ${B(c.wf.actions.review)} (amanota, intego, ibitekerezo → ${B(c.wf.review.submit)}), ${B(c.wf.actions.suspend)} / ${B(c.wf.actions.reactivate)}, cyangwa ${B(c.wf.actions.terminate)}.`,
              ),
            },
          ],
        },
        {
          id: "add",
          title: c.wf.create.title,
          steps: [
            {
              text: p(
                `Click ${B(c.wf.add)}. Enter ${B(c.wf.create.first)}, ${B(c.wf.create.last)}, ${B(c.wf.create.email)}, ${B(c.wf.create.phone)}, the ${B(c.wf.create.type)} (tick ${B(c.wf.create.field)} if they do visits) and click ${B(c.wf.create.submit)}.`,
                `Cliquez ${B(c.wf.add)}. Saisissez ${B(c.wf.create.first)}, ${B(c.wf.create.last)}, ${B(c.wf.create.email)}, ${B(c.wf.create.phone)}, l'${B(c.wf.create.type)} (cochez ${B(c.wf.create.field)} s'il fait des visites) puis ${B(c.wf.create.submit)}.`,
                `Kanda ${B(c.wf.add)}. Andika ${B(c.wf.create.first)}, ${B(c.wf.create.last)}, ${B(c.wf.create.email)}, ${B(c.wf.create.phone)}, ${B(c.wf.create.type)} (hitamo ${B(c.wf.create.field)} niba akora ingendo) ukande ${B(c.wf.create.submit)}.`,
              ),
            },
            {
              text: p(
                `${B(c.wf.apps.link)} lists people who applied at /join: open one and choose ${B(c.wf.apps.approve)}, ${B(c.wf.apps.reject)} or ${B(c.wf.apps.requestInfo)} with a ${B(c.wf.apps.note)}.`,
                `${B(c.wf.apps.link)} liste les candidats venus de /join : ouvrez-en un et choisissez ${B(c.wf.apps.approve)}, ${B(c.wf.apps.reject)} ou ${B(c.wf.apps.requestInfo)} avec une ${B(c.wf.apps.note)}.`,
                `${B(c.wf.apps.link)} herekana abasabye kuri /join: fungura umwe uhitemo ${B(c.wf.apps.approve)}, ${B(c.wf.apps.reject)} cyangwa ${B(c.wf.apps.requestInfo)} ufite ${B(c.wf.apps.note)}.`,
              ),
            },
          ],
        },
        {
          id: "off",
          title: p(
            "Offboard someone",
            "Faire partir quelqu'un",
            "Gusezerera umukozi",
          ),
          steps: [
            {
              text: p(
                `From ${B(c.wf.actions.label)} → ${B(c.wf.actions.terminate)}, go through ${B(c.wf.off.steps[0])}, ${B(c.wf.off.steps[1])}, ${B(c.wf.off.steps[2])}, ${B(c.wf.off.steps[3])} and ${B(c.wf.off.steps[4])}, then click ${B(c.wf.off.finish)}.`,
                `Depuis ${B(c.wf.actions.label)} → ${B(c.wf.actions.terminate)}, passez ${B(c.wf.off.steps[0])}, ${B(c.wf.off.steps[1])}, ${B(c.wf.off.steps[2])}, ${B(c.wf.off.steps[3])} et ${B(c.wf.off.steps[4])}, puis ${B(c.wf.off.finish)}.`,
                `Uhereye kuri ${B(c.wf.actions.label)} → ${B(c.wf.actions.terminate)}, nyura muri ${B(c.wf.off.steps[0])}, ${B(c.wf.off.steps[1])}, ${B(c.wf.off.steps[2])}, ${B(c.wf.off.steps[3])} na ${B(c.wf.off.steps[4])}, ukande ${B(c.wf.off.finish)}.`,
              ),
            },
          ],
          warn: c.wf.off.accessBody,
        },
      ],
    }),
  ),

  // ------------------------------------------------------------------ service quality
  g(
    { slug: "sla-board", cat: "service", minutes: 4, pages: ["/ops/sla"] },
    (c, p) => ({
      title: p(
        "SLA board and escalations",
        "Tableau SLA et escalades",
        "Igihe ntarengwa n'izamurwa",
      ),
      summary: c.sla.lede,
      keywords:
        "sla deadline at risk breach escalate extend échéance escalade igihe ntarengwa",
      sections: [
        {
          id: "read",
          title: p("Read the board", "Lire le tableau", "Soma imbonerahamwe"),
          steps: [
            {
              text: menu(c, p, c.nav.sla),
              shot: "ops-sla",
              marks: p(
                ["SLA rules", "At risk", "Breached"],
                ["Règles SLA", "À risque", "Dépassés"],
                ["Amategeko", "Biri mu kaga", "Byarenze"],
              ),
            },
            {
              text: p(
                `Tiles show ${B(c.sla.tiles.met)}, ${B(c.sla.tiles.firstResponse)}, ${B(c.sla.tiles.breaches)} and the trend. Columns: ${B(c.sla.cols.risk)}, ${B(c.sla.cols.today)}, ${B(c.sla.cols.breach)}. Paused cases are not counted.`,
                `Les tuiles montrent ${B(c.sla.tiles.met)}, ${B(c.sla.tiles.firstResponse)}, ${B(c.sla.tiles.breaches)} et la tendance. Colonnes : ${B(c.sla.cols.risk)}, ${B(c.sla.cols.today)}, ${B(c.sla.cols.breach)}. Les dossiers en pause ne comptent pas.`,
                `Udusanduku twerekana ${B(c.sla.tiles.met)}, ${B(c.sla.tiles.firstResponse)}, ${B(c.sla.tiles.breaches)} n'uko bigenda. Inkingi: ${B(c.sla.cols.risk)}, ${B(c.sla.cols.today)}, ${B(c.sla.cols.breach)}. Ibyahagaritswe ntibibarwa.`,
              ),
            },
            {
              text: p(
                `${B(c.sla.rules)} shows the targets per service (read-only; change them in the catalogue).`,
                `${B(c.sla.rules)} affiche les objectifs par service (lecture seule ; à modifier dans le catalogue).`,
                `${B(c.sla.rules)} yerekana intego kuri buri serivisi (gusoma gusa; zihindurirwa mu rutonde rwa serivisi).`,
              ),
            },
          ],
        },
        {
          id: "act",
          title: p(
            "Act on a case",
            "Agir sur un dossier",
            "Gukora kuri dosiye",
          ),
          steps: [
            {
              text: p(
                `Click a case card. The ${B(c.sla.ladder)} shows the warning, the escalation and the senior digest.`,
                `Cliquez une carte. L'${B(c.sla.ladder)} montre l'alerte, l'escalade et le résumé direction.`,
                `Kanda ikarita ya dosiye. ${B(c.sla.ladder)} yerekana iburira, izamurwa na raporo y'ubuyobozi.`,
              ),
              shot: "ops-sla-case",
              marks: p(
                ["Extend deadline", "Escalate now"],
                ["Prolonger", "Escalader"],
                ["Ongera igihe", "Zamura ubu"],
              ),
            },
            {
              text: p(
                `${B(c.sla.actions.extend)}: pick a ${B(c.sla.extend.date)} and a reason, tick ${B(c.sla.extend.notify)} to send the preview message, then ${B(c.sla.extend.confirm)}. Or use ${B(c.sla.actions.reassign)}, ${B(c.sla.actions.message)} or ${B(c.sla.actions.escalate)}.`,
                `${B(c.sla.actions.extend)} : choisissez une ${B(c.sla.extend.date)} et un motif, cochez ${B(c.sla.extend.notify)} pour envoyer le message, puis ${B(c.sla.extend.confirm)}. Ou ${B(c.sla.actions.reassign)}, ${B(c.sla.actions.message)}, ${B(c.sla.actions.escalate)}.`,
                `${B(c.sla.actions.extend)}: hitamo ${B(c.sla.extend.date)} n'impamvu, uhitemo ${B(c.sla.extend.notify)} wohereze ubutumwa, ukande ${B(c.sla.extend.confirm)}. Cyangwa ${B(c.sla.actions.reassign)}, ${B(c.sla.actions.message)}, ${B(c.sla.actions.escalate)}.`,
              ),
            },
          ],
          faq: [
            {
              q: p(
                "When does the clock stop?",
                "Quand l'horloge s'arrête-t-elle ?",
                "Isaha ihagarara ryari?",
              ),
              a: c.sla.paused.replace(/\s*\{\w+\}\s*/g, " ").trim(),
            },
          ],
        },
      ],
    }),
  ),

  g(
    {
      slug: "review-deliverables",
      cat: "service",
      minutes: 5,
      pages: ["/ops/reviews"],
    },
    (c, p) => ({
      title: p(
        "Review and release deliverables",
        "Revoir et livrer les livrables",
        "Gusuzuma no gutanga ibikorwa",
      ),
      summary: c.rev.lede,
      keywords:
        "review deliverable approve release return comment payment gate second approval allocation livrable isuzuma",
      sections: [
        {
          id: "queue",
          title: p("The queue", "La file", "Urutonde"),
          steps: [
            {
              text: menu(c, p, c.nav.reviews),
              shot: "ops-reviews",
              marks: p(
                ["Tabs"],
                ["Onglets"],
                ["Ibice"],
              ),
            },
            {
              text: p(
                `${B(c.rev.tabs.mine)} holds what waits for you; ${B(c.rev.tabs.returned)} and ${B(c.rev.tabs.approved)} keep the history. Click a deliverable to open it.`,
                `${B(c.rev.tabs.mine)} contient ce qui vous attend ; ${B(c.rev.tabs.returned)} et ${B(c.rev.tabs.approved)} gardent l'historique. Cliquez un livrable pour l'ouvrir.`,
                `${B(c.rev.tabs.mine)} ibika ibigutegereje; ${B(c.rev.tabs.returned)} na ${B(c.rev.tabs.approved)} bibika amateka. Kanda igikorwa ugifungure.`,
              ),
            },
          ],
        },
        {
          id: "decide",
          title: p(
            "Check and decide",
            "Vérifier et décider",
            "Suzuma ufate icyemezo",
          ),
          steps: [
            {
              text: p(
                `Page through the file, use ${B(c.rev.compare)} for a new version, and tick each item of ${B(c.rev.requirements)} as ${B(c.rev.met)} or ${B(c.rev.notMet)}. Click on the page to pin a comment, then ${B(c.rev.send)}.`,
                `Feuilletez le fichier, utilisez ${B(c.rev.compare)} pour une nouvelle version et marquez chaque point de ${B(c.rev.requirements)} ${B(c.rev.met)} ou ${B(c.rev.notMet)}. Cliquez sur la page pour épingler un commentaire, puis ${B(c.rev.send)}.`,
                `Reba amapaji, ukoreshe ${B(c.rev.compare)} ku bushya, ushyireho buri kintu cya ${B(c.rev.requirements)} ${B(c.rev.met)} cyangwa ${B(c.rev.notMet)}. Kanda ku rupapuro ushyireho igitekerezo, ukande ${B(c.rev.send)}.`,
              ),
            },
            {
              text: p(
                `Click ${B(c.rev.approve)} (or ${B(c.rev.approveAfter)} when unpaid), or ${B(c.rev.returnBtn)}: add a ${B(c.rev.ret.note)}, a ${B(c.rev.ret.due)} and ${B(c.rev.ret.confirm)}.`,
                `Cliquez ${B(c.rev.approve)} (ou ${B(c.rev.approveAfter)} si impayé), ou ${B(c.rev.returnBtn)} : ajoutez une ${B(c.rev.ret.note)}, une ${B(c.rev.ret.due)} et ${B(c.rev.ret.confirm)}.`,
                `Kanda ${B(c.rev.approve)} (cyangwa ${B(c.rev.approveAfter)} niba bitarishyurwa), cyangwa ${B(c.rev.returnBtn)}: ongeraho ${B(c.rev.ret.note)}, ${B(c.rev.ret.due)} ukande ${B(c.rev.ret.confirm)}.`,
              ),
            },
            {
              text: p(
                `High-value cases need a second approver: ${B(c.rev.chain.request)}. If release is blocked by an unpaid balance, a manager can use ${B(c.rev.gate.override)} with a reason (and proof for paid offline).`,
                `Les dossiers de forte valeur exigent un second approbateur : ${B(c.rev.chain.request)}. Si la livraison est bloquée par un impayé, un responsable peut ${B(c.rev.gate.override)} avec un motif (et une preuve si payé hors ligne).`,
                `Dosiye z'agaciro kanini zikenera uwemeza wa kabiri: ${B(c.rev.chain.request)}. Niba gutanga bibujijwe n'amafaranga atarishyurwa, umuyobozi ashobora ${B(c.rev.gate.override)} afite impamvu (n'ikimenyetso niba yishyuwe ahandi).`,
              ),
            },
            {
              text: p(
                `In ${B(c.rev.alloc.title)}, check the split and click ${B(c.rev.alloc.mark)}.`,
                `Dans ${B(c.rev.alloc.title)}, vérifiez la répartition et cliquez ${B(c.rev.alloc.mark)}.`,
                `Muri ${B(c.rev.alloc.title)}, reba uko bigabanywa ukande ${B(c.rev.alloc.mark)}.`,
              ),
            },
          ],
          tips: [c.rev.ownWork],
        },
      ],
    }),
  ),

  g(
    {
      slug: "tickets-and-complaints",
      cat: "service",
      minutes: 6,
      pages: ["/ops/tickets"],
    },
    (c, p) => ({
      title: p(
        "Tickets: complaints, disputes and enquiries",
        "Tickets : plaintes, litiges et demandes",
        "Ibibazo: ibirego, impaka n'ibibazo bisanzwe",
      ),
      summary: c.tix.lede,
      keywords:
        "ticket complaint dispute enquiry refund escalate resolve plainte litige ikirego",
      sections: [
        {
          id: "queue",
          title: p("The queue", "La file", "Urutonde"),
          steps: [
            {
              text: menu(c, p, c.nav.tickets),
              shot: "ops-tickets",
              marks: p(
                ["Tabs", "New ticket"],
                ["Onglets", "Nouveau ticket"],
                ["Ibice", "Ikibazo gishya"],
              ),
            },
            {
              text: p(
                `Tabs: ${B(c.tix.tabs.complaints)}, ${B(c.tix.tabs.disputes)}, ${B(c.tix.tabs.enquiries)}, ${B(c.tix.tabs.resolved)} and ${B(c.tix.register.tab)}. Priority sets the clock: ${B(c.tix.priority.critical)}, ${B(c.tix.priority.high)}, ${B(c.tix.priority.medium)}, ${B(c.tix.priority.low)}.`,
                `Onglets : ${B(c.tix.tabs.complaints)}, ${B(c.tix.tabs.disputes)}, ${B(c.tix.tabs.enquiries)}, ${B(c.tix.tabs.resolved)} et ${B(c.tix.register.tab)}. La priorité fixe le délai : ${B(c.tix.priority.critical)}, ${B(c.tix.priority.high)}, ${B(c.tix.priority.medium)}, ${B(c.tix.priority.low)}.`,
                `Ibice: ${B(c.tix.tabs.complaints)}, ${B(c.tix.tabs.disputes)}, ${B(c.tix.tabs.enquiries)}, ${B(c.tix.tabs.resolved)} na ${B(c.tix.register.tab)}. Icyihutirwa kigena igihe: ${B(c.tix.priority.critical)}, ${B(c.tix.priority.high)}, ${B(c.tix.priority.medium)}, ${B(c.tix.priority.low)}.`,
              ),
            },
            {
              text: p(
                `${B(c.tix.newTicket)}: choose the ${B(c.tix.kindLabel)}, enter the ${B(c.tix.caseLabel)} and ${B(c.tix.noteLabel)}, then save.`,
                `${B(c.tix.newTicket)} : choisissez le ${B(c.tix.kindLabel)}, saisissez la ${B(c.tix.caseLabel)} et ${B(c.tix.noteLabel)}, puis enregistrez.`,
                `${B(c.tix.newTicket)}: hitamo ${B(c.tix.kindLabel)}, wandike ${B(c.tix.caseLabel)} na ${B(c.tix.noteLabel)}, ubike.`,
              ),
            },
          ],
        },
        {
          id: "handle",
          title: p("Handle a ticket", "Traiter un ticket", "Gukemura ikibazo"),
          steps: [
            {
              text: p(
                `Open a ticket. Tabs ${B(c.tix.tabsDetail.conversation)}, ${B(c.tix.tabsDetail.files)} and ${B(c.tix.tabsDetail.activity)}; the side shows the ${B(c.tix.linkedCase)} and ${B(c.tix.history)}.`,
                `Ouvrez un ticket. Onglets ${B(c.tix.tabsDetail.conversation)}, ${B(c.tix.tabsDetail.files)} et ${B(c.tix.tabsDetail.activity)} ; le côté affiche le ${B(c.tix.linkedCase)} et l'${B(c.tix.history)}.`,
                `Fungura ikibazo. Ibice ${B(c.tix.tabsDetail.conversation)}, ${B(c.tix.tabsDetail.files)} na ${B(c.tix.tabsDetail.activity)}; iruhande herekana ${B(c.tix.linkedCase)} na ${B(c.tix.history)}.`,
              ),
            },
            {
              text: p(
                `Choose ${B(c.tix.replyToClient)} or ${B(c.tix.internalNote)}, write, and ${B(c.tix.sendReply)} / ${B(c.tix.sendNote)}. ${B(c.tix.logCall)} records a phone call.`,
                `Choisissez ${B(c.tix.replyToClient)} ou ${B(c.tix.internalNote)}, écrivez, puis ${B(c.tix.sendReply)} / ${B(c.tix.sendNote)}. ${B(c.tix.logCall)} enregistre un appel.`,
                `Hitamo ${B(c.tix.replyToClient)} cyangwa ${B(c.tix.internalNote)}, wandike, ukande ${B(c.tix.sendReply)} / ${B(c.tix.sendNote)}. ${B(c.tix.logCall)} yandika telefoni wahamagaye.`,
              ),
            },
            {
              text: p(
                `Under ${B(c.tix.actions)}: ${B(c.tix.proposeRefund)} (goes to Finance, needs your second factor), ${B(c.tix.apology)}, ${B(c.tix.reassign)} or ${B(c.tix.escalate)}.`,
                `Sous ${B(c.tix.actions)} : ${B(c.tix.proposeRefund)} (part à la Finance, avec votre second facteur), ${B(c.tix.apology)}, ${B(c.tix.reassign)} ou ${B(c.tix.escalate)}.`,
                `Munsi ya ${B(c.tix.actions)}: ${B(c.tix.proposeRefund)} (bijya ku Mari, bisaba kwemeza ko ari wowe), ${B(c.tix.apology)}, ${B(c.tix.reassign)} cyangwa ${B(c.tix.escalate)}.`,
              ),
            },
            {
              text: p(
                `Click ${B(c.tix.resolve)}: choose the ${B(c.tix.resolutionKind)} and ${B(c.tix.rootCause)}, write the ${B(c.tix.summary)} and a ${B(c.tix.preventive)}. Tick ${B(c.tix.askConfirm)} to wait for the client's answer.`,
                `Cliquez ${B(c.tix.resolve)} : choisissez le ${B(c.tix.resolutionKind)} et la ${B(c.tix.rootCause)}, écrivez le ${B(c.tix.summary)} et une ${B(c.tix.preventive)}. Cochez ${B(c.tix.askConfirm)} pour attendre la réponse du client.`,
                `Kanda ${B(c.tix.resolve)}: hitamo ${B(c.tix.resolutionKind)} na ${B(c.tix.rootCause)}, wandike ${B(c.tix.summary)} na ${B(c.tix.preventive)}. Hitamo ${B(c.tix.askConfirm)} utegereze igisubizo cy'umukiriya.`,
              ),
            },
          ],
          tips: [c.tix.resolveNeedsReply],
        },
      ],
    }),
  ),

  g(
    {
      slug: "conversations",
      cat: "service",
      minutes: 4,
      pages: ["/ops/conversations"],
    },
    (c, p) => ({
      title: p(
        "Reply to clients in Conversations",
        "Répondre aux clients (Conversations)",
        "Gusubiza abakiriya mu Biganiro",
      ),
      summary: p(
        "One inbox for client chats, AI handoffs and staff messages. Claim, reply or add internal notes, use templates and export transcripts.",
        "Une seule boîte pour les discussions clients, les transferts de l'IA et les messages internes. Réservez, répondez ou notez, utilisez des modèles et exportez.",
        "Agasanduku kamwe k'ibiganiro n'abakiriya, ibyoherejwe na AI n'ubutumwa bw'abakozi. Fata, usubize cyangwa wandike icyitonderwa, ukoreshe inyandikorugero, usohore ikiganiro.",
      ),
      keywords:
        "conversation chat inbox claim reply template handoff transcript discussion ikiganiro",
      sections: [
        {
          id: "list",
          title: p(
            "Pick a conversation",
            "Choisir une conversation",
            "Hitamo ikiganiro",
          ),
          steps: [
            {
              text: menu(c, p, c.nav.conversations),
              shot: "ops-conversations",
              marks: p(
                ["Search"],
                ["Recherche"],
                ["Gushakisha"],
              ),
            },
            {
              text: p(
                `Filter: ${B(c.conv.filters.unassigned)}, ${B(c.conv.filters.mine)}, ${B(c.conv.filters.waiting_us)}, ${B(c.conv.filters.waiting_client)}, ${B(c.conv.filters.handoff)}, ${B(c.conv.filters.dms)}. Click a conversation to read it.`,
                `Filtrez : ${B(c.conv.filters.unassigned)}, ${B(c.conv.filters.mine)}, ${B(c.conv.filters.waiting_us)}, ${B(c.conv.filters.waiting_client)}, ${B(c.conv.filters.handoff)}, ${B(c.conv.filters.dms)}. Cliquez une conversation pour la lire.`,
                `Yungurura: ${B(c.conv.filters.unassigned)}, ${B(c.conv.filters.mine)}, ${B(c.conv.filters.waiting_us)}, ${B(c.conv.filters.waiting_client)}, ${B(c.conv.filters.handoff)}, ${B(c.conv.filters.dms)}. Kanda ikiganiro ugisome.`,
              ),
            },
          ],
        },
        {
          id: "reply",
          title: p("Reply", "Répondre", "Subiza"),
          steps: [
            {
              text: p(
                `Click ${B(c.conv.claim)} (you can reply to the client only after claiming).`,
                `Cliquez ${B(c.conv.claim)} (on ne répond au client qu'après avoir réservé).`,
                `Kanda ${B(c.conv.claim)} (usubiza umukiriya ari uko wagifashe).`,
              ),
            },
            {
              text: p(
                `Choose ${B(c.conv.lane.client)} or ${B(c.conv.lane.internal)}, type (@ mentions a colleague), use ${B(c.conv.templates)} → ${B(c.conv.tplInsert)} if helpful, ${B(c.conv.attach)} a file, then ${B(c.conv.send)}.`,
                `Choisissez ${B(c.conv.lane.client)} ou ${B(c.conv.lane.internal)}, écrivez (@ mentionne un collègue), utilisez ${B(c.conv.templates)} → ${B(c.conv.tplInsert)} si utile, ${B(c.conv.attach)} un fichier, puis ${B(c.conv.send)}.`,
                `Hitamo ${B(c.conv.lane.client)} cyangwa ${B(c.conv.lane.internal)}, wandike (@ ivuga mugenzi wawe), ukoreshe ${B(c.conv.templates)} → ${B(c.conv.tplInsert)} niba bifasha, ${B(c.conv.attach)} dosiye, ukande ${B(c.conv.send)}.`,
              ),
            },
            {
              text: p(
                `${B(c.conv.more)}: ${B(c.conv.linkCase)}, ${B(c.conv.pin)}, ${B(c.conv.holdOn)}, or ${B(c.conv.exportTranscript)} (choose dates, ${B(c.conv.exNotes)}, then ${B(c.conv.exGo)}).`,
                `${B(c.conv.more)} : ${B(c.conv.linkCase)}, ${B(c.conv.pin)}, ${B(c.conv.holdOn)}, ou ${B(c.conv.exportTranscript)} (dates, ${B(c.conv.exNotes)}, puis ${B(c.conv.exGo)}).`,
                `${B(c.conv.more)}: ${B(c.conv.linkCase)}, ${B(c.conv.pin)}, ${B(c.conv.holdOn)}, cyangwa ${B(c.conv.exportTranscript)} (amatariki, ${B(c.conv.exNotes)}, ukande ${B(c.conv.exGo)}).`,
              ),
            },
            {
              text: p(
                `${B(c.conv.newDm)} starts a message with a colleague (${B(c.conv.filters.dms)}).`,
                `${B(c.conv.newDm)} démarre un message avec un collègue (${B(c.conv.filters.dms)}).`,
                `${B(c.conv.newDm)} itangiza ubutumwa na mugenzi wawe (${B(c.conv.filters.dms)}).`,
              ),
            },
          ],
          tips: [c.conv.exAudit],
        },
      ],
    }),
  ),

  g(
    { slug: "bookings", cat: "service", minutes: 4, pages: ["/ops/bookings"] },
    (c, p) => ({
      title: p(
        "Consultation bookings",
        "Réservations de consultations",
        "Inama zateganyijwe",
      ),
      summary: p("Consultations across advisers: the board, callback requests, consultation types and analytics.", "Les consultations de tous les conseillers : tableau, demandes de rappel, types de consultation et statistiques.", "Inama z'abajyanama bose: imbonerahamwe, abasabye guhamagarwa, ubwoko bw'inama n'imibare."),
      keywords:
        "booking consultation adviser reschedule callback meet réservation inama",
      sections: [
        {
          id: "board",
          title: c.bk.ops.tabs.board,
          steps: [
            {
              text: menu(c, p, c.nav.bookings),
              shot: "ops-bookings",
              marks: p(
                ["Tabs", "Book on behalf"],
                ["Onglets", "Réserver pour un client"],
                ["Ibice", "Teganyiriza umukiriya"],
              ),
            },
            {
              text: p(
                `${B(c.bk.ops.tabs.board)} lists sessions by ${B(c.bk.ops.date)}, ${B(c.bk.ops.adviser)} and ${B(c.bk.ops.status)}. On a row use ${B(c.bk.ops.reassign)}, ${B(c.bk.ops.override)}, ${B(c.bk.ops.cancel)} or ${B(c.bk.ops.openRoom)}.`,
                `${B(c.bk.ops.tabs.board)} liste les séances par ${B(c.bk.ops.date)}, ${B(c.bk.ops.adviser)} et ${B(c.bk.ops.status)}. Sur une ligne : ${B(c.bk.ops.reassign)}, ${B(c.bk.ops.override)}, ${B(c.bk.ops.cancel)} ou ${B(c.bk.ops.openRoom)}.`,
                `${B(c.bk.ops.tabs.board)} herekana inama ukurikije ${B(c.bk.ops.date)}, ${B(c.bk.ops.adviser)} na ${B(c.bk.ops.status)}. Ku murongo koresha ${B(c.bk.ops.reassign)}, ${B(c.bk.ops.override)}, ${B(c.bk.ops.cancel)} cyangwa ${B(c.bk.ops.openRoom)}.`,
              ),
            },
            {
              text: p(
                `If an adviser is away, a banner offers ${B(c.bk.ops.autoReassign)}. ${B(c.bk.ops.onBehalf)} books a session for a client or lead.`,
                `Si un conseiller est absent, une bannière propose ${B(c.bk.ops.autoReassign)}. ${B(c.bk.ops.onBehalf)} réserve une séance pour un client ou prospect.`,
                `Niba umujyanama adahari, agasanduku gatanga ${B(c.bk.ops.autoReassign)}. ${B(c.bk.ops.onBehalf)} iteganya inama ku mukiriya.`,
              ),
            },
          ],
        },
        {
          id: "more",
          title: p("Other tabs", "Autres onglets", "Ibindi bice"),
          steps: [
            {
              text: p(
                `${B(c.bk.ops.tabs.requests)}: ${B(c.bk.ops.call)}, ${B(c.bk.ops.schedule)} or ${B(c.bk.ops.closeReq)}. ${B(c.bk.ops.tabs.types)}: ${B(c.bk.ops.typeNew)} sets durations, modes, price and advisers. ${B(c.bk.ops.tabs.analytics)} shows show-up and conversion.`,
                `${B(c.bk.ops.tabs.requests)} : ${B(c.bk.ops.call)}, ${B(c.bk.ops.schedule)} ou ${B(c.bk.ops.closeReq)}. ${B(c.bk.ops.tabs.types)} : ${B(c.bk.ops.typeNew)} règle durées, modes, prix et conseillers. ${B(c.bk.ops.tabs.analytics)} montre présence et conversion.`,
                `${B(c.bk.ops.tabs.requests)}: ${B(c.bk.ops.call)}, ${B(c.bk.ops.schedule)} cyangwa ${B(c.bk.ops.closeReq)}. ${B(c.bk.ops.tabs.types)}: ${B(c.bk.ops.typeNew)} igena igihe, uburyo, igiciro n'abajyanama. ${B(c.bk.ops.tabs.analytics)} yerekana abitabiriye n'abahindutse abakiriya.`,
              ),
            },
          ],
          tips: [p("Staff cancellations refund paid sessions in full.", "Une annulation par l'équipe rembourse entièrement une séance payée.", "Iyo abakozi bahagaritse inama yishyuwe, amafaranga asubizwa yose.")],
        },
      ],
    }),
  ),

  // ------------------------------------------------------------------ records
  g(
    {
      slug: "companies-and-retention",
      cat: "records",
      minutes: 4,
      pages: ["/ops/companies", "/ops/retention"],
    },
    (c, p) => ({
      title: p(
        "Verify companies and decide document retention",
        "Vérifier les entreprises et la conservation des documents",
        "Kugenzura ibigo no gufata icyemezo ku kubika inyandiko",
      ),
      summary: p(
        `${c.co.lede} ${c.ret.lede}`,
        `${c.co.lede} ${c.ret.lede}`,
        `${c.co.lede} ${c.ret.lede}`,
      ),
      keywords:
        "company verify tin representatives retention shred keep entreprise conservation ikigo kubika",
      sections: [
        {
          id: "companies",
          title: c.co.title,
          steps: [
            {
              text: menu(c, p, c.nav.companies),
              shot: "ops-companies",
              marks: p(
                ["Status tabs", "Search"],
                ["Statuts", "Recherche"],
                ["Imiterere", "Gushakisha"],
              ),
            },
            {
              text: p(
                `Pick ${B(c.co.status.pending_verification)}, search by name, TIN or customer ID, and click the company name. ${B(c.co.dupTin)} warns of a shared TIN.`,
                `Choisissez ${B(c.co.status.pending_verification)}, cherchez par nom, NIF ou ID client, et cliquez le nom. ${B(c.co.dupTin)} signale un NIF partagé.`,
                `Hitamo ${B(c.co.status.pending_verification)}, shakisha ukoresheje izina, TIN cyangwa nimero y'umukiriya, ukande izina. ${B(c.co.dupTin)} iburira ko TIN isangiwe.`,
              ),
            },
            {
              text: p(
                `Check ${B(c.co.reps)} and ${B(c.co.requests)}, then click ${B(c.co.verify)}, or write ${B(c.co.note)} and ${B(c.co.reject)}.`,
                `Vérifiez ${B(c.co.reps)} et ${B(c.co.requests)}, puis ${B(c.co.verify)}, ou écrivez ${B(c.co.note)} et ${B(c.co.reject)}.`,
                `Reba ${B(c.co.reps)} na ${B(c.co.requests)}, ukande ${B(c.co.verify)}, cyangwa wandike ${B(c.co.note)} ukande ${B(c.co.reject)}.`,
              ),
            },
          ],
        },
        {
          id: "retention",
          title: c.ret.title,
          steps: [
            {
              text: menu(c, p, c.nav.retention),
              shot: "ops-retention",
              marks: p(
                ["Tabs"],
                ["Onglets"],
                ["Ibice"],
              ),
            },
            {
              text: p(
                `In ${B(c.ret.tabs.open)}, each row shows the ${B(c.ret.cols.cls)} (for example ${B(c.ret.classes.id_document)}). Click ${B(c.ret.shred)}, or type a ${B(c.ret.reason)} and click ${B(c.ret.keep)}. ${B(c.ret.tabs.decided)} keeps the history.`,
                `Dans ${B(c.ret.tabs.open)}, chaque ligne indique la ${B(c.ret.cols.cls)} (par ex. ${B(c.ret.classes.id_document)}). Cliquez ${B(c.ret.shred)}, ou saisissez un ${B(c.ret.reason)} et ${B(c.ret.keep)}. ${B(c.ret.tabs.decided)} garde l'historique.`,
                `Muri ${B(c.ret.tabs.open)}, buri murongo werekana ${B(c.ret.cols.cls)} (urugero ${B(c.ret.classes.id_document)}). Kanda ${B(c.ret.shred)}, cyangwa wandike ${B(c.ret.reason)} ukande ${B(c.ret.keep)}. ${B(c.ret.tabs.decided)} ibika amateka.`,
              ),
            },
          ],
          warn: p(
            "Shredding deletes the file for good. Keep it if a case, dispute or legal hold still needs it.",
            "La destruction supprime le fichier définitivement. Conservez-le si un dossier, un litige ou une obligation légale l'exige.",
            "Gusenya bisiba dosiye burundu. Yigumane niba dosiye, impaka cyangwa itegeko bikiyikeneye.",
          ),
        },
      ],
    }),
  ),

  g(
    { slug: "field-review", cat: "records", minutes: 4, pages: ["/ops/field"] },
    (c, p) => ({
      title: p(
        "Field review: visits, flags, expenses and custody",
        "Revue terrain : visites, signalements, dépenses et garde",
        "Isuzuma ry'ibyo mu murima: ingendo, ibyagaragajwe, amafaranga no kurinda",
      ),
      summary: c.fld.sub,
      keywords:
        "field visit flag gps conflict expense custody originals terrain visite umurima uruzinduko",
      sections: [
        {
          id: "queue",
          title: c.fld.title,
          steps: [
            {
              text: menu(c, p, c.nav.field),
              shot: "ops-field",
              marks: p(
                ["Request field visit", "Tabs"],
                ["Demander une visite", "Onglets"],
                ["Saba uruzinduko", "Ibice"],
              ),
            },
            {
              text: p(
                `${B(c.fld.tabs.flags)}: open the evidence and click ${B(c.fld.flags.review)}. ${B(c.fld.tabs.conflicts)}: ${B(c.fld.conflicts.accept)} or ${B(c.fld.conflicts.keep)}.`,
                `${B(c.fld.tabs.flags)} : ouvrez les preuves et cliquez ${B(c.fld.flags.review)}. ${B(c.fld.tabs.conflicts)} : ${B(c.fld.conflicts.accept)} ou ${B(c.fld.conflicts.keep)}.`,
                `${B(c.fld.tabs.flags)}: fungura ibimenyetso ukande ${B(c.fld.flags.review)}. ${B(c.fld.tabs.conflicts)}: ${B(c.fld.conflicts.accept)} cyangwa ${B(c.fld.conflicts.keep)}.`,
              ),
            },
            {
              text: p(
                `${B(c.fld.tabs.expenses)}: ${B(c.fld.exp.approve)} or ${B(c.fld.exp.reject)} each claim (${B(c.fld.exp.l1)}). ${B(c.fld.tabs.custody)}: click ${B(c.fld.custody.receive)} when originals come back. ${B(c.fld.tabs.visits)} lists all visits.`,
                `${B(c.fld.tabs.expenses)} : ${B(c.fld.exp.approve)} ou ${B(c.fld.exp.reject)} chaque dépense (${B(c.fld.exp.l1)}). ${B(c.fld.tabs.custody)} : cliquez ${B(c.fld.custody.receive)} au retour des originaux. ${B(c.fld.tabs.visits)} liste les visites.`,
                `${B(c.fld.tabs.expenses)}: ${B(c.fld.exp.approve)} cyangwa ${B(c.fld.exp.reject)} buri busabe (${B(c.fld.exp.l1)}). ${B(c.fld.tabs.custody)}: kanda ${B(c.fld.custody.receive)} inyandiko z'umwimerere zigarutse. ${B(c.fld.tabs.visits)} herekana ingendo zose.`,
              ),
            },
          ],
        },
        {
          id: "request",
          title: c.fld.create.title,
          steps: [
            {
              text: p(
                `Click ${B(c.fld.request)}. Fill ${B(c.fld.create.caseRef)}, ${B(c.fld.create.purpose)}, ${B(c.fld.create.vtitle)}, ${B(c.fld.create.address)}, ${B(c.fld.create.start)} / ${B(c.fld.create.end)}, the ${B(c.fld.create.checklist)} and the ${B(c.fld.create.assignee)}, then ${B(c.fld.create.save)}.`,
                `Cliquez ${B(c.fld.request)}. Remplissez ${B(c.fld.create.caseRef)}, ${B(c.fld.create.purpose)}, ${B(c.fld.create.vtitle)}, ${B(c.fld.create.address)}, ${B(c.fld.create.start)} / ${B(c.fld.create.end)}, la ${B(c.fld.create.checklist)} et l'${B(c.fld.create.assignee)}, puis ${B(c.fld.create.save)}.`,
                `Kanda ${B(c.fld.request)}. Uzuza ${B(c.fld.create.caseRef)}, ${B(c.fld.create.purpose)}, ${B(c.fld.create.vtitle)}, ${B(c.fld.create.address)}, ${B(c.fld.create.start)} / ${B(c.fld.create.end)}, ${B(c.fld.create.checklist)} na ${B(c.fld.create.assignee)}, ukande ${B(c.fld.create.save)}.`,
              ),
            },
          ],
          tips: [c.fld.exp.sod],
        },
      ],
    }),
  ),

  // ------------------------------------------------------------------ setup
  g(
    {
      slug: "catalogue-services",
      cat: "setup",
      minutes: 5,
      pages: ["/ops/catalogue"],
    },
    (c, p) => ({
      title: p(
        "Manage the service catalogue (create, pause, categories)",
        "Gérer le catalogue (créer, mettre en pause, catégories)",
        "Gucunga urutonde rwa serivisi (gukora, guhagarika, ibyiciro)",
      ),
      summary: c.cat.list.lede,
      keywords:
        "catalogue service create duplicate pause archive category price changes catalogue serivisi",
      sections: [
        {
          id: "list",
          title: c.cat.list.title,
          steps: [
            {
              text: menu(c, p, c.nav.catalogue),
              shot: "ops-catalogue",
              marks: p(
                ["New service", "Categories", "Search", "Status"],
                ["Nouveau service", "Catégories", "Recherche", "Statut"],
                ["Serivisi nshya", "Ibyiciro", "Gushakisha", "Imiterere"],
              ),
            },
            {
              text: p(
                `Search, or filter ${B(c.cat.list.allCategories)} / ${B(c.cat.list.allStatuses)}. Each row shows ${B(c.cat.list.cols.version)}, ${B(c.cat.list.cols.pricing)}, ${B(c.cat.list.cols.sla)} and ${B(c.cat.list.cols.active)}.`,
                `Cherchez, ou filtrez ${B(c.cat.list.allCategories)} / ${B(c.cat.list.allStatuses)}. Chaque ligne indique ${B(c.cat.list.cols.version)}, ${B(c.cat.list.cols.pricing)}, ${B(c.cat.list.cols.sla)} et ${B(c.cat.list.cols.active)}.`,
                `Shakisha, cyangwa uyungurure ${B(c.cat.list.allCategories)} / ${B(c.cat.list.allStatuses)}. Buri murongo werekana ${B(c.cat.list.cols.version)}, ${B(c.cat.list.cols.pricing)}, ${B(c.cat.list.cols.sla)} na ${B(c.cat.list.cols.active)}.`,
              ),
            },
            {
              text: p(
                `To pause a service, change its status menu to ${B(c.cat.serviceStatus.paused)}; set ${B(c.cat.serviceStatus.published)} to reopen it, or ${B(c.cat.serviceStatus.archived)} to retire it.`,
                `Pour mettre un service en pause, passez son menu de statut à ${B(c.cat.serviceStatus.paused)} ; ${B(c.cat.serviceStatus.published)} le rouvre, ${B(c.cat.serviceStatus.archived)} le retire.`,
                `Guhagarika serivisi, hindura imiterere yayo ujye kuri ${B(c.cat.serviceStatus.paused)}; ${B(c.cat.serviceStatus.published)} irayifungura, ${B(c.cat.serviceStatus.archived)} irayikuraho.`,
              ),
            },
            {
              text: p(
                `${B(c.cat.list.newService)}: enter ${B(c.cat.create.name)}, ${B(c.cat.create.slug)} and ${B(c.cat.create.category)}, then ${B(c.cat.create.submit)}. ${B(c.cat.list.duplicate)} copies an existing service.`,
                `${B(c.cat.list.newService)} : saisissez ${B(c.cat.create.name)}, ${B(c.cat.create.slug)} et ${B(c.cat.create.category)}, puis ${B(c.cat.create.submit)}. ${B(c.cat.list.duplicate)} copie un service existant.`,
                `${B(c.cat.list.newService)}: andika ${B(c.cat.create.name)}, ${B(c.cat.create.slug)} na ${B(c.cat.create.category)}, ukande ${B(c.cat.create.submit)}. ${B(c.cat.list.duplicate)} ikoporora serivisi isanzwe.`,
              ),
            },
            {
              text: p(
                `${B(c.cat.taxonomy.manage)}: ${B(c.cat.taxonomy.addCat)} or ${B(c.cat.taxonomy.addSub)}, with the name in all three languages, then ${B(c.cat.taxonomy.save)}.`,
                `${B(c.cat.taxonomy.manage)} : ${B(c.cat.taxonomy.addCat)} ou ${B(c.cat.taxonomy.addSub)}, avec le nom dans les trois langues, puis ${B(c.cat.taxonomy.save)}.`,
                `${B(c.cat.taxonomy.manage)}: ${B(c.cat.taxonomy.addCat)} cyangwa ${B(c.cat.taxonomy.addSub)}, izina mu ndimi eshatu, ukande ${B(c.cat.taxonomy.save)}.`,
              ),
            },
          ],
          warn: c.cat.taxonomy.delSvcBody,
        },
      ],
    }),
  ),

  g(
    {
      slug: "service-builder-and-pricing",
      cat: "setup",
      minutes: 8,
      pages: ["/ops/catalogue/"],
    },
    (c, p) => ({
      title: p(
        "Build a service: form, documents, prices, tiers, SLA and publish",
        "Construire un service : formulaire, documents, prix, formules, SLA et publication",
        "Kubaka serivisi: ifishi, inyandiko, ibiciro, ibyiciro, SLA no gutangaza",
      ),
      summary: p(
        "Open a service and walk through the builder steps. Changes autosave as a draft; prices go to Finance; publishing creates a new version.",
        "Ouvrez un service et suivez les étapes. Les changements sont enregistrés en brouillon ; les prix partent à la Finance ; la publication crée une version.",
        "Fungura serivisi unyure mu ntambwe. Impinduka zibikwa nk'umushinga; ibiciro bijya ku Mari; gutangaza bikora verisiyo nshya.",
      ),
      keywords:
        "builder form fields documents checklist deliverables pricing tiers bands sla publish version formulaire tarif ifishi igiciro",
      sections: [
        {
          id: "steps",
          title: c.cat.builder.rail,
          steps: [
            {
              text: p(
                `In ${B(c.nav.catalogue)}, click a service name. The left rail lists ${B(c.cat.builder.steps.details)}, ${B(c.cat.builder.steps.form)}, ${B(c.cat.builder.steps.documents)}, ${B(c.cat.builder.steps.checklist)}, ${B(c.cat.builder.steps.deliverables)}, ${B(c.cat.builder.steps.pricing)}, ${B(c.cat.builder.steps.sla)} and ${B(c.cat.builder.steps.versions)}.`,
                `Dans ${B(c.nav.catalogue)}, cliquez un service. La colonne gauche liste ${B(c.cat.builder.steps.details)}, ${B(c.cat.builder.steps.form)}, ${B(c.cat.builder.steps.documents)}, ${B(c.cat.builder.steps.checklist)}, ${B(c.cat.builder.steps.deliverables)}, ${B(c.cat.builder.steps.pricing)}, ${B(c.cat.builder.steps.sla)} et ${B(c.cat.builder.steps.versions)}.`,
                `Muri ${B(c.nav.catalogue)}, kanda serivisi. Ibumoso harimo ${B(c.cat.builder.steps.details)}, ${B(c.cat.builder.steps.form)}, ${B(c.cat.builder.steps.documents)}, ${B(c.cat.builder.steps.checklist)}, ${B(c.cat.builder.steps.deliverables)}, ${B(c.cat.builder.steps.pricing)}, ${B(c.cat.builder.steps.sla)} na ${B(c.cat.builder.steps.versions)}.`,
              ),
              shot: "ops-builder",
              marks: p(
                ["Builder steps", "Preview", "Publish"],
                ["Étapes", "Aperçu", "Publier"],
                ["Intambwe", "Reba mbere", "Tangaza"],
              ),
            },
            {
              text: p(
                `${B(c.cat.builder.steps.form)}: click a field in the ${B(c.cat.form.palette)} to add it, select it on the canvas and set ${B(c.cat.form.label)}, ${B(c.cat.form.required)}, ${B(c.cat.form.validation)} and the ${B(c.cat.form.visibility)}.`,
                `${B(c.cat.builder.steps.form)} : cliquez un champ dans la ${B(c.cat.form.palette)}, sélectionnez-le et réglez ${B(c.cat.form.label)}, ${B(c.cat.form.required)}, ${B(c.cat.form.validation)} et la ${B(c.cat.form.visibility)}.`,
                `${B(c.cat.builder.steps.form)}: kanda umwanya muri ${B(c.cat.form.palette)} uwongereho, uwuhitemo ushyireho ${B(c.cat.form.label)}, ${B(c.cat.form.required)}, ${B(c.cat.form.validation)} na ${B(c.cat.form.visibility)}.`,
              ),
            },
            {
              text: p(
                `${B(c.cat.builder.steps.documents)}: ${B(c.cat.docs.add)} with ${B(c.cat.docs.types)}, ${B(c.cat.docs.maxMb)}, ${B(c.cat.docs.expiry)}. ${B(c.cat.builder.steps.checklist)}: ${B(c.cat.checklist.generate)}. ${B(c.cat.builder.steps.deliverables)}: ${B(c.cat.deliverables.add)}.`,
                `${B(c.cat.builder.steps.documents)} : ${B(c.cat.docs.add)} avec ${B(c.cat.docs.types)}, ${B(c.cat.docs.maxMb)}, ${B(c.cat.docs.expiry)}. ${B(c.cat.builder.steps.checklist)} : ${B(c.cat.checklist.generate)}. ${B(c.cat.builder.steps.deliverables)} : ${B(c.cat.deliverables.add)}.`,
                `${B(c.cat.builder.steps.documents)}: ${B(c.cat.docs.add)} ufite ${B(c.cat.docs.types)}, ${B(c.cat.docs.maxMb)}, ${B(c.cat.docs.expiry)}. ${B(c.cat.builder.steps.checklist)}: ${B(c.cat.checklist.generate)}. ${B(c.cat.builder.steps.deliverables)}: ${B(c.cat.deliverables.add)}.`,
              ),
            },
          ],
        },
        {
          id: "pricing",
          title: c.cat.builder.steps.pricing,
          steps: [
            {
              text: p(
                `Open ${B(c.cat.builder.steps.pricing)}. Choose the ${B(c.cat.pricing.mode)}: ${B(c.cat.pricing.modes.fixed)}, ${B(c.cat.pricing.modes.range)} or ${B(c.cat.pricing.modes.quote)}.`,
                `Ouvrez ${B(c.cat.builder.steps.pricing)}. Choisissez le ${B(c.cat.pricing.mode)} : ${B(c.cat.pricing.modes.fixed)}, ${B(c.cat.pricing.modes.range)} ou ${B(c.cat.pricing.modes.quote)}.`,
                `Fungura ${B(c.cat.builder.steps.pricing)}. Hitamo ${B(c.cat.pricing.mode)}: ${B(c.cat.pricing.modes.fixed)}, ${B(c.cat.pricing.modes.range)} cyangwa ${B(c.cat.pricing.modes.quote)}.`,
              ),
              shot: "ops-builder-pricing",
              marks: p(
                ["Pricing mode", "Tiers", "Save pricing"],
                ["Mode de prix", "Formules", "Enregistrer"],
                ["Uburyo bw'igiciro", "Ibyiciro", "Bika"],
              ),
            },
            {
              text: p(
                `In ${B(c.cat.pricing.tiers)}, set ${B(c.cat.pricing.turnaround)}, ${B(c.cat.pricing.price)}, ${B(c.cat.pricing.govt)} and ${B(c.cat.pricing.available)} for each tier. For bands, use ${B(c.cat.pricing.addBand)} and test with the ${B(c.cat.pricing.calc)}.`,
                `Dans ${B(c.cat.pricing.tiers)}, réglez ${B(c.cat.pricing.turnaround)}, ${B(c.cat.pricing.price)}, ${B(c.cat.pricing.govt)} et ${B(c.cat.pricing.available)} par formule. Pour les tranches, ${B(c.cat.pricing.addBand)} et testez avec le ${B(c.cat.pricing.calc)}.`,
                `Muri ${B(c.cat.pricing.tiers)}, shyiraho ${B(c.cat.pricing.turnaround)}, ${B(c.cat.pricing.price)}, ${B(c.cat.pricing.govt)} na ${B(c.cat.pricing.available)} kuri buri cyiciro. Ku byiciro by'amafaranga, ${B(c.cat.pricing.addBand)} ugerageze na ${B(c.cat.pricing.calc)}.`,
              ),
            },
            {
              text: p(
                `Click ${B(c.cat.pricing.save)}. The new prices show ${B(c.cat.pricing.pendingFinance)} until Finance approves them.`,
                `Cliquez ${B(c.cat.pricing.save)}. Les nouveaux prix restent ${B(c.cat.pricing.pendingFinance)} jusqu'à l'accord de la Finance.`,
                `Kanda ${B(c.cat.pricing.save)}. Ibiciro bishya biguma ${B(c.cat.pricing.pendingFinance)} kugeza Imari ibyemeje.`,
              ),
            },
          ],
        },
        {
          id: "publish",
          title: c.cat.builder.steps.versions,
          steps: [
            {
              text: p(
                `${B(c.cat.builder.steps.sla)}: set the ${B(c.cat.sla.first)}, ${B(c.cat.sla.completion)} and ${B(c.cat.sla.pauses)}.`,
                `${B(c.cat.builder.steps.sla)} : réglez la ${B(c.cat.sla.first)}, la ${B(c.cat.sla.completion)} et les ${B(c.cat.sla.pauses)}.`,
                `${B(c.cat.builder.steps.sla)}: shyiraho ${B(c.cat.sla.first)}, ${B(c.cat.sla.completion)} na ${B(c.cat.sla.pauses)}.`,
              ),
            },
            {
              text: p(
                `Click ${B(c.cat.builder.preview)} to see the client view, then ${B(c.cat.builder.publish)}: write the ${B(c.cat.versions.summary)} and confirm. Requests already in flight stay on their version.`,
                `Cliquez ${B(c.cat.builder.preview)} pour la vue client, puis ${B(c.cat.builder.publish)} : écrivez le ${B(c.cat.versions.summary)} et confirmez. Les demandes en cours gardent leur version.`,
                `Kanda ${B(c.cat.builder.preview)} urebe uko umukiriya abibona, hanyuma ${B(c.cat.builder.publish)}: andika ${B(c.cat.versions.summary)} wemeze. Ubusabe buri mu nzira buguma kuri verisiyo yabwo.`,
              ),
            },
          ],
          faq: [
            {
              q: c.cat.versions.blocked,
              a: p(
                "The dialog lists what is missing: a name, a category, at least one field, or translations in every offered language.",
                "La fenêtre liste ce qui manque : un nom, une catégorie, au moins un champ ou des traductions.",
                "Idirishya ryerekana ibibura: izina, icyiciro, nibura umwanya umwe cyangwa ubusobanuro mu ndimi zose.",
              ),
            },
          ],
        },
      ],
    }),
  ),

  g(
    {
      slug: "statuses-settings",
      cat: "setup",
      minutes: 3,
      pages: ["/ops/settings/statuses"],
    },
    (c, p) => ({
      title: p("Sub-statuses", "Sous-statuts", "Imiterere y'imbere"),
      summary: c.st.lede,
      keywords: "status sub-status client visible colour statut imiterere",
      sections: [
        {
          id: "edit",
          title: c.st.title,
          steps: [
            {
              text: menu(c, p, c.nav.statuses),
              shot: "ops-statuses",
              marks: p(
                ["New sub-status", "List"],
                ["Nouveau", "Liste"],
                ["Gishya", "Urutonde"],
              ),
            },
            {
              text: p(
                `Click ${B(c.st.new)} (or N). Enter ${B(c.st.dialog.name)} in each language, choose ${B(c.st.dialog.maps)}, the ${B(c.st.dialog.clientText)}, a ${B(c.st.dialog.colour)} and ${B(c.st.dialog.visible)}, then ${B(c.st.dialog.create)}.`,
                `Cliquez ${B(c.st.new)} (ou N). Saisissez ${B(c.st.dialog.name)} dans chaque langue, choisissez ${B(c.st.dialog.maps)}, le ${B(c.st.dialog.clientText)}, une ${B(c.st.dialog.colour)} et ${B(c.st.dialog.visible)}, puis ${B(c.st.dialog.create)}.`,
                `Kanda ${B(c.st.new)} (cyangwa N). Andika ${B(c.st.dialog.name)} mu ndimi zose, uhitemo ${B(c.st.dialog.maps)}, ${B(c.st.dialog.clientText)}, ${B(c.st.dialog.colour)} na ${B(c.st.dialog.visible)}, ukande ${B(c.st.dialog.create)}.`,
              ),
            },
            {
              text: p(
                "Use the arrows to reorder, the switch to show or hide it for clients, and the pencil to edit or delete it.",
                "Les flèches changent l'ordre, l'interrupteur l'affiche ou le cache aux clients, le crayon permet de modifier ou supprimer.",
                "Imyambi ihindura uko bikurikirana, akabuto kabigaragaza cyangwa kakabihisha abakiriya, ikaramu ihindura cyangwa isiba.",
              ),
            },
          ],
          tips: [c.st.dialog.inUse.replace(/\{n\}\s*/, "")],
        },
      ],
    }),
  ),

  g(
    {
      slug: "compliance-rules",
      cat: "setup",
      minutes: 4,
      pages: ["/ops/compliance-rules"],
    },
    (c, p) => ({
      title: c.comp.title,
      summary: c.comp.lede,
      keywords:
        "compliance rule deadline rra rssb rdb reminder obligation conformité amategeko",
      sections: [
        {
          id: "rule",
          title: c.comp.sheet.titleNew,
          steps: [
            {
              text: menu(c, p, c.nav.complianceRules),
              shot: "ops-compliance",
              marks: p(
                ["New rule", "Search", "Rules"],
                ["Nouvelle règle", "Recherche", "Règles"],
                ["Itegeko rishya", "Gushakisha", "Amategeko"],
              ),
            },
            {
              text: p(
                `Click ${B(c.comp.new)}. Enter the ${B(c.comp.sheet.code)}, ${B(c.comp.sheet.authority)} and ${B(c.comp.sheet.label)} in all three languages.`,
                `Cliquez ${B(c.comp.new)}. Saisissez le ${B(c.comp.sheet.code)}, l'${B(c.comp.sheet.authority)} et le ${B(c.comp.sheet.label)} dans les trois langues.`,
                `Kanda ${B(c.comp.new)}. Andika ${B(c.comp.sheet.code)}, ${B(c.comp.sheet.authority)} na ${B(c.comp.sheet.label)} mu ndimi eshatu.`,
              ),
            },
            {
              text: p(
                `Set ${B(c.comp.sheet.kind)}, the day/month, ${B(c.comp.sheet.dueRule)}, ${B(c.comp.sheet.leadDays)}, ${B(c.comp.sheet.offsets)} and the ${B(c.comp.sheet.service)}. Check ${B(c.comp.sheet.preview)}, then ${B(c.comp.sheet.create)}.`,
                `Réglez ${B(c.comp.sheet.kind)}, le jour/mois, ${B(c.comp.sheet.dueRule)}, ${B(c.comp.sheet.leadDays)}, ${B(c.comp.sheet.offsets)} et le ${B(c.comp.sheet.service)}. Vérifiez ${B(c.comp.sheet.preview)}, puis ${B(c.comp.sheet.create)}.`,
                `Shyiraho ${B(c.comp.sheet.kind)}, umunsi/ukwezi, ${B(c.comp.sheet.dueRule)}, ${B(c.comp.sheet.leadDays)}, ${B(c.comp.sheet.offsets)} na ${B(c.comp.sheet.service)}. Reba ${B(c.comp.sheet.preview)}, ukande ${B(c.comp.sheet.create)}.`,
              ),
            },
            {
              text: p(
                `Use the ${B(c.comp.cols.active)} switch to turn a rule off, and ${B(c.comp.showInactive)} to find disabled rules.`,
                `L'interrupteur ${B(c.comp.cols.active)} désactive une règle ; ${B(c.comp.showInactive)} affiche les règles désactivées.`,
                `Akabuto ${B(c.comp.cols.active)} gahagarika itegeko; ${B(c.comp.showInactive)} yerekana ayahagaritswe.`,
              ),
            },
          ],
          tips: [c.comp.unverifiedHint],
        },
      ],
    }),
  ),

  g(
    {
      slug: "knowledge-and-assistant",
      cat: "setup",
      minutes: 6,
      pages: ["/ops/knowledge", "/ops/assistant"],
    },
    (c, p) => ({
      title: p(
        "Knowledge base and assistant console",
        "Base de connaissances et console de l'assistant",
        "Ububiko bw'ubumenyi n'umufasha",
      ),
      summary: p(
        "Approve what the AI assistant may answer from, test it, and follow its sessions, handoffs, unanswered questions, evals and spend.",
        "Approuvez les sources de l'assistant IA, testez-le, et suivez sessions, transferts, questions sans réponse, évaluations et coûts.",
        "Emeza ibyo umufasha wa AI ashobora gusubirizaho, umugerageze, ukurikirane ibiganiro, ibyoherejwe, ibibazo bitasubijwe, isuzuma n'amafaranga.",
      ),
      keywords:
        "knowledge base kb source approve facts tone reindex assistant ai sessions handoff evals spend ububiko umufasha",
      sections: [
        {
          id: "kb",
          title: c.bk.staff.kbTitle,
          steps: [
            {
              text: menu(c, p, c.nav.knowledge),
              shot: "ops-knowledge",
              marks: p(
                ["Search", "Types", "Sources"],
                ["Recherche", "Types", "Sources"],
                ["Gushakisha", "Ubwoko", "Inkomoko"],
              ),
            },
            {
              text: p(
                `Filter by type tab, ${B(c.bk.staff.kbCols.locale)}, ${B(c.bk.staff.kbCols.status)} or ${B(c.bk.staff.staleOnly)}. Click a source to review it.`,
                `Filtrez par onglet, ${B(c.bk.staff.kbCols.locale)}, ${B(c.bk.staff.kbCols.status)} ou ${B(c.bk.staff.staleOnly)}. Cliquez une source pour la revoir.`,
                `Yungurura ukoresheje igice, ${B(c.bk.staff.kbCols.locale)}, ${B(c.bk.staff.kbCols.status)} cyangwa ${B(c.bk.staff.staleOnly)}. Kanda inkomoko uyisuzume.`,
              ),
            },
            {
              text: p(
                `Read the ${B(c.bk.staff.preview)}, the ${B(c.bk.staff.diff)} and any ${B(c.bk.staff.flags)}. Under ${B(c.bk.staff.action)} choose ${B(c.bk.staff.approveFacts)}, ${B(c.bk.staff.exclude)} or ${B(c.bk.staff.requestChanges)}, set ${B(c.bk.staff.reviewByDate)} and click ${B(c.bk.staff.submit)}.`,
                `Lisez le ${B(c.bk.staff.preview)}, les ${B(c.bk.staff.diff)} et les ${B(c.bk.staff.flags)}. Sous ${B(c.bk.staff.action)}, choisissez ${B(c.bk.staff.approveFacts)}, ${B(c.bk.staff.exclude)} ou ${B(c.bk.staff.requestChanges)}, réglez ${B(c.bk.staff.reviewByDate)} et cliquez ${B(c.bk.staff.submit)}.`,
                `Soma ${B(c.bk.staff.preview)}, ${B(c.bk.staff.diff)} na ${B(c.bk.staff.flags)}. Munsi ya ${B(c.bk.staff.action)} hitamo ${B(c.bk.staff.approveFacts)}, ${B(c.bk.staff.exclude)} cyangwa ${B(c.bk.staff.requestChanges)}, ushyireho ${B(c.bk.staff.reviewByDate)} ukande ${B(c.bk.staff.submit)}.`,
              ),
            },
            {
              text: p(
                `Back on the list, ${B(c.bk.staff.reindex)} refreshes the index; ask a question in the ${B(c.bk.staff.test)} to check the answer.`,
                `Sur la liste, ${B(c.bk.staff.reindex)} rafraîchit l'index ; posez une question dans la ${B(c.bk.staff.test)} pour vérifier la réponse.`,
                `Ku rutonde, ${B(c.bk.staff.reindex)} ivugurura; baza ikibazo muri ${B(c.bk.staff.test)} urebe igisubizo.`,
              ),
            },
          ],
          tips: [p("Marketing approves tone only; a service manager approves facts.", "Le marketing approuve le ton ; un responsable de service approuve les faits.", "Ishami ry'ubucuruzi ryemeza imvugo gusa; umuyobozi wa serivisi yemeza ukuri kw'amakuru.")],
        },
        {
          id: "console",
          title: c.bk.staff.consoleTitle,
          steps: [
            {
              text: menu(c, p, c.nav.assistant),
              shot: "ops-assistant",
              marks: p(["Console tabs"], ["Onglets"], ["Ibice"]),
            },
            {
              text: p(
                `${B(c.bk.staff.cTabs.sessions)}: filter by ${B(c.bk.staff.sCols.outcome)}, ${B(c.bk.staff.sCols.lang)} or ${B(c.bk.staff.sCols.rating)} and open a session for its ${B(c.bk.staff.transcript)}. ${B(c.bk.staff.cTabs.handoffs)}: ${B(c.bk.staff.claim)} a conversation the assistant passed to a human.`,
                `${B(c.bk.staff.cTabs.sessions)} : filtrez par ${B(c.bk.staff.sCols.outcome)}, ${B(c.bk.staff.sCols.lang)} ou ${B(c.bk.staff.sCols.rating)} et ouvrez une session pour sa ${B(c.bk.staff.transcript)}. ${B(c.bk.staff.cTabs.handoffs)} : ${B(c.bk.staff.claim)} une conversation transmise à un humain.`,
                `${B(c.bk.staff.cTabs.sessions)}: yungurura ukurikije ${B(c.bk.staff.sCols.outcome)}, ${B(c.bk.staff.sCols.lang)} cyangwa ${B(c.bk.staff.sCols.rating)} ufungure ikiganiro urebe ${B(c.bk.staff.transcript)}. ${B(c.bk.staff.cTabs.handoffs)}: ${B(c.bk.staff.claim)} ikiganiro umufasha yohereje ku muntu.`,
              ),
            },
            {
              text: p(
                `${B(c.bk.staff.cTabs.unanswered)}: ${B(c.bk.staff.createFaq)} for frequent questions. ${B(c.bk.staff.cTabs.evals)}: ${B(c.bk.staff.runEvals)}. ${B(c.bk.staff.cTabs.spend)}: monthly budget and on/off switch.`,
                `${B(c.bk.staff.cTabs.unanswered)} : ${B(c.bk.staff.createFaq)} pour les questions fréquentes. ${B(c.bk.staff.cTabs.evals)} : ${B(c.bk.staff.runEvals)}. ${B(c.bk.staff.cTabs.spend)} : budget mensuel et interrupteur.`,
                `${B(c.bk.staff.cTabs.unanswered)}: ${B(c.bk.staff.createFaq)} ku bibazo bikunze kubazwa. ${B(c.bk.staff.cTabs.evals)}: ${B(c.bk.staff.runEvals)}. ${B(c.bk.staff.cTabs.spend)}: ingengo y'imari y'ukwezi n'akabuto ko kuyifungura.`,
              ),
            },
          ],
          tips: [p("Only system administrators can change the budget and the on/off switch.", "Seuls les administrateurs système peuvent changer le budget et l'interrupteur.", "Abayobozi ba sisitemu ni bo bonyine bahindura ingengo y'imari n'akabuto ko gufungura.")],
        },
      ],
    }),
  ),
];

export const OPS_WS: WsGuideSet = {
  workspace: "ops",
  cats: CATS,
  guides: GUIDES,
};
