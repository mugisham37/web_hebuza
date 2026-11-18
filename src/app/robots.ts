import type { MetadataRoute } from "next";
import { SITE_URL, IS_PROD } from "@/lib/site";

const PRIVATE = ["/api/", "/*/dashboard", "/*/requests", "/*/documents", "/*/billing", "/*/settings", "/*/agent", "/*/work", "/*/ops", "/*/finance", "/*/marketing", "/*/procurement", "/*/partners", "/*/exec", "/*/system", "/*/design", "/*/pay", "/*/track/"];

export default function robots(): MetadataRoute.Robots {
  // Staging/preview must never be indexed (F-OPS-12).
  if (!IS_PROD) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: PRIVATE }, sitemap: `${SITE_URL}/sitemap.xml` };
}
