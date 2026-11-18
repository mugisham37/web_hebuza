# Hebuza Color System & Theme Guide

Nov 17, 2026 · @Vicky

## 1. The decision and the feel

The Hebuza site is a **light, white-first site with deep navy structure and gold used only for action and highlights**, plus occasional dark "night" sections for drama. Every color is built from the two logo colors: Navy `#1D2B7E` and Gold `#F8B718`.

**Why this decision.** You liked three directions. Rather than pick one, the system takes the strongest idea from each and anchors it to the logo:

| Inspiration | What we take from it | Where it shows up |
| --- | --- | --- |
| Hebuza logo | The exact navy and gold, and the swoosh energy | Brand anchor for every shade |
| Kingsbury (black, white, safety yellow) | One accent color reserved for clicks; dark bands for drama | Gold buttons only; dark hero and footer sections |
| Altaval (glacier blue, navy, lemon) | A friendly light blue next to bright yellow | The "Sky" scale for soft backgrounds, info states, links on dark |
| Your note on white + black lines | Clean white pages with thin dark rules | White canvas, hairline borders, navy divider lines |

**The feel in one sentence:** calm, trustworthy and professional like a bank (navy and white), with warm optimism and energy (gold) that points the eye to what matters.

**Personality words for any designer or AI builder:** trustworthy, clear, warm, confident, modern, not loud.

**Two modes, one system:**

- **Light mode (default):** white pages, navy text and headers, gold call-to-action buttons, sky-blue soft panels. This is "easy on the eyes" for long reading such as job descriptions and application forms.
- **Dark sections / dark mode:** a near-black navy-tinted background (`#090C14`) with white text and gold accents, borrowed from Kingsbury. Used for the hero, feature bands and footer, and as a full dark mode if you want one.

The rule that keeps it calm: **gold is never more than about 10% of any screen.** When gold is rare, every gold thing gets noticed.

## 2. The color theory behind it

Four principles make the palette work. Anyone extending it should follow them.

**1. Complementary pair.** Navy (hue about 270°) and gold (hue about 82°) sit almost opposite each other on the color wheel. Opposites create the strongest possible contrast, which is why a gold button on a navy or white page jumps out without needing to be big or bright.

**2. The 60-30-10 rule.** Classic interior-design and UI balance:

| Share of screen | Role | Colors |
| --- | --- | --- |
| 60% | Dominant: the canvas | White `#FFFFFF`, Ink 50–100, Sky 50 |
| 30% | Secondary: structure and text | Navy 700–950, Ink 600–900 |
| 10% | Accent: action and emphasis | Gold 300–500 and gold gradients |

In dark sections the 60 and 30 swap: dark navy/ink is the 60%, white text is the 30%, gold stays at 10%.

**3. Perceptually even shades (OKLCH).** All shade scales in this guide were generated in the OKLCH color space, which matches how human eyes see lightness. That means step 300 to 400 looks like the same size jump in every scale, so navy-200 and gold-200 feel equally light. Tools like Tailwind v4 use the same method.

**4. Hue shifting.** Real light changes hue, not just brightness. So the lighter golds lean slightly toward lemon yellow and the darker golds lean toward amber and bronze. The lighter navies lean slightly toward periwinkle. This is what makes shades look rich instead of dirty or grey.

**One warning from theory:** never blend gold directly into blue in a gradient. Mixing complementary colors passes through grey-green mud in the middle. Gradients stay inside one family (gold to gold, navy to navy, navy to sky).

## 3. Core brand colors

Five colors are the heart of the brand. Everything else is a shade of these.

| Name | Hex | RGB | Token | Job |
| --- | --- | --- | --- | --- |
| Hebuza Navy | `#1D2B7E` | 29, 43, 126 | `navy-700` | Logo letters. Headings, primary text links, navbar, structure |
| Hebuza Gold | `#F8B718` | 248, 183, 24 | `gold-400` | Logo swoosh. Primary buttons, highlights, active states |
| Pure White | `#FFFFFF` | 255, 255, 255 | `white` | Page canvas, cards, text on dark |
| Night | `#090C14` | 9, 12, 20 | `ink-950` | Dark sections background (a navy-tinted near-black, softer than `#000000`) |
| Sky | `#589AED` | 88, 154, 237 | `sky-500` | Supporting baby blue: soft panels, illustrations, info states |

**Notes**

- Navy and Gold are measured exactly from the logo file and must never be altered.
- Night is the Kingsbury idea (near-black, not pure black) tinted toward Hebuza navy so it belongs to the brand.
- Sky is the Altaval glacier-blue idea (`#5698EA`) regenerated in the same family as Hebuza navy, so the two blues never fight.

## 4. Full shade scales

Four families of 11 steps each, from 50 (lightest) to 950 (darkest). The brand anchors are fixed: Navy 700 = `#1D2B7E`, Gold 400 = `#F8B718`. The number in brackets is the contrast ratio against white; 4.5 or more means it is safe for normal text on white.

