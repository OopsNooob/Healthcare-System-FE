import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const OAUTH_PKCE_STORAGE_KEY = 'hc_google_oauth_pkce_v1';
const DEFAULT_TTL_MS = 5 * 60 * 1000;
const EXCHANGE_RESULT_CACHE_TTL_MS = 60 * 1000;
const BASE64URL_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export interface PendingGoogleOAuthAttempt {
  attemptId: string;
  verifier: string;
  expiresAt: number;
}

export class OAuthPendingAttemptMissingError extends Error {
  constructor() {
    super('OAUTH_ATTEMPT_MISSING');
    this.name = 'OAuthPendingAttemptMissingError';
  }
}

let inMemoryAttempt: PendingGoogleOAuthAttempt | null = null;
const inFlightTicketExchanges = new Map<string, Promise<unknown>>();
const completedTicketResults = new Map<string, { value: unknown; expiresAt: number }>();

function encodeBytesBase64Url(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i] ?? 0;
    const b1 = i + 1 < bytes.length ? (bytes[i + 1] ?? 0) : 0;
    const b2 = i + 2 < bytes.length ? (bytes[i + 2] ?? 0) : 0;

    const c0 = b0 >> 2;
    const c1 = ((b0 & 0x03) << 4) | (b1 >> 4);
    const c2 = ((b1 & 0x0f) << 2) | (b2 >> 6);
    const c3 = b2 & 0x3f;

    out += BASE64URL_ALPHABET[c0];
    out += BASE64URL_ALPHABET[c1];
    if (i + 1 < bytes.length) {
      out += BASE64URL_ALPHABET[c2];
    }
    if (i + 2 < bytes.length) {
      out += BASE64URL_ALPHABET[c3];
    }
  }
  return out;
}

function toBase64Url(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

/**
 * Generates an RFC 7636 PKCE verifier (43 chars) and SHA-256 base64url challenge (43 chars)
 * using Expo Crypto primitives without storing anything in logs.
 */
export async function createGoogleOAuthPkcePair(): Promise<{
  verifier: string;
  challenge: string;
}> {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  const verifier = encodeBytesBase64Url(randomBytes);
  const digestBase64 = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.BASE64 },
  );
  const challenge = toBase64Url(digestBase64);
  return { verifier, challenge };
}

/**
 * Persists the active PKCE attempt ephemeral secret in SecureStore + memory so cold-start
 * deep-link callbacks (`healthcare://oauth/callback`) can exchange the one-time ticket.
 */
export async function savePendingGoogleOAuthAttempt(
  attemptId: string,
  verifier: string,
  expiresInSeconds?: number,
): Promise<void> {
  inFlightTicketExchanges.clear();
  completedTicketResults.clear();

  const ttlMs =
    typeof expiresInSeconds === 'number' && expiresInSeconds > 0
      ? expiresInSeconds * 1000
      : DEFAULT_TTL_MS;
  const payload: PendingGoogleOAuthAttempt = {
    attemptId,
    verifier,
    expiresAt: Date.now() + ttlMs,
  };
  inMemoryAttempt = payload;
  try {
    const options =
      Platform.OS === 'ios'
        ? { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }
        : undefined;
    await SecureStore.setItemAsync(
      OAUTH_PKCE_STORAGE_KEY,
      JSON.stringify(payload),
      options,
    );
  } catch {
    // Keep memory copy active even if keychain is temporarily unavailable
  }
}

/**
 * Reads the pending PKCE verifier/attemptId pair without destroying it prematurely.
 * Clears and returns null only when expired or invalid.
 */
export async function peekPendingGoogleOAuthAttempt(): Promise<PendingGoogleOAuthAttempt | null> {
  let candidate = inMemoryAttempt;

  if (!candidate) {
    try {
      const raw = await SecureStore.getItemAsync(OAUTH_PKCE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PendingGoogleOAuthAttempt>;
        if (
          typeof parsed.attemptId === 'string' &&
          typeof parsed.verifier === 'string' &&
          typeof parsed.expiresAt === 'number'
        ) {
          candidate = {
            attemptId: parsed.attemptId,
            verifier: parsed.verifier,
            expiresAt: parsed.expiresAt,
          };
          inMemoryAttempt = candidate;
        }
      }
    } catch {
      candidate = null;
    }
  }

  if (!candidate) {
    return null;
  }

  if (candidate.expiresAt <= Date.now()) {
    await clearPendingGoogleOAuthAttempt();
    return null;
  }

  return candidate;
}

/**
 * Deduplicates ticket exchange at the module level so StrictMode double-effects,
 * simultaneous deep-link listeners, or callback remounts share a single backend exchange
 * and clear the ephemeral verifier strictly after settlement.
 */
export async function exchangeGoogleOAuthTicketOnce<T>(
  ticket: string,
  executor: (attempt: PendingGoogleOAuthAttempt) => Promise<T>,
): Promise<T> {
  const cached = completedTicketResults.get(ticket);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as T;
  }

  const inFlight = inFlightTicketExchanges.get(ticket);
  if (inFlight) {
    return inFlight as Promise<T>;
  }

  const run = (async () => {
    const attempt = await peekPendingGoogleOAuthAttempt();
    if (!attempt) {
      throw new OAuthPendingAttemptMissingError();
    }

    try {
      const result = await executor(attempt);
      completedTicketResults.set(ticket, {
        value: result,
        expiresAt: Date.now() + EXCHANGE_RESULT_CACHE_TTL_MS,
      });
      return result;
    } finally {
      inFlightTicketExchanges.delete(ticket);
      await clearPendingGoogleOAuthAttempt();
    }
  })();

  inFlightTicketExchanges.set(ticket, run);
  return run;
}

export async function clearPendingGoogleOAuthAttempt(): Promise<void> {
  inMemoryAttempt = null;
  try {
    await SecureStore.deleteItemAsync(OAUTH_PKCE_STORAGE_KEY);
  } catch {
    // Safe no-op
  }
}

/**
 * Strips any API version path (e.g. `/api/v1`) so backend-supplied relative
 * `authorizationPath` values never double-prefix `/api/v1`.
 */
export function resolveOriginFromApiBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  const match = trimmed.match(/^(https?:\/\/[^/]+)/i);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed.replace(/\/api(?:\/v\d+)?$/i, '');
}
