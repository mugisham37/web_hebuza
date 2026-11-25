"use client";
import { useRef, useState, type DragEvent } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { cx } from "@/shared/format";
import { buttonClass } from "@/components/atoms/button";

type Props = {
  onFiles: (files: File[]) => void;
  accept?: string;          // e.g. "application/pdf,image/*"
  maxSizeMb?: number;       // DLV/DOC default 25
  multiple?: boolean;
  camera?: boolean;         // show "take a photo" (phone-first uploads)
  disabled?: boolean;
  id?: string;
};

/** Drag-and-drop + picker + camera capture. Validates size/type client-side; the server re-validates and scans (F-SEC-03). */
export function FileDrop({ onFiles, accept, maxSizeMb = 25, multiple, camera, disabled, id }: Props) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const cam = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function accepted(file: File) {
    if (!accept) return true;
    return accept.split(",").some((rule) => {
      const r = rule.trim();
      return r.endsWith("/*") ? file.type.startsWith(r.slice(0, -1)) : r.startsWith(".") ? file.name.toLowerCase().endsWith(r) : file.type === r;
    });
  }
  function take(list: FileList | null) {
    if (!list?.length) return;
    const files = [...list];
    if (files.some((f) => f.size > maxSizeMb * 1024 * 1024)) return setError(t("upload.tooLarge", { size: maxSizeMb }));
    if (files.some((f) => !accepted(f))) return setError(t("upload.badType"));
    setError(null);
    onFiles(files);
  }
  const drop = (e: DragEvent) => { e.preventDefault(); setOver(false); if (!disabled) take(e.dataTransfer.files); };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={drop}
        className={cx("flex flex-col items-center gap-3 rounded-none border-2 border-dashed p-6 text-center transition-colors", over ? "border-gold-400 bg-gold-50" : "border-sky-300 bg-sky-50", disabled && "opacity-50")}
      >
        <svg aria-hidden viewBox="0 0 24 24" className="size-8 text-sky-600" fill="none" stroke="currentColor" strokeWidth={1.75}><path d="M12 16V4M7 9l5-5 5 5M4 15v5h16v-5" /></svg>
        <p className="text-body text-fg">{t("upload.drop")}</p>
        <p className="text-small text-fg-subtle">{t("upload.maxSize", { size: maxSizeMb })}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <button type="button" disabled={disabled} onClick={() => input.current?.click()} className={buttonClass({ variant: "secondary", size: "sm" })}>{t("upload.choose")}</button>
          {camera && <button type="button" disabled={disabled} onClick={() => cam.current?.click()} className={buttonClass({ variant: "outline", size: "sm" })}>{t("upload.camera")}</button>}
        </div>
        <input ref={input} id={id} type="file" hidden accept={accept} multiple={multiple} onChange={(e) => { take(e.target.files); e.target.value = ""; }} />
        {camera && <input ref={cam} type="file" hidden accept="image/*" capture="environment" onChange={(e) => { take(e.target.files); e.target.value = ""; }} />}
      </div>
      {error && <p role="alert" className="mt-2 flex items-center gap-1.5 text-small font-medium text-danger"><span aria-hidden>⚠</span>{error}</p>}
    </div>
  );
}
