import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  airdropFactory,
  createKeyPairSignerFromPrivateKeyBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  generateKeyPairSigner,
  getSignatureFromTransaction,
  lamports,
  sendAndConfirmTransactionFactory,
  signTransactionMessageWithSigners,
} from "@solana/kit";
import { createArcadeTokenInitTransaction } from "@solana/mosaic-sdk";

const devVarsPath = resolve(process.cwd(), ".dev.vars");
const defaultRpcUrl = "https://api.devnet.solana.com";
const defaultWsUrl = "wss://api.devnet.solana.com";
const defaultMetadataUri = `data:application/json;base64,${Buffer.from(JSON.stringify({
  name: "B200 Hour Token",
  symbol: "B200H",
  description: "Compute Exchange Devnet demonstration token. One token represents one verified B200 GPU hour.",
})).toString("base64")}`;
const metadataUri = process.env.B200H_METADATA_URI || defaultMetadataUri;

bootstrap().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function bootstrap() {
  const variables = await readDevVars();
  const rpcUrl = variables.get("SOLANA_DEVNET_RPC_URL") || defaultRpcUrl;
  const wsUrl = variables.get("SOLANA_DEVNET_WS_URL") || defaultWsUrl;
  const existingSeed = variables.get("B200H_ISSUER_PRIVATE_KEY");
  const seed = existingSeed ? Buffer.from(existingSeed, "base64") : randomBytes(32);

  if (seed.byteLength !== 32) {
    throw new Error("B200H_ISSUER_PRIVATE_KEY in .dev.vars must be a base64-encoded 32-byte seed.");
  }
  if (variables.get("B200H_MINT_ADDRESS")) {
    throw new Error("B200H_MINT_ADDRESS already exists in .dev.vars. This bootstrap only creates the global mint once.");
  }

  const issuer = await createKeyPairSignerFromPrivateKeyBytes(new Uint8Array(seed));
  const mint = await generateKeyPairSigner();
  const rpc = createSolanaRpc(rpcUrl);
  const rpcSubscriptions = createSolanaRpcSubscriptions(wsUrl);

  // Persist the Devnet-only key before requesting a faucet airdrop. If a public
  // faucet is rate-limited, rerunning this script reuses the same issuer.
  variables.set("SOLANA_DEVNET_RPC_URL", rpcUrl);
  variables.set("SOLANA_DEVNET_WS_URL", wsUrl);
  variables.set("B200H_ISSUER_PRIVATE_KEY", seed.toString("base64"));
  await writeDevVars(variables);
  console.log(`Funding Devnet issuer: ${issuer.address}`);

  const balance = await rpc.getBalance(issuer.address).send();
  if (BigInt(balance.value) < 400_000_000n) {
    const airdrop = airdropFactory({ rpc, rpcSubscriptions });
    await airdrop({
      commitment: "confirmed",
      lamports: lamports(1_000_000_000n),
      recipientAddress: issuer.address,
    });
  }

  const transaction = await createArcadeTokenInitTransaction(
    rpc,
    "B200 Hour Token",
    "B200H",
    0,
    metadataUri,
    issuer,
    mint,
    issuer,
  );
  const signedTransaction = await signTransactionMessageWithSigners(transaction);
  const signature = getSignatureFromTransaction(signedTransaction).toString();

  await sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions })(signedTransaction, {
    commitment: "confirmed",
    skipPreflight: false,
  });

  variables.set("B200H_MINT_ADDRESS", mint.address);
  await writeDevVars(variables);

  console.log(`B200H mint created: ${mint.address}`);
  console.log(`Creation proof: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  console.log(`Inventory owner: ${issuer.address}`);
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
