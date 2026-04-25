import { SealClient, SessionKey, EncryptedObject } from "@mysten/seal";
import { fromBase64, toBase64 } from "@mysten/sui/utils";
import { suiClient } from "./sui";
import { env, sealConfigured } from "./env";

/**
 * TODO_SEAL: Once Walrus mainnet Seal key server object IDs are confirmed,
 * populate NEXT_PUBLIC_SEAL_KEY_SERVERS in `.env`. Until then, we use a
 * lightweight base64 envelope so the rest of the pipeline keeps working.
 *
 * Envelope format for placeholder mode:
 *   { mode: "placeholder", b64: "<base64 of raw bytes>" }
 *
 * In real Seal mode:
 *   { mode: "seal", b64: "<base64 of EncryptedObject bytes>", sealId: "<id>" }
 */
export type SealEnvelope =
  | { mode: "placeholder"; b64: string }
  | { mode: "seal"; b64: string; sealId: string };

let _client: SealClient | null = null;
function getClient(): SealClient {
  if (!sealConfigured) {
    throw new Error("Seal not configured (TODO_SEAL key servers)");
  }
  if (!_client) {
    _client = new SealClient({
      // The Sui client passed here must satisfy SealCompatibleClient.
      // The dapp-kit/sui SuiClient does — cast to keep types happy across SDK versions.
      // biome-ignore lint/suspicious/noExplicitAny: SDK cross-version compatibility
      suiClient: suiClient as any,
      serverConfigs: env.sealKeyServers.map((objectId) => ({
        objectId,
        weight: 1,
      })),
      verifyKeyServers: false,
    });
  }
  return _client;
}

/**
 * Encrypt bytes for the policy bound to (packageId, formId).
 * In placeholder mode the bytes are base64-encoded only — clearly marked so
 * we never confuse this with real encryption in production.
 */
export async function sealEncrypt(
  data: Uint8Array,
  ctx: { packageId: string; formId: string },
): Promise<SealEnvelope> {
  if (!sealConfigured) {
    return { mode: "placeholder", b64: toBase64(data) };
  }
  const client = getClient();
  const id = new TextEncoder().encode(ctx.formId);
  const { encryptedObject } = await client.encrypt({
    threshold: env.sealThreshold,
    packageId: ctx.packageId,
    id: bytesToHex(id),
    data,
  });
  return {
    mode: "seal",
    b64: toBase64(encryptedObject),
    sealId: ctx.formId,
  };
}

export async function sealDecrypt(
  envelope: SealEnvelope,
  opts: {
    sessionKey?: SessionKey;
    txBytes?: Uint8Array;
  } = {},
): Promise<Uint8Array> {
  if (envelope.mode === "placeholder") {
    return fromBase64(envelope.b64);
  }
  const client = getClient();
  const data = fromBase64(envelope.b64);
  // NOTE: real Seal decryption requires a SessionKey signed by the admin
  // wallet plus a Move PTB that calls a `seal_approve` entry function.
  // That wiring lives in /web/src/lib/seal-approve.ts (TODO_SEAL).
  if (!opts.sessionKey || !opts.txBytes) {
    throw new Error("Seal decrypt requires sessionKey + txBytes");
  }
  return client.decrypt({
    data,
    sessionKey: opts.sessionKey,
    txBytes: opts.txBytes,
  });
}

export function isSealEnvelope(v: unknown): v is SealEnvelope {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    (o.mode === "placeholder" || o.mode === "seal") && typeof o.b64 === "string"
  );
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export { SessionKey, EncryptedObject };