| Step | Navy (brand blue) | Gold (brand yellow) | Sky (baby blue) | Ink (neutrals) |
| --- | --- | --- | --- | --- |
| 50 | `#F3F7FF` (1.07) | `#FFFAEB` (1.04) | `#F4F9FF` (1.06) | `#F9FAFC` (1.04) |
| 100 | `#E2EBFF` (1.20) | `#FFF3D3` (1.10) | `#E6F2FE` (1.14) | `#F2F3F6` (1.11) |
| 200 | `#C7D7FD` (1.44) | `#FEE6AA` (1.23) | `#CCE4FF` (1.30) | `#E4E6EA` (1.25) |
| 300 | `#9DB6F2` (2.02) | `#FED16D` (1.44) | `#AAD2FF` (1.57) | `#D2D4DA` (1.48) |
| 400 | `#6D8BDE` (3.28) | **`#F8B718` (1.78) brand** | `#7EB8FC` (2.07) | `#9EA1A9` (2.58) |
| 500 | `#4963C2` (5.46) | `#E49E1A` (2.28) | `#589AED` (2.89) | `#71747D` (4.67) |
| 600 | `#2F44A3` (8.48) | `#C78115` (3.19) | `#3979D1` (4.35) | `#51555E` (7.47) |
| 700 | **`#1D2B7E` (12.36) brand** | `#A46313` (4.80) | `#2A5EAE` (6.34) | `#3C404A` (10.37) |
| 800 | `#152064` (14.76) | `#834B14` (7.04) | `#22478A` (8.99) | `#252933` (14.55) |
| 900 | `#0E174A` (16.93) | `#683B16` (9.43) | `#1B356B` (11.88) | `#12161F` (18.10) |
| 950 | `#070B2E` (19.15) | `#40230E` (14.34) | `#122148` (15.71) | `#090C14` (19.55) |

### What each family is for

**Navy** carries trust and structure.

- 50–100: tinted section backgrounds, selected table rows, hover on white.
- 200–300: borders on navy-tinted areas, disabled navy buttons, focus-ring halo.
- 400–500: icons on white, secondary buttons' borders, charts.
- 600: hover state of primary navy elements.
- 700: the brand. Headings, nav, primary links, secondary buttons.
- 800–950: pressed states, dark hero gradients, footer background.

**Gold** carries action and warmth. Only text-safe on white from step 700 down.

- 50–100: soft highlight backgrounds ("New" banner, featured job card tint).
- 200–300: badges, highlight marker behind words, light end of gold gradients.
- 400: the brand. Primary buttons, active tab underline, stars, key icons on dark.
- 500: hover of gold buttons.
- 600: pressed gold buttons, gold borders on white.
- 700–800: gold-family text on white (warning text, "Featured" labels).
- 900–950: rarely used; deep bronze for premium accents and the dark end of metallic gradients.

**Sky** is the friendly baby-blue support color from the Altaval inspiration.

- 50–200: alternate section backgrounds, info panels, form field focus fill.
- 300–500: illustrations, decorative shapes, link color on dark backgrounds (300–400), info badges.
- 600–700: info text and icons on white.
- 800–950: rarely used; only inside navy gradients.

**Ink** is the neutral grey, tinted very slightly toward navy so greys never look dead.

- 50–100: page alternate background, table headers, input backgrounds.
- 200–300: borders, dividers, the "thin dark lines" on white (use 200 for quiet, 300 for visible).
- 400: placeholder text, disabled text (decorative only, not for real reading).
- 500: secondary text, captions, meta info (passes 4.5 on white).
- 600–700: body text on white.
- 800–900: strong body text, dark surfaces and cards in dark mode.
- 950: Night, the dark section background.

## 5. Gradients

Six named gradients cover every need. Each stays inside one color family, so none of them goes muddy.

| Name | CSS | Use it for | On top of it |
| --- | --- | --- | --- |
| Gold Shine | `linear-gradient(135deg, #FED16D 0%, #F8B718 50%, #E49E1A 100%)` | Primary CTA buttons (optional), "Featured" badges, the swoosh accent line | Navy 950 or Ink 950 text |
| Gold Metallic | `linear-gradient(135deg, #FEE6AA 0%, #F8B718 35%, #C78115 65%, #FED16D 100%)` | Premium moments only: big display words on dark, award or "Top employer" seals, icon fills | Use on dark backgrounds only |
| Gold Glow | `radial-gradient(circle at 50% 0%, rgba(248,183,24,0.25) 0%, rgba(248,183,24,0) 60%)` | Soft light behind a hero headline or a featured card on a dark section | Layered over Night or Navy 950 |
| Navy Depth | `linear-gradient(160deg, #2F44A3 0%, #1D2B7E 45%, #0E174A 100%)` | Blue hero banners, the careers page header, "Join us" bands | White text, gold buttons |
| Night Fade | `linear-gradient(180deg, #0E174A 0%, #090C14 100%)` | Dark sections and the footer (the Kingsbury look with a Hebuza tint) | White text, gold buttons, Sky 300 links |
| Sky Wash | `linear-gradient(180deg, #F4F9FF 0%, #E6F2FE 100%)` | Soft light section backgrounds, form pages, empty states | Navy 700 headings, Ink 700 text |

