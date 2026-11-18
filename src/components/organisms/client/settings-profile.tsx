"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "@/lib/api/client";
import { putPresigned } from "@/lib/api/upload";
import { qk } from "@/lib/query/client";
import { useSession } from "@/lib/auth/session";
import {
  LOCALE_COOKIE,
  localHref,
  localeNames,
  locales,
  stripLocale,
  type Locale,
} from "@/shared/i18n/config";
import { Button } from "@/components/atoms/button";
import { Field, Input, Select, ErrorSummary } from "@/components/atoms/field";
import { Badge } from "@/components/atoms/tag";
import { Skeleton } from "@/components/atoms/feedback";
import { useToast } from "@/components/atoms/toast";
import { PhoneInput, toE164 } from "@/components/atoms/inputs";
import { Panel, useC4 } from "@/components/molecules/client/client";

/** C13 Profile (PATCH /api/me/profile) + language (cookie + locale route; F-IAM language pref). */
export function ProfileSettings() {
  const { c, locale } = useC4();
  const p = c.settings.profile;
  const { user, status } = useSession();
  const qc = useQueryClient();
  const toast = useToast();
  const router = useRouter();
  const path = usePathname();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name") ?? "").trim();
    const rawPhone = String(f.get("phone") ?? "").trim();
    const phone = rawPhone ? toE164(rawPhone) : null;
    const errs: Record<string, string> = {};
    if (!name) errs.name = c.required;
    if (rawPhone && !phone) errs.phone = p.badPhone;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setPending(true);
    try {
      await unwrap(api.PATCH("/api/me/profile", { body: { name, phone } }));
      await qc.invalidateQueries({ queryKey: qk.session });
      toast({ title: c.saved, tone: "success" });
    } catch {
      toast({ title: c.generic, tone: "danger" });
    } finally {
      setPending(false);
    }
  }

  function setLanguage(l: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    router.replace(localHref(l, stripLocale(path)));
  }

  const errList = Object.entries(errors).map(([field, message]) => ({
    field,
    message,
  }));
  return (
    <div className="grid gap-5">
      <PhotoPanel />
      <Panel icon="user" title={p.title} body={p.lede}>
        {status === "loading" ? (
          <div className="grid gap-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : (
          <form
            noValidate
            onSubmit={onSubmit}
            className="grid gap-5 md:grid-cols-2"
          >
            <div className="md:col-span-2">
              <ErrorSummary title={c.fixErrors} errors={errList} />
            </div>
            <Field id="name" label={p.name} error={errors.name}>
              {({ id, describedBy, invalid }) => (
                <Input id={id}
                  name="name"
                  autoComplete="name"
                  defaultValue={user?.name ?? ""}
                  aria-describedby={describedBy}
                  aria-invalid={invalid || undefined}
                />
              )}
            </Field>
            <Field id="phone" label={p.phone} hint={p.phoneHint} error={errors.phone}>
              {({ id, describedBy, invalid }) => (
                <PhoneInput id={id}
                  name="phone"
                  defaultValue={user?.phone?.replace(/^\+250/, "") ?? ""}
                  aria-describedby={describedBy}
                  aria-invalid={invalid || undefined}
                />
              )}
            </Field>
            <Field label={p.email} hint={p.emailHint} className="md:col-span-2">
              {({ id, describedBy }) => (
                <div className="flex flex-wrap items-center gap-3">
                  <Input
                    id={id}
                    value={user?.email ?? ""}
                    readOnly
                    disabled
                    aria-describedby={describedBy}
                    className="flex-1 basis-56"
                  />
                  <Badge tone={user?.emailVerified ? "success" : "warning"}>
                    {user?.emailVerified ? p.verified : p.unverified}
                  </Badge>
                </div>
              )}
            </Field>
            <div className="md:col-span-2">
              <Button type="submit" dots loading={pending}>
                {p.save}
              </Button>
            </div>
          </form>
        )}
      </Panel>
      <Panel
        icon="globe"
        title={c.settings.language.title}
        body={c.settings.language.lede}
      >
        <Field label={c.settings.language.label} className="max-w-sm">
          {({ id }) => (
            <Select
              id={id}
              value={locale}
              onChange={(e) => setLanguage(e.target.value as Locale)}
            >
              {locales.map((l) => (
                <option key={l} value={l}>
                  {localeNames[l]}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </Panel>
    </div>
  );
}

const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX = 5 * 1024 * 1024;
const SIDE = 512;

/** Centre-crops an image file to a SIDE×SIDE JPEG in the browser. */
async function cropSquare(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const s = Math.min(img.width, img.height);
  const cv = document.createElement("canvas");
  cv.width = cv.height = SIDE;
  cv.getContext("2d")!.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, SIDE, SIDE);
  img.close();
  return new Promise((ok, no) => cv.toBlob((b) => (b ? ok(b) : no(new Error("crop"))), "image/jpeg", 0.9));
}

/** Profile photo (proposed /api/me/avatar): pick → type/size check → square crop preview → save, or remove. */
function PhotoPanel() {
  const { c } = useC4();
  const p = c.settings.profile;
  const toast = useToast();
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<{ blob: Blob; url: string } | null>(null);
  const [err, setErr] = useState("");
  const q = useQuery({ queryKey: ["c4", "avatar"], queryFn: () => unwrap<{ url: string | null }>(api.GET("/api/me/avatar")) });
  useEffect(() => () => { if (draft) URL.revokeObjectURL(draft.url); }, [draft]);

  const save = useMutation({
    mutationFn: async (blob: Blob) => {
      const { upload } = await unwrap<{ upload: { url: string } }>(
        api.POST("/api/me/avatar", { body: { contentType: blob.type, size: blob.size } }),
      );
      await putPresigned(upload.url, blob, blob.type);
      return unwrap<{ url: string | null }>(api.GET("/api/me/avatar"));
    },
    onSuccess: (d) => {
      qc.setQueryData(["c4", "avatar"], d);
      setDraft(null);
      toast({ title: p.photoSaved, tone: "success" });
    },
    onError: () => setErr(p.photoFail),
  });
  const remove = useMutation({
    mutationFn: () => unwrap<{ url: null }>(api.DELETE("/api/me/avatar")),
    onSuccess: (d) => {
      qc.setQueryData(["c4", "avatar"], d);
      toast({ title: p.photoRemoved, tone: "success" });
    },
    onError: () => setErr(c.generic),
  });

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (!f) return;
    if (!TYPES.includes(f.type)) return setErr(p.photoType);
    if (f.size > MAX) return setErr(p.photoSize);
    setErr("");
    try {
      const blob = await cropSquare(f);
      setDraft({ blob, url: URL.createObjectURL(blob) });
    } catch {
      setErr(p.photoType);
    }
  }

  const shown = draft?.url ?? q.data?.url;
  const busy = save.isPending || remove.isPending;
  return (
    <Panel icon="camera" title={p.photo} body={p.photoHint}>
      <div className="flex flex-wrap items-center gap-5">
        <span className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy-50 text-secondary ring-2 ring-white">
          {q.isPending ? (
            <Skeleton className="size-full" />
          ) : shown ? (
            // eslint-disable-next-line @next/next/no-img-element -- blob/data URL preview, next/image can't optimise it
            <img src={shown} alt={draft ? p.photoPreview : p.photo} className="size-full object-cover" />
          ) : (
            <span className="sr-only">{p.photoNone}</span>
          )}
        </span>
        <input ref={input} type="file" accept={TYPES.join(",")} onChange={onPick} className="sr-only" tabIndex={-1} aria-hidden />
        <div className="flex flex-wrap gap-2">
          {draft ? (
            <>
              <Button dots loading={save.isPending} onClick={() => save.mutate(draft.blob)}>{p.photoUpload}</Button>
              <Button variant="ghost" disabled={busy} onClick={() => setDraft(null)}>{p.photoCancel}</Button>
            </>
          ) : (
            <>
              <Button variant="outline" disabled={busy || q.isPending} onClick={() => input.current?.click()}>
                {q.data?.url ? p.photoChange : p.photoPick}
              </Button>
              {q.data?.url && (
                <Button variant="ghost" loading={remove.isPending} disabled={busy} onClick={() => remove.mutate()}>{p.photoRemove}</Button>
              )}
            </>
          )}
        </div>
      </div>
      {err && <p role="alert" className="mt-3 text-small font-medium text-danger">{err}</p>}
    </Panel>
  );
}
