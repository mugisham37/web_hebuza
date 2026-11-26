import type { WsGuideSet } from "./index";

// system dashboard guides. rw/fr are drafts for native review. Shots: scripts/guides/ws-system.spec.ts.
const U = "2026-11-26";

export const SYSTEM_WS: WsGuideSet = {
  workspace: "system",
  cats: [
    {
      key: "start",
      t: { en: "Getting started", fr: "Premiers pas", rw: "Gutangira" },
    },
    {
      key: "access",
      t: {
        en: "People & access",
        fr: "Personnes et accès",
        rw: "Abantu n'uburenganzira",
      },
    },
    {
      key: "governance",
      t: {
        en: "Controls & approvals",
        fr: "Contrôles et approbations",
        rw: "Igenzura n'ibyemezo",
      },
    },
    { key: "platform", t: { en: "Platform", fr: "Plateforme", rw: "Urubuga" } },
  ],
  guides: [
    // ------------------------------------------------------------------ start
    {
      slug: "finish-setup",
      cat: "start",
      minutes: 4,
      updated: U,
      start: true,
      pages: ["/system"],
      t: {
        en: {
          title: "Finish setting up HEBUZA",
          summary:
            "The Overview shows a setup checklist until every item is done. Each item has a Fix button that takes you to the right screen.",
          keywords: "setup checklist first day bootstrap overview",
          facts: {
            who: "System administrator",
            time: "About an hour, spread over a few days",
          },
          sections: [
            {
              id: "checklist",
              title: "Work through the checklist",
              steps: [
                {
                  text: "Open **Overview** in the side menu. While setup is incomplete, **Finish setting up HEBUZA** appears at the top with a progress count.",
                  shot: "system-overview",
                  marks: ["Setup checklist", "Platform health", "Users"],
                },
                {
                  text: "Pick the first item without a tick and click **Fix** next to it. You land on the screen that solves it.",
                },
                {
                  text: "**Create two real system administrators**: invite a second named admin from **Users** (see “Invite a user”).",
                },
                {
                  text: "**Disable the bootstrap admin**: in **Users**, open the **Bootstrap & service** tab and click **Disable** on the **Seed account, disable now** banner.",
                },
                {
                  text: "**MFA enforced for all staff**, **Email sending tested**, **Payments sandbox tested**: set **Two-step sign-in** in **Settings → Security**, then **Send test** on the email and payment integrations.",
                },
                {
                  text: "**Backups running + first restore drill**: in **Operations → Backups**, click **Restore latest to staging**. A passed drill ticks the item.",
                },
                {
                  text: "When every item is ticked the checklist disappears and the Overview shows **Needs you** instead.",
                },
              ],
              tips: [
                "Items tick themselves from live checks; there is nothing to mark by hand.",
              ],
            },
            {
              id: "daily",
              title: "Your daily Overview",
              intro:
                "After setup, the Overview lists what needs you (approvals, degraded integrations, an access review due), then cards for platform health, users, security posture, last backup, integrations, budgets, the current access review, recent privileged changes and alerts. Each card has a link to its screen.",
            },
          ],
        },
        fr: {
          title: "Terminer la configuration de HEBUZA",
          summary:
            "La Vue d'ensemble affiche une liste de configuration tant que tout n'est pas fait. Chaque point a un bouton Corriger qui ouvre le bon écran.",
          keywords: "configuration liste premier jour amorçage",
          facts: {
            who: "Administrateur système",
            time: "Environ une heure, sur quelques jours",
          },
          sections: [
            {
              id: "checklist",
              title: "Suivre la liste",
              steps: [
                {
                  text: "Ouvrez **Vue d'ensemble** dans le menu latéral. Tant que la configuration n'est pas finie, **Terminer la configuration de HEBUZA** apparaît en haut avec un compteur.",
                  shot: "system-overview",
                  marks: [
                    "Liste de configuration",
                    "Santé de la plateforme",
                    "Utilisateurs",
                  ],
                },
                {
                  text: "Prenez le premier point non coché et cliquez sur **Corriger**. Vous arrivez sur l'écran qui le règle.",
                },
                {
                  text: "**Créer deux vrais administrateurs système** : invitez un second administrateur nommé depuis **Utilisateurs** (voir « Inviter un utilisateur »).",
                },
                {
                  text: "**Désactiver l'administrateur initial** : dans **Utilisateurs**, onglet **Amorçage & services**, cliquez sur **Désactiver** dans le bandeau **Compte d'amorçage, à désactiver**.",
                },
                {
                  text: "**MFA imposée à tout le personnel**, **Envoi d'e-mails testé**, **Paiements testés en bac à sable** : réglez **Connexion en deux étapes** dans **Paramètres → Sécurité**, puis **Tester** sur les intégrations e-mail et paiement.",
                },
                {
                  text: "**Sauvegardes actives + premier exercice de restauration** : dans **Exploitation → Sauvegardes**, cliquez sur **Restaurer en préproduction**. Un exercice réussi coche le point.",
                },
                {
                  text: "Quand tout est coché, la liste disparaît et la Vue d'ensemble affiche **À traiter**.",
                },
              ],
              tips: [
                "Les points se cochent seuls à partir de contrôles réels ; rien à cocher à la main.",
              ],
            },
            {
              id: "daily",
              title: "Votre Vue d'ensemble au quotidien",
              intro:
                "Après la configuration, la Vue d'ensemble liste ce qui vous attend (approbations, intégrations dégradées, revue d'accès à faire), puis des cartes : santé, utilisateurs, sécurité, dernière sauvegarde, intégrations, budgets, revue d'accès, changements privilégiés récents et alertes. Chaque carte mène à son écran.",
            },
          ],
        },
        rw: {
          title: "Rangiza gutunganya HEBUZA",
          summary:
            "Incamake yerekana urutonde rwo gutunganya kugeza byose birangiye. Buri kintu gifite buto Kosora ikujyana aho bikosorerwa.",
          keywords: "gutunganya urutonde umunsi wa mbere konti y'ibanze",
          facts: {
            who: "Umuyobozi wa sisitemu",
            time: "Hafi isaha imwe, mu minsi mike",
          },
          sections: [
            {
              id: "checklist",
              title: "Kurikiza urutonde",
              steps: [
                {
                  text: "Fungura **Incamake** mu rutonde rw'uruhande. Igihe gutunganya bitararangira, **Rangiza gutunganya HEBUZA** igaragara hejuru n'umubare w'ibyakozwe.",
                  shot: "system-overview",
                  marks: [
                    "Urutonde rwo gutunganya",
                    "Uko urubuga rumeze",
                    "Abakoresha",
                  ],
                },
                {
                  text: "Fata ikintu cya mbere kitarakorwa ukande **Kosora** iruhande rwacyo. Ugera aho gikemurirwa.",
                },
                {
                  text: "**Shyiraho abayobozi ba sisitemu babiri nyabo**: tumira undi muyobozi ufite izina uhereye ku **Abakoresha** (reba “Tumira umukoresha”).",
                },
                {
                  text: "**Funga konti y'ibanze**: muri **Abakoresha**, fungura **Konti za serivisi** ukande **Funga** ku itangazo **Konti y'itangiriro, yifunge ubu**.",
                },
                {
                  text: "**MFA itegetswe ku bakozi bose**, **Kohereza imeyili byageragejwe**, **Kwishyura byageragejwe mu igerageza**: hitamo **Kwinjira mu ntambwe ebyiri** muri **Igenamiterere → Umutekano**, hanyuma **Gerageza** kuri imeyili no kwishyura.",
                },
                {
                  text: "**Kubika birakora + igerageza rya mbere ryo kugarura**: muri **Imikorere → Ububiko**, kanda **Garura ubuheruka muri igerageza**. Igerageza ryatsinze rirangiza iki kintu.",
                },
                {
                  text: "Byose nibimara gukorwa, urutonde ruravaho maze Incamake ikerekana **Ibigutegereje**.",
                },
              ],
              tips: [
                "Ibintu byemezwa ubwabyo hakurikijwe igenzura nyaryo; nta cyo ukanda n'intoki.",
              ],
            },
            {
              id: "daily",
              title: "Incamake ya buri munsi",
              intro:
                "Nyuma yo gutunganya, Incamake yerekana ibigutegereje (ibyemezo, guhuza sisitemu kutagenda neza, isuzuma ry'uburenganzira), hanyuma amakarita: uko urubuga rumeze, abakoresha, umutekano, ububiko buheruka, guhuza sisitemu, ingengo, isuzuma, impinduka z'ububasha za vuba n'imenyesha. Buri karita ifite umurongo ujya aho bireba.",
            },
          ],
        },
      },
    },
    {
      slug: "switch-dashboards-and-help",
      cat: "start",
      minutes: 2,
      updated: U,
      start: true,
      pages: ["/system", "/system/guides"],
      t: {
        en: {
          title: "Switch dashboards and find help",
          summary:
            "Each role a person holds adds a dashboard. With two or more, a row of tabs under the top bar switches between them. The ? button opens the guides for the page you are on.",
          keywords: "tabs switcher workspace help question mark guides",
          sections: [
            {
              id: "tabs",
              title: "Switch dashboards",
              steps: [
                {
                  text: "Look under the top bar: when you can open two or more dashboards, a row of tabs appears (**System**, **Executive**, **Partners**…). The open one is highlighted.",
                  shot: "system-shell",
                  marks: ["Dashboard tabs", "Help (?)", "Side menu"],
                },
                {
                  text: "Click a tab. That dashboard's home opens and its own side menu replaces this one. Your choice is remembered for next time.",
                },
                { text: "Click **System** to come back." },
              ],
              tips: [
                "One role = one dashboard, so a person with one role sees no tabs at all.",
              ],
            },
            {
              id: "help",
              title: "Read the guides",
              steps: [
                {
                  text: "Click **?** in the top bar. The panel shows **For this page** first, then **All guides in this dashboard**.",
                },
                {
                  text: "Type in the search box to search every guide you may read; click a guide to read it in the panel, or **Open the full guide**.",
                },
                {
                  text: "**Guides** at the bottom of the side menu lists all guides on one page, grouped by dashboard.",
                },
              ],
              tips: [
                "As a system administrator you see the guides of every dashboard, not only System, so you can check exactly what a role you grant will see.",
              ],
            },
          ],
        },
        fr: {
          title: "Changer de tableau de bord et trouver de l'aide",
          summary:
            "Chaque rôle d'une personne ajoute un tableau de bord. Dès qu'il y en a deux, une rangée d'onglets sous la barre du haut permet de passer de l'un à l'autre. Le bouton ? ouvre les guides de la page.",
          keywords: "onglets espace aide guides point d'interrogation",
          sections: [
            {
              id: "tabs",
              title: "Changer de tableau de bord",
              steps: [
                {
                  text: "Sous la barre du haut : si vous pouvez ouvrir deux tableaux de bord ou plus, une rangée d'onglets apparaît (**Système**, **Direction**, **Partenaires**…). L'onglet ouvert est mis en évidence.",
                  shot: "system-shell",
                  marks: ["Onglets des espaces", "Aide (?)", "Menu latéral"],
                },
                {
                  text: "Cliquez sur un onglet. L'accueil de cet espace s'ouvre avec son propre menu latéral. Votre choix est mémorisé.",
                },
                { text: "Cliquez sur **Système** pour revenir." },
              ],
              tips: [
                "Un rôle = un tableau de bord : une personne avec un seul rôle ne voit aucun onglet.",
              ],
            },
            {
              id: "help",
              title: "Lire les guides",
              steps: [
                {
                  text: "Cliquez sur **?** dans la barre du haut. Le panneau montre d'abord **Pour cette page**, puis **Tous les guides de cet espace**.",
                },
                {
                  text: "Tapez dans la recherche pour chercher dans tous vos guides ; cliquez sur un guide pour le lire dans le panneau, ou **Ouvrir le guide complet**.",
                },
                {
                  text: "**Guides** en bas du menu latéral liste tous les guides sur une page, par tableau de bord.",
                },
              ],
              tips: [
                "En tant qu'administrateur système, vous voyez les guides de tous les tableaux de bord, pour savoir exactement ce que verra un rôle que vous attribuez.",
              ],
            },
          ],
        },
        rw: {
          title: "Hindura umwanya w'akazi kandi ubone ubufasha",
          summary:
            "Buri nshingano umuntu afite imwongerera umwanya w'akazi. Iyo afite ibiri cyangwa irenga, umurongo w'amatabu munsi y'umurongo wo hejuru umufasha kuyihinduranya. Buto ? ifungura amabwiriza y'urupapuro uriho.",
          keywords: "amatabu umwanya ubufasha amabwiriza",
          sections: [
            {
              id: "tabs",
              title: "Hindura umwanya",
              steps: [
                {
                  text: "Reba munsi y'umurongo wo hejuru: iyo ushobora gufungura imyanya ibiri cyangwa irenga, umurongo w'amatabu ugaragara (**Sisitemu**, **Ubuyobozi**, **Abafatanyabikorwa**…). Iryo urimo riba ryagaragajwe.",
                  shot: "system-shell",
                  marks: [
                    "Amatabu y'imyanya",
                    "Ubufasha (?)",
                    "Urutonde rw'uruhande",
                  ],
                },
                {
                  text: "Kanda ku tabu. Ahabanza h'uwo mwanya harafunguka n'urutonde rwawo rw'uruhande. Amahitamo yawe aribukwa.",
                },
                { text: "Kanda **Sisitemu** ugaruke." },
              ],
              tips: [
                "Inshingano imwe = umwanya umwe, bityo ufite inshingano imwe ntabona amatabu.",
              ],
            },
            {
              id: "help",
              title: "Soma amabwiriza",
              steps: [
                {
                  text: "Kanda **?** hejuru. Akanama kerekana mbere **Kuri iyi paji**, hanyuma **Amabwiriza yose y'iyi konti**.",
                },
                {
                  text: "Andika mu gushakisha ushake mu mabwiriza yose wemerewe; kanda ku mabwiriza uyasome mu kanama, cyangwa **Fungura amabwiriza yose**.",
                },
                {
                  text: "**Amabwiriza** ari hasi mu rutonde rw'uruhande yerekana amabwiriza yose ku rupapuro rumwe, akurikije imyanya.",
                },
              ],
              tips: [
                "Nk'umuyobozi wa sisitemu ubona amabwiriza y'imyanya yose, kugira ngo umenye neza ibyo inshingano utanga izabona.",
              ],
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ access
    {
      slug: "invite-a-user",
      cat: "access",
      minutes: 3,
      updated: U,
      start: true,
      pages: ["/system/users"],
      t: {
        en: {
          title: "Invite a user",
          summary:
            "Send a single-use invitation with one or more roles. Ordinary roles go out at once; privileged roles wait for a second person's approval.",
          keywords: "add user new staff invitation onboarding account create",
          facts: {
            who: "System administrator",
            time: "2 minutes",
            need: ["Full name and work email", "The roles they need"],
          },
          sections: [
            {
              id: "open",
              title: "Fill in the invitation",
              steps: [
                {
                  text: "Open **Users** in the side menu and click **Invite user**.",
                  shot: "system-users",
                  marks: [
                    "Invite user",
                    "Staff / Agents / Clients tabs",
                    "Search",
                    "A person: click to open",
                  ],
                },
                {
                  text: "Type their **Full name** and **Work email**. **Phone** is optional (a Rwandan mobile, +250…).",
                  shot: "system-invite",
                  marks: ["Work email", "Roles", "Send"],
                },
                {
                  text: "Under **Roles**, click every role they need; each click toggles it. A shield marks privileged roles (System administrator, Senior management, Finance officer, Partner manager).",
                },
                {
                  text: "Check the line under the roles: **No conflicts** in green, or a red conflict (see “Separation-of-duties rules”). A conflict blocks sending.",
                },
                {
                  text: "If a privileged role is picked, fill **Why do they need this access?** (10+ characters). The approver reads it.",
                },
                {
                  text: "Click **Send invitation**, or **Send for approval** when a privileged role is included.",
                },
              ],
            },
            {
              id: "after",
              title: "What happens next",
              steps: [
                {
                  text: "**Invitation sent**: they get a link that expires 72 hours after it is sent. They set a password and choose their MFA method on first sign-in.",
                },
                {
                  text: "**Invitation pending approval**: the approver is notified (an executive, or another system administrator / executive for the System administrator role). The link goes out once it is approved; follow it with **View approval**.",
                },
                {
                  text: "In the list, the person shows as **Invited** with the expiry. From their **Actions** menu use **Resend invite** or **Revoke invite**.",
                },
              ],
              warn: "Never invite yourself a second account to approve your own request: self-approval is always refused and is recorded in the audit log.",
            },
          ],
        },
        fr: {
          title: "Inviter un utilisateur",
          summary:
            "Envoyez une invitation à usage unique avec un ou plusieurs rôles. Les rôles ordinaires partent tout de suite ; les rôles privilégiés attendent l'approbation d'une seconde personne.",
          keywords: "ajouter utilisateur personnel invitation compte",
          facts: {
            who: "Administrateur système",
            time: "2 minutes",
            need: [
              "Nom complet et e-mail professionnel",
              "Les rôles nécessaires",
            ],
          },
          sections: [
            {
              id: "open",
              title: "Remplir l'invitation",
              steps: [
                {
                  text: "Ouvrez **Utilisateurs** dans le menu latéral et cliquez sur **Inviter**.",
                  shot: "system-users",
                  marks: [
                    "Inviter",
                    "Onglets Personnel / Agents / Clients",
                    "Recherche",
                    "Une personne : cliquez pour l'ouvrir",
                  ],
                },
                {
                  text: "Saisissez le **Nom complet** et l'**E-mail professionnel**. Le **Téléphone** est facultatif (+250…).",
                  shot: "system-invite",
                  marks: ["E-mail professionnel", "Rôles", "Envoyer"],
                },
                {
                  text: "Sous **Rôles**, cliquez sur chaque rôle nécessaire ; chaque clic l'active ou le désactive. Un bouclier signale les rôles privilégiés (Administrateur système, Direction générale, Responsable financier, Responsable des partenariats).",
                },
                {
                  text: "Lisez la ligne sous les rôles : **Aucun conflit** en vert, ou un conflit en rouge (voir « Règles de séparation des tâches »). Un conflit bloque l'envoi.",
                },
                {
                  text: "Avec un rôle privilégié, remplissez **Pourquoi cet accès ?** (10 caractères ou plus). L'approbateur le lit.",
                },
                {
                  text: "Cliquez sur **Envoyer l'invitation**, ou **Envoyer pour approbation** s'il y a un rôle privilégié.",
                },
              ],
            },
            {
              id: "after",
              title: "Et ensuite",
              steps: [
                {
                  text: "Invitation envoyée : le lien expire 72 heures après l'envoi. La personne choisit son mot de passe et sa méthode MFA à la première connexion.",
                },
                {
                  text: "Invitation en attente : l'approbateur est prévenu (la direction, ou un autre administrateur système / la direction pour le rôle Administrateur système). Le lien part dès l'approbation.",
                },
                {
                  text: "Dans la liste, la personne apparaît **Invité** avec l'échéance. Son menu **Actions** propose **Renvoyer l'invitation** ou **Révoquer l'invitation**.",
                },
              ],
              warn: "Ne créez jamais un second compte pour approuver votre propre demande : l'auto-approbation est toujours refusée et journalisée.",
            },
          ],
        },
        rw: {
          title: "Tumira umukoresha",
          summary:
            "Ohereza ubutumire bukoreshwa rimwe bufite inshingano imwe cyangwa nyinshi. Inshingano zisanzwe zihita zigenda; iz'ububasha bwihariye zitegereza kwemezwa n'undi muntu.",
          keywords: "ongeraho umukoresha umukozi mushya ubutumire konti",
          facts: {
            who: "Umuyobozi wa sisitemu",
            time: "Iminota 2",
            need: ["Amazina yose n'imeli y'akazi", "Inshingano akeneye"],
          },
          sections: [
            {
              id: "open",
              title: "Uzuza ubutumire",
              steps: [
                {
                  text: "Fungura **Abakoresha** mu rutonde rw'uruhande ukande **Tumira umukoresha**.",
                  shot: "system-users",
                  marks: [
                    "Tumira umukoresha",
                    "Amatabu Abakozi / Abakozi bo hanze / Abakiriya",
                    "Shakisha",
                    "Umuntu: kanda umufungure",
                  ],
                },
                {
                  text: "Andika **Amazina yose** na **Imeli y'akazi**. **Telefoni** si ngombwa (+250…).",
                  shot: "system-invite",
                  marks: ["Imeli y'akazi", "Inshingano", "Ohereza"],
                },
                {
                  text: "Munsi ya **Inshingano**, kanda kuri buri nshingano akeneye; buri gukanda kurayifungura cyangwa kuyifunga. Ingabo yerekana inshingano z'ububasha bwihariye (Umuyobozi wa sisitemu, Ubuyobozi bukuru, Ushinzwe imari, Ushinzwe abafatanyabikorwa).",
                },
                {
                  text: "Reba umurongo uri munsi: **Nta kwivuguruza** mu cyatsi, cyangwa kwivuguruza mu mutuku (reba “Amategeko y'itandukanywa ry'inshingano”). Kwivuguruza kubuza kohereza.",
                },
                {
                  text: "Niba hari inshingano y'ububasha bwihariye, uzuza **Ni iki gituma akenera ubu burenganzira?** (inyuguti 10+). Uwemeza arabisoma.",
                },
                {
                  text: "Kanda **Ohereza ubutumire**, cyangwa **Ohereza ngo byemezwe** iyo harimo inshingano y'ububasha bwihariye.",
                },
              ],
            },
            {
              id: "after",
              title: "Ibikurikiraho",
              steps: [
                {
                  text: "Ubutumire bwoherejwe: umurongo urangira nyuma y'amasaha 72. Ahitamo ijambobanga n'uburyo bwa MFA yinjiye bwa mbere.",
                },
                {
                  text: "Ubutumire butegereje kwemezwa: uwemeza arabimenyeshwa (ubuyobozi, cyangwa undi muyobozi wa sisitemu / ubuyobozi ku nshingano y'Umuyobozi wa sisitemu). Umurongo woherezwa bimaze kwemezwa.",
                },
                {
                  text: "Mu rutonde, umuntu agaragara ko **Yatumiwe** n'igihe birangirira. Muri **Ibikorwa** bye harimo **Ohereza ubutumire bundi** na **Kuraho ubutumire**.",
                },
              ],
              warn: "Ntukifungurire indi konti ngo wemeze ubusabe bwawe: kwiyemeza ntibyemerwa na rimwe kandi byandikwa mu gitabo cy'igenzura.",
            },
          ],
        },
      },
    },
    {
      slug: "give-several-roles",
      cat: "access",
      minutes: 5,
      updated: U,
      start: true,
      pages: ["/system/users"],
      t: {
        en: {
          title: "Give someone several roles",
          summary:
            "A person can hold several roles. Each role adds one dashboard and its side menu; the person switches between them with the tabs under the top bar.",
          keywords:
            "multiple roles combine grant add role executive partner marketing procurement finance tabs",
          facts: { who: "System administrator", time: "2 minutes per role" },
          sections: [
            {
              id: "grant",
              title: "Grant a role to an existing person",
              steps: [
                {
                  text: "In **Users**, click the person's name, then the **Roles & access** tab. **Current roles** lists each role with who granted it and its expiry.",
                  shot: "system-user-roles",
                  marks: [
                    "Grant role",
                    "Remove a role",
                  ],
                },
                {
                  text: "Click **Grant role**. In the dialog, pick the **Role** (★ = privileged).",
                  shot: "system-grant",
                  marks: [
                    "Role",
                    "Why do they need this access?",
                    "Expires (optional)",
                    "Grant / Send for approval",
                  ],
                },
                {
                  text: "Read the check under it: **No conflicts**, or a red blocked pair that stops you.",
                },
                {
                  text: "Write **Why do they need this access?** (10+ characters). Optionally set **Expires** for temporary access; leave it empty for no end date.",
                },
                {
                  text: "Click **Grant role**. For a privileged role the button reads **Send for approval** and the toast says who was notified.",
                },
                {
                  text: "Repeat for each extra role. The person sees the new dashboard tabs after they sign in again.",
                },
              ],
              tips: [
                "You can't change your own roles; another administrator must do it.",
              ],
            },
            {
              id: "map",
              title: "Which role gives which dashboard",
              intro:
                "Internal agent → Agent · External agent → Work · Service manager → Ops · Finance officer → Finance · Marketing officer → Marketing · Procurement officer → Procurement · Partner manager → Partners · Senior management → Executive · System administrator → System. Senior management can also open the finance approvals, marketing campaigns and marketing reports pages without holding those roles.",
            },
            {
              id: "examples",
              title: "Worked examples",
              steps: [
                {
                  text: "**Executive + Partner**: grant Senior management and Partner manager. Both are privileged, so each goes to approval (an executive other than you decides). Once approved, the person has two tabs, **Executive** and **Partners**, each with its own side menu.",
                },
                {
                  text: "**Marketing + Procurement**: grant Marketing officer, then Procurement officer. Neither is privileged, so both apply at once: tabs **Marketing** and **Procurement**.",
                },
                {
                  text: "**Marketing + Procurement + Finance**: Finance officer + Procurement officer is a blocked pair (“raises and pays the same supplier bill”), so **Grant role** stays disabled. Either pick another person, or request a waiver in **Separation of duties** first; once the executive approves it, grant Finance officer (privileged, needs approval too). The person then has three tabs.",
                },
                {
                  text: "**System administrator + Finance officer** is always blocked (“controls access and moves money”), unless a waiver is approved.",
                },
              ],
            },
            {
              id: "admins",
              title: "Give an administrator every dashboard",
              intro:
                "On a system administrator's **Roles & access** tab, the **All workspaces** card lets one admin work in every dashboard and switch from the top bar. Click **Give all workspaces**, write a **Reason** (10+ characters) and confirm. Their own approvals still need a second person. **Remove all workspaces** leaves them with System only and signs them out everywhere.",
            },
          ],
        },
        fr: {
          title: "Donner plusieurs rôles à une personne",
          summary:
            "Une personne peut avoir plusieurs rôles. Chaque rôle ajoute un tableau de bord et son menu latéral ; elle passe de l'un à l'autre avec les onglets sous la barre du haut.",
          keywords:
            "plusieurs rôles combiner attribuer direction partenaires marketing achats finance onglets",
          facts: { who: "Administrateur système", time: "2 minutes par rôle" },
          sections: [
            {
              id: "grant",
              title: "Attribuer un rôle à une personne existante",
              steps: [
                {
                  text: "Dans **Utilisateurs**, cliquez sur le nom de la personne, puis sur l'onglet **Rôles & accès**. **Rôles actuels** liste chaque rôle, qui l'a donné et son échéance.",
                  shot: "system-user-roles",
                  marks: [
                    "Attribuer un rôle",
                    "Retirer un rôle",
                  ],
                },
                {
                  text: "Cliquez sur **Attribuer un rôle**. Dans la fenêtre, choisissez le **Rôle** (★ = privilégié).",
                  shot: "system-grant",
                  marks: [
                    "Rôle",
                    "Pourquoi cet accès ?",
                    "Expire le (facultatif)",
                    "Attribuer / Envoyer pour approbation",
                  ],
                },
                {
                  text: "Lisez le contrôle : **Aucun conflit**, ou une paire bloquée en rouge qui vous arrête.",
                },
                {
                  text: "Écrivez **Pourquoi cet accès ?** (10 caractères ou plus). Mettez une date dans **Expire le** pour un accès temporaire ; laissez vide sinon.",
                },
                {
                  text: "Cliquez sur **Attribuer un rôle**. Pour un rôle privilégié, le bouton devient **Envoyer pour approbation** et le message indique qui est prévenu.",
                },
                {
                  text: "Recommencez pour chaque rôle. La personne voit les nouveaux onglets à sa prochaine connexion.",
                },
              ],
              tips: [
                "Vous ne pouvez pas modifier vos propres rôles ; un autre administrateur doit le faire.",
              ],
            },
            {
              id: "map",
              title: "Quel rôle ouvre quel tableau de bord",
              intro:
                "Agent interne → Agent · Agent externe → Travail · Responsable de service → Opérations · Responsable financier → Finance · Responsable marketing → Marketing · Responsable des achats → Achats · Responsable des partenariats → Partenaires · Direction générale → Direction · Administrateur système → Système. La Direction générale peut aussi ouvrir les approbations finance, les campagnes et les rapports marketing sans ces rôles.",
            },
            {
              id: "examples",
              title: "Exemples",
              steps: [
                {
                  text: "**Direction + Partenaires** : attribuez Direction générale et Responsable des partenariats. Les deux sont privilégiés : chacun part en approbation (un membre de la direction autre que vous décide). Ensuite la personne a deux onglets, **Direction** et **Partenaires**.",
                },
                {
                  text: "**Marketing + Achats** : attribuez Responsable marketing puis Responsable des achats. Aucun n'est privilégié : effet immédiat, onglets **Marketing** et **Achats**.",
                },
                {
                  text: "**Marketing + Achats + Finance** : Responsable financier + Responsable des achats est une paire bloquée (« crée et paie la même facture fournisseur ») ; le bouton reste désactivé. Choisissez une autre personne, ou demandez d'abord une dérogation dans **Séparation des tâches** ; une fois approuvée par la direction, attribuez Responsable financier (privilégié, approbation aussi). La personne a alors trois onglets.",
                },
                {
                  text: "**Administrateur système + Responsable financier** est toujours bloqué (« contrôle les accès et déplace l'argent »), sauf dérogation approuvée.",
                },
              ],
            },
            {
              id: "admins",
              title: "Donner tous les espaces à un administrateur",
              intro:
                "Sur l'onglet **Rôles & accès** d'un administrateur système, la carte **Tous les espaces** lui permet de travailler dans tous les tableaux de bord. Cliquez sur **Donner tous les espaces**, écrivez un **Motif** (10 caractères ou plus) et confirmez. Ses propres approbations exigent toujours une seconde personne. **Retirer tous les espaces** ne lui laisse que Système et le déconnecte partout.",
            },
          ],
        },
        rw: {
          title: "Guha umuntu inshingano nyinshi",
          summary:
            "Umuntu ashobora kugira inshingano nyinshi. Buri nshingano yongeraho umwanya w'akazi n'urutonde rwawo; azihinduranya akoresheje amatabu ari munsi y'umurongo wo hejuru.",
          keywords:
            "inshingano nyinshi guhuza gutanga ubuyobozi abafatanyabikorwa iyamamaza amasoko imari amatabu",
          facts: {
            who: "Umuyobozi wa sisitemu",
            time: "Iminota 2 kuri buri nshingano",
          },
          sections: [
            {
              id: "grant",
              title: "Ha inshingano umuntu usanzwe uhari",
              steps: [
                {
                  text: "Muri **Abakoresha**, kanda ku izina ry'umuntu, hanyuma ku tabu **Inshingano n'uburenganzira**. Hagaragara buri nshingano, uwayitanze n'igihe irangirira.",
                  shot: "system-user-roles",
                  marks: [
                    "Tanga inshingano",
                    "Kuraho inshingano",
                  ],
                },
                {
                  text: "Kanda **Tanga inshingano**. Hitamo **Uruhare** (★ = ububasha bwihariye).",
                  shot: "system-grant",
                  marks: [
                    "Uruhare",
                    "Impamvu",
                    "Irangira (si ngombwa)",
                    "Tanga / Ohereza ngo byemezwe",
                  ],
                },
                {
                  text: "Soma igenzura: **Nta kwivuguruza**, cyangwa inshingano zibujijwe mu mutuku zikubuza gukomeza.",
                },
                {
                  text: "Andika **Ni iki gituma akenera ubu burenganzira?** (inyuguti 10+). Ushobora gushyiraho **Irangira** ku burenganzira bw'igihe gito; ubusa = nta herezo.",
                },
                {
                  text: "Kanda **Tanga inshingano**. Ku nshingano y'ububasha bwihariye buto yandikwa **Ohereza ngo byemezwe** maze ubutumwa bukavuga uwamenyeshejwe.",
                },
                {
                  text: "Subiramo kuri buri nshingano. Umuntu abona amatabu mashya amaze kongera kwinjira.",
                },
              ],
              tips: [
                "Ntushobora guhindura inshingano zawe; undi muyobozi agomba kubikora.",
              ],
            },
            {
              id: "map",
              title: "Inshingano n'umwanya zifungura",
              intro:
                "Umukozi w'imbere → Umukozi · Umukozi wo hanze → Akazi · Umuyobozi wa serivisi → Ibikorwa · Ushinzwe imari → Imari · Ushinzwe iyamamaza → Kwamamaza · Ushinzwe amasoko → Amasoko · Ushinzwe abafatanyabikorwa → Abafatanyabikorwa · Ubuyobozi bukuru → Ubuyobozi · Umuyobozi wa sisitemu → Sisitemu. Ubuyobozi bukuru bushobora kandi gufungura ibyemezo by'imari, ubukangurambaga na raporo z'iyamamaza nta zindi nshingano.",
            },
            {
              id: "examples",
              title: "Ingero",
              steps: [
                {
                  text: "**Ubuyobozi + Abafatanyabikorwa**: tanga Ubuyobozi bukuru n'Ushinzwe abafatanyabikorwa. Zombi ni iz'ububasha bwihariye, buri imwe ijya kwemezwa (undi wo mu buyobozi atari wowe). Nyuma umuntu agira amatabu abiri, **Ubuyobozi** na **Abafatanyabikorwa**.",
                },
                {
                  text: "**Kwamamaza + Amasoko**: tanga Ushinzwe iyamamaza hanyuma Ushinzwe amasoko. Nta n'imwe y'ububasha bwihariye, zihita zikora: amatabu **Kwamamaza** na **Amasoko**.",
                },
                {
                  text: "**Kwamamaza + Amasoko + Imari**: Ushinzwe imari + Ushinzwe amasoko ni inshingano zibujijwe (“akora kandi akishyura fagitire imwe”), buto ntikora. Hitamo undi muntu, cyangwa ubanze usabe uruhushya muri **Itandukanywa ry'inshingano**; ubuyobozi nibumara kurwemeza, tanga Ushinzwe imari (nayo isaba kwemezwa). Umuntu agira amatabu atatu.",
                },
                {
                  text: "**Umuyobozi wa sisitemu + Ushinzwe imari** birabujijwe buri gihe (“agenzura uburenganzira kandi akimura amafaranga”), keretse hari uruhushya rwemejwe.",
                },
              ],
            },
            {
              id: "admins",
              title: "Ha umuyobozi imbuga zose",
              intro:
                "Ku tabu **Inshingano n'uburenganzira** y'umuyobozi wa sisitemu, ikarita **Imbuga zose** imwemerera gukorera mu myanya yose. Kanda **Muhe imbuga zose**, andika **Impamvu** (inyuguti 10+) wemeze. Ibyo asaba bigikenera kwemezwa n'undi. **Kuraho imbuga zose** imusigira Sisitemu gusa kandi imusohora ahantu hose.",
            },
          ],
        },
      },
    },
    {
      slug: "change-or-revoke-a-role",
      cat: "access",
      minutes: 3,
      updated: U,
      pages: ["/system/users"],
      t: {
        en: {
          title: "Change or remove a role",
          summary:
            "Removing a role takes effect at once and signs the person out everywhere. They lose that dashboard, its tab and its side menu.",
          keywords:
            "revoke remove role downgrade take away access offboard deactivate",
          sections: [
            {
              id: "remove",
              title: "Remove one role",
              steps: [
                {
                  text: "Open the person in **Users**, tab **Roles & access**.",
                },
                {
                  text: "Click **Remove** on the role's row. The dialog asks **Remove {role} from {name}?**",
                },
                {
                  text: "Pick a reason (**Changed job**, **Access review outcome**, **Temporary access ended** or **Other**), add **Details** if useful, and confirm **Remove**.",
                },
                {
                  text: "The toast reads “{role} removed, sessions revoked”. If it says **Sent for approval**, a second person must approve first.",
                },
              ],
              tips: [
                "To change a role, grant the new one first, then remove the old one, so the person is never left without access to their work.",
              ],
              warn: "The last active system administrator can't lose the role (“Last active sysadmin, can't remove.”). Before removing an admin, make sure another named admin is active.",
            },
            {
              id: "lose",
              title: "What the person loses",
              intro:
                "The dashboard of that role disappears from their tabs and its pages are refused. When only one role is left, the tab row disappears. With no role at all they can only sign in to see a message. Their records and history stay; nothing is deleted.",
            },
            {
              id: "leave",
              title: "Someone leaves HEBUZA",
              steps: [
                { text: "Open their **Actions** menu and click **Offboard**." },
                {
                  text: "Step **Reason**: pick why they are leaving. Step **Hand off work**: open cases go to the service manager as a hand-off; choose whether to sign them out of every session now.",
                },
                {
                  text: "Step **Confirm**: click **Deactivate {name}**. They can't sign in again; their history, audit trail and records are kept.",
                },
              ],
            },
          ],
        },
        fr: {
          title: "Modifier ou retirer un rôle",
          summary:
            "Retirer un rôle prend effet tout de suite et déconnecte la personne partout. Elle perd ce tableau de bord, son onglet et son menu.",
          keywords: "révoquer retirer rôle accès départ désactiver",
          sections: [
            {
              id: "remove",
              title: "Retirer un rôle",
              steps: [
                {
                  text: "Ouvrez la personne dans **Utilisateurs**, onglet **Rôles & accès**.",
                },
                {
                  text: "Cliquez sur **Retirer** sur la ligne du rôle. La fenêtre demande de confirmer le retrait.",
                },
                {
                  text: "Choisissez un motif (**Changement de poste**, résultat de revue d'accès, fin d'accès temporaire ou autre), ajoutez des détails si utile, puis confirmez **Retirer**.",
                },
                {
                  text: "Le message confirme le retrait et la fermeture des sessions. S'il indique **Envoyé pour approbation**, une seconde personne doit approuver.",
                },
              ],
              tips: [
                "Pour changer de rôle, attribuez d'abord le nouveau puis retirez l'ancien : la personne ne perd jamais l'accès à son travail.",
              ],
              warn: "Le dernier administrateur système actif ne peut pas perdre son rôle (« Dernier sysadmin actif, impossible de retirer. »). Avant de retirer un administrateur, vérifiez qu'un autre est actif.",
            },
            {
              id: "lose",
              title: "Ce que la personne perd",
              intro:
                "Le tableau de bord de ce rôle disparaît de ses onglets et ses pages sont refusées. Avec un seul rôle restant, la rangée d'onglets disparaît. Sans aucun rôle, elle ne voit qu'un message à la connexion. Ses dossiers et son historique restent.",
            },
            {
              id: "leave",
              title: "Une personne quitte HEBUZA",
              steps: [
                {
                  text: "Ouvrez son menu **Actions** et cliquez sur **Faire partir**.",
                },
                {
                  text: "Étape **Raison** : choisissez le motif. Étape **Passation** : les dossiers ouverts sont transmis au responsable de service ; choisissez de fermer ou non toutes ses sessions maintenant.",
                },
                {
                  text: "Étape **Confirmation** : cliquez sur **Désactiver {name}**. Elle ne peut plus se connecter ; historique et journal sont conservés.",
                },
              ],
            },
          ],
        },
        rw: {
          title: "Hindura cyangwa ukureho inshingano",
          summary:
            "Gukuraho inshingano bihita bikora kandi umuntu asohorwa ahantu hose. Atakaza uwo mwanya, itabu ryawo n'urutonde rwawo.",
          keywords: "kuraho inshingano uburenganzira gusezerera gufunga konti",
          sections: [
            {
              id: "remove",
              title: "Kuraho inshingano imwe",
              steps: [
                {
                  text: "Fungura umuntu muri **Abakoresha**, itabu **Inshingano n'uburenganzira**.",
                },
                {
                  text: "Kanda **Kuraho** ku murongo w'inshingano. Idirishya rirakubaza niba wemeza.",
                },
                {
                  text: "Hitamo impamvu (**Yahinduye akazi**, ibyavuye mu isuzuma, uburenganzira bw'igihe gito bwarangiye cyangwa ikindi), wongereho ibisobanuro, wemeze **Kuraho**.",
                },
                {
                  text: "Ubutumwa bwemeza ko yakuweho n'amasesiyo agafungwa. Niba buvuga **Byoherejwe ngo byemezwe**, undi muntu agomba kubanza kwemeza.",
                },
              ],
              tips: [
                "Guhindura inshingano: banza utange inshya, hanyuma ukureho iya kera, kugira ngo umuntu atabura uko akora.",
              ],
              warn: "Umuyobozi wa sisitemu wa nyuma ukora ntashobora kwamburwa inshingano (“Umuyobozi wa sisitemu wa nyuma, ntiyakurwaho.”). Mbere yo kuyikuraho, reba ko hari undi ukora.",
            },
            {
              id: "lose",
              title: "Ibyo umuntu atakaza",
              intro:
                "Umwanya w'iyo nshingano uvaho mu matabu ye kandi amapaji yawo arangirwa. Iyo asigaranye inshingano imwe, umurongo w'amatabu uravaho. Iyo nta nshingano afite, abona ubutumwa gusa yinjiye. Inyandiko n'amateka bye birabikwa.",
            },
            {
              id: "leave",
              title: "Umuntu avuye muri HEBUZA",
              steps: [
                { text: "Fungura **Ibikorwa** bye ukande **Sezerera**." },
                {
                  text: "Intambwe **Impamvu**: hitamo impamvu. Intambwe **Guhererekanya**: dosiye zifunguye zihabwa umuyobozi wa serivisi; hitamo niba asohorwa mu masesiyo yose ubu.",
                },
                {
                  text: "Intambwe **Kwemeza**: kanda **Funga {name}**. Ntashobora kongera kwinjira; amateka n'inyandiko birabikwa.",
                },
              ],
            },
          ],
        },
      },
    },
    {
      slug: "lock-unlock-reset",
      cat: "access",
      minutes: 4,
      updated: U,
      pages: ["/system/users"],
      t: {
        en: {
          title: "Suspend, unlock, reset a password or MFA",
          summary:
            "Everything about keeping one account safe: suspend and reactivate, unlock after failed sign-ins, force a password reset, reset MFA, sign out sessions and respond to a compromised account.",
          keywords:
            "lock unlock suspend reactivate password reset mfa 2fa authenticator sessions compromise view as",
          sections: [
            {
              id: "menu",
              title: "The Actions menu",
              steps: [
                {
                  text: "Open the person in **Users**. Click **Actions** at the top right of their card.",
                  shot: "system-user-menu",
                  marks: ["Actions menu"],
                },
                {
                  text: "**Suspend**: pick a reason and confirm. They are signed out everywhere and can't sign in until you click **Reactivate**.",
                },
                {
                  text: "**Unlock**: shown when the account is locked (10 failed sign-ins in 24 hours). It unlocks at once.",
                },
                {
                  text: "**Revoke sessions**: signs them out of every device. **View as**: see their screens read-only for 15 or 30 minutes with a reason; finance, executive and sysadmin accounts can't be viewed-as.",
                },
              ],
            },
            {
              id: "security",
              title: "Password and MFA",
              steps: [
                {
                  text: "Open the **Security** tab.",
                  shot: "system-user-security",
                  marks: [
                    "Force password reset",
                    "Reset MFA / Open identity check",
                    "Respond to compromise",
                  ],
                },
                {
                  text: "**Force password reset** → **Yes, force reset**: they are signed out and must set a new password, then confirm with MFA.",
                },
                {
                  text: "**Reset MFA** only appears after an approved identity check. Otherwise click **Open identity check** (see “Verify identity checks”).",
                },
                {
                  text: "**Trusted devices** lists remembered devices; click **Remove** to forget one. System administrators and finance never get trusted devices.",
                },
              ],
              warn: "Reset MFA only for someone you have verified through an approved identity check. A reset hands the account to whoever enrols next.",
            },
            {
              id: "compromise",
              title: "A compromised account",
              intro:
                "Click **Respond to compromise**. Run each step: **Revoke all sessions**, **Force password reset**, **Reset MFA (needs approved identity check)**, **Open a SEV2 incident**, **Review their recent actions**. **Run steps 1–2** does the first two at once. Each step is safe to repeat.",
            },
          ],
        },
        fr: {
          title: "Suspendre, débloquer, réinitialiser mot de passe ou MFA",
          summary:
            "Tout pour protéger un compte : suspendre et réactiver, débloquer après des échecs, forcer un nouveau mot de passe, réinitialiser la MFA, fermer les sessions et réagir à une compromission.",
          keywords:
            "bloquer débloquer suspendre mot de passe mfa sessions compromission voir en tant que",
          sections: [
            {
              id: "menu",
              title: "Le menu Actions",
              steps: [
                {
                  text: "Ouvrez la personne dans **Utilisateurs**. Cliquez sur **Actions** en haut à droite de sa fiche.",
                  shot: "system-user-menu",
                  marks: ["Menu Actions"],
                },
                {
                  text: "**Suspendre** : choisissez un motif et confirmez. La personne est déconnectée partout jusqu'à **Réactiver**.",
                },
                {
                  text: "**Débloquer** : visible quand le compte est bloqué (10 échecs en 24 heures). Effet immédiat.",
                },
                {
                  text: "**Révoquer les sessions** : déconnexion de tous les appareils. **Voir en tant que** : ses écrans en lecture seule 15 ou 30 minutes avec un motif ; impossible pour les comptes finance, direction et sysadmin.",
                },
              ],
            },
            {
              id: "security",
              title: "Mot de passe et MFA",
              steps: [
                {
                  text: "Ouvrez l'onglet **Sécurité**.",
                  shot: "system-user-security",
                  marks: [
                    "Forcer la réinitialisation",
                    "Réinitialiser la MFA / Ouvrir la vérification",
                    "Réagir à une compromission",
                  ],
                },
                {
                  text: "**Forcer la réinitialisation du mot de passe** → **Oui, forcer** : déconnexion, nouveau mot de passe puis MFA.",
                },
                {
                  text: "**Réinitialiser la MFA** n'apparaît qu'après une vérification d'identité approuvée. Sinon cliquez sur **Ouvrir la vérification**.",
                },
                {
                  text: "**Appareils de confiance** liste les appareils mémorisés ; **Supprimer** en oublie un. Jamais pour les administrateurs système et la finance.",
                },
              ],
              warn: "Ne réinitialisez la MFA que d'une personne vérifiée par une vérification d'identité approuvée : le compte revient à qui s'enrôle ensuite.",
            },
            {
              id: "compromise",
              title: "Un compte compromis",
              intro:
                "Cliquez sur **Réagir à une compromission**. Lancez chaque étape : **Révoquer toutes les sessions**, **Forcer la réinitialisation du mot de passe**, **Réinitialiser la MFA (vérification d'identité requise)**, **Ouvrir un incident SEV2**, **Examiner ses actions récentes**. **Lancer les étapes 1–2** fait les deux premières d'un coup.",
            },
          ],
        },
        rw: {
          title: "Hagarika, fungura, subiramo ijambobanga cyangwa MFA",
          summary:
            "Ibyo kurinda konti imwe: kuyihagarika no kuyisubizaho, kuyifungura nyuma yo kwibeshya kwinjira, guhatira guhindura ijambobanga, gusubiramo MFA, gufunga amasesiyo no gusubiza ku gutoborwa kwa konti.",
          keywords:
            "funga fungura hagarika ijambobanga mfa amasesiyo gutoborwa reba nka we",
          sections: [
            {
              id: "menu",
              title: "Ibikorwa",
              steps: [
                {
                  text: "Fungura umuntu muri **Abakoresha**. Kanda **Ibikorwa** hejuru iburyo ku ikarita ye.",
                  shot: "system-user-menu",
                  marks: ["Ibikorwa"],
                },
                {
                  text: "**Hagarika**: hitamo impamvu wemeze. Asohorwa ahantu hose kugeza ukanze **Ongera ukoreshe**.",
                },
                {
                  text: "**Fungura**: igaragara iyo konti yafunzwe (kwibeshya inshuro 10 mu masaha 24). Ihita ifunguka.",
                },
                {
                  text: "**Kuraho amasesiyo**: asohorwa ku bikoresho byose. **Reba nka we**: reba ibyo abona, usoma gusa, iminota 15 cyangwa 30 ufite impamvu; ntibikorwa kuri konti z'imari, ubuyobozi n'abayobozi ba sisitemu.",
                },
              ],
            },
            {
              id: "security",
              title: "Ijambobanga na MFA",
              steps: [
                {
                  text: "Fungura itabu **Umutekano**.",
                  shot: "system-user-security",
                  marks: [
                    "Hatira guhindura ijambobanga",
                    "Subiramo MFA / Fungura igenzura",
                    "Gusubiza ku gutoborwa",
                  ],
                },
                {
                  text: "**Hatira guhindura ijambobanga** → **Yego, hatira**: arasohorwa, agashyiraho ijambobanga rishya akemeza na MFA.",
                },
                {
                  text: "**Subiramo MFA** igaragara gusa nyuma y'igenzura ry'umwirondoro ryemejwe. Bitabaye ibyo kanda **Fungura igenzura**.",
                },
                {
                  text: "**Ibikoresho byizewe** byerekana ibikoresho byibukwa; **Siba** kibagirwa kimwe. Ntibyemewe ku bayobozi ba sisitemu n'imari.",
                },
              ],
              warn: "Subiramo MFA gusa ku muntu wagenzuwe n'igenzura ryemejwe: konti ihabwa uwiyandikisha ubutaha.",
            },
            {
              id: "compromise",
              title: "Konti yatobowe",
              intro:
                "Kanda **Gusubiza ku gutoborwa kwa konti**. Kora buri ntambwe: **Kuraho amasesiyo yose**, **Hatira guhindura ijambobanga**, **Subiramo MFA (bisaba igenzura ryemejwe)**, **Fungura ikibazo SEV2**, **Suzuma ibikorwa bye bya vuba**. **Kora intambwe 1–2** ikora izibanza ebyiri icyarimwe.",
            },
          ],
        },
      },
    },
    {
      slug: "roles-and-permissions",
      cat: "access",
      minutes: 3,
      updated: U,
      pages: ["/system/roles"],
      t: {
        en: {
          title: "Read roles and the permission matrix",
          summary:
            "Roles lists the built-in roles, how many people hold each, and the permission matrix the server checks. Built-in roles are read-only.",
          keywords: "roles permissions matrix custom role built-in members",
          sections: [
            {
              id: "list",
              title: "See who holds a role",
              steps: [
                {
                  text: "Open **Roles**. Each row shows **Members**, **Privileged** and **Last changed**. Filter **Built-in** / **Custom** or search.",
                  shot: "system-roles",
                  marks: ["Roles list", "Permission matrix"],
                },
                {
                  text: "Click a role to see **What this role can do** and its **Members**. To give or take a role, go to the person in **Users**.",
                },
                {
                  text: "Click **Open the matrix** to compare roles side by side; tick **Show only differences** to spot what sets two roles apart.",
                  shot: "system-matrix",
                  marks: ["Matrix"],
                },
              ],
              tips: [
                "The System administrator role is never given case content, documents, chat or money.",
              ],
            },
            {
              id: "custom",
              title: "Custom roles",
              intro:
                "Custom roles are off until the **Custom roles** flag is turned on in **Settings → Feature flags**. Then **New custom role** lets you name it, **Start from a built-in role**, pick **Permissions**, give a reason and **Send for approval**; a second sysadmin or the executive approves it.",
            },
          ],
        },
        fr: {
          title: "Lire les rôles et la matrice des permissions",
          summary:
            "Rôles liste les rôles intégrés, combien de personnes les ont, et la matrice des permissions vérifiée par le serveur. Les rôles intégrés sont en lecture seule.",
          keywords: "rôles permissions matrice rôle personnalisé membres",
          sections: [
            {
              id: "list",
              title: "Voir qui a un rôle",
              steps: [
                {
                  text: "Ouvrez **Rôles**. Chaque ligne montre **Membres**, **Privilégié** et la dernière modification. Filtrez **Intégrés** / **Personnalisés** ou cherchez.",
                  shot: "system-roles",
                  marks: ["Liste des rôles", "Matrice des permissions"],
                },
                {
                  text: "Cliquez sur un rôle pour voir ce qu'il permet et ses **Membres**. Pour attribuer ou retirer, passez par la personne dans **Utilisateurs**.",
                },
                {
                  text: "Cliquez sur **Ouvrir la matrice** pour comparer ; cochez **Afficher seulement les différences**.",
                  shot: "system-matrix",
                  marks: ["Matrice"],
                },
              ],
              tips: [
                "Le rôle Administrateur système n'a jamais accès au contenu des dossiers, documents, messages ou à l'argent.",
              ],
            },
            {
              id: "custom",
              title: "Rôles personnalisés",
              intro:
                "Ils sont désactivés tant que l'indicateur **Custom roles** n'est pas activé dans **Paramètres → Fonctionnalités**. Ensuite **Nouveau rôle personnalisé** : nom, **Partir d'un rôle intégré**, **Permissions**, motif puis **Envoyer pour approbation** ; un second sysadmin ou la direction approuve.",
            },
          ],
        },
        rw: {
          title: "Soma inshingano n'imbonerahamwe y'uburenganzira",
          summary:
            "Inshingano zerekana inshingano z'ibanze, umubare w'abazifite, n'imbonerahamwe y'uburenganzira seriveri igenzura. Inshingano z'ibanze zisomwa gusa.",
          keywords:
            "inshingano uburenganzira imbonerahamwe uruhare rwihariye abarufite",
          sections: [
            {
              id: "list",
              title: "Reba abafite inshingano",
              steps: [
                {
                  text: "Fungura **Inshingano**. Buri murongo werekana **Abarufite**, ububasha bwihariye n'igihe byahinduwe. Hitamo **Iz'ibanze** / **Izihariye** cyangwa ushakishe.",
                  shot: "system-roles",
                  marks: [
                    "Urutonde rw'inshingano",
                    "Imbonerahamwe y'uburenganzira",
                  ],
                },
                {
                  text: "Kanda ku nshingano urebe icyo yemerera n'**Abarufite**. Kuyitanga cyangwa kuyikuraho bikorerwa ku muntu muri **Abakoresha**.",
                },
                {
                  text: "Kanda **Fungura imbonerahamwe** ugereranye; kanda **Erekana ibitandukanye gusa**.",
                  shot: "system-matrix",
                  marks: ["Imbonerahamwe"],
                },
              ],
              tips: [
                "Inshingano y'Umuyobozi wa sisitemu ntihabwa na rimwe ibiri muri dosiye, inyandiko, ibiganiro cyangwa amafaranga.",
              ],
            },
            {
              id: "custom",
              title: "Inshingano zihariye",
              intro:
                "Zirafunze kugeza **Custom roles** ifunguwe muri **Igenamiterere → Ibice bya sisitemu**. Hanyuma **Uruhare rushya**: izina, **Hera ku ruhare rw'ibanze**, **Uburenganzira**, impamvu, **Ohereza ngo byemezwe**; undi muyobozi wa sisitemu cyangwa ubuyobozi buremeza.",
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ governance
    {
      slug: "approvals-inbox",
      cat: "governance",
      minutes: 3,
      updated: U,
            pages: ["/system/approvals"],
      t: {
        en: {
          title: "Approve or reject a change",
          summary:
            "Privileged changes wait in Approvals for a second person. Nothing applies until it is approved; unanswered requests expire after 48 hours.",
          keywords:
            "approvals two-person maker checker approve reject withdraw pending",
          sections: [
            {
              id: "decide",
              title: "Decide a request",
              steps: [
                {
                  text: "Open **Approvals**. Narrow with the search box or the area buttons (**All**, **Access**, **Security**, **Settings**, **Operations**); switch **Pending** / **Decided**.",
                  shot: "system-approvals",
                  marks: ["Search", "Areas"],
                },
                {
                  text: "Click **Review** on a row. The panel shows the requester's note, **What changes**, who must decide and when it takes effect.",
                  shot: "system-approval",
                  marks: ["Request details"],
                },
                {
                  text: "Click **Approve** and confirm it's you. If a second approver is still needed, the toast says who.",
                },
                {
                  text: "Or click **Reject**, write why (10+ characters; the requester sees it) and click **Reject request**.",
                },
              ],
              tips: [
                "Your own requests show **Yours**: you can only **Withdraw request**, never approve them.",
              ],
              warn: "Read **What changes** before approving a role grant or a break-glass request: approval gives real access at once.",
            },
          ],
        },
        fr: {
          title: "Approuver ou rejeter un changement",
          summary:
            "Les changements privilégiés attendent une seconde personne dans Approbations. Rien ne s'applique avant l'approbation ; sans réponse, la demande expire après 48 heures.",
          keywords: "approbations deux personnes approuver rejeter retirer",
          sections: [
            {
              id: "decide",
              title: "Décider",
              steps: [
                {
                  text: "Ouvrez **Approbations**. Filtrez par la recherche ou les zones (**Tout**, **Accès**, **Sécurité**, **Paramètres**, **Exploitation**) ; basculez **En attente** / **Décidées**.",
                  shot: "system-approvals",
                  marks: ["Recherche", "Zones"],
                },
                {
                  text: "Cliquez sur **Examiner**. Le panneau montre la note, **Ce qui change**, qui doit décider et la prise d'effet.",
                  shot: "system-approval",
                  marks: ["Détail de la demande"],
                },
                {
                  text: "Cliquez sur **Approuver** et confirmez votre identité. Si un second approbateur manque, le message l'indique.",
                },
                {
                  text: "Ou **Rejeter**, expliquez (10 caractères ou plus, visible du demandeur) puis **Rejeter la demande**.",
                },
              ],
              tips: [
                "Vos propres demandes sont marquées : vous pouvez seulement **Retirer la demande**.",
              ],
              warn: "Lisez **Ce qui change** avant d'approuver un rôle ou un accès d'urgence : l'accès est réel immédiatement.",
            },
          ],
        },
        rw: {
          title: "Emeza cyangwa wange impinduka",
          summary:
            "Impinduka z'ububasha bwihariye zitegereza undi muntu muri Ibyemezo. Nta gikora kitaremezwa; ubusabe budasubijwe burarangira nyuma y'amasaha 48.",
          keywords: "ibyemezo abantu babiri emeza anga kuraho",
          sections: [
            {
              id: "decide",
              title: "Fata icyemezo",
              steps: [
                {
                  text: "Fungura **Ibyemezo**. Shakisha cyangwa uhitemo igice (**Byose**, **Uburenganzira**, **Umutekano**, **Igenamiterere**, **Imikorere**); hindura **Bitegereje** / **Byafashweho icyemezo**.",
                  shot: "system-approvals",
                  marks: ["Shakisha", "Ibice"],
                },
                {
                  text: "Kanda **Suzuma**. Akanama kerekana icyo usaba yanditse, **Igihinduka**, ugomba kwemeza n'igihe bitangira.",
                  shot: "system-approval",
                  marks: ["Ibisobanuro by'ubusabe"],
                },
                {
                  text: "Kanda **Emeza** wemeze ko ari wowe. Niba hakenewe undi wemeza, ubutumwa buramuvuga.",
                },
                {
                  text: "Cyangwa **Anga**, wandike impamvu (inyuguti 10+, usaba arayibona) ukande **Anga ubusabe**.",
                },
              ],
              tips: [
                "Ubusabe bwawe ushobora gusa **Kuraho ubusabe**, ntiwabwemeza.",
              ],
              warn: "Soma **Igihinduka** mbere yo kwemeza inshingano cyangwa uburenganzira bwihutirwa: bihita bitanga uburenganzira nyabwo.",
            },
          ],
        },
      },
    },
    {
      slug: "access-reviews",
      cat: "governance",
      minutes: 5,
      updated: U,
      pages: ["/system/access-reviews"],
      t: {
        en: {
          title: "Run a quarterly access review",
          summary:
            "Every quarter each person's roles are confirmed by a reviewer who isn't them. Keep, remove or suspend row by row, then sign off.",
          keywords:
            "access review recertification quarterly keep remove suspend sign off",
          sections: [
            {
              id: "run",
              title: "Decide every row",
              steps: [
                {
                  text: "Open **Access reviews**. Under **Current review** click the open campaign (it shows its progress and due date).",
                  shot: "system-access-reviews",
                  marks: ["Open review", "Past reviews"],
                },
                {
                  text: "Filter by **Risk**, **Role** or **Reviewer**. Flags like **Privileged**, **No MFA** or **Never signed in** deserve a closer look.",
                },
                {
                  text: "In **Decision**, pick **Keep**, **Remove role** or **Suspend**. Removing or suspending asks you to confirm and takes effect now.",
                  shot: "system-access-review",
                  marks: ["Decision"],
                },
                {
                  text: "Select rows and use **Keep for low-risk** to keep only rows with no risk flags; flagged rows stay for you.",
                },
                {
                  text: "Your own access shows “Your own access, another reviewer decides”. Use **Reassign reviewer** to hand a row to someone else.",
                },
                {
                  text: "When nothing is left, click **Sign off as {role}**. After both sign-offs, **Export record (PDF)**.",
                },
              ],
            },
          ],
        },
        fr: {
          title: "Mener la revue d'accès trimestrielle",
          summary:
            "Chaque trimestre, les rôles de chacun sont confirmés par un réviseur qui n'est pas la personne. Conserver, retirer ou suspendre ligne par ligne, puis valider.",
          keywords:
            "revue d'accès trimestre conserver retirer suspendre valider",
          sections: [
            {
              id: "run",
              title: "Décider chaque ligne",
              steps: [
                {
                  text: "Ouvrez **Revues d'accès**. Sous **Revue en cours**, cliquez sur la campagne ouverte.",
                  shot: "system-access-reviews",
                  marks: ["Ouvrir la revue", "Revues passées"],
                },
                {
                  text: "Filtrez par risque, rôle ou réviseur. Les signaux **Privilégié**, **Sans MFA** ou jamais connecté méritent attention.",
                },
                {
                  text: "Dans la décision, choisissez **Conserver**, **Retirer le rôle** ou **Suspendre**. Retirer ou suspendre demande confirmation et prend effet immédiatement.",
                  shot: "system-access-review",
                  marks: ["Décision"],
                },
                {
                  text: "Sélectionnez des lignes et utilisez **Conserver (faible risque)** : seules les lignes sans signal sont conservées.",
                },
                {
                  text: "Votre propre accès est décidé par un autre réviseur. **Changer de réviseur** confie une ligne à quelqu'un d'autre.",
                },
                {
                  text: "Quand tout est décidé, cliquez sur **Valider en tant que {role}**. Après les deux validations, **Exporter le dossier (PDF)**.",
                },
              ],
            },
          ],
        },
        rw: {
          title: "Kora isuzuma ry'uburenganzira rya buri gihembwe",
          summary:
            "Buri gihembwe inshingano za buri muntu zemezwa n'umugenzuzi utari we. Hitamo kugumishaho, gukuraho cyangwa guhagarika, hanyuma wemeze.",
          keywords:
            "isuzuma uburenganzira igihembwe bigumeho kuraho hagarika emeza",
          sections: [
            {
              id: "run",
              title: "Fata icyemezo kuri buri murongo",
              steps: [
                {
                  text: "Fungura **Isuzuma ry'uburenganzira**. Munsi ya **Isuzuma riri gukorwa** kanda ku risuzuma rifunguye.",
                  shot: "system-access-reviews",
                  marks: ["Fungura isuzuma", "Amasuzuma yashize"],
                },
                {
                  text: "Yungurura ukurikije ibyago, inshingano cyangwa umugenzuzi. Ibimenyetso **Ububasha bwihariye**, **Nta MFA** cyangwa utarigeze yinjira bikwiye kwitonderwa.",
                },
                {
                  text: "Mu cyemezo hitamo **Bigumeho**, **Kuraho uruhare** cyangwa **Hagarika**. Gukuraho cyangwa guhagarika birasaba kwemeza kandi bihita bikora.",
                  shot: "system-access-review",
                  marks: ["Icyemezo"],
                },
                {
                  text: "Hitamo imirongo ukoreshe **Gumishaho ibidafite ibyago**: imirongo idafite ibimenyetso gusa ni yo igumishwaho.",
                },
                {
                  text: "Uburenganzira bwawe bwemezwa n'undi mugenzuzi. **Hindura umugenzuzi** iha undi umurongo.",
                },
                {
                  text: "Byose nibirangira, kanda **Emeza nka {role}**. Nyuma y'ibyemezo byombi, **Kuramo inyandiko (PDF)**.",
                },
              ],
            },
          ],
        },
      },
    },
    {
      slug: "separation-of-duties",
      cat: "governance",
      minutes: 3,
      updated: U,
      pages: ["/system/sod"],
      t: {
        en: {
          title: "Separation-of-duties rules and waivers",
          summary:
            "Some role pairs can't sit with one person. The page lists them, the maker ≠ checker rules, and lets you request a time-limited waiver from the executive.",
          keywords:
            "sod segregation blocked pair conflict waiver maker checker",
          sections: [
            {
              id: "rules",
              title: "Read the rules",
              steps: [
                {
                  text: "Open **Separation of duties**. **Rules** shows the blocked pairs: Finance officer + Procurement officer, and System administrator + Finance officer.",
                  shot: "system-sod",
                  marks: ["Request waiver", "Rules"],
                },
                {
                  text: "**Process rules (read-only)** lists maker ≠ checker steps built into each workflow (for example, refunds: service manager step 1, finance step 2).",
                },
                {
                  text: "**Waivers** shows who currently holds a blocked pair, why, until when and who approved.",
                },
              ],
            },
            {
              id: "waiver",
              title: "Request a waiver",
              steps: [
                {
                  text: "Click **Request waiver**.",
                  shot: "system-sod-waiver",
                  marks: [
                    "Person",
                    "Blocked pair",
                    "Why is this needed?",
                    "Expires on",
                  ],
                },
                {
                  text: "Pick the **Person** and the **Blocked pair**, write **Why is this needed?** (10+ characters) and pick **Expires on** (required, limited in length).",
                },
                {
                  text: "Submit. The executive must approve; then you can grant the second role from **Users**.",
                },
              ],
              warn: "A waiver lets one person both control and check the same money or access. Keep it as short as possible.",
            },
          ],
        },
        fr: {
          title: "Séparation des tâches et dérogations",
          summary:
            "Certaines paires de rôles ne peuvent pas être tenues par une seule personne. La page les liste, avec les règles « qui fait ≠ qui contrôle », et permet de demander une dérogation limitée à la direction.",
          keywords: "séparation des tâches paire bloquée conflit dérogation",
          sections: [
            {
              id: "rules",
              title: "Lire les règles",
              steps: [
                {
                  text: "Ouvrez **Séparation des tâches**. **Règles** montre les paires bloquées : Responsable financier + Responsable des achats, et Administrateur système + Responsable financier.",
                  shot: "system-sod",
                  marks: ["Demander une dérogation", "Règles"],
                },
                {
                  text: "**Règles de processus (lecture seule)** liste les étapes « qui fait ≠ qui contrôle » de chaque processus.",
                },
                {
                  text: "**Dérogations** montre qui détient une paire bloquée, pourquoi, jusqu'à quand et qui l'a approuvé.",
                },
              ],
            },
            {
              id: "waiver",
              title: "Demander une dérogation",
              steps: [
                {
                  text: "Cliquez sur **Demander une dérogation**.",
                  shot: "system-sod-waiver",
                  marks: [
                    "Personne",
                    "Paire bloquée",
                    "Pourquoi ?",
                    "Expire le",
                  ],
                },
                {
                  text: "Choisissez la **Personne** et la **Paire bloquée**, écrivez **Pourquoi est-ce nécessaire ?** (10 caractères ou plus) et **Expire le** (obligatoire, durée limitée).",
                },
                {
                  text: "Envoyez. La direction approuve ; vous pouvez ensuite attribuer le second rôle depuis **Utilisateurs**.",
                },
              ],
              warn: "Une dérogation permet à une seule personne de faire et contrôler. Gardez-la aussi courte que possible.",
            },
          ],
        },
        rw: {
          title: "Itandukanywa ry'inshingano n'impushya",
          summary:
            "Inshingano zimwe ntizishobora gufatwa n'umuntu umwe. Uru rupapuro ruzerekana, rukerekana amategeko “ukora ≠ ugenzura”, kandi rukwemerera gusaba ubuyobozi uruhushya rw'igihe gito.",
          keywords: "itandukanywa inshingano zibujijwe uruhushya",
          sections: [
            {
              id: "rules",
              title: "Soma amategeko",
              steps: [
                {
                  text: "Fungura **Itandukanywa ry'inshingano**. **Amategeko** yerekana inshingano zibujijwe: Ushinzwe imari + Ushinzwe amasoko, n'Umuyobozi wa sisitemu + Ushinzwe imari.",
                  shot: "system-sod",
                  marks: ["Saba uruhushya", "Amategeko"],
                },
                {
                  text: "**Amategeko y'imikorere (gusoma gusa)** yerekana intambwe “ukora ≠ ugenzura” muri buri gikorwa.",
                },
                {
                  text: "**Impushya** zerekana ufite inshingano zibujijwe, impamvu, igihe birangirira n'uwabyemeje.",
                },
              ],
            },
            {
              id: "waiver",
              title: "Saba uruhushya",
              steps: [
                {
                  text: "Kanda **Saba uruhushya**.",
                  shot: "system-sod-waiver",
                  marks: [
                    "Umuntu",
                    "Inshingano zibujijwe",
                    "Impamvu",
                    "Irangira ku itariki",
                  ],
                },
                {
                  text: "Hitamo **Umuntu** n'**Inshingano zibujijwe**, wandike **Ni iki gituma bikenewe?** (inyuguti 10+) uhitemo **Irangira ku itariki** (ngombwa, igihe kigenwe).",
                },
                {
                  text: "Ohereza. Ubuyobozi buremeza; hanyuma utanga inshingano ya kabiri muri **Abakoresha**.",
                },
              ],
              warn: "Uruhushya rwemerera umuntu umwe gukora no kugenzura. Rugire rugufi uko bishoboka.",
            },
          ],
        },
      },
    },
    {
      slug: "identity-checks",
      cat: "governance",
      minutes: 3,
      updated: U,
      pages: ["/system/identity"],
      t: {
        en: {
          title: "Verify identity checks",
          summary:
            "Staff who lost their authenticator or got locked out file a request. You verify them by phone, video and their manager, then approve or decline. No ID photos are collected.",
          keywords:
            "identity check lost authenticator locked out mfa recovery unlock verify",
          sections: [
            {
              id: "verify",
              title: "Review a request",
              steps: [
                {
                  text: "Open **Identity checks**. Tabs **Pending**, **In review** and **Done**; each row shows the kind (**MFA recovery** or **Account unlock**), the manager and the reason.",
                  shot: "system-identity",
                  marks: ["Tabs", "Review"],
                },
                {
                  text: "Click **Review**. Under **Complete every check**, do and tick each one: call back on the number already on file, video call against the HR photo, manager confirmation, reason recorded.",
                  shot: "system-identity-dialog",
                  marks: ["Checks", "Note for the audit log"],
                },
                {
                  text: "Add a **Note for the audit log** and click **Approve**. MFA recovery resets their MFA (they enrol again on next sign-in); unlock opens the account.",
                },
                {
                  text: "Or click **Decline** and give a reason (10+ characters). The person is notified either way.",
                },
              ],
              warn: "Never call a number given in the request itself; call back only on the number already on file.",
            },
          ],
        },
        fr: {
          title: "Traiter les vérifications d'identité",
          summary:
            "Le personnel qui a perdu son authentificateur ou est bloqué fait une demande. Vous vérifiez par téléphone, vidéo et auprès du responsable, puis approuvez ou refusez. Aucune photo d'identité n'est collectée.",
          keywords:
            "vérification identité authentificateur perdu bloqué mfa déblocage",
          sections: [
            {
              id: "verify",
              title: "Examiner une demande",
              steps: [
                {
                  text: "Ouvrez **Vérifications d'identité**. Onglets **En attente**, **En examen** et **Traitées** ; chaque ligne montre le type (**Récupération MFA** ou **Déblocage du compte**), le responsable et le motif.",
                  shot: "system-identity",
                  marks: ["Onglets", "Examiner"],
                },
                {
                  text: "Cliquez sur **Examiner**. Sous **Cochez chaque vérification**, faites et cochez chaque contrôle : rappel au numéro déjà enregistré, appel vidéo, confirmation du responsable, motif.",
                  shot: "system-identity-dialog",
                  marks: ["Contrôles", "Note pour le journal d'audit"],
                },
                {
                  text: "Ajoutez une **Note pour le journal d'audit** et cliquez sur **Approuver**. La récupération réinitialise la MFA ; le déblocage ouvre le compte.",
                },
                {
                  text: "Ou **Refuser** avec un motif (10 caractères ou plus). La personne est prévenue dans les deux cas.",
                },
              ],
              warn: "N'appelez jamais un numéro donné dans la demande ; rappelez uniquement le numéro déjà enregistré.",
            },
          ],
        },
        rw: {
          title: "Genzura umwirondoro",
          summary:
            "Abakozi batakaje porogaramu ya MFA cyangwa bafungiwe basaba ubufasha. Ubagenzura kuri telefoni, kuri videwo no ku muyobozi wabo, hanyuma ukemeza cyangwa ukanga. Nta mafoto y'indangamuntu akusanywa.",
          keywords:
            "igenzura umwirondoro mfa yatakaye yafungiwe gufungura konti",
          sections: [
            {
              id: "verify",
              title: "Suzuma ubusabe",
              steps: [
                {
                  text: "Fungura **Igenzura ry'umwirondoro**. Amatabu **Bitegereje**, **Birasuzumwa** na **Byarangiye**; buri murongo werekana ubwoko (**Kugarura MFA** cyangwa **Gufungura konti**), umuyobozi n'impamvu.",
                  shot: "system-identity",
                  marks: ["Amatabu", "Suzuma"],
                },
                {
                  text: "Kanda **Suzuma**. Munsi ya **Uzuza igenzura ryose**, kora kandi wemeze buri kimwe: guhamagara nimero isanzwe yanditswe, videwo, kwemeza k'umuyobozi, impamvu.",
                  shot: "system-identity-dialog",
                  marks: ["Igenzura", "Icyitonderwa"],
                },
                {
                  text: "Andika **Icyitonderwa cy'igitabo cy'igenzura** ukande **Emeza**. Kugarura MFA bisubiramo MFA ye; gufungura bifungura konti.",
                },
                {
                  text: "Cyangwa **Anga** utange impamvu (inyuguti 10+). Uwasabye amenyeshwa uko byagenda kose.",
                },
              ],
              warn: "Ntuhamagare nimero yatanzwe mu busabe; hamagara gusa nimero isanzwe yanditswe.",
            },
          ],
        },
      },
    },
    {
      slug: "break-glass",
      cat: "governance",
      minutes: 3,
      updated: U,
      pages: ["/system/break-glass"],
      t: {
        en: {
          title: "Use break-glass emergency access",
          summary:
            "A sealed emergency account for when normal access can't fix an outage. Opening it needs a second sysadmin and the executive; every action inside the window is recorded.",
          keywords: "break glass emergency access elevated incident",
          sections: [
            {
              id: "request",
              title: "Request it",
              steps: [
                {
                  text: "Open **Break-glass**. The card shows the account state (**Sealed**, **Waiting for approval**, **Active**…) and when it was last used.",
                  shot: "system-break-glass",
                  marks: [
                    "Reason",
                    "Incident reference",
                    "Duration",
                    "Request break-glass",
                  ],
                },
                {
                  text: "Write the **Reason**: what's broken and why normal access isn't enough (10+ characters). Add the **Incident reference** if you have one.",
                },
                {
                  text: "Pick the **Duration** and click **Request break-glass**. Both approvers are notified; you can **Withdraw request** while waiting.",
                },
                {
                  text: "Once approved, your own session is elevated and a banner says every action is recorded. Click **End now** as soon as the fix is in.",
                },
                {
                  text: "The executive then records a **Review note** with **Record review**.",
                },
              ],
              warn: "Break-glass bypasses normal controls. Use it only for a real incident, keep the window short, and end it yourself; never share the session.",
            },
          ],
        },
        fr: {
          title: "Utiliser l'accès d'urgence",
          summary:
            "Un compte d'urgence scellé, quand l'accès normal ne suffit pas pour réparer une panne. L'ouvrir exige un second sysadmin et la direction ; chaque action est enregistrée.",
          keywords: "accès d'urgence break glass incident",
          sections: [
            {
              id: "request",
              title: "Le demander",
              steps: [
                {
                  text: "Ouvrez **Accès d'urgence**. La carte montre l'état du compte (scellé, en attente, actif…) et sa dernière utilisation.",
                  shot: "system-break-glass",
                  marks: [
                    "Motif",
                    "Référence d'incident",
                    "Durée",
                    "Demander l'accès d'urgence",
                  ],
                },
                {
                  text: "Écrivez le **Motif** : ce qui est cassé et pourquoi l'accès normal ne suffit pas (10 caractères ou plus). Ajoutez la **Référence d'incident** si vous l'avez.",
                },
                {
                  text: "Choisissez la **Durée** et cliquez sur **Demander l'accès d'urgence**. Les deux approbateurs sont prévenus ; **Retirer la demande** reste possible.",
                },
                {
                  text: "Une fois approuvé, votre session est élevée et un bandeau rappelle que tout est enregistré. Cliquez sur **Terminer** dès la correction faite.",
                },
                {
                  text: "La direction enregistre ensuite une **Note d'examen** avec **Enregistrer l'examen**.",
                },
              ],
              warn: "L'accès d'urgence contourne les contrôles normaux. Uniquement pour un vrai incident, fenêtre courte, et terminez-le vous-même.",
            },
          ],
        },
        rw: {
          title: "Koresha uburenganzira bwihutirwa",
          summary:
            "Konti y'ubutabazi ifunze, ikoreshwa iyo uburenganzira busanzwe budahagije gukemura ikibazo. Kuyifungura bisaba undi muyobozi wa sisitemu n'ubuyobozi; buri gikorwa kirandikwa.",
          keywords: "uburenganzira bwihutirwa break glass ikibazo",
          sections: [
            {
              id: "request",
              title: "Bisabe",
              steps: [
                {
                  text: "Fungura **Uburenganzira bwihutirwa**. Ikarita yerekana uko konti imeze (ifunze, itegereje kwemezwa, irakora…) n'igihe iheruka gukoreshwa.",
                  shot: "system-break-glass",
                  marks: [
                    "Impamvu",
                    "Nimero y'ikibazo",
                    "Igihe",
                    "Saba uburenganzira bwihutirwa",
                  ],
                },
                {
                  text: "Andika **Impamvu**: icyapfuye n'impamvu uburenganzira busanzwe budahagije (inyuguti 10+). Ongeraho **Nimero y'ikibazo** niba uyifite.",
                },
                {
                  text: "Hitamo **Igihe** ukande **Saba uburenganzira bwihutirwa**. Abemeza bombi baramenyeshwa; ushobora **Kuraho ubusabe** utegereje.",
                },
                {
                  text: "Bimaze kwemezwa, konti yawe yongererwa ububasha kandi itangazo rikibutsa ko byose byandikwa. Kanda **Rangiza ubu** ukimara gukemura.",
                },
                {
                  text: "Ubuyobozi buhita bwandika **Icyitonderwa cy'isuzuma** bukanda **Andika isuzuma**.",
                },
              ],
              warn: "Uburenganzira bwihutirwa burenga igenzura risanzwe. Bukoreshe ku kibazo nyacyo gusa, igihe gito, kandi ubwirangirize.",
            },
          ],
        },
      },
    },
    // ------------------------------------------------------------------ platform
    {
      slug: "settings",
      cat: "platform",
      minutes: 4,
      updated: U,
      pages: ["/system/settings"],
      t: {
        en: {
          title: "Change platform settings",
          summary:
            "Settings are grouped: General, Security, Maintenance, Feature flags, Languages, Uploads and Retention. Security changes need a second sysadmin.",
          keywords:
            "settings security idle timeout ip allowlist mfa maintenance mode feature flags languages",
          sections: [
            {
              id: "edit",
              title: "Edit and save",
              steps: [
                {
                  text: "Open **Settings** and pick a group on the left.",
                  shot: "system-settings",
                  marks: ["Settings groups"],
                },
                {
                  text: "Change a value. Each field says what enforces it. A bar appears with the number of unsaved changes.",
                },
                {
                  text: "Click **Save changes**. In **Security**, the button reads **Send for approval**: write **Why are you changing this?**, choose when it should **Take effect**, and send. Nothing changes until someone else approves.",
                  shot: "system-settings-security",
                  marks: ["Two-step sign-in", "Idle timeout · staff"],
                },
                {
                  text: "**Change history** at the bottom of each group shows who changed what, before and after.",
                },
              ],
            },
            {
              id: "maint",
              title: "Maintenance mode",
              intro:
                "In **Maintenance**, turn on **Maintenance mode**, write the **Banner message** in all three languages, optionally set a **Scheduled window**, and confirm **Turn on now**. Clients see the banner and can't submit or pay; staff keep working.",
            },
          ],
        },
        fr: {
          title: "Modifier les paramètres",
          summary:
            "Les paramètres sont groupés : Général, Sécurité, Maintenance, Fonctionnalités, Langues, Téléversements et Conservation. Les changements de sécurité exigent un second sysadmin.",
          keywords:
            "paramètres sécurité délai liste ip mfa maintenance fonctionnalités langues",
          sections: [
            {
              id: "edit",
              title: "Modifier et enregistrer",
              steps: [
                {
                  text: "Ouvrez **Paramètres** et choisissez un groupe à gauche.",
                  shot: "system-settings",
                  marks: ["Groupes de paramètres"],
                },
                {
                  text: "Modifiez une valeur. Chaque champ indique ce qui l'applique. Une barre affiche le nombre de changements non enregistrés.",
                },
                {
                  text: "Cliquez sur **Enregistrer**. Dans **Sécurité**, le bouton devient **Envoyer pour approbation** : écrivez **Pourquoi ce changement ?**, choisissez la **Prise d'effet** et envoyez. Rien ne change avant l'approbation.",
                  shot: "system-settings-security",
                  marks: [
                    "Connexion en deux étapes",
                    "Délai d'inactivité · personnel",
                  ],
                },
                {
                  text: "**Historique des modifications** en bas de chaque groupe montre qui a changé quoi, avant et après.",
                },
              ],
            },
            {
              id: "maint",
              title: "Mode maintenance",
              intro:
                "Dans **Maintenance**, activez **Mode maintenance**, écrivez le message du bandeau dans les trois langues, éventuellement une fenêtre planifiée, puis **Activer maintenant**. Les clients voient le bandeau et ne peuvent ni déposer ni payer ; le personnel continue.",
            },
          ],
        },
        rw: {
          title: "Hindura igenamiterere",
          summary:
            "Igenamiterere riri mu matsinda: Rusange, Umutekano, Isana, Ibice bya sisitemu, Indimi, Kohereza amadosiye n'Igihe amakuru abikwa. Impinduka z'umutekano zisaba undi muyobozi wa sisitemu.",
          keywords: "igenamiterere umutekano ip mfa isana indimi",
          sections: [
            {
              id: "edit",
              title: "Hindura ubike",
              steps: [
                {
                  text: "Fungura **Igenamiterere** uhitemo itsinda ibumoso.",
                  shot: "system-settings",
                  marks: ["Amatsinda y'igenamiterere"],
                },
                {
                  text: "Hindura agaciro. Buri kintu kivuga ikigishyira mu bikorwa. Hagaragara umurongo werekana impinduka zitabitswe.",
                },
                {
                  text: "Kanda **Bika impinduka**. Muri **Umutekano**, buto iba **Ohereza ngo byemezwe**: andika **Kuki uhindura ibi?**, hitamo igihe **Bitangira**, wohereze. Nta gihinduka kitaremezwa n'undi.",
                  shot: "system-settings-security",
                  marks: [
                    "Kwinjira mu ntambwe ebyiri",
                    "Igihe cyo gusohorwa · abakozi",
                  ],
                },
                {
                  text: "**Amateka y'impinduka** hasi muri buri tsinda yerekana uwahinduye, mbere na nyuma.",
                },
              ],
            },
            {
              id: "maint",
              title: "Uburyo bw'isana",
              intro:
                "Muri **Isana**, fungura **Uburyo bw'isana**, wandike ubutumwa bw'itangazo mu ndimi eshatu, ushobora gushyiraho igihe giteganyijwe, hanyuma **Fungura ubu**. Abakiriya babona itangazo ntibashobore gusaba cyangwa kwishyura; abakozi bakomeza gukora.",
            },
          ],
        },
      },
    },
    {
      slug: "integrations",
      cat: "platform",
      minutes: 3,
      updated: U,
      pages: ["/system/integrations"],
      t: {
        en: {
          title: "Test and manage integrations",
          summary:
            "Payments, messaging, AI, identity and platform services. Nothing shows as working until its last test passed, and credentials are write-only.",
          keywords:
            "integrations momo payments sms whatsapp email credentials api key rotate test production sandbox webhooks",
          sections: [
            {
              id: "test",
              title: "Check one integration",
              steps: [
                {
                  text: "Open **Integrations**. Search or filter by group and health; each card shows its health and last test.",
                  shot: "system-integrations",
                  marks: ["Search", "A group"],
                },
                {
                  text: "Click an integration. Tabs: **Overview**, **Credentials**, **Webhooks**, **Usage**, **Logs**.",
                  shot: "system-integration",
                  marks: ["Tabs", "Send test"],
                },
                {
                  text: "Click the test button on **Overview** (for example **Test MoMo sandbox**). It stays **Untested** until a test passes.",
                },
                {
                  text: "**Credentials**: paste a new key to **Rotate**. In production the rotation is tested, then waits for a second sysadmin.",
                },
                {
                  text: "**Switch to production** only after a test passed; real customers and money then flow through it.",
                },
              ],
              tips: [
                "If payments are down, turn on pay-later mode from the outage card: clients submit now and pay later.",
              ],
            },
          ],
        },
        fr: {
          title: "Tester et gérer les intégrations",
          summary:
            "Paiements, messagerie, IA, identité et plateforme. Rien n'apparaît comme fonctionnel avant un test réussi, et les identifiants sont en écriture seule.",
          keywords:
            "intégrations momo paiements sms whatsapp e-mail identifiants clé tester production",
          sections: [
            {
              id: "test",
              title: "Vérifier une intégration",
              steps: [
                {
                  text: "Ouvrez **Intégrations**. Cherchez ou filtrez par groupe et santé.",
                  shot: "system-integrations",
                  marks: ["Recherche", "Un groupe"],
                },
                {
                  text: "Cliquez sur une intégration. Onglets : **Aperçu**, **Identifiants**, **Webhooks**, **Utilisation**, **Journaux**.",
                  shot: "system-integration",
                  marks: ["Onglets", "Tester"],
                },
                {
                  text: "Cliquez sur le bouton de test dans **Aperçu**. Elle reste non testée tant qu'un test n'a pas réussi.",
                },
                {
                  text: "**Identifiants** : collez une nouvelle clé pour **Renouveler**. En production, la rotation est testée puis attend un second sysadmin.",
                },
                {
                  text: "**Passer en production** seulement après un test réussi : de vrais clients et de l'argent réel passent alors par là.",
                },
              ],
              tips: [
                "Si les paiements sont en panne, activez le mode « payer plus tard » depuis la carte d'incident.",
              ],
            },
          ],
        },
        rw: {
          title: "Gerageza kandi ucunge guhuza sisitemu",
          summary:
            "Kwishyura, ubutumwa, AI, umwirondoro n'urubuga. Nta na kimwe kigaragara nk'igikora kitaratsinda igerageza, kandi imfunguzo zandikwa gusa.",
          keywords:
            "guhuza sisitemu momo kwishyura sms whatsapp imeyili urufunguzo gerageza production",
          sections: [
            {
              id: "test",
              title: "Genzura kimwe",
              steps: [
                {
                  text: "Fungura **Guhuza sisitemu**. Shakisha cyangwa uyungurure ukurikije itsinda n'uko bimeze.",
                  shot: "system-integrations",
                  marks: ["Shakisha", "Itsinda"],
                },
                {
                  text: "Kanda kuri kimwe. Amatabu: **Incamake**, **Imfunguzo**, **Webhooks**, **Ikoreshwa**, **Inyandiko**.",
                  shot: "system-integration",
                  marks: ["Amatabu", "Gerageza"],
                },
                {
                  text: "Kanda buto y'igerageza kuri **Incamake**. Kiguma kitageragejwe kugeza igerageza ritsinze.",
                },
                {
                  text: "**Imfunguzo**: shyiramo urufunguzo rushya **Hindura**. Muri production, rugeragezwa rugategereza undi muyobozi wa sisitemu.",
                },
                {
                  text: "**Jya muri production** nyuma y'igerageza ryatsinze gusa: abakiriya nyabo n'amafaranga nyayo birahanyura.",
                },
              ],
              tips: [
                "Kwishyura nibyanga, fungura uburyo bwo kwishyura nyuma: abakiriya basaba ubu bakishyura nyuma.",
              ],
            },
          ],
        },
      },
    },
    {
      slug: "notifications",
      cat: "platform",
      minutes: 3,
      updated: U,
      pages: ["/system/notifications"],
      t: {
        en: {
          title: "Notification rules, templates and costs",
          summary:
            "Which events reach people, on which channel, in which words, and what it costs.",
          keywords:
            "notifications rules channels fallback quiet hours templates whatsapp sms email budget deliveries",
          sections: [
            {
              id: "tabs",
              title: "The four tabs",
              steps: [
                {
                  text: "Open **Notifications**.",
                  shot: "system-notifications",
                  marks: ["Tabs"],
                },
                {
                  text: "**Rules**: per event, turn channels on, set the **Fallback order** and what happens in **Quiet hours (21:00–07:00)**, then **Save rules**. Security events always reach email and in-app.",
                },
                {
                  text: "**Templates**: open a template you own (Auth & security), edit each language, **Save draft**, **Test send to me**, then **Submit for approval**. Templates owned by other teams are read-only.",
                },
                {
                  text: "**Deliveries**: filter by status or channel to see what was sent, failed or fell back.",
                },
                {
                  text: "**Costs**: month-to-date spend per channel. **Edit budget** sets the monthly budget; marketing stops at 100%, transactional and security messages always send, and you get an alert at 80%.",
                },
              ],
            },
          ],
        },
        fr: {
          title: "Règles, modèles et coûts des notifications",
          summary:
            "Quels événements atteignent qui, par quel canal, avec quels mots, et à quel coût.",
          keywords:
            "notifications règles canaux repli heures calmes modèles budget envois",
          sections: [
            {
              id: "tabs",
              title: "Les quatre onglets",
              steps: [
                {
                  text: "Ouvrez **Notifications**.",
                  shot: "system-notifications",
                  marks: ["Onglets"],
                },
                {
                  text: "**Règles** : par événement, activez les canaux, réglez l'**Ordre de repli** et les **Heures calmes (21:00–07:00)**, puis **Enregistrer les règles**. Les événements de sécurité arrivent toujours par e-mail et dans l'application.",
                },
                {
                  text: "**Modèles** : ouvrez un modèle qui vous appartient, modifiez chaque langue, **Enregistrer le brouillon**, **Envoi test à moi**, puis **Soumettre pour approbation**. Les autres sont en lecture seule.",
                },
                { text: "**Envois** : filtrez par statut ou canal." },
                {
                  text: "**Coûts** : dépenses du mois par canal. **Modifier le budget** fixe le budget mensuel ; le marketing s'arrête à 100 %, alerte à 80 %.",
                },
              ],
            },
          ],
        },
        rw: {
          title: "Amategeko, inyandikorugero n'ibiciro by'ubutumwa",
          summary:
            "Ibibaye bigera kuri nde, ku ruhe rubuga, mu yahe magambo, n'ikiguzi cyabyo.",
          keywords:
            "ubutumwa amategeko imiyoboro amasaha y'ituze inyandikorugero ingengo",
          sections: [
            {
              id: "tabs",
              title: "Amatabu ane",
              steps: [
                {
                  text: "Fungura **Ubutumwa**.",
                  shot: "system-notifications",
                  marks: ["Amatabu"],
                },
                {
                  text: "**Amategeko**: kuri buri kibaye, fungura imiyoboro, shyiraho **Uko bisimburana** n'**Amasaha y'ituze (21:00–07:00)**, hanyuma **Bika amategeko**. Ibijyanye n'umutekano bigera buri gihe kuri imeyili no muri porogaramu.",
                },
                {
                  text: "**Inyandikorugero**: fungura iyo ushinzwe, hindura buri rurimi, **Bika umushinga**, **Ohereza igerageza kuri njye**, hanyuma **Ohereza ngo byemezwe**. Iz'andi matsinda zisomwa gusa.",
                },
                {
                  text: "**Ibyoherejwe**: yungurura ukurikije uko byagenze cyangwa umuyoboro.",
                },
                {
                  text: "**Ibiciro**: ibyakoreshejwe uku kwezi. **Hindura ingengo** ishyiraho ingengo y'ukwezi; iyamamaza rihagarara kuri 100%, umenyeshwa kuri 80%.",
                },
              ],
            },
          ],
        },
      },
    },
    {
      slug: "audit-log",
      cat: "platform",
      minutes: 4,
      updated: U,
      pages: ["/system/audit"],
      t: {
        en: {
          title: "Find who did what in the audit log",
          summary:
            "Every privileged and sensitive action, append-only and hash-chained. Search, filter, open an entry, export, and verify the chain.",
          keywords:
            "audit log who did what history search export chain integrity sensitive access",
          sections: [
            {
              id: "find",
              title: "Find an event",
              steps: [
                {
                  text: "Open **Audit log**. Type in the search box, for example a name, or `actor:Innocent action:config.template.changed`.",
                  shot: "system-audit",
                  marks: ["Search", "Export", "An entry"],
                },
                {
                  text: "Pick a **Category**, tick **Privileged only**, or open **More filters** (**Actor**, **Action**, **Resource**, **IP**, **From**, **To**) and **Apply**.",
                },
                {
                  text: "Click a row. The panel shows the actor and role, the time, IP and device, **Before → after**, the reason and any approval reference.",
                  shot: "system-audit-entry",
                  marks: ["Entry details"],
                },
                {
                  text: "Click **Verify this entry** to check its hash. **Load older entries** goes further back.",
                },
              ],
            },
            {
              id: "more",
              title: "Export, sensitive access and integrity",
              steps: [
                {
                  text: "**Export** → choose CSV or PDF → **Confirm and export**. 1,000 or more rows is a mass export: the executive is alerted.",
                },
                {
                  text: "**Sensitive access** lists document downloads, data exports and revealed private fields, with unusual-volume flags.",
                },
                {
                  text: "**Integrity** shows the last nightly check (02:00 Kigali). Click **Verify now** to re-check the chain.",
                },
              ],
            },
          ],
        },
        fr: {
          title: "Trouver qui a fait quoi dans le journal d'audit",
          summary:
            "Chaque action privilégiée ou sensible, en ajout seul et chaînée par hachage. Chercher, filtrer, ouvrir une entrée, exporter et vérifier la chaîne.",
          keywords:
            "journal d'audit qui a fait quoi recherche export intégrité accès sensibles",
          sections: [
            {
              id: "find",
              title: "Trouver un événement",
              steps: [
                {
                  text: "Ouvrez **Journal d'audit**. Tapez dans la recherche, par exemple un nom, ou `actor:Innocent action:config.template.changed`.",
                  shot: "system-audit",
                  marks: ["Recherche", "Exporter", "Une entrée"],
                },
                {
                  text: "Choisissez une **Catégorie**, cochez **Privilégiés seulement**, ou ouvrez **Plus de filtres** (**Auteur**, action, ressource, IP, **Du**, **Au**) puis **Appliquer**.",
                },
                {
                  text: "Cliquez sur une ligne. Le panneau montre l'auteur et son rôle, l'heure, l'IP, l'avant/après, le motif et l'approbation éventuelle.",
                  shot: "system-audit-entry",
                  marks: ["Détail de l'entrée"],
                },
                {
                  text: "**Vérifier cette entrée** contrôle son hachage. **Charger les entrées plus anciennes** remonte plus loin.",
                },
              ],
            },
            {
              id: "more",
              title: "Export, accès sensibles et intégrité",
              steps: [
                {
                  text: "**Exporter** → CSV ou PDF → **Confirmer et exporter**. À partir de 1 000 lignes, la direction est alertée.",
                },
                {
                  text: "**Accès sensibles** liste téléchargements, exports et champs privés révélés.",
                },
                {
                  text: "**Intégrité** montre le contrôle de la nuit (02:00 Kigali). **Vérifier maintenant** relance la vérification.",
                },
              ],
            },
          ],
        },
        rw: {
          title: "Menya uwakoze iki mu gitabo cy'igenzura",
          summary:
            "Buri gikorwa cy'ububasha bwihariye cyangwa cy'ibanga, cyongerwaho gusa kandi gihujwe na hash. Shakisha, yungurura, fungura icyanditswe, ohereza hanze, genzura urunigi.",
          keywords:
            "igitabo cy'igenzura uwakoze iki gushakisha kohereza ubuziranenge",
          sections: [
            {
              id: "find",
              title: "Shaka icyabaye",
              steps: [
                {
                  text: "Fungura **Igitabo cy'igenzura**. Andika mu gushakisha, urugero izina, cyangwa `actor:Innocent action:config.template.changed`.",
                  shot: "system-audit",
                  marks: ["Shakisha", "Kohereza hanze", "Icyanditswe"],
                },
                {
                  text: "Hitamo **Icyiciro**, kanda **Iby'uburenganzira bwihariye gusa**, cyangwa fungura **Andi mayunguruzo** (**Uwakoze**, igikorwa, IP, **Kuva**, **Kugeza**) ukande **Shyiraho**.",
                },
                {
                  text: "Kanda ku murongo. Akanama kerekana uwakoze n'inshingano ze, igihe, IP, mbere na nyuma, impamvu n'icyemezo.",
                  shot: "system-audit-entry",
                  marks: ["Ibisobanuro"],
                },
                {
                  text: "**Genzura iki cyanditswe** igenzura hash yacyo. **Fungura ibya kera** ijya kure.",
                },
              ],
            },
            {
              id: "more",
              title: "Kohereza hanze, ibyarebwe by'ibanga n'ubuziranenge",
              steps: [
                {
                  text: "**Kohereza hanze** → CSV cyangwa PDF → **Emeza wohereze**. Imirongo 1,000 kuzamura ituma ubuyobozi bumenyeshwa.",
                },
                {
                  text: "**Ibyarebwe by'ibanga** byerekana inyandiko zakuruwe, ibyoherejwe hanze n'amakuru bwite yagaragajwe.",
                },
                {
                  text: "**Ubuziranenge** bwerekana igenzura rya nijoro (02:00 i Kigali). **Genzura ubu** irongera igenzura.",
                },
              ],
            },
          ],
        },
      },
    },
    {
      slug: "privacy-requests",
      cat: "platform",
      minutes: 4,
      updated: U,
      pages: ["/system/privacy"],
      t: {
        en: {
          title: "Handle privacy and data requests",
          summary:
            "The data map, processors, retention and the requests people make about their own data (export, erasure, rectification, restriction), with 30 days to answer.",
          keywords:
            "privacy data request dsr export erasure delete gdpr retention processors dpa legal hold",
          sections: [
            {
              id: "request",
              title: "Answer a request",
              steps: [
                {
                  text: "Open **Privacy** and the **Requests** tab. **Open** lists requests with their type and due date; names stay masked.",
                  shot: "system-privacy",
                  marks: ["Tabs", "Requests"],
                },
                {
                  text: "Click **Open** on a request. Check the **Legal-hold check**: an open dispute or refund blocks erasure (export still works).",
                },
                {
                  text: "Click **Start**, then **Mark identity verified** once identity is confirmed.",
                },
                {
                  text: "Click **Complete** and confirm **Complete request**. For an export the person downloads it from their own portal; you never open it. Or **Reject** with a reason shown to them.",
                },
              ],
              warn: "Erasure runs as shown in the plan and can't be undone.",
            },
            {
              id: "other",
              title: "Map, processors, retention",
              intro:
                "**Data map** shows where each kind of personal data lives and who sees it. **Processors** lists outside services with their DPA; **Add processor** to record one. **Retention** shows how long data is kept; **Dry run** counts what the next job would do, and **Request change** needs executive approval.",
            },
          ],
        },
        fr: {
          title: "Traiter les demandes sur les données personnelles",
          summary:
            "Cartographie, sous-traitants, conservation et demandes des personnes sur leurs données (export, effacement, rectification, limitation), avec 30 jours pour répondre.",
          keywords:
            "confidentialité demande données export effacement conservation sous-traitants gel juridique",
          sections: [
            {
              id: "request",
              title: "Répondre à une demande",
              steps: [
                {
                  text: "Ouvrez **Confidentialité**, onglet **Demandes**. **Ouvertes** liste les demandes avec type et échéance ; les noms restent masqués.",
                  shot: "system-privacy",
                  marks: ["Onglets", "Demandes"],
                },
                {
                  text: "Cliquez sur **Ouvrir**. Lisez le **Contrôle du gel juridique** : un litige ou remboursement en cours bloque l'effacement (l'export reste possible).",
                },
                {
                  text: "Cliquez sur **Démarrer**, puis **Identité vérifiée** une fois l'identité confirmée.",
                },
                {
                  text: "Cliquez sur **Terminer** et confirmez. Pour un export, la personne le télécharge depuis son portail ; vous ne l'ouvrez jamais. Ou **Rejeter** avec un motif.",
                },
              ],
              warn: "L'effacement suit le plan affiché et est irréversible.",
            },
            {
              id: "other",
              title: "Cartographie, sous-traitants, conservation",
              intro:
                "**Cartographie** montre où vit chaque donnée et qui la voit. **Sous-traitants** liste les services externes et leur DPA ; **Ajouter un sous-traitant**. **Conservation** montre les durées ; **Simulation** compte ce que ferait la prochaine tâche, **Demander une modification** exige la direction.",
            },
          ],
        },
        rw: {
          title: "Kwakira ubusabe bujyanye n'amakuru bwite",
          summary:
            "Ikarita y'amakuru, abayatunganya, igihe abikwa n'ubusabe bw'abantu ku makuru yabo (kuyabona, kuyasiba, kuyakosora, kuyagabanyiriza), bisubizwa mu minsi 30.",
          keywords: "ubuzima bwite ubusabe amakuru gusiba kubika abayatunganya",
          sections: [
            {
              id: "request",
              title: "Subiza ubusabe",
              steps: [
                {
                  text: "Fungura **Ubuzima bwite**, itabu **Ubusabe**. **Bifunguye** herekana ubusabe, ubwoko n'igihe ntarengwa; amazina arahishwa.",
                  shot: "system-privacy",
                  marks: ["Amatabu", "Ubusabe"],
                },
                {
                  text: "Kanda **Fungura**. Reba **Igenzura ry'ihagarikwa**: impaka cyangwa gusubizwa amafaranga bifunguye bibuza gusiba (kuyabona birashoboka).",
                },
                {
                  text: "Kanda **Tangira**, hanyuma **Umwirondoro wagenzuwe** umwirondoro umaze kwemezwa.",
                },
                {
                  text: "Kanda **Soza** wemeze. Ku makuru asabwa, nyirayo ayakura ku rubuga rwe; wowe ntuyafungura. Cyangwa **Anga** utange impamvu.",
                },
              ],
              warn: "Gusiba bikorwa nk'uko biteganyijwe kandi ntibisubirwaho.",
            },
            {
              id: "other",
              title: "Ikarita, abayatunganya, igihe abikwa",
              intro:
                "**Ikarita y'amakuru** yerekana aho buri makuru abikwa n'uyabona. **Abayatunganya** herekana serivisi zo hanze n'amasezerano yazo; **Ongeraho**. **Igihe abikwa** herekana igihe; **Igerageza** ribara ibyakorwa, **Saba impinduka** bisaba ubuyobozi.",
            },
          ],
        },
      },
    },
    {
      slug: "operations",
      cat: "platform",
      minutes: 4,
      updated: U,
      pages: ["/system/ops"],
      t: {
        en: {
          title: "Monitor health, backups and incidents",
          summary:
            "Operations keeps the platform healthy and recoverable: monitoring, backups and restore drills, incidents, security posture and dependency updates.",
          keywords:
            "operations monitoring uptime backups restore drill incident postmortem status page posture dependencies",
          sections: [
            {
              id: "monitor",
              title: "Monitoring and status",
              steps: [
                {
                  text: "Open **Operations**. Tabs: **Monitoring**, **Backups**, **Incidents**, **Security**, **Dependencies**.",
                  shot: "system-ops",
                  marks: ["Tabs"],
                },
                {
                  text: "**Monitoring** shows components, response time (p95), error rate and job failures. **Post status update** writes a message (all three languages) for the public status page.",
                },
              ],
            },
            {
              id: "backups",
              title: "Backups and restores",
              steps: [
                {
                  text: "**Backups** shows the schedule, history and restore drills.",
                },
                {
                  text: "**Restore latest to staging** wipes staging with the latest backup; it counts as a restore drill and never touches production.",
                },
              ],
              warn: "**Restore production…** replaces production with an older backup and loses everything written after it. It needs another sysadmin and the executive.",
            },
            {
              id: "incidents",
              title: "Open and close an incident",
              steps: [
                {
                  text: "In **Incidents**, click **New incident**. Give a **Title**, **Severity**, **Components** and **Impact**, then **Open incident**.",
                  shot: "system-ops-incidents",
                  marks: ["New incident"],
                },
                {
                  text: "In the incident, **Add to timeline** what happens, and move it through Investigating, Mitigated and Resolved.",
                },
                {
                  text: "After it is resolved, fill the postmortem (summary, root cause, actions), **Save postmortem**, then **Mark postmortem done**.",
                },
              ],
            },
          ],
        },
        fr: {
          title: "Surveiller santé, sauvegardes et incidents",
          summary:
            "Exploitation garde la plateforme saine et restaurable : surveillance, sauvegardes et exercices, incidents, sécurité et dépendances.",
          keywords:
            "exploitation surveillance sauvegardes restauration incident post-mortem statut",
          sections: [
            {
              id: "monitor",
              title: "Surveillance et statut",
              steps: [
                {
                  text: "Ouvrez **Exploitation**. Onglets : **Surveillance**, **Sauvegardes**, **Incidents**, **Sécurité**, **Dépendances**.",
                  shot: "system-ops",
                  marks: ["Onglets"],
                },
                {
                  text: "**Surveillance** montre composants, temps de réponse (p95), erreurs et tâches échouées. **Publier un statut** écrit un message (trois langues) pour la page de statut publique.",
                },
              ],
            },
            {
              id: "backups",
              title: "Sauvegardes et restaurations",
              steps: [
                {
                  text: "**Sauvegardes** montre le calendrier, l'historique et les exercices.",
                },
                {
                  text: "**Restaurer en préproduction** remplace la préproduction par la dernière sauvegarde ; c'est un exercice, la production n'est pas touchée.",
                },
              ],
              warn: "**Restaurer la production…** remplace la production par une sauvegarde plus ancienne et perd tout ce qui a été écrit depuis. Exige un autre sysadmin et la direction.",
            },
            {
              id: "incidents",
              title: "Ouvrir et clore un incident",
              steps: [
                {
                  text: "Dans **Incidents**, cliquez sur **Nouvel incident**. Titre, gravité, composants et impact, puis **Ouvrir l'incident**.",
                  shot: "system-ops-incidents",
                  marks: ["Nouvel incident"],
                },
                {
                  text: "Dans l'incident, **Ajouter à la chronologie** et faites-le avancer jusqu'à résolu.",
                },
                {
                  text: "Une fois résolu, remplissez le post-mortem, **Enregistrer**, puis **Clore le post-mortem**.",
                },
              ],
            },
          ],
        },
        rw: {
          title: "Kurikirana imikorere, ububiko n'ibibazo",
          summary:
            "Imikorere ituma urubuga rumera neza kandi rugarurwa: igenzura, ububiko n'igerageza ryo kugarura, ibibazo, umutekano n'amavugurura.",
          keywords: "imikorere igenzura ububiko kugarura ikibazo isesengura",
          sections: [
            {
              id: "monitor",
              title: "Igenzura n'imiterere",
              steps: [
                {
                  text: "Fungura **Imikorere**. Amatabu: **Igenzura**, **Ububiko**, **Ibibazo**, **Umutekano**, **Porogaramu zikoreshwa**.",
                  shot: "system-ops",
                  marks: ["Amatabu"],
                },
                {
                  text: "**Igenzura** ryerekana ibice, igihe cyo gusubiza (p95), amakosa n'imirimo yanze. **Tangaza imiterere** yandika ubutumwa (indimi eshatu) ku rupapuro rusange.",
                },
              ],
            },
            {
              id: "backups",
              title: "Ububiko no kugarura",
              steps: [
                {
                  text: "**Ububiko** bwerekana gahunda, amateka n'igerageza ryo kugarura.",
                },
                {
                  text: "**Garura ubuheruka muri igerageza** isimbuza igerageza ububiko buheruka; bibarwa nk'igerageza, production ntikorwaho.",
                },
              ],
              warn: "**Garura production…** isimbuza production ububiko bwa kera kandi ibyanditswe nyuma bigatakara. Bisaba undi muyobozi wa sisitemu n'ubuyobozi.",
            },
            {
              id: "incidents",
              title: "Fungura kandi ufunge ikibazo",
              steps: [
                {
                  text: "Muri **Ibibazo**, kanda **Ikibazo gishya**. Umutwe, uburemere, ibice n'ingaruka, hanyuma **Fungura ikibazo**.",
                  shot: "system-ops-incidents",
                  marks: ["Ikibazo gishya"],
                },
                {
                  text: "Mu kibazo, **Ongeraho** ibibaye ugikurikiranye kugeza gikemutse.",
                },
                {
                  text: "Kimaze gukemuka, uzuza isesengura, **Bika isesengura**, hanyuma **Soza isesengura**.",
                },
              ],
            },
          ],
        },
      },
    },
  ],
};
