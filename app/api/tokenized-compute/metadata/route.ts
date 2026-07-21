export function GET() {
  return Response.json({
    name: "B200 Hour Token",
    symbol: "B200H",
    description: "A Compute Exchange Devnet demonstration token. One token represents one verified B200 GPU hour in the Compute Exchange supplier workflow.",
    properties: {
      category: "compute-capacity",
      network: "solana-devnet",
      standard: "Token-2022",
    },
  }, {
    headers: { "cache-control": "public, max-age=300" },
  });
}
