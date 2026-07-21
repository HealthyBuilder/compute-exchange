import {
  RedemptionConfigurationError,
  redeemB200Hours,
  type RedemptionReceipt,
} from "../../../../lib/b200h/redeemer";

type RedeemRequest = {
  hours?: unknown;
  idempotencyKey?: unknown;
};

type RedeemResponse = RedemptionReceipt & {
  duplicate?: boolean;
};

const redeemedRequests = new Map<string, Promise<RedeemResponse>>();

export async function POST(request: Request) {
  let payload: RedeemRequest;

  try {
    payload = await request.json() as RedeemRequest;
  } catch {
    return Response.json({ error: "Enter a whole number of B200 hours before deploying." }, { status: 400 });
  }

  const hours = typeof payload.hours === "number" ? payload.hours : Number(payload.hours);
  const idempotencyKey = typeof payload.idempotencyKey === "string" ? payload.idempotencyKey.trim() : "";

  if (!idempotencyKey || idempotencyKey.length > 120) {
    return Response.json({ error: "This order needs a valid order ID." }, { status: 400 });
  }

  const existing = redeemedRequests.get(idempotencyKey);
  if (existing) {
    try {
      return Response.json({ ...(await existing), duplicate: true });
    } catch (error) {
      return redeemError(error);
    }
  }

  const redemption = redeemB200Hours(hours);
  redeemedRequests.set(idempotencyKey, redemption);

  try {
    return Response.json(await redemption, { status: 201 });
  } catch (error) {
    redeemedRequests.delete(idempotencyKey);
    return redeemError(error);
  }
}

function redeemError(error: unknown) {
  console.error("B200H Devnet redemption failed", error);

  if (error instanceof RedemptionConfigurationError) {
    return Response.json({ error: error.message }, { status: 503 });
  }

  const message = error instanceof Error ? error.message : "The Devnet redemption could not be completed.";
  return Response.json({ error: message }, { status: 422 });
}
