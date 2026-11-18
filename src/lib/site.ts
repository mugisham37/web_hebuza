/** Public origin (metadataBase, sitemap, canonical). Set per environment; staging must never claim prod. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const IS_PROD = process.env.NEXT_PUBLIC_APP_ENV === "production";