**Gradient rules**

- Maximum one gradient per screen view. Gradients are spice, not the meal.
- Text on Gold Shine is always dark (Navy 950 `#070B2E` or Ink 950 `#090C14`), never white. White on gold fails readability.
- Gold text effect (`background-clip: text`) with Gold Metallic is allowed only for display headlines of 40px or larger, on dark backgrounds.
- Gradient direction is consistent: 135° for gold (light from the top-left, like the logo swoosh), 160–180° for navy and night.
- Never gradient gold into blue. If you need both, put a gold element on a navy gradient instead.

## 6. Semantic tokens (light and dark)

Components never use raw shades like `navy-700` directly. They use these role names, and each role points to a shade per theme. Changing a theme then means changing this one table, not every component.

### Surfaces, text and lines

| Token | Light theme | Dark theme | Meaning |
| --- | --- | --- | --- |
| `--bg` | `#FFFFFF` white | `#090C14` ink-950 | Page background |
| `--bg-subtle` | `#F9FAFC` ink-50 | `#12161F` ink-900 | Alternate sections, table headers |
| `--bg-tint` | `#F4F9FF` sky-50 | `#0E174A` navy-900 | Branded soft sections, info panels |
| `--surface` | `#FFFFFF` white | `#12161F` ink-900 | Cards, modals, dropdowns |
| `--surface-raised` | `#FFFFFF` + shadow | `#252933` ink-800 | Hovered cards, popovers |
| `--border` | `#E4E6EA` ink-200 | `#252933` ink-800 | Default hairlines and dividers |
| `--border-strong` | `#D2D4DA` ink-300 | `#3C404A` ink-700 | Inputs, visible separators |
| `--rule-accent` | `#1D2B7E` navy-700 | `#F8B718` gold-400 | The thin decorative lines you asked for (section dividers, heading underlines) |
| `--text` | `#12161F` ink-900 | `#F2F3F6` ink-100 | Body text |
| `--text-heading` | `#1D2B7E` navy-700 | `#FFFFFF` white | Headings |
| `--text-muted` | `#51555E` ink-600 | `#9EA1A9` ink-400 | Secondary text, captions |
| `--text-subtle` | `#71747D` ink-500 | `#71747D` ink-500 | Meta info, timestamps |
| `--text-disabled` | `#9EA1A9` ink-400 | `#51555E` ink-600 | Disabled labels |
| `--text-on-gold` | `#070B2E` navy-950 | `#070B2E` navy-950 | Text on any gold fill |
| `--text-on-navy` | `#FFFFFF` white | `#FFFFFF` white | Text on any navy fill |

### Brand and action

| Token | Light theme | Dark theme | Meaning |
| --- | --- | --- | --- |
| `--primary` | `#F8B718` gold-400 | `#F8B718` gold-400 | Main call-to-action fill (Apply, Submit, Post job) |
| `--primary-hover` | `#E49E1A` gold-500 | `#FED16D` gold-300 | Hover (darker on light, brighter on dark) |
| `--primary-active` | `#C78115` gold-600 | `#F8B718` gold-400 | Pressed |
| `--secondary` | `#1D2B7E` navy-700 | `#FFFFFF` white | Secondary button fill or outline |
| `--secondary-hover` | `#2F44A3` navy-600 | `#E2EBFF` navy-100 | Secondary hover |
| `--link` | `#2F44A3` navy-600 | `#AAD2FF` sky-300 | Text links |
| `--link-hover` | `#1D2B7E` navy-700 | `#CCE4FF` sky-200 | Link hover (add underline) |
| `--focus-ring` | `#F8B718` gold-400, 3px | `#F8B718` gold-400, 3px | Keyboard focus outline, everywhere |
| `--selection` | `#FEE6AA` gold-200 | `#152064` navy-800 | Text highlight colour |

### Status

| Token | Light text / icon | Light background | Dark text / icon | Dark background |
| --- | --- | --- | --- | --- |
| Success | `#166534 (icon #1C8742)` | `#E2F9E6` | `#5DC879` | `rgba(93,200,121,0.12)` |
| Error / danger | `#C9302D` | `#FFEFED` | `#F97770` | `rgba(249,119,112,0.12)` |
| Warning | `#A46313` gold-700 | `#FFFAEB` gold-50 | `#FED16D` gold-300 | `rgba(248,183,24,0.12)` |
| Info | `#2A5EAE` sky-700 | `#F4F9FF` sky-50 | `#AAD2FF` sky-300 | `rgba(126,184,252,0.12)` |

