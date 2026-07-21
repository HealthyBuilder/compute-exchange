import {
  address,
  createKeyPairSignerFromPrivateKeyBytes,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  signTransactionMessageWithSigners,
  type KeyPairSigner,
} from "@solana/kit";
import { createTransferTransaction, resolveTokenAccount } from "@solana/mosaic-sdk";
import { confirmDevnetTransaction, createDevnetRpc, DEVNET_RPC_URL, explorerTxUrl } from "./rpc";

const MAX_REDEMPTION_HOURS = 75_600;

export type RedemptionReceipt = {
  amount: number;
  mintAddress: string;
  buyerWallet: string;
  treasuryWallet: string;
  network: "devnet";
  signature: string;
  explorerUrl: string;
};

export class RedemptionConfigurationError extends Error {}

type RedeemerConfig = {
  buyerPrivateKey: string;
  issuerPrivateKey: string;
  mintAddress: string;
  rpcUrl: string;
};

function getConfig(): RedeemerConfig {
  const buyerPrivateKey = process.env.B200H_BUYER_PRIVATE_KEY;
  const issuerPrivateKey = process.env.B200H_ISSUER_PRIVATE_KEY;
  const mintAddress = process.env.B200H_MINT_ADDRESS;

  if (!buyerPrivateKey || !issuerPrivateKey || !mintAddress) {
    throw new RedemptionConfigurationError(
      "The Devnet buyer wallet is not configured. Add B200H_BUYER_PRIVATE_KEY to the server environment (alongside the existing B200H_ISSUER_PRIVATE_KEY and B200H_MINT_ADDRESS).",
    );
  }

  return {
    buyerPrivateKey,
    issuerPrivateKey,
    mintAddress,
    rpcUrl: process.env.SOLANA_DEVNET_RPC_URL || DEVNET_RPC_URL,
  };
}

function decodeBase64(value: string, label: string): Uint8Array {
  try {
    const binary = atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    throw new RedemptionConfigurationError(`${label} must be a base64-encoded 32-byte Devnet seed.`);
  }
}

function validateAmount(value: number): number {
  if (!Number.isInteger(value) || value < 1 || value > MAX_REDEMPTION_HOURS) {
    throw new Error(`Hours must be a whole number from 1 to ${MAX_REDEMPTION_HOURS.toLocaleString()}.`);
  }
  return value;
}

async function loadSigner(seedBase64: string, label: string): Promise<KeyPairSigner> {
  const seed = decodeBase64(seedBase64, label);

  if (seed.byteLength !== 32) {
    throw new RedemptionConfigurationError(`${label} must contain exactly 32 bytes.`);
  }

  return createKeyPairSignerFromPrivateKeyBytes(seed);
}

export function getBuyerStatus() {
  return {
    configured: Boolean(process.env.B200H_BUYER_PRIVATE_KEY)
      && Boolean(process.env.B200H_ISSUER_PRIVATE_KEY)
      && Boolean(process.env.B200H_MINT_ADDRESS),
    network: "devnet" as const,
  };
}

export async function getBuyerWalletBalance(): Promise<{ walletAddress: string; mintAddress: string; balance: number }> {
  const config = getConfig();
  const buyer = await loadSigner(config.buyerPrivateKey, "B200H_BUYER_PRIVATE_KEY");
  const mint = address(config.mintAddress);
  const rpc = createDevnetRpc(config.rpcUrl);

  const account = await resolveTokenAccount(rpc, buyer.address, mint);

  return {
    walletAddress: buyer.address,
    mintAddress: config.mintAddress,
    balance: account.uiBalance,
  };
}

/**
 * Redeems B200 Hour Tokens for a buyer's compute order: a Token-2022 transfer
 * from the platform-controlled buyer signer back to the platform treasury
 * (the same signer that issues supply). The treasury pays the network fee so
 * the demo buyer account never needs its own Devnet SOL.
 */
export async function redeemB200Hours(hours: number): Promise<RedemptionReceipt> {
  const amount = validateAmount(hours);
  const config = getConfig();

  const [buyer, treasury] = await Promise.all([
    loadSigner(config.buyerPrivateKey, "B200H_BUYER_PRIVATE_KEY"),
    loadSigner(config.issuerPrivateKey, "B200H_ISSUER_PRIVATE_KEY"),
  ]);

  const mint = address(config.mintAddress);
  const rpc = createDevnetRpc(config.rpcUrl);

  const transaction = await createTransferTransaction({
    rpc,
    mint,
    from: buyer.address,
    to: treasury.address,
    feePayer: treasury,
    authority: buyer,
    amount: amount.toString(),
    memo: "Compute Exchange - Buy Compute redemption",
  });

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
    buyerWallet: buyer.address,
    treasuryWallet: treasury.address,
    network: "devnet",
    signature: signatureText,
    explorerUrl: explorerTxUrl(signatureText),
  };
}
