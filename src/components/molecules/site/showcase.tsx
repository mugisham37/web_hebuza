import Image from "next/image";
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

/** One hero slide: the photo carries it; a small, quiet caption (category + service, linked) sits bottom-left. No buttons. */
export function PosterSlide({
  slide,
  active,
  priority,
  label,
}: {
  slide: ShowSlide;
  active: boolean;
  priority?: boolean;
  label: string;
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
        sizes="(min-width: 1024px) 60vw, 100vw"
        className={cx(
          "object-cover transition-transform duration-[6000ms] ease-linear motion-reduce:transition-none",
          active ? "scale-100" : "scale-105",
        )}
      />
      {/* Light wash only along the bottom, enough for the small caption to clear 4.5:1. */}
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-2/5 bg-linear-to-t from-navy-950/85 to-transparent" />
      <a href={slide.href} className="absolute bottom-14 left-6 flex max-w-xs flex-col gap-1 text-white sm:left-8 lg:left-10">
        <span className="text-eyebrow tracking-[0.12em] text-white/70 uppercase">{slide.family}</span>
        <span className="text-label-lg font-medium underline-offset-4 hover:underline">{slide.title}</span>
      </a>
    </div>
  );
}