Warning is deliberately drawn from the gold family so it feels on-brand. Because gold is also the action color, warnings always carry an icon and a word ("Warning", "Expiring soon") so nobody confuses a warning with a button.

## 7. Components and their colors

Every component below lists its colors for the light theme first, then dark where it differs. Hex values match the tokens in section 6.

### Page structure

| Component | Background | Text / icons | Border / lines | Accent |
| --- | --- | --- | --- | --- |
| Top navbar (light pages) | `#FFFFFF`, bottom hairline | Links `#1D2B7E`, logo full colour | 1px `#E4E6EA` | Active link: 2px `#F8B718` underline; "Apply" button gold |
| Top navbar (over dark hero) | Transparent, turns `#090C14` at 95% opacity on scroll | Links `#FFFFFF`; logo white-and-gold version | none | Same gold underline and button |
| Hero (brand version) | Navy Depth gradient + optional Gold Glow | Headline `#FFFFFF`, sub-text `#C7D7FD` navy-200 | none | One gold button, one white-outline button |
| Hero (dark version, Kingsbury feel) | Night Fade `#0E174A → #090C14` | Headline `#FFFFFF`; one key word in Gold Metallic text | none | Gold button |
| Content section (default) | `#FFFFFF` | Heading `#1D2B7E`, body `#12161F`, muted `#51555E` | Section divider: 1px `#E4E6EA` | Optional 48×3px `#F8B718` bar above section heading |
| Content section (alternate) | `#F9FAFC` or Sky Wash | same as above | none | none |
| Feature band / stats strip | `#1D2B7E` | Numbers `#F8B718`, labels `#FFFFFF` | none | none |
| Footer | `#090C14` | Headings `#FFFFFF`, links `#9EA1A9`, hover `#FFFFFF` | Top border 1px `#252933` | Social icons hover `#F8B718` |

### Buttons

| Button | Default | Hover | Pressed | Disabled |
| --- | --- | --- | --- | --- |
| Primary (gold) | Fill `#F8B718`, text `#070B2E` | Fill `#E49E1A` | Fill `#C78115` | Fill `#FFF3D3`, text `#9EA1A9` |
| Secondary (navy) | Fill `#1D2B7E`, text `#FFFFFF` | Fill `#2F44A3` | Fill `#152064` | Fill `#E4E6EA`, text `#9EA1A9` |
| Outline | Transparent, 1.5px border `#1D2B7E`, text `#1D2B7E` | Fill `#F3F7FF` | Fill `#E2EBFF` | Border `#D2D4DA`, text `#9EA1A9` |
| Outline on dark | Transparent, border `#FFFFFF`, text `#FFFFFF` | Fill `rgba(255,255,255,0.08)` | Fill `rgba(255,255,255,0.16)` | Border `#3C404A`, text `#51555E` |
| Ghost / text | Transparent, text `#2F44A3` | Fill `#F3F7FF` | Fill `#E2EBFF` | Text `#9EA1A9` |
| Danger | Fill `#C9302D`, text `#FFFFFF` | Darken 8% | Darken 15% | Fill `#FFEFED`, text `#9EA1A9` |

Every button gets the same focus style: 3px `#F8B718` outline with 2px offset. Rule: **one gold button per view.** If two actions compete, the less important one is navy or outline.

### Forms (application forms and the form builder)

| Element | Light | Dark |
| --- | --- | --- |
| Input background | `#FFFFFF` | `#12161F` |
| Input border | 1px `#D2D4DA` | 1px `#3C404A` |
| Input hover border | `#9EA1A9` | `#71747D` |
| Input focus | Border `#1D2B7E` + 3px ring `rgba(248,183,24,0.45)` | Border `#F8B718` + same ring |
| Label | `#12161F`, 500 weight | `#F2F3F6` |
| Required asterisk | `#C9302D` | `#F97770` |
| Help text | `#71747D` | `#9EA1A9` |
| Placeholder | `#9EA1A9` | `#71747D` |
| Error state | Border `#C9302D`, message `#C9302D` with icon | Border `#F97770`, message `#F97770` |
| Success state | Border `#1C8742`, check icon `#1C8742` | `#5DC879` |
| Checkbox / radio checked | Fill `#1D2B7E`, tick `#FFFFFF` | Fill `#F8B718`, tick `#070B2E` |
| Toggle on | Track `#1D2B7E` | Track `#F8B718` |
| File upload (CV) zone | Fill `#F4F9FF`, 2px dashed `#AAD2FF`, icon `#3979D1` | Fill `#0E174A`, dashed `#22478A`, icon `#7EB8FC` |
| File upload drag-over | Fill `#FFFAEB`, dashed `#F8B718` | Fill `rgba(248,183,24,0.08)`, dashed `#F8B718` |
| Progress / step indicator | Done `#1D2B7E`, current `#F8B718` ring, upcoming `#D2D4DA` | Done `#FFFFFF`, current gold, upcoming `#3C404A` |
| Form builder canvas | `#F9FAFC` with field cards `#FFFFFF` | `#090C14`, cards `#12161F` |
| Form builder selected field | 2px `#F8B718` border | same |
| Form builder drop target | `#F3F7FF` fill, dashed `#6D8BDE` | `#0E174A`, dashed `#4963C2` |

