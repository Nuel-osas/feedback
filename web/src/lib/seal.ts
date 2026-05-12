import { SealClient, SessionKey, EncryptedObject } from "@mysten/seal";
import { fromBase64, toBase64 } from "@mysten/sui/utils";
import { Transaction } from "@mysten/sui/transactions";
import { suiClient } from "./sui";
import { env, sealConfigured } from "./env";

/**
 * On-disk format embedded in a Submission for a private field.
 *
 * - `mode: "seal"`  → ciphertext was produced by real Seal IBE.
 *                     `id` is the hex-encoded identity used at encrypt time
 *                     (form_id_bytes ‖ ":" ‖ field_id ‖ ":" ‖ nonce).
 * - `mode: "placeholder"` → base64 of the raw bytes; only used in dev when
 *                     no key servers are configured. Will refuse to encrypt
 *                     on mainnet once env is populated.
 */
export type SealEnvelope =
  | { mode: "placeholder"; b64: string }
  | { mode: "seal"; b64: string; id: string };

let _client: SealClient | null = null;
function getClient(): SealClient {
  if (!sealConfigured) {
    throw new Error("Seal not configured: NEXT_PUBLIC_SEAL_KEY_SERVERS is empty");
  }
  if (!_client) {
    _client = new SealClient({
      // biome-ignore lint/suspicious/noExplicitAny: cross-version SDK compat
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
 * Build the Seal identity for a (form, field, nonce) tuple.
 *
 * The on-chain `acl::seal_approve` requires the first 32 bytes of the identity
 * to match the form's object ID bytes — this binds every ciphertext to a single
 * form, so a leaked key for form A can never decrypt form B.
 */
export function buildSealIdentity(args: {
  formId: string;
  fieldId: string;
  nonce: string;
}): Uint8Array {
  const formIdBytes = hexToBytes(args.formId);
  const suffix = new TextEncoder().encode(`:${args.fieldId}:${args.nonce}`);
  const out = new Uint8Array(formIdBytes.length + suffix.length);
  out.set(formIdBytes, 0);
  out.set(suffix, formIdBytes.length);
  return out;
}

/**
 * Encrypt bytes for a private form field.
 * Falls back to `placeholder` only when no key servers are configured.
 */
export async function sealEncrypt(
  data: Uint8Array,
  ctx: { packageId: string; formId: string; fieldId: string },
): Promise<SealEnvelope> {
  const nonce = bytesToHex(crypto.getRandomValues(new Uint8Array(8)));
  const idBytes = buildSealIdentity({
    formId: ctx.formId,
    fieldId: ctx.fieldId,
    nonce,
  });
  const idHex = bytesToHex(idBytes);

  if (!sealConfigured) {
    return { mode: "placeholder", b64: toBase64(data) };
  }

  const client = getClient();
  const { encryptedObject } = await client.encrypt({
    threshold: env.sealThreshold,
    packageId: ctx.packageId,
    id: idHex,
    data,
  });
  return { mode: "seal", b64: toBase64(encryptedObject), id: idHex };
}

/**
 * Build a PTB that calls our `acl::seal_approve` with the given identity.
 * Key servers dry-run this; if it doesn't abort, they release the key share.
 */
export function buildSealApproveTx(args: {
  packageId: string;
  formId: string;
  idHex: string;
}): Transaction {
  const tx = new Transaction();
  tx.moveCall({
    target: `${args.packageId}::acl::seal_approve`,
    arguments: [
      tx.object(args.formId),
      tx.pure.vector("u8", hexToBytes(args.idHex)),
    ],
  });
  return tx;
}

/**
 * Decrypt a Seal envelope. Requires a SessionKey (signed by the caller's wallet)
 * and a built `seal_approve` PTB.
 */
export async function sealDecrypt(
  envelope: SealEnvelope,
  opts: {
    sessionKey: SessionKey;
    packageId: string;
    formId: string;
  },
): Promise<Uint8Array> {
  if (envelope.mode === "placeholder") {
    return fromBase64(envelope.b64);
  }

  const tx = buildSealApproveTx({
    packageId: opts.packageId,
    formId: opts.formId,
    idHex: envelope.id,
  });
  const txBytes = await tx.build({
    // biome-ignore lint/suspicious/noExplicitAny: cross-version SDK compat
    client: suiClient as any,
    onlyTransactionKind: true,
  });

  const client = getClient();
  return client.decrypt({
    data: fromBase64(envelope.b64),
    sessionKey: opts.sessionKey,
    txBytes,
  });
}

function bytesToHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export { SessionKey, EncryptedObject };
