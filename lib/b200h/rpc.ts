import {
  createSolanaRpcFromTransport,
  type Rpc,
  type SolanaRpcApi,
  type Signature,
} from "@solana/kit";
import { parseJsonWithBigInts } from "@solana/rpc-spec-types";

export const DEVNET_RPC_URL = "https://api.devnet.solana.com";

/**
 * The public Devnet RPC rejects the SDK transport's explicitly supplied
 * Content-Length header in the local Worker runtime. This transport keeps
 * Mosaic on its normal Solana RPC interface while allowing the runtime to set
 * that header itself. The BigInt parser preserves Solana's RPC value types.
 */
export function createDevnetRpc(rpcUrl: string): Rpc<SolanaRpcApi> {
  const transport = async <TResponse>({
    payload,
    signal,
  }: {
    payload: unknown;
    signal?: AbortSignal;
  }): Promise<TResponse> => {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Devnet RPC request failed (${response.status} ${response.statusText}).`);
    }

    return parseJsonWithBigInts(await response.text()) as TResponse;
  };

  return createSolanaRpcFromTransport(transport);
}

export async function confirmDevnetTransaction(rpc: Rpc<SolanaRpcApi>, signature: Signature): Promise<void> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { value } = await rpc.getSignatureStatuses([signature]).send();
    const status = value[0];

    if (status?.err) {
      throw new Error("The Devnet transaction was rejected.");
    }

    if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 650));
  }

  throw new Error("The Devnet transaction was submitted but did not confirm in time.");
}

export function explorerTxUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}
