import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import { env } from "./env";

export const suiClient = new SuiJsonRpcClient({
  url: getJsonRpcFullnodeUrl(env.network),
  network: env.network,
});

export const PACKAGE_ID = env.packageId;
export const NETWORK = env.network;

export const networks = {
  testnet: {
    url: getJsonRpcFullnodeUrl("testnet"),
    network: "testnet" as const,
  },
  mainnet: {
    url: getJsonRpcFullnodeUrl("mainnet"),
    network: "mainnet" as const,
  },
};
