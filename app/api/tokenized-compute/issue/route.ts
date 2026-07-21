import {
  IssuanceConfigurationError,
  issueB200Hours,
  type IssuanceReceipt,
} from "../../../../lib/b200h/issuer";

type IssueRequest = {
  hours?: unknown;
  idempotencyKey?: unknown;
};

type IssueResponse = IssuanceReceipt & {
  duplicate?: boolean;
};

const issuedRequests = new Map<string, Promise<IssueResponse>>();

export async function POST(request: Request) {
  let payload: IssueRequest;

  try {
    payload = await request.json() as IssueRequest;
  } catch {
    return Response.json({ error: "Enter a whole number of B200 hours before issuing." }, { status: 400 });
  }

  const hours = typeof payload.hours === "number" ? payload.hours : Number(payload.hours);
  const idempotencyKey = typeof payload.idempotencyKey === "string" ? payload.idempotencyKey.trim() : "";

  if (!idempotencyKey || idempotencyKey.length > 120) {
    return Response.json({ error: "This issuance request needs a valid approval ID." }, { status: 400 });
  }

  const existing = issuedRequests.get(idempotencyKey);
  if (existing) {
    try {
      return Response.json({ ...(await existing), duplicate: true });
    } catch (error) {
      return issueError(error);
    }
  }

  const issuance = issueB200Hours(hours);
  issuedRequests.set(idempotencyKey, issuance);

  try {
    return Response.json(await issuance, { status: 201 });
  } catch (error) {
    issuedRequests.delete(idempotencyKey);
    return issueError(error);
  }
}

function issueError(error: unknown) {
  console.error("B200H Devnet issuance failed", error);

  if (error instanceof IssuanceConfigurationError) {
    return Response.json({ error: error.message }, { status: 503 });
  }

  const message = error instanceof Error ? error.message : "The Devnet issuance could not be completed.";
  return Response.json({ error: message }, { status: 422 });
}