### Careers page and hiring components

| Component | Colors |
| --- | --- |
| Job card | Fill `#FFFFFF`, border 1px `#E4E6EA`, title `#1D2B7E`, meta `#51555E`. Hover: border `#9DB6F2`, shadow `0 8px 24px rgba(29,43,126,0.10)` |
| Featured job card | Same, plus 3px left border `#F8B718` and a "Featured" badge (fill `#FFF3D3`, text `#834B14`) |
| Department / location chips | Fill `#F3F7FF`, text `#1D2B7E`, border `#E2EBFF`. Selected filter: fill `#1D2B7E`, text `#FFFFFF` |
| Employment-type tag (Full-time, Remote) | Fill `#F2F3F6`, text `#3C404A` |
| "New" / "Hiring now" badge | Fill `#F8B718`, text `#070B2E` |
| Salary range text | `#12161F` bold, currency label `#71747D` |
| Search bar | Fill `#FFFFFF`, border `#D2D4DA`, search icon `#71747D`, focus as inputs |
| Empty state ("No jobs match") | Sky Wash background, illustration in Sky 300–500, heading `#1D2B7E` |
| Application received page | Success icon `#1C8742` in `#E2F9E6` circle; heading `#1D2B7E`; reference number in `#F9FAFC` box |

### Application status badges (candidate portal and HR dashboard)

Each pipeline stage gets one distinct, readable colour so HR can scan a list at a glance.

| Stage | Background | Text | Dot / icon |
| --- | --- | --- | --- |
| Applied | `#F2F3F6` | `#3C404A` | `#71747D` |
| In review | `#E6F2FE` | `#22478A` | `#3979D1` |
| Shortlisted | `#E2EBFF` | `#1D2B7E` | `#4963C2` |
| Interview | `#FFF3D3` | `#834B14` | `#E49E1A` |
| Offer | `#FFFAEB` with 1px `#F8B718` border | `#683B16` | `#F8B718` |
| Hired | `#E2F9E6` | `#166534` | `#1C8742` |
| Rejected / withdrawn | `#FFEFED` | `#9F2420` | `#C9302D` |
| On hold | `#F9FAFC` | `#51555E` | `#9EA1A9` |

### HR dashboard (app side)

| Element | Colors |
| --- | --- |
| Sidebar | `#0E174A` navy-900; items `#C7D7FD`; active item fill `rgba(248,183,24,0.12)`, text `#F8B718`, 3px left bar `#F8B718` |
| Main area | `#F9FAFC`, cards `#FFFFFF` with `#E4E6EA` border |
| Data tables | Header `#F2F3F6` text `#3C404A`; rows `#FFFFFF`; hover `#F3F7FF`; selected `#E2EBFF`; dividers `#E4E6EA` |
| Charts (order of series) | `#1D2B7E`, `#F8B718`, `#589AED`, `#9DB6F2`, `#C78115`, `#71747D` |
| Kanban pipeline columns | Column fill `#F2F3F6`, cards `#FFFFFF`, column header dot uses the stage dot colour above |
| Notifications dot | `#C9302D` for urgent, `#F8B718` for new |

### Overlays and feedback

| Element | Colors |
| --- | --- |
| Modal | Surface `#FFFFFF`, backdrop `rgba(9,12,20,0.60)` |
| Tooltip | Fill `#12161F`, text `#FFFFFF` (same in both themes) |
| Toast: success / error / info | Left bar in status colour, surface `#FFFFFF` (dark: `#252933`), text `#12161F` (dark: `#F2F3F6`) |
| Alert banners | Status background + status text from section 6, with icon |
| Skeleton loader | `#F2F3F6` shimmering to `#E4E6EA` (dark: `#12161F` to `#252933`) |
| Shadows | Use navy-tinted shadows, never pure black: small `0 1px 2px rgba(29,43,126,0.06)`, medium `0 8px 24px rgba(29,43,126,0.10)`, large `0 20px 48px rgba(29,43,126,0.16)` |

## 8. Accessibility: approved and forbidden pairings

All ratios below were calculated with the WCAG 2.2 formula. AA needs **4.5:1** for normal text and **3:1** for large text (24px+, or 18.5px+ bold) and for icons and borders. Many candidates apply on phones in bright light, so aim for AA everywhere.

### Approved text pairings

