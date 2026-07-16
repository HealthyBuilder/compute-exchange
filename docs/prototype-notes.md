# Compute Future Exchange — Prototype Notes

## Purpose

This is a front-end-only product demo with switchable Supplier and Buyer workspaces. All values and actions are mock data; no payment, chain, benchmark, or contract action is connected to a backend.

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
- The hosted app is still mock-only and contains no production buyer, supplier, payment, or chain data.

For a durable share link, replace the account-less quick tunnel with a named Cloudflare Tunnel and Cloudflare Access policy restricted to the intended cofounder emails.

## Suggested future demo extension

Connect only the next visible artifacts if a richer demo is needed: buyer intent cards, a basic supplier profile, simulated notifications, and an activity history. Keep the same rule: every term must be self-explanatory to a data-center operator.
