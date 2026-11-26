import type { Locale } from "@/shared/i18n/config";
import type { GuideText, Step } from "../types";
import type { WsGuide, WsGuideSet } from "./index";

// marketing dashboard guides. rw/fr are drafts for native review.
// Some editor/media/SEO labels have no fr/rw copy yet (mkt-content.ts falls back to English), so those guides quote the English label the screen shows.
const U = "2026-11-26";
const st = (text: string, shot?: string, marks?: string[]): Step => ({
  text,
  ...(shot ? { shot } : {}),
  ...(marks ? { marks } : {}),
});
const G = (
  slug: string,
  cat: string,
  minutes: number,
  pages: string[],
  t: Record<Locale, GuideText>,
  start?: boolean,
): WsGuide => ({
  slug,
  cat,
  minutes,
  updated: U,
  pages,
  t,
  ...(start ? { start } : {}),
});

const guides: WsGuide[] = [
  // ───────────── Getting started
  G(
    "marketing-overview",
    "start",
    3,
    ["/marketing"],
    {
      en: {
        title: "Read the marketing overview",
        summary:
          "What the Overview screen shows each morning and where each tile takes you.",
        facts: { who: "Marketing team", time: "3 minutes" },
        sections: [
          {
            id: "read",
            title: "Read the overview",
            steps: [
              st(
                "Click **Overview** in the side menu. The page greets you and shows what needs you today (new leads, items awaiting approval, broken links).",
                "marketing-overview",
                ["Period", "New campaign", "Key figures"],
              ),
              st(
                "Pick a period: **Today**, **7 days**, **30 days**, **90 days** or **Custom**. Every figure on the page follows it.",
              ),
              st(
                "Read the tiles **Visitors**, **Leads**, **Consultations booked**, **Paid clients** and **Revenue attributed**. Click a tile to open its detail screen.",
              ),
              st(
                "Scroll to **Conversion funnel**, **Leads by source** and **Campaign ROI**. Click a campaign name to open it.",
              ),
              st(
                "In **Active automations**, use the switch to turn a sequence off. A confirmation tells you how many people are mid-sequence; click **Turn off** only if you are sure.",
              ),
              st(
                "Click **New campaign** (top right) to start a campaign straight from here.",
              ),
            ],
            tips: [
              "If **Visitors** says “Traffic unavailable · GA4 not connected”, connect GA4 in **SEO & tracking** › **Analytics**.",
              "A first-week checklist appears until GA4, the Meta Pixel, a segment and a landing page are set up.",
            ],
          },
        ],
      },
      fr: {
        title: "Lire la vue d'ensemble marketing",
        summary:
          "Ce que montre l'écran Vue d'ensemble et où mène chaque tuile.",
        facts: { who: "Équipe marketing", time: "3 minutes" },
        sections: [
          {
            id: "read",
            title: "Lire la vue d'ensemble",
            steps: [
              st(
                "Cliquez sur **Vue d'ensemble** dans le menu latéral. La page vous salue et indique ce qui vous attend (nouveaux prospects, éléments en attente de validation, liens cassés).",
                "marketing-overview",
                ["Période", "Nouvelle campagne", "Chiffres clés"],
              ),
              st(
                "Choisissez une période : **Aujourd'hui**, **7 jours**, **30 jours**, **90 jours** ou **Personnalisé**. Tous les chiffres la suivent.",
              ),
              st(
                "Lisez les tuiles **Visiteurs**, **Prospects**, **Consultations réservées**, **Clients payants** et **Revenu attribué**. Cliquez sur une tuile pour ouvrir son écran détaillé.",
              ),
              st(
                "Descendez jusqu'à **Entonnoir de conversion**, **Prospects par source** et **ROI des campagnes**. Cliquez sur le nom d'une campagne pour l'ouvrir.",
              ),
              st(
                "Dans **Automatisations actives**, l'interrupteur désactive une séquence. Une confirmation indique combien de personnes sont en cours ; cliquez sur **Désactiver** seulement si vous êtes sûr.",
              ),
              st(
                "Cliquez sur **Nouvelle campagne** (en haut à droite) pour lancer une campagne depuis cet écran.",
              ),
            ],
            tips: [
              "Si **Visiteurs** affiche « Trafic indisponible · GA4 non connecté », connectez GA4 dans **SEO et suivi** › **Analytics**.",
              "Une liste de démarrage s'affiche tant que GA4, le Meta Pixel, un segment et une page d'atterrissage ne sont pas prêts.",
            ],
          },
        ],
      },
      rw: {
        title: "Soma incamake y'ubucuruzi",
        summary:
          "Ibyo urupapuro rw'Incamake rwerekana n'aho buri kadirishya kakujyana.",
        facts: { who: "Itsinda ry'ubucuruzi", time: "Iminota 3" },
        sections: [
          {
            id: "read",
            title: "Soma incamake",
            steps: [
              st(
                "Kanda **Incamake** mu rutonde rw'ibumoso. Urupapuro rukuramutsa kandi rukerekana ibigutegereje (abashobora kuba abakiriya bashya, ibitegereje kwemezwa, amahuza yapfuye).",
                "marketing-overview",
                ["Igihe", "Ubukangurambaga bushya", "Imibare y'ingenzi"],
              ),
              st(
                "Hitamo igihe: **Uyu munsi**, **Iminsi 7**, **Iminsi 30**, **Iminsi 90** cyangwa **Hitamo**. Imibare yose irabikurikiza.",
              ),
              st(
                "Soma udusanduku tw'imibare. Kanda ku gasanduku kugira ngo ufungure urupapuro rwako rurambuye.",
              ),
              st(
                "Manuka ugere kuri **Urugendo rwo guhinduka umukiriya** na **Inyungu y'ubukangurambaga**. Kanda izina ry'ubukangurambaga kugira ngo ubufungure.",
              ),
              st(
                "Muri **Ikurikiranya rikora**, buto yo guhinduranya ihagarika ikurikiranya. Ubutumwa bukwereka abantu bangahe barimo; kanda **Hagarika** ari uko ubyizeye.",
              ),
              st(
                "Kanda **Ubukangurambaga bushya** (hejuru iburyo) kugira ngo utangire ubukangurambaga uhereye aha.",
              ),
            ],
            tips: [
              "Niba abasura batagaragara kuko GA4 itahujwe, yihuze muri **SEO n'ikurikirana** › **Analytics**.",
            ],
          },
        ],
      },
    },
    true,
  ),

  G(
    "marketing-help-button",
    "start",
    1,
    ["/marketing"],
    {
      en: {
        title: "Find a guide with the Help button",
        summary:
          "Open the guides for the screen you are on, from anywhere in the marketing dashboard.",
        sections: [
          {
            id: "open",
            title: "Open help",
            steps: [
              st(
                "Click **Help** (the “?” button at the top of the page).",
                "marketing-help",
                ["Help"],
              ),
              st(
                "The **Guides** panel opens. **For this page** lists the guides for the screen you are on; **New here? Start with these** lists the first-day guides.",
              ),
              st(
                "Type in the search box to find any guide, for example “publish” or “segment”.",
              ),
              st(
                "Click a guide to read it. Use the back link to return to the list, or close the panel.",
              ),
            ],
            tips: [
              "Every guide is also listed under **Guides** at the bottom of the side menu.",
            ],
          },
        ],
      },
      fr: {
        title: "Trouver un guide avec le bouton Aide",
        summary:
          "Ouvrir les guides de l'écran où vous êtes, partout dans le tableau marketing.",
        sections: [
          {
            id: "open",
            title: "Ouvrir l'aide",
            steps: [
              st(
                "Cliquez sur **Aide** (le bouton « ? » en haut de la page).",
                "marketing-help",
                ["Aide"],
              ),
              st(
                "Le panneau **Guides** s'ouvre. **Pour cette page** liste les guides de l'écran ; **Nouveau ? Commencez ici** liste les guides du premier jour.",
              ),
              st(
                "Tapez dans la recherche pour trouver un guide, par exemple « publier » ou « segment ».",
              ),
              st(
                "Cliquez sur un guide pour le lire. Le lien retour ramène à la liste ; vous pouvez aussi fermer le panneau.",
              ),
            ],
            tips: [
              "Tous les guides sont aussi sous **Guides**, en bas du menu latéral.",
            ],
          },
        ],
      },
      rw: {
        title: "Shaka amabwiriza ukoresheje buto y'Ubufasha",
        summary:
          "Fungura amabwiriza y'urupapuro uriho, aho waba uri hose mu bucuruzi.",
        sections: [
          {
            id: "open",
            title: "Fungura ubufasha",
            steps: [
              st(
                "Kanda **Ubufasha** (buto « ? » iri hejuru ku rupapuro).",
                "marketing-help",
                ["Ubufasha"],
              ),
              st(
                "Akadirishya **Amabwiriza** karafunguka. **Kuri iyi paji** herekana amabwiriza y'urupapuro uriho; **Uri mushya? Tangirira aha** herekana ay'umunsi wa mbere.",
              ),
              st(
                "Andika mu ishakiro kugira ngo ubone amabwiriza, urugero « tangaza » cyangwa « itsinda ».",
              ),
              st(
                "Kanda ku mabwiriza kugira ngo uyasome. Subira ku rutonde cyangwa ufunge akadirishya.",
              ),
            ],
            tips: [
              "Amabwiriza yose ari no muri **Amabwiriza** hasi mu rutonde rw'ibumoso.",
            ],
          },
        ],
      },
    },
    true,
  ),

  // ───────────── Content & publishing
  G(
    "marketing-content-create",
    "content",
    3,
    [
      "/marketing/content",
      "/marketing/landing",
      "/marketing/knowledge",
      "/marketing/updates",
    ],
    {
      en: {
        title: "Find and create a page",
        summary:
          "Use the content list to find a page, then create a new one in the right first language.",
        facts: {
          who: "Marketing team (service managers can open content to review it)",
          time: "3 minutes",
        },
        sections: [
          {
            id: "find",
            title: "Find a page",
            steps: [
              st(
                "Click **Content** in the side menu. **Pages & blocks** lists pages, team profiles and legal pages.",
                "marketing-content",
                ["New page", "Views", "Search", "Page row"],
              ),
              st(
                "Pick a view: **All**, **Published**, **Draft**, **In review**, **Scheduled** or **Stale**.",
              ),
              st(
                "Type in **Search by title** and press Enter. Use **Type** to switch between **Page**, **Team member** and **Legal page**.",
              ),
              st(
                "Each row shows the languages (ready, missing, outdated or needs review) and the status. Click the title or **Edit** to open the editor; **Duplicate** makes a copy.",
              ),
            ],
          },
          {
            id: "create",
            title: "Create a page",
            steps: [
              st(
                "Click **New page** (the button names the type you filtered on).",
                "marketing-content-new",
                ["Title", "First language"],
              ),
              st(
                "Type the **Title**. The web address is made from it; you can change it later.",
              ),
              st("Choose the **First language** you will write in."),
              st(
                "Click **Create and edit**. The editor opens on a draft that nobody outside the team can see.",
              ),
            ],
            tips: [
              "Prices come from the service catalogue. Don't type amounts in text: they won't update when prices change.",
            ],
          },
        ],
      },
      fr: {
        title: "Trouver et créer une page",
        summary:
          "Utiliser la liste de contenu pour trouver une page, puis en créer une dans la bonne langue de départ.",
        facts: {
          who: "Équipe marketing (les responsables de service ouvrent le contenu pour le relire)",
          time: "3 minutes",
        },
        sections: [
          {
            id: "find",
            title: "Trouver une page",
            steps: [
              st(
                "Cliquez sur **Contenu** dans le menu latéral. **Pages et blocs** liste les pages, profils d'équipe et pages légales.",
                "marketing-content",
                ["Nouvelle page", "Vues", "Recherche", "Ligne"],
              ),
              st(
                "Choisissez une vue : **Tous**, **Publiés**, **Brouillons**, **En relecture**, **Programmés** ou **À revoir**.",
              ),
              st(
                "Tapez dans **Rechercher par titre** puis Entrée. **Type** bascule entre page, membre d'équipe et page légale.",
              ),
              st(
                "Chaque ligne montre les langues (prête, manquante, obsolète, à relire) et le statut. Cliquez sur le titre ou **Modifier** pour ouvrir l'éditeur ; **Dupliquer** crée une copie.",
              ),
            ],
          },
          {
            id: "create",
            title: "Créer une page",
            steps: [
              st(
                "Cliquez sur **Nouveau : page** (le bouton reprend le type filtré).",
                "marketing-content-new",
                ["Titre", "Première langue"],
              ),
              st(
                "Saisissez le **Titre**. L'adresse web en est tirée ; modifiable ensuite.",
              ),
              st("Choisissez la **Première langue** de rédaction."),
              st(
                "Cliquez sur **Créer et modifier**. L'éditeur s'ouvre sur un brouillon invisible hors de l'équipe.",
              ),
            ],
            tips: [
              "Les prix viennent du catalogue. Ne tapez pas de montants : ils ne suivraient pas les changements de prix.",
            ],
          },
        ],
      },
      rw: {
        title: "Shaka kandi ukore urupapuro",
        summary:
          "Koresha urutonde rw'ibikubiyemo ushake urupapuro, hanyuma ukore urushya mu rurimi rubanza rukwiye.",
        facts: {
          who: "Itsinda ry'ubucuruzi (abayobozi ba serivisi barafungura ngo basuzume)",
          time: "Iminota 3",
        },
        sections: [
          {
            id: "find",
            title: "Shaka urupapuro",
            steps: [
              st(
                "Kanda **Ibikubiyemo** mu rutonde rw'ibumoso. **Amapaji n'ibice** herekana amapaji, abakozi n'amapaji y'amategeko.",
                "marketing-content",
                ["Ipaji nshya", "Ibyiciro", "Ishakiro", "Umurongo"],
              ),
              st(
                "Hitamo icyiciro: **Byose**, **Byatangajwe**, **Imishinga**, **Birasuzumwa**, **Biteganyijwe** cyangwa **Bikeneye kuvugururwa**.",
              ),
              st(
                "Andika mu ishakiro ukande Enter. **Type** ihindura ubwoko bw'urupapuro.",
              ),
              st(
                "Buri murongo werekana indimi n'aho bigeze. Kanda umutwe cyangwa **Edit** ufungure muhinduzi; **Duplicate** ikora kopi.",
              ),
            ],
          },
          {
            id: "create",
            title: "Kora urupapuro",
            steps: [
              st(
                "Kanda **New page** (buto yitwa ubwoko wahisemo).",
                "marketing-content-new",
                ["Umutwe", "Ururimi rwa mbere"],
              ),
              st(
                "Andika **Title**. Aderesi y'urubuga ikorwa uhereye ku mutwe; ushobora kuyihindura nyuma.",
              ),
              st("Hitamo **First language** uzandikamo."),
              st(
                "Kanda **Create and edit**. Muhinduzi irafunguka ku mushinga utagaragara hanze y'itsinda.",
              ),
            ],
            tips: [
              "Ibiciro biva mu rutonde rwa serivisi. Ntukandike amafaranga mu nyandiko: ntazahinduka iyo ibiciro bihindutse.",
            ],
          },
        ],
      },
    },
    true,
  ),

  G(
    "marketing-content-edit",
    "content",
    5,
    [
      "/marketing/content",
      "/marketing/landing",
      "/marketing/knowledge",
      "/marketing/updates",
    ],
    {
      en: {
        title: "Edit a page with blocks (and order the home page)",
        summary:
          "Add, move, hide and fill blocks in the editor. Changes save on their own.",
        sections: [
          {
            id: "blocks",
            title: "Work with blocks",
            steps: [
              st(
                "Open a page from the list. The editor shows **Structure** (left), the **Canvas** (middle) and the side panels (right).",
                "marketing-editor",
                ["Structure", "Add block", "Canvas", "Panels"],
              ),
              st(
                "Click **Add block** and pick one (Heading, Text, Image, Button, FAQ list, Steps, Table, Form…). It is added after the selected block. In an empty Text block you can also type **/**.",
              ),
              st(
                "Click a block in the canvas or structure. Its settings open on the right: type the text, choose an image, set a link.",
              ),
              st(
                "Use the arrows to **Move up** / **Move down**, the eye to **Hide** / **Show**, ⧉ to **Duplicate block** and × to **Remove block** (a toast lets you **Undo**).",
              ),
              st(
                "Switch **Desktop** / **Phone** above the canvas to check the layout; **Live preview** shows the page as visitors will see it.",
              ),
              st(
                "Watch the save status at the top: “Saving…”, then “Saved”. Offline, edits are kept on this device until you reconnect.",
              ),
            ],
          },
          {
            id: "home",
            title: "Change the order of home page sections",
            steps: [
              st(
                "Search the **Content** list for the home page and open it. Its blocks are named **Home · Hero**, **Home · Services**, **Home · How it works** and so on.",
              ),
              st(
                "Use **Move up** / **Move down** in **Structure** to reorder sections, and **Hide** to take one off the home page.",
              ),
              st(
                "**Home · Hero** holds the page heading: it can't be removed or hidden.",
              ),
              st(
                "The new order goes live only after the page is approved and published (see “Publish a page”).",
              ),
            ],
            tips: [
              "If someone else is editing, a banner says so. **Edit anyway** may create a conflict; you then choose **Keep mine as new draft** or **Take theirs**.",
            ],
          },
        ],
      },
      fr: {
        title: "Modifier une page par blocs (et l'ordre de l'accueil)",
        summary:
          "Ajouter, déplacer, masquer et remplir des blocs. L'enregistrement est automatique.",
        sections: [
          {
            id: "blocks",
            title: "Travailler avec les blocs",
            steps: [
              st(
                "Ouvrez une page depuis la liste. L'éditeur montre la **Structure** (gauche), le **Canvas** (centre) et les panneaux (droite).",
                "marketing-editor",
                ["Structure", "Ajouter un bloc", "Canvas", "Panneaux"],
              ),
              st(
                "Cliquez sur **Ajouter un bloc** et choisissez-en un. Il s'insère après le bloc sélectionné. Dans un bloc texte vide, tapez aussi **/**.",
              ),
              st(
                "Cliquez sur un bloc : ses réglages s'ouvrent à droite (texte, image, lien).",
              ),
              st(
                "Les flèches déplacent le bloc (**Move up** / **Move down**), l'œil le masque (**Hide**), ⧉ le duplique et × le supprime (un message propose **Annuler**).",
              ),
              st(
                "Basculez **Desktop** / **Phone** au-dessus du canvas ; **Aperçu réel** montre la page comme les visiteurs la verront.",
              ),
              st(
                "Suivez l'état en haut : « Enregistrement… » puis « Enregistré ». Hors ligne, les modifications restent sur l'appareil.",
              ),
            ],
          },
          {
            id: "home",
            title: "Changer l'ordre des sections de l'accueil",
            steps: [
              st(
                "Cherchez la page d'accueil dans **Contenu** et ouvrez-la. Ses blocs s'appellent **Home · Hero**, **Home · Services**, **Home · How it works**, etc.",
              ),
              st(
                "Utilisez **Move up** / **Move down** dans **Structure** pour réordonner, et **Hide** pour retirer une section.",
              ),
              st(
                "**Home · Hero** porte le titre de la page : il ne peut être ni supprimé ni masqué.",
              ),
              st(
                "Le nouvel ordre n'est en ligne qu'après validation et publication (voir « Publier une page »).",
              ),
            ],
            tips: [
              "Si quelqu'un d'autre modifie la page, un bandeau l'indique. **Edit anyway** peut créer un conflit : vous choisirez alors **Keep mine as new draft** ou **Take theirs**.",
            ],
          },
        ],
      },
      rw: {
        title:
          "Hindura urupapuro ukoresheje ibice (n'uko ahabanza hakurikirana)",
        summary:
          "Ongeraho, imura, hisha kandi wuzuze ibice. Impinduka zibikwa ubwazo.",
        sections: [
          {
            id: "blocks",
            title: "Gukoresha ibice",
            steps: [
              st(
                "Fungura urupapuro uhereye ku rutonde. Muhinduzi yerekana **Structure** (ibumoso), **Canvas** (hagati) n'udusanduku tw'igenamiterere (iburyo).",
                "marketing-editor",
                ["Imiterere", "Ongeraho igice", "Canvas", "Udusanduku"],
              ),
              st(
                "Kanda **Ongeraho igice** uhitemo kimwe. Cyongerwa nyuma y'igice cyatoranyijwe. Mu gice cy'inyandiko kirimo ubusa ushobora no kwandika **/**.",
              ),
              st(
                "Kanda ku gice: igenamiterere ryacyo rifunguka iburyo (inyandiko, ifoto, ihuza).",
              ),
              st(
                "Imyambi yimura igice (**Move up** / **Move down**), ijisho rirakihisha (**Hide**), ⧉ irakigana, × irakisiba (ubutumwa bugufasha **Subiza**).",
              ),
              st(
                "Hinduranya **Desktop** / **Phone** hejuru ya canvas; **Uko bizagaragara** herekana uko abasura bazabona urupapuro.",
              ),
              st(
                "Reba hejuru: « Birabikwa… » hanyuma « Byabitswe ». Nta murandasi, impinduka zibikwa kuri iki gikoresho.",
              ),
            ],
          },
          {
            id: "home",
            title: "Hindura uko ibice by'ahabanza bikurikirana",
            steps: [
              st(
                "Shaka urupapuro rw'ahabanza muri **Ibikubiyemo** urufungure. Ibice byarwo byitwa **Home · Hero**, **Home · Services**, **Home · How it works** n'ibindi.",
              ),
              st(
                "Koresha **Move up** / **Move down** muri **Structure** kugira ngo uhindure uko bikurikirana, na **Hide** kugira ngo ukureho igice.",
              ),
              st(
                "**Home · Hero** ifite umutwe w'urupapuro: ntishobora gusibwa cyangwa guhishwa.",
              ),
              st(
                "Uko bikurikirana bishya bigaragara ari uko urupapuro rwemejwe kandi rwatangajwe (reba « Tangaza urupapuro »).",
              ),
            ],
            tips: [
              "Niba undi muntu arimo guhindura, ubutumwa burabikwereka. **Edit anyway** ishobora guteza amakimbirane: uzahitamo **Keep mine as new draft** cyangwa **Take theirs**.",
            ],
          },
        ],
      },
    },
  ),

  G(
    "marketing-content-translate",
    "content",
    4,
    [
      "/marketing/content",
      "/marketing/landing",
      "/marketing/knowledge",
      "/marketing/updates",
      "/marketing/faqs",
    ],
    {
      en: {
        title: "Translate a page into Kinyarwanda, English and French",
        summary:
          "Each page has one version per language. Create the missing ones and review machine drafts.",
        sections: [
          {
            id: "lang",
            title: "Add a language version",
            steps: [
              st(
                "In the editor, use the language tabs at the top (**Kinyarwanda**, **English**, **Français**) to switch version. Your edits are saved before switching.",
                "marketing-editor-lang",
                ["Languages", "Compare languages", "Copy preview link"],
              ),
              st(
                "If the language doesn't exist yet you see “Not translated yet”. Click **Copy from English** to start from the English text, or **Start blank**.",
              ),
              st(
                "A copied version is marked “Machine draft: needs review”. Read and correct it, then click **Mark as reviewed**.",
              ),
              st(
                "Click **Compare languages** to see the versions side by side while you edit.",
              ),
              st(
                "Remember per language: title, web address, SEO fields and image alt text.",
              ),
            ],
            warn: "A machine draft that is not reviewed blocks publishing of that language.",
            tips: [
              "Blocks (layout) are shared by all languages; only the text differs.",
            ],
          },
        ],
      },
      fr: {
        title: "Traduire une page en kinyarwanda, anglais et français",
        summary:
          "Chaque page a une version par langue. Créez celles qui manquent et relisez les brouillons automatiques.",
        sections: [
          {
            id: "lang",
            title: "Ajouter une version linguistique",
            steps: [
              st(
                "Dans l'éditeur, les onglets de langue en haut (**Kinyarwanda**, **English**, **Français**) changent de version. Vos modifications sont enregistrées avant.",
                "marketing-editor-lang",
                ["Langues", "Comparer", "Lien d'aperçu"],
              ),
              st(
                "Si la langue n'existe pas, vous voyez « Pas encore traduit ». Cliquez sur **Copier depuis l'anglais** ou **Partir de zéro**.",
              ),
              st(
                "Une version copiée est marquée « Machine draft: needs review ». Relisez, corrigez, puis cliquez sur **Mark as reviewed**.",
              ),
              st(
                "Cliquez sur **Compare languages** pour voir les versions côte à côte.",
              ),
              st(
                "Par langue : titre, adresse web, champs SEO et texte alternatif des images.",
              ),
            ],
            warn: "Un brouillon automatique non relu bloque la publication de cette langue.",
            tips: [
              "Les blocs (mise en page) sont communs ; seul le texte change.",
            ],
          },
        ],
      },
      rw: {
        title: "Hindura urupapuro mu Kinyarwanda, Icyongereza n'Igifaransa",
        summary:
          "Buri rupapuro rufite verisiyo kuri buri rurimi. Kora izibura kandi usuzume izakozwe na mashini.",
        sections: [
          {
            id: "lang",
            title: "Ongeraho verisiyo y'ururimi",
            steps: [
              st(
                "Muri muhinduzi, koresha indimi ziri hejuru (**Kinyarwanda**, **English**, **Français**) uhindure verisiyo. Impinduka zawe zibanza kubikwa.",
                "marketing-editor-lang",
                ["Indimi", "Gereranya", "Ihuza ryo kureba"],
              ),
              st(
                "Niba ururimi rutarakorwa, ubona « Ntibirahindurwa ». Kanda **Kopa mu Cyongereza** cyangwa **Tangira ubusa**.",
              ),
              st(
                "Verisiyo yakopwe yandikwaho « Machine draft: needs review ». Yisome uyikosore, hanyuma ukande **Mark as reviewed**.",
              ),
              st(
                "Kanda **Compare languages** kugira ngo ubone verisiyo zombi iruhande rumwe.",
              ),
              st(
                "Kuri buri rurimi: umutwe, aderesi, SEO n'inyandiko isobanura amafoto (alt).",
              ),
            ],
            warn: "Verisiyo ya mashini idasuzumwe ibuza gutangaza urwo rurimi.",
            tips: [
              "Ibice (imiterere) ni bimwe mu ndimi zose; inyandiko ni yo itandukana.",
            ],
          },
        ],
      },
    },
  ),

  G(
    "marketing-content-submit",
    "content",
    2,
    [
      "/marketing/content",
      "/marketing/landing",
      "/marketing/knowledge",
      "/marketing/updates",
    ],
    {
      en: {
        title: "Submit a page for review",
        summary:
          "Send a finished draft to a reviewer. Who must approve depends on the content.",
        sections: [
          {
            id: "submit",
            title: "Send for review",
            steps: [
              st(
                "Open the draft and fix anything flagged in the **SEO** checklist (title, description, alt text…). **Submit for review** stays off while there are errors.",
              ),
              st(
                "Click **Submit for review** (top right)."
              ),
              st(
                "Under **Reviewer**, pick the person who should approve. Only people allowed to approve this type are listed.",
              ),
              st(
                "Click **Submit for review**. The status becomes **In review** and a banner shows who is reviewing.",
              ),
            ],
          },
          {
            id: "who",
            title: "Who approves what",
            intro: "The editor applies these rules automatically.",
            steps: [
              st(
                "Pages, landing pages, guides, articles and FAQs: anyone in marketing, a service manager or an executive.",
              ),
              st(
                "**Regulatory updates** and anything ticked “Contains service facts (fees, requirements)”: a **service manager** only.",
              ),
              st("**Legal pages**: an **executive** only."),
              st(
                "For service facts, regulatory and legal content, you can't approve what you wrote yourself.",
              ),
            ],
          },
        ],
      },
      fr: {
        title: "Envoyer une page en relecture",
        summary:
          "Envoyer un brouillon terminé à un relecteur. Le valideur dépend du contenu.",
        sections: [
          {
            id: "submit",
            title: "Envoyer en relecture",
            steps: [
              st(
                "Ouvrez le brouillon et corrigez ce que signale la liste **SEO** (titre, description, texte alternatif…). **Envoyer en relecture** reste désactivé tant qu'il y a des erreurs.",
              ),
              st(
                "Cliquez sur **Envoyer en relecture** (en haut à droite)."
              ),
              st(
                "Sous **Reviewer**, choisissez la personne qui validera. Seules les personnes autorisées pour ce type sont proposées.",
              ),
              st(
                "Cliquez sur **Envoyer en relecture**. Le statut passe à **En relecture** et un bandeau indique le relecteur.",
              ),
            ],
          },
          {
            id: "who",
            title: "Qui valide quoi",
            intro: "L'éditeur applique ces règles tout seul.",
            steps: [
              st(
                "Pages, pages d'atterrissage, guides, articles et FAQ : le marketing, un responsable de service ou la direction.",
              ),
              st(
                "**Actualités réglementaires** et contenus cochés « Contains service facts (fees, requirements) » : un **responsable de service** uniquement.",
              ),
              st("**Pages légales** : la **direction** uniquement."),
              st(
                "Pour ces contenus sensibles, une autre personne doit valider ce que vous avez écrit.",
              ),
            ],
          },
        ],
      },
      rw: {
        title: "Ohereza urupapuro gusuzumwa",
        summary:
          "Ohereza umushinga urangiye ku musuzumyi. Uwemeza aterwa n'ibyanditswe.",
        sections: [
          {
            id: "submit",
            title: "Ohereza gusuzumwa",
            steps: [
              st(
                "Fungura umushinga ukosore ibyerekanwe mu igenzura rya **SEO** (umutwe, incamake, alt…). **Ohereza gusuzumwa** ntikora iyo hari amakosa.",
              ),
              st(
                "Kanda **Ohereza gusuzumwa** (hejuru iburyo)."
              ),
              st(
                "Munsi ya **Reviewer**, hitamo uzemeza. Hagaragara gusa abemerewe kwemeza ubu bwoko.",
              ),
              st(
                "Kanda **Ohereza gusuzumwa**. Bihinduka **Birasuzumwa** kandi ubutumwa bwerekana usuzuma.",
              ),
            ],
          },
          {
            id: "who",
            title: "Ni nde wemeza iki",
            intro: "Muhinduzi ikurikiza aya mategeko yonyine.",
            steps: [
              st(
                "Amapaji, amapaji y'ubukangurambaga, ubuyobozi, inyandiko n'ibibazo: uwo mu bucuruzi, umuyobozi wa serivisi cyangwa ubuyobozi bukuru.",
              ),
              st(
                "**Amavugurura y'amategeko** n'ibyanditseho « Contains service facts (fees, requirements) »: **umuyobozi wa serivisi** wenyine.",
              ),
              st("**Amapaji y'amategeko**: **ubuyobozi bukuru** gusa."),
              st(
                "Kuri ibi byoroshye, undi muntu agomba kwemeza ibyo wanditse.",
              ),
            ],
          },
        ],
      },
    },
  ),

  G(
    "marketing-content-approve",
    "content",
    2,
    [
      "/marketing/content",
      "/marketing/knowledge",
      "/marketing/updates",
      "/marketing/faqs",
    ],
    {
      en: {
        title: "Approve a page or request changes",
        summary:
          "For reviewers (marketing, service managers, executives): approve content or send it back with a reason.",
        facts: { who: "The reviewer named on the page" },
        sections: [
          {
            id: "review",
            title: "Review",
            steps: [
              st(
                "Open **Content** › **In review** and click the page. A banner shows “Under review by …”.",
              ),
              st(
                "Read every language version. Use **Comments** (right panel) to leave a note on a block or on the whole page.",
              ),
              st(
                "To send it back, click **Request changes**, write what needs to change and click **Confirm**. The page returns to draft."
              ),
              st(
                "If it is ready, click **Approve**. The status becomes **Approved** and the author can publish.",
              ),
              st(
                "If **Approve** is greyed out, the note beside it explains why (for example “Only a Service Manager can approve regulatory updates and service facts.”).",
              ),
            ],
            tips: [
              "On a phone the editor is review-only: you can preview, comment, approve and publish.",
            ],
          },
        ],
      },
      fr: {
        title: "Valider une page ou demander des modifications",
        summary:
          "Pour les relecteurs (marketing, responsables de service, direction) : valider ou renvoyer avec un motif.",
        facts: { who: "Le relecteur désigné sur la page" },
        sections: [
          {
            id: "review",
            title: "Relire",
            steps: [
              st(
                "Ouvrez **Contenu** › **En relecture** et cliquez sur la page. Un bandeau indique « Under review by … ».",
              ),
              st(
                "Lisez chaque langue. Utilisez **Comments** (panneau de droite) pour une note sur un bloc ou la page entière.",
              ),
              st(
                "Pour la renvoyer, cliquez sur **Demander des modifications**, écrivez ce qu'il faut changer puis **Confirmer**. La page revient en brouillon."
              ),
              st(
                "Si elle est prête, cliquez sur **Valider**. Le statut passe à **Approuvé** et l'auteur peut publier.",
              ),
              st(
                "Si **Valider** est grisé, la note à côté explique pourquoi (par exemple seul un responsable de service valide les actualités réglementaires).",
              ),
            ],
            tips: [
              "Sur téléphone, l'éditeur sert à relire : aperçu, commentaires, validation et publication.",
            ],
          },
        ],
      },
      rw: {
        title: "Emeza urupapuro cyangwa usabe impinduka",
        summary:
          "Ku basuzuma (ubucuruzi, abayobozi ba serivisi, ubuyobozi bukuru): emeza cyangwa usubize ufite impamvu.",
        facts: { who: "Usuzuma wanditswe ku rupapuro" },
        sections: [
          {
            id: "review",
            title: "Suzuma",
            steps: [
              st(
                "Fungura **Ibikubiyemo** › **Birasuzumwa** ukande ku rupapuro. Ubutumwa bwerekana « Under review by … ».",
              ),
              st(
                "Soma buri rurimi. Koresha **Comments** (iburyo) usige igitekerezo ku gice cyangwa ku rupapuro rwose.",
              ),
              st(
                "Kugira ngo urusubize, kanda **Saba impinduka**, wandike ibikwiye guhinduka, ukande **Emeza**. Rusubira mu mushinga."
              ),
              st(
                "Niba rwiteguye, kanda **Emeza**. Bihinduka **Byemejwe** kandi uwanditse ashobora gutangaza.",
              ),
              st(
                "Niba **Emeza** idakora, ubutumwa buri iruhande busobanura impamvu (urugero amavugurura y'amategeko yemezwa n'umuyobozi wa serivisi wenyine).",
              ),
            ],
            tips: [
              "Kuri telefone muhinduzi ni iyo gusuzuma: kureba, gutanga igitekerezo, kwemeza no gutangaza.",
            ],
          },
        ],
      },
    },
  ),

  G(
    "marketing-content-publish",
    "content",
    3,
    [
      "/marketing/content",
      "/marketing/landing",
      "/marketing/knowledge",
      "/marketing/updates",
    ],
    {
      en: {
        title: "Publish a page",
        summary: "Put an approved page live, in every ready language.",
        sections: [
          {
            id: "publish",
            title: "Publish",
            steps: [
              st(
                "Open the approved page and click **Publish** (top right)."
              ),
              st("Check **Languages**: each one shows whether it is ready."),
              st(
                "Read **Fix before publishing** (red) and **Worth checking**. While anything is red, publishing is blocked: close the window, fix it, come back.",
              ),
              st(
                "If a language is missing, you can switch on **Publish with fallback to English**: visitors in that language see the English page with a notice.",
              ),
              st(
                "Click **Publish now**. The toast says “Published · live in a few seconds”. Use **View on website** to check it.",
              ),
            ],
            warn: "Publishing makes the page public to every visitor and, if “Use in the AI assistant” is on, to the assistant. Check prices, deadlines and links first.",
            tips: [
              "To take a page offline again, click **Unpublish** (it returns to draft).",
            ],
          },
        ],
      },
      fr: {
        title: "Publier une page",
        summary: "Mettre en ligne une page validée, dans chaque langue prête.",
        sections: [
          {
            id: "publish",
            title: "Publier",
            steps: [
              st(
                "Ouvrez la page validée et cliquez sur **Publier** (en haut à droite)."
              ),
              st(
                "Vérifiez **Languages** : chaque langue indique si elle est prête.",
              ),
              st(
                "Lisez **Fix before publishing** (rouge) et **Worth checking**. Tant qu'il y a du rouge, la publication est bloquée : fermez, corrigez, revenez.",
              ),
              st(
                "Si une langue manque, activez **Publish with fallback to English** : les visiteurs de cette langue voient la page anglaise avec un avis.",
              ),
              st(
                "Cliquez sur **Publier maintenant**. Le message indique « Publié · en ligne dans quelques secondes ». **Voir sur le site** permet de vérifier.",
              ),
            ],
            warn: "Publier rend la page publique pour tous, et pour l'assistant si « Use in the AI assistant » est activé. Vérifiez prix, échéances et liens avant.",
            tips: [
              "Pour retirer la page, cliquez sur **Unpublish** (retour en brouillon).",
            ],
          },
        ],
      },
      rw: {
        title: "Tangaza urupapuro",
        summary: "Shyira ku rubuga urupapuro rwemejwe, mu ndimi zose ziteguye.",
        sections: [
          {
            id: "publish",
            title: "Tangaza",
            steps: [
              st(
                "Fungura urupapuro rwemejwe ukande **Tangaza** (hejuru iburyo)."
              ),
              st("Reba **Languages**: buri rurimi rwerekana niba rwiteguye."),
              st(
                "Soma **Fix before publishing** (umutuku) na **Worth checking**. Iyo hari umutuku, ntushobora gutangaza: funga, ukosore, ugaruke.",
              ),
              st(
                "Niba ururimi rubura, ushobora gufungura **Publish with fallback to English**: abasura bo muri urwo rurimi babona urupapuro rw'Icyongereza n'ubutumwa.",
              ),
              st(
                "Kanda **Tangaza ubu**. Ubutumwa buvuga « Byatangajwe · biragaragara mu kanya ». Koresha **Reba ku rubuga** ugenzure.",
              ),
            ],
            warn: "Gutangaza bituma urupapuro rugaragara kuri bose, no ku mufasha wa AI iyo « Use in the AI assistant » ifunguye. Banza ugenzure ibiciro, amatariki n'amahuza.",
            tips: [
              "Kugira ngo urukureho, kanda **Unpublish** (rusubira mu mushinga).",
            ],
          },
        ],
      },
    },
  ),

  G(
    "marketing-content-schedule",
    "content",
    2,
    [
      "/marketing/content",
      "/marketing/landing",
      "/marketing/knowledge",
      "/marketing/updates",
    ],
    {
      en: {
        title: "Schedule a page to publish later",
        summary:
          "Choose a date and time (Kigali) for an approved page to go live by itself.",
        sections: [
          {
            id: "schedule",
            title: "Schedule",
            steps: [
              st("Open the approved page and click **Publish**."),
              st(
                "Make sure nothing is listed under **Fix before publishing**, then click **Schedule…**.",
              ),
              st(
                "In **Schedule publishing**, fill **Date and time (Kigali)**. It must be at least 5 minutes from now.",
              ),
              st(
                "Click **Schedule**. The status becomes **Scheduled** with the date; the page appears under **Content** › **Scheduled**.",
              ),
              st(
                "To cancel, open the page and click **Unschedule**. It goes back to approved.",
              ),
            ],
            warn: "At the scheduled time the page goes public without another check. Unschedule it if prices or dates change in the meantime.",
          },
        ],
      },
      fr: {
        title: "Programmer la publication d'une page",
        summary:
          "Choisir une date et une heure (Kigali) pour qu'une page validée se publie seule.",
        sections: [
          {
            id: "schedule",
            title: "Programmer",
            steps: [
              st("Ouvrez la page validée et cliquez sur **Publier**."),
              st(
                "Vérifiez que **Fix before publishing** est vide, puis cliquez sur **Programmer…**.",
              ),
              st(
                "Dans **Schedule publishing**, remplissez **Date and time (Kigali)**, au moins 5 minutes à l'avance.",
              ),
              st(
                "Cliquez sur **Schedule**. Le statut devient **Programmé** avec la date ; la page figure sous **Contenu** › **Programmés**.",
              ),
              st(
                "Pour annuler, ouvrez la page et cliquez sur **Unschedule**. Elle redevient validée.",
              ),
            ],
            warn: "À l'heure prévue, la page devient publique sans autre contrôle. Déprogrammez-la si prix ou dates changent entre-temps.",
          },
        ],
      },
      rw: {
        title: "Teganya igihe urupapuro ruzatangarizwa",
        summary:
          "Hitamo itariki n'isaha (Kigali) urupapuro rwemejwe ruzitangariza rwonyine.",
        sections: [
          {
            id: "schedule",
            title: "Teganya",
            steps: [
              st("Fungura urupapuro rwemejwe ukande **Tangaza**."),
              st(
                "Reba ko nta kiri munsi ya **Fix before publishing**, hanyuma ukande **Teganya…**.",
              ),
              st(
                "Muri **Schedule publishing**, uzuza **Date and time (Kigali)**: nibura iminota 5 uhereye ubu.",
              ),
              st(
                "Kanda **Schedule**. Bihinduka **Biteganyijwe** n'itariki; urupapuro ruboneka muri **Ibikubiyemo** › **Biteganyijwe**.",
              ),
              st(
                "Kugira ngo ubihagarike, fungura urupapuro ukande **Unschedule**. Rusubira kuba rwemejwe.",
              ),
            ],
            warn: "Igihe cyagenwe nikigera, urupapuro rujya ahagaragara nta yindi genzura. Hagarika iteganya niba ibiciro cyangwa amatariki bihindutse.",
          },
        ],
      },
    },
  ),

  G(
    "marketing-content-preview-seo",
    "content",
    4,
    [
      "/marketing/content",
      "/marketing/landing",
      "/marketing/knowledge",
      "/marketing/updates",
    ],
    {
      en: {
        title: "Preview a page and fill SEO, AI and history",
        summary:
          "Share a private preview, set search fields, decide AI use, restore old versions and comment.",
        sections: [
          {
            id: "preview",
            title: "Preview before publishing",
            steps: [
              st(
                "In the list, click **Preview** on a row: the draft opens in a new tab.",
              ),
              st(
                "In the editor, click **Copy preview link** and send it to a colleague. The link works for 24 hours.",
              ),
              st("Once published, **View on website** opens the live page."),
            ],
          },
          {
            id: "panels",
            title: "Side panels",
            steps: [
              st(
                "Use the tabs on the right: **Settings**, **SEO**, **AI**, **History**, **Comments** (landing pages also have **Performance**).",
                "marketing-seo-panel",
                ["Panels"],
              ),
              st(
                "**Settings**: **Title**, **Web address** and **Summary** for this language.",
              ),
              st(
                "**SEO**: **Meta title** (≤ 60 characters), **Meta description** (≤ 160), **Focus keyword**, social title and description, **Search engines**. Watch the **Search preview** and **Checklist**.",
              ),
              st(
                "**AI**: switch on **Use in the AI assistant**, tick **Contains service facts (fees, requirements)** if relevant, and set **Review by** (at most 12 months ahead).",
              ),
              st(
                "**History**: pick a version, see **Changes**, click **Restore v…** to bring it back as a new draft (the live page stays until you publish).",
              ),
              st(
                "**Comments**: type in **Add a comment…** and click **Comment**; **Resolve** when it's handled.",
              ),
            ],
          },
        ],
      },
      fr: {
        title: "Prévisualiser une page et remplir SEO, IA et historique",
        summary:
          "Partager un aperçu privé, régler la recherche, décider de l'usage IA, restaurer et commenter.",
        sections: [
          {
            id: "preview",
            title: "Prévisualiser avant publication",
            steps: [
              st(
                "Dans la liste, cliquez sur **Aperçu** sur une ligne : le brouillon s'ouvre dans un nouvel onglet.",
              ),
              st(
                "Dans l'éditeur, cliquez sur **Copier le lien d'aperçu** et envoyez-le. Le lien vaut 24 heures.",
              ),
              st(
                "Une fois publiée, **Voir sur le site** ouvre la page en ligne.",
              ),
            ],
          },
          {
            id: "panels",
            title: "Panneaux latéraux",
            steps: [
              st(
                "Utilisez les onglets à droite : **Settings**, **SEO**, **AI**, **History**, **Comments** (et **Performance** pour les pages d'atterrissage).",
                "marketing-seo-panel",
                ["Panneaux"],
              ),
              st(
                "**Settings** : **Title**, **Web address** et **Summary** de cette langue.",
              ),
              st(
                "**SEO** : **Meta title** (≤ 60 caractères), **Meta description** (≤ 160), **Focus keyword**, titre et description sociaux, **Search engines**. Suivez **Search preview** et **Checklist**.",
              ),
              st(
                "**AI** : activez **Use in the AI assistant**, cochez **Contains service facts (fees, requirements)** si besoin, réglez **Review by** (12 mois maximum).",
              ),
              st(
                "**History** : choisissez une version, voyez **Changes**, cliquez sur **Restore v…** pour la reprendre en brouillon (la page en ligne reste jusqu'à publication).",
              ),
              st(
                "**Comments** : écrivez dans **Add a comment…** puis **Comment** ; **Resolve** une fois traité.",
              ),
            ],
          },
        ],
      },
      rw: {
        title: "Reba urupapuro mbere kandi wuzuze SEO, AI n'amateka",
        summary:
          "Sangiza ihuza ryihariye ryo kureba, shyiraho iby'ishakiro, AI, garura verisiyo za kera kandi utange ibitekerezo.",
        sections: [
          {
            id: "preview",
            title: "Reba mbere yo gutangaza",
            steps: [
              st(
                "Ku rutonde, kanda **Preview** ku murongo: umushinga ufunguka mu idirishya rishya.",
              ),
              st(
                "Muri muhinduzi, kanda **Kopa ihuza ryo kureba** urihe mugenzi wawe. Rimara amasaha 24.",
              ),
              st(
                "Rumaze gutangazwa, **Reba ku rubuga** ifungura urupapuro ruri ku rubuga.",
              ),
            ],
          },
          {
            id: "panels",
            title: "Udusanduku two iburyo",
            steps: [
              st(
                "Koresha ibice biri iburyo: **Settings**, **SEO**, **AI**, **History**, **Comments** (amapaji y'ubukangurambaga afite na **Performance**).",
                "marketing-seo-panel",
                ["Udusanduku"],
              ),
              st(
                "**Settings**: **Title**, **Web address** na **Summary** by'uru rurimi.",
              ),
              st(
                "**SEO**: **Meta title** (≤ inyuguti 60), **Meta description** (≤ 160), **Focus keyword**, umutwe n'incamake by'imbuga nkoranyambaga, **Search engines**. Reba **Search preview** na **Checklist**.",
              ),
              st(
                "**AI**: fungura **Use in the AI assistant**, shyira akamenyetso kuri **Contains service facts (fees, requirements)** bibaye ngombwa, ushyireho **Review by** (amezi 12 ntarengwa).",
              ),
              st(
                "**History**: hitamo verisiyo, urebe **Changes**, ukande **Restore v…** kugira ngo igaruke ari umushinga mushya.",
              ),
              st(
                "**Comments**: andika muri **Add a comment…** ukande **Comment**; **Resolve** iyo byakemutse.",
              ),
            ],
          },
        ],
      },
    },
  ),

  G(
    "marketing-content-archive",
    "content",
    2,
    [
      "/marketing/content",
      "/marketing/landing",
      "/marketing/knowledge",
      "/marketing/updates",
    ],
    {
      en: {
        title: "Archive a page and redirect its address",
        summary:
          "Retire a published page without breaking links: visitors are sent to another page.",
        sections: [
          {
            id: "archive",
            title: "Archive",
            steps: [
              st(
                "Open the published (or stale) page and click **Archive** (top right).",
              ),
              st(
                "Read **Archive this page**: its address keeps working and sends visitors to the page you choose.",
                "marketing-archive",
                ["Send visitors to"],
              ),
              st(
                "In **Send visitors to**, type the new address starting with **/** (for example /services).",
              ),
              st(
                "Click **Archive**. The page is archived and the old address redirects.",
              ),
            ],
            warn: "If the page is in a menu, remove it from the menu first (**SEO & tracking** › **Navigation**).",
            tips: [
              "To hide a page only for a while, use **Unpublish** instead: it keeps the page as a draft.",
            ],
          },
        ],
      },
      fr: {
        title: "Archiver une page et rediriger son adresse",
        summary:
          "Retirer une page publiée sans casser les liens : les visiteurs vont vers une autre page.",
        sections: [
          {
            id: "archive",
            title: "Archiver",
            steps: [
              st(
                "Ouvrez la page publiée (ou à revoir) et cliquez sur **Archiver** (en haut à droite).",
              ),
              st(
                "Lisez **Archive this page** : l'adresse continue de fonctionner et renvoie vers la page choisie.",
                "marketing-archive",
                ["Send visitors to"],
              ),
              st(
                "Dans **Send visitors to**, tapez la nouvelle adresse commençant par **/** (ex. /services).",
              ),
              st(
                "Cliquez sur **Archive**. La page est archivée et l'ancienne adresse redirige.",
              ),
            ],
            warn: "Si la page est dans un menu, retirez-la d'abord du menu (**SEO et suivi** › **Navigation**).",
            tips: [
              "Pour la masquer temporairement, utilisez plutôt **Unpublish** : elle reste en brouillon.",
            ],
          },
        ],
      },
      rw: {
        title: "Bika urupapuro kandi wohereze aderesi yarwo ahandi",
        summary:
          "Kuraho urupapuro rwatangajwe utangije amahuza: abasura boherezwa ku rundi rupapuro.",
        sections: [
          {
            id: "archive",
            title: "Bika",
            steps: [
              st(
                "Fungura urupapuro rwatangajwe (cyangwa rukeneye kuvugururwa) ukande **Bika** (hejuru iburyo).",
              ),
              st(
                "Soma **Archive this page**: aderesi yarwo ikomeza gukora, ikohereza abasura ku rupapuro uhisemo.",
                "marketing-archive",
                ["Send visitors to"],
              ),
              st(
                "Muri **Send visitors to**, andika aderesi nshya itangirwa na **/** (urugero /services).",
              ),
              st(
                "Kanda **Archive**. Urupapuro rurabikwa kandi aderesi ya kera yohereza ahandi.",
              ),
            ],
            warn: "Niba urupapuro ruri muri menu, banza urukuremo (**SEO n'ikurikirana** › **Navigation**).",
            tips: [
              "Kugira ngo uruhishe by'agateganyo, koresha **Unpublish**: rugumaho ari umushinga.",
            ],
          },
        ],
      },
    },
  ),

  G("marketing-landing-pages", "content", 4, ["/marketing/landing"], {
    en: {
      title: "Build a landing page for a campaign",
      summary:
        "Campaign pages for ads and partners, with a lead form, UTM links and their own performance.",
      sections: [
        {
          id: "landing",
          title: "Create and track",
          steps: [
            st(
              "Click **Landing pages** in the side menu, then **New landing page**. Give it a title and first language and click **Create and edit**.",
              "marketing-landing",
              ["New landing page", "Page row"],
            ),
            st(
              "In **Settings**, fill **Campaign tag**. Leave **Hide from search (recommended for ads)** on for ad-only pages.",
            ),
            st(
              "Under **Lead form**, choose whether to **Ask for email (optional field)**, set a **Pre-selected service** and write the **Thank-you message**. Consent checkboxes are always unticked for the visitor.",
            ),
            st(
              "In **UTM link builder**, fill **Source**, **Medium** and **Campaign** (lowercase, words joined by hyphens) and click **Copy link** to use in your ad.",
            ),
            st(
              "Build the content with blocks, then submit, approve and publish it like any page.",
            ),
            st(
              "Open the **Performance** tab to see **Visits**, **Form starts**, **Submissions**, **Conversion**, results **By source** and **Leads from this page**.",
            ),
          ],
          tips: [
            "The list shows **Visits** and **Conversion** per landing page.",
          ],
        },
      ],
    },
    fr: {
      title: "Créer une page d'atterrissage pour une campagne",
      summary:
        "Pages de campagne pour annonces et partenaires, avec formulaire, liens UTM et performance.",
      sections: [
        {
          id: "landing",
          title: "Créer et suivre",
          steps: [
            st(
              "Cliquez sur **Pages d'atterrissage** dans le menu, puis sur le bouton Nouveau. Donnez un titre et une langue, puis **Créer et modifier**.",
              "marketing-landing",
              ["Nouvelle page", "Ligne"],
            ),
            st(
              "Dans **Settings**, remplissez **Campaign tag**. Laissez **Hide from search (recommended for ads)** activé pour les pages réservées aux annonces.",
            ),
            st(
              "Sous **Lead form**, choisissez **Ask for email (optional field)**, un **Pre-selected service** et le **Thank-you message**. Les cases de consentement sont toujours décochées pour le visiteur.",
            ),
            st(
              "Dans **UTM link builder**, remplissez **Source**, **Medium** et **Campaign** (minuscules, mots reliés par des tirets) puis **Copy link** pour votre annonce.",
            ),
            st(
              "Construisez le contenu, puis envoyez en relecture, validez et publiez comme toute page.",
            ),
            st(
              "L'onglet **Performance** montre **Visits**, **Form starts**, **Submissions**, **Conversion**, **By source** et **Leads from this page**.",
            ),
          ],
          tips: [
            "La liste affiche les **Visites** et la **Conversion** de chaque page.",
          ],
        },
      ],
    },
    rw: {
      title: "Kora urupapuro rw'ubukangurambaga",
      summary:
        "Amapaji yo kwamamaza afite ifishi, amahuza ya UTM n'imibare yayo.",
      sections: [
        {
          id: "landing",
          title: "Kora kandi ukurikirane",
          steps: [
            st(
              "Kanda **Amapaji y'ubukangurambaga** mu rutonde, hanyuma buto New. Shyiraho umutwe n'ururimi, ukande **Create and edit**.",
              "marketing-landing",
              ["Ipaji nshya", "Umurongo"],
            ),
            st(
              "Muri **Settings**, uzuza **Campaign tag**. Siga **Hide from search (recommended for ads)** ifunguye ku mapaji y'amatangazo gusa.",
            ),
            st(
              "Munsi ya **Lead form**, hitamo **Ask for email (optional field)**, **Pre-selected service** kandi wandike **Thank-you message**. Udusanduku tw'uruhushya ntiduhitwamo mbere.",
            ),
            st(
              "Muri **UTM link builder**, uzuza **Source**, **Medium** na **Campaign** (inyuguti nto, amagambo ahujwe na -) ukande **Copy link** urikoreshe mu itangazo.",
            ),
            st(
              "Kora ibikubiyemo, hanyuma wohereze gusuzumwa, byemezwe kandi utangaze nk'urundi rupapuro.",
            ),
            st(
              "Fungura **Performance** urebe **Visits**, **Form starts**, **Submissions**, **Conversion**, **By source** na **Leads from this page**.",
            ),
          ],
        },
      ],
    },
  }),

  // ───────────── Knowledge & help content
  G("marketing-knowledge-base", "knowledge", 4, ["/marketing/knowledge"], {
    en: {
      title:
        "Write guides and articles for the knowledge base and AI assistant",
      summary:
        "Knowledge-base content teaches visitors and, once approved for AI, feeds the assistant.",
      sections: [
        {
          id: "kb",
          title: "Write and feed the assistant",
          steps: [
            st(
              "Click **Knowledge base**. **Knowledge centre** lists guides and articles in three languages; use **Type** to show **Guide** or **Article**.",
              "marketing-knowledge",
              ["New guide", "Entry"],
            ),
            st(
              "Read the top panels: the published-guides target, **Was this helpful?** votes and **Searches with no results** (topics people looked for and didn't find).",
            ),
            st(
              "Click **New guide**, give it a title and first language, then **Create and edit**. Guides and articles need at least 300 words.",
            ),
            st(
              "In the **AI** panel, switch on **Use in the AI assistant** and set **Review by**. If it **Contains service facts (fees, requirements)**, a service manager must approve that.",
            ),
            st(
              "Translate, submit, approve and publish it. The row's chip then shows **AI ready** (or **Indexing** for a moment).",
            ),
          ],
          tips: [
            "Only published, current, approved content is used by the assistant.",
            "After the **Review by** date the page shows “under review” and leaves the AI (**Out of AI (stale)**); update and republish it.",
          ],
        },
      ],
    },
    fr: {
      title:
        "Rédiger guides et articles pour la base de connaissances et l'assistant IA",
      summary:
        "Le contenu informe les visiteurs et, une fois validé pour l'IA, alimente l'assistant.",
      sections: [
        {
          id: "kb",
          title: "Rédiger et alimenter l'assistant",
          steps: [
            st(
              "Cliquez sur **Base de connaissances**. **Centre de connaissances** liste guides et articles ; **Type** filtre guide ou article.",
              "marketing-knowledge",
              ["Nouveau guide", "Entrée"],
            ),
            st(
              "Lisez les panneaux du haut : objectif de guides publiés, votes **Was this helpful?** et **Searches with no results** (sujets cherchés sans résultat).",
            ),
            st(
              "Cliquez sur le bouton Nouveau, donnez titre et langue, puis **Créer et modifier**. Guides et articles demandent au moins 300 mots.",
            ),
            st(
              "Dans le panneau **AI**, activez **Use in the AI assistant** et réglez **Review by**. S'il **Contains service facts (fees, requirements)**, un responsable de service doit le valider.",
            ),
            st(
              "Traduisez, envoyez en relecture, validez et publiez. La pastille affiche alors **Prêt pour l'IA** (ou **Indexation** un instant).",
            ),
          ],
          tips: [
            "L'assistant n'utilise que du contenu publié, à jour et validé.",
            "Après la date **Review by**, la page s'affiche « en révision » et sort de l'IA (**Retiré de l'IA (à revoir)**) ; mettez-la à jour et republiez.",
          ],
        },
      ],
    },
    rw: {
      title:
        "Andika ubuyobozi n'inyandiko z'ububiko bw'ubumenyi n'umufasha wa AI",
      summary:
        "Ibi bifasha abasura kandi, nibimara kwemererwa AI, bigaburira umufasha.",
      sections: [
        {
          id: "kb",
          title: "Andika kandi ugaburire umufasha",
          steps: [
            st(
              "Kanda **Ububiko bw'ubumenyi**. **Ikigo cy'ubumenyi** cyerekana ubuyobozi n'inyandiko; **Type** ihitamo Guide cyangwa Article.",
              "marketing-knowledge",
              ["Ubuyobozi bushya", "Inyandiko"],
            ),
            st(
              "Soma udusanduku two hejuru: intego y'ubuyobozi bwatangajwe, amajwi **Was this helpful?** na **Searches with no results** (ibyo abantu bashakishije ntibabibone).",
            ),
            st(
              "Kanda buto New, shyiraho umutwe n'ururimi, ukande **Create and edit**. Ubuyobozi n'inyandiko bikenera nibura amagambo 300.",
            ),
            st(
              "Mu gasanduku **AI**, fungura **Use in the AI assistant** ushyireho **Review by**. Niba **Contains service facts (fees, requirements)**, umuyobozi wa serivisi agomba kubyemeza.",
            ),
            st(
              "Hindura mu ndimi, ohereza gusuzumwa, byemezwe, utangaze. Akamenyetso kerekana **Byiteguye kuri AI** (cyangwa **Birimo kwinjizwa** akanya gato).",
            ),
          ],
          tips: [
            "Umufasha akoresha gusa ibyatangajwe, bigezweho kandi byemejwe.",
            "Itariki ya **Review by** irenze, urupapuro ruva muri AI (**Byavanywe muri AI**); ruvugurure wongere urutangaze.",
          ],
        },
      ],
    },
  }),

  G("marketing-regulatory-updates", "knowledge", 4, ["/marketing/updates"], {
    en: {
      title: "Post a regulatory update (RRA, RDB…)",
      summary:
        "Every update needs an institution, a source link and a review date, and a service manager approves it.",
      facts: { who: "Marketing writes; a service manager approves" },
      sections: [
        {
          id: "reg",
          title: "Write and notify",
          steps: [
            st(
              "Click **Regulatory updates**, then **New regulatory update**. Fill the title and first language and click **Create and edit**.",
              "marketing-updates",
              ["New regulatory update", "Update row"],
            ),
            st(
              "In **Settings**, choose the **Institution** (RRA, RDB, BNR, RSSB, RURA, MINICOM), the **Effective date** and the **Source link** (must start with https://).",
            ),
            st(
              "Fill **Deadline** if there is one, tick who it **Affects** (**Companies**, **Individuals**), optionally a **Display tag (optional)** and the **Affected services**.",
            ),
            st(
              "Set **Review by** in the **AI** panel, then **Submit for review** and pick a service manager as reviewer.",
            ),
            st(
              "After it is published, click **Notify subscribers**. It opens a campaign draft for subscribers; consent and approval rules still apply and nothing is sent automatically.",
            ),
          ],
          warn: "Past its review date an update shows “under review” and is removed from the AI. Keep review dates current.",
        },
      ],
    },
    fr: {
      title: "Publier une actualité réglementaire (RRA, RDB…)",
      summary:
        "Chaque actualité exige institution, lien source et date de révision ; un responsable de service la valide.",
      facts: { who: "Le marketing rédige ; un responsable de service valide" },
      sections: [
        {
          id: "reg",
          title: "Rédiger et prévenir",
          steps: [
            st(
              "Cliquez sur **Actualités réglementaires**, puis sur le bouton Nouveau. Saisissez titre et langue puis **Créer et modifier**.",
              "marketing-updates",
              ["Nouvelle actualité", "Ligne"],
            ),
            st(
              "Dans **Settings**, choisissez **Institution** (RRA, RDB, BNR, RSSB, RURA, MINICOM), **Effective date** et **Source link** (doit commencer par https://).",
            ),
            st(
              "Remplissez **Deadline** s'il y en a, cochez **Affects** (**Companies**, **Individuals**), éventuellement **Display tag (optional)** et **Affected services**.",
            ),
            st(
              "Réglez **Review by** dans le panneau **AI**, puis **Envoyer en relecture** à un responsable de service.",
            ),
            st(
              "Une fois publiée, cliquez sur **Notify subscribers** : un brouillon de campagne s'ouvre ; consentement et validation s'appliquent, rien ne part automatiquement.",
            ),
          ],
          warn: "Après sa date de révision, l'actualité s'affiche « en révision » et sort de l'IA. Tenez les dates à jour.",
        },
      ],
    },
    rw: {
      title: "Shyiraho ivugurura ry'amategeko (RRA, RDB…)",
      summary:
        "Buri vugurura rikenera urwego, ihuza ry'inkomoko n'itariki yo gusuzuma, kandi ryemezwa n'umuyobozi wa serivisi.",
      facts: { who: "Ubucuruzi bwandika; umuyobozi wa serivisi yemeza" },
      sections: [
        {
          id: "reg",
          title: "Andika kandi umenyeshe",
          steps: [
            st(
              "Kanda **Amavugurura y'amategeko**, hanyuma buto New. Uzuza umutwe n'ururimi ukande **Create and edit**.",
              "marketing-updates",
              ["Ivugurura rishya", "Umurongo"],
            ),
            st(
              "Muri **Settings**, hitamo **Institution** (RRA, RDB, BNR, RSSB, RURA, MINICOM), **Effective date** na **Source link** (itangirwa na https://).",
            ),
            st(
              "Uzuza **Deadline** niba ihari, uhitemo **Affects** (**Companies**, **Individuals**), **Display tag (optional)** na **Affected services**.",
            ),
            st(
              "Shyiraho **Review by** mu gasanduku **AI**, hanyuma **Ohereza gusuzumwa** uhitemo umuyobozi wa serivisi.",
            ),
            st(
              "Rimaze gutangazwa, kanda **Notify subscribers**: bifungura umushinga w'ubukangurambaga; amategeko y'uruhushya n'iyemeza arakurikizwa, nta kintu cyoherezwa cyonyine.",
            ),
          ],
          warn: "Itariki yo gusuzuma irenze, ivugurura rigaragara « rirasuzumwa » kandi rikavanwa muri AI. Komeza amatariki agezweho.",
        },
      ],
    },
  }),

  G("marketing-faqs", "knowledge", 3, ["/marketing/faqs"], {
    en: {
      title: "Manage FAQs",
      summary:
        "Questions shown on the site and used by the assistant once approved.",
      sections: [
        {
          id: "faq",
          title: "Add and edit FAQs",
          steps: [
            st(
              "Click **FAQs**. **All FAQs** lists every question; **Unanswered questions from the assistant** shows what the assistant couldn't answer.",
              "marketing-faqs",
              ["New FAQ", "Tabs", "Question"],
            ),
            st(
              "Click **New FAQ**, type the question as **Title**, choose the language and click **Create and edit**.",
            ),
            st(
              "To edit quickly, click a question in the list. A side panel opens.",
              "marketing-faq-drawer",
              ["Languages", "Answer"],
            ),
            st(
              "Pick the language tab, edit **Question** and **Answer**, and click **Save**.",
            ),
            st(
              "Click **Open full editor** for categories, linked services, AI settings and the review/publish flow.",
            ),
          ],
          tips: [
            "Turn frequent unanswered questions into new FAQs or knowledge-base guides.",
          ],
        },
      ],
    },
    fr: {
      title: "Gérer les FAQ",
      summary:
        "Questions affichées sur le site et utilisées par l'assistant une fois validées.",
      sections: [
        {
          id: "faq",
          title: "Ajouter et modifier",
          steps: [
            st(
              "Cliquez sur **FAQ**. **All FAQs** liste les questions ; **Unanswered questions from the assistant** montre ce que l'assistant n'a pas su répondre.",
              "marketing-faqs",
              ["New FAQ", "Onglets", "Question"],
            ),
            st(
              "Cliquez sur **New FAQ**, saisissez la question comme **Titre**, la langue, puis **Créer et modifier**.",
            ),
            st(
              "Pour une modification rapide, cliquez sur une question : un panneau latéral s'ouvre.",
              "marketing-faq-drawer",
              ["Langues", "Réponse"],
            ),
            st(
              "Choisissez l'onglet de langue, modifiez **Question** et **Answer**, puis **Enregistrer**.",
            ),
            st(
              "**Open full editor** donne catégories, services liés, IA et le circuit relecture/publication.",
            ),
          ],
          tips: [
            "Transformez les questions sans réponse fréquentes en FAQ ou en guides.",
          ],
        },
      ],
    },
    rw: {
      title: "Gucunga ibibazo bikunze kubazwa",
      summary:
        "Ibibazo bigaragara ku rubuga, bikoreshwa n'umufasha nyuma yo kwemezwa.",
      sections: [
        {
          id: "faq",
          title: "Ongeraho kandi uhindure",
          steps: [
            st(
              "Kanda **Ibibazo bikunze kubazwa**. **All FAQs** herekana byose; **Unanswered questions from the assistant** herekana ibyo umufasha atashoboye gusubiza.",
              "marketing-faqs",
              ["New FAQ", "Ibice", "Ikibazo"],
            ),
            st(
              "Kanda **New FAQ**, wandike ikibazo nka **Title**, uhitemo ururimi, ukande **Create and edit**.",
            ),
            st(
              "Kugira ngo uhindure vuba, kanda ku kibazo: akadirishya karafunguka iburyo.",
              "marketing-faq-drawer",
              ["Indimi", "Igisubizo"],
            ),
            st(
              "Hitamo ururimi, uhindure **Question** na **Answer**, ukande **Bika**.",
            ),
            st(
              "**Open full editor** iguha ibyiciro, serivisi zihujwe, AI n'inzira yo gusuzuma no gutangaza.",
            ),
          ],
        },
      ],
    },
  }),

  G("marketing-media", "knowledge", 3, ["/marketing/media"], {
    en: {
      title: "Upload images and PDFs to the media library",
      summary:
        "Upload once, add alt text per language, and reuse files across pages.",
      sections: [
        {
          id: "media",
          title: "Upload and describe",
          steps: [
            st(
              "Click **Media**. Drop files on **Drop images or PDFs** or click it to choose files (JPG, PNG, WebP up to 5 MB · PDF up to 20 MB).",
              "marketing-media",
              ["Upload", "Filters"],
            ),
            st(
              "Each file shows **Processing…**, then “Location data removed · Resized · Alt text required”. Use **Retry** on a failed file.",
            ),
            st(
              "Filter with **All**, **Images**, **PDFs**, **Not used**, or **Missing alt** per language.",
            ),
            st(
              "Click a file. In the details panel, fill **Alt text** for each language tab, **Credit** and **Licence**, and click the image to set the **Focal point**. Click **Save**.",
            ),
            st(
              "**Replace file** swaps the file and keeps every link. **Delete** works only when the file is **Not used anywhere**.",
            ),
          ],
          tips: [
            "Images without alt text block publishing of the page that uses them.",
          ],
        },
      ],
    },
    fr: {
      title: "Téléverser images et PDF dans la médiathèque",
      summary:
        "Téléverser une fois, ajouter le texte alternatif par langue et réutiliser partout.",
      sections: [
        {
          id: "media",
          title: "Téléverser et décrire",
          steps: [
            st(
              "Cliquez sur **Médias**. Déposez les fichiers sur **Drop images or PDFs** ou cliquez pour choisir (JPG, PNG, WebP ≤ 5 Mo · PDF ≤ 20 Mo).",
              "marketing-media",
              ["Téléverser", "Filtres"],
            ),
            st(
              "Chaque fichier affiche **Processing…** puis « Location data removed · Resized · Alt text required ». **Retry** relance un échec.",
            ),
            st(
              "Filtrez avec **All**, **Images**, **PDFs**, **Not used** ou **Missing alt** par langue.",
            ),
            st(
              "Cliquez sur un fichier. Dans le détail, remplissez **Alt text** par langue, **Credit**, **Licence**, et cliquez sur l'image pour le **Focal point**. Puis **Enregistrer**.",
            ),
            st(
              "**Replace file** remplace le fichier sans casser les liens. **Delete** n'est possible que si le fichier n'est utilisé nulle part.",
            ),
          ],
          tips: [
            "Une image sans texte alternatif bloque la publication de la page qui l'utilise.",
          ],
        },
      ],
    },
    rw: {
      title: "Shyira amafoto na PDF mu bubiko bw'amafoto",
      summary:
        "Shyiramo rimwe, wongereho alt kuri buri rurimi, ubikoreshe ku mapaji menshi.",
      sections: [
        {
          id: "media",
          title: "Shyiramo kandi usobanure",
          steps: [
            st(
              "Kanda **Amafoto n'amashusho**. Shyira dosiye kuri **Drop images or PDFs** cyangwa ukande uhitemo (JPG, PNG, WebP kugeza 5 MB · PDF kugeza 20 MB).",
              "marketing-media",
              ["Shyiramo", "Muyunguruzi"],
            ),
            st(
              "Buri dosiye yerekana **Processing…**, hanyuma « Location data removed · Resized · Alt text required ». **Retry** isubiramo iyanze.",
            ),
            st(
              "Yungurura na **All**, **Images**, **PDFs**, **Not used** cyangwa **Missing alt** kuri buri rurimi.",
            ),
            st(
              "Kanda kuri dosiye. Uzuza **Alt text** kuri buri rurimi, **Credit** na **Licence**, ukande ku ifoto ushyireho **Focal point**. Kanda **Bika**.",
            ),
            st(
              "**Replace file** isimbuza dosiye amahuza agumaho. **Delete** ikora gusa iyo dosiye idakoreshwa ahantu na hamwe.",
            ),
          ],
          tips: ["Ifoto idafite alt ibuza gutangaza urupapuro iriho."],
        },
      ],
    },
  }),

  // ───────────── Leads & customers
  G(
    "marketing-leads",
    "crm",
    5,
    ["/marketing/leads"],
    {
      en: {
        title: "Work the leads pipeline",
        summary:
          "Add, import, move and follow up leads, then convert them to clients.",
        sections: [
          {
            id: "pipeline",
            title: "Pipeline",
            steps: [
              st(
                "Click **Leads**. Choose **Board**, **Table** or **My tasks**; search by name, company or LD number and filter by owner or source.",
                "marketing-leads",
                ["Add lead", "Import CSV", "Views", "Lead card"],
              ),
              st(
                "Click **Add lead**. Fill **Source**, **Name**, **Phone**, the **Service of interest**, **Language** and **Consent to marketing**, then **Save lead**. If it looks like a duplicate, choose **Save anyway** or open the existing one.",
              ),
              st(
                "Click **Import CSV**: **Upload** a file, **Match columns**, **Check rows**, then **Create … leads**. Nothing is created until you confirm.",
              ),
              st(
                "Move a lead by dragging its card to another column, or with the card menu › **Move to…**.",
              ),
            ],
          },
          {
            id: "lead",
            title: "One lead",
            steps: [
              st(
                "Click a lead's name. The side panel opens with **Activity**, **Tasks**, **Notes** and **Attribution**.",
                "marketing-lead",
                ["Tabs", "Convert to client"],
              ),
              st(
                "Update **Stage**, **Owner**, **Estimated value (RWF)** and **Next action date**; click **Log a call**, add a note (use @ to mention) or **Add task**.",
              ),
              st(
                "When they become a client, click **Convert to client**: link to the matched client or **Send account invitation**. Stage changes to Won when the first invoice is paid.",
              ),
              st(
                "If it's lost, click **Mark as lost**, pick the reason and confirm.",
              ),
              st(
                "In **Table**, tick several leads to **Assign owner**, **Enrol in sequence**, **Add tag** or **Export** (you give a reason; phone numbers are masked).",
              ),
            ],
            tips: [
              "Contacts without consent are saved but never messaged.",
              "Quotations are prepared by a Service Manager.",
            ],
          },
        ],
      },
      fr: {
        title: "Gérer le pipeline de prospects",
        summary:
          "Ajouter, importer, déplacer et suivre les prospects, puis les convertir en clients.",
        sections: [
          {
            id: "pipeline",
            title: "Pipeline",
            steps: [
              st(
                "Cliquez sur **Prospects**. Choisissez **Tableau**, **Liste** ou **Mes tâches** ; cherchez par nom, entreprise ou numéro LD et filtrez par responsable ou source.",
                "marketing-leads",
                ["Ajouter", "Importer un CSV", "Vues", "Carte"],
              ),
              st(
                "Cliquez sur **Ajouter**. Remplissez **Source**, **Nom**, **Téléphone**, **Service souhaité**, **Langue** et **Consentement marketing**, puis **Enregistrer**. En cas de doublon, **Enregistrer quand même** ou ouvrez l'existant.",
              ),
              st(
                "Cliquez sur **Importer un CSV** : **Fichier**, **Colonnes**, **Vérification**, puis **Créer … prospects**. Rien n'est créé avant confirmation.",
              ),
              st(
                "Déplacez un prospect en glissant sa carte, ou via le menu de la carte › **Déplacer vers…**.",
              ),
            ],
          },
          {
            id: "lead",
            title: "Un prospect",
            steps: [
              st(
                "Cliquez sur le nom. Le panneau s'ouvre avec **Activité**, **Tâches**, **Notes** et **Attribution**.",
                "marketing-lead",
                ["Onglets", "Convertir en client"],
              ),
              st(
                "Mettez à jour **Étape**, **Responsable**, **Valeur estimée (RWF)** et **Date de prochaine action** ; **Noter un appel**, ajoutez une note (@ pour mentionner) ou **Ajouter une tâche**.",
              ),
              st(
                "Quand il devient client, cliquez sur **Convertir en client** : **Lier au client existant** ou **Envoyer une invitation**. L'étape passe à Gagné au paiement de la première facture.",
              ),
              st(
                "S'il est perdu, cliquez sur **Marquer perdu**, choisissez le motif et confirmez.",
              ),
              st(
                "En **Liste**, cochez plusieurs prospects pour **Attribuer**, **Inscrire dans une séquence**, **Ajouter une étiquette** ou **Exporter** (avec un motif ; téléphones masqués).",
              ),
            ],
            tips: [
              "Les contacts sans consentement sont enregistrés mais jamais contactés.",
              "Les devis sont préparés par un responsable de service.",
            ],
          },
        ],
      },
      rw: {
        title: "Gukurikirana abashobora kuba abakiriya",
        summary:
          "Ongeraho, injiza, imura kandi ukurikirane, hanyuma ubahindure abakiriya.",
        sections: [
          {
            id: "pipeline",
            title: "Urutonde",
            steps: [
              st(
                "Kanda **Abakiriya bashobora kuboneka**. Hitamo **Ikibaho**, **Imbonerahamwe** cyangwa **Imirimo yanjye**; shakisha izina, ikigo cyangwa nomero LD.",
                "marketing-leads",
                ["Ongeraho", "Injiza CSV", "Ibyiciro", "Ikarita"],
              ),
              st(
                "Kanda **Ongeraho**. Uzuza inkomoko, izina, telefone, serivisi ashaka, ururimi na **Uruhushya rwo kumwandikira**, ukande **Bika**.",
              ),
              st(
                "Kanda **Injiza CSV**: **Dosiye**, **Huza inkingi**, **Genzura**, hanyuma **Injiza …**. Nta kintu gikorwa utaremeza.",
              ),
              st(
                "Imura umuntu ukurura ikarita ye, cyangwa ukoresheje menu y'ikarita.",
              ),
            ],
          },
          {
            id: "lead",
            title: "Umuntu umwe",
            steps: [
              st(
                "Kanda ku izina. Akadirishya gafunguka gafite **Ibikorwa**, **Imirimo**, **Inyandiko** na **Inkomoko**.",
                "marketing-lead",
                ["Ibice", "Hindura umukiriya"],
              ),
              st(
                "Hindura icyiciro, ushinzwe, agaciro na itariki y'igikorwa gikurikira; kanda **Andika ko wahamagaye**, wongereho inyandiko (@ kugira ngo uvuge umuntu) cyangwa **Ongeraho umurimo**.",
              ),
              st(
                "Iyo abaye umukiriya, kanda **Hindura umukiriya**: **Huza n'umukiriya usanzwe** cyangwa **Ohereza ubutumire**. Ahinduka « Yabaye umukiriya » fagitire ya mbere imaze kwishyurwa.",
              ),
              st("Niba yatakaye, kanda **Yatakaye**, uhitemo impamvu wemeze."),
              st(
                "Muri **Imbonerahamwe**, hitamo benshi kugira ngo **Shyiraho ushinzwe**, **Shyira mu ikurikiranya**, **Ongeraho ikirango** cyangwa **Sohora** (utanga impamvu; telefone zirahishwa).",
              ),
            ],
            tips: ["Abatatanze uruhushya barabikwa ariko ntibandikirwa."],
          },
        ],
      },
    },
    true,
  ),

  G("marketing-inbox", "crm", 3, ["/marketing/inbox"], {
    en: {
      title: "Answer messages in the Inbox",
      summary:
        "Web form, WhatsApp, email and SMS in one list; reply and turn conversations into leads.",
      sections: [
        {
          id: "inbox",
          title: "Reply",
          steps: [
            st(
              "Click **Inbox**. Pick a conversation on the left.",
              "marketing-inbox",
              ["Conversations", "Reply", "Lead actions"],
            ),
            st("Type in **Write a reply…** and click **Send**."),
            st(
              "On WhatsApp, outside the 24-hour window you must use a **Template**: pick an approved one and click **Send template**.",
            ),
            st(
              "In **Lead actions**, click **Create lead from conversation** (or **Open lead …** if one exists), choose **Assign to** and **Add tag**.",
            ),
          ],
          warn: "Replies go straight to the customer. Check names, amounts and links before **Send**.",
        },
      ],
    },
    fr: {
      title: "Répondre aux messages",
      summary:
        "Formulaire web, WhatsApp, e-mail et SMS dans une liste ; répondre et créer des prospects.",
      sections: [
        {
          id: "inbox",
          title: "Répondre",
          steps: [
            st(
              "Cliquez sur **Messages**. Choisissez une conversation à gauche.",
              "marketing-inbox",
              ["Conversations", "Réponse", "Actions prospect"],
            ),
            st("Écrivez dans **Votre réponse…** et cliquez sur **Envoyer**."),
            st(
              "Sur WhatsApp, hors de la fenêtre de 24 h, choisissez un **Modèle** validé et cliquez sur **Envoyer le modèle**.",
            ),
            st(
              "Dans **Actions prospect**, cliquez sur **Créer un prospect** (ou ouvrez celui qui existe), choisissez **Attribuer à** et **Étiqueter**.",
            ),
          ],
          warn: "Les réponses partent directement au client. Vérifiez noms, montants et liens avant **Envoyer**.",
        },
      ],
    },
    rw: {
      title: "Subiza ubutumwa",
      summary:
        "Ifishi y'urubuga, WhatsApp, imeyili na SMS ahantu hamwe; subiza kandi ukore abashobora kuba abakiriya.",
      sections: [
        {
          id: "inbox",
          title: "Subiza",
          steps: [
            st(
              "Kanda **Ubutumwa**. Hitamo ikiganiro ibumoso.",
              "marketing-inbox",
              ["Ibiganiro", "Igisubizo", "Ibikorwa"],
            ),
            st("Andika muri **Andika igisubizo…** ukande **Ohereza**."),
            st(
              "Kuri WhatsApp, nyuma y'amasaha 24 ugomba gukoresha inyandikorugero yemejwe, ugakanda **Ohereza**.",
            ),
            st(
              "Muri **Ibikorwa**, kanda **Mugire ushobora kuba umukiriya** (cyangwa ufungure uwari uhari), uhitemo **Ha** n'**Ikirango**.",
            ),
          ],
          warn: "Ibisubizo bigera ku mukiriya ako kanya. Genzura amazina, amafaranga n'amahuza mbere yo kohereza.",
        },
      ],
    },
  }),

  G("marketing-customers", "crm", 2, ["/marketing/customers"], {
    en: {
      title: "Look up a customer's marketing history",
      summary:
        "Clients with their requests, messages, campaigns and recommended services. Totals only.",
      sections: [
        {
          id: "cust",
          title: "Find a customer",
          steps: [
            st(
              "Click **Customers**. Type in **Search name or Customer ID**; click a column header to sort.",
              "marketing-customers",
              ["Search", "Customer list"],
            ),
            st(
              "Click a name. The page shows **Lifetime revenue**, **Details** (phone is masked for marketing) and **Consent**.",
            ),
            st(
              "Use the tabs **Timeline**, **Requests**, **Messages**, **Notes**, **Tasks** and **Attribution**.",
            ),
            st(
              "On the right, **Related** and **Recommended services** suggest what to offer next; linked leads are listed under **Leads**.",
            ),
          ],
        },
      ],
    },
    fr: {
      title: "Consulter l'historique marketing d'un client",
      summary:
        "Clients avec demandes, messages, campagnes et services recommandés. Totaux uniquement.",
      sections: [
        {
          id: "cust",
          title: "Trouver un client",
          steps: [
            st(
              "Cliquez sur **Clients**. Tapez dans **Nom ou identifiant client** ; cliquez sur un en-tête pour trier.",
              "marketing-customers",
              ["Recherche", "Liste"],
            ),
            st(
              "Cliquez sur un nom. La page montre le revenu cumulé, les détails (téléphone masqué) et le consentement.",
            ),
            st(
              "Utilisez les onglets chronologie, demandes, messages, notes, tâches et attribution.",
            ),
            st(
              "À droite, **Services recommandés** suggère quoi proposer ; les prospects liés sont listés sous **Prospects**.",
            ),
          ],
        },
      ],
    },
    rw: {
      title: "Reba amateka y'umukiriya",
      summary:
        "Abakiriya n'ibyo basabye, ubutumwa, ubukangurambaga na serivisi zisabwa. Imibare rusange gusa.",
      sections: [
        {
          id: "cust",
          title: "Shaka umukiriya",
          steps: [
            st(
              "Kanda **Abakiriya**. Andika muri **Izina cyangwa nomero y'umukiriya**; kanda ku mutwe w'inkingi kugira ngo utondeke.",
              "marketing-customers",
              ["Ishakiro", "Urutonde"],
            ),
            st(
              "Kanda ku izina. Urupapuro rwerekana amafaranga yose yinjije, amakuru (telefone irahishwa) n'uruhushya.",
            ),
            st(
              "Koresha ibice by'amateka, ibyo yasabye, ubutumwa, inyandiko, imirimo n'inkomoko.",
            ),
            st(
              "Iburyo, **Serivisi zisabwa** zerekana icyo wamugezaho; abahujwe na we bari munsi ya **Abashobora kuba abakiriya**.",
            ),
          ],
        },
      ],
    },
  }),

  // ───────────── Campaigns & automation
  G("marketing-segments", "campaigns", 3, ["/marketing/segments"], {
    en: {
      title: "Build a segment (audience)",
      summary:
        "Group contacts by service, sector or consent; counts update as you build.",
      sections: [
        {
          id: "seg",
          title: "Create a segment",
          steps: [
            st(
              "Click **Segments**, then **New segment**.",
              "marketing-segments",
              ["New segment"],
            ),
            st("Type the **Segment name**."),
            st(
              "Click **Add rule** and pick a field (for example **Sector**, **District**, **Service used**, **Email consent**), an operator and a **Value**. Use **Add group** for an OR group.",
              "marketing-segment",
              ["Add rule", "Preview"],
            ),
            st(
              "Read the right panel: **Match**, **Excluded** and **Eligible** for the channel you pick in **Preview for channel**; **Why excluded** explains each exclusion.",
            ),
            st("Click **Save segment**."),
          ],
          tips: [
            "A segment **Used by an active campaign** can't be deleted. **Delete segment** asks you to **Confirm delete**.",
          ],
        },
      ],
    },
    fr: {
      title: "Créer un segment (audience)",
      summary:
        "Regrouper les contacts par service, secteur ou consentement ; les comptes se mettent à jour en direct.",
      sections: [
        {
          id: "seg",
          title: "Créer un segment",
          steps: [
            st(
              "Cliquez sur **Segments**, puis **Nouveau segment**.",
              "marketing-segments",
              ["Nouveau segment"],
            ),
            st("Saisissez le **Nom du segment**."),
            st(
              "Cliquez sur **Ajouter une règle** et choisissez un champ (**Secteur**, **District**, **Service utilisé**, **Consentement e-mail**…), un opérateur et une **Valeur**. **Ajouter un groupe** crée un groupe OU.",
              "marketing-segment",
              ["Ajouter une règle", "Aperçu"],
            ),
            st(
              "Lisez le panneau de droite : **Correspondent**, **Exclus** et **Éligibles** pour le canal choisi dans **Aperçu pour le canal** ; **Pourquoi exclus** détaille les exclusions.",
            ),
            st("Cliquez sur **Enregistrer**."),
          ],
          tips: [
            "Un segment **Utilisé par une campagne active** ne peut pas être supprimé. **Supprimer le segment** demande **Confirmer la suppression**.",
          ],
        },
      ],
    },
    rw: {
      title: "Kora itsinda (abo ubutumwa bugenewe)",
      summary:
        "Tondeka abantu ukurikije serivisi, urwego cyangwa uruhushya; imibare ihinduka uko wubaka.",
      sections: [
        {
          id: "seg",
          title: "Kora itsinda",
          steps: [
            st(
              "Kanda **Amatsinda**, hanyuma **Itsinda rishya**.",
              "marketing-segments",
              ["Itsinda rishya"],
            ),
            st("Andika **Izina ry'itsinda**."),
            st(
              "Kanda **Ongeraho itegeko** uhitemo ikiranga, uburyo n'agaciro. **Ongeraho itsinda** ikora itsinda rya « CYANGWA ».",
              "marketing-segment",
              ["Ongeraho itegeko", "Igaragaza"],
            ),
            st(
              "Soma iburyo: abahuye, abakuwemo n'abemerewe ku muyoboro wahisemo muri **Reba ku muyoboro**; **Impamvu bakuwemo** irabisobanura.",
            ),
            st("Kanda **Bika itsinda**."),
          ],
          tips: [
            "Itsinda rikoreshwa n'ubukangurambaga burimo gukora ntirisibwa. **Siba itsinda** isaba **Emeza gusiba**.",
          ],
        },
      ],
    },
  }),

  G("marketing-campaign-create", "campaigns", 5, ["/marketing/campaigns"], {
    en: {
      title: "Create a campaign (email, WhatsApp, SMS)",
      summary:
        "The five-step wizard: audience, channel, content, schedule, review. A draft is saved at each step.",
      sections: [
        {
          id: "wizard",
          title: "Build the campaign",
          steps: [
            st(
              "Click **Campaigns**, then **New campaign**.",
              "marketing-campaigns",
              ["New campaign", "Views", "Campaign list"],
            ),
            st(
              "**Audience**: type the **Campaign name** and **Pick a segment**. Click **Next**.",
              "marketing-campaign-new",
              ["Current step", "Summary and cost"],
            ),
            st(
              "**Channel**: choose email, WhatsApp or SMS and a **Template**. Only active marketing templates can be used.",
            ),
            st(
              "**Content**: write per language (**Subject A**, optional **Subject B (optional A/B test)**, **Message**). Choose whether to send the fallback language to people without content in theirs.",
            ),
            st(
              "**Schedule**: **Send as soon as approved** or **Schedule** with a date and time (Kigali). Messages due between 21:00 and 07:00 go out at 07:00.",
            ),
            st(
              "**Review**: check the **Summary**, cost and audience after consent. Click **Test send to me** to see it yourself.",
            ),
            st(
              "If **Needs approval** shows, choose an **Approver** (someone other than you) and click **Submit for approval**. Otherwise click **Schedule** or **Send now**.",
            ),
          ],
          warn: "**Send now** messages real customers immediately. Use **Test send to me** first and check the language split and cost.",
          tips: [
            "Consent is checked when you build the audience and again at send time. Every email gets an unsubscribe link.",
          ],
        },
      ],
    },
    fr: {
      title: "Créer une campagne (e-mail, WhatsApp, SMS)",
      summary:
        "L'assistant en cinq étapes : audience, canal, contenu, planification, vérification. Brouillon enregistré à chaque étape.",
      sections: [
        {
          id: "wizard",
          title: "Construire la campagne",
          steps: [
            st(
              "Cliquez sur **Campagnes**, puis **Nouvelle campagne**.",
              "marketing-campaigns",
              ["Nouvelle campagne", "Vues", "Liste"],
            ),
            st(
              "**Audience** : saisissez le **Nom de la campagne** et **Choisir un segment**. Cliquez sur **Suivant**.",
              "marketing-campaign-new",
              ["Étape", "Résumé et coût"],
            ),
            st(
              "**Canal** : choisissez e-mail, WhatsApp ou SMS et un **Modèle**. Seuls les modèles marketing actifs sont utilisables.",
            ),
            st(
              "**Contenu** : rédigez par langue (**Objet A**, **Objet B (test A/B facultatif)**, **Message**). Choisissez d'envoyer ou non la langue de repli.",
            ),
            st(
              "**Planification** : **Envoyer dès validation** ou **Programmer** (date et heure de Kigali). Entre 21 h et 7 h, l'envoi part à 7 h.",
            ),
            st(
              "**Vérification** : contrôlez le **Résumé**, le coût et l'audience après consentement. **Envoi test à moi** pour le recevoir.",
            ),
            st(
              "Si **Validation requise** s'affiche, choisissez un **Valideur** (autre que vous) et **Soumettre à validation**. Sinon **Programmer** ou **Envoyer**.",
            ),
          ],
          warn: "**Envoyer** contacte de vrais clients immédiatement. Faites d'abord **Envoi test à moi** et vérifiez langues et coût.",
          tips: [
            "Le consentement est vérifié à la création de l'audience puis à l'envoi. Chaque e-mail a un lien de désinscription.",
          ],
        },
      ],
    },
    rw: {
      title: "Kora ubukangurambaga (imeyili, WhatsApp, SMS)",
      summary:
        "Intambwe eshanu: abo bugenewe, umuyoboro, ubutumwa, igihe, isuzuma. Umushinga ubikwa kuri buri ntambwe.",
      sections: [
        {
          id: "wizard",
          title: "Kora ubukangurambaga",
          steps: [
            st(
              "Kanda **Ubukangurambaga**, hanyuma **Ubukangurambaga bushya**.",
              "marketing-campaigns",
              ["Ubukangurambaga bushya", "Ibyiciro", "Urutonde"],
            ),
            st(
              "**Abo bugenewe**: andika **Izina ry'ubukangurambaga** kandi **Hitamo itsinda**. Kanda **Komeza**.",
              "marketing-campaign-new",
              ["Intambwe", "Incamake n'igiciro"],
            ),
            st(
              "**Umuyoboro**: hitamo imeyili, WhatsApp cyangwa SMS n'**Inyandikorugero**. Izikora gusa ni zo zikoreshwa.",
            ),
            st(
              "**Ubutumwa**: andika kuri buri rurimi (**Umutwe A**, **Umutwe B (igerageza A/B, si ngombwa)**, ubutumwa).",
            ),
            st(
              "**Igihe**: **Ohereza nibimara kwemezwa** cyangwa **Teganya** (itariki n'isaha bya Kigali). Ubutumwa bwa hagati ya 21:00 na 07:00 bwoherezwa saa 07:00.",
            ),
            st(
              "**Isuzuma**: genzura incamake, igiciro n'abasigaye nyuma y'uruhushya. Kanda **Gerageza unyoherereze**.",
            ),
            st(
              "Niba bikeneye kwemezwa, hitamo **Uwemeza** (utari wowe) ukande **Ohereza ngo byemezwe**. Bitabaye ibyo kanda **Teganya** cyangwa **Ohereza ubu**.",
            ),
          ],
          warn: "**Ohereza ubu** igeza ubutumwa ku bakiriya nyabo ako kanya. Banza ukoreshe **Gerageza unyoherereze**, ugenzure indimi n'igiciro.",
          tips: [
            "Uruhushya rugenzurwa igihe ukora abo bugenewe no mu gihe cyo kohereza.",
          ],
        },
      ],
    },
  }),

  G("marketing-campaign-track", "campaigns", 3, ["/marketing/campaigns"], {
    en: {
      title: "Approve, send and track a campaign",
      summary:
        "For approvers (marketing other than the creator, or an executive) and for following results.",
      facts: { who: "Approver: marketing (not the creator) or an executive" },
      sections: [
        {
          id: "track",
          title: "Approve and follow",
          steps: [
            st(
              "In **Campaigns**, open **Awaiting approval** and click the campaign.",
              "marketing-campaign",
              ["Tabs", "Approve"],
            ),
            st(
              "Read **Overview**: audience, cost, budget and content. Click **Approve**, or **Reject** and write why (the creator sees it).",
            ),
            st(
              "Once approved, **Send now** starts sending (or it waits for its scheduled time). **Pause**, **Resume** and **Cancel campaign** control it while sending.",
            ),
            st(
              "Open **Results** for **Delivered**, **Opened**, **Clicked**, **Leads**, **Revenue** and results **By language**; use **Retry failed** if messages failed.",
            ),
            st(
              "Open **Recipients** to see each person's state; **Export** asks for a reason and is logged.",
            ),
          ],
          warn: "You can't approve a campaign you created. Messages already sent stay sent if you cancel.",
          tips: [
            "A campaign paused at the monthly budget cap needs **Accept and resume**.",
          ],
        },
      ],
    },
    fr: {
      title: "Valider, envoyer et suivre une campagne",
      summary:
        "Pour les valideurs (marketing autre que le créateur, ou direction) et le suivi des résultats.",
      facts: { who: "Valideur : marketing (pas le créateur) ou direction" },
      sections: [
        {
          id: "track",
          title: "Valider et suivre",
          steps: [
            st(
              "Dans **Campagnes**, ouvrez **En attente de validation** et cliquez sur la campagne.",
              "marketing-campaign",
              ["Onglets", "Valider"],
            ),
            st(
              "Lisez **Aperçu** : audience, coût, budget et contenu. Cliquez sur **Valider**, ou **Refuser** en expliquant pourquoi.",
            ),
            st(
              "Une fois validée, **Envoyer** lance l'envoi (ou elle attend son heure). **Pause**, **Reprendre** et **Annuler la campagne** la pilotent.",
            ),
            st(
              "**Résultats** montre livrés, ouverts, clics, prospects, revenu et par langue ; **Relancer les échecs** si besoin.",
            ),
            st(
              "**Destinataires** montre l'état de chacun ; **Exporter** demande un motif et est consigné.",
            ),
          ],
          warn: "Vous ne pouvez pas valider une campagne que vous avez créée. Les messages déjà envoyés le restent en cas d'annulation.",
        },
      ],
    },
    rw: {
      title: "Emeza, wohereze kandi ukurikirane ubukangurambaga",
      summary:
        "Ku bemeza (uwo mu bucuruzi utari uwabukoze, cyangwa ubuyobozi bukuru) no gukurikirana ibisubizo.",
      facts: {
        who: "Uwemeza: ubucuruzi (si uwabukoze) cyangwa ubuyobozi bukuru",
      },
      sections: [
        {
          id: "track",
          title: "Emeza kandi ukurikirane",
          steps: [
            st(
              "Muri **Ubukangurambaga**, fungura **Bitegereje kwemezwa** ukande ku bukangurambaga.",
              "marketing-campaign",
              ["Ibice", "Emeza"],
            ),
            st(
              "Soma **Incamake**: abo bugenewe, igiciro, ingengo y'imari n'ubutumwa. Kanda **Emeza**, cyangwa **Anga** wandike impamvu.",
            ),
            st(
              "Bumaze kwemezwa, **Ohereza ubu** iratangira kohereza (cyangwa bugategereza igihe cyabwo). **Hagarika**, **Komeza** na **Hagarika burundu** birabugenzura.",
            ),
            st(
              "**Ibisubizo** byerekana ibyakiriwe, ibyafunguwe, ibyakanzweho n'ibindi; **Ongera wohereze ibyanze** bibaye ngombwa.",
            ),
            st(
              "**Abakira** herekana buri muntu; **Kuramo** isaba impamvu kandi irandikwa.",
            ),
          ],
          warn: "Ntushobora kwemeza ubukangurambaga wakoze. Ubutumwa bwoherejwe ntibusubirwamo iyo uhagaritse.",
        },
      ],
    },
  }),

  G("marketing-sequences", "campaigns", 4, ["/marketing/sequences"], {
    en: {
      title: "Set up an automatic follow-up sequence",
      summary:
        "Follow up automatically on chosen days. Consent, quiet hours and the weekly limit always apply.",
      sections: [
        {
          id: "seq",
          title: "Create a sequence",
          steps: [
            st(
              "Click **Sequences**. Tabs: **All**, **Active**, **Paused**, **System** (tax and renewal reminders owned by Service Management, view only).",
              "marketing-sequences",
              ["New sequence", "Tabs"],
            ),
            st(
              "Click **New sequence**, name it and choose the **Trigger** (for example **Quote sent, no reply** or **Inactive for 90 days**).",
            ),
            st(
              "Under **Steps**, click **Add step**: set **Wait (days)** and the **Action** (**Send template**, **Create task** or **Set stage**). Use **Preview** to check a template per language.",
            ),
            st(
              "Tick **Stops when** (**Replied**, **Paid**, **Unsubscribed**, **Won**, **Lost**) and click **Save sequence**.",
            ),
            st(
              "Open **Runs** to see who is enrolled, their step and state. To stop it, switch it off and click **Pause sequence**: next steps of people mid-sequence are cancelled.",
            ),
          ],
          warn: "An active sequence messages customers without further approval. Check every template before switching it on.",
        },
      ],
    },
    fr: {
      title: "Mettre en place une séquence de relance",
      summary:
        "Relancer automatiquement aux jours choisis. Consentement, heures de silence et limite hebdo s'appliquent toujours.",
      sections: [
        {
          id: "seq",
          title: "Créer une séquence",
          steps: [
            st(
              "Cliquez sur **Séquences**. Onglets **Toutes**, **Actives**, **En pause**, **Système** (rappels fiscaux et renouvellements gérés par le Service, lecture seule).",
              "marketing-sequences",
              ["Nouvelle séquence", "Onglets"],
            ),
            st(
              "Cliquez sur **Nouvelle séquence**, nommez-la et choisissez le **Déclencheur**.",
            ),
            st(
              "Sous **Étapes**, cliquez sur **Ajouter une étape** : **Attente (jours)** et **Action** (envoyer un modèle, créer une tâche, changer l'étape). L'aperçu vérifie le modèle par langue.",
            ),
            st("Cochez **S'arrête si** et cliquez sur **Enregistrer**."),
            st(
              "**Exécutions** montre les inscrits, leur étape et état. Pour arrêter, désactivez-la et cliquez sur **Mettre en pause** : les étapes suivantes sont annulées.",
            ),
          ],
          warn: "Une séquence active contacte les clients sans autre validation. Vérifiez chaque modèle avant de l'activer.",
        },
      ],
    },
    rw: {
      title: "Shyiraho ikurikiranya ryikora",
      summary:
        "Kurikirana abantu mu buryo bwikora ku minsi wahisemo. Uruhushya, amasaha yo guceceka n'imbibi z'icyumweru bihora bikurikizwa.",
      sections: [
        {
          id: "seq",
          title: "Kora ikurikiranya",
          steps: [
            st(
              "Kanda **Ikurikiranya**. Ibice: **Byose**, **Birakora**, **Byahagaritswe**, **Sisitemu** (ibyibutsa by'imisoro bya serivisi, ureba gusa).",
              "marketing-sequences",
              ["Ikurikiranya rishya", "Ibice"],
            ),
            st(
              "Kanda **Ikurikiranya rishya**, uryite izina, uhitemo **Igitangiza**.",
            ),
            st(
              "Munsi ya **Intambwe**, kanda **Ongeraho intambwe**: **Tegereza (iminsi)** n'**Igikorwa**. Reba inyandikorugero kuri buri rurimi.",
            ),
            st("Hitamo **Bihagarara iyo** ukande **Bika**."),
            st(
              "**Ibikorwa** herekana abarimo n'aho bageze. Kugira ngo urihagarike, rizimye ukande **Hagarika**: intambwe zikurikira zirahagarara.",
            ),
          ],
          warn: "Ikurikiranya rikora ryandikira abakiriya nta yindi yemeza. Genzura inyandikorugero zose mbere yo kurifungura.",
        },
      ],
    },
  }),

  G("marketing-templates", "campaigns", 3, ["/marketing/templates"], {
    en: {
      title: "Create message templates (and get WhatsApp approval)",
      summary:
        "Marketing templates per channel and language. WhatsApp templates need Meta's approval before use.",
      sections: [
        {
          id: "tpl",
          title: "Create a template",
          steps: [
            st(
              "Click **Templates**, then **New template**.",
              "marketing-templates",
              ["New template"],
            ),
            st(
              "Fill **Key (lowercase, underscores)**, the channel, **Language**, **Subject** (email) and **Message**. Only the variables {{first_name}}, {{org}} and {{link}} are allowed.",
            ),
            st(
              "Click to create it. Open it any time to edit; **Preview with sample data** shows the result.",
            ),
            st(
              "For WhatsApp, click **Submit to Meta**. The status becomes **Waiting for Meta**, then **Active** or **Rejected**.",
            ),
            st(
              "If rejected, read the reason, click **Edit & resubmit**, fix and submit again.",
            ),
          ],
          tips: [
            "Only **Active** templates can be picked in campaigns, sequences and the Inbox.",
          ],
        },
      ],
    },
    fr: {
      title: "Créer des modèles de message (et la validation WhatsApp)",
      summary:
        "Modèles marketing par canal et langue. Les modèles WhatsApp doivent être validés par Meta.",
      sections: [
        {
          id: "tpl",
          title: "Créer un modèle",
          steps: [
            st(
              "Cliquez sur **Modèles**, puis **Nouveau modèle**.",
              "marketing-templates",
              ["Nouveau modèle"],
            ),
            st(
              "Remplissez **Clé (minuscules, tirets bas)**, le canal, la langue, l'objet (e-mail) et le message. Seules les variables {{first_name}}, {{org}} et {{link}} sont acceptées.",
            ),
            st(
              "Créez-le. Ouvrez-le pour le modifier ; **Aperçu avec données d'exemple** montre le rendu.",
            ),
            st(
              "Pour WhatsApp, cliquez sur **Soumettre à Meta**. Le statut passe à **En attente de Meta**, puis **Actif** ou **Refusé**.",
            ),
            st(
              "En cas de refus, lisez le motif, cliquez sur **Modifier et resoumettre**, corrigez et renvoyez.",
            ),
          ],
          tips: [
            "Seuls les modèles **Actif** sont proposés dans campagnes, séquences et messages.",
          ],
        },
      ],
    },
    rw: {
      title: "Kora inyandikorugero z'ubutumwa (n'iyemezwa rya WhatsApp)",
      summary:
        "Inyandikorugero kuri buri muyoboro n'ururimi. Iza WhatsApp zibanza kwemezwa na Meta.",
      sections: [
        {
          id: "tpl",
          title: "Kora inyandikorugero",
          steps: [
            st(
              "Kanda **Inyandikorugero**, hanyuma **Inyandikorugero nshya**.",
              "marketing-templates",
              ["Inyandikorugero nshya"],
            ),
            st(
              "Uzuza **Urufunguzo (inyuguti nto, _)**, umuyoboro, ururimi, umutwe (imeyili) n'ubutumwa. Ibihinduka byemewe ni {{first_name}}, {{org}} na {{link}} gusa.",
            ),
            st(
              "Yikore. Yifungure igihe cyose ushaka kuyihindura; **Igaragaza n'amakuru y'icyitegererezo** yerekana uko izaba imeze.",
            ),
            st(
              "Kuri WhatsApp, kanda **Ohereza kuri Meta**. Bihinduka **Bitegereje Meta**, hanyuma **Birakora** cyangwa **Byanzwe**.",
            ),
            st(
              "Niba yanzwe, soma impamvu, ukande **Hindura wongere wohereze**.",
            ),
          ],
        },
      ],
    },
  }),

  G("marketing-referrals", "campaigns", 2, ["/marketing/referrals"], {
    en: {
      title: "Run the referral programme",
      summary:
        "Clients and agents share a link; a reward is due after the referee's first paid request.",
      sections: [
        {
          id: "rf",
          title: "Set up and follow",
          steps: [
            st(
              "Click **Referrals**. On **Programme**, switch **Programme active**, set **Reward (RWF credit)** and tick **Who can refer** (**Clients**, **Agents**).",
              "marketing-referrals",
              ["Save programme"],
            ),
            st(
              "Click **Save programme**. **What the client sees** previews the message.",
            ),
            st(
              "**Fraud checks** shows blocked self-referrals and existing clients (no reward).",
            ),
            st(
              "Open **Referrers** to see each link, people referred and reward due (**Copy link** to share); open **Referrals** for each referred person's state.",
            ),
          ],
          tips: [
            "Rewards are paid out by Finance. Totals here are for display.",
          ],
        },
      ],
    },
    fr: {
      title: "Gérer le programme de parrainage",
      summary:
        "Clients et agents partagent un lien ; la récompense est due après la première demande payée du filleul.",
      sections: [
        {
          id: "rf",
          title: "Configurer et suivre",
          steps: [
            st(
              "Cliquez sur **Parrainages**. Dans **Programme**, activez **Programme actif**, réglez **Récompense (avoir RWF)** et cochez qui peut parrainer.",
              "marketing-referrals",
              ["Enregistrer"],
            ),
            st(
              "Cliquez sur **Enregistrer**. L'aperçu montre ce que voit le client.",
            ),
            st(
              "**Contrôles anti-fraude** montre les auto-parrainages bloqués et les clients existants (sans récompense).",
            ),
            st(
              "**Parrains** liste chaque lien et la récompense due (**Copier le lien**) ; **Filleuls** l'état de chaque personne.",
            ),
          ],
          tips: [
            "Les récompenses sont versées par la Finance ; les totaux ici sont indicatifs.",
          ],
        },
      ],
    },
    rw: {
      title: "Gucunga gahunda yo gutumira",
      summary:
        "Abakiriya n'abakozi basangiza ihuza; igihembo kigerwaho nyuma y'uko uwatumiwe yishyura bwa mbere.",
      sections: [
        {
          id: "rf",
          title: "Shyiraho kandi ukurikirane",
          steps: [
            st(
              "Kanda **Abo watumiye**. Muri **Gahunda**, fungura **Gahunda irakora**, ushyireho **Igihembo (RWF)** n'abemerewe gutumira.",
              "marketing-referrals",
              ["Bika"],
            ),
            st("Kanda **Bika**. Igaragaza ryerekana ubutumwa umukiriya abona."),
            st(
              "**Igenzura ry'uburiganya** ryerekana abitumiye ubwabo n'abari basanzwe ari abakiriya.",
            ),
            st(
              "**Abohereza** herekana buri huza n'igihembo (**Kopa ihuza**); **Aboherejwe** herekana aho buri muntu ageze.",
            ),
          ],
          tips: [
            "Ibihembo byishyurwa n'Imari; imibare iri aha ni iyo kureba gusa.",
          ],
        },
      ],
    },
  }),

  // ───────────── Social proof & feedback
  G("marketing-testimonials", "proof", 3, ["/marketing/testimonials"], {
    en: {
      title: "Approve testimonials for the website",
      summary: "Only clients who agreed to be quoted can appear on the site.",
      sections: [
        {
          id: "ts",
          title: "Review a testimonial",
          steps: [
            st(
              "Click **Testimonials**. Tabs: **Pending**, **Published**, **Rejected**.",
              "marketing-testimonials",
              ["Tabs", "Approve"],
            ),
            st(
              "Check the quote, rating and **Consent**. Without consent, click **Request consent** and wait.",
            ),
            st(
              "To shorten it, click **Edit excerpt**, pick words from the original and **Save and ask client** (the client must agree again).",
            ),
            st(
              "Click **Approve**, tick **Where should it appear?** (**Home page proof**, **Service page**, **Landing pages**) and click **Publish**.",
            ),
            st(
              "To refuse, click **Reject** and pick a reason. **Unpublish** moves a published one back to pending.",
            ),
          ],
          warn: "Publishing shows the client's words to every visitor. Remove personal details first.",
        },
      ],
    },
    fr: {
      title: "Valider les témoignages pour le site",
      summary:
        "Seuls les clients ayant accepté d'être cités peuvent apparaître.",
      sections: [
        {
          id: "ts",
          title: "Examiner un témoignage",
          steps: [
            st(
              "Cliquez sur **Témoignages**. Onglets **En attente**, **Publiés**, **Refusés**.",
              "marketing-testimonials",
              ["Onglets", "Valider"],
            ),
            st(
              "Vérifiez citation, note et consentement. Sans consentement, cliquez sur **Demander le consentement**.",
            ),
            st(
              "Pour raccourcir, **Modifier l'extrait**, choisissez des mots de l'original puis **Enregistrer et demander** (le client doit réaccepter).",
            ),
            st(
              "Cliquez sur **Valider**, cochez **Où l'afficher ?** puis **Publier**.",
            ),
            st(
              "Pour refuser, **Refuser** avec un motif. **Dépublier** remet en attente.",
            ),
          ],
          warn: "Publier montre les mots du client à tous. Retirez d'abord les détails personnels.",
        },
      ],
    },
    rw: {
      title: "Emeza ubuhamya bugaragara ku rubuga",
      summary: "Abakiriya bemeye gusubirwamo gusa ni bo bagaragara ku rubuga.",
      sections: [
        {
          id: "ts",
          title: "Suzuma ubuhamya",
          steps: [
            st(
              "Kanda **Ubuhamya**. Ibice: **Bitegereje**, **Byatangajwe**, **Byanzwe**.",
              "marketing-testimonials",
              ["Ibice", "Emeza"],
            ),
            st(
              "Genzura amagambo, amanota n'uruhushya. Niba nta ruhushya, kanda **Saba uruhushya**.",
            ),
            st(
              "Kugira ngo ubugabanye, kanda **Hindura igice**, uhitemo amagambo, **Bika usabe umukiriya** (umukiriya yongera kwemera).",
            ),
            st(
              "Kanda **Emeza**, uhitemo **Bigaragare he?**, ukande **Tangaza**.",
            ),
            st(
              "Kugira ngo ubwange, kanda **Anga** uhitemo impamvu. **Kuraho** busubira mu bitegereje.",
            ),
          ],
          warn: "Gutangaza bigaragaza amagambo y'umukiriya kuri bose. Banza ukureho amakuru bwite.",
        },
      ],
    },
  }),

  G("marketing-team-page", "proof", 2, ["/marketing/team"], {
    en: {
      title: "Approve staff for the public team page",
      summary:
        "Staff can opt in to appear on hebuza.rw/about/team; marketing approves each request.",
      sections: [
        {
          id: "team",
          title: "Decide a request",
          steps: [
            st(
              "Click **Team page**. **Team page requests** lists each person's name, title and short bio.",
              "marketing-team"
            ),
            st("Optionally type a **Note to the worker (optional)**."),
            st(
              "Click **Approve** to put them live on the team page, or **Reject**. The toast says “Decision saved.”",
            ),
          ],
          tips: ["No contact details or CV are ever published."],
        },
      ],
    },
    fr: {
      title: "Valider les collaborateurs pour la page équipe",
      summary:
        "Les collaborateurs peuvent demander à figurer sur hebuza.rw/about/team ; le marketing valide.",
      sections: [
        {
          id: "team",
          title: "Traiter une demande",
          steps: [
            st(
              "Cliquez sur **Page équipe**. **Demandes page équipe** liste nom, titre et courte bio.",
              "marketing-team"
            ),
            st("Ajoutez si besoin une **Note au collaborateur (facultatif)**."),
            st(
              "Cliquez sur **Valider** pour la mise en ligne, ou **Refuser**. Le message indique « Décision enregistrée. »",
            ),
          ],
          tips: ["Aucune coordonnée ni CV n'est publié."],
        },
      ],
    },
    rw: {
      title: "Emeza abakozi bagaragara ku rupapuro rw'itsinda",
      summary:
        "Abakozi bashobora gusaba kugaragara kuri hebuza.rw/about/team; ubucuruzi bwemeza buri busabe.",
      sections: [
        {
          id: "team",
          title: "Fata icyemezo",
          steps: [
            st(
              "Kanda **Urupapuro rw'itsinda**. **Abasaba kugaragara ku rubuga** herekana izina, umwanya n'incamake.",
              "marketing-team"
            ),
            st("Niba ubishaka, andika **Ubutumwa ku mukozi (si ngombwa)**."),
            st(
              "Kanda **Emeza** kugira ngo agaragare, cyangwa **Anga**. Ubutumwa buvuga « Icyemezo cyabitswe. »",
            ),
          ],
          tips: ["Nta makuru yo kumuvugisha cyangwa CV bitangazwa."],
        },
      ],
    },
  }),

  G("marketing-feedback", "proof", 2, ["/marketing/feedback"], {
    en: {
      title: "Read client feedback and NPS",
      summary:
        "What clients say after a request is done: average rating, NPS, themes and recent comments.",
      sections: [
        {
          id: "fb",
          title: "Read feedback",
          steps: [
            st(
              "Click **Feedback**. Choose the period and, if you like, one service instead of **All services**.",
              "marketing-feedback",
              ["Period"],
            ),
            st(
              "Read **Average rating**, **NPS** and **Responses**. NPS shows only once there are enough responses.",
            ),
            st(
              "Use **Rating by service**, **Themes** (speed, communication, price, clarity, documents) and **Stars** to see what to improve.",
            ),
            st(
              "**Recently published** lists the latest comments. Good, consented ones appear under **Testimonials**.",
            ),
          ],
        },
      ],
    },
    fr: {
      title: "Lire les avis clients et le NPS",
      summary:
        "Ce que disent les clients après une demande : note moyenne, NPS, thèmes et commentaires.",
      sections: [
        {
          id: "fb",
          title: "Lire les avis",
          steps: [
            st(
              "Cliquez sur **Avis**. Choisissez la période et, si besoin, un service au lieu de **Tous les services**.",
              "marketing-feedback",
              ["Période"],
            ),
            st(
              "Lisez note moyenne, **NPS** et réponses. Le NPS n'apparaît qu'avec assez de réponses.",
            ),
            st(
              "**Note par service**, **Thèmes** et répartition des étoiles montrent quoi améliorer.",
            ),
            st(
              "Les derniers commentaires sont listés en bas. Les bons, consentis, arrivent dans **Témoignages**.",
            ),
          ],
        },
      ],
    },
    rw: {
      title: "Soma ibitekerezo by'abakiriya na NPS",
      summary:
        "Ibyo abakiriya bavuga nyuma ya serivisi: amanota, NPS, insanganyamatsiko n'ibitekerezo bya vuba.",
      sections: [
        {
          id: "fb",
          title: "Soma ibitekerezo",
          steps: [
            st(
              "Kanda **Ibitekerezo**. Hitamo igihe kandi, niba ubishaka, serivisi imwe aho kuba **Serivisi zose**.",
              "marketing-feedback",
              ["Igihe"],
            ),
            st(
              "Soma amanota y'ikigereranyo, **NPS** n'umubare w'ibisubizo. NPS igaragara iyo ibisubizo bihagije.",
            ),
            st(
              "**Amanota kuri serivisi**, **Insanganyamatsiko** n'inyenyeri byerekana icyo kunoza.",
            ),
            st(
              "Ibitekerezo bya vuba biri hasi. Ibyiza byemerewe bijya muri **Ubuhamya**.",
            ),
          ],
        },
      ],
    },
  }),

  // ───────────── Reports & site
  G("marketing-reports", "site", 3, ["/marketing/reports"], {
    en: {
      title: "Read and export marketing reports",
      summary:
        "Where leads come from and which campaigns pay back. Executives can open this screen too.",
      sections: [
        {
          id: "rep",
          title: "Reports",
          steps: [
            st(
              "Click **Reports**. Choose the period, then a tab: **Funnel**, **Campaigns**, **Leads**, **Traffic**, **Social**, **Clients**.",
              "marketing-reports",
              ["Period", "Tabs"],
            ),
            st(
              "On **Funnel** and **Campaigns**, switch **Attribution** between **Last non-direct touch** and **First touch**.",
            ),
            st(
              "On **Social**, paste a CSV or click **Import CSV**, then **Preview** and **Import … rows**; **Download template** gives the format, **Add manually** adds one row.",
            ),
            st(
              "Click **Export**, choose CSV, Excel or PDF, give the reason and confirm. Exports are logged with your reason.",
            ),
          ],
        },
      ],
    },
    fr: {
      title: "Lire et exporter les rapports marketing",
      summary:
        "D'où viennent les prospects et quelles campagnes rapportent. La direction y a aussi accès.",
      sections: [
        {
          id: "rep",
          title: "Rapports",
          steps: [
            st(
              "Cliquez sur **Rapports**. Choisissez la période puis un onglet : **Entonnoir**, **Campagnes**, **Prospects**, **Trafic**, **Réseaux sociaux**, **Clients**.",
              "marketing-reports",
              ["Période", "Onglets"],
            ),
            st(
              "Sur **Entonnoir** et **Campagnes**, basculez **Attribution** entre dernier contact non direct et premier contact.",
            ),
            st(
              "Sur **Réseaux sociaux**, collez un CSV ou **Importer un CSV**, puis **Aperçu** et importez ; **Télécharger le modèle** donne le format, **Ajouter manuellement** une ligne.",
            ),
            st(
              "Cliquez sur **Exporter**, choisissez le format, donnez le motif et confirmez. Les exports sont consignés.",
            ),
          ],
        },
      ],
    },
    rw: {
      title: "Soma kandi ukuremo raporo z'ubucuruzi",
      summary:
        "Aho abashobora kuba abakiriya baturuka n'ubukangurambaga bwunguka. Ubuyobozi bukuru nabwo burabibona.",
      sections: [
        {
          id: "rep",
          title: "Raporo",
          steps: [
            st(
              "Kanda **Raporo**. Hitamo igihe, hanyuma igice: **Urugendo**, **Ubukangurambaga**, **Abashobora kuba abakiriya**, **Abasura**, **Imbuga nkoranyambaga**, **Abakiriya**.",
              "marketing-reports",
              ["Igihe", "Ibice"],
            ),
            st(
              "Kuri **Urugendo** n'**Ubukangurambaga**, hindura **Inkomoko** hagati y'aho baheruka n'aho batangiriye.",
            ),
            st(
              "Kuri **Imbuga nkoranyambaga**, shyiramo CSV cyangwa **Injiza CSV**, **Igaragaza**, hanyuma winjize; **Kuramo urugero** iguha imiterere, **Ongeraho n'intoki** yongeraho umurongo.",
            ),
            st(
              "Kanda **Kuramo**, uhitemo ubwoko, utange impamvu wemeze. Ibikuwemo birandikwa.",
            ),
          ],
        },
      ],
    },
  }),

  G("marketing-seo", "site", 5, ["/marketing/seo"], {
    en: {
      title: "Set up SEO, tracking, redirects and site settings",
      summary:
        "Search, analytics, conversions, redirects, site health, menus and contact details in one screen.",
      sections: [
        {
          id: "track",
          title: "Tracking",
          steps: [
            st(
              "Click **SEO & tracking**. Tabs: **SEO**, **Analytics**, **Conversions**, **Redirects**, **Site health**, **Navigation**, **Site settings**.",
            ),
            st(
              "**SEO**: check the **Sitemap** and paste the **Search Console verification token**, then **Save**.",
            ),
            st(
              "**Analytics**: fill **GA4 measurement ID** (format G-XXXXXXX), **Meta Pixel ID** and **Google Ads conversion IDs** (**Add ID**), then **Save**. The Pixel loads only after cookie consent.",
              "marketing-seo-analytics",
              ["GA4 measurement ID"],
            ),
            st(
              "**Conversions**: see **Events, last 7 days** to confirm tracking works.",
            ),
          ],
        },
        {
          id: "site",
          title: "Redirects and site",
          steps: [
            st(
              "**Redirects**: type **From** (/old-path), **To** (/new-path), pick the **Type** and click **Add redirect**. **Pages not found** lists missing addresses; **Create redirect** fixes one.",
              "marketing-seo-redirects",
              ["New redirect"],
            ),
            st(
              "**Site health**: fix **Broken links**; type a page and **Run check** for **Page speed** (LCP, CLS, INP).",
            ),
            st(
              "**Navigation**: pick the **Menu** (**Header**, **Phone menu**, **Footer**), edit labels per language, **Add item**, then **Save**.",
            ),
            st(
              "**Site settings**: address, phone, email, WhatsApp number, office hours, social links and the announcement bar (with dates). Click **Save**.",
            ),
          ],
          warn: "Navigation and site settings change the public website immediately after **Save**.",
        },
      ],
    },
    fr: {
      title: "Configurer SEO, suivi, redirections et réglages du site",
      summary:
        "Référencement, mesure, conversions, redirections, santé du site, menus et coordonnées sur un écran.",
      sections: [
        {
          id: "track",
          title: "Suivi",
          steps: [
            st(
              "Cliquez sur **SEO et suivi**. Onglets : **SEO**, **Analytics**, **Conversions**, **Redirects**, **Site health**, **Navigation**, **Site settings**.",
            ),
            st(
              "**SEO** : vérifiez le **Sitemap** et collez le **Search Console verification token**, puis **Enregistrer**.",
            ),
            st(
              "**Analytics** : remplissez **GA4 measurement ID** (format G-XXXXXXX), **Meta Pixel ID** et **Google Ads conversion IDs** (**Add ID**), puis **Enregistrer**. Le Pixel ne se charge qu'après consentement cookies.",
              "marketing-seo-analytics",
              ["GA4"],
            ),
            st(
              "**Conversions** : **Events, last 7 days** confirme que le suivi fonctionne.",
            ),
          ],
        },
        {
          id: "site",
          title: "Redirections et site",
          steps: [
            st(
              "**Redirects** : tapez **From** (/ancien), **To** (/nouveau), choisissez **Type** et **Add redirect**. **Pages not found** liste les adresses manquantes ; **Create redirect** en corrige une.",
              "marketing-seo-redirects",
              ["Nouvelle redirection"],
            ),
            st(
              "**Site health** : corrigez **Broken links** ; saisissez une page puis **Run check** pour **Page speed**.",
            ),
            st(
              "**Navigation** : choisissez le **Menu** (**Header**, **Phone menu**, **Footer**), modifiez les libellés par langue, **Add item**, puis **Enregistrer**.",
            ),
            st(
              "**Site settings** : adresse, téléphone, e-mail, WhatsApp, horaires, réseaux sociaux et bandeau d'annonce (avec dates). **Enregistrer**.",
            ),
          ],
          warn: "Navigation et réglages du site modifient le site public dès l'enregistrement.",
        },
      ],
    },
    rw: {
      title:
        "Shyiraho SEO, ikurikirana, kohereza ahandi n'igenamiterere ry'urubuga",
      summary:
        "Ishakiro, isesengura, imibare, kohereza ahandi, ubuzima bw'urubuga, menu n'aho batubona ku rupapuro rumwe.",
      sections: [
        {
          id: "track",
          title: "Ikurikirana",
          steps: [
            st(
              "Kanda **SEO n'ikurikirana**. Ibice: **SEO**, **Analytics**, **Conversions**, **Redirects**, **Site health**, **Navigation**, **Site settings**.",
            ),
            st(
              "**SEO**: reba **Sitemap** ushyiremo **Search Console verification token**, ukande **Bika**.",
            ),
            st(
              "**Analytics**: uzuza **GA4 measurement ID** (G-XXXXXXX), **Meta Pixel ID** na **Google Ads conversion IDs** (**Add ID**), ukande **Bika**. Pixel ikora gusa nyuma y'uruhushya rwa cookies.",
              "marketing-seo-analytics",
              ["GA4"],
            ),
            st(
              "**Conversions**: **Events, last 7 days** yemeza ko ikurikirana rikora.",
            ),
          ],
        },
        {
          id: "site",
          title: "Kohereza ahandi n'urubuga",
          steps: [
            st(
              "**Redirects**: andika **From** (/aho-kera), **To** (/aho-hashya), uhitemo **Type** ukande **Add redirect**. **Pages not found** herekana aderesi zibura; **Create redirect** ikemura imwe.",
              "marketing-seo-redirects",
              ["Kohereza gushya"],
            ),
            st(
              "**Site health**: kosora **Broken links**; andika urupapuro ukande **Run check** kuri **Page speed**.",
            ),
            st(
              "**Navigation**: hitamo **Menu** (**Header**, **Phone menu**, **Footer**), uhindure amazina kuri buri rurimi, **Add item**, ukande **Bika**.",
            ),
            st(
              "**Site settings**: aderesi, telefone, imeyili, WhatsApp, amasaha y'akazi, imbuga nkoranyambaga n'itangazo ryo hejuru (n'amatariki). Kanda **Bika**.",
            ),
          ],
          warn: "Navigation na Site settings bihindura urubuga rwa rubanda ako kanya nyuma yo kubika.",
        },
      ],
    },
  }),
];

