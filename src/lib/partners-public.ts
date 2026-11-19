import "server-only";
import { cacheTag } from "next/cache";
import { publicGet } from "@/lib/public-api";

export type PublicPartner = { id: string; name: string; logoUrl: string | null; website: string | null };

/** PRT-13: partners flagged shown_on_website (active only) for the home strip. */
export async function getPublicPartners(): Promise<PublicPartner[]> {
  "use cache";
  cacheTag("partners");
  // Partner edits send cms.revalidate {tags:["partners"]} from the API.
  return (await publicGet<{ items: PublicPartner[] }>("/public/partners", { items: [] }))?.items ?? [];
}
