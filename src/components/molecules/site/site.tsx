import Image from "next/image";
import Link from "next/link";
import { type ReactNode } from "react";
import { cx, formatMoney } from "@/shared/format";
import { type Locale, localHref } from "@/shared/i18n/config";
import { type ServiceVM } from "@/lib/catalogue";
import { getCopy } from "@/content/marketing";
import { CircleLink } from "@/components/atoms/button";
import { Tag } from "@/components/atoms/tag";
import { Icon, type IconName } from "@/components/atoms/icon";
import { CircleBadge, HighlightWord, Star, GridLines } from "@/components/atoms/brand";
import { Parallax, Reveal } from "@/components/atoms/motion";
import { type BlockShape, type BlockText, type CmsVariant, type RichDoc, type RichInline } from "@/shared/marketing/types";
import { safeHref, youtubeId } from "@/shared/marketing/cms/rules";
import { type LcCopy } from "@/content/pages/lc";
import { TEAM } from "@/content/pages/lb";

/** Eyebrow + h2 (+ optional highlighted word) + lead + aside action. */
export function SectionHead({ tag, title, lead, aside, tone = "light", center, className, tagVariant = "neutral" }: {
  tag: string; title: ReactNode; lead?: ReactNode; aside?: ReactNode; tone?: "light" | "dark" | "lavender"; center?: boolean; className?: string;
  tagVariant?: "neutral" | "outline" | "outline-dark" | "new";
}) {
  return (
    <div className={cx("flex flex-col gap-6", tone === "dark" && "theme-dark", center ? "items-center text-center" : "md:flex-row md:items-end md:justify-between", className)}>
      <div className={cx("grid max-w-3xl gap-4", center && "justify-items-center")}>
        <span data-reveal><Tag variant={tagVariant} className="eyebrow normal-case">{tag}</Tag></span>
        <h2 data-reveal className={cx("text-h2", tone === "dark" ? "text-white" : "text-fg-heading")}>{title}</h2>
        {lead && <p data-reveal className={cx("max-w-xl text-lead", tone === "dark" ? "text-white/75" : "text-fg-muted")}>{lead}</p>}
      </div>
      {aside && <div data-reveal className="shrink-0">{aside}</div>}
    </div>
  );
}

/** Navy-framed photo with parallax image, optional caption bar, tag and badge (landing1 "Card / Media / Image"). */
export function PhotoFrame({ src, alt, rotate = 0, caption, meta, tag, badge, className, priority, sizes = "(min-width: 1200px) 30vw, 80vw", ratio = "aspect-[4/5]" }: {
  src: string; alt: string; rotate?: number; caption?: string; meta?: string; tag?: string; badge?: string; className?: string; priority?: boolean; sizes?: string; ratio?: string;
}) {
  return (
    <figure className={cx("relative bg-navy-700 p-1.5 shadow-lg", className)} style={{ rotate: `${rotate}deg` }}>
      <div className={cx("relative overflow-hidden bg-navy-900", ratio)}>
        <Parallax><Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" /></Parallax>
      </div>
      {(caption || tag) && (
        <figcaption className="relative px-4 py-3 text-white">
          <span className="min-w-0">
            {caption && <span className="block truncate text-label">{caption}</span>}
            {meta && <span className="block truncate text-small text-white/65">{meta}</span>}
          </span>
          {/* floats over the photo edge so the caption keeps full width */}
          {tag && <Tag variant="new" className="absolute -top-8 right-3 h-7 text-eyebrow">{tag}</Tag>}
        </figcaption>
      )}
      {badge && <span className="absolute -bottom-8 -left-8"><CircleBadge text={badge} size="size-24 md:size-28" /></span>}
    </figure>
  );
}

