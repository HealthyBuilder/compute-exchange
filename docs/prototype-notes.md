# Compute Exchange — Prototype Notes

## Purpose

This is a product demo with switchable Supplier and Buyer workspaces. Payments, benchmarks, contracts, auctions, and trading remain mock interactions. The Supplier **Tokenized Compute** approval is the one live slice: it creates a real B200H issuance transaction on Solana Devnet through a platform-controlled server signer.

## Buyer workspace

- **Dashboard** makes the four buyer jobs explicit: buy compute directly, transfer or sublease contracts, bid in primary token auctions, and trade tokens on the secondary market.
- **Buy Compute** follows an AI-lab cluster workflow: select GPU inventory, configure count, region, term, storage, and environment, then settle in USD, USDC, or eligible Compute Tokens.
- **Contracts & Transfer** starts from owned contracts and time-to-expiry. Buyers may share a portion of capacity as a sublease or assign the full remaining term.
- **Token Auctions** separates total minted supply, actual sold supply, clearing price, and the buyer's final allocation.
- **Token Market** presents a live price, chart, bid/ask order book, and buy/sell ticket. Tokens remain redeemable for eligible GPU compute.

## Product decisions

- The demo has one supplier-oriented console, not separate specialist tools.
- Capacity is always described as B200 GPU capacity. References to H100/H200 were removed.
- The supplier has two clear Exchange options:
  - **Tokenized Compute**: verified B200 GPU hours become standard B200 Hour Tokens. The supplier earns auction revenue and fees from platform trading volume; buyers later redeem the hours.
  - **Lease Compute**: a supplier signs a direct, dedicated compute contract with a buyer. Contracts can optionally allow an approved buyer to sublease unused time.
- A supplier chooses a selling option before verification. Verification is then a route-specific step, not a standalone navigation item.
- Tokenized Compute follows: Select capacity → Verify capacity → Set sale terms → Publish to auction.
- Lease Compute follows: Select capacity → Verify lease readiness → Set contract terms → Publish lease.
- The two options converge at buyer use and reporting, while retaining their own pricing and settlement styles.
- Terms such as OTC, Lease Blocks, haircut, quotas, and ledger mechanics are intentionally absent from the product UI.

## Page map

| View | Demo purpose | Primary interaction |
| --- | --- | --- |
| Overview | Give the supplier an immediate state-of-business view and explain the two options. | Navigate to the Exchange or an option. |
| Exchange | Let the supplier choose a sales option without operational jargon. | Open Tokenized Compute or Lease Compute. |
| Tokenized Compute | Guide the supplier from capacity selection through verification, sale terms, and auction publishing. | Progress through a four-step mock flow. |
| Lease Compute | Guide the supplier from capacity selection through lease readiness, contract terms, and publishing. | Progress through a four-step mock flow. |

## Demo interactions

- Sidebar navigation changes the current view without a page load.
- Primary actions show confirmation toasts and preserve the illusion of a working product.
- Each route-specific verification transitions from ready to running to complete using local UI state.
- Token amount, lease term, and the sublease preference update locally in the interface.

## Design direction

The UI uses a focused, enterprise infrastructure feel: a dark navigation rail, quiet off-white workspace, and a restrained Solana-inspired palette of purple, cyan, and electric green. The layout is inspired by modern GPU cloud consoles while avoiding visual density and financial-market language.

## Demo deployment

The current shared demo is deployed on a dedicated AWS EC2 instance, separate from the existing data-bearing instance. Its deployment setup is intentionally narrow:

- The instance has its own encrypted root disk, security group, and SSM-only management role.
- Its security group has no inbound rules. The app and reverse proxy listen only on `127.0.0.1`.
- A Cloudflare Tunnel is the only external route to the demo; it does not require opening inbound AWS ports.
- The tunnel endpoint is protected with HTTP Basic Authentication. The live URL and credential are communicated separately and are not stored in this repository.
- The hosted app has one live Devnet-only capability: a Supplier approval can issue B200H through the platform signer. It contains no production buyer, supplier, payment, capacity, or mainnet-chain data.

For a durable share link, replace the account-less quick tunnel with a named Cloudflare Tunnel and Cloudflare Access policy restricted to the intended cofounder emails.

## Suggested future demo extension

Connect only the next visible artifacts if a richer demo is needed: buyer intent cards, a basic supplier profile, simulated notifications, and an activity history. Keep the same rule: every term must be self-explanatory to a data-center operator.