| Text | Background | Ratio | OK for |
| --- | --- | --- | --- |
| Navy 700 `#1D2B7E` | White `#FFFFFF` | 12.36 | All text |
| Ink 900 `#12161F` | White | 18.10 | Body text |
| Ink 600 `#51555E` | White | 7.47 | Secondary text |
| Ink 500 `#71747D` | White | 4.67 | Captions, meta (minimum) |
| Navy 950 `#070B2E` | Gold 400 `#F8B718` | 10.74 | Gold button labels |
| Navy 950 `#070B2E` | Gold 600 `#C78115` | 6.00 | Pressed gold button |
| Navy 700 `#1D2B7E` | Gold 400 `#F8B718` | 6.93 | Navy text on gold, badges |
| Gold 400 `#F8B718` | Navy 700 `#1D2B7E` | 6.93 | Gold numbers or labels on navy bands |
| Gold 400 `#F8B718` | Night `#090C14` | 10.96 | Gold text and icons on dark |
| White | Navy 600 `#2F44A3` | 8.48 | Navy button hover |
| Navy 200 `#C7D7FD` | Navy 700 `#1D2B7E` | 8.57 | Sub-text in navy hero |
| Ink 100 `#F2F3F6` | Ink 900 `#12161F` | 16.31 | Dark-mode body text on cards |
| Ink 400 `#9EA1A9` | Night `#090C14` | 7.56 | Dark-mode muted text |
| Sky 300 `#AAD2FF` | Night `#090C14` | 12.45 | Links on dark |
| Gold 700 `#A46313` | Gold 50 `#FFFAEB` | 4.60 | Warning text |
| Sky 700 `#2A5EAE` | Sky 50 `#F4F9FF` | 5.99 | Info text |
| Red `#C9302D` | `#FFEFED` | 4.77 | Error text |
| Green `#166534` | `#E2F9E6` | 6.43 | Success text |

### Forbidden pairings

| Never do this | Ratio | Why | Do this instead |
| --- | --- | --- | --- |
| Gold 400 text on white | 1.78 | Nearly invisible | Gold 700 `#A46313` text, or a gold fill with navy text |
| White text on Gold 400 | 1.78 | Unreadable button | Navy 950 text on gold |
| Gold 500 `#E49E1A` text on white | 2.28 | Too faint | Gold 700 or 800 |
| Sky 500 `#589AED` text on white | 2.89 | Fails AA | Sky 700 `#2A5EAE` |
| Navy 700 text on Night | 1.58 | Disappears in dark mode | White or Sky 300 |
| Ink 400 `#9EA1A9` as reading text on white | 2.58 | Fails AA | Ink 500 or darker |
| Green `#1C8742` text on its pale background | 4.12 | Just fails | `#166534` |

### Beyond contrast

- **Never rely on colour alone.** Every status badge has a word, and errors have an icon plus a message. About 1 in 12 men has some colour-vision deficiency, and red versus green are hardest.
- **Focus is always visible:** 3px gold `#F8B718` outline, 2px offset, on every interactive element. Gold on white is only 1.78, so on white pages pair it with the navy 700 input border (12.36) so the focused field still passes 3:1 as a whole.
- **Links in body text are underlined**, not just coloured.
- **Respect user settings:** dark tokens apply under `prefers-color-scheme: dark`; reduce gradient animation under `prefers-reduced-motion`.

## 9. Do and don't rules

### Do

1. Use semantic tokens (`--primary`, `--text-heading`) in components, never raw hex.
2. Keep each screen at roughly 60% white/neutral, 30% navy/ink, 10% gold.
3. Reserve gold fills for the single most important action on a view (Apply, Submit application, Post job).
4. Use navy 700 for all headings on light pages; it is the brand voice.
5. Use hairline borders (`#E4E6EA`) and thin navy or gold accent rules for structure, instead of heavy boxes or shadows.
6. Alternate white and subtle sections (`#F9FAFC` or Sky Wash) to separate long pages like a job description.
7. Use one dark Night or Navy Depth band per page for drama (hero, a "Why join us" band, or the footer), the Kingsbury way.
8. Tint shadows with navy (`rgba(29,43,126,…)`) so they feel part of the brand.
9. Put the full-colour logo on white; on navy or Night, use a version with white letters and the gold swoosh.
10. Test every new pairing against section 8 before shipping.

### Don't

1. Don't use pure black `#000000` anywhere. Use Night `#090C14` or Ink 900.
2. Don't put gold text on white, or white text on gold.
3. Don't use more than one gradient per screen, or gradient gold into blue.
4. Don't make large areas gold. A gold full-width section tires the eye fast; gold works as a spark.
5. Don't introduce new blues or yellows outside these scales (no "slightly different" button blue).
6. Don't use the Altaval lemon `#ECFC00` or Kingsbury yellow `#FFD500`. They clash with the warmer Hebuza gold; they were inspiration for the role of yellow, not the hue.
7. Don't recolour the logo or put it on Sky or gold backgrounds where the swoosh disappears.
8. Don't use colour alone to carry meaning (status, errors, required fields).
9. Don't use sky and navy as equal partners in one component; sky supports, navy leads.