/** Three fanned photo cards + badge (landing1 hero "Visual": −7° / 4° / −4° at .96). */
export function CardFan({ back1, back2, front, alt, caption, meta, tag, badge, priority }: {
  back1: string; back2: string; front: string; alt: string; caption: string; meta: string; tag: string; badge: string; priority?: boolean;
}) {
  return (
    <div data-hero="visual" className="relative mx-auto aspect-[1.05] w-full max-w-[34rem]">
      <div data-hero="card" className="absolute top-[4%] left-[2%] w-[48%]" style={{ rotate: "-7deg" }}>
        <PhotoFrame src={back1} alt="" ratio="aspect-[3/4]" sizes="20vw" />
      </div>
      <div data-hero="card" className="absolute top-0 right-[1%] w-[46%]" style={{ rotate: "4deg" }}>
        <PhotoFrame src={back2} alt="" ratio="aspect-[3/4]" sizes="20vw" />
      </div>
      <div data-hero="card" className="absolute top-[13%] left-[22%] w-[58%]" style={{ rotate: "-4deg", scale: ".96" }}>
        <PhotoFrame src={front} alt={alt} caption={caption} meta={meta} tag={tag} ratio="aspect-[4/3.6]" priority={priority} sizes="(min-width: 1200px) 32vw, 70vw" />
      </div>
      <div data-hero="badge" className="absolute bottom-[4%] left-[8%] md:left-[12%]"><CircleBadge text={badge} /></div>
    </div>
  );
}

export type FamilyRow = { name: string; href: string; popular?: boolean };
const CARD = {
  large: "theme-dark bg-navy-700 text-white lg:row-span-2 md:col-span-2 lg:col-span-1",
  standard: "border border-ink-200 bg-white text-navy-900",
  mini: "relative min-w-[17rem] snap-start bg-sky-100 text-navy-900 md:min-w-0",
};

/** Home services bento card: photo strip, service rows (names only), "view all" footer. Mini = one-service area, no photo. */
export function FamilyCard({ size, n, title, href, photo, rows, viewAll, popularLabel }: { size: keyof typeof CARD; n: number; title: string; href: string; photo: string; rows: FamilyRow[]; viewAll: string; popularLabel: string }) {
  const dark = size === "large";
  const num = String(n).padStart(2, "0");
  return (
    <article data-reveal className={cx("group flex h-full flex-col overflow-hidden transition-shadow duration-(--duration-slow) ease-(--ease-out-expo) hover:shadow-[0_20px_40px_-16px_color-mix(in_oklab,var(--color-navy-900)_55%,transparent)] motion-reduce:transition-none", CARD[size])}>
      {size === "mini" ? (
        <>
          {/* Faint area photo behind the mini card, washed with the card colour so text stays crisp. */}
          <Image src={photo} alt="" fill sizes="(min-width: 1024px) 22vw, 70vw" className="object-cover opacity-35 transition-transform duration-(--duration-slow) group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
          <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-sky-100 via-sky-100/90 to-sky-100/55" />
          <h3 className="relative flex items-baseline gap-2 px-5 pt-5 text-h3"><span className="font-display text-[1.4rem] leading-none text-navy-500">{num}</span>{title}</h3>
        </>
      ) : (
        <div className="relative h-28 shrink-0 overflow-hidden md:h-32">
          <Image src={photo} alt="" fill sizes={dark ? "(min-width: 1024px) 33vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"} className="object-cover transition-transform duration-(--duration-slow) group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
          <span aria-hidden className="absolute inset-0 bg-gradient-to-r from-navy-900/90 via-navy-900/55 to-transparent" />
          <h3 className="absolute inset-x-0 bottom-0 flex items-baseline gap-3 p-5 text-[clamp(1.5rem,1.2rem+0.9vw,2rem)] leading-tight tracking-[-0.02em] text-white"><span className="font-display text-[1.75rem] leading-none">{num}</span>{title}</h3>
        </div>
      )}
      <ul aria-label={title} className={cx("relative flex-1", size === "mini" ? "px-5 pb-2" : "px-5 pt-1")}>
        {rows.map((r) => (
          <li key={r.href} className={cx("border-b last:border-b-0", dark ? "border-white/15" : "border-navy-900/10")}>
            <Link href={r.href} className={cx("-mx-2 flex min-h-14 items-center gap-3 px-2 py-2.5 text-body transition-colors [&:hover>svg]:translate-x-1", dark ? "hover:bg-white/10" : "hover:bg-navy-900/5")}>
              <span className={cx("flex min-w-0 flex-1 gap-x-3", size === "mini" ? "flex-col" : "items-center")}>
                <span className="line-clamp-2 min-w-0 flex-1 text-[1.0625rem] font-medium leading-snug">{r.name}{r.popular && <span className="ml-2 inline-flex h-5 items-center bg-gold-400 px-1.5 align-middle text-eyebrow text-on-gold">{popularLabel}</span>}</span>
              </span>
              <Icon name="arrowRight" size={18} className="shrink-0 transition-transform motion-reduce:transition-none" />
            </Link>
          </li>
        ))}
      </ul>
      {size !== "mini" && (
        <Link href={href} className={cx("flex min-h-14 items-center justify-between px-5 text-body font-medium transition-colors [&:hover>svg]:translate-x-1", dark ? "bg-navy-900/40 hover:bg-navy-900/60" : "bg-ink-50 hover:bg-ink-100")}>
          {viewAll}<Icon name="arrowRight" size={16} className="transition-transform motion-reduce:transition-none" />
        </Link>
      )}
    </article>
  );
}

