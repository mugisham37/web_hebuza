"use client";
// GSAP motion islands translating Landing 1's appear/scroll effects (Project/LANDING-BUILD-PLAN.md §3).
// Content is server-rendered and visible without JS; we only animate FROM offsets, and skip under reduced motion.
import { useRef, type ElementType, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);
gsap.defaults({ ease: "expo.out", duration: 0.9 });

// Scrubbed effects need correct positions: re-measure once streamed content, images and fonts settle.
if (typeof window !== "undefined") {
  const refresh = () => ScrollTrigger.refresh();
  window.addEventListener("load", refresh, { once: true });
  document.fonts?.ready.then(refresh);
}
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Run `play` once when `el` enters the viewport (IntersectionObserver — immune to stale layout measurements). */
function onEnter(el: Element, play: () => void, margin = "0px 0px -12% 0px") {
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { io.disconnect(); play(); }
  }, { rootMargin: margin });
  io.observe(el);
  return () => io.disconnect();
}

const OK = "(prefers-reduced-motion: no-preference)";

export const PRESETS = {
  "rise-sm": { y: 12, autoAlpha: 0 },
  "rise-md": { y: 24, autoAlpha: 0 },
  "rise-lg": { y: 90, autoAlpha: 0, duration: 1.2 },
  "fly-tilt-l": { y: 80, rotate: -5, autoAlpha: 0, duration: 1.2 },
  "fly-tilt-r": { y: 130, rotate: 4, autoAlpha: 0, duration: 1.2 },
  pop: { scale: 0.6, autoAlpha: 0 },
  "card-in": { y: 80, scale: 0.93, autoAlpha: 0.5, duration: 1.2 },
} satisfies Record<string, gsap.TweenVars>;
export type Preset = keyof typeof PRESETS;

/**
 * Reveal children on scroll. Direct children with [data-reveal] (or all direct children when `each`) animate
 * with a stagger; also draws [data-rule] lines, pops [data-pop], counts [data-count].
 */
export function Reveal({ as: As = "div", preset = "rise-md", each, stagger = 0.08, delay = 0, className, children, ...rest }:
  { as?: ElementType; preset?: Preset; each?: boolean; stagger?: number; delay?: number; className?: string; children: ReactNode } & Record<string, unknown>) {
  const ref = useRef<HTMLElement>(null);
  useGSAP(() => {
    const root = ref.current;
    if (!root || reduced()) return;
    {
      // Only this Reveal's own targets — nested Reveals animate theirs (double `from` would leave them hidden).
      const own = <T extends Element>(sel: string) => Array.from(root.querySelectorAll<T>(sel)).filter((el) => el.closest("[data-reveal-root]") === root);
      const targets = each ? Array.from(root.children) : own("[data-reveal]");
      const { duration = 0.9, ...from } = PRESETS[preset] as gsap.TweenVars;
      const main = targets.length ? targets : [root];
      const rules = own("[data-rule]");
      const pops = own("[data-pop]");
      const counts = own<HTMLElement>("[data-count]");
      // Hide now (no flash), animate to rest on enter, then clear inline styles so CSS hovers keep working.
      gsap.set(main, from);
      if (rules.length) gsap.set(rules, { scaleX: 0, transformOrigin: "left center" });
      if (pops.length) gsap.set(pops, PRESETS.pop);
      const play = () => {
        gsap.to(main, { x: 0, y: 0, rotate: 0, scale: 1, autoAlpha: 1, duration, stagger, delay, clearProps: "transform,translate,rotate,scale,opacity,visibility" });
        if (rules.length) gsap.to(rules, { scaleX: 1, duration: 1.1, stagger: 0.1, delay, clearProps: "transform" });
        if (pops.length) gsap.to(pops, { scale: 1, autoAlpha: 1, stagger: 0.08, delay: delay + 0.2, clearProps: "transform,opacity,visibility" });
        counts.forEach((el) => {
          const end = Number(el.dataset.count);
          if (!Number.isFinite(end)) return;
          const o = { v: 0 }; const pad = String(el.dataset.count).length;
          gsap.to(o, { v: end, duration: 1.4, ease: "power2.out", onUpdate: () => { el.textContent = String(Math.round(o.v)).padStart(pad, "0"); } });
        });
      };
      return onEnter(root, play); // useGSAP context reverts sets/tweens on unmount
    }
  }, { scope: ref });
  return <As ref={ref} data-reveal-root="" className={className} {...rest}>{children}</As>;
}

