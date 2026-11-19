"use client";
// Consent-gated tags (F-CRM-10, spec AC "analytics declined → no GA4 request") + first-party touch capture.
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { useConsent } from "@/components/organisms/site/cookie-consent";
import { captureTouch } from "@/lib/marketing/use-attribution";

const GA4 = process.env.NEXT_PUBLIC_GA4_ID; // set from /marketing/seo once the tracking settings API serves it
const PIXEL = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export function ConsentGatedTags() {
  const c = useConsent();
  const path = usePathname();
  useEffect(() => { captureTouch(); }, [c?.analytics]); // re-run after consent so the touch moves to the 90-day cookie
  // F-CRM-16 first-party page views, only with analytics consent; anonymous id, no query string.
  useEffect(() => {
    if (!c?.analytics || !path) return;
    let id = "";
    try { id = localStorage.getItem("hbz_vid") ?? ""; if (!id) { id = crypto.randomUUID().replace(/-/g, ""); localStorage.setItem("hbz_vid", id); } } catch { /* storage blocked: send without id */ }
    const locale = path.split("/")[1];
    const body = JSON.stringify({ name: "page_view", path, ...(["rw", "en", "fr"].includes(locale) && { locale }), ...(id && { visitor: id }), ...(document.referrer && { referrer: document.referrer }) });
    if (!navigator.sendBeacon?.("/api/events", new Blob([body], { type: "application/json" })))
      void fetch("/api/events", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => null);
  }, [path, c?.analytics]);
  return (
    <>
      {c?.analytics && GA4 && /^G-[A-Z0-9]+$/.test(GA4) && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA4}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('consent','default',{analytics_storage:'granted',ad_storage:'${c.marketing ? "granted" : "denied"}'});gtag('js',new Date());gtag('config','${GA4}',{anonymize_ip:true});`}</Script>
        </>
      )}
      {c?.marketing && PIXEL && /^\d+$/.test(PIXEL) && (
        <Script id="meta-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${PIXEL}');fbq('track','PageView');`}</Script>
      )}
    </>
  );
}