## 10. Ready-to-use code and AI builder prompt

Copy these into the project as the single source of truth. The CSS file works in any stack; the Tailwind block is for Tailwind v4 projects.

### CSS variables (`tokens.css`)

```css
:root {
  /* ---------- Raw scales ---------- */
  --navy-50:#F3F7FF; --navy-100:#E2EBFF; --navy-200:#C7D7FD; --navy-300:#9DB6F2;
  --navy-400:#6D8BDE; --navy-500:#4963C2; --navy-600:#2F44A3; --navy-700:#1D2B7E;
  --navy-800:#152064; --navy-900:#0E174A; --navy-950:#070B2E;

  --gold-50:#FFFAEB; --gold-100:#FFF3D3; --gold-200:#FEE6AA; --gold-300:#FED16D;
  --gold-400:#F8B718; --gold-500:#E49E1A; --gold-600:#C78115; --gold-700:#A46313;
  --gold-800:#834B14; --gold-900:#683B16; --gold-950:#40230E;

  --sky-50:#F4F9FF; --sky-100:#E6F2FE; --sky-200:#CCE4FF; --sky-300:#AAD2FF;
  --sky-400:#7EB8FC; --sky-500:#589AED; --sky-600:#3979D1; --sky-700:#2A5EAE;
  --sky-800:#22478A; --sky-900:#1B356B; --sky-950:#122148;

  --ink-50:#F9FAFC; --ink-100:#F2F3F6; --ink-200:#E4E6EA; --ink-300:#D2D4DA;
  --ink-400:#9EA1A9; --ink-500:#71747D; --ink-600:#51555E; --ink-700:#3C404A;
  --ink-800:#252933; --ink-900:#12161F; --ink-950:#090C14;

  /* ---------- Gradients ---------- */
  --grad-gold-shine: linear-gradient(135deg,#FED16D 0%,#F8B718 50%,#E49E1A 100%);
  --grad-gold-metallic: linear-gradient(135deg,#FEE6AA 0%,#F8B718 35%,#C78115 65%,#FED16D 100%);
  --grad-gold-glow: radial-gradient(circle at 50% 0%,rgba(248,183,24,.25) 0%,rgba(248,183,24,0) 60%);
  --grad-navy-depth: linear-gradient(160deg,#2F44A3 0%,#1D2B7E 45%,#0E174A 100%);
  --grad-night-fade: linear-gradient(180deg,#0E174A 0%,#090C14 100%);
  --grad-sky-wash: linear-gradient(180deg,#F4F9FF 0%,#E6F2FE 100%);

  /* ---------- Shadows ---------- */
  --shadow-sm: 0 1px 2px rgba(29,43,126,.06);
  --shadow-md: 0 8px 24px rgba(29,43,126,.10);
  --shadow-lg: 0 20px 48px rgba(29,43,126,.16);

  /* ---------- Semantic: LIGHT ---------- */
  color-scheme: light;
  --bg:#FFFFFF; --bg-subtle:var(--ink-50); --bg-tint:var(--sky-50);
  --surface:#FFFFFF; --surface-raised:#FFFFFF;
  --border:var(--ink-200); --border-strong:var(--ink-300); --rule-accent:var(--navy-700);
  --text:var(--ink-900); --text-heading:var(--navy-700); --text-muted:var(--ink-600);
  --text-subtle:var(--ink-500); --text-disabled:var(--ink-400);
  --text-on-gold:var(--navy-950); --text-on-navy:#FFFFFF;
  --primary:var(--gold-400); --primary-hover:var(--gold-500); --primary-active:var(--gold-600);
  --secondary:var(--navy-700); --secondary-hover:var(--navy-600);
  --link:var(--navy-600); --link-hover:var(--navy-700);
  --focus-ring:var(--gold-400); --selection:var(--gold-200);
  --success:#166534; --success-icon:#1C8742; --success-bg:#E2F9E6;
  --danger:#C9302D;  --danger-bg:#FFEFED;
  --warning:var(--gold-700); --warning-bg:var(--gold-50);
  --info:var(--sky-700); --info-bg:var(--sky-50);
}

/* ---------- Semantic: DARK (system setting, unless forced light) ---------- */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    /* Optional full dark mode: paste the same variables as the dark block below here */
  }
}
:root[data-theme="dark"], .theme-dark {
  color-scheme: dark;
  --bg:var(--ink-950); --bg-subtle:var(--ink-900); --bg-tint:var(--navy-900);
  --surface:var(--ink-900); --surface-raised:var(--ink-800);
  --border:var(--ink-800); --border-strong:var(--ink-700); --rule-accent:var(--gold-400);
  --text:var(--ink-100); --text-heading:#FFFFFF; --text-muted:var(--ink-400);
  --text-subtle:var(--ink-500); --text-disabled:var(--ink-600);
  --primary-hover:var(--gold-300); --primary-active:var(--gold-400);
  --secondary:#FFFFFF; --secondary-hover:var(--navy-100);
  --link:var(--sky-300); --link-hover:var(--sky-200);
  --selection:var(--navy-800);
  --success:#5DC879; --success-icon:#5DC879; --success-bg:rgba(93,200,121,.12);
  --danger:#F97770;  --danger-bg:rgba(249,119,112,.12);
  --warning:var(--gold-300); --warning-bg:rgba(248,183,24,.12);
  --info:var(--sky-300); --info-bg:rgba(126,184,252,.12);
}

::selection { background: var(--selection); }
:focus-visible { outline: 3px solid var(--focus-ring); outline-offset: 2px; }
```

