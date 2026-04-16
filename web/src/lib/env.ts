export const env = {
  network: (process.env.NEXT_PUBLIC_SUI_NETWORK ?? "testnet") as
    | "mainnet"
    | "testnet",
  packageId: process.env.NEXT_PUBLIC_TIDEFORM_PACKAGE_ID ?? "0x0",
  walrusPublisher:
    process.env.NEXT_PUBLIC_WALRUS_PUBLISHER ??
    "https://publisher.walrus-testnet.walrus.space",
  walrusAggregator:
    process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR ??
    "https://aggregator.walrus-testnet.walrus.space",
  // TODO_SEAL: replace with real mainnet key server object IDs once available
  sealKeyServers: (process.env.NEXT_PUBLIC_SEAL_KEY_SERVERS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  sealThreshold: Number(process.env.NEXT_PUBLIC_SEAL_THRESHOLD ?? 2),
};

export const sealConfigured = env.sealKeyServers.length > 0;
