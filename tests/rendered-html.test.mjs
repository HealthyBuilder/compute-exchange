import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the supplier console by default", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Compute Exchange<\/title>/i);
  assert.match(html, /Supplier Console/);
  assert.match(html, /Northstar Data/);
  assert.match(html, /Verified supplier/);
  assert.match(html, /Your B200 capacity is ready to reach buyers\./);
  assert.match(html, /Tokenized Compute/);
  assert.match(html, /Lease Compute/);
  assert.match(html, /Revenue/);
  assert.match(html, /Switch to buyer workspace/);
});

test("includes all buyer workflows and settlement rails", async () => {
  const [page, layout, css, revenueCss] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/revenue.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /type PaymentRail = "USD" \| "USDC" \| "TOKEN"/);
  assert.match(page, /function ComputeExchange/);
  assert.match(page, /function ContractTransfer/);
  assert.match(page, /function TokenAuctions/);
  assert.match(page, /function TokenMarket/);
  assert.match(page, /BUYER WORKSPACE/);
  assert.match(page, /Buy, trade, hedge compute in one hub/);
  assert.match(page, /Bid on Compute Token Auction/);
  assert.match(page, /Trade & Hedge/);
  assert.match(page, /Compute Auctions/);
  assert.match(page, /Compute Trading/);
  assert.match(page, /function TokenPriceChart/);
  assert.doesNotMatch(page, /chart-bars/);
  assert.match(page, /YOUR FINAL ALLOCATION/);
  assert.match(page, /Share capacity/);
  assert.match(page, /Transfer contract/);
  assert.match(page, /Approve & issue B200H/);
  assert.match(page, /Confirmed on Solana Devnet/);
  assert.match(page, /REVENUE BY SOURCE/);
  assert.match(page, /Minting fee share/);
  assert.match(layout, /Compute Exchange/);
  assert.match(css, /\.payment-rails/);
  assert.match(css, /\.allocation-flow/);
  assert.match(css, /\.order-book/);
  assert.match(css, /\.market-layout/);
  assert.match(css, /\.market-header/);
  assert.match(css, /\.token-line-canvas/);
  assert.match(revenueCss, /\.revenue-summary-grid/);
});
