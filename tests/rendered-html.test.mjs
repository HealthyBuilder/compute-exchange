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

test("server-renders the buyer command center", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Compute Future · Compute Exchange<\/title>/i);
  assert.match(html, /Buyer Workspace/);
  assert.match(html, /Get the compute you need\. Keep every option open\./);
  assert.match(html, /Deploy compute now/);
  assert.match(html, /Use, share, or transfer/);
  assert.match(html, /Bid on new token supply/);
  assert.match(html, /Trade tokens instantly/);
  assert.match(html, /Switch to.*Supplier/);
});

test("includes all buyer workflows and settlement rails", async () => {
  const [page, layout, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /type PaymentRail = "USD" \| "USDC" \| "TOKEN"/);
  assert.match(page, /function ComputeExchange/);
  assert.match(page, /function ContractTransfer/);
  assert.match(page, /function TokenAuctions/);
  assert.match(page, /function TokenMarket/);
  assert.match(page, /YOUR FINAL ALLOCATION/);
  assert.match(page, /Share capacity/);
  assert.match(page, /Transfer contract/);
  assert.match(layout, /Compute Future · Compute Exchange/);
  assert.match(css, /\.payment-rails/);
  assert.match(css, /\.allocation-flow/);
  assert.match(css, /\.order-book/);
});
