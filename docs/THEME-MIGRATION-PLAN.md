# Theme migration plan: Hebuza colours + sharp corners

**Goal:** the whole app (globals.css → atoms → molecules → organisms → pages, plus emails, PDFs, OG images and the manifest) moves from the current cream/lavender/lime look with rounded corners to:

1. the colour system in `Hebuza Color System & Theme Guide.md` (navy `#1D2B7E`, gold `#F8B718`, sky, ink, Night `#090C14`), and
2. **sharp corners** everywhere.

The guide is the source of truth for colours. This plan decides **where** each colour goes, and fills the gaps the guide doesn't cover.

---

## 1. Design decisions (made here, so builders don't guess)

| #   | Decision                                                                                                                                                                                                                                                                                                                                              | Why                                                                                                                                          |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Light, white-first app. `bg` = white, alternate sections = ink-50, branded soft sections = sky-50 / Sky Wash.                                                                                                                                                                                                                                         | Guide §1 and §6                                                                                                                              |
| D2  | **Gold is for action only.** Max one gold-filled button per view; the 60/30/10 split is checked per page.                                                                                                                                                                                                                                             | Guide §2 and §7                                                                                                                              |
| D3  | **Button roles:** primary = gold fill with navy-950 text; secondary = navy-700 fill with white text; plus outline, ghost and danger as in guide §7. Today's black "Explore our work" becomes **secondary navy**. Today's lavender "Start a project" becomes **primary gold** when it's the page's main action, otherwise outline.                     | Guide §7                                                                                                                                     |
| D4  | Headings use navy-700 (white on dark). Body text uses ink-900, muted text ink-600, captions ink-500. Ink-400 is never used for reading text.                                                                                                                                                                                                          | Guide §6 and §8                                                                                                                              |
| D5  | **Dark sections** use the `.theme-dark` scope: Night `#090C14` or Night Fade, white headings, gold accents, sky-300 links. One dark band per page (hero, a feature band, or the footer).                                                                                                                                                              | Guide §6 and §9                                                                                                                              |
| D6  | **Focus ring (deviates from the guide):** navy-700, 3 px, 2 px offset on light surfaces; gold-400, 3 px inside `.theme-dark`.                                                                                                                                                                                                                         | The guide's gold ring is only 1.78:1 on white, which fails WCAG's 3:1 rule for focus indicators on buttons and links; navy passes at 12.4:1. |
| D7  | **Corners are sharp: radius 0 everywhere.** Circles are kept _only_ for things that are round by nature: avatars, status dots, radio buttons, spinners, the toggle knob, the round "EST." seal, and map pins. Icon-only buttons become squares. Pills (buttons, tags, chips, badges, inputs, cards, dialogs, sheets, images) all become rectangles.   | Your decision                                                                                                                                |
| D8  | Curved and tilted decoration becomes straight. The `NotchBand` SVG shoulders are removed, giving a straight edge with a 1 px navy rule. Tilted highlight pills ("thoughtful") become a **straight gold-200 marker block** (guide: "highlight marker behind words"). Rotated photo cards stay rotated but get sharp corners and navy-tinted shadows.   | Sharp system; guide §4 gold 200–300                                                                                                          |
| D9  | **Thin lines are the structure** (guide §1): hairline ink-200 borders, ink-300 for inputs, and accent rules (navy-700 on light, gold-400 on dark), including a 48×3 px gold bar above section headings.                                                                                                                                               | Guide §7 and §9                                                                                                                              |
| D10 | Shadows are navy-tinted: `shadow-sm/md/lg` from the guide. Black shadows are removed.                                                                                                                                                                                                                                                                 | Guide §7                                                                                                                                     |
| D11 | **Gradients:** only the 6 from the guide, at most one per view.<br>• Hero (public) = Navy Depth + optional Gold Glow<br>• Footer = Night Fade<br>• Join / careers / pricing headers = Navy Depth<br>• Form pages and empty states = Sky Wash<br>• "Featured" badges = Gold Shine<br>• Gold Metallic only for 40 px+ display words on dark backgrounds | Guide §5                                                                                                                                     |
| D12 | **Status colours** come from the guide (success, danger, warning from gold-700, info from sky-700); each always carries an icon and a word. The case, finance and procurement status chips map onto the 8 pipeline stage colours (guide §7) by meaning.                                                                                               | Guide §6 and §7                                                                                                                              |
| D13 | **Chart series order:** navy-700, gold-400, sky-500, navy-300, gold-600, ink-500.                                                                                                                                                                                                                                                                     | Guide §7                                                                                                                                     |
| D14 | Orange `#FF5B1F`, lavender, lime and purple are **retired**. The orange star mark becomes gold-400. Nothing outside the guide's 4 scales plus white is allowed, except the third-party brand colours (MTN, WhatsApp, LinkedIn).                                                                                                                       | Guide §9 "Don't" 5–6                                                                                                                         |
| D15 | **Selection highlight:** gold-200, with ink-900 text.                                                                                                                                                                                                                                                                                                 | Guide §6                                                                                                                                     |
| D16 | Fonts, spacing, motion and layout stay unchanged. Only colour, radius, shadow and the decorative shapes in D8 change.                                                                                                                                                                                                                                 | Scope control                                                                                                                                |
| D17 | **Full dark mode is optional (phase 7).** The light theme plus dark _sections_ ship first. Because every component will use role names, dark mode becomes a token switch later.                                                                                                                                                                       | Ship one theme well before two                                                                                                               |

