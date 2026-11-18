// Plain module so server pages (generateStaticParams) can read it; "use client" exports are client references there.
export const SECTIONS = ["tax", "numbering", "accounts", "policies", "history"] as const;
export type Section = (typeof SECTIONS)[number];
export const isSection = (s: string): s is Section => (SECTIONS as readonly string[]).includes(s);
