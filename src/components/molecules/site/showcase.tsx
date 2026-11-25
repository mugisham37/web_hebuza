import Image from "next/image";
import { ButtonLink } from "@/components/atoms/button";
import { cx } from "@/shared/format";

export type ShowSlide = {
  key: string;
  img: string;
  alt: string;
  family: string;
  title: string;
  summary: string;
  href: string;
};
export type ShowCat = {
  slug: string;
  name: string;
  /** short label for the category menu */
  short: string;
  href: string;
  slides: ShowSlide[];
};

/** One advert on the hero poster: photo, navy wash for legibility, category, service, summary, two actions (prices live on the service pages). */
export function PosterSlide({
  slide,
  active,
  priority,
  label,
  applyLabel,
  allLabel,
  allHref,
}: {
  slide: ShowSlide;
  active: boolean;
  priority?: boolean;
  label: string;
  applyLabel: string;
  allLabel: string;
  allHref: string;
}) {
  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={label}
      aria-hidden={!active}
      inert={!active}
      className={cx(
        "absolute inset-0 transition-opacity duration-700 ease-(--ease-out-expo) motion-reduce:transition-none",
        active ? "z-10 opacity-100" : "z-0 opacity-0",
      )}
    >
      <Image
        src={slide.img}
        alt={slide.alt}
        fill
        priority={priority}
        sizes="(min-width: 1024px) 70vw, 100vw"
        className={cx(
          "object-cover transition-transform duration-[6000ms] ease-linear motion-reduce:transition-none",
          active ? "scale-100" : "scale-105",
        )}
      />
      {/* Wash: dark on the text side (left on desktop, bottom on phones) so white type clears 4.5:1 over any photo. */}
      <span
        aria-hidden
        className="absolute inset-0 bg-linear-to-t from-navy-950 via-navy-950/75 to-navy-950/10 lg:bg-linear-to-r lg:from-navy-950/95 lg:via-navy-950/70 lg:to-transparent"
      />
      <div className="relative flex h-full max-w-xl flex-col justify-end gap-4 p-6 pb-24 text-white sm:p-8 sm:pb-24 lg:justify-center lg:p-12 lg:pb-12">
        <span className="w-fit border border-white/30 px-2.5 py-1 text-eyebrow tracking-[0.12em] uppercase">
          {slide.family}
        </span>
        <h2 className="text-[clamp(1.75rem,1.2rem+2.2vw,3.25rem)] leading-[1.05] font-semibold tracking-[-0.03em] text-balance">
          {slide.title}
        </h2>
        {slide.summary && (
          <p className="line-clamp-2 max-w-md text-body text-white/90">
            {slide.summary}
          </p>
        )}
        <div className="mt-1 flex flex-wrap gap-3">
          <ButtonLink href={slide.href} variant="primary" dots>
            {applyLabel}
          </ButtonLink>
          <ButtonLink href={allHref} variant="outline-dark">
            {allLabel}
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