The `.theme-dark` class lets you make any single section dark (the Kingsbury-style hero or footer) on an otherwise light page: just add `class="theme-dark"` to that section and everything inside switches. For full system dark mode, copy the dark block's variables into the `@media (prefers-color-scheme: dark)` rule as well.

### Tailwind v4 (`app.css`)

```css
@import "tailwindcss";

@theme {
  --color-navy-50:#F3F7FF; --color-navy-100:#E2EBFF; --color-navy-200:#C7D7FD;
  --color-navy-300:#9DB6F2; --color-navy-400:#6D8BDE; --color-navy-500:#4963C2;
  --color-navy-600:#2F44A3; --color-navy-700:#1D2B7E; --color-navy-800:#152064;
  --color-navy-900:#0E174A; --color-navy-950:#070B2E;

  --color-gold-50:#FFFAEB; --color-gold-100:#FFF3D3; --color-gold-200:#FEE6AA;
  --color-gold-300:#FED16D; --color-gold-400:#F8B718; --color-gold-500:#E49E1A;
  --color-gold-600:#C78115; --color-gold-700:#A46313; --color-gold-800:#834B14;
  --color-gold-900:#683B16; --color-gold-950:#40230E;

  --color-sky-50:#F4F9FF; --color-sky-100:#E6F2FE; --color-sky-200:#CCE4FF;
  --color-sky-300:#AAD2FF; --color-sky-400:#7EB8FC; --color-sky-500:#589AED;
  --color-sky-600:#3979D1; --color-sky-700:#2A5EAE; --color-sky-800:#22478A;
  --color-sky-900:#1B356B; --color-sky-950:#122148;

  --color-ink-50:#F9FAFC; --color-ink-100:#F2F3F6; --color-ink-200:#E4E6EA;
  --color-ink-300:#D2D4DA; --color-ink-400:#9EA1A9; --color-ink-500:#71747D;
  --color-ink-600:#51555E; --color-ink-700:#3C404A; --color-ink-800:#252933;
  --color-ink-900:#12161F; --color-ink-950:#090C14;
}
```

This overrides Tailwind's built-in `sky` with the Hebuza sky, so `bg-sky-50` and `text-navy-700` just work. Example primary button: `bg-gold-400 hover:bg-gold-500 active:bg-gold-600 text-navy-950 font-semibold rounded-lg px-5 py-3 focus-visible:outline-3 focus-visible:outline-gold-400 focus-visible:outline-offset-2`.

### Prompt to give an AI builder

Paste this at the start of any request to an AI website or app builder, along with the `tokens.css` above:

```markdown
You are building for Hebuza. Follow this colour system exactly. Use only these colours.

Brand: Navy #1D2B7E (navy-700) and Gold #F8B718 (gold-400), from the logo.
Scales: navy, gold, sky and ink, steps 50–950, defined in tokens.css. Use the CSS variables, never new hex values.

Feel: calm, trustworthy, warm, modern. White-first pages, navy structure, gold for action only.
Balance: about 60% white/neutral, 30% navy/ink, 10% gold on every screen.

Rules:
- Headings navy-700 on light, white on dark. Body text ink-900 on light, ink-100 on dark.
- Primary button: gold-400 fill, navy-950 text; hover gold-500; pressed gold-600. Only one gold button per view.
- Secondary button: navy-700 fill, white text. Outline button: navy-700 border and text.
- Borders are thin hairlines (ink-200); accent rules are navy-700 on light, gold-400 on dark.
- One dark section per page (hero, feature band or footer) using Night #090C14 or the navy-depth gradient, with class theme-dark.
- Gradients only from tokens.css, at most one per screen, never gold blended into blue.
- Focus: 3px gold-400 outline, 2px offset, on every interactive element.
- Never: pure black, gold text on white, white text on gold, colour as the only signal of status.
- Application status badges use the stage colours: Applied grey, In review sky, Shortlisted navy, Interview gold, Offer gold with border, Hired green, Rejected red, On hold light grey.
- Every text/background pair must meet WCAG AA (4.5:1 normal text, 3:1 large text and icons).
```
