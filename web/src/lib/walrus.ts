import { WalrusClient } from "@mysten/walrus";
import type { Transaction } from "@mysten/sui/transactions";
import { suiClient } from "./sui";
import { env } from "./env";

const UPLOAD_RELAY =
  env.network === "mainnet"
    ? "https://upload-relay.mainnet.walrus.space"
    : "https://upload-relay.testnet.walrus.space";

// CDN-hosted WASM blob so Next.js doesn't try to bundle the local one at build time.
const WASM_URL =
  "https://unpkg.com/@mysten/walrus-wasm@0.2.2/web/walrus_wasm_bg.wasm";

const AGGREGATOR = env.walrusAggregator;

let _client: WalrusClient | null = null;
function client(): WalrusClient {
  if (!_client) {
    _client = new WalrusClient({
      network: env.network,
      // biome-ignore lint/suspicious/noExplicitAny: cross-version SDK compat
      suiClient: suiClient as any,
      wasmUrl: WASM_URL,
      uploadRelay: {
        host: UPLOAD_RELAY,
        sendTip: { max: 1_000 }, // ≤ 1000 MIST tip to the relay
      },
    });
  }
  return _client;
}

export type UploadProgress =
  | { step: "encoded" }
  | { step: "registered"; txDigest: string }
  | { step: "uploaded" }
  | { step: "certified" };

export type ExecuteTxFn = (tx: Transaction) => Promise<{ digest: string }>;

/**
 * Upload bytes to Walrus using the user's wallet.
 *
 * Flow:
 *   1. Encode the blob locally (computes blob ID + commitment).
 *   2. Wallet signs a register tx — costs WAL (storage) + SUI (gas).
 *   3. SDK uploads encoded data to Mysten's upload relay, relay returns
 *      a certificate signed by the storage committee.
 *   4. Wallet signs a certify tx using the certificate.
 *
 * Cost is paid by `args.owner` (the connected wallet).
 */
export async function uploadBlob(
  bytes: Uint8Array,
  args: {
    owner: string;
    signAndExecute: ExecuteTxFn;
    epochs?: number;
    onProgress?: (p: UploadProgress) => void;
  },
): Promise<{ blobId: string; blobObjectId: string }> {
  const flow = client().writeBlobFlow({ blob: bytes });

  await flow.encode();
  args.onProgress?.({ step: "encoded" });

  const registerTx = flow.register({
    epochs: args.epochs ?? 53,
    deletable: false,
    owner: args.owner,
  });
  const { digest: regDigest } = await args.signAndExecute(registerTx);
  args.onProgress?.({ step: "registered", txDigest: regDigest });

  await flow.upload({ digest: regDigest });
  args.onProgress?.({ step: "uploaded" });

  const certifyTx = flow.certify();
  await args.signAndExecute(certifyTx);
  args.onProgress?.({ step: "certified" });

  const blob = await flow.getBlob();
  return { blobId: blob.blobId, blobObjectId: blob.blobObjectId };
}

export async function uploadJson<T>(
  payload: T,
  args: {
    owner: string;
    signAndExecute: ExecuteTxFn;
    epochs?: number;
    onProgress?: (p: UploadProgress) => void;
  },
): Promise<{ blobId: string; blobObjectId: string }> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  return uploadBlob(bytes, args);
}

// ---------- Reads (aggregator HTTP — works fine) ----------

export async function readBlob(
  blobId: string,
  opts: { signal?: AbortSignal } = {},
): Promise<Uint8Array> {
  const url = `${AGGREGATOR}/v1/blobs/${blobId}`;
  const res = await fetch(url, { signal: opts.signal });
  if (!res.ok) throw new Error(`Walrus read failed: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

export async function readJson<T>(
  blobId: string,
  opts: { signal?: AbortSignal } = {},
): Promise<T> {
  const bytes = await readBlob(blobId, opts);
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

export function blobUrl(blobId: string): string {
  return `${AGGREGATOR}/v1/blobs/${blobId}`;
}
