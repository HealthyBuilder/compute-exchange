import { getBuyerStatus, getBuyerWalletBalance } from "../../../../lib/b200h/redeemer";

export async function GET() {
  const status = getBuyerStatus();

  if (!status.configured) {
    return Response.json(status, { headers: { "cache-control": "no-store" } });
  }

  try {
    const wallet = await getBuyerWalletBalance();
    return Response.json({ ...status, ...wallet }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("B200H Devnet balance lookup failed", error);
    const message = error instanceof Error ? error.message : "The Devnet wallet balance could not be read.";
    return Response.json({ error: message }, { status: 502, headers: { "cache-control": "no-store" } });
  }
}
