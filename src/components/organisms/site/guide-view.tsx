"use client";
import { Icon } from "@/components/atoms/icon";
import { Callout, RichLine, StepNumber } from "@/components/atoms/guide";
import { AnnotatedShot } from "@/components/molecules/site/annotated-shot";
import { FactsBox } from "@/components/molecules/site/guide";
import { GuideWalkthrough } from "@/components/organisms/site/guide-walkthrough";
import type { ResolvedGuide } from "@/content/guides/workspaces";
import type { GuidesCopy } from "@/content/guides/copy";
import { cx } from "@/shared/format";

const fill = (s: string, v: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));

/**
 * A dashboard guide inside the workspace shell (no left "On this page" rail: the side menu already uses that space).
 * `compact` = the "?" panel: tighter type, section links hidden, screenshots full panel width.
 */
export function GuideView({
  g,
  copy,
  compact,
}: {
  g: ResolvedGuide;
  copy: GuidesCopy;
  compact?: boolean;
}) {
  const steps = g.sections.flatMap((s) =>
    (s.steps ?? []).map((st) => ({ ...st, section: s.title })),
  );
  const shots = Object.fromEntries(steps.map((st, i) => [`s${i}`, st.shot]));
  const walk = steps.map((st, i) => ({
    text: st.text,
    caption: st.caption,
    marks: st.marks,
    section: st.section,
    shot: st.shot ? `s${i}` : undefined,
  }));
  const first = Object.fromEntries(
    g.sections.map((s, i) => [
      s.id,
      g.sections.slice(0, i).reduce((a, x) => a + (x.steps?.length ?? 0), 0),
    ]),
  );
  return (
    <article
      className={cx(
        "grid content-start",
        compact ? "gap-6" : "max-w-3xl gap-8",
      )}
    >
      <header
        className={cx(
          "grid gap-3 border-b border-border",
          compact ? "pb-5" : "pb-7",
        )}
      >
        <p className="text-eyebrow text-fg-subtle uppercase">{g.catLabel}</p>
        <h2
          className={cx(
            "leading-tight tracking-[-0.02em] text-fg-heading",
            compact ? "text-h3" : "text-[clamp(1.75rem,1.4rem+1.2vw,2.5rem)]",
          )}
        >
          {g.title}
        </h2>
        <p
          className={cx("text-fg-muted", compact ? "text-small" : "text-lead")}
        >
          {g.summary}
        </p>
        <p className="flex items-center gap-1.5 text-small text-fg-subtle">
          <Icon name="clock" size={15} />
          {fill(copy.read, { n: g.minutes })}
        </p>
        {!compact && g.sections.length > 1 && (
          <nav
            aria-label={copy.onThisPage}
            className="flex flex-wrap gap-2 pt-1"
          >
            {g.sections.map((s) => (
              <a
                key={s.id}
                href={`#${g.slug}-${s.id}`}
                className="border border-border bg-white px-3 py-1.5 text-small text-navy-900 hover:border-navy-300 hover:bg-sky-50"
              >
                {s.title}
              </a>
            ))}
          </nav>
        )}
        {walk.length > 1 && (
          <div className="pt-1">
            <GuideWalkthrough
              title={g.title}
              steps={walk}
              shots={shots}
              copy={{
                walk: copy.walk,
                walkStep: copy.walkStep,
                close: copy.close,
                prev: copy.prev,
                next: copy.next,
                zoom: copy.zoom,
              }}
            />
          </div>
        )}
      </header>

      {g.facts && <FactsBox facts={g.facts} labels={copy.facts} compact={compact} />}

      {g.sections.map((s) => (
        <section
          key={s.id}
          id={`${g.slug}-${s.id}`}
          className="grid scroll-mt-24 gap-5"
        >
          <h3
            className={cx(
              "text-fg-heading",
              compact ? "text-label-lg" : "text-h3",
            )}
          >
            {s.title}
          </h3>
          {s.intro && <p className="text-body text-ink-800">{s.intro}</p>}
          {s.steps && (
            <ol className={cx("grid", compact ? "gap-6" : "gap-8")}>
              {s.steps.map((st, k) => {
                const n = first[s.id] + k + 1;
                return (
                  <li key={n} className="grid gap-4">
                    <p
                      className={cx(
                        "flex items-start gap-3 text-ink-800",
                        compact ? "text-small" : "text-body",
                      )}
                    >
                      <StepNumber n={n} className={compact ? "size-7" : ""} />
                      <span className="pt-1">
                        <RichLine text={st.text} />
                      </span>
                    </p>
                    {st.shot && (
                      <div className={compact ? "" : "sm:pl-11"}>
                        <AnnotatedShot
                          src={st.shot.src}
                          alt={st.caption ?? st.text.replace(/\*\*/g, "")}
                          shot={st.shot}
                          labels={st.marks ?? []}
                          caption={st.caption}
                          zoomLabel={copy.zoom}
                          closeLabel={copy.close}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
          {s.tips && s.tips.length > 0 && (
            <Callout kind="tip" title={copy.tip}>
              <ul className="grid gap-1.5">
                {s.tips.map((x) => (
                  <li key={x} className="flex gap-2">
                    <Icon
                      name="check"
                      size={16}
                      className="mt-1 shrink-0 text-navy-700"
                    />
                    {x}
                  </li>
                ))}
              </ul>
            </Callout>
          )}
          {s.warn && (
            <Callout kind="warn" title={copy.warn}>
              {s.warn}
            </Callout>
          )}
          {s.faq && s.faq.length > 0 && (
            <div className="divide-y divide-border border border-border bg-white">
              {s.faq.map((f) => (
                <details key={f.q} className="group px-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3.5 text-label [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <Icon
                      name="plus"
                      size={16}
                      className="shrink-0 transition-transform group-open:rotate-45"
                    />
                  </summary>
                  <p className="pb-4 text-small text-fg-muted">{f.a}</p>
                </details>
              ))}
            </div>
          )}
        </section>
      ))}
    </article>
  );
}
