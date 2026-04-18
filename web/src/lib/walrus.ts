import { env } from "./env";

const PUBLISHER = env.walrusPublisher;
const AGGREGATOR = env.walrusAggregator;

export type WalrusUploadResult = {
  blobId: string;
  size: number;
  endEpoch?: number;
};

/**
 * Upload bytes to Walrus via the public HTTP publisher.
 * For larger production deployments swap this for the @mysten/walrus client
 * which streams directly to storage nodes.
 */
export async function uploadBlob(
  data: Uint8Array | Blob,
  opts: { epochs?: number; signal?: AbortSignal } = {},
): Promise<WalrusUploadResult> {
  const epochs = opts.epochs ?? 53;
  const url = `${PUBLISHER}/v1/blobs?epochs=${epochs}`;
  const body = data instanceof Uint8Array ? new Blob([data as BlobPart]) : data;

  const res = await fetch(url, {
    method: "PUT",
    body,
    signal: opts.signal,
  });

  if (!res.ok) {
    throw new Error(`Walrus upload failed: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as {
    newlyCreated?: {
      blobObject: { blobId: string; size: number; storage?: { endEpoch: number } };
    };
    alreadyCertified?: {
      blobId: string;
      endEpoch: number;
    };
  };

  if (json.newlyCreated) {
    return {
      blobId: json.newlyCreated.blobObject.blobId,
      size: json.newlyCreated.blobObject.size,
      endEpoch: json.newlyCreated.blobObject.storage?.endEpoch,
    };
  }
  if (json.alreadyCertified) {
    return {
      blobId: json.alreadyCertified.blobId,
      size: 0,
      endEpoch: json.alreadyCertified.endEpoch,
    };
  }
  throw new Error("Unexpected Walrus publisher response");
}

export async function uploadJson<T>(
  payload: T,
  opts: { epochs?: number; signal?: AbortSignal } = {},
): Promise<WalrusUploadResult> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  return uploadBlob(bytes, opts);
}

export async function readBlob(
  blobId: string,
  opts: { signal?: AbortSignal } = {},
): Promise<Uint8Array> {
  const url = `${AGGREGATOR}/v1/blobs/${blobId}`;
  const res = await fetch(url, { signal: opts.signal });
  if (!res.ok) {
    throw new Error(`Walrus read failed: ${res.status}`);
  }
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
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
