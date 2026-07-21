import {
  address,
  createKeyPairSignerFromPrivateKeyBytes,
  createSolanaRpcFromTransport,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  signTransactionMessageWithSigners,
} from "@solana/kit";
import { createMintToTransaction } from "@solana/mosaic-sdk";
import { parseJsonWithBigInts } from "@solana/rpc-spec-types";

const DEVNET_RPC_URL = "https://api.devnet.solana.com";
const MAX_ISSUANCE_HOURS = 75_600;

export type IssuanceReceipt = {
  amount: number;
  mintAddress: string;
  inventoryOwner: string;
  network: "devnet";
  signature: string;
  explorerUrl: string;
};

export class IssuanceConfigurationError extends Error {}

type IssuerConfig = {
  issuerPrivateKey: string;
  mintAddress: string;
  rpcUrl: string;
};

function getConfig(): IssuerConfig {
  const issuerPrivateKey = process.env.B200H_ISSUER_PRIVATE_KEY;
  const mintAddress = process.env.B200H_MINT_ADDRESS;

  if (!issuerPrivateKey || !mintAddress) {
    throw new IssuanceConfigurationError(
      "The Devnet issuer is not configured. Add B200H_ISSUER_PRIVATE_KEY and B200H_MINT_ADDRESS to the server environment.",
    );
  }

  return {
    issuerPrivateKey,
    mintAddress,
    rpcUrl: process.env.SOLANA_DEVNET_RPC_URL || DEVNET_RPC_URL,
  };
}

function decodeBase64(value: string): Uint8Array {
  try {
    const binary = atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    throw new IssuanceConfigurationError("B200H_ISSUER_PRIVATE_KEY must be a base64-encoded 32-byte Devnet seed.");
  }
}

function validateAmount(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > MAX_ISSUANCE_HOURS) {
    throw new Error(`Hours must be a whole number from 1 to ${MAX_ISSUANCE_HOURS.toLocaleString()}.`);
  }
  return value;
}

/**
 * The public Devnet RPC rejects the SDK transport's explicitly supplied
 * Content-Length header in the local Worker runtime. This transport keeps
 * Mosaic on its normal Solana RPC interface while allowing the runtime to set
 * that header itself. The BigInt parser preserves Solana's RPC value types.
 */
function createDevnetRpc(rpcUrl: string) {
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

export function getIssuerStatus() {
  const issuerConfigured = Boolean(process.env.B200H_ISSUER_PRIVATE_KEY);
  const mintConfigured = Boolean(process.env.B200H_MINT_ADDRESS);

  return {
    configured: issuerConfigured && mintConfigured,
    issuerConfigured,
    mintConfigured,
    mintAddress: process.env.B200H_MINT_ADDRESS || null,
    network: "devnet" as const,
  };
}

export async function issueB200Hours(hours: number): Promise<IssuanceReceipt> {
  const amount = validateAmount(hours);
  const config = getConfig();
  const seed = decodeBase64(config.issuerPrivateKey);

  if (seed.byteLength !== 32) {
    throw new IssuanceConfigurationError("B200H_ISSUER_PRIVATE_KEY must contain exactly 32 bytes.");
  }

  const issuer = await createKeyPairSignerFromPrivateKeyBytes(seed);
  const mint = address(config.mintAddress);
  const rpc = createDevnetRpc(config.rpcUrl);

  const transaction = await createMintToTransaction(
    rpc,
    mint,
    issuer.address,
    amount,
    issuer,
    issuer,
  );
  const signedTransaction = await signTransactionMessageWithSigners(transaction);
  const signature = getSignatureFromTransaction(signedTransaction);

  await rpc.sendTransaction(getBase64EncodedWireTransaction(signedTransaction), {
    encoding: "base64",
    preflightCommitment: "confirmed",
    skipPreflight: false,
  }).send();

  let confirmed = false;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { value } = await rpc.getSignatureStatuses([signature]).send();
    const status = value[0];

    if (status?.err) {
      throw new Error("The Devnet transaction was rejected.");
    }

    if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") {
      confirmed = true;
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 650));
  }

  if (!confirmed) {
    throw new Error("The Devnet transaction was submitted but did not confirm in time.");
  }

  const signatureText = signature.toString();

  return {
    amount,
    mintAddress: mint,
    inventoryOwner: issuer.address,
    network: "devnet",
    signature: signatureText,
    explorerUrl: `https://explorer.solana.com/tx/${signatureText}?cluster=devnet`,
  };
}
