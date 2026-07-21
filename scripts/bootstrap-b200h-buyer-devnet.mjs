import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  address,
  createKeyPairSignerFromPrivateKeyBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  getSignatureFromTransaction,
  sendAndConfirmTransactionFactory,
  signTransactionMessageWithSigners,
} from "@solana/kit";
import { createTransferTransaction } from "@solana/mosaic-sdk";

const devVarsPath = resolve(process.cwd(), ".dev.vars");
const defaultRpcUrl = "https://api.devnet.solana.com";
const defaultWsUrl = "wss://api.devnet.solana.com";
const defaultBuyerHours = Number(process.env.B200H_BUYER_INITIAL_HOURS || 12_400);

bootstrap().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function bootstrap() {
  const variables = await readDevVars();
  const rpcUrl = variables.get("SOLANA_DEVNET_RPC_URL") || defaultRpcUrl;
  const wsUrl = variables.get("SOLANA_DEVNET_WS_URL") || defaultWsUrl;
  const issuerSeedBase64 = variables.get("B200H_ISSUER_PRIVATE_KEY");
  const mintAddress = variables.get("B200H_MINT_ADDRESS");

  if (!issuerSeedBase64 || !mintAddress) {
    throw new Error(
      "Run scripts/bootstrap-b200h-devnet.mjs first: B200H_ISSUER_PRIVATE_KEY and B200H_MINT_ADDRESS must already exist in .dev.vars.",
    );
  }
  if (variables.get("B200H_BUYER_PRIVATE_KEY")) {
    throw new Error("B200H_BUYER_PRIVATE_KEY already exists in .dev.vars. This bootstrap only funds the demo buyer wallet once.");
  }

  const issuerSeed = Buffer.from(issuerSeedBase64, "base64");
  if (issuerSeed.byteLength !== 32) {
    throw new Error("B200H_ISSUER_PRIVATE_KEY in .dev.vars must be a base64-encoded 32-byte seed.");
  }

  const buyerSeed = randomBytes(32);
  const issuer = await createKeyPairSignerFromPrivateKeyBytes(new Uint8Array(issuerSeed));
  const buyer = await createKeyPairSignerFromPrivateKeyBytes(new Uint8Array(buyerSeed));
  const mint = address(mintAddress);
  const rpc = createSolanaRpc(rpcUrl);
  const rpcSubscriptions = createSolanaRpcSubscriptions(wsUrl);

  // Persist the Devnet-only buyer key before submitting the funding transfer.
  // If the public RPC is rate-limited, rerunning this script would otherwise
  // orphan the generated buyer wallet.
  variables.set("SOLANA_DEVNET_RPC_URL", rpcUrl);
  variables.set("SOLANA_DEVNET_WS_URL", wsUrl);
  variables.set("B200H_BUYER_PRIVATE_KEY", buyerSeed.toString("base64"));
  await writeDevVars(variables);
  console.log(`Funding Devnet demo buyer: ${buyer.address}`);

  // The issuer is both fee payer and transfer authority, so the demo buyer
  // wallet never needs its own Devnet SOL — it only holds B200H.
  const transaction = await createTransferTransaction({
    rpc,
    mint,
    from: issuer.address,
    to: buyer.address,
    feePayer: issuer,
    authority: issuer,
    amount: String(defaultBuyerHours),
    memo: "Compute Exchange demo buyer seed balance",
  });
  const signedTransaction = await signTransactionMessageWithSigners(transaction);
  const signature = getSignatureFromTransaction(signedTransaction).toString();

  await sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })(signedTransaction, {
    commitment: "confirmed",
    skipPreflight: false,
  });

  console.log(`Buyer wallet funded with ${defaultBuyerHours.toLocaleString()} B200H.`);
  console.log(`Funding proof: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  console.log(`Demo buyer wallet: ${buyer.address}`);
}

async function readDevVars() {
  try {
    const content = await readFile(devVarsPath, "utf8");
    return new Map(content.split(/\r?\n/).flatMap((line) => {
      const separator = line.indexOf("=");
      if (separator < 1 || line.trimStart().startsWith("#")) return [];
      return [[line.slice(0, separator).trim(), line.slice(separator + 1).trim()]];
    }));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return new Map();
    }
    throw error;
  }
}

async function writeDevVars(nextVariables) {
  const content = [...nextVariables.entries()].map(([key, value]) => `${key}=${value}`).join("\n");
  await writeFile(devVarsPath, `${content}\n`, { mode: 0o600 });
}
