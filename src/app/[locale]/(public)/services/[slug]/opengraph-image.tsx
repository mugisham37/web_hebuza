import { ImageResponse } from "next/og";
import { getService } from "@/lib/catalogue";
import { locales, type Locale } from "@/shared/i18n/config";

// Share card for a service page (catalogue reads are "use cache", so this renders from the cached catalogue).
export const alt = "HEBUZA service";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const l = (locales as readonly string[]).includes(locale) ? (locale as Locale) : "rw";
  const s = await getService(slug, l);
  const fee = s?.fromFee != null ? `From ${s.fromFee.toLocaleString("en")} RWF` : "";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#1d2b7e", color: "#ffffff", borderTop: "12px solid #f8b718" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 36, fontWeight: 700 }}><div style={{ width: 48, height: 6, background: "#f8b718" }} />HEBUZA</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.05 }}>{s?.name ?? slug}</div>
          {s?.summary ? <div style={{ fontSize: 32, color: "#c7d7fd" }}>{s.summary.slice(0, 140)}</div> : null}
        </div>
        <div style={{ fontSize: 32, color: "#f8b718" }}>{fee}</div>
      </div>
    ),
    size,
  );
}
