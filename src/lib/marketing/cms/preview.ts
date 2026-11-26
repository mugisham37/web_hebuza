export const PREVIEW_COOKIE = "cms_preview";
/** Public path for a previewed entry (mirrors the API's publicPath). */
export function previewPath(e: { type: string; key: string; variants: Record<string, { slug: string } | undefined> }, l: "rw" | "en" | "fr") {
  const slug = e.variants[l]?.slug ?? e.key;
  if (e.type === "guide" || e.type === "article") return "/marketing/knowledge"; // no public page: back to the editor list
  if (e.type === "regulatory_update") return `/${l}/updates/${slug}`;
  if (e.type === "landing_page") return `/${l}/campaign/${slug}`;
  if (e.type === "faq") return `/${l}/faq`;
  if (e.type === "team_member") return `/${l}/about/team`;
  if (e.type === "legal_doc") return `/${l}/legal/${e.key}`;
  return e.key === "home" ? `/${l}` : `/${l}/${slug}`;
}
