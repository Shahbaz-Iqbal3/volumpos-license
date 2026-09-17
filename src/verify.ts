import { DEFAULT_ACTIVATION_LIMIT } from './constants.js'
import { decodeBase64Url, decodeBase64UrlToString } from './base64.js'
import { verifySignature } from './crypto.js'
import { legacyMachineHash } from './sha256.js'
import { buildFingerprint, matchFingerprint } from './fingerprint.js'
import { fromWire } from './wire.js'
import type {
  MachineFingerprint,
  VerifyFailure,
  VerifyResult
} from './types.js'

function fail(reason: VerifyFailure['reason'], error: string): VerifyFailure {
  return { ok: false, reason, error }
}

export type VerifyOptions = {
  /** Legacy single machine id (`node-machine-id`, raw). Used to verify keys
   *  issued before the per-source fingerprint existed. */
  machineId?: string
  /** Per-source hashes collected on this machine, used for the fuzzy match on
   *  v2 keys that carry a `fp` map. */
  fingerprint?: MachineFingerprint
  /** Override the number of matching sources required. */
  requiredMatches?: number
  /** Reject a license whose `expiresAt` is in the past. Defaults to false —
   *  the app state machine owns grace handling. */
  enforceExpiry?: boolean
  /** Expected product. When set, a mismatched `p` is rejected. */
  product?: string
}

/**
 * Verify a license key offline.
 *
 * Legacy keys (issued before this package) carry only `{ m, s, e, t, c? }` and
 * are matched exactly against `legacyMachineHash(machineId)`. Keys with a v2
 * `fp` source map are matched fuzzily. Both share this one code path.
 */
export function verifyLicenseKey(
  key: string,
  publicKeyB64: string,
  options: VerifyOptions = {}
): VerifyResult {
  const parts = key.trim().split('.')
  if (parts.length !== 2) return fail('malformed', 'Malformed license key')

  const [payloadB64, sigB64] = parts
  let payloadJson: string
  let raw: Record<string, unknown>
  try {
    payloadJson = decodeBase64UrlToString(payloadB64 as string)
    raw = JSON.parse(payloadJson) as Record<string, unknown>
  } catch {
    return fail('payload', 'Invalid payload JSON')
  }

  if (!verifySignature(Buffer.from(payloadJson, 'utf8'), decodeBase64Url(sigB64 as string), publicKeyB64)) {
    return fail('signature', 'Invalid signature')
  }

  const payload = fromWire(raw)

  if (options.product && payload.product && payload.product !== options.product) {
    return fail('machine-mismatch', `License is for ${payload.product}, not ${options.product}`)
  }

  const expiry = new Date(payload.expiresAt)
  if (isNaN(expiry.getTime())) return fail('expiry', 'Invalid expiry date')
  if (options.enforceExpiry && expiry.getTime() < Date.now()) {
    return fail('expiry', 'License has expired')
  }

  const isLegacy = raw.m !== undefined && raw.fp === undefined
  const matchesMachine = (): boolean => {
    if (isLegacy) {
      if (!options.machineId) return false
      return payload.fingerprint === legacyMachineHash(options.machineId)
    }
    if (payload.sources && options.fingerprint) {
      return matchFingerprint(payload.sources, options.fingerprint, options.requiredMatches).ok
    }
    // v2 key presented by a host that can only compute a legacy id, or a
    // single-source fingerprint. Fall back to recomputing the composite when
    // possible, otherwise the legacy hash.
    if (options.machineId) {
      return (
        payload.fingerprint === legacyMachineHash(options.machineId) ||
        payload.fingerprint === buildFingerprint(options.fingerprint ?? {})
      )
    }
    return false
  }

  if (!matchesMachine()) {
    const reason = isLegacy && !options.machineId ? 'machine' : 'machine-mismatch'
    return fail(reason, 'License key is for a different machine')
  }

  return {
    ok: true,
    payload,
    shopName: payload.shop,
    expiresAt: payload.expiresAt,
    tier: payload.tier,
    seatCount: payload.seats ?? 1,
    activationLimit: payload.activationLimit ?? DEFAULT_ACTIVATION_LIMIT,
    features: payload.features
  }
}