## Solana Devnet issuance

The **Tokenized Compute** path now issues a real Devnet token while keeping the supplier experience free of wallet terminology.

- The supplier sees **Approve issuance**, not “connect wallet” or “sign a transaction.” The approval can be attached to the supplier's normal account session, SSO, or passkey later.
- The prototype validates the approved issuance amount and configured mint before it submits to the chain. Production must add capacity, verification, authorization, and idempotency records in durable storage.
- A platform-controlled issuance authority signs the Devnet transaction. The key never reaches the supplier's browser. The shared Devnet demo retrieves its test-only issuer configuration from an encrypted AWS SSM Parameter Store entry at service start, with an EC2 role limited to that one parameter. Before any production deployment, move the authority to a managed signer; Solana Keychain is the intended signer-provider abstraction, not supplier authentication.
- The first token is a simple integer **B200 Hour Token**: one unit represents one verified B200 GPU hour. The on-chain mint proves issuance and supply; batch, data-center, contract, and redemption details remain in the platform record.
- The resulting screen should show a plain-language receipt, such as “48,000 B200 Hour Tokens issued,” with an optional **View Devnet proof** link for users who want to inspect the transaction.

The first live Devnet slice uses Mosaic to create a single global **B200H** Token-2022 mint with zero decimals. It uses Mosaic's Arcade Token template without sRFC-37 access controls; the platform Devnet issuer is both the fee payer and mint authority, and the inventory is held in its associated token account. This keeps the initial flow straightforward while retaining a real on-chain mint and issuance receipt. For the local-only Devnet demo, the token metadata is a self-contained data URI; replace it with the public metadata endpoint before using a durable deployment.

Solana Keychain remains an implementation detail for a later signer-provider change; it does not itself provide supplier authentication or replace the platform's approval policy. The first Devnet integration has a small server-side issuer interface that can later be backed by Keychain and a managed signer. Advanced access-control or gasless-relayer features remain out of scope until their authority and fee-payer model is mature.

### Devnet bootstrap safeguards

- The Devnet issuer is a dedicated test-only key. It is stored in an ignored `.dev.vars` file and is never returned by an API route or included in the client bundle.
- Bootstrap needs a small amount of free Devnet SOL to create the mint and associated token account. The development environment should fund that key before the one-time global-mint bootstrap runs.
- Until `B200H_MINT_ADDRESS` exists, the issuance endpoint returns a safe configuration error rather than minting anything. Once the global mint exists, every Supplier approval produces an individual Devnet transaction receipt.

### Current Devnet state — 2026-07-20

- Global B200H mint: [`VwSDjfc2AAufxti2Vu2CGoY78LHBjsFTtwE7GhyTW8n`](https://explorer.solana.com/address/VwSDjfc2AAufxti2Vu2CGoY78LHBjsFTtwE7GhyTW8n?cluster=devnet)
- Mint creation transaction: [`3Cuv…GzKQWu`](https://explorer.solana.com/tx/3CuvmG7cNdKkJ3zf9xg72Vzv8cyHVgHBcQXKVJp7AY919hHXNtuXcEDmRz5dRi3F7DqN9271dipn1ESW92GzKQWu?cluster=devnet)
- First platform issuance: **48,000 B200H** to the platform inventory account, confirmed in [`5GfB…8N6L`](https://explorer.solana.com/tx/5GfBfHZoEG6saGNDzwn1yAh7sTSVuKjdHx5N3zNMGRkXM38Fjt6wdSGcrEnHik9aEmZphBdajM5k2iWJ4GAo8N6L?cluster=devnet).
- Deployed-EC2 health issuance: **1 B200H**, confirmed in [`4PJR…ojxu`](https://explorer.solana.com/tx/4PJRfoYJFWAeUhS9JLtMiHxigVyRGeAhqA8ih1CRTKeWWavSJPwFe2csK3ooaSCzTRK5yn6t15NBaA7xo4TMojxu?cluster=devnet).

### Runtime note

The live signer endpoint requires a Node server runtime. The Cloudflare Worker preview was able to render the UI but its egress to Solana's public Devnet RPC returned `403`; the local Node preview and the deployed AWS Node service complete the same Mosaic transaction successfully. Do not place the Devnet issuer seed in a Worker variable, browser bundle, or committed file.

Use `npm run dev:node` for the local live-issuance demo. The existing `npm run dev` command remains the Worker/UI preview and should not be used to exercise the signing endpoint.
