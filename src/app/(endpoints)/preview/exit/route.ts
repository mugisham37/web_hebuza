import { cookies, draftMode } from "next/headers";
import { PREVIEW_COOKIE } from "@/lib/marketing/cms/preview";

export async function POST(req: Request) {
  (await draftMode()).disable();
  (await cookies()).delete(PREVIEW_COOKIE);
  const path = String((await req.formData()).get("path") ?? "/");
  return Response.redirect(new URL(path.startsWith("/") && !path.startsWith("//") ? path : "/", req.url), 303);
}
