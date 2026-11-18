"use client";
// U5c crop sheet: 4 corner handles (pointer drag or select + arrow keys), Auto (edge bbox) and Enhance.
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Button } from "@/components/atoms/button";
import { Sheet } from "@/components/atoms/dialog";
import { Switch } from "@/components/atoms/field";
import { cx } from "@/shared/format";
import { useCopyB } from "@/lib/field/copy-b";

export type Box = { x: number; y: number; w: number; h: number };
type Corner = "tl" | "tr" | "bl" | "br";
const CORNERS: Corner[] = ["tl", "tr", "bl", "br"];

export function CropSheet({ file, auto, size, onApply, onClose }: {
  file: File; auto: Box; size: { w: number; h: number }; onApply: (b: Box, enhance: boolean) => void; onClose: () => void;
}) {
  const t = useCopyB().scan;
  const [box, setBox] = useState<Box>(auto);
  const [enhance, setEnhance] = useState(true);
  const [url, setUrl] = useState<string | null>(null);
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<Corner | null>(null);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- object URL must be created/revoked with the effect lifecycle
  useEffect(() => { const u = URL.createObjectURL(file); setUrl(u); return () => URL.revokeObjectURL(u); }, [file]);

  /** Move one corner to (x, y) in source px, keeping a 5% minimum size. */
  function move(c: Corner, x: number, y: number) {
    setBox((b) => {
      const min = Math.round(Math.min(size.w, size.h) * 0.05);
      let x0 = b.x, y0 = b.y, x1 = b.x + b.w, y1 = b.y + b.h;
      x = Math.max(0, Math.min(size.w, x)); y = Math.max(0, Math.min(size.h, y));
      if (c[1] === "l") x0 = Math.min(x, x1 - min); else x1 = Math.max(x, x0 + min);
      if (c[0] === "t") y0 = Math.min(y, y1 - min); else y1 = Math.max(y, y0 + min);
      return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    });
  }
  const pos = (c: Corner) => ({ x: c[1] === "l" ? box.x : box.x + box.w, y: c[0] === "t" ? box.y : box.y + box.h });
  function onPointerMove(e: PointerEvent) {
    if (!drag.current || !frame.current) return;
    const r = frame.current.getBoundingClientRect();
    move(drag.current, ((e.clientX - r.left) / r.width) * size.w, ((e.clientY - r.top) / r.height) * size.h);
  }
  function onKey(c: Corner, e: KeyboardEvent) {
    const step = Math.round(Math.max(size.w, size.h) * (e.shiftKey ? 0.05 : 0.01));
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    const p = pos(c);
    move(c, p.x + d[0], p.y + d[1]);
  }
  const pct = (v: number, of: number) => `${(v / of) * 100}%`;

  return (
    <Sheet side="bottom" open onClose={onClose} title={t.cropTitle} description={t.cropHelp}
      footer={<>
        <Button variant="outline" onClick={() => setBox(auto)}>{t.auto}</Button>
        <Button onClick={() => onApply(box, enhance)}>{t.apply}</Button>
      </>}>
      <div className="grid gap-4">
        <div ref={frame} onPointerMove={onPointerMove} onPointerUp={() => (drag.current = null)} onPointerCancel={() => (drag.current = null)}
          className="relative mx-auto w-full max-w-md touch-none select-none overflow-hidden bg-ink-950" style={{ aspectRatio: `${size.w} / ${size.h}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- local object URL */}
          {url && <img src={url} alt="" draggable={false} className={cx("absolute inset-0 size-full object-fill", enhance && "grayscale contrast-125")} />}
          <span aria-hidden className="absolute border-2 border-gold-400 shadow-[0_0_0_9999px_rgb(9_12_20/0.55)]"
            style={{ left: pct(box.x, size.w), top: pct(box.y, size.h), width: pct(box.w, size.w), height: pct(box.h, size.h) }} />
          {CORNERS.map((c) => {
            const p = pos(c);
            return (
              <button key={c} type="button" aria-label={t.corner[c]} onKeyDown={(e) => onKey(c, e)}
                onPointerDown={(e) => { drag.current = c; (e.currentTarget.parentElement as HTMLElement).setPointerCapture(e.pointerId); }}
                className="absolute size-11 -translate-x-1/2 -translate-y-1/2 focus-visible:outline-2 focus-visible:outline-gold-400"
                style={{ left: pct(p.x, size.w), top: pct(p.y, size.h) }}>
                <span aria-hidden data-round className="absolute inset-3 rounded-full border-2 border-navy-950 bg-gold-400" />
              </button>
            );
          })}
        </div>
        <Switch label={t.enhance} checked={enhance} onChange={(e) => setEnhance(e.target.checked)} />
      </div>
    </Sheet>
  );
}
