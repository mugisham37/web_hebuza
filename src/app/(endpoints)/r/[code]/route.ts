import { resolveLink } from "../../links";

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  return resolveLink(req, "r", (await params).code);
}
