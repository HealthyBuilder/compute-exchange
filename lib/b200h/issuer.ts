import {
  address,
  createKeyPairSignerFromPrivateKeyBytes,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  signTransactionMessageWithSigners,
} from "@solana/kit";
import { createMintToTransaction } from "@solana/mosaic-sdk";
import { confirmDevnetTransaction, createDevnetRpc, DEVNET_RPC_URL, explorerTxUrl } from "./rpc";

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

  await confirmDevnetTransaction(rpc, signature);

  const signatureText = signature.toString();

  return {
    amount,
    mintAddress: mint,
    inventoryOwner: issuer.address,
    network: "devnet",
    signature: signatureText,
    explorerUrl: explorerTxUrl(signatureText),
  };
}
