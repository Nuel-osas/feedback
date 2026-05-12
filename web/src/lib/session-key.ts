import { SessionKey } from "@mysten/seal";
import { suiClient } from "./sui";

const STORE_PREFIX = "tideform:sk:";
const DEFAULT_TTL_MIN = 10;

type Cache = Map<string, SessionKey>;
const inMemory: Cache = new Map();

function cacheKey(address: string, packageId: string) {
  return `${STORE_PREFIX}${packageId}:${address}`;
}

/**
 * Create or restore a SessionKey for (address, packageId).
 *
 * Flow:
 *   1. Try in-memory cache → return if valid.
 *   2. Try sessionStorage → restore + return if valid.
 *   3. Mint a new one, ask wallet to sign its personal message, persist.
 *
 * `signMessage(bytes) → Promise<{ signature }>` is the caller-supplied signer,
 * usually `useSignPersonalMessage()` from `@mysten/dapp-kit`.
 */
export async function getOrCreateSessionKey(args: {
  address: string;
  packageId: string;
  ttlMin?: number;
  signMessage: (message: Uint8Array) => Promise<{ signature: string }>;
}): Promise<SessionKey> {
  const key = cacheKey(args.address, args.packageId);
  const cached = inMemory.get(key);
  if (cached && !cached.isExpired?.()) return cached;

  if (typeof window !== "undefined") {
    const stored = sessionStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const restored = SessionKey.import(
          parsed,
          // biome-ignore lint/suspicious/noExplicitAny: cross-version SDK compat
          suiClient as any,
        );
        if (!restored.isExpired?.()) {
          inMemory.set(key, restored);
          return restored;
        }
      } catch {
        sessionStorage.removeItem(key);
      }
    }
  }

  const sk = await SessionKey.create({
    address: args.address,
    packageId: args.packageId,
    ttlMin: args.ttlMin ?? DEFAULT_TTL_MIN,
    // biome-ignore lint/suspicious/noExplicitAny: cross-version SDK compat
    suiClient: suiClient as any,
  });

  const message = sk.getPersonalMessage();
  const { signature } = await args.signMessage(message);
  await sk.setPersonalMessageSignature(signature);

  inMemory.set(key, sk);
  if (typeof window !== "undefined") {
    try {
      const exported = sk.export?.();
      if (exported) {
        sessionStorage.setItem(key, JSON.stringify(exported));
      }
    } catch {
      // export not available — fine, will re-sign on reload
    }
  }
  return sk;
}

export function clearSessionKey(address: string, packageId: string) {
  const key = cacheKey(address, packageId);
  inMemory.delete(key);
  if (typeof window !== "undefined") sessionStorage.removeItem(key);
}
