"use client";
// Consent-gated tags (F-CRM-10, spec AC "analytics declined → no GA4 request") + first-party touch capture.
import { useEffect } from "react";
import Script from "next/script";
import { useConsent } from "@/components/organisms/site/cookie-consent";
import { captureTouch } from "@/lib/marketing/use-attribution";

const GA4 = process.env.NEXT_PUBLIC_GA4_ID; // set from /marketing/seo once the tracking settings API serves it
const PIXEL = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export function ConsentGatedTags() {
  const c = useConsent();
  useEffect(() => { captureTouch(); }, [c?.analytics]); // re-run after consent so the touch moves to the 90-day cookie
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