/** Scroll-scrubbed image zoom inside a frame (landing1 media "Image": scale 1.2 → 1). */
export function Parallax({ children, className, strength = 1 }: { children: ReactNode; className?: string; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(OK, () => {
      gsap.fromTo(ref.current, { scale: 1 + 0.15 * strength, yPercent: -4 * strength },
        { scale: 1, yPercent: 4 * strength, ease: "none", scrollTrigger: { trigger: ref.current?.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
    });
    return () => mm.revert();
  }, { scope: ref });
  return <div ref={ref} className={className ?? "absolute inset-0 will-change-transform"}>{children}</div>;
}

/**
 * Hero intro timeline (landing1 appear sequence: eyebrow 0 → title .1 → highlight .35 → faces .5/.6 →
 * copy/actions .5/.65 → visual .45). Mark parts with data-hero="eyebrow|line|copy|actions|visual|card|badge".
 */
export function HeroIntro({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const q = gsap.utils.selector(ref);
    const mm = gsap.matchMedia();
    mm.add(OK, () => {
      const tl = gsap.timeline({ defaults: { ease: "expo.out", duration: 0.9 } });
      tl.from(q('[data-hero="eyebrow"]'), { y: 12, autoAlpha: 0, stagger: 0.1 }, 0)
        .from(q('[data-hero="line"]'), { yPercent: 40, autoAlpha: 0, stagger: 0.08 }, 0.1)
        .from(q("[data-highlight]"), { scaleX: 0, transformOrigin: "left center", duration: 0.7 }, 0.35)
        .from(q("[data-hero-root] [data-pop]"), { scale: 0.6, autoAlpha: 0, stagger: 0.06 }, 0.5)
        .from(q('[data-hero="copy"]'), { y: 18, autoAlpha: 0 }, 0.5)
        .from(q('[data-hero="actions"] > *'), { y: 18, autoAlpha: 0, stagger: 0.08 }, 0.65)
        .from(q('[data-hero="visual"]'), { y: 80, scale: 0.93, autoAlpha: 0.5, duration: 1.2 }, 0.45)
        .from(q('[data-hero="card"]'), { rotate: 0, x: 0, duration: 1.1, stagger: 0.08 }, 0.7)
        .from(q('[data-hero="badge"]'), { scale: 0.7, rotate: -12, autoAlpha: 0 }, 0.9);
    });
    return () => mm.revert();
  }, { scope: ref });
  return <div ref={ref} data-hero-root className={className}>{children}</div>;
}

/** Stacked words light up one by one while scrolling (statement "Register/Comply/Grow/Invest"). */
export function ScrollWords({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(OK, () => {
      const words = ref.current?.querySelectorAll("[data-word]");
      if (!words?.length) return;
      gsap.timeline({ scrollTrigger: { trigger: ref.current, start: "top 75%", end: "bottom 45%", scrub: 0.6 } })
        .from(words, { opacity: 0.25, stagger: 0.5, ease: "none" });
    });
    return () => mm.revert();
  }, { scope: ref });
  return <div ref={ref} className={className}>{children}</div>;
}

/** Footer giant wordmark rises with scroll (landing1 "Wordmark" translateY(60%) → 0). */
export function RiseOnScroll({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add(OK, () => {
      gsap.from(ref.current, { yPercent: 45, ease: "none", scrollTrigger: { trigger: ref.current, start: "top bottom", end: "bottom bottom", scrub: 0.8 } });
    });
    return () => mm.revert();
  }, { scope: ref });
  return <div ref={ref} className={className}>{children}</div>;
}