---

## 2. Token architecture (`src/app/globals.css`)

**Layer 1: raw scales** (Tailwind `@theme`, from guide §10):

- `--color-navy-50 … 950`
- `--color-gold-50 … 950`
- `--color-sky-50 … 950` (replaces Tailwind's own sky)
- `--color-ink-50 … 950`
- `white`

**Layer 2: roles** (what components use). Each is a Tailwind colour pointing at a CSS variable, so `.theme-dark` can swap it:

| Role class                              | Light                | `.theme-dark`               |
| --------------------------------------- | -------------------- | --------------------------- |
| `bg`                                    | white                | ink-950                     |
| `bg-subtle`                             | ink-50               | ink-900                     |
| `bg-tint`                               | sky-50               | navy-900                    |
| `surface`                               | white                | ink-900                     |
| `surface-raised`                        | white + `shadow-md`  | ink-800                     |
| `border`                                | ink-200              | ink-800                     |
| `border-strong`                         | ink-300              | ink-700                     |
| `rule`                                  | navy-700             | gold-400                    |
| `fg`                                    | ink-900              | ink-100                     |
| `fg-heading`                            | navy-700             | white                       |
| `fg-muted`                              | ink-600              | ink-400                     |
| `fg-subtle`                             | ink-500              | ink-500                     |
| `fg-disabled`                           | ink-400              | ink-600                     |
| `on-gold`                               | navy-950             | navy-950                    |
| `on-navy`                               | white                | white                       |
| `primary` / `-hover` / `-active`        | gold-400 / 500 / 600 | gold-400 / 300 / 400        |
| `secondary` / `-hover` / `-active`      | navy-700 / 600 / 800 | white / navy-100 / navy-200 |
| `link` / `link-hover`                   | navy-600 / navy-700  | sky-300 / sky-200           |
| `focus`                                 | navy-700             | gold-400                    |
| `selection`                             | gold-200             | navy-800                    |
| `success`, `success-icon`, `success-bg` | per guide §6         | per guide §6                |
| `danger`, `danger-bg`                   | per guide §6         | per guide §6                |
| `warning`, `warning-bg`                 | per guide §6         | per guide §6                |
| `info`, `info-bg`                       | per guide §6         | per guide §6                |

Implementation: in `@theme inline`, `--color-bg: var(--bg)` and so on. `:root` holds the light values; `.theme-dark` (and later `[data-theme=dark]`) holds the dark ones.

**Other tokens:**

- **Gradients:** utilities `bg-grad-gold-shine`, `-gold-metallic`, `-gold-glow`, `-navy-depth`, `-night-fade`, `-sky-wash`, plus `text-grad-gold` (background-clip text, display sizes only).
- **Shadows:** `--shadow-sm/md/lg` (navy-tinted) replace `--shadow-card/float/pop`. Keep the old names as aliases until phase 6.
- **Radius:** every `--radius-*` set to **0**, and `--radius-pill` set to 0. `rounded-full` stays (circles only, D7).
- **Base:**
  - `:focus-visible` uses a 3 px `--focus` outline with 2 px offset and radius 0;
  - `::selection` uses the selection role;
  - `color-scheme: light`, with `dark` inside `.theme-dark`.

**Migration safety net (phase 1 only):** the old names (`cream`, `cream-2…4`, `sand`, `ink`, `navy`, `navy-2…4`, `grey-1…3`, `lavender*`, `purple*`, `lime*`, `orange`, `cream-a*`) stay as **temporary aliases** pointing at their nearest new colour (table §3). The whole app recolours in one step and stays usable while components are rewritten. Phase 6 deletes the aliases.

---

## 3. Old → new colour mapping (by meaning, not by hex)

| Old                                              | Typical meaning today        | New                                                                                      |
| ------------------------------------------------ | ---------------------------- | ---------------------------------------------------------------------------------------- |
| `cream` (page)                                   | Page background              | `bg` (white)                                                                             |
| `cream` (section alt)                            | Alternating band             | `bg-subtle` (ink-50)                                                                     |
| `cream-2`                                        | Muted cards, sand tags       | `bg-subtle` or ink-100 for tags                                                          |
| `cream-3`, `cream-4`                             | Borders, dividers            | `border` (ink-200)                                                                       |
| `sand`                                           | Strong borders               | `border-strong` (ink-300)                                                                |
| `ink` (text)                                     | Main text                    | `fg` (ink-900); `fg-heading` on headings                                                 |
| `ink` (fill)                                     | Black buttons, dark chips    | `secondary` (navy-700)                                                                   |
| `grey-1`                                         | Body text                    | `fg` or `fg-muted` by context                                                            |
| `grey-2`                                         | Muted text                   | `fg-subtle`                                                                              |
| `grey-3`                                         | Placeholders, disabled       | `fg-disabled`                                                                            |
| `navy` (`#171129` sections)                      | Dark bands                   | `.theme-dark` + `bg` (Night) or Night Fade                                               |
| `navy-2`, `navy-3`, `navy-4`                     | Dark cards, raised, borders  | `surface` / `surface-raised` / `border` inside `.theme-dark`                             |
| `cream-a*` on dark                               | Translucent text, borders    | `fg-muted`, `border` inside `.theme-dark` (white/alpha)                                  |
| `lavender` (highlight, CTA)                      | Accent fill                  | Main action → `primary` (gold); highlight marker → gold-200; selected chip → `secondary` |
| `lavender-tint`                                  | Info/soft panels             | `info-bg` / `bg-tint` (sky-50)                                                           |
| `lavender-a16`                                   | Glow on dark                 | Gold Glow gradient                                                                       |
| `purple` (text, focus, info)                     | Accent text, focus           | `fg-heading` / `link` / `info` / `focus` by context                                      |
| `purple-deep`                                    | Strong accent text           | navy-800                                                                                 |
| `lime`                                           | Accent badges, dots, numbers | gold-400 fill + `on-gold` text; on dark, gold-400 text                                   |
| `lime-deep`                                      | Hover                        | `primary-hover`                                                                          |
| `orange`                                         | Star mark, hot dot           | gold-400 (star); `danger` for urgent dots                                                |
| `white` cards                                    | Surface                      | `surface`                                                                                |
| `success`, `warning`, `danger`, `info` (+ `-bg`) | Status                       | Same role names, guide values                                                            |
| Stray hex (`#FAF8F3`, `#FFEC3E`, `#111218`, …)   | Leftovers                    | The matching role. Third-party brand hex stays.                                          |

---

## 4. Component-by-component rules

### Atoms (`src/components/atoms`, 30 files): the foundation, done first and carefully

| Atom                                                                                                                   | New look                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `button.tsx`                                                                                                           | Variants `primary` (gold), `secondary` (navy), `outline`, `outline-dark`, `ghost`, `danger`, each with hover, pressed and disabled exactly as guide §7.<br>• Radius 0.<br>• The three-dot motif stays, recoloured: on-gold dots navy, on-navy dots gold.<br>• Icon-circle buttons become squares.<br>• Loading spinner stays round.                                       |
| `field.tsx` (inputs, select, textarea, checkbox, radio, switch, error summary)                                         | • Inputs: guide §7 forms table — white, ink-300 border, hover ink-400, focus navy-700 border with a 3 px gold/45% ring. Radius 0.<br>• Checkbox: square, navy fill.<br>• Radio: round.<br>• Switch: rectangular track, navy when on.<br>• Required `*` in danger; help text ink-500; error border and message in danger with an icon.                                     |
| `tag.tsx`                                                                                                              | Rectangles.<br>• Variants map to guide chips: neutral ink-100/ink-700; navy-50/navy-700 with navy-100 border; selected navy-700/white; "New" gold-400/navy-950; Featured gold-100/gold-800 or Gold Shine.<br>• Status dot stays round.                                                                                                                                    |
| `card.tsx`                                                                                                             | `surface`, 1 px `border`, radius 0, hover border navy-300 + `shadow-md` (guide job card).<br>• The offset "sand" shadow card becomes an offset **navy-tinted** block.<br>• Featured variant: 3 px gold left border.                                                                                                                                                       |
| `dialog.tsx`                                                                                                           | Modal, side sheet and bottom sheet: radius 0, `surface`, backdrop Night 60%.                                                                                                                                                                                                                                                                                              |
| `toast.tsx`                                                                                                            | `surface`, 3 px left bar in the status colour, ink-900 text.                                                                                                                                                                                                                                                                                                              |
| `feedback.tsx`                                                                                                         | Alerts in status colours with icon; skeleton shimmers from ink-100 to ink-200; empty state on Sky Wash.                                                                                                                                                                                                                                                                   |
| `tabs.tsx`                                                                                                             | Active tab: 2 px gold underline (guide navbar rule); text navy-700.                                                                                                                                                                                                                                                                                                       |
| `brand.tsx`                                                                                                            | • `HighlightWord` becomes a straight gold-200 marker, no tilt.<br>• Dots pill becomes a square gold block with navy dots.<br>• Faces: round avatars with a white ring.<br>• `NotchBand` is removed and becomes a straight band plus a `rule`.<br>• Badge/seal stays round, navy with a gold star.<br>• Mark/star: gold.<br>• Grid lines: ink-200.<br>• Rule: `rule` role. |
| `typography.tsx`                                                                                                       | Headings `fg-heading`; eyebrow ink-500; links underlined `link`.                                                                                                                                                                                                                                                                                                          |
| `data-table` (wherever it lives)                                                                                       | Header ink-100/ink-700; rows white; hover navy-50; selected navy-100; dividers ink-200 (guide §7).                                                                                                                                                                                                                                                                        |
| `file-drop.tsx`                                                                                                        | Sky-50 fill, 2 px dashed sky-300, sky-600 icon; drag-over gold-50 with dashed gold-400.                                                                                                                                                                                                                                                                                   |
| `icon.tsx`                                                                                                             | Inherits `currentColor` (no change), except any hard-coded fills.                                                                                                                                                                                                                                                                                                         |
| `motion.tsx`                                                                                                           | No colour or radius inside. Check only.                                                                                                                                                                                                                                                                                                                                   |
| Domain atom files (`ops`, `finance`, `agent`, `work`, `field-agent`, `system`, `procurement`, `marketing`, `booking`…) | Status chips and money tones remap to the D12 stage colours. Charts use the D13 series. No legacy colour classes remain.                                                                                                                                                                                                                                                  |

### Molecules (`src/components/molecules/<domain>`)

Recolour through the roles above. Rules:

- the one-gold-button rule per molecule;
- headings `fg-heading`;
- every `rounded-*` removed (except D7 circles);
- dark sub-sections wrapped in `.theme-dark`;
- `site/site.tsx` photo frame: navy frame, radius 0, `shadow-lg`.

### Organisms (`src/components/organisms/<domain>`, ~2,200 radius uses, ~3,000 colour uses)

Same rules, applied domain by domain:

| Domain                                                                                                              | Look                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Public site** (home, sections, footer, pricing, services, knowledge, updates, contact, 404)                       | Hero = Navy Depth or Night Fade with white headline, one gold CTA plus one outline-dark button. Marquee band = white with ink-200 rules and gold stars. Footer = Night Fade. Stats strip = navy-700 with gold numbers.   |
| **Workspace shells** (`organisms/layout`: ops, finance, procurement, system, marketing, agent, field, work, client) | Guide "HR dashboard":<br>• sidebar navy-900, items navy-200, active item gold/12% fill with gold text and a 3 px gold bar;<br>• main area ink-50 with white bordered cards;<br>• top bar white with an ink-200 hairline. |
| **Client portal and booking**                                                                                       | Light; Sky Wash for forms; step indicator done navy, current gold ring, upcoming ink-300.                                                                                                                                |
| **Forms and form builder** (`ops/builder.tsx`, apply wizard, join)                                                  | Guide §7 forms rows exactly: canvas ink-50, field cards white, selected field 2 px gold border, drop target navy-50 with dashed navy-400.                                                                                |
| **Kanban / pipelines** (ops, marketing leads, procurement)                                                          | Columns ink-100, cards white, column dot = stage colour.                                                                                                                                                                 |
| **Chat, assistant, inbox**                                                                                          | Own bubbles navy-700/white; others ink-100/ink-900; system notes sky-50.                                                                                                                                                 |
| **Field (mobile)**                                                                                                  | Same tokens. The MTN and WhatsApp brand colours stay.                                                                                                                                                                    |

### Pages and other surfaces (outside the component tree)

- `src/app/**`: page-level classes, `loading.tsx` skeletons, `not-found` / `error` / `forbidden` / `unauthorized`, `/design/*` showcase pages. The showcase pages are updated to display the new palette, the radius 0 rule and the button matrix.
- `global-error.tsx`: inline styles get the new hex values and radius 0.
- `src/server/preview.ts`: the inline banner colour.
- `manifest.ts`: `theme_color` navy-700, `background_color` white.
- `opengraph-image.tsx` and all `ImageResponse` uses: navy and white with a gold accent.
- `public/offline.html`, plus the favicon and icons if they contain old colours.
- Emails (`src/server/core/email*`, templates) and PDFs (`*.pdf.tsx`, `core/pdf.ts`): hard-coded hex values become guide values. Headers are navy, rules ink-200, and nothing gold-on-white.
- Charts and SVG art (`atoms/finance-art.tsx`, brand SVGs, `rx=` in 25 places): recolour, and set `rx` to 0 where it's a UI shape rather than an illustration.

---

## 5. Guardrails (so nothing old sneaks back)

New `scripts/check-design.mjs`, added as `npm run check:design` and run with `check:layers`. It fails when:

1. a legacy colour name appears in a class (`cream`, `sand`, `lavender`, `purple`, `lime`, `orange`, `grey-1…3`, `navy-2…4`, or bare `navy`/`ink` without a step);
2. any `rounded-*` other than `rounded-none` or `rounded-full` appears, or `rounded-full` is used on an element that isn't on the circle allow-list (avatar, dot, radio, spinner, knob, seal, pin; marked with `data-round`);
3. raw hex appears in `src/components`/`src/app`, except a short allow-list (third-party brand colours, `global-error`, OG images);
4. text that fails contrast is used: `text-gold-300/400/500` or `text-sky-400/500` outside `.theme-dark` or `on-navy` contexts, or `text-white` on `bg-gold-*`;
5. a component file uses more than one `bg-grad-*` (warning only).

---

## 6. Phases (each ends with tsc + check:layers + check:design; visual checks at the end, per build-first)

| Phase                            | Work                                                                                                                                                                                                                      | Parallel?                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **1. Tokens**                    | Rewrite the colour, radius, shadow and gradient parts of `globals.css` per §2, including the temporary aliases from §3. The whole app instantly shows new colours and sharp corners.                                      | 1 agent                                     |
| **2. Atoms**                     | Rewrite all 30 atoms per §4. New button variant API (`primary`/`secondary`/…); old variant names keep working as aliases until phase 6.                                                                                   | 1 agent (the foundation must be consistent) |
| **3. Molecules**                 | All molecule domains per §4.                                                                                                                                                                                              | 2–3 agents by domain                        |
| **4. Organisms**                 | Wave A: site, layout/shells, client, booking, flow, auth. Wave B: ops, agent, work, field. Wave C: finance, procurement, system, marketing. Rules from §3 and §4; dark bands via `.theme-dark`; one gold button per view. | 4 agents per wave, with an integrator       |
| **5. Pages and other surfaces**  | `src/app/**`, `/design` showcases, manifest, OG images, `global-error`, `preview`, `offline.html`, emails, PDFs, charts, SVGs.                                                                                            | 2 agents                                    |
| **6. Clean-up and guard**        | Delete the legacy aliases and old button variant names; fix everything `check:design` flags until zero; remove now-unused tokens (`--shadow-card/float/pop`, `--blur-glass` if unused).                                   | 1 agent                                     |
| **7. (Optional) Full dark mode** | `[data-theme=dark]` + `prefers-color-scheme`, a theme toggle in Settings, logo variant for dark.                                                                                                                          | 1 agent                                     |
| **8. Visual QA** (testing phase) | Production build; screenshot every page at 360/768/1440 px; check the 60/30/10 split, one gold CTA, contrast (axe) and focus visibility; fix.                                                                             | After everything is built                   |

**Done when:**

- `check:design` reports zero issues;
- no legacy token exists in `globals.css`;
- every page shows white/ink/navy/gold/sky only;
- no rounded corner remains except the D7 circles;
- every text pair matches guide §8;
- the `/design` showcase pages show the new system.

---

## 7. Risks and how they're handled

| Risk                                                                                         | Handling                                                                                                                                                               |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Semantics lost by blind find-and-replace (e.g. lavender used both as CTA and as a highlight) | Map by **meaning** (§3); the phase 1 aliases buy time; organisms are reviewed per domain, not regex-replaced.                                                          |
| Too much gold after migration (lime/lavender were used generously)                           | Lime and lavender become gold only for main actions; everything else becomes navy, sky or ink. The 60/30/10 check happens in phase 8.                                  |
| Focus visibility on white                                                                    | D6 (navy ring on light).                                                                                                                                               |
| Sharp corners make dense workspaces feel harsh                                               | Hairline borders and generous spacing stay; shadows soften cards. If it's too harsh after phase 8, a single token (`--radius-sm: 2px`) can be reintroduced for inputs. |
| Old classes reappear in future work                                                          | `check:design` in the standard checks.                                                                                                                                 |
| `navy`/`ink` name clash (old single colours vs new scales)                                   | Phase 1 aliases the bare names; phase 6 bans bare `navy`/`ink`, so only stepped names (`navy-700`, `ink-900`) remain.                                                  |

## 8. Decisions that are yours (defaults in brackets)

1. Icon-only buttons square or round? [square]
2. Keep rotated photo cards and the round "EST." seal on the home page? [keep both, sharp cards]
3. Ship full dark mode (phase 7)? [later, after phase 8]
4. Logo files: do white-letters/gold-swoosh versions exist for dark backgrounds? [needed for D5; placeholder until provided]
