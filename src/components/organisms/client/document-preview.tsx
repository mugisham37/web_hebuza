"use client";
import { Dialog } from "@/components/atoms/dialog";
import { buttonClass } from "@/components/atoms/button";
import { useI18n } from "@/lib/i18n/provider";
import { c3Copy } from "@/content/pages/c3";

/** File preview (C10 v3 / C09 DL2). Images inline, PDFs in the browser's viewer; `watermark` overlays locked previews. */
export function PreviewDialog({
  file,
  onClose,
}: {
  file: {
    name: string;
    mime: string;
    src: string;
    downloadHref?: string;
    watermark?: string;
  } | null;
  onClose: () => void;
}) {
  const { locale } = useI18n();
  const c = c3Copy(locale).common;
  const noPreview = c3Copy(locale).docs.noPreview;
  const isImg = file?.mime.startsWith("image/");
  const isPdf = file?.mime === "application/pdf";
  return (
    <Dialog
      open={!!file}
      onClose={onClose}
      title={file?.name ?? ""}
      className="max-w-3xl"
      footer={
        file?.downloadHref && (
          <a href={file.downloadHref} download className={buttonClass({})}>{c.download}</a>
        )
      }
    >
      {file && (
        <div className="relative overflow-hidden bg-navy-900">
          {isImg ? (
            // eslint-disable-next-line @next/next/no-img-element -- presigned, short-lived blob; next/image can't optimise it
            <img
              src={file.src}
              alt={file.name}
              className="mx-auto max-h-[70dvh] w-auto select-none"
              draggable={false}
            />
          ) : isPdf ? (
            <iframe
              src={file.src}
              title={file.name}
              className="h-[70dvh] w-full bg-surface"
            />
          ) : (
            <p className="p-8 text-center text-on-navy">{noPreview}</p>
          )}
          {file.watermark && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden"
            >
              <span className="-rotate-30 text-h3 font-medium whitespace-nowrap text-ink-900/25">
                {file.watermark}
              </span>
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}
