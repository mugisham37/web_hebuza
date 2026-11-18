"use client";
// Records the visitor's touch on landing and hands it to forms (lead, booking, contact, signup).
import { ATTR_COOKIE, classify, nextAttribution, persistTarget, type Attribution } from "./attribution";
import { parseConsent } from "@/components/organisms/site/cookie-consent";

const KEY = "hebuza_attr";
const cookie = (n: string) => document.cookie.match(new RegExp(`(?:^|; )${n}=([^;]*)`))?.[1];
const consent = () => parseConsent(cookie("hebuza_consent"));

export function readAttribution(): Attribution {
  try {
    const raw = (consent()?.analytics && cookie(ATTR_COOKIE) && decodeURIComponent(cookie(ATTR_COOKIE)!)) || sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Attribution) : {};
  } catch { return {}; }
}
/** Call once per page view (AttributionCapture does). */
export function captureTouch() {
  try {
    const a = nextAttribution(readAttribution(), classify(new URL(location.href), document.referrer, location.hostname));
    const json = JSON.stringify(a);
    if (persistTarget(consent()) === "cookie") document.cookie = `${ATTR_COOKIE}=${encodeURIComponent(json)}; path=/; max-age=${90 * 86400}; samesite=lax`;
    sessionStorage.setItem(KEY, json);
  } catch { /* storage blocked: forms simply carry no attribution */ }
}