export const MARKETING_WS: WsGuideSet = {
  workspace: "marketing",
  cats: [
    {
      key: "start",
      t: { en: "Getting started", fr: "Premiers pas", rw: "Gutangira" },
    },
    {
      key: "content",
      t: {
        en: "Content & publishing",
        fr: "Contenu et publication",
        rw: "Ibikubiyemo no gutangaza",
      },
    },
    {
      key: "knowledge",
      t: {
        en: "Knowledge, FAQs & media",
        fr: "Connaissances, FAQ et médias",
        rw: "Ubumenyi, ibibazo n'amafoto",
      },
    },
    {
      key: "crm",
      t: {
        en: "Leads & customers",
        fr: "Prospects et clients",
        rw: "Abashobora kuba abakiriya n'abakiriya",
      },
    },
    {
      key: "campaigns",
      t: {
        en: "Campaigns & automation",
        fr: "Campagnes et automatisation",
        rw: "Ubukangurambaga n'ikurikiranya",
      },
    },
    {
      key: "proof",
      t: {
        en: "Testimonials & feedback",
        fr: "Témoignages et avis",
        rw: "Ubuhamya n'ibitekerezo",
      },
    },
    {
      key: "site",
      t: {
        en: "Reports, SEO & site",
        fr: "Rapports, SEO et site",
        rw: "Raporo, SEO n'urubuga",
      },
    },
  ],
  guides,
};
