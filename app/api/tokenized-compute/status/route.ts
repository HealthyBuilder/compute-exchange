import { getIssuerStatus } from "../../../../lib/b200h/issuer";

export function GET() {
  return Response.json(getIssuerStatus(), {
    headers: { "cache-control": "no-store" },
  });
}