/** Service card (catalogue, family, related). */
// Card palette (bg / text); dark entries take the theme-dark scope. Every pair clears AA for body text.
const CARD_TONES = [
  { bg: "bg-navy-700 text-white", dark: true }, { bg: "bg-white text-navy-900 border border-navy-900/10", dark: false },
  { bg: "bg-navy-900 text-white", dark: true }, { bg: "bg-gold-100 text-navy-900", dark: false },
  { bg: "bg-sky-100 text-navy-900", dark: false }, { bg: "bg-ink-50 text-navy-900 border border-navy-900/10", dark: false },
] as const;
const slugHash = (s: string) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
/** Stable tone index per slug, bumping a repeat of the previous card's tone to the next palette entry. */
export function cardTones(slugs: string[]) {
  const out: number[] = [];
  slugs.forEach((slug, i) => { let t = slugHash(slug) % CARD_TONES.length; if (i && t === out[i - 1]) t = (t + 1) % CARD_TONES.length; out.push(t); });
  return out;
}

export function ServiceCard({ s, locale, familyName, tone }: { s: ServiceVM; locale: Locale; familyName?: string; tone?: number }) {
  const c = getCopy(locale).card;
  const tier = s.tiers[0];
  const t = CARD_TONES[tone ?? slugHash(s.slug) % CARD_TONES.length];
  const muted = t.dark ? "text-white/70" : "text-navy-900/70";
  return (
    <Link data-reveal href={localHref(locale, `/services/${s.slug}`)}
      className={cx("group flex flex-col p-5 transition-[translate,box-shadow] duration-(--duration-slow) ease-(--ease-out-expo) hover:-translate-y-1 hover:shadow-[0_14px_32px_-12px_rgb(16_42_94/0.45)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400 motion-reduce:transition-none motion-reduce:hover:translate-y-0 md:p-6", t.bg, t.dark && "theme-dark")}>
      <div className={cx("flex items-center justify-between gap-3 text-eyebrow uppercase", muted)}>
        <span className="truncate">{s.subArea?.name ?? familyName}</span>
        <span className="inline-flex shrink-0 items-center gap-1.5"><span className={cx("size-1.5 rounded-full", s.paused ? "bg-ink-400" : "bg-success")} />{s.paused ? c.paused : c.live}</span>
      </div>
      <h3 className="mt-4 line-clamp-2 text-card-title xl:text-h3">{s.name}</h3>
      {s.summary && s.summary !== s.name && <p className={cx("mt-2 line-clamp-1 text-small", muted)}>{s.summary}</p>}
      <span className="min-h-6 flex-1" />
      <div className={cx("flex flex-wrap items-end justify-between gap-x-3 gap-y-2 border-t pt-4", t.dark ? "border-white/20" : "border-navy-900/15")}>
        <div>
          <span className={cx("block text-eyebrow uppercase", muted)}>{s.priceMode === "quote" ? "\u00a0" : c.from}</span>
          <span className="tabular text-label-lg">{s.priceMode === "quote" || s.fromFee == null ? c.quote : formatMoney(s.fromFee, "RWF", locale)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-eyebrow">
          {tier && <span className={cx("inline-flex h-7 items-center gap-1", muted)}><Icon name="clock" size={13} />{tier.eta}</span>}
          {s.planCovered && <span className={cx("inline-flex h-7 items-center px-2.5", t.dark ? "bg-gold-400 text-on-gold" : "bg-navy-900 text-white")}>{c.plan}</span>}
        </div>
      </div>
      <span className="mt-4 self-end text-small font-medium">{c.view} <span aria-hidden className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transition-none">→</span></span>
    </Link>
  );
}

/** Landing1 approach card: colour tile or photo, tag pill at bottom, 2-line text. */
export function StepCard({ tag, text, kind, photo, tagVariant = "navy" }: { tag: string; text: string; kind: "dots" | "bars" | "photo" | "doc"; photo?: string; tagVariant?: "navy" | "glass" | "new" | "selected" }) {
  const bg = kind === "dots" ? "bg-navy-700" : kind === "bars" ? "bg-navy-900" : kind === "doc" ? "border border-sky-100 bg-sky-50" : "bg-ink-950";
  return (
    <div data-reveal className={cx("relative flex aspect-[3/4] lg:aspect-square min-w-[15rem] snap-start flex-col justify-end overflow-hidden p-4 text-white md:min-w-0", bg)}>
      {kind === "photo" && photo && (
        <>
          <Parallax><Image src={photo} alt="" fill sizes="(min-width: 1200px) 18vw, 60vw" className="object-cover" /></Parallax>
          <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/30 to-transparent" />
        </>
      )}
      {kind === "dots" && (
        <div aria-hidden className="absolute top-4 left-4 grid grid-cols-5 gap-2">
          {Array.from({ length: 10 }, (_, i) => <span key={i} className={cx("size-6 rounded-full", i < 3 ? "bg-gold-400" : "bg-white/20")} />)}
        </div>
      )}
      {kind === "bars" && (
        <div aria-hidden className="absolute top-4 left-4 flex gap-2">
          {Array.from({ length: 12 }, (_, i) => <span key={i} className={cx("h-9 w-1", i === 5 || i === 6 ? "bg-gold-400" : "bg-white/20")} />)}
        </div>
      )}
      {kind === "doc" && <Icon name="fileCheck" size={64} strokeWidth={1.5} className="absolute top-5 left-5 text-navy-700" />}
      <div className="relative">
        <Tag variant={tagVariant} className={cx("h-7 text-eyebrow", kind === "doc" && "border-0 bg-navy-700 text-white")}>{tag}</Tag>
        <p className={cx("mt-3 text-small font-medium", kind === "doc" ? "text-navy-800" : "text-white")}>{text}</p>
      </div>
    </div>
  );
}

/** Guide / journal card. */
export function GuideCard({ img, tag, date, read, title, excerpt, href, compact }: { img: string; tag: string; date: string; read: string; title: string; excerpt: string; href: string; compact?: boolean }) {
  if (compact) {
    // Horizontal card: square photo left, text right (~1/3 the height of the stacked card).
    return (
      <Link data-reveal href={href} className="group flex min-w-[17rem] snap-start gap-3 overflow-hidden border border-border bg-surface p-1.5 transition-[translate,box-shadow,border-color] duration-(--duration-slow) hover:-translate-y-0.5 hover:border-navy-300 hover:shadow-md md:min-w-0">
        <div className="relative aspect-square w-28 shrink-0 overflow-hidden lg:w-32">
          <Image src={img} alt="" fill sizes="128px" className="object-cover transition-transform duration-(--duration-reveal) ease-(--ease-out-expo) group-hover:scale-105" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center py-1.5 pr-2">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-eyebrow text-fg-subtle"><span className="font-medium text-navy-700">{tag}</span><Star className="size-2 text-gold-600" />{date}<Star className="size-2 text-gold-600" />{read}</p>
          <h3 className="mt-1.5 line-clamp-2 text-label-lg text-fg-heading">{title}</h3>
          <p className="mt-1 line-clamp-1 text-small text-fg-subtle">{excerpt}</p>
        </div>
      </Link>
    );
  }
  return (
    <Link data-reveal href={href} className="group flex min-w-[17rem] snap-start flex-col overflow-hidden border border-border bg-surface p-1.5 transition-[translate,box-shadow,border-color] duration-(--duration-slow) hover:-translate-y-1 hover:border-navy-300 hover:shadow-md md:min-w-0">
      <div className="relative aspect-[3/2] overflow-hidden">
        <Image src={img} alt="" fill sizes="(min-width: 1200px) 28vw, 80vw" className="object-cover transition-transform duration-(--duration-reveal) ease-(--ease-out-expo) group-hover:scale-105" />
        <Tag variant="outline" className="absolute top-3 left-3 h-7 text-eyebrow">{tag}</Tag>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="flex items-center gap-2 text-eyebrow text-fg-subtle">{date}<Star className="size-2.5 text-gold-600" />{read}</p>
        <h3 className="mt-2 text-card-title">{title}</h3>
        <p className="mt-1.5 text-small text-fg-subtle">{excerpt}</p>
      </div>
    </Link>
  );
}

/** Two cards: HEBUZA's work vs institution decision (F-REQ-09). */
export function HebuzaVsInstitution({ hebuza, institution, done, outcome, caption, dark }: { hebuza: string; institution: string; done: string; outcome: string; caption: string; dark?: boolean }) {
  return (
    <div data-reveal className="grid gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="border border-border bg-surface p-5 text-fg">
          <p className="text-label-lg">{hebuza}</p>
          <p className="mt-4 flex items-center gap-3 text-body"><span className="flex size-9 items-center justify-center rounded-full bg-navy-50 text-navy-700"><Icon name="check" size={18} strokeWidth={2.5} /></span>{done}</p>
        </div>
        <div className="theme-dark bg-navy-700 p-5 text-white">
          <p className="text-label-lg">{institution}</p>
          <p className="mt-4 flex items-center gap-3 text-body"><span className="flex size-9 items-center justify-center rounded-full bg-gold-400 text-navy-950"><Icon name="check" size={18} strokeWidth={2.5} /></span>{outcome}</p>
        </div>
      </div>
      <p className={cx("text-small", dark ? "text-white/70" : "text-fg-subtle")}>{caption}</p>
    </div>
  );
}

/** Small icon tile (promises, trust strip). */
export function IconTile({ icon, text, className }: { icon: IconName; text: string; className?: string }) {
  return (
    <div data-reveal className={cx("flex flex-col gap-3 border border-border bg-bg-subtle p-4 text-fg", className)}>
      <Icon name={icon} size={24} className="text-navy-700" />
      <p className="text-small font-medium">{text}</p>
    </div>
  );
}

export { CircleLink, HighlightWord };

// CMS block renderer (plan 10 §6.3). No hooks, no server-only APIs: renders on the public site and inside the editor canvas.
// Rich text is rendered from the allow-listed JSON only (never HTML), external links get rel="noopener nofollow".
type T = BlockText & { text?: string; cite?: string; doc?: RichDoc; label?: string; title?: string; caption?: string; items?: unknown[]; head?: string[]; rows?: string[][]; copy?: Record<string, string> };

function Inline({ i }: { i: RichInline }) {
  let n: ReactNode = i.text;
  if (i.marks?.includes("bold")) n = <strong>{n}</strong>;
  if (i.marks?.includes("italic")) n = <em>{n}</em>;
  const h = safeHref(i.href);
  return h ? <a href={h.href} className="underline underline-offset-4" {...(h.external && { rel: "noopener nofollow", target: "_blank" })}>{n}</a> : <>{n}</>;
}
export function RichText({ doc }: { doc?: RichDoc }) {
  return (
    <div className="grid gap-3 text-body">
      {(doc?.content ?? []).map((n, k) => n.type === "paragraph"
        ? <p key={k}>{(n.content ?? []).map((i, j) => <Inline key={j} i={i} />)}</p>
        : n.type === "ordered_list"
          ? <ol key={k} className="list-decimal pl-6">{n.items.map((it, j) => <li key={j}>{it.map((i, x) => <Inline key={x} i={i} />)}</li>)}</ol>
          : <ul key={k} className="list-disc pl-6">{n.items.map((it, j) => <li key={j}>{it.map((i, x) => <Inline key={x} i={i} />)}</li>)}</ul>)}
    </div>
  );
}

const strs = (x?: unknown[]) => (x ?? []).map((i) => (typeof i === "string" ? i : String((i as { title?: string }).title ?? "")));

/** `assetUrl` resolves media ids (the editor passes its media cache; public pages pass the store lookup). */
export function BlockRenderer({ blocks, variant, assetUrl, slot }: {
  blocks: BlockShape[]; variant: CmsVariant; assetUrl?: (id: string) => { url: string; alt?: string } | undefined;
  /** Render hook for blocks that need app islands (form, service cards, home.* sections). */
  slot?: (b: BlockShape, t: T) => ReactNode;
}) {
  return (
    <div className="grid gap-8" lang={variant.language}>
      {blocks.filter((b) => !b.hidden).map((b) => {
        const t = (variant.body[b.id] ?? {}) as T;
        const p = b.props ?? {};
        const custom = slot?.(b, t);
        if (custom !== undefined) return <div key={b.id}>{custom}</div>;
        switch (b.type) {
          case "heading": return p.level === 3 ? <h3 key={b.id} className="text-h4">{t.text}</h3> : <h2 key={b.id} className="text-h3">{t.text}</h2>;
          case "rich_text": return <RichText key={b.id} doc={t.doc} />;
          case "callout": return <p key={b.id} className={`flex gap-3 border-l-4 p-5 text-body text-fg ${p.tone === "warn" ? "border-warning bg-warning-bg" : "border-info bg-info-bg"}`}><Icon name="sparkle" size={18} className="mt-1 shrink-0" aria-hidden />{t.text}</p>;
          case "tip": return <p key={b.id} className="flex gap-3 border-l-4 border-gold-400 bg-gold-50 p-5 text-body text-fg"><Star className="mt-1 size-4 shrink-0 text-gold-600" />{t.text}</p>;
          case "quote": return <blockquote key={b.id} className="border-l-4 border-rule pl-5 text-lead text-fg-heading">“{t.text}”{t.cite && <footer className="mt-2 text-small text-fg-muted">— {t.cite}</footer>}</blockquote>;
          case "requirements": return <ul key={b.id} className="grid gap-2">{strs(t.items).map((r, i) => <li key={i} className="flex gap-3"><Icon name="fileCheck" size={20} className="mt-0.5 shrink-0 text-navy-700" aria-hidden />{r}</li>)}</ul>;
          case "steps": return <ol key={b.id} className="grid gap-3">{strs(t.items).map((s, i) => <li key={i} className="flex items-center gap-3"><span className="flex size-7 shrink-0 items-center justify-center bg-navy-700 text-small font-medium text-white">{i + 1}</span>{s}</li>)}</ol>;
          case "stats": return <dl key={b.id} className="grid grid-cols-2 gap-4 md:grid-cols-4">{((t.items ?? []) as { value: string; label: string }[]).map((s, i) => <div key={i} className="border border-border bg-surface p-5"><dt className="text-small text-fg-muted">{s.label}</dt><dd className="text-h3 tabular text-fg-heading">{s.value}</dd></div>)}</dl>;
          case "table": return (
            <div key={b.id} tabIndex={0} role="region" aria-label={t.caption ?? "Table"} className="overflow-x-auto border border-border bg-surface">
              <table className="w-full min-w-[30rem] text-left text-body"><thead className="bg-ink-100 text-small text-ink-700"><tr>{(t.head ?? []).map((h, i) => <th key={i} scope="col" className="p-3">{h}</th>)}</tr></thead>
                <tbody>{(t.rows ?? []).map((r, i) => <tr key={i} className="border-t border-border">{r.map((c, j) => <td key={j} className="p-3">{c}</td>)}</tr>)}</tbody></table>
            </div>
          );
          case "image": {
            const a = typeof p.assetId === "string" ? assetUrl?.(p.assetId) : undefined;
            // eslint-disable-next-line @next/next/no-img-element -- CMS media URLs are arbitrary (data:/R2), not next/image domains
            return a ? <figure key={b.id}><img src={a.url} alt={a.alt ?? ""} className="w-full" loading="lazy" />{t.caption && <figcaption className="mt-2 text-small text-fg-muted">{t.caption}</figcaption>}</figure> : null;
          }
          case "gallery": return <div key={b.id} className="grid grid-cols-2 gap-3 md:grid-cols-3">{((p.assetIds as string[]) ?? []).map((id) => assetUrl?.(id)).filter(Boolean).map((a, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={a!.url} alt={a!.alt ?? ""} className="aspect-square w-full object-cover" loading="lazy" />))}</div>;
          case "video": {
            const id = youtubeId(p.videoId);
            return id ? <iframe key={b.id} title={t.title ?? "Video"} src={`https://www.youtube-nocookie.com/embed/${id}`} className="aspect-video w-full" allowFullScreen loading="lazy" /> : null;
          }
          case "cta": {
            const h = safeHref(typeof p.href === "string" ? p.href : undefined);
            return h ? <a key={b.id} href={h.href} className={`inline-flex h-12 w-fit items-center px-6 text-button transition-colors m-press ${p.variant === "secondary" ? "border-[1.5px] border-secondary text-secondary hover:bg-navy-50" : "bg-secondary text-on-secondary hover:bg-secondary-hover"}`}>{t.label}</a> : null;
          }
          case "divider": return <hr key={b.id} className="border-border" />;
          default: return null; // form, service_cards, faq_list, contact, testimonial, home.* need app islands → `slot`
        }
      })}
    </div>
  );
}

/** Shared editorial hero for L-C pages (eyebrow tag + display title with highlighted word). */
export function TrackHero({ c, children }: { c: LcCopy["track"]; children: ReactNode }) {
  return (
    <section className="relative overflow-hidden px-gutter pt-[var(--spacing-hero-top)] pb-[var(--spacing-section-sm)]">
      <GridLines />
      <div className="relative mx-auto flex max-w-2xl flex-col items-center text-center">
        <Tag variant="navy" className="gap-2"><Star className="size-3 text-gold-600" />{c.eyebrow}</Tag>
        <h1 className="mt-6 text-display text-fg-heading">{c.title1} <HighlightWord>{c.titleHl}</HighlightWord></h1>
        <p className="mt-4 mb-8 text-lead text-fg-muted">{c.sub}</p>
        <div className="w-full">{children}</div>
      </div>
    </section>
  );
}

export const DIRECTIONS_URL =
  "https://www.google.com/maps/search/?api=1&query=HEBUZA%20Kigali%20Rwanda";

/** Static map card (no embed, no third-party request): drawn streets + pin. shortcut: swap for a real static map image once the address is confirmed. */
export function MapArt({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cx(
        "relative overflow-hidden border border-border bg-ink-50",
        className,
      )}
    >
      <svg
        aria-hidden
        viewBox="0 0 400 240"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full text-white"
      >
        <path
          d="M-10 170 C80 150 140 190 220 160 S360 110 420 130"
          className="stroke-sky-200"
          strokeWidth="26"
          fill="none"
        />
        <g stroke="currentColor" fill="none" strokeLinecap="round">
          <path d="M-10 60 L420 110" strokeWidth="9" />
          <path d="M120 -10 L180 260" strokeWidth="7" />
          <path d="M300 -10 L250 260" strokeWidth="9" />
          <path d="M-10 200 L420 180" strokeWidth="5" />
          <path d="M40 -10 L90 260" strokeWidth="3" />
          <path d="M360 -10 L390 260" strokeWidth="3" />
          <path d="M-10 130 C100 120 200 140 420 60" strokeWidth="4" />
        </g>
        <circle cx="70" cy="40" r="26" className="fill-sky-100" />
        <circle cx="330" cy="200" r="34" className="fill-sky-100" />
      </svg>
      <span
        aria-hidden
        className="absolute top-[52%] left-[64%] flex -translate-x-1/2 -translate-y-full flex-col items-center"
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-navy-700 text-white shadow-lg" data-round>
          <Icon name="mapPin" size={20} />
        </span>
        <span className="h-3 w-0.5 bg-navy-700" />
      </span>
      <span
        aria-hidden
        className="absolute bottom-4 left-1/3 font-display text-h3 text-navy-700/70"
      >
        Kigali
      </span>
      {children}
    </div>
  );
}

/** Tilted, framed team portraits (08 v2). Renders only consented profiles (F-WRK-04); returns null when there are none. */
export function TeamGrid({ locale }: { locale: Locale }) {
  const team = TEAM.filter((m) => m.consented);
  if (!team.length) return null;
  const tilt = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2"];
  return (
    <Reveal
      as="ul"
      preset="fly-tilt-r"
      each
      className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
    >
      {team.map((m, i) => (
        <li
          key={m.slug}
          className={cx(
            "bg-navy-700 p-1.5 shadow-lg",
            tilt[i % 4],
          )}
        >
          <div className="relative aspect-[4/5] overflow-hidden bg-navy-900">
            <Image
              src={m.photo}
              alt=""
              fill
              sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 90vw"
              className="object-cover"
            />
          </div>
          <div className="px-3 py-3 text-white">
            <p className="text-label">{m.name}</p>
            <p className="text-small text-white/65">{m.role[locale]}</p>
          </div>
        </li>
      ))}
    </Reveal>
  );
}
