import Image from "next/image";
import { cx } from "@/shared/format";

/**
 * One organisation tile (white, 176 × 128px). Hover: the tile turns navy and lifts, and the logo becomes a white
 * silhouette (the original see-through look). `caption` names look-alike seals (MoH / MINICOM / RFA share the arms).
 */
export function LogoTile({ name, short, logo, caption }: { name: string; short: string; logo?: string; flat?: boolean; caption?: string }) {
  return (
    <span title={name}
      className={cx("group/tile flex h-32 w-44 shrink-0 items-center justify-center gap-2.5 border border-sky-300 bg-white px-4 transition-[background-color,border-color,transform,box-shadow] duration-200 motion-reduce:transition-none",
        caption && "flex-col gap-1.5 text-center", "hover:-translate-y-0.5 hover:border-navy-700 hover:bg-navy-700 hover:shadow-lg")}>
      {logo ? (
        <>
          <Image src={logo.startsWith("http") ? logo : `/hebuza/institutions/${logo}`} alt="" width={152} height={88} unoptimized={logo.startsWith("http")}
            className={cx("h-auto max-h-22 w-auto object-contain", caption ? "max-h-16 max-w-20" : "max-w-full", "transition-[filter,opacity] duration-200 group-hover/tile:opacity-95 group-hover/tile:brightness-0 group-hover/tile:invert motion-reduce:transition-none")} />
          {caption && <span className="min-w-0 text-eyebrow leading-tight font-semibold text-navy-800 transition-colors group-hover/tile:text-white">{caption}</span>}
        </>
      ) : (
        <span className={"text-small font-semibold tracking-wide text-navy-700 transition-colors group-hover/tile:text-white"}>{short}</span>
      )}
      <span className="sr-only">{name}</span>
    </span>
  );
}
